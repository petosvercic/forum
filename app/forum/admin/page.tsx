export const dynamic = "force-dynamic";
export const revalidate = 0;

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { AdminUsers } from "@/components/admin-users";
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
    .select("id,email,role,handle,display_name,skills,region,created_at,updated_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const profiles = (profilesData ?? []) as ProfileRow[];

  return <AdminUsers initial={profiles} />;
}
