"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function SolutionToggleButton({
  postId,
  commentId,
  initialSolved,
}: {
  postId: string;
  commentId: string;
  initialSolved: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [solved, setSolved] = useState(initialSolved);

  const toggle = async () => {
    setBusy(true);
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return;

      const { data, error } = await supabase.rpc("toggle_solution", {
        p_post_id: postId,
        p_comment_id: commentId,
      });

      if (error) throw error;

      // RPC returns boolean: true = now solved, false = now unsolved
      setSolved(!!data);
      router.refresh();
    } catch (e) {
      // Minimal UX: don't crash the page; just log.
      console.error(e);
      alert("Nepodarilo sa zmeniť riešenie. Skús znova.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      type="button"
      size="sm"
      variant={solved ? "default" : "outline"}
      disabled={busy}
      onClick={(e) => {
        e.stopPropagation();
        toggle();
      }}
      title={solved ? "Zrušiť riešenie" : "Označiť ako riešenie"}
    >
      {solved ? "✅ Riešenie" : "Označiť riešenie"}
    </Button>
  );
}
