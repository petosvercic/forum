"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function ResolveReportButton({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const onResolve = async () => {
    setBusy(true);
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return;

      const { error } = await supabase
        .from("reports")
        .update({
          status: "resolved",
          resolved_by: auth.user.id,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", reportId);

      if (error) throw error;
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button size="sm" variant="outline" disabled={busy} onClick={onResolve}>
      {busy ? "…" : "Vyriešené"}
    </Button>
  );
}
