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

  const { data: postsData } = await supabase
    .from("posts")
    .select("*")
    .eq("author_id", typedProfile.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const posts = (postsData ?? []) as PostRow[];
  const projects = posts.filter((p) => (p.tags ?? []).includes("project"));

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

      {typedProfile.bio ? (
        <div className="p-4 rounded-lg border border-foreground/10">
          <h2 className="text-sm font-semibold mb-1">Bio</h2>
          <p className="text-sm whitespace-pre-wrap">{typedProfile.bio}</p>
        </div>
      ) : null}

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
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      )}
    </div>
  );
}
