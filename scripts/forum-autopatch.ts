#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Forum autopatch: seed demo obsah (skupiny, príspevky, komentáre)
 *
 * Bezpečnostné brzdy:
 *   - vyžaduje FORUM_AUTOPATCH=1
 *   - odmietne bežať v production
 *
 * Použitie:
 *   node scripts/forum-autopatch.ts seed
 *   node scripts/forum-autopatch.ts unseed
 */

import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

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
    die("Setni FORUM_AUTOPATCH=1 (inak to nespustím, lebo ľudia radi seedujú do production 😇).");
  }
  if (isProdEnv()) {
    die("Vyzerá to na production env (NODE_ENV/VERCEL_ENV). Tam to seedovať nebude.");
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) die("Missing SUPABASE_URL");
if (!SUPABASE_SERVICE_ROLE_KEY) die("Missing SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ---- MAP: prispôsob si názvy tabuliek + stĺpcov na tvoju schému ----
const MAP = {
  tables: {
    groups: process.env.AUTOPATCH_TABLE_GROUPS ?? "groups",
    posts: process.env.AUTOPATCH_TABLE_POSTS ?? "posts",
    comments: process.env.AUTOPATCH_TABLE_COMMENTS ?? "comments",
    profiles: process.env.AUTOPATCH_TABLE_PROFILES ?? "profiles", // voliteľné
  },
  cols: {
    groups: {
      id: "id",
      title: "title", // alebo name
      slug: "slug", // ak nemáš, nastav na null a uprav logiku nižšie
      description: "description",
      createdBy: "created_by", // alebo author_id
      isSeed: "is_seed",
      seedBatchId: "seed_batch_id",
      createdAt: "created_at",
    },
    posts: {
      id: "id",
      groupId: "group_id", // alebo category_id
      title: "title",
      slug: "slug", // voliteľné
      body: "body", // alebo content
      pinned: "is_pinned", // alebo pinned
      createdBy: "created_by",
      isSeed: "is_seed",
      seedBatchId: "seed_batch_id",
      createdAt: "created_at",
    },
    comments: {
      id: "id",
      postId: "post_id",
      body: "body",
      createdBy: "created_by",
      isSeed: "is_seed",
      seedBatchId: "seed_batch_id",
      createdAt: "created_at",
    },
    profiles: {
      id: "id", // často rovnaké ako auth.users.id
      username: "username",
      displayName: "display_name",
      avatarUrl: "avatar_url",
      isSeed: "is_seed",
      seedBatchId: "seed_batch_id",
    },
  },
} as const;

const SEED_BATCH_ID = process.env.AUTOPATCH_SEED_BATCH_ID ?? "forum-demo-2026-02-27";

function nowISO() {
  return new Date().toISOString();
}

function slugify(input: string) {
  return String(input ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "x";
}

function uuid() {
  return crypto.randomUUID();
}

function pick<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function ensureAutopatchAuthorId(): Promise<string | null> {
  const forced = process.env.AUTOPATCH_AUTHOR_ID;
  if (forced) return forced;

  // pokús sa vytvoriť "autopatch user" (Supabase auth admin API)
  const email = "autopatch@viora.local";
  const password = `AP-${uuid()}`;

  try {
    // Najprv skús nájsť usera (listUsers je paginated, ale tu stačí len create a ignorovať "exists" chyby)
    const created = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { kind: "seed", seed_batch_id: SEED_BATCH_ID },
    });

    const id = created.data.user?.id ?? null;
    if (!id) return null;

    // Voliteľne: upsert do profiles (ak existuje)
    try {
      const p = MAP.tables.profiles;
      const c = MAP.cols.profiles;
      const row: any = {
        [c.id]: id,
        [c.username]: "autopatch",
        [c.displayName]: "Autopatch",
        [c.avatarUrl]: null,
        [c.isSeed]: true,
        [c.seedBatchId]: SEED_BATCH_ID,
      };
      await supabase.from(p).upsert(row, { onConflict: c.id });
    } catch {
      // profiles tabuľka nemusí existovať. Nevadí.
    }

    return id;
  } catch (e: any) {
    // keď už existuje, Supabase niekedy hádže chybu; necháme user_id null
    console.log("WARN: nepodarilo sa vytvoriť autopatch auth user (ok).", String(e?.message ?? e));
    return null;
  }
}

type SeedGroup = {
  title: string;
  description: string;
  pinnedPostTitle: string;
  pinnedPostBody: string;
  posts: { title: string; body: string; comments?: string[] }[];
};

