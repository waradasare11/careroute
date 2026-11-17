const LOCAL_DT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const LOCAL_D = /^(\d{4})-(\d{2})-(\d{2})$/;

export const MS_PER_MINUTE = 60_000;
export const MS_PER_DAY = 86_400_000;

/** Parse a `datetime-local` value (YYYY-MM-DDTHH:mm), rejecting impossible dates like Feb 31. */
export function parseLocalDateTime(value: string): Date | null {
  const m = LOCAL_DT.exec(value.trim());
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number) as [number, number, number, number, number];
  if (mo < 1 || mo > 12 || h > 23 || mi > 59) return null;
  const date = new Date(y, mo - 1, d, h, mi, 0, 0);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return date;
}

/** Parse a `date` input value (YYYY-MM-DD) as local end-of-day. */
export function parseLocalDate(value: string): Date | null {
  const m = LOCAL_D.exec(value.trim());
  if (!m) return null;
  const [y, mo, d] = m.slice(1).map(Number) as [number, number, number];
  if (mo < 1 || mo > 12) return null;
  const date = new Date(y, mo - 1, d, 17, 0, 0, 0);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return date;
}

export function isValidIso(value: string | null | undefined): value is string {
  if (!value) return false;
  const t = Date.parse(value);
  return Number.isFinite(t);
}

export function toTime(value: string): number {
  return Date.parse(value);
}

const pad = (n: number) => String(n).padStart(2, "0");

export function toLocalInputValue(iso: string | null | undefined): string {
  if (!isValidIso(iso)) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function toLocalDateInputValue(iso: string | null | undefined): string {
  if (!isValidIso(iso)) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addMinutes(iso: string, minutes: number): string {
  return new Date(toTime(iso) + minutes * MS_PER_MINUTE).toISOString();
}

export function addDays(iso: string, days: number): string {
  return new Date(toTime(iso) + days * MS_PER_DAY).toISOString();
}

export function appointmentEnd(a: { start: string; durationMinutes: number }): number {
  return toTime(a.start) + a.durationMinutes * MS_PER_MINUTE;
}

