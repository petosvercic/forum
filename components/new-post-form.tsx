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

const MAX_IMAGES = 5;
const MAX_IMAGE_MB = 10;

const MAX_MEDIA = 3;
const MAX_MEDIA_MB = 60; // keep it sane for v1

function isMediaFile(f: File) {
  return f.type.startsWith("video/") || f.type.startsWith("audio/");
}

export function NewPostForm({
  userId,
  categories,
}: {
  userId: string;
  categories: string[];
}) {
  const router = useRouter();
  const [type, setType] = useState<PostType>("ai_output");
  const [lang, setLang] = useState<PostLang>("sk");
  const categoryOptions = categories?.length ? categories : [...CATEGORIES];
  const [category, setCategory] = useState<string>(categoryOptions[0] || "Meta");
  const [title, setTitle] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [context, setContext] = useState("");
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tags = useMemo(() => normalizeTags(tagsText), [tagsText]);

  const onPickImages = (files: FileList | null) => {
    const picked = Array.from(files ?? []).slice(0, MAX_IMAGES);

    const tooBig = picked.find((f) => f.size > MAX_IMAGE_MB * 1024 * 1024);
    if (tooBig) {
      setError(`Obrázok "${tooBig.name}" je príliš veľký. Max ${MAX_IMAGE_MB} MB.`);
      return;
    }

    setImageFiles(picked);
  };

  const onPickMedia = (files: FileList | null) => {
    const picked = Array.from(files ?? []).filter(isMediaFile).slice(0, MAX_MEDIA);

    const tooBig = picked.find((f) => f.size > MAX_MEDIA_MB * 1024 * 1024);
    if (tooBig) {
      setError(`Súbor "${tooBig.name}" je príliš veľký. Max ${MAX_MEDIA_MB} MB.`);
      return;
    }

    setMediaFiles(picked);
  };

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

      // 1) Insert post first
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

      const { data, error } = await supabase.from("posts").insert(payload).select("id").single();
      if (error) throw error;
      if (!data?.id) throw new Error("Neočakávaná odpoveď z databázy");

      const postId = data.id as string;

      // 2) Upload images (optional)
      let imagesFailed = false;
      if (imageFiles.length) {
        try {
          const urls: string[] = [];

          for (const file of imageFiles) {
            const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
            const fileName = `${crypto.randomUUID()}.${ext}`;
            const path = `${userId}/${postId}/${fileName}`;

            const { error: upErr } = await supabase.storage
              .from("post-images")
              .upload(path, file, { upsert: false, cacheControl: "3600" });

            if (upErr) throw upErr;

            const { data: pub } = supabase.storage.from("post-images").getPublicUrl(path);
            if (pub?.publicUrl) urls.push(pub.publicUrl);
          }

          if (urls.length) {
            const { error: updErr } = await supabase.from("posts").update({ image_urls: urls }).eq("id", postId);
            if (updErr) throw updErr;
          }
        } catch {
          imagesFailed = true;
        }
      }

      // 3) Upload media (optional)
      let mediaFailed = false;
      if (mediaFiles.length) {
        try {
          for (const file of mediaFiles) {
            const ext = (file.name.split(".").pop() || "bin").toLowerCase();
            const fileName = `${crypto.randomUUID()}.${ext}`;
            const path = `${userId}/${postId}/${fileName}`;

            const { error: upErr } = await supabase.storage
              .from("post-media")
              .upload(path, file, { upsert: false, cacheControl: "3600" });

            if (upErr) throw upErr;

            const { data: pub } = supabase.storage.from("post-media").getPublicUrl(path);
            const publicUrl = pub?.publicUrl;
            if (!publicUrl) throw new Error("Nepodarilo sa získať URL pre upload");

            const media_type = file.type.startsWith("video/") ? "video" : "audio";

            const { error: insErr } = await supabase.from("post_media").insert({
              post_id: postId,
              uploader_id: userId,
              url: publicUrl,
              mime_type: file.type || null,
              media_type,
              original_name: file.name,
              size_bytes: file.size,
            });

            if (insErr) throw insErr;
          }
        } catch {
          mediaFailed = true;
        }
      }

      const qp = new URLSearchParams();
      if (imagesFailed) qp.set("img", "failed");
      if (mediaFailed) qp.set("media", "failed");

      router.push(qp.toString() ? `/forum/p/${postId}?${qp.toString()}` : `/forum/p/${postId}`);
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
                {categoryOptions.map((c) => (
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
              Rozdeľ čiarkou. Uloží sa max 12 tagov.{" "}
              {tags.length ? <span className="ml-2">Preview: {tags.map((t) => `#${t}`).join(" ")}</span> : null}
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
              <Label htmlFor="output">Obsah</Label>
              <textarea
                id="output"
                value={output}
                onChange={(e) => setOutput(e.target.value)}
                placeholder="Popíš čo chceš riešiť / čo už máš / výstup…"
                className="min-h-32 w-full rounded-md border border-foreground/10 bg-transparent p-3 text-sm"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label>Obrázky (voliteľné)</Label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => onPickImages(e.target.files)}
                className="text-sm"
              />
              <div className="text-xs text-foreground/60">
                Max {MAX_IMAGES} súborov, {MAX_IMAGE_MB} MB/ks.
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <Label>Video / Audio (voliteľné)</Label>
              <input
                type="file"
                accept="video/*,audio/*"
                multiple
                onChange={(e) => onPickMedia(e.target.files)}
                className="text-sm"
              />
              <div className="text-xs text-foreground/60">
                Max {MAX_MEDIA} súborov, {MAX_MEDIA_MB} MB/ks. (v1)
              </div>
            </div>
          </div>

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
            Poznámka: ak riešiš elektro / zdravie / bezpečnosť, dopíš jasné upozornenie. AI môže trepať.
          </p>

          <p className="text-xs text-foreground/60">
            Ak upload videa/audio zlyhá: vytvor bucket <span className="font-mono">post-media</span> v Supabase Storage a povoľ
            <span className="font-mono"> SELECT (public)</span> + <span className="font-mono"> INSERT (authenticated)</span>.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
