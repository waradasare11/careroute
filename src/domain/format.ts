import { isValidIso } from "./dates";

export type Lang = "en" | "hi";

const locales: Record<Lang, string> = { en: "en-IN", hi: "hi-IN" };

export function formatDateTime(iso: string | null | undefined, lang: Lang = "en"): string {
  if (!isValidIso(iso)) return "—";
  return new Intl.DateTimeFormat(locales[lang], { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

export function formatDate(iso: string | null | undefined, lang: Lang = "en"): string {
  if (!isValidIso(iso)) return "—";
  return new Intl.DateTimeFormat(locales[lang], { dateStyle: "medium" }).format(new Date(iso));
}

export function formatTime(iso: string | null | undefined, lang: Lang = "en"): string {
  if (!isValidIso(iso)) return "—";
  return new Intl.DateTimeFormat(locales[lang], { timeStyle: "short" }).format(new Date(iso));
}

export function formatDayHeading(iso: string, lang: Lang = "en"): string {
  return new Intl.DateTimeFormat(locales[lang], { weekday: "long", day: "numeric", month: "long" }).format(new Date(iso));
}

export function relativeAge(iso: string | null | undefined, now: Date): string {
  if (!isValidIso(iso)) return "never";
  const diff = now.getTime() - Date.parse(iso);
  const mins = Math.round(diff / 60000);
  if (Math.abs(mins) < 1) return "just now";
  if (mins < 0) return "in the future";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} days ago`;
}

