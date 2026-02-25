import Link from "next/link";

import { PostCard } from "@/components/post-card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES, POST_LANGS, POST_TYPES } from "@/lib/forum/constants";
import type { PostRow, PostLang, PostType } from "@/lib/forum/types";

type SearchParams = {
  category?: string;
  tag?: string;
  type?: string;
  lang?: string;
  q?: string;
};

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

  const supabase = await createClient();

  let query = supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (category) query = query.eq("category", category);
  if (tag) query = query.contains("tags", [tag]);
  if (type) query = query.eq("type", type);
  if (lang) query = query.eq("lang", lang);
  if (q) query = query.ilike("title", `%${q}%`);

  const { data, error } = await query;

  const posts = (data ?? []) as PostRow[];

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

      <form
        action="/forum"
        method="get"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-3 rounded-lg border border-foreground/10"
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
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
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

        <div className="lg:col-span-5 flex items-center gap-2">
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
            Nepodarilo sa načítať príspevky: {error.message}
          </p>
        </div>
      ) : posts.length === 0 ? (
        <div className="p-8 rounded-lg border border-foreground/10 text-center">
          <p className="text-sm text-foreground/70">
            Zatiaľ nič. Buď prvý a pridaj príspevok.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      )}

      <div className="text-xs text-foreground/60">
        Zobrazených: {posts.length} (max 50)
      </div>
    </div>
  );
}
