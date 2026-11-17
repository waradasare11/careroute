# CareRoute expanded workspace implementation plan

> For agentic workers: use superpowers:executing-plans to implement task by task.

**Goal:** Deliver a clearer multi-role demonstration with themes, clinician tools and sourced information.

**Architecture:** Keep the existing journey domain and shell. Split new public and clinician experiences into focused components. Use versioned browser-local feature storage with explicit errors. Deploy the same built assets to the private site and Android project.

**Tech Stack:** React, TypeScript, Vite, Capacitor, Vitest, Playwright.

**Spec:** docs/superpowers/specs/2026-11-16-care-workspace.md

## Global constraints
- Fictional records only; no fake authentication, medical approval, provider partnerships or AI-training claims.
- Prescription output is a draft with no medicine/dose recommendations.
- Directory facts carry official source URLs and retrieval dates; missing values stay unknown.
- Keep the existing private site identity and all original coordination flows.

## Review focus
- Empty/partial prescriptions, duplicate medicine names and invalid dates must not appear issued or approved.
- Storage errors and corrupted extra data must be visible; reset/deletion must cover new records.
- Patient view must not reveal clinician editing controls or other patients' notes.
- Dark-mode text, keyboard focus and mobile width must remain readable and usable.
- Emergency resources must not delay contacting emergency services or promise a medical assessment.

## Tasks
- [x] Add theme provider and redesigned landing page with role explanations, capabilities and limitations.
- [x] Add tested consultation/prescription draft model, storage and doctor workbench.
- [x] Add visit preparation, queue/follow-up views and scoped patient summaries.
- [x] Add sourced Pune directory with search/filter/favourites and a sourced first-aid/evidence library.
- [x] Integrate navigation, reset/delete, keyboard/mobile handling and current feature disclosures.
- [x] Run domain and browser checks, inspect both themes, correct observed failures, review final changes.
- [ ] Publish the updated private site, build Android, verify archives and document remaining launch requirements.