function seedContent(): SeedGroup[] {
  // Texty sú úmyselne stručné. Seed nie je román.
  return [
    {
      title: "Ako používať fórum",
      description: "Rýchly onboarding: čo sem patrí, ako písať príspevky a ako z AI výstupu spraviť vec.",
      pinnedPostTitle: "Začni tu: čo je toto fórum a prečo existuje",
      pinnedPostBody:
        [
          "**Máš nápad. AI ti dala základ. Sám to nedáš.**",
          "",
          "Toto fórum je miesto, kde:",
          "- zavesíš AI výstup / nápad / plán a ľudia ho vylepšia, opravia, doplnia, overia",
          "- povieš „chcem postaviť X, ale sám to nedám“ a nájdeš ľudí podľa skills, nie podľa papierov",
          "- zdieľaš konkrétne, nie dojmy: čo chceš spraviť, čo už máš, čo potrebuješ",
          "",
          "Pravidlo prežitia: keď sem dáš len hype a 0 detailov, dostaneš len hype a 0 pomoci.",
        ].join("\n"),
      posts: [
        {
          title: "Šablóna príspevku: AI výstup → akcia",
          body: [
            "Skopíruj a vyplň:",
            "",
            "1) **Cieľ (1 veta):**",
            "2) **AI výstup (link / text / screenshot):**",
            "3) **Čo je už hotové:**",
            "4) **Čo je problém / čo neviem:**",
            "5) **Čo potrebujem od ľudí (skills + čas):**",
            "6) **Časový rámec / priority:**",
            "",
            "Tip: ak nevieš napísať bod 4, tak nevieš, čo sa pýtaš. A to je tiež odpoveď.",
          ].join("\n"),
          comments: ["Toto je fakt najlepšia investícia 90 sekúnd do príspevku.", "Kto to nevyplní, bude dostávať len otázky naspäť."],
        },
        {
          title: "Ako dávať feedback bez toxickej poézie",
          body: [
            "- Kritizuj **text/kód/argument**, nie človeka.",
            "- Povedz **čo** je problém a **prečo**.",
            "- Navrhni aspoň jeden konkrétny krok.",
            "- Keď nevieš navrhnúť krok, napíš aspoň otázku, ktorá to odomkne.",
          ].join("\n"),
          comments: ["Krátke, vecné, účinné. Vzácne combo."],
        },
      ],
    },
    {
      title: "Projekty & spolupráce",
      description: "Miesto pre konkrétne ponuky a dopyty: MVP, prototypy, spolupráce.",
      pinnedPostTitle: "Ako napísať spoluprácu, aby sa ti niekto ozval",
      pinnedPostBody: [
        "Povedz ľuďom pravdu rýchlo:",
        "",
        "- **Čo staviaš** (1–2 vety)",
        "- **V akom stave to je** (link / repo / screenshot)",
        "- **Koho hľadáš** (skills, nie tituly)",
        "- **Koľko času** a **čo za to** (open-source, podiel, paid, barter…)",
        "",
        "Ak vynecháš „čo za to“, tak najčastejšia odpoveď bude ticho.",
      ].join("\n"),
      posts: [
        {
          title: "Dopyt: FE dev na MVP (Next.js)",
          body: [
            "Hľadám niekoho na FE pomoc s MVP.",
            "",
            "- Stack: Next.js, Tailwind",
            "- Potrebujem: feed, detail príspevku, jednoduché formy",
            "- Čas: 5–10h týždenne, 2–3 týždne",
            "",
            "Ak máš chuť, pošli link na 1–2 veci čo si robil.",
          ].join("\n"),
          comments: ["Ak pridáš aj Figma screenshot, bude to mať 2× viac reakcií."],
        },
        {
          title: "Ponúkam: code review a architektúra (backend)",
          body: [
            "Vieme prejsť:",
            "- schému DB a RLS pravidlá",
            "- API route / server actions",
            "- jednoduchý plán na onboarding a seed obsah",
            "",
            "Napíš kontext + čo je priorita.",
          ].join("\n"),
          comments: ["Toto je presne typ príspevku, ktorý robí komunitu užitočnou."],
        },
      ],
    },
    {
      title: "Q&A / otázky",
      description: "Otázky, ktoré nechceš googliť hodinu. A odpovede, ktoré nechceš písať dvakrát.",
      pinnedPostTitle: "FAQ: čo sem patria AI výstupy a čo nie",
      pinnedPostBody: [
        "Patrí sem:",
        "- AI plán / návrh / architektúra, keď chceš ľudský reality-check",
        "- AI texty, ktoré treba upraviť, skrátiť, zlepšiť",
        "- AI kód, keď potrebuješ review alebo debug",
        "",
        "Nepatrí sem:",
        "- „sprav mi všetko“ bez kontextu",
        "- „nefunguje mi to“ bez chyby/logu",
      ].join("\n"),
      posts: [
        {
          title: "Ako pridám AI výstup, aby dával zmysel?",
          body: [
            "Daj aspoň:",
            "- vstup (prompt alebo zadanie)",
            "- výstup (text/link)",
            "- čo presne chceš zlepšiť (kritériá)",
          ].join("\n"),
          comments: ["Zázračné: keď dáš kritériá, ľudia vedia odpovedať."],
        },
        {
          title: "Prečo je seed obsah lepší než prázdno",
          body: [
            "Lebo prázdna appka vyzerá mŕtvo. A mŕtve veci nikto nebuduje.",
            "Seed nie je klamstvo, keď je označený a slúži na onboarding/test.",
          ].join("\n"),
          comments: ["Presne. Označiť, oddeliť, vedieť zmazať. Hotovo."],
        },
      ],
    },
  ];
}

