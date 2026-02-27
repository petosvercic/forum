/* eslint-disable no-console */

/**
 * VIORA Forum autopatch (seed welcome obsah)
 *
 * Tvoja schéma (podľa lib/forum/types.ts):
 * - forum_categories: { id, name, slug, is_active, sort_order, created_at }
 * - posts: { id, author_id, type, status, lang, category (TEXT), tags[], title, context, prompt, output, ... , is_seed, seed_batch_id }
 * - comments: { id, post_id, author_id, parent_id, body, is_solution, created_at, ... }
 *
 * Použitie:
 *   npx tsx scripts/forum-autopatch.ts seed
 *   npx tsx scripts/forum-autopatch.ts unseed
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

type Mode = "seed" | "unseed";

function die(msg: string): never {
  console.error(`\nFATAL: ${msg}\n`);
  process.exit(1);
}

function isProdEnv() {
  const nodeEnv = (process.env.NODE_ENV ?? "").toLowerCase();
  const vercelEnv = (process.env.VERCEL_ENV ?? process.env.NEXT_PUBLIC_VERCEL_ENV ?? "").toLowerCase();
  return nodeEnv === "production" || vercelEnv === "production";
}

function requireSafeToRun() {
  if (process.env.FORUM_AUTOPATCH !== "1") {
    die("Setni FORUM_AUTOPATCH=1 (seed sa nespúšťa omylom).");
  }
  if (isProdEnv()) {
    die("Vyzerá to na production env (NODE_ENV/VERCEL_ENV). Tu seed nepôjde.");
  }
}

// Načíta env z .env.local / .env aj keď tam máš PowerShell formu $env:KEY=...
function loadEnvFallback() {
  const candidates = [".env.local", ".env", ".env.autopatch"];
  for (const file of candidates) {
    const p = path.join(process.cwd(), file);
    if (!fs.existsSync(p)) continue;

    const lines = fs.readFileSync(p, "utf8").split(/\r?\n/);
    for (const raw of lines) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;

      // KEY=value
      // $env:KEY=value
      // $env:KEY="value"
      const m = line.match(/^(?:\$env:)?([A-Za-z0-9_]+)\s*=\s*(.+)\s*$/);
      if (!m) continue;

      const key = m[1];
      let val = m[2].trim();

      // strip quotes
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }

      if (process.env[key] == null || process.env[key] === "") {
        process.env[key] = val;
      }
    }
  }
}

function uuid() {
  return crypto.randomUUID();
}

function nowISO() {
  return new Date().toISOString();
}

loadEnvFallback();

requireSafeToRun();

// Podporíme viac názvov env, lebo ľudia si radi pomenúvajú veci rôzne 🙃
const SUPABASE_URL =
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "";

const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SECRET_KEY ??
  process.env.SUPABASE_SERVICE_ROLE ??
  "";

if (!SUPABASE_URL) die("Missing SUPABASE_URL (alebo NEXT_PUBLIC_SUPABASE_URL).");
if (!/^https?:\/\//i.test(SUPABASE_URL)) die(`Invalid SUPABASE_URL: "${SUPABASE_URL}"`);
if (!SUPABASE_KEY) die("Missing SUPABASE_SERVICE_ROLE_KEY (alebo SUPABASE_SECRET_KEY).");

const AUTHOR_ID = process.env.AUTOPATCH_AUTHOR_ID ?? "";
if (!AUTHOR_ID) {
  die("Missing AUTOPATCH_AUTHOR_ID (daj sem profiles.id, inak posty nevložíš).");
}

const SEED_BATCH_ID = process.env.AUTOPATCH_SEED_BATCH_ID ?? "forum-welcome-v1";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

const CATEGORY_SPECS = [
  { name: "Ako používať fórum", slug: "how-to", sort_order: 1 },
  { name: "Projekty & spolupráce", slug: "projects", sort_order: 2 },
  { name: "Q&A / otázky", slug: "qa", sort_order: 3 },
] as const;

type PostInsert = {
  id: string;
  author_id: string;
  type: "ai_output" | "request" | "product";
  status: "open" | "solved" | "archived";
  lang: "sk" | "cz" | "mix";
  category: string; // slug z forum_categories
  tags: string[];
  title: string;
  context: string | null;
  prompt: string | null;
  output: string | null;
  is_seed: boolean;
  seed_batch_id: string;
  created_at: string;
  updated_at: string;
};

type CommentInsert = {
  id: string;
  post_id: string;
  author_id: string;
  parent_id: string | null;
  body: string;
  is_solution: boolean;
  created_at: string;
};

async function ensureCategories() {
  const slugs = CATEGORY_SPECS.map((c) => c.slug);
  const { data: existing, error } = await supabase
    .from("forum_categories")
    .select("id, slug")
    .in("slug", slugs);

  if (error) die(`forum_categories select failed: ${error.message}`);

  const existingSlugs = new Set((existing ?? []).map((r: any) => r.slug));
  const toInsert = CATEGORY_SPECS.filter((c) => !existingSlugs.has(c.slug)).map((c) => ({
    id: uuid(),
    name: c.name,
    slug: c.slug,
    is_active: true,
    sort_order: c.sort_order,
    created_at: nowISO(),
  }));

  if (toInsert.length === 0) {
    console.log("= categories exist");
    return;
  }

  const ins = await supabase.from("forum_categories").insert(toInsert);
  if (ins.error) die(`forum_categories insert failed: ${ins.error.message}`);
  console.log(`+ categories inserted: ${toInsert.length}`);
}

function seedPostsPayload(): PostInsert[] {
  const t = nowISO();
  const seedTag = `seed:${SEED_BATCH_ID}`;

  return [
    // HOW-TO
    {
      id: uuid(),
      author_id: AUTHOR_ID,
      type: "ai_output",
      status: "open",
      lang: "sk",
      category: "how-to",
      tags: ["welcome", seedTag],
      title: "Začni tu: čo je toto fórum a prečo existuje",
      context: "Onboarding pre nových ľudí. Cieľ: aby fórum nepôsobilo prázdne a aby ľudia vedeli, čo sem patrí.",
      prompt: "Napíš krátky onboarding post pre fórum: čo sem patrí, ako písať otázky, ako pridávať AI výstupy.",
      output:
        [
          "**Máš nápad. AI ti dala základ. Sám to nedáš.**",
          "",
          "Toto fórum je miesto, kde:",
          "- zavesíš AI výstup / nápad / plán a ľudia ho vylepšia a overia",
          "- požiadaš o pomoc s konkrétnym problémom (nie s existenciou)",
          "- nájdeš spolupráce podľa skills, nie podľa papierov",
          "",
          "Pravidlo: keď dáš len hype a 0 detailov, dostaneš len hype a 0 pomoci.",
        ].join("\n"),
      is_seed: true,
      seed_batch_id: SEED_BATCH_ID,
      created_at: t,
      updated_at: t,
    },
    {
      id: uuid(),
      author_id: AUTHOR_ID,
      type: "request",
      status: "open",
      lang: "sk",
      category: "how-to",
      tags: ["template", seedTag],
      title: "Šablóna príspevku: AI výstup → akcia",
      context: "Skopíruj, vyplň, ušetríš všetkým čas.",
      prompt: null,
      output:
        [
          "Skopíruj a vyplň:",
          "",
          "1) **Cieľ (1 veta):**",
          "2) **AI výstup (text/link):**",
          "3) **Čo je už hotové:**",
          "4) **Čo je problém / čo neviem:**",
          "5) **Čo potrebujem od ľudí:**",
          "6) **Časový rámec / priority:**",
        ].join("\n"),
      is_seed: true,
      seed_batch_id: SEED_BATCH_ID,
      created_at: t,
      updated_at: t,
    },

    // PROJECTS
    {
      id: uuid(),
      author_id: AUTHOR_ID,
      type: "product",
      status: "open",
      lang: "sk",
      category: "projects",
      tags: ["collab", seedTag],
      title: "Ako napísať spoluprácu, aby sa ti niekto ozval",
      context: "Minimálny bríf pre spolupráce.",
      prompt: null,
      output:
        [
          "Povedz ľuďom pravdu rýchlo:",
          "- **Čo staviaš** (1–2 vety)",
          "- **V akom stave to je** (link / repo / screenshot)",
          "- **Koho hľadáš** (skills, nie tituly)",
          "- **Koľko času** a **čo za to** (podiel/paid/barter/open-source)",
          "",
          "Ak vynecháš „čo za to“, tak najčastejšia odpoveď bude ticho.",
        ].join("\n"),
      is_seed: true,
      seed_batch_id: SEED_BATCH_ID,
      created_at: t,
      updated_at: t,
    },
    {
      id: uuid(),
      author_id: AUTHOR_ID,
      type: "product",
      status: "open",
      lang: "sk",
      category: "projects",
      tags: ["mvp", seedTag],
      title: "Dopyt: FE dev na MVP (Next.js)",
      context: "Ukážkový dopyt.",
      prompt: null,
      output:
        [
          "- Stack: Next.js, Tailwind",
          "- Potrebujem: feed, detail príspevku, formy",
          "- Čas: 5–10h týždenne, 2–3 týždne",
          "",
          "Ak máš chuť, pošli link na 1–2 veci čo si robil.",
        ].join("\n"),
      is_seed: true,
      seed_batch_id: SEED_BATCH_ID,
      created_at: t,
      updated_at: t,
    },

    // QA
    {
      id: uuid(),
      author_id: AUTHOR_ID,
      type: "request",
      status: "open",
      lang: "sk",
      category: "qa",
      tags: ["faq", seedTag],
      title: "FAQ: čo sem patria AI výstupy a čo nie",
      context: "Rýchle pravidlá pre poriadok.",
      prompt: null,
      output:
        [
          "Patrí sem:",
          "- AI plán / návrh / kód keď chceš reality-check",
          "- otázky s kontextom a logmi",
          "",
          "Nepatrí sem:",
          "- „sprav mi všetko“ bez detailov",
          "- „nefunguje mi to“ bez chyby/logu",
        ].join("\n"),
      is_seed: true,
      seed_batch_id: SEED_BATCH_ID,
      created_at: t,
      updated_at: t,
    },
  ];
}

function seedCommentsPayload(postIds: string[]): CommentInsert[] {
  const t = nowISO();
  const mk = (post_id: string, body: string): CommentInsert => ({
    id: uuid(),
    post_id,
    author_id: AUTHOR_ID,
    parent_id: null,
    body,
    is_solution: false,
    created_at: t,
  });

  // 1 komentár ku každému postu
  return postIds.map((id, idx) =>
    mk(
      id,
      [
        "Seed komentár:",
        "Ak toto vidíš, seed funguje. Ľudstvo ešte úplne neskončilo. 😄",
        `(${idx + 1}/${postIds.length})`,
      ].join("\n")
    )
  );
}

async function seed() {
  console.log(`Seed batch: ${SEED_BATCH_ID}`);
  await ensureCategories();

  // idempotencia: ak už existujú posty s týmto batch id, neseedujeme znovu
  const existing = await supabase.from("posts").select("id").eq("seed_batch_id", SEED_BATCH_ID).limit(1);
  if (existing.error) die(`posts select failed: ${existing.error.message}`);
  if ((existing.data ?? []).length > 0) {
    console.log("= seed posts already exist (skip)");
    return;
  }

  const posts = seedPostsPayload();
  const ins = await supabase.from("posts").insert(posts).select("id");
  if (ins.error) die(`posts insert failed: ${ins.error.message}`);

  const postIds = (ins.data ?? []).map((r: any) => r.id);
  console.log(`+ posts inserted: ${postIds.length}`);

  const comments = seedCommentsPayload(postIds);
  const insC = await supabase.from("comments").insert(comments);
  if (insC.error) die(`comments insert failed: ${insC.error.message}`);
  console.log(`+ comments inserted: ${comments.length}`);

  console.log("OK seed done.");
}

async function unseed() {
  console.log(`Unseed batch: ${SEED_BATCH_ID}`);

  const { data: posts, error } = await supabase.from("posts").select("id").eq("seed_batch_id", SEED_BATCH_ID).limit(500);
  if (error) die(`posts select failed: ${error.message}`);

  const postIds = (posts ?? []).map((p: any) => p.id);
  if (postIds.length === 0) {
    console.log("= nothing to unseed");
    return;
  }

  // comments -> posts
  const delC = await supabase.from("comments").delete().in("post_id", postIds);
  if (delC.error) die(`delete comments failed: ${delC.error.message}`);
  console.log(`- comments deleted`);

  const delP = await supabase.from("posts").delete().in("id", postIds);
  if (delP.error) die(`delete posts failed: ${delP.error.message}`);
  console.log(`- posts deleted`);

  console.log("OK unseed done.");
}

async function main() {
  const mode = (process.argv[2] ?? "").toLowerCase() as Mode;
  if (mode !== "seed" && mode !== "unseed") {
    console.log("Usage: npx tsx scripts/forum-autopatch.ts seed|unseed");
    process.exit(0);
  }
  if (mode === "seed") await seed();
  else await unseed();
}

main().catch((e) => die(String((e as any)?.message ?? e)));

