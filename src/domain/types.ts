/**
 * CareRoute domain model. All records here are administrative coordination data:
 * they describe *when* and *what paperwork* a planned hospital visit needs, never
 * clinical decisions. Clinical decisions remain with hospital staff.
 */

export type ISODateString = string;

export type RequirementKind = "report" | "test_result" | "document" | "referral" | "consent_form";

export type RequirementStatus =
  | "pending" // not yet requested or produced
  | "requested" // requested from the owner
  | "received" // arrived, awaiting staff confirmation
  | "confirmed" // staff confirmed it is present and current
  | "delayed" // owner reported a delay
  | "waived"; // staff confirmed it is not needed for this plan

export type AppointmentStatus =
  | "scheduled" // booked, not yet confirmed by staff
  | "confirmed" // staff confirmed the slot
  | "needs_review" // flagged because something upstream changed
  | "cancelled"
  | "completed";

export interface Contact {
  id: string;
  name: string;
  role: string;
  organisation: string;
  /** Fictional extension / desk reference only — never a real phone number. */
  reachVia: string;
}

export interface Requirement {
  id: string;
  kind: RequirementKind;
  title: string;
  ownerId: string | null;
  dueDate: ISODateString;
  status: RequirementStatus;
  lastConfirmedAt: ISODateString | null;
  confirmedBy: string | null;
  /** How many days a confirmation stays current. null = does not expire. */
  validityDays: number | null;
  /** When a delayed item is now expected. */
  expectedDate: ISODateString | null;
  delayReason: string | null;
  /** Ids of appointments that produce this requirement (e.g. a scan produces a report). */
  dependsOn: string[];
  notes: string;
  updatedAt: ISODateString;
}

export interface Appointment {
  id: string;
  title: string;
  department: string;
  location: string;
  start: ISODateString;
  durationMinutes: number;
  ownerId: string | null;
  status: AppointmentStatus;
  /** Ids of requirements or appointments that must be in place first. */
  dependsOn: string[];
  lastConfirmedAt: ISODateString | null;
  proposedStart: ISODateString | null;
  reviewReason: string | null;
  preparation: string;
  updatedAt: ISODateString;
}

export type JourneyStatus = "active" | "cancelled" | "completed";

export interface Journey {
  id: string;
  reference: string;
  patientId: string;
  patientName: string;
  specialty: string;
  summary: string;
  coordinatorId: string | null;
  status: JourneyStatus;
  appointments: Appointment[];
  requirements: Requirement[];
  planVersion: number;
  planConfirmedAt: ISODateString | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface DemoPatient {
  id: string;
  name: string;
  preferredLanguage: "en" | "hi";
}

export type AuditAction =
  | "journey.created"
  | "journey.updated"
  | "journey.cancelled"
  | "appointment.added"
  | "appointment.updated"
  | "appointment.confirmed"
  | "appointment.rescheduled"
  | "appointment.cancelled"
  | "appointment.completed"
  | "appointment.flagged"
  | "appointment.timing_proposed"
  | "requirement.added"
  | "requirement.updated"
  | "requirement.status_changed"
  | "requirement.confirmed"
  | "requirement.delayed"
  | "plan.confirmed"
  | "notification.not_sent"
  | "demo.reset";

export interface AuditDraft {
  action: AuditAction;
  journeyId: string | null;
  entityId: string | null;
  summary: string;
  details?: Record<string, unknown>;
}

export interface AuditEntry extends AuditDraft {
  id: string;
  at: ISODateString;
  actor: string;
  actorRole: "coordinator" | "patient" | "system";
}

export type NodeKind = "appointment" | "requirement";

export type NodeState = "ready" | "waiting" | "attention" | "cancelled" | "completed";

export type IssueCode =
  | "missing_owner"
  | "not_confirmed"
  | "awaiting_receipt"
  | "delayed_no_date"
  | "delayed_overdue"
  | "delayed_expected"
  | "overdue"
  | "stale_confirmation"
  | "changed_since_confirmation"
  | "needs_review"
  | "in_past"
  | "timing_conflict"
  | "depends_on_cancelled"
  | "blocked_by"
  | "waiting_on"
  | "cycle";

export interface Issue {
  code: IssueCode;
  severity: "attention" | "waiting" | "info";
  message: string;
  relatedIds?: string[];
}

export type Result<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

