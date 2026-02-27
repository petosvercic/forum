export const dynamic = "force-dynamic";
export const revalidate = 0;

import { redirect } from "next/navigation";

import { NewPostForm } from "@/components/new-post-form";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES, POST_LANGS, POST_TYPES } from "@/lib/forum/constants";
import type { PostLang, PostType } from "@/lib/forum/types";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function NewPostPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const rawCategory = Array.isArray(sp.category) ? sp.category[0] : sp.category;
  const rawType = Array.isArray(sp.type) ? sp.type[0] : sp.type;
  const rawLang = Array.isArray(sp.lang) ? sp.lang[0] : sp.lang;

  const initialType = (POST_TYPES as readonly any[]).some((t) => t.value === rawType)
    ? (rawType as PostType)
    : undefined;

  const initialLang = (POST_LANGS as readonly any[]).some((l) => l.value === rawLang)
    ? (rawLang as PostLang)
    : undefined;

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  // preserve query for login redirect
  const qp = new URLSearchParams();
  if (rawCategory) qp.set("category", String(rawCategory));
  if (rawType) qp.set("type", String(rawType));
  if (rawLang) qp.set("lang", String(rawLang));
  const nextUrl = `/forum/new${qp.toString() ? `?${qp.toString()}` : ""}`;

  if (!user?.sub) {
    redirect(`/auth/login?next=${encodeURIComponent(nextUrl)}`);
  }

  // Categories from DB (admin managed). Fallback to constants.
  let categories: { name: string; slug: string }[] = [...CATEGORIES].map((n) => ({ name: n, slug: "" }));
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
        slug: String(r.slug || ""),
      }));
    }
  } catch {
    // ignore
  }

  const categoryNames = categories.map((c) => c.name);

  let initialCategory: string | undefined = undefined;
  if (rawCategory) {
    const cand = String(rawCategory);
    if (categoryNames.includes(cand)) {
      initialCategory = cand;
    } else {
      // allow slug in query too
      const match = categories.find((c) => c.slug && c.slug === cand);
      if (match) initialCategory = match.name;
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">Pridať príspevok</h1>
        <p className="text-sm text-foreground/70">
          Zdieľaj AI výstup alebo napíš dopyt o pomoc.
        </p>
      </div>

      <NewPostForm
        userId={user.sub}
        categories={categoryNames}
        initialType={initialType}
        initialLang={initialLang}
        initialCategory={initialCategory}
      />
    </div>
  );
}
