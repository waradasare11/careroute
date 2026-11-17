import {EXTRAS_KEY,scopedExtras} from '../features/clinical';
import { useSyncExternalStore } from "react";

import { newId } from "@/domain/ids";
import * as ops from "@/domain/operations";
import type { AuditDraft, AuditEntry, Journey, Result } from "@/domain/types";
import type { AppointmentInput, JourneyInput, RequirementInput } from "@/domain/validation";

import { createSeed, DEMO_COORDINATOR_ID, DEMO_SCHEMA_VERSION, type DemoData } from "./seed";

export const DATA_KEY = "careroute.demo.data.v1";
export const PREFS_KEY = "careroute.demo.prefs.v1";
export const DELETED_KEY = "careroute.demo.deleted.v1";

export type Lang = "en" | "hi";

export interface DemoPrefs {
  role: "coordinator" | "patient";
  patientId: string;
  lang: Lang;
}

export type DemoSnapshot =
  | { status: "loading" }
  | { status: "ready"; data: DemoData; prefs: DemoPrefs }
  | { status: "deleted"; prefs: DemoPrefs }
  | { status: "error"; message: string; prefs: DemoPrefs };

const DEFAULT_PREFS: DemoPrefs = { role: "coordinator", patientId: "p_asha", lang: "en" };
const LOADING: DemoSnapshot = { status: "loading" };

let clock: () => Date = () => new Date();
/** Test hook: control "now" for deterministic behaviour. */
export function setDemoClock(fn: () => Date) {
  clock = fn;
}
export function demoNow(): Date {
  return clock();
}

let snapshot: DemoSnapshot | null = null;
const listeners = new Set<() => void>();

function storage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

