"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProfileRow } from "@/lib/forum/types";
import { normalizeTags } from "@/lib/forum/constants";

export function ProfileForm({
  userId,
  initial,
  email,
}: {
  userId: string;
  email: string;
  initial: ProfileRow | null;
}) {
  const router = useRouter();
  const [handle, setHandle] = useState(initial?.handle ?? "");
  const [displayName, setDisplayName] = useState(initial?.display_name ?? "");
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [region, setRegion] = useState(initial?.region ?? "");
  const [skillsText, setSkillsText] = useState((initial?.skills ?? []).join(", "));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const skills = useMemo(() => normalizeTags(skillsText), [skillsText]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const supabase = createClient();
      const payload = {
        id: userId,
        handle: handle.trim() ? handle.trim() : null,
        display_name: displayName.trim() ? displayName.trim() : null,
        bio: bio.trim() ? bio.trim() : null,
        region: region.trim() ? region.trim() : null,
        skills,
      };

      const { error } = await supabase.from("profiles").upsert(payload);
      if (error) throw error;

      setSuccess(true);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Nastala chyba");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profil</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-foreground/70 mb-4">
          Prihlásený ako <span className="font-medium">{email}</span>
        </div>

        <form onSubmit={save} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="handle">Handle</Label>
              <Input
                id="handle"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="napr. peto"
              />
              <div className="text-xs text-foreground/60">
                Krátke meno do URL a pre komunitu.
              </div>
              <div className="text-xs text-foreground/60">
                Verejný profil: <span className="font-mono">/forum/u/{"<handle>"}</span>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="displayName">Zobrazené meno</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Peto"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="region">Región (voliteľné)</Label>
            <Input
              id="region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="Bratislava / Košice / CZ…"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="skills">Skills (tagy)</Label>
            <Input
              id="skills"
              value={skillsText}
              onChange={(e) => setSkillsText(e.target.value)}
              placeholder="elektro, revízia, supabase"
            />
            <div className="text-xs text-foreground/60">
              Uloží sa max 12 tagov. {skills.length ? (
                <span className="ml-2">Preview: {skills.map((t) => `#${t}`).join(" ")}</span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="bio">Bio</Label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Čomu sa venuješ, čo vieš…"
              className="min-h-24 w-full rounded-md border border-foreground/10 bg-transparent p-3 text-sm"
            />
          </div>

          {error ? <p className="text-sm text-red-500">{error}</p> : null}
          {success ? (
            <p className="text-sm text-emerald-500">Uložené ✅</p>
          ) : null}

          <div className="flex items-center gap-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Ukladám…" : "Uložiť"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push("/")}
            >
              Späť
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
