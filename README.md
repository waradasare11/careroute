# CareRoute

A website and Android demonstration for coordinating planned hospital visits before a family travels. The app links reports, documents and appointments, identifies missing steps, and asks a coordinator to review changes.

CareRoute includes a hosted personal planner for visit logistics and a separate demo with fictional patient and clinician records. Sign in to save personal visits across devices. Use Explore the demo to try simulated hospital workflows.

This release adds light/dark/system themes, a redesigned explanatory landing page, consultation notes, clinician-entered prescription drafts, patient visit briefs, follow-up tasks, a source-linked Pune directory and first-aid references. See `docs/USER-GUIDE.md` for each workflow and `docs/SOURCES.md` for coverage and provenance. Prescription outputs are explicitly unsigned drafts, not valid for dispensing; no medicine or dose is recommended by the software.

## Try it

Open the website, select **Explore the demo**, and use the coordinator view. Open Asha's plan to see connected requirements and appointments. Use **Report delay**, **Review timing**, **Confirm received**, and **Confirm updated plan** to see how readiness changes. Switch the demo role to see the patient itinerary. Open **Doctor workbench** for notes, prescription drafts and follow-ups; open **Prepare for visit** for the patient's questions and checklist.

Settings lets you export, reset or delete the fictional records. Each browser or app installation has its own records; they do not sync across devices. Tabs on the same origin refresh saved workspace changes; stale saves are rejected. Closing the app keeps saved data. Care-record editing is disabled offline after the first web visit; public directory bookmarks remain device-local. Android bundles the app assets. Original external source pages need internet access.

## Run the website locally

Requires Node.js 24 and npm. From this folder:

```sh
npm ci
npm run dev
```

Open the local address printed by the server. To build the website:

```sh
npm test
npm run build
npm run preview
```

`dist/` contains a static website that can be served over HTTPS. Hash routes mean no server-side route rewrite is required. Keep the service worker and all generated assets together. Do not double-click index.html; serve the folder with a web server.

## Browser tests

Install Google Chrome, keep the local server running, then run `npm run test:e2e`. To check the production service worker, run the preview server on port 4173, set `CAREROUTE_TEST_URL=http://127.0.0.1:4173`, and run the same command. The offline reload test is skipped without that variable. Test output and traces appear under test-results and playwright-report.

## Android build

Requires JDK 21, Android SDK platform 36, build tools 36.0.0, and accepted Android SDK licences. Configure JAVA_HOME and ANDROID_HOME, or open android/ in Android Studio and let it locate the SDK.

```sh
npm run android:sync
```

On Windows:

```powershell
.\android\gradlew.bat -p android assembleDebug
```

APK output: android/app/build/outputs/apk/debug/app-debug.apk. Application ID: in.careroute.app. Minimum supported API: 24. This is a debug build for evaluation, not a Play Store release. Transfer the APK to an Android phone and open it to install, allowing that chosen file source if Android asks. Keep the signing identity stable for future updates.

The Android **Share plan** button opens a text itinerary through the system share sheet. Calendar and JSON exports use private cache files and the same share sheet. On the web, these actions download files and **Print plan** opens the browser print dialog. Files shared or downloaded remain outside the app until their owner deletes them.

## Project structure

- src/domain: dependency graph, validation, readiness, operations, calendar export and tests.
- src/demo: fictional seed records and persistent local store.
- src/main.tsx and src/styles.css: responsive website and app interface.
- src/platform.ts: web downloads and Android file sharing.
- src/features: themes, landing page, clinician tools, patient preparation and public resources.
- src/data: directory facts and first-aid/reference source links.
- tests: real-browser workflow tests.
- android: native Capacitor project.
- docs/RELEASE.md: verification and limitations.
- docs/PRODUCTION-PLAN.md: work required for a real pilot.

Dependencies are recorded in package-lock.json. No paid AI service, API key or Lovable subscription is required to run this version. Fonts and icons are bundled locally. Hindi support is a partial draft for patient labels, not a complete or reviewed translation.

## Deployment and ownership

This portable repository omits the original hosting manifest. Deploy dist/ to a static host with your own hosting configuration. A private preview is not a public launch. The user does not currently own a domain, so the existing hosted address is retained. CareRoute's interface and Android identity use CareRoute branding; the hosting platform's address and access screen are not controlled by the app.

Do not commit credentials, signing keys, real patient exports, node_modules or local SDK paths. Android backup is disabled. Before using real records, implement the controls in docs/PRODUCTION-PLAN.md and complete the release checks.

## Implementation references

Native export follows the official Capacitor Share and Filesystem APIs:
- https://capacitorjs.com/docs/apis/share
- https://capacitorjs.com/docs/apis/filesystem

Third-party code and fonts retain their own licences. No patent, clinical validation, hospital partnership or commercial result is claimed.

## Release 0.3 reference expansion
Includes a searchable NHS topic-link index and source-update access. See docs/MEDICAL-INFORMATION-AUDIT.md for the precise scope, checks, gaps and update workflow. No comprehensive medical knowledge or automatic clinical-update guarantee is made.

## Connected visit planner

The hosted site uses Sites authentication and a D1 database. The landing page links to My visits for signed-in users. The planner saves visit labels, facilities, dates, times, checklists and statuses. It also supports JSON export and deletion.

Run `node --test worker/account.test.mjs` to verify the API against SQLite. Run `npm run build:site` to package the worker from the frontend build. The worker must run behind the Sites authenticated dispatcher and requires the DB binding and the SQL migration in drizzle/. Local Vite and standalone Android builds can open the hosted sign-in link.
