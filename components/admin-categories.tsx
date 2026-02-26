"use client";

import { useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import type { ForumCategoryRow } from "@/lib/forum/types";
import { slugifyCategory, sortCategories } from "@/lib/forum/categories";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AdminCategories({ initial }: { initial: ForumCategoryRow[] }) {
  const [rows, setRows] = useState<ForumCategoryRow[]>(sortCategories(initial));
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [sortOrder, setSortOrder] = useState("100");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewSlug = useMemo(() => (slug.trim() ? slugifyCategory(slug) : slugifyCategory(name)), [name, slug]);

  const refresh = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("forum_categories")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw error;
    setRows(sortCategories((data ?? []) as any));
  };

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const payload = {
        name: name.trim(),
        slug: previewSlug,
        sort_order: Number(sortOrder || 100),
        is_active: true,
      };
      if (!payload.name) throw new Error("Názov je povinný");
      const { error } = await supabase.from("forum_categories").insert(payload);
      if (error) throw error;
      setName("");
      setSlug("");
      setSortOrder("100");
      await refresh();
    } catch (e: any) {
      setError(e?.message ?? "Nastala chyba");
    } finally {
      setBusy(false);
    }
  };

  const update = async (id: string, patch: Partial<ForumCategoryRow>) => {
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("forum_categories").update(patch).eq("id", id);
      if (error) throw error;
      await refresh();
    } catch (e: any) {
      setError(e?.message ?? "Nastala chyba");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Naozaj zmazať túto kategóriu? Existujúce príspevky tým nezmeníš.")) return;
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("forum_categories").delete().eq("id", id);
      if (error) throw error;
      await refresh();
    } catch (e: any) {
      setError(e?.message ?? "Nastala chyba");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">Kategórie</h1>
        <p className="text-sm text-foreground/70">
          Správa skupín pre Vioru. Používajú sa vo feede aj pri vytváraní príspevkov.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="font-semibold">Pridať kategóriu</div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1">
            <Label>Názov</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Remeslo a technika" />
          </div>
          <div className="flex flex-col gap-1">
            <Label>Slug (voliteľné)</Label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="remeslo-a-technika" />
            <div className="text-xs text-foreground/60">Použije sa: <span className="font-mono">{previewSlug || "—"}</span></div>
          </div>
          <div className="flex flex-col gap-1">
            <Label>Poradie</Label>
            <Input value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} inputMode="numeric" />
          </div>
          <div className="flex items-end">
            <Button type="button" disabled={busy} onClick={create}>
              Pridať
            </Button>
          </div>
          {error ? <p className="md:col-span-4 text-sm text-red-500">{error}</p> : null}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3">
        {rows.map((c) => (
          <Card key={c.id} className="overflow-hidden">
            <CardHeader className="py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">{c.name}</div>
                  <div className="text-xs text-foreground/60">
                    slug: <span className="font-mono">{c.slug}</span> • order: {c.sort_order}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={c.is_active ? "outline" : "default"}
                    disabled={busy}
                    onClick={() => update(c.id, { is_active: !c.is_active })}
                  >
                    {c.is_active ? "Vypnúť" : "Zapnúť"}
                  </Button>
                  <Button type="button" size="sm" variant="destructive" disabled={busy} onClick={() => remove(c.id)}>
                    Zmazať
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 pb-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <Label>Názov</Label>
                  <Input
                    defaultValue={c.name}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v && v !== c.name) update(c.id, { name: v, slug: slugifyCategory(v) });
                    }}
                  />
                  <div className="text-xs text-foreground/60">Zmena názvu môže spôsobiť, že staré príspevky ostanú v pôvodnej kategórii.</div>
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Slug</Label>
                  <Input
                    defaultValue={c.slug}
                    onBlur={(e) => {
                      const v = slugifyCategory(e.target.value);
                      if (v && v !== c.slug) update(c.id, { slug: v });
                    }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Poradie</Label>
                  <Input
                    defaultValue={String(c.sort_order ?? 100)}
                    inputMode="numeric"
                    onBlur={(e) => {
                      const v = Number(e.target.value || 100);
                      if (!Number.isNaN(v) && v !== c.sort_order) update(c.id, { sort_order: v as any });
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
