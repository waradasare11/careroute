import { appointmentEnd, MS_PER_DAY, toTime } from "./dates";
import { formatDate, formatDateTime } from "./format";
import { findCycle, nodeMap, type GraphNode } from "./graph";
import type { Appointment, Issue, Journey, NodeState, Requirement } from "./types";

/** A staff confirmation of an appointment slot is treated as stale after this many days. */
export const APPOINTMENT_CONFIRMATION_VALID_DAYS = 14;

const CHANGE_TOLERANCE_MS = 1000;

export interface NodeAssessment {
  id: string;
  kind: GraphNode["kind"];
  title: string;
  state: NodeState;
  issues: Issue[];
}

const isActiveAppointment = (a: Appointment) => a.status !== "cancelled" && a.status !== "completed";

export function isRequirementSatisfied(r: Requirement, now: Date): boolean {
  return requirementOwnIssues(r, now).length === 0 && (r.status === "confirmed" || r.status === "waived");
}

/** When a not-yet-satisfied requirement is expected to be available. */
export function requirementAvailability(r: Requirement): number | null {
  if (r.status === "confirmed" || r.status === "waived") return null;
  if (r.status === "delayed") return r.expectedDate ? toTime(r.expectedDate) : Number.POSITIVE_INFINITY;
  return toTime(r.dueDate);
}

export function requirementOwnIssues(r: Requirement, now: Date): Issue[] {
  const issues: Issue[] = [];
  const t = now.getTime();
  if (!r.ownerId) issues.push({ code: "missing_owner", severity: "attention", message: "No responsible owner assigned." });
  if (r.status === "waived") return issues;

  if (r.status === "delayed") {
    if (!r.expectedDate) {
      issues.push({ code: "delayed_no_date", severity: "attention", message: "Delayed with no new expected date." });
    } else if (toTime(r.expectedDate) < t) {
      issues.push({
        code: "delayed_overdue",
        severity: "attention",
        message: `Delayed and the revised date (${formatDate(r.expectedDate)}) has passed.`,
      });
    } else {
      issues.push({
        code: "delayed_expected",
        severity: "waiting",
        message: `Delayed — now expected ${formatDate(r.expectedDate)}.`,
      });
    }
    return issues;
  }

  if (r.status === "confirmed") {
    if (!r.lastConfirmedAt) {
      issues.push({ code: "stale_confirmation", severity: "attention", message: "Marked confirmed without a confirmation time." });
      return issues;
    }
    const confirmedAt = toTime(r.lastConfirmedAt);
    if (r.validityDays !== null && t - confirmedAt > r.validityDays * MS_PER_DAY) {
      issues.push({
        code: "stale_confirmation",
        severity: "attention",
        message: `Confirmation is older than ${r.validityDays} days — reconfirm it is still current.`,
      });
    }
    if (toTime(r.updatedAt) - confirmedAt > CHANGE_TOLERANCE_MS) {
      issues.push({
        code: "changed_since_confirmation",
        severity: "attention",
        message: "Details changed after it was confirmed — reconfirm.",
      });
    }
    return issues;
  }

  if (toTime(r.dueDate) < t) {
    issues.push({ code: "overdue", severity: "attention", message: `Was due ${formatDate(r.dueDate)} and is not confirmed.` });
  } else if (r.status === "received") {
    issues.push({ code: "not_confirmed", severity: "waiting", message: "Received — awaiting staff confirmation." });
  } else {
    issues.push({ code: "awaiting_receipt", severity: "waiting", message: `Expected by ${formatDate(r.dueDate)}.` });
  }
  return issues;
}

