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
    <div className="relative min-h-[calc(100vh-2rem)] flex items-center justify-center p-4 overflow-hidden">
      {/* floating HUD-ish elements (pure decoration) */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-6 top-10 viora-chip viora-float opacity-80">
          <span className="h-1.5 w-1.5 rounded-full bg-[rgba(0,220,255,0.9)]" />
          Projekty & spolupráce
        </div>
        <div className="absolute right-10 top-16 viora-chip viora-float opacity-70" style={{ animationDelay: "-2s" }}>
          <span className="h-1.5 w-1.5 rounded-full bg-[rgba(190,120,255,0.9)]" />
          Q&A / otázky
        </div>
        <div className="absolute left-10 bottom-16 viora-chip viora-float opacity-65" style={{ animationDelay: "-5s" }}>
          <span className="h-1.5 w-1.5 rounded-full bg-[rgba(255,175,70,0.9)]" />
          AI výstupy
        </div>
        <div className="absolute right-6 bottom-10 viora-chip viora-float opacity-60" style={{ animationDelay: "-7s" }}>
          <span className="h-1.5 w-1.5 rounded-full bg-[rgba(0,220,255,0.9)]" />
          reply: 12
        </div>
      </div>

      <Card className="group relative z-10 w-full max-w-3xl viora-panel overflow-hidden animate-in fade-in zoom-in-95 duration-500">
        {/* tiny HUD lines inside the card */}
        <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(0,220,255,0.55)] to-transparent opacity-80" />
        <div aria-hidden className="absolute inset-y-0 left-0 w-px bg-[rgba(0,220,255,0.14)]" />
        <div aria-hidden className="absolute inset-y-0 right-0 w-px bg-[rgba(190,120,255,0.10)]" />
        <CardHeader className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] uppercase tracking-[0.22em] text-foreground/60">
            <div className="flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[rgba(0,220,255,0.9)]" />
              Welcome interface
            </div>
            <div className="font-mono text-[10px] tracking-[0.18em] text-foreground/50">
              ping 28ms · threads 04 · replies 12
            </div>
          </div>
          <CardTitle className="text-4xl sm:text-5xl font-semibold tracking-tight viora-title animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            {PRODUCT_NAME}
          </CardTitle>
          <p className="text-sm text-foreground/70 animate-in fade-in slide-in-from-bottom-3 duration-700 delay-200">{TAGLINE}</p>
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

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-foreground/60">
            <div>
              Tip: Zdieľaj tento brief ako link: <span className="font-mono">/welcome</span>
            </div>
            <div className="font-mono text-[10px] tracking-[0.14em] text-foreground/50">
              STATUS: READY · UI: HUD
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
