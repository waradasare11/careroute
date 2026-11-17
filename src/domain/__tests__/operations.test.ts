import { describe, expect, it } from "vitest";

import { cancelAppointment, confirmPlan, confirmRequirement, markRequirementDelayed, proposeTiming, rescheduleAppointment, upsertAppointment, upsertRequirement } from "../operations";
import { journeyReadiness } from "../readiness";
import type { Journey } from "../types";
import { appt, chainJourney, ctx, day, journey, localDate, localInput, NOW } from "./fixtures";

const unwrap = <T,>(r: { ok: true; value: T } | { ok: false; errors: Record<string, string> }): T => {
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return r.value;
};

describe("delay propagation", () => {
  it("flags every dependent appointment for review without cancelling anything", () => {
    const j = chainJourney();
    const res = unwrap(markRequirementDelayed(j, "report", { expectedDate: localDate(10), reason: "Reporting backlog" }, ctx));
    expect(res.flagged.sort()).toEqual(["consult", "followup"]);
    const statuses = Object.fromEntries(res.journey.appointments.map((a) => [a.id, a.status]));
    expect(statuses).toEqual({ scan: "confirmed", consult: "needs_review", followup: "needs_review", bloods: "confirmed" });
    expect(res.journey.appointments.some((a) => a.status === "cancelled")).toBe(false);
    expect(res.audit.map((a) => a.action)).toEqual(["requirement.delayed", "appointment.flagged", "appointment.flagged"]);
  });

  it("requires a reason and rejects past expected dates", () => {
    const r = markRequirementDelayed(chainJourney(), "report", { expectedDate: localDate(-2), reason: "" }, ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.reason).toBeDefined();
      expect(r.errors.expectedDate).toBeDefined();
    }
  });
});

describe("revised timing and plan confirmation", () => {
  function delayed(): Journey {
    return unwrap(markRequirementDelayed(chainJourney(), "report", { expectedDate: localDate(10), reason: "Backlog" }, ctx)).journey;
  }

  it("refuses to confirm the plan while flagged appointments have no decision", () => {
    const r = confirmPlan(delayed(), ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.form).toMatch(/needs review/);
  });

  it("refuses a proposed time before the delayed report is expected", () => {
    const r = proposeTiming(delayed(), "consult", localInput(9, 11), ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.proposedStart).toMatch(/expected/);
  });

  it("refuses past and impossible proposed times", () => {
    expect(proposeTiming(delayed(), "consult", localInput(-1, 11), ctx).ok).toBe(false);
    expect(proposeTiming(delayed(), "consult", "2026-02-31T10:00", ctx).ok).toBe(false);
  });

  it("applies proposals on confirmation and produces an updated, confirmed schedule", () => {
    let j = delayed();
    j = unwrap(proposeTiming(j, "consult", localInput(11, 11), ctx)).journey;
    // follow-up must move too, since consult now ends later than before? it is still after: keep its time
    j = unwrap(proposeTiming(j, "followup", localInput(15, 11), ctx)).journey;
    const later = { ...ctx, now: new Date(NOW.getTime() + 60_000) };
    const res = unwrap(confirmPlan(j, later));
    const consult = res.journey.appointments.find((a) => a.id === "consult")!;
    expect(consult.start).toBe(day(11, 11));
    expect(consult.status).toBe("confirmed");
    expect(consult.proposedStart).toBeNull();
    expect(res.journey.planVersion).toBe(2);
    expect(res.audit[0].action).toBe("plan.confirmed");
    expect(res.audit.some((a) => a.action === "appointment.rescheduled" && a.entityId === "consult")).toBe(true);
    // the report is still delayed (expected before the new time): waiting, not attention
    const readiness = journeyReadiness(res.journey, later.now);
    expect(readiness.assessments.get("consult")!.state).toBe("waiting");
    expect(readiness.administrativelyReady).toBe(false);
  });

  it("becomes administratively ready once staff confirm all requirements", () => {
    let j = delayed();
    j = unwrap(proposeTiming(j, "consult", localInput(11, 11), ctx)).journey;
    j = unwrap(proposeTiming(j, "followup", localInput(15, 11), ctx)).journey;
    j = unwrap(confirmPlan(j, ctx)).journey;
    j = unwrap(confirmRequirement(j, "report", ctx)).journey;
    j = unwrap(confirmRequirement(j, "results", ctx)).journey;
    expect(journeyReadiness(j, NOW).administrativelyReady).toBe(true);
  });
});