async function findBySlugOrTitle(table: string, slugCol: string | null, titleCol: string, slug: string, title: string) {
  // ak nemáš slugCol, fallback na title
  const query = supabase.from(table).select("*").limit(1);
  if (slugCol) {
    const { data, error } = await query.eq(slugCol, slug);
    if (error) return { row: null as any, error };
    if (data && data.length) return { row: data[0], error: null };
  }
  const { data, error } = await supabase.from(table).select("*").limit(1).eq(titleCol, title);
  if (error) return { row: null as any, error };
  return { row: data && data.length ? data[0] : null, error: null };
}

async function seed() {
  requireSafeToRun();
  console.log(`Seed batch: ${SEED_BATCH_ID}`);

  const authorId = await ensureAutopatchAuthorId();
  if (authorId) console.log(`Author: ${authorId}`);
  else console.log("Author: (null) - nastav AUTOPATCH_AUTHOR_ID ak treba");

  const groups = seedContent();
  const tG = MAP.tables.groups;
  const cG = MAP.cols.groups;
  const tP = MAP.tables.posts;
  const cP = MAP.cols.posts;
  const tC = MAP.tables.comments;
  const cC = MAP.cols.comments;

  for (const g of groups) {
    const gSlug = slugify(g.title);
    const slugCol = cG.slug || null;

    const existingG = await findBySlugOrTitle(tG, slugCol, cG.title, gSlug, g.title);
    if (existingG.error) die(`Group lookup failed: ${String(existingG.error.message ?? existingG.error)}`);

    let groupId = existingG.row?.[cG.id] ?? null;

    if (!groupId) {
      const groupRow: any = {
        [cG.id]: uuid(),
        [cG.title]: g.title,
        [cG.description]: g.description,
        [cG.isSeed]: true,
        [cG.seedBatchId]: SEED_BATCH_ID,
        [cG.createdAt]: nowISO(),
      };
      if (cG.slug) groupRow[cG.slug] = gSlug;
      if (cG.createdBy) groupRow[cG.createdBy] = authorId;

      const ins = await supabase.from(tG).insert(groupRow).select().single();
      if (ins.error) die(`Insert group failed (${g.title}): ${String(ins.error.message ?? ins.error)}`);
      groupId = ins.data?.[cG.id];
      console.log(`+ group: ${g.title}`);
    } else {
      console.log(`= group exists: ${g.title}`);
    }

    // pinned post
    const pinnedSlug = slugify(g.pinnedPostTitle);
    const postSlugCol = cP.slug || null;
    const existingPinned = await findBySlugOrTitle(tP, postSlugCol, cP.title, pinnedSlug, g.pinnedPostTitle);

    let pinnedPostId = existingPinned.row?.[cP.id] ?? null;
    if (!pinnedPostId) {
      const postRow: any = {
        [cP.id]: uuid(),
        [cP.groupId]: groupId,
        [cP.title]: g.pinnedPostTitle,
        [cP.body]: g.pinnedPostBody,
        [cP.pinned]: true,
        [cP.isSeed]: true,
        [cP.seedBatchId]: SEED_BATCH_ID,
        [cP.createdAt]: nowISO(),
      };
      if (cP.slug) postRow[cP.slug] = pinnedSlug;
      if (cP.createdBy) postRow[cP.createdBy] = authorId;

      const insP = await supabase.from(tP).insert(postRow).select().single();
      if (insP.error) die(`Insert pinned post failed (${g.title}): ${String(insP.error.message ?? insP.error)}`);
      pinnedPostId = insP.data?.[cP.id];
      console.log(`  + pinned: ${g.pinnedPostTitle}`);
    } else {
      console.log(`  = pinned exists: ${g.pinnedPostTitle}`);
    }

    // other posts
    for (const p of g.posts) {
      const pSlug = slugify(p.title);
      const existingP = await findBySlugOrTitle(tP, postSlugCol, cP.title, pSlug, p.title);
      let postId = existingP.row?.[cP.id] ?? null;

      if (!postId) {
        const postRow: any = {
          [cP.id]: uuid(),
          [cP.groupId]: groupId,
          [cP.title]: p.title,
          [cP.body]: p.body,
          [cP.pinned]: false,
          [cP.isSeed]: true,
          [cP.seedBatchId]: SEED_BATCH_ID,
          [cP.createdAt]: nowISO(),
        };
        if (cP.slug) postRow[cP.slug] = pSlug;
        if (cP.createdBy) postRow[cP.createdBy] = authorId;

        const insPost = await supabase.from(tP).insert(postRow).select().single();
        if (insPost.error) die(`Insert post failed (${p.title}): ${String(insPost.error.message ?? insPost.error)}`);
        postId = insPost.data?.[cP.id];
        console.log(`  + post: ${p.title}`);
      } else {
        console.log(`  = post exists: ${p.title}`);
      }

      if (p.comments?.length) {
        for (const comment of p.comments) {
          // idempotencia pre komentáre: nie je dokonalá bez seed_key, ale držíme to jednoduché:
          // - pridáme max 2 seed komentáre na post, ak už existujú seed komentáre pre batch, preskočíme
          const { data: existingSeedComments } = await supabase
            .from(tC)
            .select("*")
            .eq(cC.postId, postId)
            .eq(cC.seedBatchId, SEED_BATCH_ID)
            .limit(10);

          if (existingSeedComments && existingSeedComments.length >= p.comments.length) break;

          const commentRow: any = {
            [cC.id]: uuid(),
            [cC.postId]: postId,
            [cC.body]: comment,
            [cC.isSeed]: true,
            [cC.seedBatchId]: SEED_BATCH_ID,
            [cC.createdAt]: nowISO(),
          };
          if (cC.createdBy) commentRow[cC.createdBy] = authorId;

          const insC = await supabase.from(tC).insert(commentRow);
          if (insC.error) die(`Insert comment failed (${p.title}): ${String(insC.error.message ?? insC.error)}`);
        }
        console.log(`    + comments: ${p.comments.length}`);
      }
    }
  }

  console.log("OK seed done.");
}

