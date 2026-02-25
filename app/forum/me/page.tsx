import { redirect } from "next/navigation";

import { ProfileForm } from "@/components/profile-form";
import { createClient } from "@/lib/supabase/server";
import type { ProfileRow } from "@/lib/forum/types";

export default async function MePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  if (!user?.sub || !user.email) {
    redirect(`/auth/login?next=${encodeURIComponent("/me")}`);
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.sub)
    .maybeSingle();

  const profile = (profileData ?? null) as ProfileRow | null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">Môj profil</h1>
        <p className="text-sm text-foreground/70">
          Nastav si handle, skills a región. Toto bude neskôr základ na prepojenie
          dopytu a ponuky.
        </p>
      </div>
      <ProfileForm userId={user.sub} email={user.email} initial={profile} />
    </div>
  );
}
