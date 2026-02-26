"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function HideToggleButton({
  table,
  id,
  isHidden,
  size = "sm",
}: {
  table: "posts" | "comments";
  id: string;
  isHidden: boolean;
  size?: "sm" | "default";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    setBusy(true);
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return;

      const nextHidden = !isHidden;
      const payload = nextHidden
        ? {
            is_hidden: true,
            hidden_by: auth.user.id,
            hidden_at: new Date().toISOString(),
          }
        : {
            is_hidden: false,
            hidden_by: null,
            hidden_at: null,
            hidden_reason: null,
          };

      const { error } = await supabase.from(table).update(payload).eq("id", id);
      if (error) throw error;

      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      type="button"
      size={size}
      variant={isHidden ? "default" : "outline"}
      disabled={busy}
      onClick={toggle}
      className="gap-2"
      title={isHidden ? "Obnoviť" : "Skryť"}
    >
      <span aria-hidden>{isHidden ? "👁️" : "🙈"}</span>
      <span className="text-xs">{isHidden ? "Obnoviť" : "Skryť"}</span>
    </Button>
  );
}
