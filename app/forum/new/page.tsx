export const dynamic = "force-dynamic";
export const revalidate = 0;

import { redirect } from "next/navigation";

import { NewPostForm } from "@/components/new-post-form";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES } from "@/lib/forum/constants";

export default async function NewPostPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  if (!user?.sub) {
    redirect(`/auth/login?next=${encodeURIComponent("/forum/new")}`);
  }

  // Categories from DB (admin managed). Fallback to constants.
  let categories: string[] = [...CATEGORIES];
  try {
    const { data: catRows, error: catErr } = await supabase
      .from("forum_categories")
      .select("name,is_active,sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (!catErr && Array.isArray(catRows) && catRows.length) {
      categories = (catRows as any[]).map((r) => String(r.name));
    }
  } catch {
    // ignore
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">Pridať príspevok</h1>
        <p className="text-sm text-foreground/70">
          Zdieľaj AI výstup alebo napíš dopyt o pomoc.
        </p>
      </div>
      <NewPostForm userId={user.sub} categories={categories} />
    </div>
  );
}

