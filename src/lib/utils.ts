export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDuration(duration: string): string {
  // duration comes as "Xm Ys" from demo data — display as-is
  return duration;
}

export function shortId(id: string): string {
  return id.split("-").slice(0, 2).join("-").toUpperCase();
}