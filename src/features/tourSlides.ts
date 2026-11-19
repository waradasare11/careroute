import {BookOpen, CalendarDays, ClipboardList, FileText, HeartHandshake, History, MapPin, Plus, Route, Settings, Stethoscope} from 'lucide-react';
import doctors from '../data/pune-doctors.json';
import healthIndex from '../data/health-index.json';
import {facilities} from '../data/resources';

export const tourSlides = [
  {
    label: 'Overview', icon: HeartHandshake, title: 'One visit. A shared plan.',
    description: 'Follow Asha’s fictional visit from her first question to the next appointment.',
    features: ['Switch between coordinator and patient views without creating an account.', 'See visit counts, the next scheduled step and what needs attention.', 'Search care plans by name or reference and filter by status.', 'Open the doctor tools from the coordinator demo.'],
    scene: 'Asha’s planned visit', timeline: [['Before the visit', 'Prepare a brief and gather documents'], ['During the visit', 'Record consultation notes and a draft'], ['After the visit', 'Check the itinerary and follow-up tasks']],
    href: '/app', link: 'Open the workspace',
  },
  {
    label: 'Patient preparation', icon: ClipboardList, title: 'Bring your questions with you.',
    description: 'Prepare a brief before the appointment so you can spend more of the visit talking about care.',
    features: ['Choose a fictional patient and see their visit plans.', 'Record concerns, current medicines, allergies and questions.', 'Tick the preparation checklist and save a text copy of your brief.', 'Use the patient view’s English or Hindi setting. Hindi covers selected labels.'],
    scene: 'Asha’s visit brief', timeline: [['Concerns', 'What has changed since the last visit?'], ['Questions', 'What should I bring next time?'], ['Checklist', 'Pack reports and confirm the visit details']],
    href: '/app/prepare', link: 'Try visit preparation',
  },
  {
    label: 'Care plans', icon: Route, title: 'See what each step depends on.',
    description: 'Coordinators can put appointments, prerequisites and the people responsible in one plan.',
    features: ['Create and edit fictional care plans with a specialty and assigned coordinator.', 'Add or edit appointments and requirements with dates, locations or owners.', 'Link appointments to their required reports and documents.', 'See missing, pending, expired and confirmed steps before travel. Readiness here is administrative.'],
    scene: 'Care plan dependencies', timeline: [['Blood report', 'Lab team · requirement'], ['Consultation', 'Depends on the report'], ['Next appointment', 'Review the recorded plan before travel']],
    href: '/app/journeys', link: 'Explore care journeys',
  },
  {
    label: 'Changes & confirmation', icon: CalendarDays, title: 'When one date moves, see what follows.',
    description: 'Review the appointments affected by a delayed report before updating the family’s recorded plan.',
    features: ['Record a delay, revised date and reason.', 'Review affected appointments and propose new timing.', 'Confirm received requirements, appointment slots and the updated plan separately.', 'Cancel fictional appointments and inspect recorded changes in Activity history.'],
    scene: 'A report date changed', timeline: [['Delay recorded', 'New expected date saved'], ['Timing needs review', 'Coordinator checks affected steps'], ['Plan confirmation', 'Review the new dates and confirm']],
    href: '/app/journeys', link: 'Open care journeys',
  },
  {
    label: 'Doctor workbench', icon: Stethoscope, title: 'Start with the patient’s own brief.',
    description: 'The fictional workbench brings visit preparation and the clinician’s documentation together.',
    features: ['Search the recorded consultation queue and select a fictional patient.', 'Read the patient’s prepared concerns, medicines, allergies and questions.', 'Enter history, exam findings, allergies, current medicines, assessment, care plan and referral notes.', 'Notes save on the device as you type. Export a text copy when needed.'],
    scene: 'Consultation workbench', timeline: [['Recorded queue', 'Open Asha’s consultation'], ['Prepared brief', 'Read and confirm the patient’s notes'], ['Visit documentation', 'Assessment, plan and referral entered by the clinician']],
    href: '/app/doctor', link: 'Open the doctor workbench',
  },
  {
    label: 'Prescription drafts', icon: FileText, title: 'Turn handwritten instructions into a readable draft.',
    description: 'The clinician types every instruction. Each preview and export is marked “Not valid for dispensing.”',
    features: ['Create and reopen multiple drafts for a fictional patient.', 'Enter patient, clinician, clinic and allergy details. Add medicine name, strength, dose, route, frequency, duration, quantity and instructions.', 'Add assessment, advice and follow-up date. Review required fields before preview.', 'Print on the web or share a draft on Android. Changes require another review. Clinical safety checks are outside this demo.'],
    scene: 'Prescription draft', timeline: [['Enter instructions', 'Clinician fills each medicine field'], ['Review required fields', 'Confirm the details before previewing'], ['Unsigned draft', 'Print or share for demonstration']],
    href: '/app/doctor', link: 'Find the Prescription tab',
  },
  {
    label: 'Follow-up & sharing', icon: History, title: 'Leave with a record of what comes next.',
    description: 'Families can take a copy of the itinerary while staff keep track of follow-up work.',
    features: ['Review the itinerary, locations, requirements and next recorded step.', 'Print the plan on the web or share a text copy on Android.', 'Export appointment times as a calendar file and view the listed care coordinator.', 'Add, complete or delete dated follow-up tasks. No reminders are sent.'],
    scene: 'After the consultation', timeline: [['Visit itinerary', 'Check locations and times'], ['Calendar export', 'Save the appointment dates'], ['Follow-up task', 'Record who needs to review the next step']],
    href: '/app/journeys', link: 'Explore itineraries',
  },
  {
    label: 'Pune directory', icon: MapPin, title: 'Find a provider and check the source.',
    description: 'Browse a dated snapshot of selected facilities and doctors before contacting a provider.',
    features: [`Search ${facilities.length} facility listings by name, location or address.`, `Search ${doctors.length} Ruby Hall Clinic doctor listings by name or listed specialty.`, 'Filter facilities by area and save favourites on this device.', 'Open official sources, available phone links and map searches. Confirm availability and credentials with the provider.'],
    scene: 'Pune directory', timeline: [['Search or filter', 'Facility, area, doctor or specialty'], ['Save a listing', 'Keep it in your favourites'], ['Open the official source', 'Check current information with the provider']],
    href: '/directory', link: 'Browse the Pune directory',
  },
  {
    label: 'Health references', icon: BookOpen, title: 'Read the guidance at its source.',
    description: 'Search the NHS topic index and open the original publisher’s page for the full reference.',
    features: [`Search ${healthIndex.entries.length} indexed condition, symptom and medicine titles, then filter by category.`, 'See the publisher and index retrieval date before opening an article.', 'Open MedlinePlus, WHO fact sheets and outbreak notices for further reading.', 'Find ICMR workflows, telemedicine guidance and other official references. Source pages need internet access.'],
    scene: 'Reference explorer', timeline: [['Search a topic', 'Browse indexed NHS titles'], ['Check the source date', 'Pages may change after indexing'], ['Read the original', 'Open publisher guidance and updates']],
    href: '/library', link: 'Explore health references',
  },
  {
    label: 'First aid', icon: Plus, title: 'Know where to find first-aid guidance.',
    description: 'Find short educational summaries and emergency contact information in one place.',
    features: ['Read cards on heat burns, heavy bleeding, adult choking and unresponsiveness.', 'See key precautions and open the original guidance for each topic.', 'Find Indian Red Cross training and links to fuller first-aid resources.', 'Open your dialler with 112 for emergencies in India. Do not wait for CareRoute.'],
    scene: 'First-aid reference', timeline: [['Emergency in India?', 'Call 112'], ['Choose a topic', 'Read the summary and precautions'], ['Open the original', 'See the source’s full guidance']],
    href: '/first-aid', link: 'Open first-aid references',
  },
  {
    label: 'Settings & offline', icon: Settings, title: 'Keep control of your demo data.',
    description: 'Choose how the workspace looks and manage the fictional information saved on this device.',
    features: ['Choose light, dark or system appearance. Your choice is remembered.', 'Export demo data, restore sample records or delete local records in Settings.', 'Install from a supported browser or use the Android demo. View cached plans offline after loading the site online.', 'Care record edits require a connection. Real accounts, bookings, messaging and hospital integrations are outside the demo.'],
    scene: 'Workspace settings', timeline: [['Appearance', 'Light · Dark · System'], ['Local records', 'Export, reset or delete'], ['Offline access', 'View previously cached demo plans']],
    href: '/app/settings', link: 'Open workspace settings',
  },
] as const;
