import type { AuditEntry, Contact, DemoPatient, Journey } from "@/domain/types";

export const DEMO_SCHEMA_VERSION = 1;

export interface DemoData {
  schemaVersion: number;
  createdAt: string;
  journeys: Journey[];
  contacts: Contact[];
  patients: DemoPatient[];
  audit: AuditEntry[];
}

export const DEMO_COORDINATOR_ID = "c_meera";

export const demoPatients: DemoPatient[] = [
  { id: "p_asha", name: "Asha Verma", preferredLanguage: "hi" },
  { id: "p_daniel", name: "Daniel Okafor", preferredLanguage: "en" },
  { id: "p_lakshmi", name: "Lakshmi Rao", preferredLanguage: "en" },
  { id: "p_arjun", name: "Arjun Mehta", preferredLanguage: "hi" },
];

export const demoContacts: Contact[] = [
  { id: "c_meera", name: "Meera Iyer", role: "Care coordinator", organisation: "Riverbend General (fictional)", reachVia: "Coordination desk, ext. 2104 (fictional)" },
  { id: "c_tomas", name: "Tomás Reyes", role: "Care coordinator", organisation: "Riverbend General (fictional)", reachVia: "Coordination desk, ext. 2107 (fictional)" },
  { id: "c_lab", name: "Pathology lab desk", role: "Laboratory", organisation: "Riverbend General (fictional)", reachVia: "Lab reception, ground floor (fictional)" },
  { id: "c_imaging", name: "Imaging reception", role: "Radiology & imaging", organisation: "Riverbend General (fictional)", reachVia: "Imaging desk, block B (fictional)" },
  { id: "c_cardio", name: "Cardiology outpatients", role: "Clinical department", organisation: "Riverbend General (fictional)", reachVia: "Outpatients desk 3 (fictional)" },
  { id: "c_ortho", name: "Orthopaedics outpatients", role: "Clinical department", organisation: "Riverbend General (fictional)", reachVia: "Outpatients desk 5 (fictional)" },
  { id: "c_eye", name: "Eye clinic reception", role: "Clinical department", organisation: "Riverbend General (fictional)", reachVia: "Eye clinic, level 2 (fictional)" },
  { id: "c_records", name: "Medical records office", role: "Records", organisation: "Riverbend General (fictional)", reachVia: "Records window, block A (fictional)" },
  { id: "c_gp", name: "Referring GP practice", role: "Referrer", organisation: "Lakeside Family Practice (fictional)", reachVia: "Practice front desk (fictional)" },
  { id: "c_family", name: "Patient / family", role: "Patient-held documents", organisation: "—", reachVia: "Bring to reception on the day" },
];

function at(now: Date, days: number, hour: number, minute = 0): string {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}
function ago(now: Date, days: number): string {
  return new Date(now.getTime() - days * 86_400_000).toISOString();
}