function readPrefs(): DemoPrefs {
  try {
    const raw = storage()?.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const p = JSON.parse(raw) as Partial<DemoPrefs>;
    return {
      role: p.role === "patient" ? "patient" : "coordinator",
      patientId: typeof p.patientId === "string" ? p.patientId : DEFAULT_PREFS.patientId,
      lang: p.lang === "hi" ? "hi" : "en",
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

function isDemoData(value: unknown): value is DemoData {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<DemoData>;
  return (
    v.schemaVersion === DEMO_SCHEMA_VERSION &&
    Array.isArray(v.journeys) &&
    Array.isArray(v.contacts) &&
    Array.isArray(v.patients) &&
    Array.isArray(v.audit) &&
    v.contacts.every(c => !!c && typeof c.id === 'string' && typeof c.name === 'string' && typeof c.reachVia === 'string') &&
    v.patients.every(p => !!p && typeof p.id === 'string' && typeof p.name === 'string') &&
    v.audit.every(a => !!a && typeof a.id === 'string' && typeof a.summary === 'string' && typeof a.actor === 'string' && Number.isFinite(Date.parse(a.at))) &&
    v.journeys.every(j => !!j && typeof j.id === 'string' && typeof j.patientName === 'string' && typeof j.patientId === 'string' && typeof j.reference === 'string' && typeof j.specialty === 'string' && typeof j.summary === 'string' && ['active','completed','cancelled'].includes(j.status) &&
      Array.isArray(j.appointments) && Array.isArray(j.requirements) &&
      j.appointments.every(a => !!a && typeof a.id === 'string' && typeof a.title === 'string' && Number.isFinite(Date.parse(a.start)) && Number.isFinite(a.durationMinutes) && a.durationMinutes > 0 && Array.isArray(a.dependsOn) && a.dependsOn.every(id => typeof id === 'string') && ['scheduled','confirmed','needs_review','cancelled','completed'].includes(a.status)) &&
      j.requirements.every(r => !!r && typeof r.id === 'string' && typeof r.title === 'string' && Number.isFinite(Date.parse(r.dueDate)) && Array.isArray(r.dependsOn) && r.dependsOn.every(id => typeof id === 'string') && ['pending','requested','received','confirmed','delayed','waived'].includes(r.status)))
  );
}

function load(): DemoSnapshot {
  const s = storage();
  const prefs = readPrefs();
  if (!s) return { status: "error", message: "This browser does not allow local storage, so the demo cannot keep data.", prefs };
  if (s.getItem(DELETED_KEY) === "1") return { status: "deleted", prefs };
  const raw = s.getItem(DATA_KEY);
  if (!raw) {
    const data = createSeed(clock());
    try {
      s.setItem(DATA_KEY, JSON.stringify(data));
    } catch {
      return { status: "error", message: "Could not save demo data in this browser (storage may be full or blocked).", prefs };
    }
    return { status: "ready", data, prefs };
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isDemoData(parsed)) {
      return { status: "error", message: "Saved demo data is from an older version or is damaged. Reset the demo to continue.", prefs };
    }
    return { status: "ready", data: parsed, prefs };
  } catch {
    return { status: "error", message: "Saved demo data could not be read. Reset the demo to continue.", prefs };
  }
}

function emit() {
  for (const l of listeners) l();
}

export function getSnapshot(): DemoSnapshot {
  if (!snapshot) snapshot = load();
  return snapshot;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === DATA_KEY || e.key === PREFS_KEY || e.key === DELETED_KEY) {
      snapshot = load();
      emit();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useDemo(): DemoSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, () => LOADING);
}

/** Test hook: drop the in-memory snapshot so the next read re-loads from storage. */
export function reloadDemoFromStorage() {
  snapshot = null;
  emit();
}

function currentPrefs(): DemoPrefs {
  const s = getSnapshot();
  return s.status === "loading" ? DEFAULT_PREFS : s.prefs;
}

export function setPrefs(patch: Partial<DemoPrefs>): Result<DemoPrefs> {
  const next = { ...currentPrefs(), ...patch };
  try {
    storage()?.setItem(PREFS_KEY, JSON.stringify(next));
  } catch {
    return { ok: false, errors: { form: "Could not save your preference in this browser." } };
  }
  const s = getSnapshot();
  snapshot = s.status === "loading" ? load() : ({ ...s, prefs: next } as DemoSnapshot);
  emit();
  return { ok: true, value: next };
}

function readyData(): DemoData | null {
  const s = getSnapshot();
  return s.status === "ready" ? s.data : null;
}

function actorName(data: DemoData): string {
  const prefs = currentPrefs();
  if (prefs.role === "patient") return "Patient (demo)";
  const c = data.contacts.find((x) => x.id === DEMO_COORDINATOR_ID);
  return `${c?.name ?? "Coordinator"} (demo coordinator)`;
}

function context(data: DemoData): ops.OpContext {
  return {
    now: clock(),
    actor: actorName(data),
    contactIds: new Set(data.contacts.map((c) => c.id)),
    patients: data.patients,
  };
}

function persist(data: DemoData): Result<DemoData> {
  try {
    storage()?.setItem(DATA_KEY, JSON.stringify(data));
    storage()?.removeItem(DELETED_KEY);
  } catch {
    return { ok: false, errors: { form: "Not saved: this browser's storage is full or blocked. Your change was not applied." } };
  }
  snapshot = { status: "ready", data, prefs: currentPrefs() };
  emit();
  return { ok: true, value: data };
}

function toEntries(data: DemoData, drafts: AuditDraft[]): AuditEntry[] {
  const at = clock().toISOString();
  const role = currentPrefs().role;
  return drafts.map((d) => ({ ...d, id: newId("au"), at, actor: actorName(data), actorRole: role }));
}

const NOT_READY: Result<never> = { ok: false, errors: { form: "Demo data is not loaded. Reset or reload the demo first." } };
const READ_ONLY: Result<never> = { ok: false, errors: { form: "Patients have read-only access in this demo." } };
const OFFLINE: Result<never> = { ok: false, errors: { form: "Reconnect before changing a care plan. Offline copies are read-only." } };

/** Apply a domain operation to one journey, append audit entries (append-only) and persist. */
function apply(
  journeyId: string,
  run: (journey: Journey, ctx: ops.OpContext) => Result<{ journey: Journey; audit: AuditDraft[] }>,
): Result<Journey> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return OFFLINE;
  const data = readyData();
  if (!data) return NOT_READY;
  if (currentPrefs().role !== "coordinator") return READ_ONLY;
  const journey = data.journeys.find((j) => j.id === journeyId);
  if (!journey) return { ok: false, errors: { form: "That journey no longer exists." } };
  const res = run(journey, context(data));
  if (!res.ok) return res;
  const next: DemoData = {
    ...data,
    journeys: data.journeys.map((j) => (j.id === journeyId ? res.value.journey : j)),
    audit: [...data.audit, ...toEntries(data, res.value.audit)],
  };
  const saved = persist(next);
  if (!saved.ok) return saved;
  return { ok: true, value: res.value.journey };
}

