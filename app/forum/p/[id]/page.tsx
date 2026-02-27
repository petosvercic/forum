import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CommentForm } from "@/components/comment-form";
import { DeleteCommentButton, DeletePostButton } from "@/components/moderation-buttons";
import { HelpfulButton } from "@/components/helpful-button";
import { SolutionToggleButton } from "@/components/solution-toggle-button";
import { ReportButton } from "@/components/report-button";
import { HideToggleButton } from "@/components/hide-toggle";
import { ShareButton } from "@/components/share-button";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import type { CommentRow, PostRow } from "@/lib/forum/types";
import { formatDateTime, shortId } from "@/lib/forum/format";

export default async function PostPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ img?: string; media?: string; created?: string }>;
}) {
  const { id } = await params;
  const sp = searchParams ? await searchParams : {};
  const imagesFailed = sp.img === "failed";
  const mediaFailed = sp.media === "failed";
  const created = sp.created === "1";
  const supabase = await createClient();

  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .single();

  if (postError) {
    return (
      <div className="p-6 rounded-lg border border-red-500/30 bg-red-500/5">
        <p className="text-sm text-red-500">Príspevok sa nepodarilo načítať: {postError.message}</p>
        <div className="mt-3">
          <Link href="/forum" className="text-sm underline">
            Späť na feed
          </Link>
        </div>
      </div>
    );
  }

  const typedPost = post as PostRow;

  const { data: commentsData } = await supabase
    .from("comments")
    .select("*")
    .eq("post_id", id)
    .order("created_at", { ascending: true });

  const comments = (commentsData ?? []) as CommentRow[];

  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims;

  // role lookup (optional, requires profiles.role)
  let role: string | null = null;
  if (user?.sub) {
    const { data: meProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.sub)
      .maybeSingle();
    role = (meProfile as any)?.role ?? null;
  }

  const isMod = role === "moderator" || role === "admin";
  const isAdmin = role === "admin";
  const canDeletePost = isMod || (!!user?.sub && user.sub === typedPost.author_id);

  // Helpful metrics
  const commentIds = comments.map((c) => c.id);
  let postHelpfulCount = 0;
  const commentHelpful = new Map<string, number>();

  const { data: postHelpfulRows } = await supabase.rpc("get_helpful_counts", {
    p_target_type: "post",
    p_target_ids: [id],
  });
  if (Array.isArray(postHelpfulRows) && postHelpfulRows[0]) {
    postHelpfulCount = Number((postHelpfulRows as any[])[0]?.helpful_count ?? 0);
  }

  if (commentIds.length) {
    const { data: cRows } = await supabase.rpc("get_helpful_counts", {
      p_target_type: "comment",
      p_target_ids: commentIds,
    });
    if (Array.isArray(cRows)) {
      for (const r of cRows as any[]) {
        commentHelpful.set(r.target_id, Number(r.helpful_count ?? 0));
      }
    }
  }

  // My helpful active state
  let myPostHelpful = false;
  const myCommentHelpful = new Set<string>();
  if (user?.sub) {
    const { data: minePost } = await supabase
      .from("reactions")
      .select("target_id")
      .eq("user_id", user.sub)
      .eq("target_type", "post")
      .eq("kind", "helpful")
      .eq("target_id", id)
      .maybeSingle();
    myPostHelpful = !!(minePost as any)?.target_id;

    if (commentIds.length) {
      const { data: mineComments } = await supabase
        .from("reactions")
        .select("target_id")
        .eq("user_id", user.sub)
        .eq("target_type", "comment")
        .eq("kind", "helpful")
        .in("target_id", commentIds);
      for (const r of (mineComments ?? []) as any[]) {
        if (r?.target_id) myCommentHelpful.add(r.target_id);
      }
    }
  }

  // Media for this post
  const { data: mediaRows } = await supabase
    .from("post_media")
    .select("*")
    .eq("post_id", id)
    .order("created_at", { ascending: true });

  const media = (mediaRows ?? []) as any[];

  return (
    <div className="flex flex-col gap-5">
      {imagesFailed ? (
        <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/10 text-sm">
          Niektoré obrázky sa nepodarilo nahrať. Skontroluj bucket <span className="font-mono">post-images</span> a policies.
        </div>
      ) : null}

      {mediaFailed ? (
        <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/10 text-sm">
          Video/Audio sa nepodarilo nahrať. Skontroluj bucket <span className="font-mono">post-media</span> a policies (INSERT pre authenticated).
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <Link href="/forum" className="text-sm text-foreground/70 hover:underline">
          ← späť
        </Link>
        <div className="flex items-center gap-2">
          <ShareButton path={`/forum/p/${id}`} title={typedPost.title} label="Zdieľať" />
        </div>
      </div>


      {created ? (
        <Card className="border-foreground/15 bg-foreground/[0.02]">
          <CardHeader className="py-3">
            <div className="text-sm font-semibold">Hotovo ✅ Čo ďalej?</div>
          </CardHeader>
          <CardContent className="pt-0 pb-4 flex flex-wrap gap-2">
            <ShareButton path={`/forum/p/${id}`} title={typedPost.title} label="Zdieľať link" />
            <Button asChild size="sm" variant="outline">
              <a href="#comments">Pridať komentár</a>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={`/forum?category=${encodeURIComponent(typedPost.category)}`}>Späť do kategórie</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={typedPost.type === "request" ? "default" : "secondary"}>
              {typedPost.type === "request" ? "Dopyt/Ponuka" : typedPost.type === "product" ? "Projekt" : "AI výstup"}
            </Badge>
            <Badge variant="outline">{typedPost.category}</Badge>
            <Badge variant="outline">{typedPost.lang.toUpperCase()}</Badge>
            <Badge variant="outline">{typedPost.status === "solved" ? "✅ Riešené" : typedPost.status === "archived" ? "🗄️ Archív" : "🕓 Otvorené"}</Badge>
            {Array.isArray(typedPost.tags) && typedPost.tags.includes("pinned") ? <Badge variant="outline">⭐ Pinned</Badge> : null}
            {typedPost.is_hidden ? <Badge variant="destructive">Skryté</Badge> : null}
            <span className="text-xs text-foreground/60 ml-auto">{formatDateTime(typedPost.created_at)}</span>
          </div>

          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl font-bold leading-snug">{typedPost.title}</h1>

            <div className="flex items-center gap-2">
              <HelpfulButton
                targetType="post"
                targetId={id}
                initialCount={postHelpfulCount}
                initialActive={myPostHelpful}
              />
              <ReportButton targetType="post" targetId={id} />
              {isMod ? <HideToggleButton table="posts" id={id} isHidden={!!typedPost.is_hidden} size="sm" /> : null}
              {canDeletePost ? <DeletePostButton postId={id} /> : null}
            </div>
          </div>

          {typedPost.tags?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {typedPost.tags.map((t) => (
                <Link
                  key={t}
                  href={`/forum?tag=${encodeURIComponent(t)}`}
                  className="text-xs px-2 py-0.5 rounded-full border border-foreground/10 hover:border-foreground/30"
                >
                  #{t}
                </Link>
              ))}
            </div>
          ) : null}

          <div className="text-xs text-foreground/60">Autor: {shortId(typedPost.author_id)}</div>
        </CardHeader>

        <CardContent className="space-y-4">
          {typedPost.context ? (
            <div>
              <h2 className="text-sm font-semibold mb-1">Kontext</h2>
              <p className="text-sm whitespace-pre-wrap">{typedPost.context}</p>
            </div>
          ) : null}

          {typedPost.prompt ? (
            <div>
              <h2 className="text-sm font-semibold mb-1">Prompt</h2>
              <pre className="text-xs whitespace-pre-wrap rounded-md border border-foreground/10 p-3 overflow-auto">
                {typedPost.prompt}
              </pre>
            </div>
          ) : null}

          {typedPost.output ? (
            <div>
              <h2 className="text-sm font-semibold mb-1">Obsah</h2>
              <pre className="text-xs whitespace-pre-wrap rounded-md border border-foreground/10 p-3 overflow-auto">
                {typedPost.output}
              </pre>
            </div>
          ) : null}

          {typedPost.image_urls?.length ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {typedPost.image_urls.map((u) => (
                <a key={u} href={u} target="_blank" rel="noreferrer">
                  <img src={u} alt="" className="w-full h-32 object-cover rounded-md border border-foreground/10" />
                </a>
              ))}
            </div>
          ) : null}

          {media.length ? (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold">Media</h2>
              <div id="comments" className="flex flex-col gap-3">
                {media.map((m) => (
                  <div key={m.id} className="rounded-md border border-foreground/10 p-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="text-xs text-foreground/60 truncate">
                        {m.original_name ?? m.url}
                      </div>
                      <div className="flex items-center gap-2">
                        {isAdmin ? (
                          <Button asChild size="sm" variant="outline">
                            <a href={m.url} download target="_blank" rel="noreferrer">
                              Stiahnuť
                            </a>
                          </Button>
                        ) : null}
                        <Button asChild size="sm" variant="outline">
                          <a href={m.url} target="_blank" rel="noreferrer">
                            Otvoriť
                          </a>
                        </Button>
                      </div>
                    </div>

                    {String(m.media_type) === "video" ? (
                      <video controls preload="metadata" className="w-full rounded-md">
                        <source src={m.url} type={m.mime_type ?? "video/mp4"} />
                      </video>
                    ) : (
                      <audio controls preload="metadata" className="w-full">
                        <source src={m.url} type={m.mime_type ?? "audio/mpeg"} />
                      </audio>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Komentáre ({comments.length})</h2>
          <Link href="/forum/new" className="text-sm underline">
            + nový príspevok
          </Link>
        </div>

        {user?.sub ? (
          <CommentForm postId={id} userId={user.sub} />
        ) : (
          <div className="p-4 rounded-lg border border-foreground/10 text-sm">
            Pre pridanie komentára sa prihlás.
            <Link href={`/auth/login?next=${encodeURIComponent(`/forum/p/${id}`)}`} className="ml-2 underline">
              Prihlásiť sa
            </Link>
          </div>
        )}

        {comments.length === 0 ? (
          <div className="p-6 rounded-lg border border-foreground/10 text-sm text-foreground/70">
            Zatiaľ bez komentárov.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {comments.map((c) => {
              const canDeleteComment = isMod || (!!user?.sub && user.sub === c.author_id);
              const cHelpful = commentHelpful.get(c.id) ?? 0;
              const myActive = myCommentHelpful.has(c.id);

              return (
                <Card key={c.id}>
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between text-xs text-foreground/60">
                      <span className="flex items-center gap-2">Autor: {shortId(c.author_id)} {c.is_solution ? <Badge variant="default">✅ Riešenie</Badge> : null}</span>
                      <span>{formatDateTime(c.created_at)}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 pb-4 space-y-3">
                    {c.is_hidden ? (
                      <div className="text-sm text-foreground/60 italic">
                        Tento komentár je skrytý.
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{c.body}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      {(isMod || (!!user?.sub && user.sub === typedPost.author_id)) ? (
                        <SolutionToggleButton postId={id} commentId={c.id} initialSolved={!!c.is_solution} />
                      ) : null}
                      <HelpfulButton
                        targetType="comment"
                        targetId={c.id}
                        initialCount={cHelpful}
                        initialActive={myActive}
                        size="sm"
                      />
                      <ReportButton targetType="comment" targetId={c.id} size="sm" />
                      {isMod ? (
                        <HideToggleButton table="comments" id={c.id} isHidden={!!c.is_hidden} size="sm" />
                      ) : null}
                      {canDeleteComment ? <DeleteCommentButton commentId={c.id} /> : null}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
