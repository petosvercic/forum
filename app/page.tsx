"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WelcomeScreen } from "@/components/welcome-screen";

export default function Page() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [skip, setSkip] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem("viora_skip_welcome");
      setSkip(v === "1");
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready && skip) router.replace("/forum");
  }, [ready, skip, router]);

  if (!ready) return null;
  if (skip) return null;

  return <WelcomeScreen showSkip={true} />;
}
