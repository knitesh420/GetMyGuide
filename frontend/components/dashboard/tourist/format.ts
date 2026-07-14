// Shared formatters for the tourist dashboard widgets, so every card renders
// money, dates and countdowns the same way.

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatCurrency(amount: number, currency = "INR"): string {
  if (currency !== "INR") {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  }
  return INR.format(amount);
}

/** e.g. "12 Jul 2026" */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** e.g. "12 Jul 2026, 4:31 pm" — for payment timestamps, where the time matters. */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** e.g. "July 2026" — used for "Member since". */
export function formatMonthYear(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

/** e.g. "2 hours ago" — used by the activity timeline and notifications. */
export function formatRelative(value: string): string {
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "—";

  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 60) return "Just now";

  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["minute", 60],
    ["hour", 3600],
    ["day", 86400],
    ["week", 604800],
    ["month", 2592000],
    ["year", 31536000],
  ];

  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  // Walk to the largest unit that still yields a count of at least 1.
  let chosen: [Intl.RelativeTimeFormatUnit, number] = units[0];
  for (const unit of units) {
    if (seconds >= unit[1]) chosen = unit;
  }
  return formatter.format(-Math.floor(seconds / chosen[1]), chosen[0]);
}

/**
 * Whole days from today until `value`, ignoring the time of day so a trip later
 * today reads as "Today" rather than a fractional day.
 */
export function daysUntil(value: string): number {
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return 0;

  const startOfTarget = new Date(target);
  startOfTarget.setHours(0, 0, 0, 0);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  return Math.round(
    (startOfTarget.getTime() - startOfToday.getTime()) / 86_400_000,
  );
}

/** Human countdown for the hero card: "Today", "Tomorrow", "in 5 days". */
export function formatCountdown(value: string): string {
  const days = daysUntil(value);
  if (days < 0) return "Under way";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `in ${days} days`;
}

/** Initials for the avatar fallback, e.g. "Nitesh Kumar" -> "NK". */
export function initialsOf(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "T"
  );
}
