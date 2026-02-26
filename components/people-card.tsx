"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ProfileRow, ProfileReputationRow, UserRole } from "@/lib/forum/types";

export function PeopleCard({
  profile,
  reputation,
  isAdmin,
}: {
  profile: ProfileRow;
  reputation?: ProfileReputationRow;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>((profile.role as UserRole) || "user");
  const [busy, setBusy] = useState(false);

  const href = profile.handle ? `/forum/u/${encodeURIComponent(profile.handle)}` : null;

  const open = () => {
    if (href) router.push(href);
  };

  const updateRole = async (nextRole: UserRole) => {
    setRole(nextRole);
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({ role: nextRole })
        .eq("id", profile.id);
      if (error) throw error;
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      className={`hover:bg-foreground/[0.02] transition ${href ? "cursor-pointer" : ""}`}
      onClick={open}
    >
      <CardHeader className="py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-semibold">
              {profile.display_name || profile.handle || "Profil"}
            </div>
            <div className="text-xs text-foreground/60">
              @{profile.handle || "—"} • {profile.region || "bez regiónu"}
              {isAdmin && profile.is_public === false ? (
                <span className="ml-2 rounded-full border border-foreground/10 px-2 py-0.5">
                  skrytý v Ľudia
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {href ? (
              <Button asChild size="sm" variant="outline">
                <Link href={href}>Profil</Link>
              </Button>
            ) : null}

            {isAdmin ? (
              <select
                value={role}
                disabled={busy}
                onChange={(e) => updateRole(e.target.value as UserRole)}
                className="h-9 rounded-md border border-foreground/10 bg-transparent px-2 text-sm"
                title="Rola"
              >
                <option value="user">user</option>
                <option value="moderator">moderator</option>
                <option value="admin">admin</option>
              </select>
            ) : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 pb-3">
        {profile.bio ? (
          <p className="text-sm text-foreground/80 max-h-12 overflow-hidden">
            {profile.bio}
          </p>
        ) : (
          <p className="text-sm text-foreground/60">Bez bio.</p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-foreground/70">
          <span className="tabular-nums">🧩 posts: {reputation?.posts_count ?? 0}</span>
          <span className="tabular-nums">💬 comments: {reputation?.comments_count ?? 0}</span>
          <span className="tabular-nums">👍 helpful: {reputation?.helpful_received ?? 0}</span>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
          {(profile.skills || []).slice(0, 10).map((s) => (
            <Link
              key={s}
              href={`/forum/people?skill=${encodeURIComponent(s)}`}
              className="text-xs px-2 py-0.5 rounded-full border border-foreground/10 hover:border-foreground/30"
            >
              #{s}
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
