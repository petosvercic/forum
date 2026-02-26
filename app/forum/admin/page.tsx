export const dynamic = "force-dynamic";
export const revalidate = 0;

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

import { AdminUsers } from "@/components/admin-users";
import { Button } from "@/components/ui/button";
import type { ProfileRow } from "@/lib/forum/types";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  if (!user?.sub) {
    redirect(`/auth/login?next=${encodeURIComponent("/forum/admin")}`);
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

  const { data: profilesData } = await supabase
    .from("profiles")
    .select("id,email,role,handle,display_name,skills,region,created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const profiles = (profilesData ?? []) as ProfileRow[];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-foreground/70">Admin</div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/forum/admin/categories">Kategórie</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/forum">Feed</Link>
          </Button>
        </div>
      </div>
      <AdminUsers initial={profiles} />
    </div>
  );
}
