import { appointmentEnd, parseLocalDate, parseLocalDateTime, toTime } from "./dates";
import { formatDate, formatDateTime } from "./format";
import { findCycle, nodeMap, transitiveDependents } from "./graph";
import { newId } from "./ids";
import { requirementAvailability } from "./readiness";
import type { Appointment, AuditDraft, DemoPatient, Journey, Requirement, RequirementStatus, Result } from "./types";
import {
  parseWholeNumber,
  validateAppointmentInput,
  validateJourneyInput,
  validateRequirementInput,
  type AppointmentInput,
  type JourneyInput,
  type RequirementInput,
} from "./validation";

export interface OpContext {
  now: Date;
  actor: string;
  contactIds: Set<string>;
  patients: DemoPatient[];
}

export type OpResult = Result<{ journey: Journey; audit: AuditDraft[] }>;

const fail = (errors: Record<string, string>): OpResult => ({ ok: false, errors });
const failMsg = (message: string): OpResult => fail({ form: message });
const hasErrors = (e: Record<string, string>) => Object.keys(e).length > 0;

function touch(journey: Journey, ctx: OpContext, patch: Partial<Journey>): Journey {
  return { ...journey, ...patch, updatedAt: ctx.now.toISOString() };
}

function requireActive(journey: Journey): OpResult | null {
  if (journey.status !== "active") return failMsg(`This journey is ${journey.status} and can no longer be changed.`);
  return null;
}

function findAppointment(journey: Journey, id: string): Appointment | undefined {
  return journey.appointments.find((a) => a.id === id);
}
function findRequirement(journey: Journey, id: string): Requirement | undefined {
  return journey.requirements.find((r) => r.id === id);
}

/**
 * Flag every downstream, still-active appointment for coordinator review.
 * Never cancels anything automatically — clinical and scheduling decisions stay with staff.
 */
export function flagDependents(
  journey: Journey,
  sourceId: string,
  reason: string,
  ctx: OpContext,
): { journey: Journey; flagged: string[]; audit: AuditDraft[] } {
  const downstream = transitiveDependents(journey, sourceId);
  const flagged: string[] = [];
  const nowIso = ctx.now.toISOString();
  const appointments = journey.appointments.map((a) => {
    if (!downstream.has(a.id) || a.status === "cancelled" || a.status === "completed") return a;
    flagged.push(a.id);
    return { ...a, status: "needs_review" as const, reviewReason: reason, updatedAt: nowIso };
  });
  const audit: AuditDraft[] = flagged.map((id) => ({
    action: "appointment.flagged",
    journeyId: journey.id,
    entityId: id,
    summary: `Flagged “${appointments.find((a) => a.id === id)!.title}” for review: ${reason}`,
  }));
  return { journey: { ...journey, appointments }, flagged, audit };
}

export function nextReference(existing: Journey[]): string {
  const nums = existing.map((j) => Number(j.reference.replace(/\D/g, ""))).filter(Number.isFinite);
  const next = (nums.length ? Math.max(...nums) : 1000) + 1;
  return `CR-${next}`;
}

