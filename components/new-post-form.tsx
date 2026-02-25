"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CATEGORIES, POST_LANGS, POST_TYPES, normalizeTags } from "@/lib/forum/constants";
import type { PostLang, PostType } from "@/lib/forum/types";

export function NewPostForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [type, setType] = useState<PostType>("ai_output");
  const [lang, setLang] = useState<PostLang>("sk");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [title, setTitle] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [context, setContext] = useState("");
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tags = useMemo(() => normalizeTags(tagsText), [tagsText]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Názov je povinný");
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();

      const payload = {
        author_id: userId,
        type,
        lang,
        category,
        tags,
        title: title.trim(),
        context: context.trim() ? context.trim() : null,
        prompt: prompt.trim() ? prompt.trim() : null,
        output: output.trim() ? output.trim() : null,
      };

      const { data, error } = await supabase
        .from("posts")
        .insert(payload)
        .select("id")
        .single();

      if (error) throw error;
      if (!data?.id) throw new Error("Neočakávaná odpoveď z databázy");

      router.push(`/forum/p/`);
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
        <CardTitle>Nový príspevok</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <Label>Typ</Label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as PostType)}
                className="h-9 rounded-md border border-foreground/10 bg-transparent px-2 text-sm"
              >
                {POST_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <Label>Jazyk</Label>
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as PostLang)}
                className="h-9 rounded-md border border-foreground/10 bg-transparent px-2 text-sm"
              >
                {POST_LANGS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <Label>Kategória</Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-9 rounded-md border border-foreground/10 bg-transparent px-2 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="title">Názov</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Napr. Ako zautomatizovať faktúry v Supabase…"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="tags">Tagy</Label>
            <Input
              id="tags"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="supabase, nextjs, elektro"
            />
            <div className="text-xs text-foreground/60">
              Rozdeľ čiarkou. Uloží sa max 12 tagov. {tags.length ? (
                <span className="ml-2">Preview: {tags.map((t) => `#${t}`).join(" ")}</span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="context">Kontext</Label>
            <textarea
              id="context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Čo riešiš, prečo, aké obmedzenia…"
              className="min-h-28 w-full rounded-md border border-foreground/10 bg-transparent p-3 text-sm"
            />
          </div>

          {type === "ai_output" ? (
            <>
              <div className="flex flex-col gap-1">
                <Label htmlFor="prompt">Prompt (voliteľné)</Label>
                <textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Sem môžeš dať prompt, ak ho chceš zdieľať…"
                  className="min-h-24 w-full rounded-md border border-foreground/10 bg-transparent p-3 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="output">AI výstup</Label>
                <textarea
                  id="output"
                  value={output}
                  onChange={(e) => setOutput(e.target.value)}
                  placeholder="Vlož odpoveď / kód / postup…"
                  className="min-h-40 w-full rounded-md border border-foreground/10 bg-transparent p-3 text-sm"
                />
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-1">
              <Label htmlFor="output">Čo už máš (voliteľné)</Label>
              <textarea
                id="output"
                value={output}
                onChange={(e) => setOutput(e.target.value)}
                placeholder="AI návrh, logy, kód, poznámky…"
                className="min-h-32 w-full rounded-md border border-foreground/10 bg-transparent p-3 text-sm"
              />
            </div>
          )}

          {error ? <p className="text-sm text-red-500">{error}</p> : null}

          <div className="flex items-center gap-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Ukladám…" : "Publikovať"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Zrušiť
            </Button>
          </div>

          <p className="text-xs text-foreground/60">
            Poznámka: ak riešiš elektro / zdravie / bezpečnosť, dopíš jasné
            upozornenie. AI môže trepať.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