export function appointmentOwnIssues(a: Appointment, now: Date): Issue[] {
  if (!isActiveAppointment(a)) return [];
  const issues: Issue[] = [];
  const t = now.getTime();
  if (!a.ownerId) issues.push({ code: "missing_owner", severity: "attention", message: "No responsible owner assigned." });
  if (a.status === "needs_review") {
    issues.push({
      code: "needs_review",
      severity: "attention",
      message: a.reviewReason ?? "Needs coordinator review.",
    });
  }
  if (toTime(a.start) < t) {
    issues.push({ code: "in_past", severity: "attention", message: "Start time has passed but it is not marked completed." });
  }
  if (a.status === "scheduled") {
    issues.push({ code: "not_confirmed", severity: "waiting", message: "Slot not yet confirmed by staff." });
  }
  if (a.status === "confirmed") {
    if (!a.lastConfirmedAt) {
      issues.push({ code: "stale_confirmation", severity: "attention", message: "Marked confirmed without a confirmation time." });
    } else {
      const confirmedAt = toTime(a.lastConfirmedAt);
      if (t - confirmedAt > APPOINTMENT_CONFIRMATION_VALID_DAYS * MS_PER_DAY) {
        issues.push({
          code: "stale_confirmation",
          severity: "attention",
          message: `Slot last confirmed more than ${APPOINTMENT_CONFIRMATION_VALID_DAYS} days ago — reconfirm.`,
        });
      }
      if (toTime(a.updatedAt) - confirmedAt > CHANGE_TOLERANCE_MS) {
        issues.push({
          code: "changed_since_confirmation",
          severity: "attention",
          message: "Changed after it was confirmed — reconfirm.",
        });
      }
    }
  }
  return issues;
}

function stateFrom(issues: Issue[]): NodeState {
  if (issues.some((i) => i.severity === "attention")) return "attention";
  if (issues.some((i) => i.severity === "waiting")) return "waiting";
  return "ready";
}

/** Assess every appointment and requirement, propagating blockage through the dependency graph. */
export function assessJourney(journey: Journey, now: Date): Map<string, NodeAssessment> {
  const nodes = nodeMap(journey);
  const result = new Map<string, NodeAssessment>();
  const cycle = findCycle(journey);
  const inCycle = new Set(cycle ?? []);

  const assess = (id: string): NodeAssessment => {
    const cached = result.get(id);
    if (cached) return cached;
    const node = nodes.get(id)!;
    const title = node.item.title;

    if (inCycle.has(id)) {
      const a: NodeAssessment = {
        id, kind: node.kind, title, state: "attention",
        issues: [{ code: "cycle", severity: "attention", message: "Part of a circular dependency.", relatedIds: cycle! }],
      };
      result.set(id, a);
      return a;
    }

    if (node.kind === "appointment") {
      const appt = node.item;
      if (appt.status === "cancelled" || appt.status === "completed") {
        const a: NodeAssessment = { id, kind: node.kind, title, state: appt.status, issues: [] };
        result.set(id, a);
        return a;
      }
      const issues = appointmentOwnIssues(appt, now);
      const start = toTime(appt.start);
      for (const depId of appt.dependsOn) {
        const dep = nodes.get(depId);
        if (!dep) continue;
        const depA = assess(depId);
        pushDependencyIssue(issues, depA);
        if (dep.kind === "appointment" && dep.item.status !== "cancelled" && appointmentEnd(dep.item) > start) {
          issues.push({
            code: "timing_conflict",
            severity: "attention",
            message: `Starts before “${dep.item.title}” finishes (${formatDateTime(new Date(appointmentEnd(dep.item)).toISOString())}).`,
            relatedIds: [depId],
          });
        }
        if (dep.kind === "requirement") {
          const avail = requirementAvailability(dep.item);
          if (avail !== null && Number.isFinite(avail) && avail > start) {
            issues.push({
              code: "timing_conflict",
              severity: "attention",
              message: `“${dep.item.title}” is expected ${formatDate(new Date(avail).toISOString())}, after this appointment starts.`,
              relatedIds: [depId],
            });
          }
        }
      }
      const a: NodeAssessment = { id, kind: node.kind, title, state: stateFrom(issues), issues };
      result.set(id, a);
      return a;
    }

    const req = node.item;
    const issues = requirementOwnIssues(req, now);
    const satisfied = req.status === "waived" || (req.status === "confirmed" && issues.length === 0);
    if (!satisfied) {
      for (const depId of req.dependsOn) {
        const dep = nodes.get(depId);
        if (!dep) continue;
        pushDependencyIssue(issues, assess(depId));
        if (dep.kind === "appointment" && dep.item.status !== "cancelled") {
          const due = req.status === "delayed" && req.expectedDate ? req.expectedDate : req.dueDate;
          if (appointmentEnd(dep.item) > toTime(due)) {
            issues.push({
              code: "timing_conflict",
              severity: "attention",
              message: `Due ${formatDate(due)}, before “${dep.item.title}” takes place.`,
              relatedIds: [depId],
            });
          }
        }
      }
    }
    const a: NodeAssessment = { id, kind: node.kind, title, state: stateFrom(issues), issues };
    result.set(id, a);
    return a;
  };

  for (const id of nodes.keys()) assess(id);
  return result;
}