describe("reschedule and cancel", () => {
  it("rescheduling clears the confirmation and flags downstream appointments", () => {
    const j = chainJourney();
    const res = unwrap(rescheduleAppointment(j, "consult", { start: localInput(9, 11), reason: "Clinic moved" }, ctx));
    const consult = res.journey.appointments.find((a) => a.id === "consult")!;
    expect(consult.status).toBe("scheduled");
    expect(consult.lastConfirmedAt).toBeNull();
    expect(res.journey.appointments.find((a) => a.id === "followup")!.status).toBe("needs_review");
  });

  it("rescheduling refuses a time before prerequisites are available", () => {
    const r = rescheduleAppointment(chainJourney(), "consult", { start: localInput(4, 11), reason: "x" }, ctx);
    expect(r.ok).toBe(false);
  });

  it("rescheduling requires a reason", () => {
    const r = rescheduleAppointment(chainJourney(), "consult", { start: localInput(9, 11), reason: " " }, ctx);
    expect(r.ok).toBe(false);
  });

  it("cancelling flags dependents but never cancels them", () => {
    const res = unwrap(cancelAppointment(chainJourney(), "scan", "Machine unavailable", ctx));
    const status = Object.fromEntries(res.journey.appointments.map((a) => [a.id, a.status]));
    expect(status.scan).toBe("cancelled");
    expect(status.consult).toBe("needs_review");
    expect(status.followup).toBe("needs_review");
    const readiness = journeyReadiness(res.journey, NOW);
    expect(readiness.assessments.get("report")!.issues.map((i) => i.code)).toContain("depends_on_cancelled");
  });
});

describe("input validation", () => {
  const base = { title: "Clinic", department: "Cardiology", location: "", start: localInput(4, 10), durationMinutes: "30", ownerId: "c1", dependsOn: [], preparation: "" };
  const j = journey([appt("a")], []);

  it("rejects negative and zero durations", () => {
    for (const d of ["-15", "0"]) {
      const r = upsertAppointment(j, null, { ...base, durationMinutes: d }, ctx);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.errors.durationMinutes).toBeDefined();
    }
  });

  it("rejects impossible dates and past start times", () => {
    const r1 = upsertAppointment(j, null, { ...base, start: "2026-02-30T10:00" }, ctx);
    const r2 = upsertAppointment(j, null, { ...base, start: localInput(-1, 10) }, ctx);
    expect(!r1.ok && r1.errors.start).toBeTruthy();
    expect(!r2.ok && r2.errors.start).toBeTruthy();
  });

  it("rejects missing and unknown owners", () => {
    const r1 = upsertAppointment(j, null, { ...base, ownerId: "" }, ctx);
    const r2 = upsertAppointment(j, null, { ...base, ownerId: "ghost" }, ctx);
    expect(!r1.ok && r1.errors.ownerId).toBeTruthy();
    expect(!r2.ok && r2.errors.ownerId).toBeTruthy();
  });

  it("rejects negative requirement validity", () => {
    const r = upsertRequirement(j, null, { kind: "report", title: "R", ownerId: "c1", dueDate: localDate(3), validityDays: "-5", dependsOn: [], notes: "" }, ctx);
    expect(!r.ok && r.errors.validityDays).toBeTruthy();
  });

  it("refuses a requirement depending on another requirement", () => {
    const j2 = chainJourney();
    const r = upsertRequirement(j2, null, { kind: "report", title: "R", ownerId: "c1", dueDate: localDate(3), validityDays: "", dependsOn: ["report"], notes: "" }, ctx);
    expect(!r.ok && r.errors.dependsOn).toBeTruthy();
  });

  it("accepts a valid appointment as scheduled (unconfirmed)", () => {
    const r = unwrap(upsertAppointment(j, null, base, ctx));
    expect(r.journey.appointments).toHaveLength(2);
    expect(r.journey.appointments[1].status).toBe("scheduled");
  });
});

