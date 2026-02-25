import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Legacy route from the starter template.
// Keep it as a redirect so existing links don't break.
export default async function ProtectedRedirect() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  if (!user?.sub) {
    redirect(`/auth/login?next=${encodeURIComponent("/me")}`);
  }

  redirect("/me");
}