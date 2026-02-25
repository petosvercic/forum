import Link from "next/link";
import { Suspense } from "react";

import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";

export default function ForumLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-b-foreground/10">
        <div className="mx-auto max-w-5xl flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <Link href="/forum" className="font-semibold tracking-tight">
              Forum AI
            </Link>
            <nav className="hidden sm:flex items-center gap-3 text-sm text-foreground/80">
              <Link href="/forum" className="hover:text-foreground">
                Feed
              </Link>
              <Link href="/forum/new" className="hover:text-foreground">
                Nový príspevok
              </Link>
              <Link href="/forum/me" className="hover:text-foreground">
                Profil
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <ThemeSwitcher />
            <Suspense fallback={<div className="text-sm text-foreground/60">…</div>}>
              <AuthButton />
            </Suspense>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-5xl p-4">{children}</main>

      <footer className="border-t border-t-foreground/10">
        <div className="mx-auto max-w-5xl p-4 text-xs text-foreground/60 flex items-center justify-between gap-4">
          <span>SK/CZ komunita: zdieľaj AI výstupy, overuj, diskutuj, nájdi pomoc.</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
