import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CommentForm } from "@/components/comment-form";
import { createClient } from "@/lib/supabase/server";
import type { CommentRow, PostRow } from "@/lib/forum/types";
import { formatDateTime, shortId } from "@/lib/forum/format";

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .single();

  if (postError) {
    return (
      <div className="p-6 rounded-lg border border-red-500/30 bg-red-500/5">
        <p className="text-sm text-red-500">
          Príspevok sa nepodarilo načítať: {postError.message}
        </p>
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

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <Link href="/forum" className="text-sm text-foreground/70 hover:underline">
          ← späť
        </Link>
        <div className="text-xs text-foreground/60">
          Autor: {shortId(typedPost.author_id)}
        </div>
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={typedPost.type === "request" ? "default" : "secondary"}
            >
              {typedPost.type === "request" ? "Dopyt" : "AI výstup"}
            </Badge>
            <Badge variant="outline">{typedPost.category}</Badge>
            <Badge variant="outline">{typedPost.lang.toUpperCase()}</Badge>
            <span className="text-xs text-foreground/60 ml-auto">
              {formatDateTime(typedPost.created_at)}
            </span>
          </div>
          <h1 className="text-2xl font-bold leading-snug">{typedPost.title}</h1>
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
              <h2 className="text-sm font-semibold mb-1">Výstup</h2>
              <pre className="text-xs whitespace-pre-wrap rounded-md border border-foreground/10 p-3 overflow-auto">
                {typedPost.output}
              </pre>
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
            <Link
              href={`/auth/login?next=${encodeURIComponent(`/forum/p/${id}`)}`}
              className="ml-2 underline"
            >
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
            {comments.map((c) => (
              <Card key={c.id}>
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between text-xs text-foreground/60">
                    <span>Autor: {shortId(c.author_id)}</span>
                    <span>{formatDateTime(c.created_at)}</span>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pb-4">
                  <p className="text-sm whitespace-pre-wrap">{c.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