async function unseed() {
  requireSafeToRun();
  console.log(`Unseed batch: ${SEED_BATCH_ID}`);

  const tG = MAP.tables.groups;
  const cG = MAP.cols.groups;
  const tP = MAP.tables.posts;
  const cP = MAP.cols.posts;
  const tC = MAP.tables.comments;
  const cC = MAP.cols.comments;

  // poradie: comments -> posts -> groups (kvôli FK)
  const delC = await supabase.from(tC).delete().eq(cC.seedBatchId, SEED_BATCH_ID);
  if (delC.error) die(`Delete comments failed: ${String(delC.error.message ?? delC.error)}`);
  console.log(`- comments: deleted`);

  const delP = await supabase.from(tP).delete().eq(cP.seedBatchId, SEED_BATCH_ID);
  if (delP.error) die(`Delete posts failed: ${String(delP.error.message ?? delP.error)}`);
  console.log(`- posts: deleted`);

  const delG = await supabase.from(tG).delete().eq(cG.seedBatchId, SEED_BATCH_ID);
  if (delG.error) die(`Delete groups failed: ${String(delG.error.message ?? delG.error)}`);
  console.log(`- groups: deleted`);

  console.log("OK unseed done.");
}

async function main() {
  const mode = (process.argv[2] ?? "").toLowerCase() as Mode;
  if (mode !== "seed" && mode !== "unseed") {
    console.log("Usage: node scripts/forum-autopatch.ts seed|unseed");
    process.exit(0);
  }
  if (mode === "seed") await seed();
  else await unseed();
}

main().catch((e) => die(String(e?.message ?? e)));
