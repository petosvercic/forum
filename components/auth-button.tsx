import Link from "next/link";
import { Button } from "./ui/button";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";

export async function AuthButton() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  return user?.sub ? (
    <div className="flex items-center gap-2">
      <span className="hidden md:inline text-sm text-foreground/70">
        {user.email}
      </span>
      <Button asChild size="sm" variant="outline">
        <Link href="/forum/me">Profil</Link>
      </Button>
      <LogoutButton />
    </div>
  ) : (
    <div className="flex gap-2">
      <Button asChild size="sm" variant="outline">
        <Link href="/auth/login?next=%2Fforum">Prihlásiť</Link>
      </Button>
      <Button asChild size="sm" variant="default">
        <Link href="/auth/sign-up?next=%2Fforum">Registrovať</Link>
      </Button>
    </div>
  );
}
