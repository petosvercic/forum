import Link from "next/link";

import { PostCard } from "@/components/post-card";
import { ShareButton } from "@/components/share-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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

  // Gentle recency boost
  const t = new Date(String(p.created_at ?? "")).getTime();
  if (!Number.isNaN(t)) s += Math.min(20, (Date.now() - t) / (1000 * 60 * 60 * 24) * -0.2 + 20);

  return s;
}

function applyFilters(
  query: any,
  {
    category,
    tag,
    type,
    lang,
    q,
    sort,
  }: { category: string; tag: string; type: string; lang: string; q: string; sort: string }
) {
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
  return query;
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
  const tutorialSlugs = new Set(["how-to", "projects", "qa"]);
  const selectedSlug = selectedCat?.slug ?? "";

  // Auth / role (for UI gating)
  const { data: claimsData } = await supabase.auth.getClaims();
  const me = claimsData?.claims;
  let role: string | null = null;
  if (me?.sub) {
    const { data: meProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", me.sub)
      .maybeSingle();
    role = (meProfile as any)?.role ?? null;
  }
  const isMod = role === "moderator" || role === "admin";

  // Base queries
  const limit = sort === "helpful" || sort === "comments" || sort === "relevance" ? 200 : 50;

  let pinnedQuery = supabase
    .from("posts")
    .select("*")
    .contains("tags", ["pinned"])
    .order("created_at", { ascending: false })
    .limit(30);

  pinnedQuery = applyFilters(pinnedQuery, { category, tag, type, lang, q, sort });

  let mainQuery = supabase.from("posts").select("*").order("created_at", { ascending: false }).limit(limit);
  mainQuery = applyFilters(mainQuery, { category, tag, type, lang, q, sort });

  const [{ data: pinnedData, error: pinnedError }, { data, error }] = await Promise.all([pinnedQuery, mainQuery]);

  const pinnedPosts = ((pinnedData ?? []) as PostRow[]).map((p) => ({ ...p })) as any[];
  const mainPosts = (data ?? []) as PostRow[];

  // Combine pinned-first + dedupe
  const seen = new Set<string>();
  const combined: PostRow[] = [];
  for (const p of pinnedPosts) {
    if (p?.id && !seen.has(p.id)) {
      combined.push(p);
      seen.add(p.id);
    }
  }
  for (const p of mainPosts) {
    if (p?.id && !seen.has(p.id)) {
      combined.push(p);
      seen.add(p.id);
    }
  }

  const posts = combined;
  const postIds = posts.map((p) => p.id);

  // Metrics (comments + helpful) for compact feed cards
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

  // My helpful reactions
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

  // Split pinned vs normal for sorting (pinned stays on top)
  const pinnedSet = new Set((pinnedPosts ?? []).map((p: any) => p.id));
  const pinned = postsWithMetrics.filter((p: any) => pinnedSet.has(p.id));
  const normal = postsWithMetrics.filter((p: any) => !pinnedSet.has(p.id));

  let normalSorted = normal;

  if (sort === "helpful") {
    normalSorted = [...normal].sort((a: any, b: any) => {
      const diff = (b.helpful_count ?? 0) - (a.helpful_count ?? 0);
      if (diff !== 0) return diff;
      return String(b.created_at).localeCompare(String(a.created_at));
    });
  } else if (sort === "comments") {
    normalSorted = [...normal].sort((a: any, b: any) => {
      const diff = (b.comment_count ?? 0) - (a.comment_count ?? 0);
      if (diff !== 0) return diff;
      return String(b.created_at).localeCompare(String(a.created_at));
    });
  } else if (sort === "relevance") {
    normalSorted = [...normal].sort((a: any, b: any) => {
      const diff = scoreRelevance(b, q, tag) - scoreRelevance(a, q, tag);
      if (diff !== 0) return diff;
      return String(b.created_at).localeCompare(String(a.created_at));
    });
  }

  const sorted = [...pinned, ...normalSorted];
  const shown = sorted.slice(0, 50);

  const isCleanView = !category && !tag && !type && !lang && !q;

  const newPostLabel = category ? `+ PridaĹĄ do ${category}` : "+ NovĂ˝ prĂ­spevok";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Feed</h1>
          <p className="text-sm text-foreground/70">ZdieÄľaj AI vĂ˝stupy, pĂ˝taj sa, diskutuj, overuj.</p>
        </div>

        <Button asChild>
          <Link
            href={{
              pathname: "/forum/new",
              query: {
                ...(category ? { category } : {}),
                ...(type ? { type } : {}),
                ...(lang ? { lang } : {}),
              },
            }}
          >
            {newPostLabel}
          </Link>
        </Button>
      </div>

      {/* Layout: sidebar (desktop) + content */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <aside className="hidden lg:block w-72 shrink-0">
          <div className="sticky top-3 flex flex-col gap-4">
            <div className="rounded-lg border border-foreground/10 bg-background/70 backdrop-blur p-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-foreground/70">KategĂłrie</div>
                {selectedCat ? (
                  <ShareButton
                    path={`/forum/c/${encodeURIComponent(selectedCat.slug)}`}
                    title={`Viora â€˘ ${selectedCat.name}`}
                    label="ZdieÄľaĹĄ"
                    size="sm"
                    variant="outline"
                  />
                ) : null}
              </div>

              <div className="mt-2 flex flex-col gap-1">
                <Link
                  href={{
                    pathname: "/forum",
                    query: {
                      ...(q ? { q } : {}),
                      ...(tag ? { tag } : {}),
                      ...(type ? { type } : {}),
                      ...(lang ? { lang } : {}),
                      ...(sort ? { sort } : {}),
                    },
                  }}
                  className={`group flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-foreground/5 ${
                    !category ? "bg-foreground/5" : ""
                  }`}
                >
                  <span>VĹˇetko</span>
                </Link>

                {categories.map((c) => {
                  const isTutorial = tutorialSlugs.has(c.slug);
                  return (
                    <div key={c.slug} className="group flex items-center justify-between rounded-md hover:bg-foreground/5">
                      <Link
                        href={{
                          pathname: "/forum",
                          query: {
                            ...(q ? { q } : {}),
                            ...(tag ? { tag } : {}),
                            ...(type ? { type } : {}),
                            ...(lang ? { lang } : {}),
                            ...(sort ? { sort } : {}),
                            category: c.name,
                          },
                        }}
                        className={`flex-1 px-2 py-1.5 text-sm ${
                          category === c.name ? "bg-foreground/5 rounded-md" : ""
                        }`}
                      >
                        {c.name}
                      </Link>

                      {isTutorial && !isMod ? (
                        <span
                          className="mx-1 inline-flex h-7 w-7 items-center justify-center rounded-md border border-foreground/10 text-xs text-foreground/50"
                          title="Len admin/mod mĂ´Ĺľe pridĂˇvaĹĄ do tutorial kategĂłriĂ­"
                          aria-label="ZamknutĂ©"
                        >
                          đź”’
                        </span>
                      ) : (
                        <Link
                          href={{
                            pathname: "/forum/new",
                            query: {
                              category: c.name,
                              type: type || "ai_output",
                              lang: lang || "sk",
                            },
                          }}
                          className="mx-1 inline-flex h-7 w-7 items-center justify-center rounded-md border border-foreground/10 text-xs text-foreground/70 hover:border-foreground/30 hover:bg-foreground/5"
                          title={`NovĂ˝ prĂ­spevok do: ${c.name}`}
                          aria-label={`NovĂ˝ prĂ­spevok do: ${c.name}`}
                        >
                          +
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-lg border border-foreground/10 bg-background/70 backdrop-blur p-3">
              <div className="text-xs font-semibold text-foreground/70">Typ</div>
              <div className="mt-2 flex flex-col gap-1">
                <Link
                  href={{
                    pathname: "/forum",
                    query: {
                      ...(q ? { q } : {}),
                      ...(tag ? { tag } : {}),
                      ...(category ? { category } : {}),
                      ...(lang ? { lang } : {}),
                      ...(sort ? { sort } : {}),
                    },
                  }}
                  className={`rounded-md px-2 py-1.5 text-sm hover:bg-foreground/5 ${!type ? "bg-foreground/5" : ""}`}
                >
                  VĹˇetko
                </Link>

                {POST_TYPES.map((t) => (
                  <Link
                    key={t.value}
                    href={{
                      pathname: "/forum",
                      query: {
                        ...(q ? { q } : {}),
                        ...(tag ? { tag } : {}),
                        ...(category ? { category } : {}),
                        ...(lang ? { lang } : {}),
                        ...(sort ? { sort } : {}),
                        type: t.value,
                      },
                    }}
                    className={`rounded-md px-2 py-1.5 text-sm hover:bg-foreground/5 ${
                      type === t.value ? "bg-foreground/5" : ""
                    }`}
                  >
                    {t.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col gap-6">
          {/* Mobile category chips */}
          <div className="flex flex-wrap items-center gap-2 lg:hidden">
            <Link
              href="/forum"
              className={`text-xs px-3 py-1 rounded-full border border-foreground/10 hover:border-foreground/30 ${
                !category ? "bg-foreground/5" : ""
              }`}
            >
              VĹˇetko
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
                  title={`Viora â€˘ ${selectedCat.name}`}
                  label="ZdieÄľaĹĄ skupinu"
                  size="sm"
                  variant="outline"
                />
              </div>
            ) : null}
          </div>

          {/* Onboarding: show only on clean view */}
          {isCleanView ? (
            <Card className="border-foreground/15 bg-foreground/[0.02]">
              <CardHeader className="py-3">
                <div className="text-sm font-semibold">ZaÄŤni tu đź‘‹</div>
                <div className="text-xs text-foreground/70">
                  RĂ˝chly onboarding: ÄŤo sem patrĂ­, ako pĂ­saĹĄ prĂ­spevky a ako z AI vĂ˝stupu spraviĹĄ vec.
                </div>
              </CardHeader>
              <CardContent className="pt-0 pb-4 flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href="/forum/c/how-to">Ako pouĹľĂ­vaĹĄ fĂłrum</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href="/forum/c/projects">SpoluprĂˇce</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href="/forum/c/qa">Q&A</Link>
                </Button>
                <div className="ml-auto flex gap-2">
                  <Button asChild size="sm">
                    <Link href={{ pathname: "/forum/new", query: { type: "ai_output" } }}>+ AI vĂ˝stup</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href={{ pathname: "/forum/new", query: { type: "request" } }}>+ Dopyt/Ponuka</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <form
            action="/forum"
            method="get"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 p-3 rounded-lg border border-foreground/10 bg-background/70 backdrop-blur"
          >
            <div className="flex flex-col gap-1">
              <label className="text-xs text-foreground/60">HÄľadaĹĄ</label>
              <input
                name="q"
                defaultValue={q}
                placeholder="NĂˇzovâ€¦"
                className="h-9 rounded-md border border-foreground/10 bg-transparent px-3 text-sm"
              />
            </div>

            <div className="flex flex-col gap-1 lg:hidden">
              <label className="text-xs text-foreground/60">KategĂłria</label>
              <select
                name="category"
                defaultValue={category}
                className="h-9 rounded-md border border-foreground/10 bg-transparent px-2 text-sm"
              >
                <option value="">VĹˇetko</option>
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
                <option value="">VĹˇetko</option>
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
                <option value="">VĹˇetko</option>
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
              <label className="text-xs text-foreground/60">ZoradiĹĄ</label>
              <select
                name="sort"
                defaultValue={sort}
                className="h-9 rounded-md border border-foreground/10 bg-transparent px-2 text-sm"
              >
                <option value="new">NajnovĹˇie</option>
                <option value="relevance">Relevancia</option>
                <option value="helpful">Najviac đź‘Ť</option>
                <option value="comments">Najviac đź’¬</option>
              </select>
            </div>

            <div className="lg:col-span-7 flex items-center gap-2">
              <Button type="submit" size="sm">
                PouĹľiĹĄ filtre
              </Button>
              <Button type="button" size="sm" variant="outline" asChild>
                <Link href="/forum">Reset</Link>
              </Button>
            </div>
          </form>

          {pinnedError || error ? (
            <div className="p-4 rounded-lg border border-red-500/30 bg-red-500/5">
              <p className="text-sm text-red-500">
                Nepodarilo sa naÄŤĂ­taĹĄ prĂ­spevky: {(pinnedError as any)?.message ?? (error as any)?.message ?? "unknown"}
              </p>
            </div>
          ) : shown.length === 0 ? (
            <div className="p-8 rounded-lg border border-foreground/10 text-center space-y-3">
              <p className="text-sm text-foreground/70">
                ZatiaÄľ niÄŤ. SkĂşs zaÄŤaĹĄ s <span className="font-semibold">Dopyt/Ponuka</span> alebo pozri <span className="font-semibold">ZaÄŤni tu</span>.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button asChild size="sm">
                  <Link href={{ pathname: "/forum/new", query: { type: "request" } }}>+ Dopyt/Ponuka</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href="/forum/c/how-to">ZaÄŤni tu</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href={{ pathname: "/forum/new", query: { type: "ai_output" } }}>+ AI vĂ˝stup</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {shown.map((p: any) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          )}

          <div className="text-xs text-foreground/60">ZobrazenĂ˝ch: {shown.length} (max 50)</div>
        </main>
      </div>
    </div>
  );
}

