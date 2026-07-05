/** yyyy-mm-dd in the user's local timezone. */
export function todayIso(): string {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

export function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(fromIso + "T00:00:00");
  const to = new Date(toIso + "T00:00:00");
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

/** Days since the anniversary, counting the first day as day 1. */
export function daysTogether(anniversaryIso: string): number {
  return daysBetween(anniversaryIso, todayIso()) + 1;
}

export function daysUntil(dateIso: string): number {
  return daysBetween(todayIso(), dateIso);
}

export function formatDateVi(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** 18:01:32 — local time with seconds. */
export function formatTimeVi(ts: number): string {
  const d = new Date(ts);
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

/** 05/07/2026 18:01:32 */
export function formatDateTimeVi(ts: number): string {
  const d = new Date(ts);
  const date = [
    String(d.getDate()).padStart(2, "0"),
    String(d.getMonth() + 1).padStart(2, "0"),
    d.getFullYear(),
  ].join("/");
  return `${date} ${formatTimeVi(ts)}`;
}

export function formatTimeIn(timeZone: string, date = new Date()): string {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(date);
}

export function greetingForHour(hour: number, name: string): string {
  if (hour < 11) return `Chào buổi sáng, ${name}`;
  if (hour < 14) return `Chào buổi trưa, ${name}`;
  if (hour < 18) return `Chào buổi chiều, ${name}`;
  return `Good evening, ${name}`;
}
