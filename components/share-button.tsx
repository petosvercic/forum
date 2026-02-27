"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

export function ShareButton({
  path,
  title,
  label = "Zdieľať",
  size = "sm",
  variant = "outline",
}: {
  path: string;
  title?: string;
  label?: string;
  size?: "sm" | "default" | "lg";
  variant?: "outline" | "default" | "secondary" | "ghost";
}) {
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const url = useMemo(() => (origin ? `${origin}${path}` : path), [origin, path]);

  const onShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      // Native share when available
      if (navigator.share) {
        await navigator.share({ title: title ?? "Viora", url });
        return;
      }
    } catch {
      // fallback to clipboard
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  };

  return (
    <Button type="button" onClick={onShare} size={size} variant={variant}>
      {copied ? "Skopírované" : label}
    </Button>
  );
}
