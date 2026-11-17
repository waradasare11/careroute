# Medical information and claims audit — 17 November 2026

## What was checked

Reviewed the landing-page statements, role descriptions, clinician tools, prescription output, first-aid cards, provider directory, reference library and local-data boundaries. The app is a demonstration with reference access. It is not a doctor, trained medical model, complete clinical database or live hospital service.

## Changes in 0.3

- Added a searchable index of 898 NHS condition/symptom and medicine topic links, with publisher, retrieval date, category filters and external-source access. Only titles and URLs are stored, not complete articles or drug dosing data.
- Added access to MedlinePlus disease/treatment and medicine references, WHO fact sheets/outbreak updates and fuller St John Ambulance first-aid guidance.
- Explicitly state that the app does not automatically download medical updates, search symptoms for a diagnosis, verify drug interactions or contain all specialist knowledge.
- Corrected the burn card's emergency criteria to include burns on the bottom, matching the currently checked NHS source.
- Added a manual index-refresh script and a weekly GitHub Actions review workflow. It produces a proposed index and diff for human review; it does not auto-publish medical changes. Its operation depends on GitHub Actions being enabled and successful network requests. Scheduled execution is not guaranteed to be immediate or always available.

## Source checks and limitations

NHS conditions and medicine indexes were fetched on 17 November 2026; 898 distinct URLs were extracted. The indexed articles were not all individually reviewed. Current NHS burns guidance, American Red Cross unresponsive-person guidance, MedlinePlus reference pages, WHO reference/update pages and St John Ambulance first-aid index were checked. The British Red Cross choking page returned HTTP 403 in this audit; its previously retrieved summary was not represented as freshly reverified. Directory coverage remains the 16 November snapshot: 16 facilities, 344 Ruby Hall doctor listings, not every Pune provider.

Clinical gaps remain: no licensed comprehensive Indian medicine database; no patient-specific diagnosis, dose calculation, interaction/allergy safety engine, live alerts, clinical validation or verified clinician identity. Source articles may be unavailable, change, use foreign emergency numbers or describe products/services unavailable in India. Emergency escalation remains 112 for India. Not all diseases have a cure. No outcome, accuracy, completeness, approval or market-readiness guarantee is made.

This is a software/content review, not clinical certification. A qualified clinician must review the intended clinical use, full emergency protocols, age-specific guidance and content governance before real patient deployment. Do not enter real patient data into the demo.

## Updating the knowledge index

Run `python scripts/refresh-health-index.py` using Python 3.12 or later with internet access. Review the JSON diff, changes in source terms, removed links and scope, then run tests/build and publish an approved release. If retrieval yields an unexpectedly small index, the script fails and preserves the previous file. No full copyrighted drug monographs are copied.

The private GitHub Actions workflow `Review reference index updates` runs weekly and can be run manually. Download its review artifact; review and merge deliberately. Changes do not become available to existing web or Android users until the website is deployed or a new app release is installed. This is update assistance, not a claim that the application is always 100% current.

## Main references

- https://www.nhs.uk/conditions/
- https://www.nhs.uk/medicines/
- https://www.nhs.uk/conditions/burns-and-scalds/
- https://www.redcross.org/take-a-class/resources/learn-first-aid/unresponsive-and-breathing-person
- https://medlineplus.gov/healthtopics.html
- https://medlineplus.gov/druginformation.html
- https://www.who.int/news-room/fact-sheets
- https://www.who.int/emergencies/disease-outbreak-news
- https://www.sja.org.uk/first-aid-advice/
