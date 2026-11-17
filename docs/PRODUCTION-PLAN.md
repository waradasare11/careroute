# From demonstration to a hospital pilot

## Product boundary

Coordinate planned visits. Hospital staff own medical decisions, emergency handling, preparation instructions and whether a person should travel. A green administrative status must never be presented as medical clearance. A delay should trigger review, not silently reschedule a real hospital booking.

## First pilot

Choose one hospital department and map its existing process with staff and families. Start with staff-entered administrative facts and explicit confirmation by the responsible team. Validate terminology and report-validity rules. Do not assume this demo's sample rules apply clinically.

Measure baseline and pilot results: visits disrupted by missing administrative prerequisites, coordinator minutes per plan, time to notify a family after a change, and the percentage of confirmations that are current. Record denominators and reasons. There are no measured outcome claims in this release.

## Proposed connected architecture (not implemented)

1. Authenticated web and Android clients using a server API. Hospital coordinators get only their organisation's records. Patients and explicitly authorised caregivers get only assigned plans. Enforce every rule on the server; hiding UI controls is insufficient.
2. A relational database with organisations, users, patient permissions, journeys, requirements, appointments, dependency edges, confirmation records and an append-only audit history. Use tenant IDs, foreign keys and explicit state transitions.
3. Versioned updates. Require the expected plan version when writing. Reject stale updates and show the coordinator the changed plan. Commit a change, its audit entry and queued notification in one transaction.
4. Notifications in a background queue with idempotency keys, delivery status, retry limits and a human review path. Obtain the appropriate consent and use approved templates. No notification should contain unnecessary health details.
5. Hospital integrations only after access and agreement. Start with reviewed manual entry. Map authorised interface fields and reconciliation rules before connecting real bookings. A proposed slot is not a confirmed external appointment.
6. Separate document storage with access rules, file-size/type checks, malware scanning, encrypted storage, retention/deletion rules and expiring download links. AI extraction, if later added, must retain provenance and require staff confirmation; do not invent missing facts.

## Required release work

- Select a hosting region, identified service operator and support owner. Review applicable privacy and health-data obligations with qualified reviewers.
- Implement secure login, session expiry, server-side authorisation, encryption, consent and caregiver revocation. Remove the demo role switch from real sessions.
- Establish retention rules, data deletion, backups and recovery drills. Keep sensitive records out of analytics, URLs and error logs.
- Validate dependency cycles, delayed prerequisites, expired confirmations, time zones, cancelled appointments and simultaneous edits on the server as well as in the client.
- Test institution isolation, cross-patient requests, expired sessions, duplicate requests, failed notifications and recovery after network loss.
- Test the Android app on physical devices: cold start, back button, keyboard, large text, rotation, interruptions, file sharing and app updates. Use a release signing key under the owner's control; do not distribute its private key in source.
- Prepare store listing, privacy disclosures, support details and current store-policy review before Play submission. This debug APK is not a completed store submission.
- Complete accessibility and language reviews with users. Draft Hindi labels are not sufficient for a multilingual pilot.
- Agree a monitored pilot, incident response, rollback and stop conditions before live patient use.

## Expanded doctor and information features

The 0.2 demonstration adds consultation notes, unsigned prescription drafts, patient preparation, follow-up tasks and sourced public listings. Before operating these with real patients, additionally:

- Verify clinician identity and professional registration; define prescribing permissions, consent, signing, issuance, correction and cancellation workflows with clinical and legal reviewers. Do not turn an unsigned draft into an issued prescription simply by removing the watermark.
- Choose authorised medicine terminology and interaction/reference data only if needed and licensed. Validate any decision support separately; manual data entry is not clinical validation.
- Add secure patient-clinician sharing, record authorship, revisions and audit controls. Enforce all access rules on the server, including exports and downloads.
- Review first-aid summaries clinically for the intended audience, accessibility, age-specific scope and emergency escalation. Establish named ownership and update dates.
- Review directory reuse rights, expand through authorised sources, implement corrections, distinguish source-listed from independently checked credentials, and recheck changes. Avoid misleading claims of complete city coverage.
- Select an independently controlled hosting/domain setup if required for branding. Do not rely on a private preview address as the public commercial service.

## Business hypotheses to test

A hospital or patient-navigation provider may pay for staff coordination software if it reduces avoidable administrative work and failed visits. Interview the purchasing decision-maker, establish a baseline and test willingness to pay. No revenue, market share or customer agreement is assumed. Expansion should follow demonstrated value and reliable integration, not feature count.
