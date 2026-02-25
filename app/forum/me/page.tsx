export const dynamic = "force-dynamic";
export const revalidate = 0;

import { redirect } from "next/navigation";

import { ProfileForm } from "@/components/profile-form";
import { PostCard } from "@/components/post-card";
import { createClient } from "@/lib/supabase/server";
import type { ProfileRow, PostRow } from "@/lib/forum/types";

export default async function MePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  if (!user?.sub || !user.email) {
    redirect(`/auth/login?next=${encodeURIComponent("/forum/me")}`);
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.sub)
    .maybeSingle();

  const profile = (profileData ?? null) as ProfileRow | null;

  const { data: postsData } = await supabase
    .from("posts")
    .select("*")
    .eq("author_id", user.sub)
    .order("created_at", { ascending: false })
    .limit(50);

  const myPosts = (postsData ?? []) as PostRow[];
  const myProjects = myPosts.filter((p) => (p.tags ?? []).includes("project"));


  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">Môj profil</h1>
        <p className="text-sm text-foreground/70">
          Nastav si handle, skills a región. Toto bude neskôr základ na prepojenie dopytu a ponuky.
        </p>
      </div>
      <ProfileForm userId={user.sub} email={user.email} initial={profile} />

      <div className="mt-2 flex flex-col gap-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Moje príspevky</h2>
            <p className="text-sm text-foreground/70">Tvoje mini-portfólio. Projekty sú príspevky s tagom <span className="font-mono">project</span>.</p>
          </div>
          <div className="text-xs text-foreground/60">Spolu: {myPosts.length} • Projekty: {myProjects.length}</div>
        </div>

        {myPosts.length === 0 ? (
          <div className="p-6 rounded-lg border border-foreground/10 text-sm text-foreground/70">
            Zatiaľ žiadne príspevky.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {myPosts.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