/** Fictional demo records, positioned relative to `now` so the demo always looks current. */
export function createSeed(now: Date): DemoData {
  const n = now.toISOString();
  const confirmed2d = ago(now, 2);

  const journeys: Journey[] = [
    {
      id: "jr_asha_cardio",
      reference: "CR-1041",
      patientId: "p_asha",
      patientName: "Asha Verma",
      specialty: "Cardiology work-up",
      summary: "Planned outpatient work-up: blood tests and echocardiogram before a cardiology consultation.",
      coordinatorId: "c_meera",
      status: "active",
      planVersion: 2,
      planConfirmedAt: confirmed2d,
      createdAt: ago(now, 6),
      updatedAt: confirmed2d,
      appointments: [
        { id: "ap_asha_bloods", title: "Blood tests", department: "Pathology", location: "Lab reception, ground floor", start: at(now, 2, 9, 0), durationMinutes: 20, ownerId: "c_lab", status: "confirmed", dependsOn: [], lastConfirmedAt: confirmed2d, proposedStart: null, reviewReason: null, preparation: "Bring your referral letter. Follow any fasting instructions given by your doctor.", updatedAt: confirmed2d },
        { id: "ap_asha_echo", title: "Echocardiogram", department: "Cardiac imaging", location: "Imaging block B, room 4", start: at(now, 5, 10, 30), durationMinutes: 45, ownerId: "c_imaging", status: "confirmed", dependsOn: [], lastConfirmedAt: confirmed2d, proposedStart: null, reviewReason: null, preparation: "Wear comfortable clothing.", updatedAt: confirmed2d },
        { id: "ap_asha_consult", title: "Cardiology consultation", department: "Cardiology", location: "Outpatients desk 3", start: at(now, 9, 11, 0), durationMinutes: 30, ownerId: "c_cardio", status: "confirmed", dependsOn: ["rq_asha_bloodres", "rq_asha_echorep", "rq_asha_referral"], lastConfirmedAt: confirmed2d, proposedStart: null, reviewReason: null, preparation: "Bring a list of your current medicines.", updatedAt: confirmed2d },
      ],
      requirements: [
        { id: "rq_asha_referral", kind: "referral", title: "GP referral letter", ownerId: "c_gp", dueDate: at(now, -3, 17), status: "confirmed", lastConfirmedAt: ago(now, 3), confirmedBy: "Meera Iyer", validityDays: 90, expectedDate: null, delayReason: null, dependsOn: [], notes: "", updatedAt: ago(now, 3) },
        { id: "rq_asha_bloodres", kind: "test_result", title: "Blood test results", ownerId: "c_lab", dueDate: at(now, 4, 17), status: "pending", lastConfirmedAt: null, confirmedBy: null, validityDays: 30, expectedDate: null, delayReason: null, dependsOn: ["ap_asha_bloods"], notes: "", updatedAt: confirmed2d },
        { id: "rq_asha_echorep", kind: "report", title: "Echocardiogram report", ownerId: "c_imaging", dueDate: at(now, 7, 17), status: "pending", lastConfirmedAt: null, confirmedBy: null, validityDays: 60, expectedDate: null, delayReason: null, dependsOn: ["ap_asha_echo"], notes: "", updatedAt: confirmed2d },
      ],
    },
    {
      id: "jr_daniel_ortho",
      reference: "CR-1042",
      patientId: "p_daniel",
      patientName: "Daniel Okafor",
      specialty: "Orthopaedic pre-operative assessment",
      summary: "Administrative steps before a planned knee procedure date is offered.",
      coordinatorId: "c_tomas",
      status: "active",
      planVersion: 1,
      planConfirmedAt: ago(now, 4),
      createdAt: ago(now, 8),
      updatedAt: ago(now, 1),
      appointments: [
        { id: "ap_dan_xray", title: "Knee X-ray", department: "Imaging", location: "Imaging block B", start: at(now, 1, 14, 0), durationMinutes: 20, ownerId: "c_imaging", status: "confirmed", dependsOn: [], lastConfirmedAt: ago(now, 4), proposedStart: null, reviewReason: null, preparation: "", updatedAt: ago(now, 4) },
        { id: "ap_dan_preop", title: "Pre-operative assessment", department: "Orthopaedics", location: "Outpatients desk 5", start: at(now, 6, 9, 30), durationMinutes: 60, ownerId: "c_ortho", status: "needs_review", dependsOn: ["rq_dan_bloods", "rq_dan_consent"], lastConfirmedAt: ago(now, 4), proposedStart: null, reviewReason: "Waiting on delayed “Pre-op blood panel report”.", preparation: "Bring a list of your current medicines.", updatedAt: ago(now, 1) },
      ],
      requirements: [
        { id: "rq_dan_bloods", kind: "report", title: "Pre-op blood panel report", ownerId: "c_lab", dueDate: at(now, 2, 17), status: "delayed", lastConfirmedAt: null, confirmedBy: null, validityDays: 30, expectedDate: null, delayReason: "Sample needs to be re-taken (administrative note from lab).", dependsOn: [], notes: "", updatedAt: ago(now, 1) },
        { id: "rq_dan_consent", kind: "consent_form", title: "Signed information form", ownerId: "c_family", dueDate: at(now, 5, 17), status: "requested", lastConfirmedAt: null, confirmedBy: null, validityDays: null, expectedDate: null, delayReason: null, dependsOn: [], notes: "Form is explained and signed with staff; CareRoute only tracks whether it is on file.", updatedAt: ago(now, 4) },
      ],
    },
    {
      id: "jr_lakshmi_eye",
      reference: "CR-1043",
      patientId: "p_lakshmi",
      patientName: "Lakshmi Rao",
      specialty: "Ophthalmology review",
      summary: "Follow-up eye clinic visit needing a current vision test record.",
      coordinatorId: "c_meera",
      status: "active",
      planVersion: 1,
      planConfirmedAt: ago(now, 5),
      createdAt: ago(now, 45),
      updatedAt: ago(now, 5),
      appointments: [
        { id: "ap_lak_clinic", title: "Eye clinic review", department: "Ophthalmology", location: "Eye clinic, level 2", start: at(now, 4, 15, 0), durationMinutes: 30, ownerId: "c_eye", status: "confirmed", dependsOn: ["rq_lak_vision"], lastConfirmedAt: ago(now, 5), proposedStart: null, reviewReason: null, preparation: "Someone may need to accompany you home if drops are used.", updatedAt: ago(now, 5) },
      ],
      requirements: [
        { id: "rq_lak_vision", kind: "test_result", title: "Vision test record", ownerId: "c_records", dueDate: at(now, -40, 17), status: "confirmed", lastConfirmedAt: ago(now, 40), confirmedBy: "Meera Iyer", validityDays: 30, expectedDate: null, delayReason: null, dependsOn: [], notes: "", updatedAt: ago(now, 40) },
      ],
    },
    {
      id: "jr_arjun_derm",
      reference: "CR-1044",
      patientId: "p_arjun",
      patientName: "Arjun Mehta",
      specialty: "Dermatology follow-up",
      summary: "Single follow-up visit; prior clinic letter on file.",
      coordinatorId: "c_tomas",
      status: "active",
      planVersion: 1,
      planConfirmedAt: ago(now, 1),
      createdAt: ago(now, 10),
      updatedAt: ago(now, 1),
      appointments: [
        { id: "ap_arj_derm", title: "Dermatology follow-up", department: "Dermatology", location: "Outpatients desk 7", start: at(now, 3, 10, 0), durationMinutes: 20, ownerId: "c_tomas", status: "confirmed", dependsOn: ["rq_arj_letter"], lastConfirmedAt: ago(now, 1), proposedStart: null, reviewReason: null, preparation: "", updatedAt: ago(now, 1) },
      ],
      requirements: [
        { id: "rq_arj_letter", kind: "document", title: "Previous clinic letter", ownerId: "c_records", dueDate: at(now, -2, 17), status: "confirmed", lastConfirmedAt: ago(now, 1), confirmedBy: "Tomás Reyes", validityDays: 180, expectedDate: null, delayReason: null, dependsOn: [], notes: "", updatedAt: ago(now, 1) },
      ],
    },
  ];

  const audit: AuditEntry[] = journeys.map((j, i) => ({
    id: `au_seed_${i}`,
    at: j.createdAt,
    actor: "Demo data generator",
    actorRole: "system",
    action: "journey.created",
    journeyId: j.id,
    entityId: j.id,
    summary: `Fictional demo journey ${j.reference} loaded for ${j.patientName}.`,
  }));
  audit.push({
    id: "au_seed_delay",
    at: ago(now, 1),
    actor: "Tomás Reyes (demo coordinator)",
    actorRole: "coordinator",
    action: "requirement.delayed",
    journeyId: "jr_daniel_ortho",
    entityId: "rq_dan_bloods",
    summary: "Marked “Pre-op blood panel report” delayed with no new date: Sample needs to be re-taken.",
  });

  return {
    schemaVersion: DEMO_SCHEMA_VERSION,
    createdAt: n,
    journeys,
    contacts: demoContacts,
    patients: demoPatients,
    audit: audit.sort((a, b) => a.at.localeCompare(b.at)),
  };
}

