"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function DeletePostButton({ postId }: { postId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onDelete = async () => {
    if (!confirm("Naozaj zmazať príspevok?")) return;

    setBusy(true);
    setErr(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("posts").delete().eq("id", postId);
      if (error) throw error;
      router.push("/forum");
      router.refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Chyba pri mazaní");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" variant="destructive" disabled={busy} onClick={onDelete}>
        {busy ? "Mažem…" : "Zmazať"}
      </Button>
      {err ? <div className="text-xs text-red-500">{err}</div> : null}
    </div>
  );
}

export function DeleteCommentButton({ commentId }: { commentId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const onDelete = async () => {
    if (!confirm("Zmazať komentár?")) return;

    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("comments").delete().eq("id", commentId);
      if (error) throw error;
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button size="sm" variant="outline" disabled={busy} onClick={onDelete}>
      {busy ? "…" : "Zmazať"}
    </Button>
  );
}