export const demoActions = {
  createJourney(input: JourneyInput): Result<Journey> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return OFFLINE;
    const data = readyData();
    if (!data) return NOT_READY;
    if (currentPrefs().role !== "coordinator") return READ_ONLY;
    const res = ops.createJourney(input, data.journeys, context(data));
    if (!res.ok) return res;
    const saved = persist({
      ...data,
      journeys: [res.value.journey, ...data.journeys],
      audit: [...data.audit, ...toEntries(data, res.value.audit)],
    });
    if (!saved.ok) return saved;
    return { ok: true, value: res.value.journey };
  },
  updateJourney: (id: string, input: JourneyInput) => apply(id, (j, c) => ops.updateJourneyDetails(j, input, c)),
  cancelJourney: (id: string, reason: string) => apply(id, (j, c) => ops.cancelJourney(j, reason, c)),
  upsertAppointment: (journeyId: string, apptId: string | null, input: AppointmentInput) =>
    apply(journeyId, (j, c) => ops.upsertAppointment(j, apptId, input, c)),
  upsertRequirement: (journeyId: string, reqId: string | null, input: RequirementInput) =>
    apply(journeyId, (j, c) => ops.upsertRequirement(j, reqId, input, c)),
  setRequirementStatus: (journeyId: string, reqId: string, status: "pending" | "requested" | "received" | "waived") =>
    apply(journeyId, (j, c) => ops.setRequirementStatus(j, reqId, status, c)),
  confirmRequirement: (journeyId: string, reqId: string) => apply(journeyId, (j, c) => ops.confirmRequirement(j, reqId, c)),
  markDelayed: (journeyId: string, reqId: string, input: { expectedDate: string; reason: string }) =>
    apply(journeyId, (j, c) => ops.markRequirementDelayed(j, reqId, input, c)),
  proposeTiming: (journeyId: string, apptId: string, startLocal: string) =>
    apply(journeyId, (j, c) => ops.proposeTiming(j, apptId, startLocal, c)),
  confirmAppointment: (journeyId: string, apptId: string) => apply(journeyId, (j, c) => ops.confirmAppointment(j, apptId, c)),
  confirmPlan: (journeyId: string) => apply(journeyId, (j, c) => ops.confirmPlan(j, c)),
  reschedule: (journeyId: string, apptId: string, input: { start: string; reason: string }) =>
    apply(journeyId, (j, c) => ops.rescheduleAppointment(j, apptId, input, c)),
  cancelAppointment: (journeyId: string, apptId: string, reason: string) =>
    apply(journeyId, (j, c) => ops.cancelAppointment(j, apptId, reason, c)),
  completeAppointment: (journeyId: string, apptId: string) => apply(journeyId, (j, c) => ops.completeAppointment(j, apptId, c)),
  /** Records that a notification was requested but NOT sent (no provider configured). */
  recordNotificationNotSent: (journeyId: string, reason: string) =>
    apply(journeyId, (j) => ({
      ok: true,
      value: {
        journey: j,
        audit: [{ action: "notification.not_sent", journeyId: j.id, entityId: j.id, summary: `Notification not sent: ${reason}` }],
      },
    })),

  resetDemo(): Result<DemoData> {
    try { storage()?.removeItem(EXTRAS_KEY); } catch { return {ok:false,errors:{form:"Could not clear the additional workspace data."}}; }
    const data = createSeed(clock());
    data.audit.push({
      id: newId("au"),
      at: clock().toISOString(),
      actor: "Demo user",
      actorRole: "system",
      action: "demo.reset",
      journeyId: null,
      entityId: null,
      summary: "Demo data reset to the fictional sample set.",
    });
    return persist(data);
  },
  deleteDemo(): Result<true> {
    const s = storage();
    try {
      s?.removeItem(EXTRAS_KEY);
      s?.removeItem(DATA_KEY);
      s?.setItem(DELETED_KEY, "1");
    } catch {
      return { ok: false, errors: { form: "Could not delete demo data from this browser's storage." } };
    }
    snapshot = { status: "deleted", prefs: currentPrefs() };
    emit();
    return { ok: true, value: true };
  },
  exportJson(): Result<string> {
    const data = readyData();
    if (!data) return NOT_READY;
    const prefs = currentPrefs();
    const journeys = prefs.role === "patient" ? data.journeys.filter(j => j.patientId === prefs.patientId) : data.journeys;
    const journeyIds = new Set(journeys.map(j => j.id));
    const contactIds = new Set(journeys.flatMap(j => [j.coordinatorId, ...j.appointments.map(a => a.ownerId), ...j.requirements.map(r => r.ownerId)]));
    let workspace;
    try { workspace=scopedExtras(prefs.role === "patient" ? prefs.patientId : undefined); } catch { return {ok:false,errors:{form:"Additional workspace data is damaged. Clear demo data in Settings before exporting."}}; }
    const exportData = prefs.role === "patient" ? {
      ...data,
      journeys,
      patients: data.patients.filter(p => p.id === prefs.patientId),
      contacts: data.contacts.filter(c => contactIds.has(c.id)),
      audit: data.audit.filter(a => a.journeyId !== null && journeyIds.has(a.journeyId)),
    } : data;
    return {
      ok: true,
      value: JSON.stringify(
        {
          notice: "Fictional CareRoute demo data exported from this browser. Contains no real patient information.",
          exportedAt: clock().toISOString(),
          ...exportData,
          workspace,
        },
        null,
        2,
      ),
    };
  },
};