function pushDependencyIssue(issues: Issue[], dep: NodeAssessment) {
  if (dep.state === "cancelled") {
    issues.push({
      code: "depends_on_cancelled",
      severity: "attention",
      message: `Depends on “${dep.title}”, which was cancelled.`,
      relatedIds: [dep.id],
    });
  } else if (dep.state === "attention") {
    issues.push({ code: "blocked_by", severity: "attention", message: `Blocked by “${dep.title}”.`, relatedIds: [dep.id] });
  } else if (dep.state === "waiting") {
    issues.push({ code: "waiting_on", severity: "waiting", message: `Waiting on “${dep.title}”.`, relatedIds: [dep.id] });
  }
}

export interface JourneyReadiness {
  administrativelyReady: boolean;
  state: "ready" | "waiting" | "attention" | "cancelled" | "completed" | "empty";
  reasons: string[];
  counts: { ready: number; waiting: number; attention: number };
  assessments: Map<string, NodeAssessment>;
  missingSteps: NodeAssessment[];
  planNeedsConfirmation: boolean;
  cycle: string[] | null;
}

export function planNeedsConfirmation(journey: Journey): boolean {
  if (!journey.planConfirmedAt) return true;
  return journey.appointments.some(
    (a) => a.status === "needs_review" || a.status === "scheduled" || a.proposedStart !== null,
  );
}

/**
 * A journey is administratively ready only when every active appointment and every
 * requirement is confirmed, current, owned and free of timing conflicts, and the
 * coordinator has confirmed the current plan. This is never a clinical judgement.
 */
export function journeyReadiness(journey: Journey, now: Date): JourneyReadiness {
  const assessments = assessJourney(journey, now);
  const cycle = findCycle(journey);
  const counts = { ready: 0, waiting: 0, attention: 0 };
  const missingSteps: NodeAssessment[] = [];
  for (const a of assessments.values()) {
    if (a.state === "ready" || a.state === "completed") counts.ready++;
    else if (a.state === "waiting") counts.waiting++;
    else if (a.state === "attention") counts.attention++;
    if (a.state === "waiting" || a.state === "attention") missingSteps.push(a);
  }
  const needsConfirm = planNeedsConfirmation(journey);
  const reasons: string[] = [];
  let state: JourneyReadiness["state"];

  if (journey.status === "cancelled") state = "cancelled";
  else if (journey.status === "completed") state = "completed";
  else if (!journey.appointments.some(isActiveAppointment)) {
    state = "empty";
    reasons.push("No upcoming appointments in this plan.");
  } else if (counts.attention > 0) state = "attention";
  else if (counts.waiting > 0 || needsConfirm) state = "waiting";
  else state = "ready";

  if (cycle) reasons.push("The plan contains a circular dependency.");
  if (counts.attention > 0) reasons.push(`${counts.attention} step(s) need attention.`);
  if (counts.waiting > 0) reasons.push(`${counts.waiting} step(s) still waiting.`);
  if (needsConfirm && journey.status === "active") reasons.push("The current plan has not been confirmed by a coordinator.");

  return {
    administrativelyReady: state === "ready",
    state,
    reasons,
    counts,
    assessments,
    missingSteps,
    planNeedsConfirmation: needsConfirm,
    cycle,
  };
}

