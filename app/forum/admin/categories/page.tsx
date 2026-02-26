export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { AdminCategories } from "@/components/admin-categories";
import { Button } from "@/components/ui/button";
import type { ForumCategoryRow } from "@/lib/forum/types";

export default async function AdminCategoriesPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  if (!user?.sub) {
    redirect(`/auth/login?next=${encodeURIComponent("/forum/admin/categories")}`);
  }

  const { data: meProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.sub)
    .maybeSingle();

  const role = (meProfile as any)?.role ?? "user";
  if (role !== "admin") {
    redirect("/forum");
  }

  // Load categories (if the table doesn't exist yet, show empty list)
  const { data: cats, error } = await supabase
    .from("forum_categories")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  const initial = (error ? [] : (cats ?? [])) as ForumCategoryRow[];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="outline" size="sm">
          <Link href="/forum/admin">← Users</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/forum">Feed</Link>
        </Button>
      </div>

      <AdminCategories initial={initial} />

      {error ? (
        <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/10 text-sm">
          Tabuľka <span className="font-mono">forum_categories</span> zatiaľ neexistuje.
          Spusť <span className="font-mono">supabase/VIORA_MIGRATION_3.sql</span>.
        </div>
      ) : null}
    </div>
  );
}
