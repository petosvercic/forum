import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { PostRow } from "@/lib/forum/types";
import { formatDateTime, shortId } from "@/lib/forum/format";

function typeLabel(type: PostRow["type"]) {
  return type === "request" ? "Dopyt" : "AI výstup";
}

export function PostCard({ post }: { post: PostRow }) {
  const firstImage = post.image_urls?.[0];
  return (
    <Card className="hover:bg-foreground/[0.02] transition">
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={post.type === "request" ? "default" : "secondary"}>
              {typeLabel(post.type)}
            </Badge>
            <Badge variant="outline">{post.category}</Badge>
            <Badge variant="outline">{post.lang.toUpperCase()}</Badge>
          </div>
          <div className="text-xs text-foreground/60">
            {formatDateTime(post.created_at)}
          </div>
        </div>
        <Link
          href={`/forum/p/${post.id}`}
          className="text-lg font-semibold leading-snug hover:underline"
        >
          {post.title}
        </Link>
        <div className="flex flex-wrap gap-1.5">
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
      </CardHeader>
      <CardContent>
        <div className="flex gap-3">
          <div className="flex-1 space-y-2">
            {post.context ? (
              <p className="text-sm text-foreground/80 max-h-16 overflow-hidden">
                {post.context}
              </p>
            ) : post.output ? (
              <p className="text-sm text-foreground/80 max-h-16 overflow-hidden">
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
              className="w-28 h-20 object-cover rounded-md border border-foreground/10"
            />
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
