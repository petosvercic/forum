import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { HelpfulButton } from "@/components/helpful-button";
import type { PostRow } from "@/lib/forum/types";
import { formatDateTime, shortId } from "@/lib/forum/format";

function typeLabel(type: PostRow["type"]) {
  return type === "request" ? "Dopyt" : "AI výstup";
}

export function PostCard({ post }: { post: PostRow }) {
  const firstImage = post.image_urls?.[0];
  const commentCount = (post as any).comment_count as number | undefined;
  const helpfulCount = (post as any).helpful_count as number | undefined;
  const viewerHelpful = (post as any).viewer_helpful as boolean | undefined;

  return (
    <Card className="relative hover:bg-foreground/[0.02] transition cursor-pointer overflow-hidden">
      {/* Click anywhere to open */}
      <Link
        href={`/forum/p/${post.id}`}
        className="absolute inset-0 z-10"
        aria-label={post.title}
      >
        <span className="sr-only">Open</span>
      </Link>

      {/* Everything below is non-interactive so click passes to overlay */}
      <CardHeader className="relative z-20 pointer-events-none space-y-1.5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={post.type === "request" ? "default" : "secondary"}>
              {typeLabel(post.type)}
            </Badge>
            <Badge variant="outline">{post.category}</Badge>
            <Badge variant="outline">{post.lang.toUpperCase()}</Badge>
            {post.is_hidden ? <Badge variant="destructive">Skryté</Badge> : null}
          </div>
          <div className="text-xs text-foreground/60">
            {formatDateTime(post.created_at)}
          </div>
        </div>

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-base font-semibold leading-snug truncate">
              {post.title}
            </div>

            {/* Tags must stay clickable */}
            <div className="mt-1 flex flex-wrap gap-1.5 pointer-events-auto">
              {post.tags?.slice(0, 8).map((t) => (
                <Link
                  key={t}
                  href={`/forum?tag=${encodeURIComponent(t)}`}
                  className="text-xs px-2 py-0.5 rounded-full border border-foreground/10 hover:border-foreground/30"
                >
                  #{t}
                </Link>
              ))}
            </div>
          </div>

          {/* Quick actions must stay clickable */}
          <div className="flex items-center gap-2 shrink-0 pointer-events-auto">
            {typeof helpfulCount === "number" ? (
              <HelpfulButton
                targetType="post"
                targetId={post.id}
                initialCount={helpfulCount}
                initialActive={!!viewerHelpful}
                size="sm"
              />
            ) : null}
            <div className="text-xs text-foreground/60 flex items-center gap-1 tabular-nums">
              <span aria-hidden>💬</span>
              <span>{typeof commentCount === "number" ? commentCount : "—"}</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative z-20 pointer-events-none pt-0 pb-3">
        <div className="flex gap-3">
          <div className="flex-1">
            {post.context ? (
              <p className="text-sm text-foreground/80 max-h-14 overflow-hidden">
                {post.context}
              </p>
            ) : post.output ? (
              <p className="text-sm text-foreground/80 max-h-14 overflow-hidden">
                {post.output}
              </p>
            ) : (
              <p className="text-sm text-foreground/60">
                Bez popisu. Autor: {shortId(post.author_id)}
              </p>
            )}
          </div>

          {firstImage ? (
            <img
              src={firstImage}
              alt=""
              loading="lazy"
              className="w-24 h-16 object-cover rounded-md border border-foreground/10"
            />
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
