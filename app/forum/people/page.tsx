import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { ProfileRow, ProfileReputationRow } from "@/lib/forum/types";

type SearchParams = {
  q?: string;
  skill?: string;
  region?: string;
};

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() || "";
  const skill = sp.skill?.trim().replace(/^#/, "") || "";
  const region = sp.region?.trim() || "";

  const supabase = await createClient();

  let query = supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (q) {
    // lightweight search
    query = query.or(
      `handle.ilike.%${q}%,display_name.ilike.%${q}%,bio.ilike.%${q}%`
    );
  }
  if (skill) query = query.contains("skills", [skill]);
  if (region) query = query.ilike("region", `%${region}%`);

  const { data, error } = await query;
  const profiles = (data ?? []) as ProfileRow[];

  // Reputation metrics
  const repMap = new Map<string, ProfileReputationRow>();
  if (profiles.length) {
    const ids = profiles.map((p) => p.id);
    const { data: reps } = await supabase.rpc("get_profiles_reputation", {
      p_profile_ids: ids,
    });
    if (Array.isArray(reps)) {
      for (const r of reps as any[]) {
        repMap.set(r.profile_id, {
          profile_id: r.profile_id,
          posts_count: Number(r.posts_count ?? 0),
          comments_count: Number(r.comments_count ?? 0),
          helpful_received: Number(r.helpful_received ?? 0),
        });
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Ľudia</h1>
          <p className="text-sm text-foreground/70">
            Nájdeš šikovných ľudí podľa skills a regiónu. Portfólio = ich príspevky.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/forum">← späť na feed</Link>
        </Button>
      </div>

      <form
        action="/forum/people"
        method="get"
        className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg border border-foreground/10"
      >
        <div className="flex flex-col gap-1">
          <label className="text-xs text-foreground/60">Hľadať</label>
          <input
            name="q"
            defaultValue={q}
            placeholder="meno, handle, bio…"
            className="h-9 rounded-md border border-foreground/10 bg-transparent px-3 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-foreground/60">Skill</label>
          <input
            name="skill"
            defaultValue={skill}
            placeholder="#elektro / supabase"
            className="h-9 rounded-md border border-foreground/10 bg-transparent px-3 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-foreground/60">Región</label>
          <input
            name="region"
            defaultValue={region}
            placeholder="Bratislava / Košice / CZ…"
            className="h-9 rounded-md border border-foreground/10 bg-transparent px-3 text-sm"
          />
        </div>

        <div className="sm:col-span-3 flex items-center gap-2">
          <Button type="submit" size="sm">
            Hľadať
          </Button>
          <Button type="button" size="sm" variant="outline" asChild>
            <Link href="/forum/people">Reset</Link>
          </Button>
        </div>
      </form>

      {error ? (
        <div className="p-4 rounded-lg border border-red-500/30 bg-red-500/5">
          <p className="text-sm text-red-500">
            Nepodarilo sa načítať profily: {error.message}
          </p>
        </div>
      ) : profiles.length === 0 ? (
        <div className="p-8 rounded-lg border border-foreground/10 text-center">
          <p className="text-sm text-foreground/70">Nič sme nenašli.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {profiles.map((p) => {
            const rep = repMap.get(p.id);
            return (
              <Card key={p.id} className="hover:bg-foreground/[0.02] transition">
                <CardHeader className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">
                        {p.display_name || p.handle || "Profil"}
                      </div>
                      <div className="text-xs text-foreground/60">
                        @{p.handle || "—"} • {p.region || "bez regiónu"}
                      </div>
                    </div>

                    {p.handle ? (
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/forum/u/${encodeURIComponent(p.handle)}`}>
                          Portfólio
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pb-3">
                  {p.bio ? (
                    <p className="text-sm text-foreground/80 max-h-12 overflow-hidden">
                      {p.bio}
                    </p>
                  ) : (
                    <p className="text-sm text-foreground/60">Bez bio.</p>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-foreground/70">
                    <span className="tabular-nums">🧩 posts: {rep?.posts_count ?? 0}</span>
                    <span className="tabular-nums">💬 comments: {rep?.comments_count ?? 0}</span>
                    <span className="tabular-nums">👍 helpful: {rep?.helpful_received ?? 0}</span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(p.skills || []).slice(0, 10).map((s) => (
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
          })}
        </div>
      )}

      <div className="text-xs text-foreground/60">
        Zobrazených: {profiles.length} (max 50)
      </div>
    </div>
  );
}
