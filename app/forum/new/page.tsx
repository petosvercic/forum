export const dynamic = "force-dynamic";
export const revalidate = 0;

import { redirect } from "next/navigation";

import { NewPostForm } from "@/components/new-post-form";
import { createClient } from "@/lib/supabase/server";

export default async function NewPostPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  if (!user?.sub) {
    redirect(`/auth/login?next=${encodeURIComponent("/forum/new")}`);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">PridaĹĄ prĂ­spevok</h1>
        <p className="text-sm text-foreground/70">
          ZdieÄľaj AI vĂ˝stup alebo napĂ­Ĺˇ dopyt o pomoc.
        </p>
      </div>
      <NewPostForm userId={user.sub} />
    </div>
  );
}

