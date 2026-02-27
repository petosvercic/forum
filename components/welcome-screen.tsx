"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PRODUCT_NAME, TAGLINE } from "@/lib/brand";

export function WelcomeScreen({
  showSkip = true,
}: {
  showSkip?: boolean;
}) {
  const [skipNextTime, setSkipNextTime] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem("viora_skip_welcome");
      setSkipNextTime(v === "1");
    } catch {}
  }, []);

  const setSkip = (val: boolean) => {
    setSkipNextTime(val);
    try {
      localStorage.setItem("viora_skip_welcome", val ? "1" : "0");
    } catch {}
  };

  return (
    <div className="min-h-[calc(100vh-2rem)] flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl viora-panel">
        <CardHeader className="space-y-2">
          <CardTitle className="text-3xl font-bold tracking-tight">
            {PRODUCT_NAME}
          </CardTitle>
          <p className="text-sm text-foreground/70">{TAGLINE}</p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-3 text-sm leading-relaxed text-foreground/85">
            <p>
              Máš nápad, AI výstup alebo plán a vieš, že sám to nedáš? Super.
              Presne na to je Viora.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Zdieľaj AI výstupy a nechaj si ich skontrolovať, vylepšiť, doplniť.</li>
              <li>Hľadaj ľudí podľa <span className="font-medium">skills</span> a portfólia, nie podľa papierov.</li>
              <li>Rozbiehaj projekty spolu, nie osamote.</li>
            </ul>
            <p className="text-foreground/70">
              Toto nie je ďalšia nástenka. Je to miesto, kde sa z nápadov robia veci.
            </p>
          </div>

          {showSkip ? (
            <label className="flex items-center gap-2 text-xs text-foreground/70 select-none">
              <input
                type="checkbox"
                checked={skipNextTime}
                onChange={(e) => setSkip(e.target.checked)}
                className="h-4 w-4 accent-foreground"
              />
              Nabudúce preskočiť úvod
            </label>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <Button asChild>
              <Link href="/forum">Vstúpiť do fóra</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/auth/login?next=%2Fforum">Prihlásiť</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/auth/sign-up?next=%2Fforum">Registrovať</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/forum">Len browse</Link>
            </Button>
          </div>

          <div className="text-xs text-foreground/60">
            Tip: Zdieľaj tento brief ako link: <span className="font-mono">/welcome</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
