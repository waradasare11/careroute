# Source coverage and maintenance

Public-source retrieval date: **16 November 2026**. Verification of code and packaging is separate from verification of medical content or professional credentials.

## Directory

`src/data/resources.ts` contains 16 facility listings selected from the Pune district public-utility directory and hospitals' own websites. `src/data/pune-doctors.json` contains 344 unique doctor names transcribed from Ruby Hall Clinic's public directory, with listed specialties where available. Missing specialties are marked as not stated. No ratings, fees, registration verification, appointment slots or schedules were invented. A conflicting government listing was excluded rather than reconciled by guessing.

Sources used:

- https://pune.gov.in/en/public-utility-category/hospitals/
- https://rubyhall.com/find-a-doctor/
- https://rubyhall.com/
- https://www.kemhospitalpune.org/
- https://www.jehangirhospital.com/
- https://www.dmhospital.org/contact-us
- https://bharatihospital.com/contact/
- https://bjgmcpune.com/contact-us/

This is a bounded snapshot, not a Pune census. Doctor coverage currently comes from one hospital directory. Listing is not endorsement, credential verification, a partnership or proof of current affiliation. Contact details and access restrictions may change. Map links are name/address searches, not verified coordinates. No private contact details are collected.

Before commercial expansion: review source terms and reuse rights; obtain authorised feeds where needed; provide a correction channel; track each record's provenance and last review; reconcile duplicates and branch identity; verify professional registration through authorised processes; periodically recheck published information. Do not label a record verified merely because a website contains it.

## First-aid and reference content

Four short educational cards link to original guidance:

- Heat burns and scalds: https://www.nhs.uk/conditions/burns-and-scalds/
- Adult heavy bleeding: https://www.redcross.org.uk/first-aid/learn-first-aid/bleeding-heavily
- Adult choking recognition: https://www.redcross.org.uk/first-aid/learn-first-aid/choking
- Unresponsive person: https://www.redcross.org/take-a-class/resources/learn-first-aid/unresponsive-and-breathing-person
- India emergency information: https://112.gov.in/faq

The app uses India's 112 emergency number; linked international sources use their own emergency numbers. The cards are brief summaries, not complete protocols, symptom triage or clinically validated instructions for every age or circumstance. Training and professional emergency guidance remain necessary. A qualified clinical reviewer should approve intended use, wording and maintenance before a real medical service launches.

The library additionally links ICMR Standard Treatment Workflows, government-hosted 2020 Telemedicine Practice Guidelines, Indian Red Cross training and KEM's doctor directory. A link to a guideline is not a declaration of regulatory compliance or a guarantee that no amendments exist.

- https://www.icmr.gov.in/standard-treatment-workflows-stws
- https://lgbrimh.gov.in/resources/telemedicine/guidelines/guidelines.pdf
- https://www.indianredcross.org/ircs/program/firstaid/
- https://www.kemhospitalpune.org/find-a-doctor/

## No training claim

No model training, clinical dataset purchase, licensed drug database, patient-specific medical analysis or comprehensive world-data review was performed. The implemented library is a collection of links and the prescription builder records manually entered instructions. Evaluation of any future clinical AI needs a separate intended-use specification, lawful data access, clinician-led validation, privacy controls and monitoring.
