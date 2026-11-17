import { appointmentEnd, toTime } from "./dates";
import type { Contact, Journey } from "./types";

function icsDate(ms: number): string {
  return new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function escapeIcsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Fold lines to 75 octets as required by RFC 5545. */
export function foldLine(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let currentBytes = 0;
  for (const ch of line) {
    const len = new TextEncoder().encode(ch).length;
    const limit = parts.length === 0 ? 75 : 74;
    if (currentBytes + len > limit) {
      parts.push(current);
      current = "";
      currentBytes = 0;
    }
    current += ch;
    currentBytes += len;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

/**
 * Build an iCalendar file for the patient's upcoming, non-cancelled appointments.
 * Contains only administrative itinerary details from the fictional demo.
 */
export function buildIcs(journey: Journey, contacts: Contact[], now: Date): string {
  const contactName = (id: string | null) => contacts.find((c) => c.id === id)?.name ?? "CareRoute coordinator";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CareRoute//Demo itinerary//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(`CareRoute ${journey.reference} (demo)`)}`,
  ];
  const upcoming = journey.appointments
    .filter((a) => a.status !== "cancelled" && a.status !== "completed")
    .sort((a, b) => toTime(a.start) - toTime(b.start));
  for (const a of upcoming) {
    const desc = [
      `Department: ${a.department}`,
      a.preparation ? `Preparation: ${a.preparation}` : "",
      `Responsible: ${contactName(a.ownerId)}`,
      a.status === "confirmed" ? "Status: confirmed by staff" : "Status: not yet confirmed — check before travelling",
      "Fictional CareRoute demo itinerary. Not medical advice; clinical decisions remain with hospital staff.",
    ]
      .filter(Boolean)
      .join("\n");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${a.id}@careroute.demo`,
      `DTSTAMP:${icsDate(now.getTime())}`,
      `DTSTART:${icsDate(toTime(a.start))}`,
      `DTEND:${icsDate(appointmentEnd(a))}`,
      `SUMMARY:${escapeIcsText(a.title)}`,
      `LOCATION:${escapeIcsText(a.location || a.department)}`,
      `DESCRIPTION:${escapeIcsText(desc)}`,
      `STATUS:${a.status === "confirmed" ? "CONFIRMED" : "TENTATIVE"}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

