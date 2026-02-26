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

  const { data: contactRow } = await supabase
    .from("profile_contacts")
    .select("contact_email")
    .eq("profile_id", user.sub)
    .maybeSingle();
  const contactEmail = (contactRow as any)?.contact_email ?? null;

  const { data: postsData } = await supabase
    .from("posts")
    .select("*")
    .eq("author_id", user.sub)
    .order("created_at", { ascending: false })
    .limit(50);

  const myPosts = (postsData ?? []) as PostRow[];
  const myProjects = myPosts.filter((p) => (p.tags ?? []).includes("project"));

  // Metrics (comments + helpful) and my helpful state for portfolio cards
  const postIds = myPosts.map((p) => p.id);
  const metricsMap = new Map<string, { comment_count: number; helpful_count: number }>();
  if (postIds.length) {
    const { data: metrics } = await supabase.rpc("get_post_metrics", { p_post_ids: postIds });
    if (Array.isArray(metrics)) {
      for (const row of metrics as any[]) {
        metricsMap.set(row.post_id, {
          comment_count: Number(row.comment_count ?? 0),
          helpful_count: Number(row.helpful_count ?? 0),
        });
      }
    }
  }

  const myHelpful = new Set<string>();
  if (user?.sub && postIds.length) {
    const { data: myReactions } = await supabase
      .from("reactions")
      .select("target_id")
      .eq("user_id", user.sub)
      .eq("target_type", "post")
      .eq("kind", "helpful")
      .in("target_id", postIds);
    for (const r of (myReactions ?? []) as any[]) {
      if (r?.target_id) myHelpful.add(r.target_id);
    }
  }

  const myPostsWithMetrics = myPosts.map((p) => {
    const m = metricsMap.get(p.id);
    return {
      ...p,
      comment_count: m?.comment_count ?? 0,
      helpful_count: m?.helpful_count ?? 0,
      viewer_helpful: myHelpful.has(p.id),
    } as PostRow & any;
  });


  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">Môj profil</h1>
        <p className="text-sm text-foreground/70">
          Nastav si handle, skills a región. Toto bude neskôr základ na prepojenie dopytu a ponuky.
        </p>
      </div>
      <ProfileForm
        userId={user.sub}
        email={user.email}
        initial={profile}
        initialContactEmail={contactEmail}
      />

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
            {myPostsWithMetrics.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