export function createJourney(input: JourneyInput, existing: Journey[], ctx: OpContext): OpResult {
  const errors = validateJourneyInput(input, new Set(ctx.patients.map((p) => p.id)), ctx);
  if (hasErrors(errors)) return fail(errors);
  const patient = ctx.patients.find((p) => p.id === input.patientId)!;
  const nowIso = ctx.now.toISOString();
  const journey: Journey = {
    id: newId("jr"),
    reference: nextReference(existing),
    patientId: patient.id,
    patientName: patient.name,
    specialty: input.specialty.trim(),
    summary: input.summary.trim(),
    coordinatorId: input.coordinatorId,
    status: "active",
    appointments: [],
    requirements: [],
    planVersion: 1,
    planConfirmedAt: null,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  return {
    ok: true,
    value: {
      journey,
      audit: [{ action: "journey.created", journeyId: journey.id, entityId: journey.id, summary: `Created journey ${journey.reference} for ${patient.name}.` }],
    },
  };
}

export function updateJourneyDetails(journey: Journey, input: JourneyInput, ctx: OpContext): OpResult {
  const inactive = requireActive(journey);
  if (inactive) return inactive;
  const errors = validateJourneyInput(input, new Set(ctx.patients.map((p) => p.id)), ctx);
  if (hasErrors(errors)) return fail(errors);
  const patient = ctx.patients.find((p) => p.id === input.patientId)!;
  const next = touch(journey, ctx, {
    patientId: patient.id,
    patientName: patient.name,
    specialty: input.specialty.trim(),
    summary: input.summary.trim(),
    coordinatorId: input.coordinatorId,
  });
  return {
    ok: true,
    value: { journey: next, audit: [{ action: "journey.updated", journeyId: journey.id, entityId: journey.id, summary: "Updated journey details." }] },
  };
}

export function upsertAppointment(journey: Journey, id: string | null, input: AppointmentInput, ctx: OpContext): OpResult {
  const inactive = requireActive(journey);
  if (inactive) return inactive;
  const existing = id ? findAppointment(journey, id) : undefined;
  if (id && !existing) return failMsg("That appointment no longer exists.");
  if (existing && (existing.status === "cancelled" || existing.status === "completed")) {
    return failMsg(`A ${existing.status} appointment cannot be edited.`);
  }
  const nodeId = existing?.id ?? newId("ap");
  const startDate = parseLocalDateTime(input.start);
  const timingChanged =
    !existing || !startDate || startDate.getTime() !== toTime(existing.start) || Number(input.durationMinutes) !== existing.durationMinutes;
  const errors = validateAppointmentInput(journey, nodeId, input, ctx, { requireFuture: timingChanged });
  if (hasErrors(errors)) return fail(errors);

  const nowIso = ctx.now.toISOString();
  const appt: Appointment = {
    id: nodeId,
    title: input.title.trim(),
    department: input.department.trim(),
    location: input.location.trim(),
    start: startDate!.toISOString(),
    durationMinutes: parseWholeNumber(input.durationMinutes)!,
    ownerId: input.ownerId,
    dependsOn: [...new Set(input.dependsOn)],
    preparation: input.preparation.trim(),
    status: existing ? (timingChanged ? "scheduled" : existing.status) : "scheduled",
    lastConfirmedAt: existing && !timingChanged ? existing.lastConfirmedAt : null,
    proposedStart: null,
    reviewReason: existing && !timingChanged ? existing.reviewReason : null,
    updatedAt: nowIso,
  };
  const timingIssue = timingConflict(journey, appt, appt.start);
  if (timingIssue) return fail({ start: timingIssue });

  let next = touch(journey, ctx, {
    appointments: existing ? journey.appointments.map((a) => (a.id === nodeId ? appt : a)) : [...journey.appointments, appt],
  });
  const audit: AuditDraft[] = [
    {
      action: existing ? (timingChanged ? "appointment.rescheduled" : "appointment.updated") : "appointment.added",
      journeyId: journey.id,
      entityId: nodeId,
      summary: existing
        ? timingChanged
          ? `Changed timing of “${appt.title}” to ${formatDateTime(appt.start)}; needs confirmation.`
          : `Updated details of “${appt.title}”.`
        : `Added appointment “${appt.title}” on ${formatDateTime(appt.start)}.`,
    },
  ];
  if (existing && timingChanged) {
    const f = flagDependents(next, nodeId, `Upstream appointment “${appt.title}” changed time.`, ctx);
    next = f.journey;
    audit.push(...f.audit);
  }
  return { ok: true, value: { journey: next, audit } };
}

export function upsertRequirement(journey: Journey, id: string | null, input: RequirementInput, ctx: OpContext): OpResult {
  const inactive = requireActive(journey);
  if (inactive) return inactive;
  const existing = id ? findRequirement(journey, id) : undefined;
  if (id && !existing) return failMsg("That requirement no longer exists.");
  const nodeId = existing?.id ?? newId("rq");
  const errors = validateRequirementInput(journey, nodeId, input, ctx);
  if (hasErrors(errors)) return fail(errors);
  const nowIso = ctx.now.toISOString();
  const validity = parseWholeNumber(input.validityDays);
  const req: Requirement = {
    id: nodeId,
    kind: input.kind,
    title: input.title.trim(),
    ownerId: input.ownerId,
    dueDate: parseLocalDate(input.dueDate)!.toISOString(),
    validityDays: validity,
    dependsOn: [...new Set(input.dependsOn)],
    notes: input.notes.trim(),
    status: existing?.status ?? "pending",
    lastConfirmedAt: existing?.lastConfirmedAt ?? null,
    confirmedBy: existing?.confirmedBy ?? null,
    expectedDate: existing?.expectedDate ?? null,
    delayReason: existing?.delayReason ?? null,
    updatedAt: nowIso,
  };
  const next = touch(journey, ctx, {
    requirements: existing ? journey.requirements.map((r) => (r.id === nodeId ? req : r)) : [...journey.requirements, req],
  });
  return {
    ok: true,
    value: {
      journey: next,
      audit: [
        {
          action: existing ? "requirement.updated" : "requirement.added",
          journeyId: journey.id,
          entityId: nodeId,
          summary: existing ? `Updated requirement “${req.title}”.` : `Added requirement “${req.title}”, due ${formatDate(req.dueDate)}.`,
        },
      ],
    },
  };
}

export function setRequirementStatus(
  journey: Journey,
  id: string,
  status: Extract<RequirementStatus, "pending" | "requested" | "received" | "waived">,
  ctx: OpContext,
): OpResult {
  const inactive = requireActive(journey);
  if (inactive) return inactive;
  const req = findRequirement(journey, id);
  if (!req) return failMsg("That requirement no longer exists.");
  if (status === "waived" && !req.ownerId) return failMsg("Assign an owner before waiving this requirement.");
  const nowIso = ctx.now.toISOString();
  const updated: Requirement = {
    ...req,
    status,
    lastConfirmedAt: status === "waived" ? nowIso : null,
    confirmedBy: status === "waived" ? ctx.actor : null,
    expectedDate: null,
    delayReason: null,
    updatedAt: nowIso,
  };
  return {
    ok: true,
    value: {
      journey: touch(journey, ctx, { requirements: journey.requirements.map((r) => (r.id === id ? updated : r)) }),
      audit: [{ action: "requirement.status_changed", journeyId: journey.id, entityId: id, summary: `Set “${req.title}” to ${status}.` }],
    },
  };
}

/** Staff confirm a requirement is present and current. Also used to reconfirm a stale item. */
export function confirmRequirement(journey: Journey, id: string, ctx: OpContext): OpResult {
  const inactive = requireActive(journey);
  if (inactive) return inactive;
  const req = findRequirement(journey, id);
  if (!req) return failMsg("That requirement no longer exists.");
  if (!req.ownerId) return failMsg("Assign a responsible owner before confirming.");
  const nowIso = ctx.now.toISOString();
  const wasStale = req.status === "confirmed";
  const updated: Requirement = {
    ...req,
    status: "confirmed",
    lastConfirmedAt: nowIso,
    confirmedBy: ctx.actor,
    expectedDate: null,
    delayReason: null,
    updatedAt: nowIso,
  };
  return {
    ok: true,
    value: {
      journey: touch(journey, ctx, { requirements: journey.requirements.map((r) => (r.id === id ? updated : r)) }),
      audit: [
        {
          action: "requirement.confirmed",
          journeyId: journey.id,
          entityId: id,
          summary: wasStale ? `Reconfirmed “${req.title}” is still current.` : `Confirmed “${req.title}” is received and current.`,
        },
      ],
    },
  };
}

export function markRequirementDelayed(
  journey: Journey,
  id: string,
  input: { expectedDate: string; reason: string },
  ctx: OpContext,
): Result<{ journey: Journey; audit: AuditDraft[]; flagged: string[] }> {
  const inactive = requireActive(journey);
  if (inactive) return inactive as Result<never>;
  const req = findRequirement(journey, id);
  if (!req) return { ok: false, errors: { form: "That requirement no longer exists." } };
  const errors: Record<string, string> = {};
  if (!input.reason.trim()) errors["reason"] = "Describe the delay so staff and the patient understand what changed.";
  else if (input.reason.length > 300) errors["reason"] = "Reason must be 300 characters or fewer.";
  let expected: Date | null = null;
  if (input.expectedDate.trim()) {
    expected = parseLocalDate(input.expectedDate);
    if (!expected) errors["expectedDate"] = "Enter a real calendar date.";
    else if (expected.getTime() < ctx.now.getTime()) errors["expectedDate"] = "The new expected date cannot be in the past.";
  }
  if (hasErrors(errors)) return { ok: false, errors };
  const nowIso = ctx.now.toISOString();
  const updated: Requirement = {
    ...req,
    status: "delayed",
    expectedDate: expected ? expected.toISOString() : null,
    delayReason: input.reason.trim(),
    lastConfirmedAt: null,
    confirmedBy: null,
    updatedAt: nowIso,
  };
  let next = touch(journey, ctx, { requirements: journey.requirements.map((r) => (r.id === id ? updated : r)) });
  const f = flagDependents(next, id, `Waiting on delayed “${req.title}”.`, ctx);
  next = f.journey;
  return {
    ok: true,
    value: {
      journey: next,
      flagged: f.flagged,
      audit: [
        {
          action: "requirement.delayed",
          journeyId: journey.id,
          entityId: id,
          summary: `Marked “${req.title}” delayed${expected ? ` (now expected ${formatDate(expected.toISOString())})` : " with no new date"}: ${input.reason.trim()}`,
          details: { flaggedAppointments: f.flagged.length },
        },
        ...f.audit,
      ],
    },
  };
}

/**
 * Earliest permissible start for an appointment given its direct prerequisites,
 * using any proposed timings for upstream appointments.
 */
function timingConflict(journey: Journey, appt: Appointment, candidateStartIso: string, useProposals = false): string | null {
  const nodes = nodeMap(journey);
  const start = toTime(candidateStartIso);
  for (const depId of appt.dependsOn) {
    const dep = nodes.get(depId);
    if (!dep) continue;
    if (dep.kind === "appointment") {
      if (dep.item.status === "cancelled") continue;
      const depStart = useProposals && dep.item.proposedStart ? dep.item.proposedStart : dep.item.start;
      const end = appointmentEnd({ start: depStart, durationMinutes: dep.item.durationMinutes });
      if (end > start) return `Must start after “${dep.item.title}” ends (${formatDateTime(new Date(end).toISOString())}).`;
    } else {
      const avail = requirementAvailability(dep.item);
      if (avail === Number.POSITIVE_INFINITY) {
        return `“${dep.item.title}” is delayed with no expected date. Record an expected date first.`;
      }
      if (avail !== null && avail > start) {
        return `Must start after “${dep.item.title}” is expected (${formatDate(new Date(avail).toISOString())}).`;
      }
    }
  }
  return null;
}

export function proposeTiming(journey: Journey, id: string, startLocal: string, ctx: OpContext): OpResult {
  const inactive = requireActive(journey);
  if (inactive) return inactive;
  const appt = findAppointment(journey, id);
  if (!appt) return failMsg("That appointment no longer exists.");
  if (appt.status === "cancelled" || appt.status === "completed") return failMsg(`A ${appt.status} appointment cannot be retimed.`);
  const date = parseLocalDateTime(startLocal);
  if (!startLocal.trim()) return fail({ proposedStart: "Choose a proposed date and time." });
  if (!date) return fail({ proposedStart: "Enter a real date and time." });
  if (date.getTime() <= ctx.now.getTime()) return fail({ proposedStart: "The proposed time must be in the future." });
  const iso = date.toISOString();
  const conflict = timingConflict(journey, appt, iso, true);
  if (conflict) return fail({ proposedStart: conflict });
  const keeping = iso === appt.start;
  const updated: Appointment = { ...appt, proposedStart: iso, updatedAt: ctx.now.toISOString() };
  return {
    ok: true,
    value: {
      journey: touch(journey, ctx, { appointments: journey.appointments.map((a) => (a.id === id ? updated : a)) }),
      audit: [
        {
          action: "appointment.timing_proposed",
          journeyId: journey.id,
          entityId: id,
          summary: keeping
            ? `Proposed keeping “${appt.title}” at ${formatDateTime(iso)}.`
            : `Proposed moving “${appt.title}” from ${formatDateTime(appt.start)} to ${formatDateTime(iso)}.`,
        },
      ],
    },
  };
}

export function confirmAppointment(journey: Journey, id: string, ctx: OpContext): OpResult {
  const inactive = requireActive(journey);
  if (inactive) return inactive;
  const appt = findAppointment(journey, id);
  if (!appt) return failMsg("That appointment no longer exists.");
  if (appt.status === "needs_review") return failMsg("This appointment needs review. Propose a timing and confirm the updated plan.");
  if (appt.status === "cancelled" || appt.status === "completed") return failMsg(`A ${appt.status} appointment cannot be confirmed.`);
  if (!appt.ownerId) return failMsg("Assign a responsible owner before confirming.");
  if (toTime(appt.start) <= ctx.now.getTime()) return failMsg("The start time has passed. Reschedule or mark it completed.");
  const conflict = timingConflict(journey, appt, appt.start);
  if (conflict) return failMsg(conflict);
  const nowIso = ctx.now.toISOString();
  const updated: Appointment = { ...appt, status: "confirmed", lastConfirmedAt: nowIso, updatedAt: nowIso };
  return {
    ok: true,
    value: {
      journey: touch(journey, ctx, { appointments: journey.appointments.map((a) => (a.id === id ? updated : a)) }),
      audit: [{ action: "appointment.confirmed", journeyId: journey.id, entityId: id, summary: `Confirmed slot for “${appt.title}”.` }],
    },
  };
}

/**
 * Coordinator confirms the whole updated plan: applies proposed timings, confirms
 * unconfirmed slots and refreshes confirmations. Refuses while anything is invalid.
 */
export function confirmPlan(journey: Journey, ctx: OpContext): OpResult {
  const inactive = requireActive(journey);
  if (inactive) return inactive;
  const errors: string[] = [];
  const cycle = findCycle(journey);
  if (cycle) errors["push"]("The plan contains a circular dependency.");
  if (!journey.coordinatorId) errors["push"]("Assign a responsible coordinator.");
  const active = journey.appointments.filter((a) => a.status !== "cancelled" && a.status !== "completed");
  if (active.length === 0) errors["push"]("Add at least one upcoming appointment.");
  for (const a of active) {
    if (!a.ownerId) errors["push"](`“${a.title}” has no responsible owner.`);
    if (a.status === "needs_review" && !a.proposedStart) errors["push"](`“${a.title}” needs review — propose a new time or keep the current time.`);
    const effective = a.proposedStart ?? a.start;
    if (toTime(effective) <= ctx.now.getTime()) errors["push"](`“${a.title}” is in the past — propose a new time.`);
  }
  for (const r of journey.requirements) if (!r.ownerId) errors["push"](`“${r.title}” has no responsible owner.`);
  if (!cycle) {
    for (const a of active) {
      const conflict = timingConflict(journey, a, a.proposedStart ?? a.start, true);
      if (conflict) errors["push"](`“${a.title}”: ${conflict}`);
    }
  }
  if (errors["length"]) return fail({ form: errors["join"](" ") });

  const nowIso = ctx.now.toISOString();
  const audit: AuditDraft[] = [];
  const appointments = journey.appointments.map((a) => {
    if (a.status === "cancelled" || a.status === "completed") return a;
    if (a.proposedStart && a.proposedStart !== a.start) {
      audit.push({
        action: "appointment.rescheduled",
        journeyId: journey.id,
        entityId: a.id,
        summary: `“${a.title}” moved from ${formatDateTime(a.start)} to ${formatDateTime(a.proposedStart)}.`,
      });
    }
    return {
      ...a,
      start: a.proposedStart ?? a.start,
      proposedStart: null,
      status: "confirmed" as const,
      reviewReason: null,
      lastConfirmedAt: nowIso,
      updatedAt: nowIso,
    };
  });
  const version = journey.planVersion + 1;
  audit.unshift({
    action: "plan.confirmed",
    journeyId: journey.id,
    entityId: journey.id,
    summary: `Confirmed plan version ${version} (${active.length} appointment${active.length === 1 ? "" : "s"}).`,
    details: { planVersion: version },
  });
  // Re-touch so confirmation timestamps are not older than updatedAt.
  const next: Journey = { ...journey, appointments, planVersion: version, planConfirmedAt: nowIso, updatedAt: nowIso };
  return { ok: true, value: { journey: next, audit } };
}

export function rescheduleAppointment(
  journey: Journey,
  id: string,
  input: { start: string; reason: string },
  ctx: OpContext,
): OpResult {
  const inactive = requireActive(journey);
  if (inactive) return inactive;
  const appt = findAppointment(journey, id);
  if (!appt) return failMsg("That appointment no longer exists.");
  if (appt.status === "cancelled" || appt.status === "completed") return failMsg(`A ${appt.status} appointment cannot be rescheduled.`);
  const errors: Record<string, string> = {};
  const date = parseLocalDateTime(input.start);
  if (!input.start.trim()) errors["start"] = "Choose a new date and time.";
  else if (!date) errors["start"] = "Enter a real date and time.";
  else if (date.getTime() <= ctx.now.getTime()) errors["start"] = "The new time must be in the future.";
  if (!input.reason.trim()) errors["reason"] = "Give a reason for the change (kept in the audit history).";
  if (hasErrors(errors)) return fail(errors);
  const iso = date!.toISOString();
  const conflict = timingConflict(journey, appt, iso);
  if (conflict) return fail({ start: conflict });
  const nowIso = ctx.now.toISOString();
  const updated: Appointment = {
    ...appt,
    start: iso,
    status: "scheduled",
    lastConfirmedAt: null,
    proposedStart: null,
    reviewReason: null,
    updatedAt: nowIso,
  };
  let next = touch(journey, ctx, { appointments: journey.appointments.map((a) => (a.id === id ? updated : a)) });
  const f = flagDependents(next, id, `Upstream appointment “${appt.title}” was rescheduled.`, ctx);
  next = f.journey;
  return {
    ok: true,
    value: {
      journey: next,
      audit: [
        {
          action: "appointment.rescheduled",
          journeyId: journey.id,
          entityId: id,
          summary: `Rescheduled “${appt.title}” from ${formatDateTime(appt.start)} to ${formatDateTime(iso)}: ${input.reason.trim()}`,
        },
        ...f.audit,
      ],
    },
  };
}

export function cancelAppointment(journey: Journey, id: string, reason: string, ctx: OpContext): OpResult {
  const inactive = requireActive(journey);
  if (inactive) return inactive;
  const appt = findAppointment(journey, id);
  if (!appt) return failMsg("That appointment no longer exists.");
  if (appt.status === "cancelled") return failMsg("This appointment is already cancelled.");
  if (appt.status === "completed") return failMsg("A completed appointment cannot be cancelled.");
  if (!reason.trim()) return fail({ reason: "Give a reason for cancelling (kept in the audit history)." });
  const nowIso = ctx.now.toISOString();
  const updated: Appointment = { ...appt, status: "cancelled", proposedStart: null, reviewReason: reason.trim(), updatedAt: nowIso };
  let next = touch(journey, ctx, { appointments: journey.appointments.map((a) => (a.id === id ? updated : a)) });
  const f = flagDependents(next, id, `Upstream appointment “${appt.title}” was cancelled.`, ctx);
  next = f.journey;
  return {
    ok: true,
    value: {
      journey: next,
      audit: [
        { action: "appointment.cancelled", journeyId: journey.id, entityId: id, summary: `Cancelled “${appt.title}”: ${reason.trim()}` },
        ...f.audit,
      ],
    },
  };
}

export function completeAppointment(journey: Journey, id: string, ctx: OpContext): OpResult {
  const inactive = requireActive(journey);
  if (inactive) return inactive;
  const appt = findAppointment(journey, id);
  if (!appt) return failMsg("That appointment no longer exists.");
  if (appt.status === "cancelled" || appt.status === "completed") return failMsg(`This appointment is already ${appt.status}.`);
  if (toTime(appt.start) > ctx.now.getTime()) return failMsg("A future appointment cannot be marked as attended.");
  const updated: Appointment = { ...appt, status: "completed", proposedStart: null, updatedAt: ctx.now.toISOString() };
  return {
    ok: true,
    value: {
      journey: touch(journey, ctx, { appointments: journey.appointments.map((a) => (a.id === id ? updated : a)) }),
      audit: [{ action: "appointment.completed", journeyId: journey.id, entityId: id, summary: `Marked “${appt.title}” as attended.` }],
    },
  };
}

export function cancelJourney(journey: Journey, reason: string, ctx: OpContext): OpResult {
  const inactive = requireActive(journey);
  if (inactive) return inactive;
  if (!reason.trim()) return fail({ reason: "Give a reason for closing this journey." });
  return {
    ok: true,
    value: {
      journey: touch(journey, ctx, { status: "cancelled" }),
      audit: [{ action: "journey.cancelled", journeyId: journey.id, entityId: journey.id, summary: `Closed journey: ${reason.trim()}` }],
    },
  };
}


