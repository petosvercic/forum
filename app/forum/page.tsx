import Link from "next/link";

import { PostCard } from "@/components/post-card";
import { ShareButton } from "@/components/share-button";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES, POST_LANGS, POST_TYPES } from "@/lib/forum/constants";
import { slugifyCategory } from "@/lib/forum/categories";
import type { PostRow, PostLang, PostType } from "@/lib/forum/types";

type SearchParams = {
  category?: string;
  tag?: string;
  type?: string;
  lang?: string;
  q?: string;
  sort?: string; // new | helpful | comments | relevance
};

type CategoryOpt = { name: string; slug: string };

function scoreRelevance(p: any, q: string, tag: string) {
  const qq = q.trim().toLowerCase();
  const tt = tag.trim().toLowerCase();
  let s = 0;

  const title = String(p.title ?? "").toLowerCase();
  const ctx = String(p.context ?? "").toLowerCase();
  const out = String(p.output ?? "").toLowerCase();
  const prompt = String(p.prompt ?? "").toLowerCase();
  const tags = Array.isArray(p.tags) ? p.tags.map((x: any) => String(x).toLowerCase()) : [];

  if (tt) {
    if (tags.includes(tt)) s += 80;
  }

  if (qq) {
    if (title.includes(qq)) s += 60;
    if (tags.includes(qq)) s += 45;
    if (ctx.includes(qq)) s += 15;
    if (prompt.includes(qq)) s += 10;
    if (out.includes(qq)) s += 8;
  }

  // Community signal as a tiebreaker
  s += Number(p.helpful_count ?? 0) * 2;
  s += Number(p.comment_count ?? 0) * 1;

  // Gentle recency boost (so the feed doesn't become fossilized)
  const t = new Date(String(p.created_at ?? "")).getTime();
  if (!Number.isNaN(t)) s += Math.min(20, (Date.now() - t) / (1000 * 60 * 60 * 24) * -0.2 + 20);

  return s;
}

