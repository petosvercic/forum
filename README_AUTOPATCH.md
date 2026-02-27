# Forum Autopatch (seed demo obsah)

Tento balíček pridá **základné skupiny + pár príspevkov + komentárov** do DB, aby fórum po prvom kliku nevyzeralo ako prázdna miestnosť.

## Čo dostaneš
- Skupiny:
  - `Ako používať fórum`
  - `Projekty & spolupráce`
  - `Q&A / otázky`
- Každá skupina má pár príspevkov (jeden "pinned" pre onboarding) + pár komentárov.
- Všetko je označené `is_seed=true` + `seed_batch_id`, aby sa to dalo bezpečne odstrániť.

## Bezpečnostné brzdy
Seed sa spustí iba keď platí:
- `FORUM_AUTOPATCH=1`
- a prostredie nie je `production`

## Predpoklady
- máš Supabase project (alebo Postgres s podobným API) a vieš spúšťať Node skripty
- v `.env` máš:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

## Najprv nastav mapovanie tabuliek/stĺpcov
Schéma fórum DB sa medzi projektmi líši. V `scripts/forum-autopatch.ts` je hore objekt `MAP`.
Uprav:
- názvy tabuliek (`groups/posts/comments/profiles`)
- názvy stĺpcov (napr. `title` vs `name`, `body` vs `content`, `group_id` vs `category_id`...)

Tip (rýchle nájdenie v repo):
- Bash: `grep -R "create table" -n supabase/migrations | head`
- PowerShell: `gci -r supabase\migrations | % { Select-String -Path $_.FullName -Pattern "create table" } | select -First 20`

## Spustenie (Bash)
```bash
node scripts/forum-autopatch.ts seed
node scripts/forum-autopatch.ts unseed
```

## Spustenie (PowerShell)
```powershell
node scripts\forum-autopatch.ts seed
node scripts\forum-autopatch.ts unseed
```

## Pridanie NPM skriptov (voliteľné)
Do `package.json`:
```json
{
  "scripts": {
    "db:seed:forum": "node scripts/forum-autopatch.ts seed",
    "db:unseed:forum": "node scripts/forum-autopatch.ts unseed"
  }
}
```

## Poznámka k authorovi
Skript sa pokúsi vytvoriť `autopatch@viora.local` cez Supabase Admin API (service role).
Ak to u teba nejde (iná auth vrstva), nastav env:
- `AUTOPATCH_AUTHOR_ID=<uuid existujúceho usera>`
