import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HideToggleButton } from "@/components/hide-toggle";
import { ResolveReportButton } from "@/components/resolve-report-button";
import type { ReportRow, PostRow, CommentRow } from "@/lib/forum/types";
import { formatDateTime, shortId } from "@/lib/forum/format";

export default async function ModerationPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  if (!user?.sub) {
    redirect(`/auth/login?next=${encodeURIComponent("/forum/moderation")}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.sub)
    .maybeSingle();
  const role = (profile as any)?.role ?? "user";
  const isMod = role === "moderator" || role === "admin";

  if (!isMod) {
    redirect("/forum");
  }

  const { data: reportsData, error } = await supabase
    .from("reports")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(100);

  const reports = (reportsData ?? []) as ReportRow[];

  const postIds = reports.filter((r) => r.target_type === "post").map((r) => r.target_id);
  const commentIds = reports.filter((r) => r.target_type === "comment").map((r) => r.target_id);

  const postMap = new Map<string, PostRow>();
  const commentMap = new Map<string, CommentRow>();

  if (postIds.length) {
    const { data: posts } = await supabase.from("posts").select("*").in("id", postIds);
    for (const p of (posts ?? []) as any[]) postMap.set(p.id, p as PostRow);
  }

  if (commentIds.length) {
    const { data: comments } = await supabase.from("comments").select("*").in("id", commentIds);
    for (const c of (comments ?? []) as any[]) commentMap.set(c.id, c as CommentRow);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Moderácia</h1>
          <p className="text-sm text-foreground/70">
            Reporty, skrytie obsahu (bez mazania) a uzatvorenie reportu.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/forum">← späť</Link>
        </Button>
      </div>

      {error ? (
        <div className="p-4 rounded-lg border border-red-500/30 bg-red-500/5">
          <p className="text-sm text-red-500">Chyba: {error.message}</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="p-6 rounded-lg border border-foreground/10 text-sm text-foreground/70">
          Žiadne otvorené reporty.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {reports.map((r) => {
            const targetPost = r.target_type === "post" ? postMap.get(r.target_id) : null;
            const targetComment = r.target_type === "comment" ? commentMap.get(r.target_id) : null;

            const title =
              r.target_type === "post"
                ? targetPost?.title ?? "(post nenájdený)"
                : `Komentár: ${(targetComment?.body ?? "").slice(0, 80) || "(nenájdený)"}`;

            const isHidden =
              (r.target_type === "post" ? targetPost?.is_hidden : targetComment?.is_hidden) ?? false;

            const linkHref =
              r.target_type === "post"
                ? `/forum/p/${r.target_id}`
                : targetComment
                ? `/forum/p/${targetComment.post_id}`
                : "/forum";

            return (
              <Card key={r.id}>
                <CardHeader className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">
                        <Link className="underline" href={linkHref}>
                          {title}
                        </Link>
                      </div>
                      <div className="text-xs text-foreground/60 mt-1 flex flex-wrap gap-2">
                        <span>Typ: {r.target_type}</span>
                        <span>Reporter: {shortId(r.reporter_id)}</span>
                        <span>{formatDateTime(r.created_at)}</span>
                        {isHidden ? <span className="text-amber-600">Skryté</span> : null}
                      </div>
                      {r.reason ? (
                        <div className="mt-2 text-sm text-foreground/80 whitespace-pre-wrap">
                          {r.reason}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {r.target_type === "post" ? (
                        <HideToggleButton table="posts" id={r.target_id} isHidden={!!targetPost?.is_hidden} />
                      ) : (
                        <HideToggleButton table="comments" id={r.target_id} isHidden={!!targetComment?.is_hidden} />
                      )}
                      <ResolveReportButton reportId={r.id} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pb-3">
                  <div className="text-xs text-foreground/60">
                    ID: {r.id}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="text-xs text-foreground/60">
        Otvorené reporty: {reports.length} (max 100)
      </div>
    </div>
  );
}