export default async function ForumHome({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const category = sp.category?.trim() || "";
  const tag = sp.tag?.trim().replace(/^#/, "") || "";
  const type = (sp.type?.trim() as PostType | "") || "";
  const lang = (sp.lang?.trim() as PostLang | "") || "";
  const q = sp.q?.trim() || "";
  const sort = (sp.sort?.trim() || "new").toLowerCase();

  const supabase = await createClient();

  // Categories from DB (admin managed). Fallback to constants.
  let categories: CategoryOpt[] = [...CATEGORIES].map((n) => ({ name: n, slug: slugifyCategory(n) }));
  try {
    const { data: catRows, error: catErr } = await supabase
      .from("forum_categories")
      .select("name,slug,is_active,sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (!catErr && Array.isArray(catRows) && catRows.length) {
      categories = (catRows as any[]).map((r) => ({
        name: String(r.name),
        slug: String(r.slug || slugifyCategory(String(r.name))),
      }));
    }
  } catch {
    // ignore
  }

  const selectedCat = category ? categories.find((c) => c.name === category) : null;

  const limit = sort === "helpful" || sort === "comments" || sort === "relevance" ? 200 : 50;

  let query = supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (category) query = query.eq("category", category);
  if (tag) query = query.contains("tags", [tag]);
  if (type) query = query.eq("type", type);
  if (lang) query = query.eq("lang", lang);

  if (q) {
    if (sort === "relevance") {
      const like = `%${q}%`;
      query = query.or(`title.ilike.${like},context.ilike.${like},prompt.ilike.${like},output.ilike.${like}`);
    } else {
      query = query.ilike("title", `%${q}%`);
    }
  }

  const { data, error } = await query;

  const posts = (data ?? []) as PostRow[];

  // Metrics (comments + helpful) for compact feed cards
  const postIds = posts.map((p) => p.id);
  const metricsMap = new Map<string, { comment_count: number; helpful_count: number }>();

  if (postIds.length) {
    const { data: metrics, error: metricsError } = await supabase.rpc("get_post_metrics", { p_post_ids: postIds });
    if (!metricsError && Array.isArray(metrics)) {
      for (const row of metrics as any[]) {
        metricsMap.set(row.post_id, {
          comment_count: Number(row.comment_count ?? 0),
          helpful_count: Number(row.helpful_count ?? 0),
        });
      }
    }
  }

  // My helpful reactions (so the button can render active state)
  const { data: claimsData } = await supabase.auth.getClaims();
  const me = claimsData?.claims;
  const myHelpful = new Set<string>();

  if (me?.sub && postIds.length) {
    const { data: myReactions } = await supabase
      .from("reactions")
      .select("target_id")
      .eq("user_id", me.sub)
      .eq("target_type", "post")
      .eq("kind", "helpful")
      .in("target_id", postIds);

    for (const r of (myReactions ?? []) as any[]) {
      if (r?.target_id) myHelpful.add(r.target_id);
    }
  }

  const postsWithMetrics = posts.map((p) => {
    const m = metricsMap.get(p.id);
    return {
      ...p,
      comment_count: m?.comment_count ?? 0,
      helpful_count: m?.helpful_count ?? 0,
      viewer_helpful: myHelpful.has(p.id),
    } as any;
  });

  // Sorting (server-side in JS based on metrics / relevance)
  let sorted = postsWithMetrics;

  if (sort === "helpful") {
    sorted = [...postsWithMetrics].sort((a: any, b: any) => {
      const diff = (b.helpful_count ?? 0) - (a.helpful_count ?? 0);
      if (diff !== 0) return diff;
      return String(b.created_at).localeCompare(String(a.created_at));
    });
  } else if (sort === "comments") {
    sorted = [...postsWithMetrics].sort((a: any, b: any) => {
      const diff = (b.comment_count ?? 0) - (a.comment_count ?? 0);
      if (diff !== 0) return diff;
      return String(b.created_at).localeCompare(String(a.created_at));
    });
  } else if (sort === "relevance") {
    sorted = [...postsWithMetrics].sort((a: any, b: any) => {
      const diff = scoreRelevance(b, q, tag) - scoreRelevance(a, q, tag);
      if (diff !== 0) return diff;
      return String(b.created_at).localeCompare(String(a.created_at));
    });
  }

  // keep the UI manageable
  const shown = sorted.slice(0, 50);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Feed</h1>
          <p className="text-sm text-foreground/70">
            Zdieľaj AI výstupy, pýtaj sa, diskutuj, overuj.
          </p>
        </div>
        <Button asChild>
          <Link href="/forum/new">+ Nový príspevok</Link>
        </Button>
      </div>

      {/* Groups (categories) */}
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/forum"
          className={`text-xs px-3 py-1 rounded-full border border-foreground/10 hover:border-foreground/30 ${
            !category ? "bg-foreground/5" : ""
          }`}
        >
          Všetko
        </Link>

        {categories.map((c) => (
          <Link
            key={c.slug}
            href={`/forum/c/${encodeURIComponent(c.slug)}`}
            className={`text-xs px-3 py-1 rounded-full border border-foreground/10 hover:border-foreground/30 ${
              category === c.name ? "bg-foreground/5" : ""
            }`}
          >
            {c.name}
          </Link>
        ))}

        {selectedCat ? (
          <div className="ml-auto">
            <ShareButton
              path={`/forum/c/${encodeURIComponent(selectedCat.slug)}`}
              title={`Viora • ${selectedCat.name}`}
              label="Zdieľať skupinu"
              size="sm"
              variant="outline"
            />
          </div>
        ) : null}
      </div>

      <form
        action="/forum"
        method="get"
        className="sticky top-3 z-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 p-3 rounded-lg border border-foreground/10 bg-background/70 backdrop-blur"
      >
        <div className="flex flex-col gap-1">
          <label className="text-xs text-foreground/60">Hľadať</label>
          <input
            name="q"
            defaultValue={q}
            placeholder="Názov…"
            className="h-9 rounded-md border border-foreground/10 bg-transparent px-3 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-foreground/60">Kategória</label>
          <select
            name="category"
            defaultValue={category}
            className="h-9 rounded-md border border-foreground/10 bg-transparent px-2 text-sm"
          >
            <option value="">Všetko</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-foreground/60">Typ</label>
          <select
            name="type"
            defaultValue={type}
            className="h-9 rounded-md border border-foreground/10 bg-transparent px-2 text-sm"
          >
            <option value="">Všetko</option>
            {POST_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-foreground/60">Jazyk</label>
          <select
            name="lang"
            defaultValue={lang}
            className="h-9 rounded-md border border-foreground/10 bg-transparent px-2 text-sm"
          >
            <option value="">Všetko</option>
            {POST_LANGS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-foreground/60">Tag</label>
          <input
            name="tag"
            defaultValue={tag}
            placeholder="#supabase"
            className="h-9 rounded-md border border-foreground/10 bg-transparent px-3 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-foreground/60">Zoradiť</label>
          <select
            name="sort"
            defaultValue={sort}
            className="h-9 rounded-md border border-foreground/10 bg-transparent px-2 text-sm"
          >
            <option value="new">Najnovšie</option>
            <option value="relevance">Relevancia</option>
            <option value="helpful">Najviac 👍</option>
            <option value="comments">Najviac 💬</option>
          </select>
        </div>

        <div className="lg:col-span-7 flex items-center gap-2">
          <Button type="submit" size="sm">
            Použiť filtre
          </Button>
          <Button type="button" size="sm" variant="outline" asChild>
            <Link href="/forum">Reset</Link>
          </Button>
        </div>
      </form>

      {error ? (
        <div className="p-4 rounded-lg border border-red-500/30 bg-red-500/5">
          <p className="text-sm text-red-500">
            Nepodarilo sa načítať príspevky: {(error as any).message ?? String(error)}
          </p>
        </div>
      ) : shown.length === 0 ? (
        <div className="p-8 rounded-lg border border-foreground/10 text-center">
          <p className="text-sm text-foreground/70">
            Zatiaľ nič. Buď prvý a pridaj príspevok.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {shown.map((p: any) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      )}

      <div className="text-xs text-foreground/60">Zobrazených: {shown.length} (max 50)</div>
    </div>
  );
}
