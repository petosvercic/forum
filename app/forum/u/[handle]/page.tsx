import Link from "next/link";

import { PostCard } from "@/components/post-card";
import { createClient } from "@/lib/supabase/server";
import type { PostRow, ProfileRow } from "@/lib/forum/types";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("handle", handle)
    .maybeSingle();

  if (!profile) {
    return (
      <div className="p-6 rounded-lg border border-foreground/10">
        <p className="text-sm text-foreground/70">Profil nenájdený.</p>
        <div className="mt-3">
          <Link href="/forum" className="text-sm underline">Späť na fórum</Link>
        </div>
      </div>
    );
  }

  const typedProfile = profile as ProfileRow;

  const { data: claimsData } = await supabase.auth.getClaims();
  const viewer = claimsData?.claims;

  const contactEmail = viewer?.sub
    ? (
        await supabase
          .from("profile_contacts")
          .select("contact_email")
          .eq("profile_id", typedProfile.id)
          .maybeSingle()
      ).data?.contact_email ?? null
    : null;

  const { data: postsData } = await supabase
    .from("posts")
    .select("*")
    .eq("author_id", typedProfile.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const posts = (postsData ?? []) as PostRow[];
  const projects = posts.filter((p) => (p.tags ?? []).includes("project"));

  // Metrics for portfolio list
  const postIds = posts.map((p) => p.id);
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

  const postsWithMetrics = posts.map((p) => {
    const m = metricsMap.get(p.id);
    return {
      ...p,
      comment_count: m?.comment_count ?? 0,
      helpful_count: m?.helpful_count ?? 0,
      viewer_helpful: false,
    } as PostRow & any;
  });

  // viewer helpful state (optional)
  let viewerHelpful = new Set<string>();
  if (viewer?.sub && postIds.length) {
    const { data: myReactions } = await supabase
      .from("reactions")
      .select("target_id")
      .eq("user_id", viewer.sub)
      .eq("target_type", "post")
      .eq("kind", "helpful")
      .in("target_id", postIds);
    viewerHelpful = new Set((myReactions ?? []).map((r: any) => r.target_id).filter(Boolean));
  }

  const postsWithViewer = postsWithMetrics.map((p: any) => ({
    ...p,
    viewer_helpful: viewerHelpful.has(p.id),
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {typedProfile.display_name || typedProfile.handle || "Profil"}
          </h1>
          <p className="text-sm text-foreground/70">
            @{typedProfile.handle || "—"} • {typedProfile.region || "bez regiónu"}
          </p>
        </div>
        <Link href="/forum" className="text-sm underline">← späť</Link>
      </div>

      {typedProfile.is_public === false ? (
        <div className="p-4 rounded-lg border border-foreground/10 text-sm text-foreground/70">
          Tento profil nie je vo verejnom zozname <span className="font-medium">Ľudia</span>, ale je dostupný cez priamy link.
        </div>
      ) : null}

      {typedProfile.bio ? (
        <div className="p-4 rounded-lg border border-foreground/10">
          <h2 className="text-sm font-semibold mb-1">Bio</h2>
          <p className="text-sm whitespace-pre-wrap">{typedProfile.bio}</p>
        </div>
      ) : null}

      <div className="p-4 rounded-lg border border-foreground/10">
        <h2 className="text-sm font-semibold mb-1">Kontakt</h2>
        {viewer?.sub ? (
          contactEmail ? (
            <a className="text-sm underline" href={`mailto:${contactEmail}`}>
              {contactEmail}
            </a>
          ) : (
            <p className="text-sm text-foreground/70">Kontakt email nie je nastavený.</p>
          )
        ) : (
          <p className="text-sm text-foreground/70">
            Prihlás sa, aby si videl kontakt.
          </p>
        )}
      </div>

      <div className="p-4 rounded-lg border border-foreground/10">
        <h2 className="text-sm font-semibold mb-1">Skills</h2>
        <div className="flex flex-wrap gap-2">
          {(typedProfile.skills || []).length ? (
            typedProfile.skills.map((s) => (
              <span key={s} className="text-xs px-2 py-0.5 rounded-full border border-foreground/10">
                #{s}
              </span>
            ))
          ) : (
            <span className="text-sm text-foreground/70">Žiadne skills</span>
          )}
        </div>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Portfólio</h2>
          <p className="text-sm text-foreground/70">Projekty: {projects.length} • Príspevky: {posts.length}</p>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="p-6 rounded-lg border border-foreground/10 text-sm text-foreground/70">
          Zatiaľ bez príspevkov.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {postsWithViewer.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      )}
    </div>
  );
}
