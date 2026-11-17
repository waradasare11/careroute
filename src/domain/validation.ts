import { parseLocalDate, parseLocalDateTime } from "./dates";
import { nodeMap, nodeTitle, wouldCreateCycle } from "./graph";
import type { Journey, RequirementKind } from "./types";

export const MAX_APPOINTMENT_MINUTES = 12 * 60;
export const MAX_VALIDITY_DAYS = 3650;

export interface ValidationContext {
  now: Date;
  contactIds: Set<string>;
}

export interface JourneyInput {
  patientId: string;
  specialty: string;
  summary: string;
  coordinatorId: string;
}

export interface AppointmentInput {
  title: string;
  department: string;
  location: string;
  /** `datetime-local` value: YYYY-MM-DDTHH:mm */
  start: string;
  durationMinutes: string | number;
  ownerId: string;
  dependsOn: string[];
  preparation: string;
}

export interface RequirementInput {
  kind: RequirementKind;
  title: string;
  ownerId: string;
  /** `date` value: YYYY-MM-DD */
  dueDate: string;
  validityDays: string | number | null;
  dependsOn: string[];
  notes: string;
}

export const REQUIREMENT_KINDS: RequirementKind[] = ["report", "test_result", "document", "referral", "consent_form"];

type Errors = Record<string, string>;

function requireText(errors: Errors, key: string, value: string, label: string, max = 160) {
  const v = value.trim();
  if (!v) errors[key] = `${label} is required.`;
  else if (v.length > max) errors[key] = `${label} must be ${max} characters or fewer.`;
}

function requireOwner(errors: Errors, key: string, ownerId: string, ctx: ValidationContext) {
  if (!ownerId) errors[key] = "Choose who is responsible for this step.";
  else if (!ctx.contactIds.has(ownerId)) errors[key] = "The selected owner no longer exists. Choose another.";
}

export function parseWholeNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
  const t = value.trim();
  if (t === "") return null;
  if (!/^-?\d+(\.\d+)?$/.test(t)) return NaN;
  return Number(t);
}

export function validateJourneyInput(input: JourneyInput, patientIds: Set<string>, ctx: ValidationContext): Errors {
  const errors: Errors = {};
  if (!input.patientId) errors["patientId"] = "Choose a patient.";
  else if (!patientIds.has(input.patientId)) errors["patientId"] = "That patient does not exist.";
  requireText(errors, "specialty", input.specialty, "Service / specialty", 80);
  if (input.summary.length > 500) errors["summary"] = "Summary must be 500 characters or fewer.";
  if (!input.coordinatorId) errors["coordinatorId"] = "Assign a responsible coordinator.";
  else if (!ctx.contactIds.has(input.coordinatorId)) errors["coordinatorId"] = "The selected coordinator no longer exists.";
  return errors;
}

function validateDependencies(errors: Errors, journey: Journey, nodeId: string, dependsOn: string[]) {
  const nodes = nodeMap(journey);
  if (dependsOn.includes(nodeId)) {
    errors["dependsOn"] = "A step cannot depend on itself.";
    return;
  }
  const unknown = dependsOn.filter((d) => !nodes.has(d));
  if (unknown.length) {
    errors["dependsOn"] = "One or more selected prerequisites no longer exist.";
    return;
  }
  const cycle = wouldCreateCycle(journey, nodeId, dependsOn);
  if (cycle) {
    const titles = cycle.map((id) => (id === nodeId && !nodes.has(id) ? "this step" : nodeTitle(journey, id)));
    errors["dependsOn"] = `This would create a loop: ${titles.join(" → ")}. Remove one of the prerequisites.`;
  }
}

export function validateAppointmentInput(
  journey: Journey,
  nodeId: string,
  input: AppointmentInput,
  ctx: ValidationContext,
  opts: { requireFuture: boolean },
): Errors {
  const errors: Errors = {};
  requireText(errors, "title", input.title, "Appointment name", 120);
  requireText(errors, "department", input.department, "Department", 80);
  if (input.location.length > 160) errors["location"] = "Location must be 160 characters or fewer.";
  const start = parseLocalDateTime(input.start);
  if (!input.start.trim()) errors["start"] = "Start date and time is required.";
  else if (!start) errors["start"] = "Enter a real date and time (for example, 31 February is not valid).";
  else if (opts.requireFuture && start.getTime() <= ctx.now.getTime()) errors["start"] = "Start time must be in the future.";

  const duration = parseWholeNumber(input.durationMinutes);
  if (duration === null) errors["durationMinutes"] = "Duration is required.";
  else if (Number.isNaN(duration)) errors["durationMinutes"] = "Duration must be a number of minutes.";
  else if (duration <= 0) errors["durationMinutes"] = "Duration must be more than 0 minutes — negative or zero times are not allowed.";
  else if (!Number.isInteger(duration)) errors["durationMinutes"] = "Duration must be a whole number of minutes.";
  else if (duration > MAX_APPOINTMENT_MINUTES) errors["durationMinutes"] = `Duration cannot exceed ${MAX_APPOINTMENT_MINUTES} minutes.`;

  requireOwner(errors, "ownerId", input.ownerId, ctx);
  if (input.preparation.length > 600) errors["preparation"] = "Preparation notes must be 600 characters or fewer.";
  validateDependencies(errors, journey, nodeId, input.dependsOn);
  return errors;
}

export function validateRequirementInput(
  journey: Journey,
  nodeId: string,
  input: RequirementInput,
  ctx: ValidationContext,
): Errors {
  const errors: Errors = {};
  if (!REQUIREMENT_KINDS.includes(input.kind)) errors["kind"] = "Choose a requirement type.";
  requireText(errors, "title", input.title, "Requirement name", 120);
  requireOwner(errors, "ownerId", input.ownerId, ctx);
  if (!input.dueDate.trim()) errors["dueDate"] = "Due date is required.";
  else if (!parseLocalDate(input.dueDate)) errors["dueDate"] = "Enter a real calendar date.";
  const validity = parseWholeNumber(input.validityDays);
  if (validity !== null) {
    if (Number.isNaN(validity)) errors["validityDays"] = "Validity must be a number of days.";
    else if (validity <= 0) errors["validityDays"] = "Validity must be a positive number of days.";
    else if (!Number.isInteger(validity)) errors["validityDays"] = "Validity must be a whole number of days.";
    else if (validity > MAX_VALIDITY_DAYS) errors["validityDays"] = `Validity cannot exceed ${MAX_VALIDITY_DAYS} days.`;
  }
  if (input.notes.length > 600) errors["notes"] = "Notes must be 600 characters or fewer.";
  const nodes = nodeMap(journey);
  if (input.dependsOn.some((d) => nodes.get(d)?.kind === "requirement")) {
    errors["dependsOn"] = "A requirement can only be produced by an appointment.";
  } else {
    validateDependencies(errors, journey, nodeId, input.dependsOn);
  }
  return errors;
}


