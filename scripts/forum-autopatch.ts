/* eslint-disable no-console */

/**
 * VIORA Forum autopatch (seed tutorial + demo posts)
 *
 * Použitie:
 *   npx tsx scripts/forum-autopatch.ts seed
 *   npx tsx scripts/forum-autopatch.ts unseed
 *
 * Bezpečnosť:
 *   - vyžaduje FORUM_AUTOPATCH=1
 *   - odmieta bežať v production env
 *
 * Poznámka:
 *  - v tomto projekte posts.category ukladá NÁZOV kategórie (nie slug).
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

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SECRET_KEY ??
  "";

if (!SUPABASE_URL) die("Missing SUPABASE_URL (alebo NEXT_PUBLIC_SUPABASE_URL).");
if (!/^https?:\/\//i.test(SUPABASE_URL)) die(`Invalid SUPABASE_URL: "${SUPABASE_URL}"`);
if (!SUPABASE_KEY) die("Missing SUPABASE_SERVICE_ROLE_KEY (alebo SUPABASE_SECRET_KEY).");

const AUTHOR_ID = process.env.AUTOPATCH_AUTHOR_ID ?? "";
if (!AUTHOR_ID) die("Missing AUTOPATCH_AUTHOR_ID (daj sem profiles.id).");

const SEED_BATCH_ID = process.env.AUTOPATCH_SEED_BATCH_ID ?? "forum-welcome-v2";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

const TUTORIAL_CATS = [
  { name: "Ako používať fórum", slug: "how-to", sort_order: 1 },
  { name: "Projekty & spolupráce", slug: "projects", sort_order: 2 },
  { name: "Q&A / otázky", slug: "qa", sort_order: 3 },
] as const;

async function ensureTutorialCategories() {
  const slugs = TUTORIAL_CATS.map((c) => c.slug);
  const { data: existing, error } = await supabase
    .from("forum_categories")
    .select("id,slug,sort_order")
    .in("slug", slugs);

  if (error) die(`forum_categories select failed: ${error.message}`);

  const existingSlugs = new Set((existing ?? []).map((r: any) => r.slug));
  const toInsert = TUTORIAL_CATS.filter((c) => !existingSlugs.has(c.slug)).map((c) => ({
    id: uuid(),
    name: c.name,
    slug: c.slug,
    is_active: true,
    sort_order: c.sort_order,
    created_at: nowISO(),
  }));

  if (toInsert.length) {
    const ins = await supabase.from("forum_categories").insert(toInsert);
    if (ins.error) die(`forum_categories insert failed: ${ins.error.message}`);
    console.log(`+ categories inserted: ${toInsert.length}`);
  } else {
    console.log("= categories exist");
  }
}

type PostInsert = {
  id: string;
  author_id: string;
  type: "ai_output" | "request" | "product";
  status: "open" | "solved" | "archived";
  lang: "sk" | "cz" | "mix";
  category: string; // CATEGORY NAME in this project
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

function tutorialPosts(): PostInsert[] {
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
      category: "Ako používať fórum",
      tags: ["pinned", "tutorial", "welcome", seedTag],
      title: "Začni tu: čo je toto fórum a prečo existuje",
      context: "Onboarding: čo sem patrí, ako písať a ako z AI výstupu spraviť vec.",
      prompt: "Napíš krátky onboarding post pre fórum: čo sem patrí, ako písať otázky, ako pridávať AI výstupy.",
      output: [
        "👋 Vitaj.",
        "",
        "Toto fórum je miesto, kde sa AI výstup mení na reálnu vec.",
        "Nie „pozri aký prompt“, ale „tu je plán/kód/text – pomôž mi to dotiahnuť“.",
        "",
        "✅ Sem patrí:",
        "- AI plán / architektúra / kód, keď chceš reality-check",
        "- konkrétne otázky s kontextom a logmi",
        "- projekty a spolupráce (skills, čas, odmena)",
        "",
        "❌ Nepatrí sem:",
        "- „sprav mi všetko“",
        "- „nefunguje mi to“ bez chyby/logu",
        "- čistý hype bez detailov",
        "",
        "Pravidlo: čím presnejšia otázka, tým lepšia odpoveď.",
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
      category: "Ako používať fórum",
      tags: ["pinned", "tutorial", "template", seedTag],
      title: "Šablóna príspevku: AI výstup → akcia",
      context: "Skopíruj a vyplň. Ušetríš všetkým čas.",
      prompt: null,
      output: [
        "🧩 Skopíruj a vyplň (90 sekúnd, ušetrí hodiny):",
        "",
        "1) Cieľ (1 veta):",
        "2) AI výstup (text/link):",
        "3) Čo je už hotové:",
        "4) Čo je problém / čo neviem:",
        "5) Čo potrebujem od ľudí (skills + čas):",
        "6) Kritériá úspechu:",
        "",
        "Tip: keď nevieš bod 4, ešte nevieš, čo sa pýtaš.",
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
      category: "Projekty & spolupráce",
      tags: ["pinned", "tutorial", "collab", seedTag],
      title: "Ako napísať spoluprácu, aby sa ti niekto ozval",
      context: "Minimálny bríf pre spolupráce.",
      prompt: null,
      output: [
        "🤝 Ľudia sa ozvú, keď chápu 3 veci: čo to je, čo treba spraviť, čo za to.",
        "",
        "Napíš:",
        "- Čo staviaš (1–2 vety)",
        "- Stav (link / repo / screenshot)",
        "- Koho hľadáš (skills, nie tituly)",
        "- Čas (koľko hodín/týždeň)",
        "- Odmena (paid/podiel/barter/open-source)",
        "",
        "Keď vynecháš „čo za to“, najčastejšia odpoveď je ticho.",
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
      category: "Q&A / otázky",
      tags: ["pinned", "tutorial", seedTag],
      title: "Ako písať otázku tak, aby sa dala zodpovedať",
      context: "Minimum pre dobrú otázku.",
      prompt: null,
      output: [
        "❓ Minimum pre dobrú otázku:",
        "",
        "- Čo sa snažíš dosiahnuť (1 veta)",
        "- Čo si spravil (konkrétne kroky)",
        "- Čo sa stalo (error/log/screenshot)",
        "- Čo si čakal, že sa stane",
        "- Čo si už skúšal",
        "",
        "Bez toho ľudia nevedia pomôcť. A potom sa všetci tvária prekvapene. 🙂",
      ].join("\n"),
      is_seed: true,
      seed_batch_id: SEED_BATCH_ID,
      created_at: t,
      updated_at: t,
    },
    {
      id: uuid(),
      author_id: AUTHOR_ID,
      type: "ai_output",
      status: "open",
      lang: "sk",
      category: "Q&A / otázky",
      tags: ["tutorial", seedTag],
      title: "FAQ: AI výstupy – čo sem dať a čo nie",
      context: "Rýchle pravidlá pre poriadok.",
      prompt: null,
      output: [
        "✅ Daj sem AI výstup, keď:",
        "- chceš ho skrátiť/zlepšiť (text)",
        "- chceš debug/review (kód)",
        "- chceš otestovať logiku (plán)",
        "",
        "❌ Nedávaj sem AI výstup, keď:",
        "- je to len „pozri čo mi to napísalo“",
        "- nemáš jasné kritériá, čo má byť výsledok",
      ].join("\n"),
      is_seed: true,
      seed_batch_id: SEED_BATCH_ID,
      created_at: t,
      updated_at: t,
    },
  ];
}

async function pickNonTutorialCategoryNames(limit = 6): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from("forum_categories")
      .select("name,slug,is_active")
      .eq("is_active", true)
      .not("slug", "in", "(how-to,projects,qa)")
      .order("sort_order", { ascending: true })
      .limit(limit);

    if (!error && Array.isArray(data) && data.length) {
      return data.map((r: any) => String(r.name));
    }
  } catch {
    // ignore
  }
  // fallback: some sensible defaults
  return [
    "Dev a automatizácie",
    "Dizajn a kreatíva",
    "Biznis a marketing",
    "Zdravie a fitness",
    "Produktivita a systémy",
    "Meta",
  ].slice(0, limit);
}

async function demoPosts(): Promise<PostInsert[]> {
  const t = nowISO();
  const seedTag = `seed:${SEED_BATCH_ID}`;
  const cats = await pickNonTutorialCategoryNames(6);

  const mk = (i: number, patch: Partial<PostInsert>): PostInsert => ({
    id: uuid(),
    author_id: AUTHOR_ID,
    type: "request",
    status: "open",
    lang: "sk",
    category: cats[i % cats.length],
    tags: [seedTag],
    title: "Demo príspevok",
    context: null,
    prompt: null,
    output: null,
    is_seed: true,
    seed_batch_id: SEED_BATCH_ID,
    created_at: t,
    updated_at: t,
    ...patch,
  });

  return [
    mk(0, {
      type: "request",
      tags: ["demo", "supabase", seedTag],
      title: "Ako spraviť bezpečné RLS policy pre tutorial kategórie?",
      output: "Mám tutorial kategórie (how-to/projects/qa). Chcem, aby do nich vedel postovať len admin/mod. Aký je najčistejší pattern?",
    }),
    mk(1, {
      type: "ai_output",
      tags: ["demo", "nextjs", seedTag],
      title: "AI navrhlo sidebar: čo z toho je dobrý nápad a čo nie?",
      prompt: "Navrhni UI pre fórum so sidebarom a filtrom typov.",
      output: "AI návrh: sidebar vľavo, feed vpravo, pinned onboarding box hore… (potrebujem review).",
    }),
    mk(2, {
      type: "product",
      tags: ["demo", "mvp", seedTag],
      title: "Projekt: mini-moderation flow (report + auto-hide)",
      output: "Chcem pridať report tlačidlo + auto-hide po N reportoch. Aký je jednoduchý DB+UI návrh pre v1?",
    }),
    mk(3, {
      type: "request",
      tags: ["demo", "fitness", seedTag],
      title: "Ako trackovať progres bez obsesie?",
      output: "Chcem jednoduchý systém: tréning 3× týždenne, jedlo bez počítania každého gramu. Máš návrh šablóny?",
    }),
    mk(4, {
      type: "ai_output",
      tags: ["demo", "marketing", seedTag],
      title: "AI copy pre landing page: skrátiť a spraviť ľudskejšie",
      output: "Tu je text… potrebujem ho skrátiť na 3 vety + 1 CTA.",
    }),
    mk(5, {
      type: "request",
      tags: ["demo", "meta", seedTag],
      title: "Čo by malo byť na úvodnej stránke, aby to pôsobilo dôveryhodne?",
      output: "Onboarding je fajn, ale čo ešte? Stats? featured posty? mini-guides?",
    }),
    mk(0, {
      type: "product",
      tags: ["demo", "automation", seedTag],
      title: "Projekt: autopatch seed skript pre demo obsah",
      output: "Chcem seedovať 5 tutorial postov + 10 demo postov, idempotentne, s unseed.",
    }),
    mk(1, {
      type: "request",
      tags: ["demo", "design", seedTag],
      title: "Ako spraviť post card, aby bolo hneď jasné: typ/kategória/stav?",
      output: "Chcem 3 signály kvality na kartičke. Ako to spraviť bez preplácania UI?",
    }),
    mk(2, {
      type: "ai_output",
      tags: ["demo", "prompting", seedTag],
      title: "AI výstup: šablóny podľa typu príspevku",
      output: "Navrhol som šablóny pre AI výstup / dopyt / projekt. Pomôž mi ich upraviť.",
    }),
  ];
}

async function seed() {
  console.log(`Seed batch: ${SEED_BATCH_ID}`);
  await ensureTutorialCategories();

  // idempotencia: ak už existujú posty s týmto batch id, neseedujeme znovu
  const existing = await supabase.from("posts").select("id").eq("seed_batch_id", SEED_BATCH_ID).limit(1);
  if (existing.error) die(`posts select failed: ${existing.error.message}`);
  if ((existing.data ?? []).length > 0) {
    console.log("= seed posts already exist (skip)");
    return;
  }

  const posts = [...tutorialPosts(), ...(await demoPosts())];

  const ins = await supabase.from("posts").insert(posts).select("id");
  if (ins.error) die(`posts insert failed: ${ins.error.message}`);

  const postIds = (ins.data ?? []).map((r: any) => r.id);
  console.log(`+ posts inserted: ${postIds.length}`);

  const t = nowISO();
  const comments: CommentInsert[] = postIds.slice(0, 8).map((pid: string, idx: number) => ({
    id: uuid(),
    post_id: pid,
    author_id: AUTHOR_ID,
    parent_id: null,
    body: `Seed komentár: ak toto vidíš, seed funguje. (${idx + 1}/${Math.min(8, postIds.length)})`,
    is_solution: false,
    created_at: t,
  }));

  const insC = await supabase.from("comments").insert(comments);
  if (insC.error) die(`comments insert failed: ${insC.error.message}`);
  console.log(`+ comments inserted: ${comments.length}`);

  console.log("OK seed done.");
}

async function unseed() {
  console.log(`Unseed batch: ${SEED_BATCH_ID}`);

  const { data: posts, error } = await supabase.from("posts").select("id").eq("seed_batch_id", SEED_BATCH_ID).limit(2000);
  if (error) die(`posts select failed: ${error.message}`);

  const postIds = (posts ?? []).map((p: any) => p.id);
  if (postIds.length === 0) {
    console.log("= nothing to unseed");
    return;
  }

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
