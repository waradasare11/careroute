import { describe, expect, it } from "vitest";

import { buildIcs, escapeIcsText, foldLine } from "../ics";
import { appt, journey, NOW } from "./fixtures";

describe("calendar export", () => {
  it("includes only upcoming, non-cancelled appointments with CRLF line endings", () => {
    const j = journey([appt("keep", { title: "Echo, room 4" }), appt("gone", { status: "cancelled" })], []);
    const ics = buildIcs(j, [], NOW);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(ics).toContain("SUMMARY:Echo\\, room 4");
    expect(ics).not.toContain("UID:gone@");
  });

  it("escapes special characters and folds long lines", () => {
    expect(escapeIcsText("a;b,c\nd")).toBe("a\\;b\\,c\\nd");
    const folded = foldLine("DESCRIPTION:" + "x".repeat(200));
    expect(folded.split("\r\n ").every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true);
  });
});

