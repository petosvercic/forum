"use client";

import { useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { ProfileRow, UserRole } from "@/lib/forum/types";

const ROLES: UserRole[] = ["user", "moderator", "admin"];

function RoleBadge({ role }: { role: string | null | undefined }) {
  const r = (role || "user") as UserRole;
  const variant = r === "admin" ? "default" : r === "moderator" ? "secondary" : "outline";
  return <Badge variant={variant as any}>{r}</Badge>;
}

export function AdminUsers({ initial }: { initial: ProfileRow[] }) {
  const [rows, setRows] = useState<ProfileRow[]>(initial);
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      const hay = [r.email, r.handle, r.display_name, r.region, (r.skills || []).join(" ")]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(s);
    });
  }, [rows, q]);

  const setRole = async (id: string, role: UserRole) => {
    setBusyId(id);
    setErr(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
      if (error) throw error;
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, role } : r)));
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Chyba pri ukladaní roly");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="text-sm text-foreground/70">
          Priraď roly: <span className="font-mono">user</span>, <span className="font-mono">moderator</span>, <span className="font-mono">admin</span>.
        </p>
        <p className="text-xs text-foreground/60 mt-1">
          Poznámka: aby to bolo naozaj bezpečné, musíš spustiť SQL migráciu (RLS policy) v Supabase. UI bez RLS je len dekorácia.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Hľadať (email, handle, skills, región)…"
        />
        <Button variant="outline" onClick={() => setQ("")}>Reset</Button>
      </div>

      {err ? <div className="text-sm text-red-500">{err}</div> : null}

      <div className="overflow-auto rounded-lg border border-foreground/10">
        <table className="w-full text-sm">
          <thead className="bg-foreground/[0.03]">
            <tr className="text-left">
              <th className="p-3">Email</th>
              <th className="p-3">Handle</th>
              <th className="p-3">Skills</th>
              <th className="p-3">Región</th>
              <th className="p-3">Rola</th>
              <th className="p-3">Akcia</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-foreground/10">
                <td className="p-3">
                  <div className="font-mono text-xs">{r.email || "—"}</div>
                  <div className="text-xs text-foreground/60">{r.id.slice(0, 8)}…</div>
                </td>
                <td className="p-3">{r.handle ? `@${r.handle}` : "—"}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {(r.skills || []).slice(0, 6).map((s) => (
                      <span key={s} className="text-xs px-2 py-0.5 rounded-full border border-foreground/10">#{s}</span>
                    ))}
                    {(r.skills || []).length > 6 ? <span className="text-xs text-foreground/60">+{(r.skills || []).length - 6}</span> : null}
                  </div>
                </td>
                <td className="p-3">{r.region || "—"}</td>
                <td className="p-3"><RoleBadge role={r.role} /></td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <select
                      className="h-9 rounded-md border border-foreground/10 bg-transparent px-2"
                      defaultValue={(r.role || "user") as string}
                      onChange={(e) => setRole(r.id, e.target.value as UserRole)}
                      disabled={busyId === r.id}
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                    <span className="text-xs text-foreground/60">
                      {busyId === r.id ? "Ukladám…" : ""}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-foreground/60">Zobrazených: {filtered.length} (max {rows.length})</div>
    </div>
  );
}
