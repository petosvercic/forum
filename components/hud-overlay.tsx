"use client";

import { useEffect, useState } from "react";

/**
 * Pure decoration: a sci‑fi HUD frame overlay (like your promo video).
 * Pointer events are disabled so it never blocks clicks.
 */
export function HudOverlay() {
  // Avoid hydration mismatch when theme provider toggles classes
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[5]">
      {/* Outer frame */}
      <div className="absolute inset-3 sm:inset-5 rounded-[20px] border border-[rgba(0,220,255,0.18)] shadow-[0_0_0_1px_rgba(0,220,255,0.08),0_0_80px_rgba(0,220,255,0.06)]" />

      {/* Corner brackets */}
      <div className="absolute left-3 top-3 sm:left-5 sm:top-5 h-10 w-10 rounded-tl-[20px] border-l border-t border-[rgba(0,220,255,0.40)]" />
      <div className="absolute right-3 top-3 sm:right-5 sm:top-5 h-10 w-10 rounded-tr-[20px] border-r border-t border-[rgba(0,220,255,0.40)]" />
      <div className="absolute left-3 bottom-3 sm:left-5 sm:bottom-5 h-10 w-10 rounded-bl-[20px] border-l border-b border-[rgba(0,220,255,0.32)]" />
      <div className="absolute right-3 bottom-3 sm:right-5 sm:bottom-5 h-10 w-10 rounded-br-[20px] border-r border-b border-[rgba(0,220,255,0.32)]" />

      {/* Side reticles */}
      <div className="absolute left-2 top-1/2 -translate-y-1/2 hidden md:block">
        <div className="relative h-14 w-14 rounded-full border border-[rgba(0,220,255,0.26)]">
          <div className="absolute inset-2 rounded-full border border-[rgba(190,120,255,0.18)]" />
          <div className="absolute left-1/2 top-0 -translate-x-1/2 h-2 w-px bg-[rgba(0,220,255,0.35)]" />
          <div className="absolute left-1/2 bottom-0 -translate-x-1/2 h-2 w-px bg-[rgba(0,220,255,0.35)]" />
        </div>
      </div>
      <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden md:block">
        <div className="relative h-14 w-14 rounded-full border border-[rgba(0,220,255,0.26)]">
          <div className="absolute inset-2 rounded-full border border-[rgba(190,120,255,0.18)]" />
          <div className="absolute left-1/2 top-0 -translate-x-1/2 h-2 w-px bg-[rgba(0,220,255,0.35)]" />
          <div className="absolute left-1/2 bottom-0 -translate-x-1/2 h-2 w-px bg-[rgba(0,220,255,0.35)]" />
        </div>
      </div>

      {/* Microtext bars */}
      <div className="absolute left-4 top-4 sm:left-7 sm:top-7 flex items-center gap-2 text-[10px] uppercase tracking-[0.26em] text-foreground/55">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[rgba(0,220,255,0.85)] shadow-[0_0_14px_rgba(0,220,255,0.30)]" />
        System: online
      </div>
      <div className="absolute right-4 top-4 sm:right-7 sm:top-7 flex items-center gap-2 text-[10px] uppercase tracking-[0.26em] text-foreground/55">
        <span className="hidden sm:inline">Telemetry</span>
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[rgba(255,175,70,0.85)] shadow-[0_0_14px_rgba(255,175,70,0.22)]" />
        98%
      </div>

      {/* Scanline */}
      <div className="viora-scanline" />

      {/* Subtle chroma flicker */}
      <div className="viora-flicker" />
    </div>
  );
}
