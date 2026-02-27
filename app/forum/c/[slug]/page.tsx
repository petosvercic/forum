export const dynamic = "force-dynamic";
export const revalidate = 0;

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugifyCategory } from "@/lib/forum/categories";

export default async function CategoryRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  // Try DB-managed categories first
  try {
    const { data } = await supabase
      .from("forum_categories")
      .select("name,slug,is_active")
      .eq("slug", slug)
      .maybeSingle();

    if ((data as any)?.name && (data as any)?.is_active !== false) {
      redirect(`/forum?category=${encodeURIComponent(String((data as any).name))}`);
    }
  } catch {
    // ignore
  }

  // Fallback: treat slug as a slugified name; attempt best-effort redirect
  // (Not perfect but better than 404)
  const pretty = slug
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
  // This fallback can be wrong; if it doesn't match any category, we just go to feed.
  redirect(`/forum?category=${encodeURIComponent(pretty)}`);
}
