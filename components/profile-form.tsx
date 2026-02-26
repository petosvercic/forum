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

function normalizeHandle(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "")
    .replace(/-+/g, "-")
    .slice(0, 24);
}

export function ProfileForm({
  userId,
  initial,
  email,
  initialContactEmail,
}: {
  userId: string;
  email: string;
  initial: ProfileRow | null;
  initialContactEmail?: string | null;
}) {
  const router = useRouter();
  const [handle, setHandle] = useState(initial?.handle ?? "");
  const [displayName, setDisplayName] = useState(initial?.display_name ?? "");
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [region, setRegion] = useState(initial?.region ?? "");
  const [skillsText, setSkillsText] = useState((initial?.skills ?? []).join(", "));
  const [contactEmail, setContactEmail] = useState(initialContactEmail ?? "");
  const [isPublic, setIsPublic] = useState(
    initial?.is_public === null || typeof initial?.is_public === "undefined"
      ? true
      : !!initial.is_public
  );
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
      const cleanHandle = normalizeHandle(handle);
      const payload = {
        id: userId,
        handle: cleanHandle ? cleanHandle : null,
        display_name: displayName.trim() ? displayName.trim() : null,
        bio: bio.trim() ? bio.trim() : null,
        region: region.trim() ? region.trim() : null,
        skills,
        is_public: isPublic,
      };

      let { error } = await supabase.from("profiles").upsert(payload);
      // Backward-compat if DB isn't migrated yet
      if (error?.message?.includes("is_public")) {
        const { is_public, ...rest } = payload as any;
        const retry = await supabase.from("profiles").upsert(rest);
        error = retry.error;
      }
      if (error) throw error;

      // Contact email is stored separately (not visible to anonymous users).
      const trimmedContact = contactEmail.trim();
      if (trimmedContact) {
        const { error: ceErr } = await supabase
          .from("profile_contacts")
          .upsert({ profile_id: userId, contact_email: trimmedContact });
        if (ceErr) throw ceErr;
      } else {
        await supabase.from("profile_contacts").delete().eq("profile_id", userId);
      }

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
            <Label htmlFor="contactEmail">Kontaktný e-mail (voliteľné)</Label>
            <Input
              id="contactEmail"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="napr. kontakt@domena.sk"
              inputMode="email"
            />
            <div className="text-xs text-foreground/60">
              Zobrazí sa len prihláseným používateľom na tvojom verejnom profile.
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-foreground/10 p-3">
            <input
              id="isPublic"
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="mt-1"
            />
            <div className="flex-1">
              <Label htmlFor="isPublic">Zobraziť ma v zozname Ľudia</Label>
              <div className="text-xs text-foreground/60">
                Keď to vypneš, nebudeš v sekcii Ľudia, ale tvoj profil bude stále dostupný cez priamy link.
              </div>
            </div>
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
