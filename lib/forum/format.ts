export function formatDateTime(iso: string) {
  const d = new Date(iso);
  // Avoid throwing on invalid date
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("sk-SK", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export function shortId(id: string) {
  if (!id) return "";
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}
