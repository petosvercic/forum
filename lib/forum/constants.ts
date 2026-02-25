export const CATEGORIES = [
  "Remeslo a technika",
  "Dev a automatizácie",
  "Dizajn a kreatíva",
  "Biznis a marketing",
  "Produktivita a systémy",
  "Vzdelávanie a učenie",
  "Právo a financie",
  "Zdravie a fitness",
  "Hobby a voľný čas",
  "Meta",
] as const;

export const POST_TYPES = [
  { value: "ai_output", label: "AI výstup" },
  { value: "request", label: "Dopyt o pomoc" },
] as const;

export const POST_LANGS = [
  { value: "sk", label: "SK" },
  { value: "cz", label: "CZ" },
  { value: "mix", label: "Mix" },
] as const;

export function normalizeTags(input: string): string[] {
  return input
    .split(/[,\n]/g)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => (t.startsWith("#") ? t.slice(1) : t))
    .map((t) => t.toLowerCase())
    .filter((t, i, arr) => arr.indexOf(t) === i)
    .slice(0, 12);
}
