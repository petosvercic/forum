"use client";

import { useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import type { ReactionTargetType } from "@/lib/forum/types";

export function HelpfulButton({
  targetType,
  targetId,
  initialCount,
  initialActive = false,
  size = "sm",
}: {
  targetType: ReactionTargetType;
  targetId: string;
  initialCount: number;
  initialActive?: boolean;
  size?: "sm" | "default";
}) {
  const [active, setActive] = useState(!!initialActive);
  const [count, setCount] = useState(initialCount ?? 0);
  const [busy, setBusy] = useState(false);

  const label = useMemo(() => {
    if (count === 1) return "1 užitočné";
    if (count >= 2 && count <= 4) return `${count} užitočné`;
    return `${count} užitočných`;
  }, [count]);

  const toggle = async () => {
    setBusy(true);
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) {
        // user is not logged in; ignore
        return;
      }

      if (active) {
        const { error } = await supabase
          .from("reactions")
          .delete()
          .eq("target_type", targetType)
          .eq("target_id", targetId)
          .eq("kind", "helpful");
        if (error) throw error;
        setActive(false);
        setCount((c) => Math.max(0, c - 1));
      } else {
        const { error } = await supabase.from("reactions").insert({
          user_id: auth.user.id,
          target_type: targetType,
          target_id: targetId,
          kind: "helpful",
        });
        if (error) throw error;
        setActive(true);
        setCount((c) => c + 1);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      type="button"
      size={size}
      variant={active ? "default" : "outline"}
      disabled={busy}
      onClick={toggle}
      className="gap-2"
      title={label}
    >
      <span aria-hidden>👍</span>
      <span className="text-xs tabular-nums">{count}</span>
      <span className="sr-only">{label}</span>
    </Button>
  );
}
