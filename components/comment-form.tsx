"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function CommentForm({
  postId,
  userId,
}: {
  postId: string;
  userId: string;
}) {
  const [body, setBody] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.from("comments").insert({
        post_id: postId,
        author_id: userId,
        body: body.trim(),
      });
      if (error) throw error;

      setBody("");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Nastala chyba");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Napíš komentár…"
        className="min-h-24 w-full rounded-md border border-foreground/10 bg-transparent p-3 text-sm"
      />
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isLoading || !body.trim()}>
          {isLoading ? "Odosielam…" : "Pridať komentár"}
        </Button>
        <span className="text-xs text-foreground/60">
          Buď konkrétny. Ak je to bezpečnostné riziko (elektro, zdravie),
          napíš to.
        </span>
      </div>
    </form>
  );
}
