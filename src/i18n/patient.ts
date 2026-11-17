import type { AppointmentStatus, RequirementKind, RequirementStatus } from "@/domain/types";

export type Lang = "en" | "hi";

/**
 * Patient-facing strings. Hindi is a careful draft written for plain-language
 * readability; it must be reviewed by a native-speaking healthcare translator
 * before any real-world use. Appointment names entered by staff are not translated.
 */
const en = {
  langName: "English",
  myVisits: "My visits",
  itineraryTitle: "Your visit itinerary",
  demoNotice: "Fictional demo — not real medical information.",
  adminOnly: "This itinerary covers scheduling and paperwork only. Clinical decisions remain with hospital staff.",
  statusReady: "Everything needed so far is in place",
  statusWaiting: "Some steps are still in progress",
  statusAttention: "Your care team is reviewing a change",
  statusOther: "This plan is no longer active",
  upcoming: "Appointments",
  missingSteps: "Steps still pending",
  noMissing: "Nothing is missing right now.",
  contact: "Who to contact",
  yourCoordinator: "Your coordinator",
  responsible: "Responsible",
  reachVia: "How to reach",
  confirmed: "Confirmed",
  notConfirmed: "Not yet confirmed",
  underReview: "Under review — please wait for your coordinator to confirm before travelling.",
  cancelled: "Cancelled",
  completed: "Attended",
  print: "Print itinerary",
  downloadCalendar: "Add to calendar (.ics)",
  preparation: "Preparation",
  location: "Location",
  minutes: "min",
  needsFirst: "Needs first",
  lastConfirmed: "Last confirmed",
  offlineReadOnly: "You're offline. Showing the last saved copy on this device (read-only).",
  language: "Language",
  noJourneys: "No itinerary has been shared with you yet.",
  viewItinerary: "View itinerary",
  expectedBy: "Expected by",
  translationNote: "Hindi text is a draft and must be reviewed by a native-speaking translator before real use.",
  printedOn: "Printed from the CareRoute demo on",
  reference: "Reference",
  viewingAs: "Viewing as",
  backToVisits: "Back to my visits",
  notFound: "This itinerary is not available to you.",
  noAppointments: "No appointments are scheduled in this plan.",
  timeChanged: "Time updated by your coordinator",
  stepWaitingOn: "Waiting on",
} as const;

export type PatientStrings = { [K in keyof typeof en]: string };

const hi: PatientStrings = {
  langName: "हिंदी",
  myVisits: "मेरी विज़िट",
  itineraryTitle: "आपकी अस्पताल विज़िट की योजना",
  demoNotice: "काल्पनिक डेमो — यह असली चिकित्सा जानकारी नहीं है।",
  adminOnly: "यह योजना केवल समय और कागज़ी कार्यवाही के लिए है। चिकित्सा संबंधी निर्णय अस्पताल के कर्मचारी ही लेते हैं।",
  statusReady: "अभी तक की सभी ज़रूरी चीज़ें तैयार हैं",
  statusWaiting: "कुछ चरण अभी प्रगति पर हैं",
  statusAttention: "आपकी देखभाल टीम एक बदलाव की समीक्षा कर रही है",
  statusOther: "यह योजना अब सक्रिय नहीं है",
  upcoming: "अपॉइंटमेंट",
  missingSteps: "बाकी चरण",
  noMissing: "अभी कुछ भी बाकी नहीं है।",
  contact: "किससे संपर्क करें",
  yourCoordinator: "आपके समन्वयक",
  responsible: "ज़िम्मेदार",
  reachVia: "संपर्क का तरीका",
  confirmed: "पुष्टि हो चुकी है",
  notConfirmed: "अभी पुष्टि नहीं हुई",
  underReview: "समीक्षा जारी है — यात्रा से पहले अपने समन्वयक की पुष्टि का इंतज़ार करें।",
  cancelled: "रद्द",
  completed: "पूरी हुई",
  print: "योजना प्रिंट करें",
  downloadCalendar: "कैलेंडर में जोड़ें (.ics)",
  preparation: "तैयारी",
  location: "स्थान",
  minutes: "मिनट",
  needsFirst: "पहले ज़रूरी",
  lastConfirmed: "अंतिम पुष्टि",
  offlineReadOnly: "आप ऑफ़लाइन हैं। इस डिवाइस पर सहेजी गई अंतिम प्रति दिखाई जा रही है (केवल पढ़ने के लिए)।",
  language: "भाषा",
  noJourneys: "अभी तक आपके साथ कोई योजना साझा नहीं की गई है।",
  viewItinerary: "योजना देखें",
  expectedBy: "अपेक्षित तारीख",
  translationNote: "हिंदी अनुवाद एक प्रारूप है; वास्तविक उपयोग से पहले किसी मूल हिंदी भाषी अनुवादक से इसकी समीक्षा आवश्यक है।",
  printedOn: "CareRoute डेमो से प्रिंट किया गया:",
  reference: "संदर्भ संख्या",
  viewingAs: "इस रूप में देख रहे हैं",
  backToVisits: "मेरी विज़िट पर वापस जाएँ",
  notFound: "यह योजना आपके लिए उपलब्ध नहीं है।",
  noAppointments: "इस योजना में कोई अपॉइंटमेंट निर्धारित नहीं है।",
  timeChanged: "आपके समन्वयक ने समय बदला है",
  stepWaitingOn: "इसका इंतज़ार है",
};

export const patientStrings: Record<Lang, PatientStrings> = { en, hi };

export const requirementStatusLabel: Record<Lang, Record<RequirementStatus, string>> = {
  en: { pending: "Not yet received", requested: "Requested", received: "Received, being checked", confirmed: "In place", delayed: "Delayed", waived: "Not needed" },
  hi: { pending: "अभी प्राप्त नहीं हुआ", requested: "मंगाया गया है", received: "प्राप्त हुआ, जाँच जारी है", confirmed: "उपलब्ध है", delayed: "देरी हुई है", waived: "आवश्यक नहीं" },
};

export const requirementKindLabel: Record<Lang, Record<RequirementKind, string>> = {
  en: { report: "Report", test_result: "Test result", document: "Document", referral: "Referral letter", consent_form: "Form" },
  hi: { report: "रिपोर्ट", test_result: "जाँच परिणाम", document: "दस्तावेज़", referral: "रेफ़रल पत्र", consent_form: "फ़ॉर्म" },
};

export const appointmentStatusLabel: Record<Lang, Record<AppointmentStatus, string>> = {
  en: { scheduled: en.notConfirmed, confirmed: en.confirmed, needs_review: "Under review", cancelled: en.cancelled, completed: en.completed },
  hi: { scheduled: hi.notConfirmed, confirmed: hi.confirmed, needs_review: "समीक्षा जारी", cancelled: hi.cancelled, completed: hi.completed },
};

