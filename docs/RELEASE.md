# CareRoute 0.2.0 — verification and release notes

Release date: 17 November 2026. Use fictional records only.

## Included

Light/dark/system themes, redesigned landing page with patient/doctor/coordinator explanations, original visit coordination workflows, consultation notes, clinician-entered unsigned prescription drafts, patient visit preparation, follow-up tasks, local exports/reset/deletion, a searchable source-linked Pune directory, four first-aid reference cards and a source library.

Directory coverage is 16 facilities and 344 doctor listings from one hospital directory, retrieved 16 November 2026. It is not a complete list of Pune providers or an independent credential check. See SOURCES.md.

## Verification

- 53 logic/store/platform tests passed, covering dependency rules, dates, confirmation state, delay propagation, calendar formatting, persistence, damaged data, offline care-record writes, scoped patient exports, prescription completeness and local stale-save/deletion guards.
- Browser tests exercise themes, role explanations, doctor notes and tasks, prescription validation and unsigned print output, changed-draft review, directory search/bookmarks, first-aid links, two-tab deletion and editing, patient scope, mobile layout, reset/delete, existing care-plan flows and production offline reload. All 17 browser tests passed against the final production build (52.8 seconds).
- TypeScript and production static build passed. Fonts and app assets are bundled.
- Desktop light/dark landing pages, patient view, mobile preparation and prescription print styling were visually inspected. Final visual checks prompted fixes to dark-mode selectors/table headers and the print backdrop.
- Android debug APK compiled using JDK 21 / SDK 36. App ID in.careroute.app; versionCode 2; versionName 0.2.0; minimum API 24. APK signature and bundled website matching are checked in the delivery report.
- npm audit on 17 November 2026 reported zero known advisories across the installed dependency tree. Earlier low-severity reports are not the current audit result. This is a dependency advisory check, not penetration testing or proof of no vulnerabilities.
- A fresh independent review found the changed-prescription preview issue and dark patient-selector issue. Both were fixed and re-inspected. Browser regressions cover the reproduced cases.

An earlier browser run timed out in page setup during a concurrent Android build. The remaining 16 scenarios passed. The full suite was rerun without that competing build. No test was skipped to hide the failure.

## Fixed in this release

Deleted notes could previously be resurrected by stale data in a public directory tab. Saves now check the deletion tombstone and expected storage snapshot; tabs listen for relevant changes. Conflicts refresh the latest copy and ask for review instead of overwriting it. This is a local demo guard, not atomic multiuser database concurrency.

Prescription preview now becomes invalid when its draft changes. Print/share rereads the saved draft, checks the reviewed version and validates required fields before exporting. Outputs always retain their unsigned, not-valid-for-dispensing notice.

Mobile top-bar overflow, patient selectors and role selector/table-header dark contrast, the skip-link route interaction, and prescription-only print styling were corrected.

## Not verified / not implemented

- Physical Android-device installation, native share/dialer behaviour, back button, keyboard, rotation, large text and upgrades have not been tested. Mocked native API tests and successful compilation do not establish device behaviour.
- Physical printing is unverified. Browser tests inspect print styling and print invocation.
- No Play Store release signing, store submission, crash-monitoring setup or public launch was completed.
- No secure application login, shared backend, hospital integration, actual booking, payments, SMS/email, real patient records or teleconsultation is implemented. The demo role selector is not an access-control boundary.
- No AI model was trained. No medicine, dose or diagnosis is recommended. No clinical safety, interaction or credential verification is performed. Prescriptions are unsigned drafts only.
- The first-aid summaries require clinical review for intended use; they are general education, not personalised treatment or a complete emergency protocol.
- Privacy/legal review, clinical validation, penetration testing, recovery drills, full accessibility review and reviewed translations remain outstanding. Hindi labels are partial draft translations.
- The user owns no domain. CareRoute branding is used in the app, but the existing private hosting address still contains chatgpt.site; its access screen belongs to the host.

## Data boundaries

Fictional records save locally on each device. Do not enter real medical or identifying information. Android backup is disabled; browser storage is not a secure health-record vault. Patient exports omit staff notes/drafts/tasks, but the demo still allows role switching. Exported, shared and printed copies are outside deletion controls. Care-record changes are blocked offline; public bookmarks can still be saved locally. Source websites require internet access.

The current release is a working demonstration, not a market-ready clinical service. Follow PRODUCTION-PLAN.md before a real pilot.

