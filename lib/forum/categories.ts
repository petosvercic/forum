import type { ForumCategoryRow } from "@/lib/forum/types";

export function slugifyCategory(name: string) {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48);
}

export function sortCategories(rows: ForumCategoryRow[]) {
  return [...rows].sort((a, b) => {
    const ao = a.sort_order ?? 100;
    const bo = b.sort_order ?? 100;
    if (ao !== bo) return ao - bo;
    return a.name.localeCompare(b.name);
  });
}
