import { MS_PER_DAY, toTime } from "./dates";
import { journeyReadiness } from "./readiness";
import type { Journey } from "./types";

export interface DashboardMetrics {
  activeJourneys: number;
  readyJourneys: number;
  attentionJourneys: number;
  waitingJourneys: number;
  delayedRequirements: number;
  staleConfirmations: number;
  appointmentsNext7Days: number;
  needsReviewAppointments: number;
}

/** Computed purely from stored (fictional) demo records — illustrative only. */
export function computeMetrics(journeys: Journey[], now: Date): DashboardMetrics {
  const m: DashboardMetrics = {
    activeJourneys: 0,
    readyJourneys: 0,
    attentionJourneys: 0,
    waitingJourneys: 0,
    delayedRequirements: 0,
    staleConfirmations: 0,
    appointmentsNext7Days: 0,
    needsReviewAppointments: 0,
  };
  const t = now.getTime();
  for (const j of journeys) {
    if (j.status !== "active") continue;
    m.activeJourneys++;
    const r = journeyReadiness(j, now);
    if (r.state === "ready") m.readyJourneys++;
    else if (r.state === "attention") m.attentionJourneys++;
    else if (r.state === "waiting") m.waitingJourneys++;
    for (const req of j.requirements) if (req.status === "delayed") m.delayedRequirements++;
    for (const a of r.assessments.values()) {
      if (a.issues.some((i) => i.code === "stale_confirmation" || i.code === "changed_since_confirmation")) m.staleConfirmations++;
    }
    for (const a of j.appointments) {
      if (a.status === "needs_review") m.needsReviewAppointments++;
      const s = toTime(a.start);
      if (a.status !== "cancelled" && a.status !== "completed" && s >= t && s <= t + 7 * MS_PER_DAY) m.appointmentsNext7Days++;
    }
  }
  return m;
}

