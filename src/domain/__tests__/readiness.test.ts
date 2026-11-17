import { describe, expect, it } from "vitest";

import { APPOINTMENT_CONFIRMATION_VALID_DAYS, assessJourney, journeyReadiness } from "../readiness";
import { appt, chainJourney, day, journey, NOW, past, req } from "./fixtures";

describe("readiness", () => {
  it("is administratively ready only when every requirement is confirmed and current", () => {
    const j = journey([appt("consult", { dependsOn: ["letter"] })], [req("letter")]);
    expect(journeyReadiness(j, NOW).administrativelyReady).toBe(true);
  });

  it("is not ready while a requirement is merely received (not confirmed)", () => {
    const j = journey([appt("consult", { dependsOn: ["letter"] })], [req("letter", { status: "received", lastConfirmedAt: null })]);
    const r = journeyReadiness(j, NOW);
    expect(r.administrativelyReady).toBe(false);
    expect(r.assessments.get("consult")!.state).toBe("waiting");
  });

  it("is not ready when the plan itself has not been confirmed", () => {
    const j = journey([appt("consult")], [], { planConfirmedAt: null });
    expect(journeyReadiness(j, NOW).administrativelyReady).toBe(false);
  });

  it("treats a confirmation older than the validity window as stale", () => {
    const j = journey([appt("consult", { dependsOn: ["vision"] })], [req("vision", { validityDays: 30, lastConfirmedAt: past(31), updatedAt: past(31) })]);
    const a = assessJourney(j, NOW);
    expect(a.get("vision")!.issues.map((i) => i.code)).toContain("stale_confirmation");
    expect(a.get("consult")!.state).toBe("attention");
    expect(journeyReadiness(j, NOW).administrativelyReady).toBe(false);
  });

  it("treats a requirement edited after confirmation as stale", () => {
    const j = journey([appt("c", { dependsOn: ["r"] })], [req("r", { lastConfirmedAt: past(3), updatedAt: past(1) })]);
    expect(assessJourney(j, NOW).get("r")!.issues.map((i) => i.code)).toContain("changed_since_confirmation");
  });

  it("treats appointment slot confirmations older than the window as stale", () => {
    const old = past(APPOINTMENT_CONFIRMATION_VALID_DAYS + 1);
    const j = journey([appt("c", { lastConfirmedAt: old, updatedAt: old })], []);
    expect(assessJourney(j, NOW).get("c")!.issues.map((i) => i.code)).toContain("stale_confirmation");
  });

  it("propagates a delayed report transitively to every downstream appointment", () => {
    const j = chainJourney();
    j.requirements = j.requirements.map((r) => (r.id === "report" ? { ...r, status: "delayed", expectedDate: null } : r));
    const a = assessJourney(j, NOW);
    expect(a.get("report")!.state).toBe("attention");
    expect(a.get("consult")!.state).toBe("attention");
    expect(a.get("consult")!.issues.some((i) => i.code === "blocked_by" && i.relatedIds?.includes("report"))).toBe(true);
    expect(a.get("followup")!.state).toBe("attention");
    expect(a.get("followup")!.issues.some((i) => i.code === "blocked_by" && i.relatedIds?.includes("consult"))).toBe(true);
    // unrelated branch unaffected
    expect(a.get("bloods")!.state).toBe("ready");
  });

  it("flags a timing conflict when a delayed item is expected after the appointment", () => {
    const j = journey([appt("c", { start: day(3, 10), dependsOn: ["r"] })], [req("r", { status: "delayed", expectedDate: day(6, 17), lastConfirmedAt: null })]);
    const codes = assessJourney(j, NOW).get("c")!.issues.map((i) => i.code);
    expect(codes).toContain("timing_conflict");
  });

  it("flags an appointment that starts before its prerequisite appointment ends", () => {
    const j = journey([appt("a", { start: day(2, 9), durationMinutes: 90 }), appt("b", { start: day(2, 10), dependsOn: ["a"] })], []);
    expect(assessJourney(j, NOW).get("b")!.issues.map((i) => i.code)).toContain("timing_conflict");
  });

  it("flags missing owners", () => {
    const j = journey([appt("c", { ownerId: null })], [req("r", { ownerId: null })]);
    const a = assessJourney(j, NOW);
    expect(a.get("c")!.issues.map((i) => i.code)).toContain("missing_owner");
    expect(a.get("r")!.issues.map((i) => i.code)).toContain("missing_owner");
  });

  it("marks cycle members as needing attention", () => {
    const j = journey([appt("a", { dependsOn: ["b"] }), appt("b", { dependsOn: ["a"] })], []);
    const r = journeyReadiness(j, NOW);
    expect(r.cycle).not.toBeNull();
    expect(r.administrativelyReady).toBe(false);
  });

  it("a waived requirement counts as satisfied", () => {
    const j = journey([appt("c", { dependsOn: ["r"] })], [req("r", { status: "waived" })]);
    expect(journeyReadiness(j, NOW).administrativelyReady).toBe(true);
  });
});

