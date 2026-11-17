import type { OpContext } from "../operations";
import type { Appointment, Journey, Requirement } from "../types";

export const NOW = new Date(2026, 10, 15, 10, 0, 0); // 15 Nov 2026, 10:00 local
export const day = (d: number, h = 9, m = 0) => {
  const x = new Date(NOW);
  x.setDate(x.getDate() + d);
  x.setHours(h, m, 0, 0);
  return x.toISOString();
};
export const localInput = (d: number, h = 9, m = 0) => {
  const x = new Date(day(d, h, m));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}T${p(h)}:${p(m)}`;
};
export const localDate = (d: number) => localInput(d).slice(0, 10);
export const past = (days: number) => new Date(NOW.getTime() - days * 86_400_000).toISOString();

export const ctx: OpContext = {
  now: NOW,
  actor: "Test coordinator",
  contactIds: new Set(["c1", "c2"]),
  patients: [{ id: "p1", name: "Test Patient", preferredLanguage: "en" }],
};

export function appt(id: string, overrides: Partial<Appointment> = {}): Appointment {
  return {
    id, title: id, department: "Dept", location: "Room 1", start: day(5), durationMinutes: 30, ownerId: "c1",
    status: "confirmed", dependsOn: [], lastConfirmedAt: past(1), proposedStart: null, reviewReason: null,
    preparation: "", updatedAt: past(1), ...overrides,
  };
}

export function req(id: string, overrides: Partial<Requirement> = {}): Requirement {
  return {
    id, kind: "report", title: id, ownerId: "c1", dueDate: day(2, 17), status: "confirmed", lastConfirmedAt: past(1),
    confirmedBy: "x", validityDays: 30, expectedDate: null, delayReason: null, dependsOn: [], notes: "", updatedAt: past(1),
    ...overrides,
  };
}

export function journey(appointments: Appointment[], requirements: Requirement[], overrides: Partial<Journey> = {}): Journey {
  return {
    id: "j1", reference: "CR-1", patientId: "p1", patientName: "Test Patient", specialty: "Cardiology", summary: "",
    coordinatorId: "c1", status: "active", appointments, requirements, planVersion: 1, planConfirmedAt: past(1),
    createdAt: past(5), updatedAt: past(1), ...overrides,
  };
}

/** scan -> report -> consult, plus bloods -> results -> consult -> follow-up */
export function chainJourney(): Journey {
  return journey(
    [
      appt("scan", { start: day(2, 9) }),
      appt("consult", { start: day(8, 11), dependsOn: ["report", "results"] }),
      appt("followup", { start: day(15, 11), dependsOn: ["consult"] }),
      appt("bloods", { start: day(1, 9) }),
    ],
    [
      req("report", { status: "pending", lastConfirmedAt: null, dueDate: day(5, 17), dependsOn: ["scan"] }),
      req("results", { status: "pending", lastConfirmedAt: null, dueDate: day(3, 17), dependsOn: ["bloods"] }),
    ],
  );
}

