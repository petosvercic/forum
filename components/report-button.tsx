"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import type { ReactionTargetType } from "@/lib/forum/types";

export function ReportButton({
  targetType,
  targetId,
  size = "sm",
}: {
  targetType: ReactionTargetType;
  targetId: string;
  size?: "sm" | "default";
}) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const onReport = async () => {
    const reason = prompt("Prečo nahlasuješ? (voliteľné)") ?? "";
    if (reason === null) return;

    setBusy(true);
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return;

      const { error } = await supabase.from("reports").insert({
        target_type: targetType,
        target_id: targetId,
        reporter_id: auth.user.id,
        reason: reason.trim() ? reason.trim() : null,
      });

      if (error) throw error;
      setDone(true);
      setTimeout(() => setDone(false), 2500);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      type="button"
      size={size}
      variant="outline"
      disabled={busy || done}
      onClick={onReport}
      title={done ? "Nahlásené" : "Nahlásiť"}
      className="gap-2"
    >
      <span aria-hidden>🚩</span>
      <span className="text-xs">{done ? "Nahlásené" : "Nahlásiť"}</span>
    </Button>
  );
}
