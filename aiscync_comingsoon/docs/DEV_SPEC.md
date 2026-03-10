# AidSync — Dev Spec / Brief

## 1. Project Summary

**AidSync** is an offline-first mobile field-care app for clinicians operating in low-connectivity environments such as rural outreach, disaster response, and conflict-affected areas.

Its core differentiator is **Medication Insert Intelligence**:

- the clinician scans a medicine insert / leaflet / package information sheet
- OCR extracts raw text locally or near-locally
- a lightweight extraction pipeline converts that text into structured medication safety data
- an on-device **Dart rules engine** compares that extracted data against the patient's allergies, conditions, and current medications
- warnings, cautions, and summaries are saved into the encounter history
- all data syncs through **PowerSync** when connectivity is available

This is **not** a diagnosis engine and **not** a prescribing authority.
It is a **clinical safety assist** and **field workflow tool**.

---

## 2. Hackathon Positioning

### Core story
AidSync helps field clinicians continue working when the network is unreliable, while reducing medication mistakes by turning paper medicine inserts into structured safety checks tied to patient history.

### Why it fits PowerSync
- patient records must be available offline
- encounter updates must be written locally first
- medication checks must persist locally even if cloud access is unavailable
- sync later is part of the product, not infrastructure wallpaper

### Why it fits Supabase bonus
- Supabase Auth
- Supabase Postgres as primary backend
- Supabase Storage for scan images / attachments
- optional Edge Functions for cloud-side fallback extraction / post-sync processing

### Why it fits Cactus
Use Cactus for:
- clinician voice-note transcription
- hybrid on-device + cloud routing for unreliable field conditions
- optional note summarization / structured encounter capture

### Why Python still belongs
Use Python for:
- seed data generation
- OCR preprocessing / experiments
- medicine insert fixture preparation
- extraction prototyping
- local tooling for demo prep

Python is **not** part of the main runtime safety path.

---

## 3. Product Goals

### Primary goals
- Enable field clinicians to access and update patient encounter data offline
- Turn medicine inserts into structured medication metadata
- Run patient-context medication safety checks on-device
- Save the check result as part of the patient’s encounter history
- Sync everything cleanly when connectivity returns

### Non-goals
- full EMR
- diagnosis generation
- prescription authority
- insurance / billing
- hospital management
- complex enterprise RBAC
- HL7 / FHIR perfection theater

---

## 4. Users

### Primary users
- field doctors
- outreach clinicians
- mobile nurses
- NGO medical teams
- disaster-response medical staff

### Secondary users
- supervisors reviewing synced case logs
- care teams receiving patient handoff summaries

---

## 5. Core User Flow

1. Clinician opens app and selects or creates patient
2. App loads patient record instantly from local SQLite
3. Clinician records encounter details
4. Clinician scans medicine insert / leaflet
5. OCR extracts text from insert
6. Extraction layer converts insert text into strict structured JSON
7. Dart rules engine compares medication data against:
   - allergies
   - current meds
   - conditions
   - age / pregnancy flags
8. App shows warning severity and reasons
9. Clinician accepts / dismisses / notes the warning
10. Result is stored in encounter history
11. PowerSync syncs records when network returns

---

## 6. MVP Scope

### P0 — Must Ship
- patient list
- patient detail
- encounter creation
- current medications
- allergy list
- scan insert / upload image
- OCR pipeline
- medication insert JSON extraction
- deterministic interaction / contraindication checks in Dart
- local save of warnings into patient history
- PowerSync sync between device and backend

### P1 — Strong Enhancers
- voice note attached to encounter
- AI encounter summary
- clinician review / confidence score on extraction
- sync status / pending changes UI
- handoff summary screen

### P2 — Nice but dangerous
- barcode lookup
- multilingual insert parsing
- dosage calculators
- offline search over previous warnings
- web dashboard
- live collaboration between multiple clinicians on the same case

---

## 7. Technical Architecture

## Frontend
- **Flutter**
- local state kept deliberately light
- SQLite via PowerSync client
- camera / image picker for insert scans
- offline-first UX

## Backend
- **Supabase**
  - Auth
  - Postgres
  - Storage
  - optional Edge Functions

## Sync
- **PowerSync**
  - local SQLite on device
  - sync rules for patients, encounters, meds, warnings, and attachments metadata

## AI / Extraction
Preferred hybrid approach:
- OCR on-device if practical
- extraction by:
  - lightweight on-device processing where feasible, or
  - Supabase Edge Function fallback when online
- strict JSON schema output only

## Notes / Voice
- **Cactus**
  - doctor voice note transcription
  - hybrid on-device/cloud routing
  - optional note summarization or structuring

## Safety Logic
- **Dart rules engine**
  - allergy overlap
  - duplicate ingredient checks
  - med interaction checks
  - contraindication checks
  - pregnancy / lactation caution flags

## Tooling
- **Python**
  - fixture generation
  - OCR experimentation
  - seed scripts
  - local evaluation helpers

---

## 8. Recommended Repo Structure

```txt
mobile/
  lib/
    core/
    features/
      patients/
      encounters/
      medication_scan/
      interaction_check/
      sync/
    shared/
backend/
  supabase/
    migrations/
    seed/
    functions/
tools/
  seed/
  ocr/
  fixtures/
  evaluation/
docs/
  DEV_SPEC.md
  BRAND_VOICE.md
  STYLE_GUIDE.md
  ARCHITECTURE.md
README.md
```

---

## 9. Data Model

## patients
- id
- external_id
- full_name
- dob
- sex
- pregnancy_status
- location_text
- created_at
- updated_at

## patient_allergies
- id
- patient_id
- allergen_name
- allergen_type
- severity
- notes

## patient_conditions
- id
- patient_id
- condition_name
- notes

## current_medications
- id
- patient_id
- med_name
- active_ingredients_json
- dose_text
- route_text
- started_at

## encounters
- id
- patient_id
- clinician_id
- encounter_type
- notes_text
- ai_summary
- status
- created_at
- updated_at

## vitals
- id
- encounter_id
- temperature_c
- pulse_bpm
- blood_pressure_sys
- blood_pressure_dia
- spo2
- respiration_rate
- weight_kg

## scanned_inserts
- id
- encounter_id
- image_path
- raw_ocr_text
- extracted_json
- extraction_confidence
- extraction_status
- reviewed_by_clinician
- created_at

## interaction_checks
- id
- encounter_id
- scanned_insert_id
- result_status
- severity
- warnings_json
- clinician_action
- clinician_note
- created_at

## attachments
- id
- encounter_id
- storage_path
- mime_type
- created_at

---

## 10. JSON Extraction Schema

```json
{
  "medicine_name": "string",
  "brand_name": "string",
  "active_ingredients": ["string"],
  "indications": ["string"],
  "contraindications": ["string"],
  "drug_interactions": [
    {
      "substance": "string",
      "effect": "string",
      "severity": "low|medium|high|unknown"
    }
  ],
  "pregnancy_warning": "string",
  "lactation_warning": "string",
  "dosage_guidance": "string",
  "age_warnings": ["string"],
  "source_sections": {
    "contraindications": "string",
    "interactions": "string",
    "dosage": "string"
  },
  "confidence": 0.0
}
```

---

## 11. Safety Check Responsibilities

## Extraction layer does
- clean / normalize OCR text
- section extraction
- strict JSON structuring
- concise summary generation

## Dart rules engine does
- allergy overlap detection
- active ingredient duplication
- medication interaction matching
- condition contraindication matching
- age / pregnancy / lactation warning mapping
- warning severity generation

This split is non-negotiable.
Do not let the extraction layer act like a doctor.

---

## 12. Interaction Check Logic

### Inputs
- patient allergies
- patient conditions
- current medications
- extracted insert metadata

### Outputs
- warning list
- severity
- reasoning
- clinician action stored in history

### Example warnings
- **RED**: ingredient conflicts with known severe allergy
- **RED**: extracted insert lists active interaction with existing patient medication
- **YELLOW**: pregnancy warning present
- **YELLOW**: duplicate therapy risk
- **GREEN**: no obvious rule match found, manual review still required

---

## 13. Screens

## 1. Login / Session
Simple auth flow

## 2. Patient Queue
- search
- recent patients
- sync status badge
- offline state banner

## 3. Patient Detail
- demographics
- allergies
- conditions
- current medications
- encounter history

## 4. New Encounter
- notes
- vitals
- attachment add
- scan insert CTA
- voice note CTA

## 5. Medication Scan Review
- captured image
- OCR text preview
- structured extraction preview
- confidence label
- edit / confirm

## 6. Safety Check Result
- warnings
- severity
- reasoning
- clinician decision
- save to history

## 7. Sync / Activity
- pending local writes
- sync complete
- failed items if any

---

## 14. UX Principles

- local-first by default
- immediate response, minimal spinners
- status always visible
- severity colors reserved for safety warnings
- no dense medical dashboard chaos
- camera and scan flow should feel fast and obvious
- every safety check result should show *why* it triggered

---

## 15. Demo Script

1. Open app with internet on
2. Search patient and open patient history
3. Start new encounter
4. Add note and current patient context
5. Record doctor voice note
6. Scan medicine insert
7. Show OCR + extracted JSON
8. Run safety check
9. Show warning triggered from allergy / current med overlap
10. Save result into encounter history
11. Disable network
12. Add another encounter offline
13. Show pending sync state
14. Re-enable network
15. Show synced record / handoff summary

---

## 16. Build Strategy

### Best route
- ship one amazing flow
- fake nothing essential
- constrain inserts to a few known demo samples
- keep data model small
- make sync visible
- make safety reasoning visible

### Avoid
- building generic CRUD pages forever
- pretending to be a licensed medical authority
- overcomplicating the AI layer
- trying to support every drug on earth

---

## 17. Judging Angle

### Originality
Offline scan-to-safety workflow tied to patient history

### Impact
Medication safety support in low-connectivity field settings

### Implementation quality
Clear architecture, strong local-first UX, strict structured extraction

### PowerSync usage
Core to patient state, encounter writes, and later sync

### UX
Fast, clear, clinically calm, obvious warning reasoning

---

## 18. Sponsor Tech Recommendation

### Strong recommendation
Use:
- **Flutter**
- **Supabase**
- **PowerSync**
- **Cactus**
- **Dart on-device rules engine**

### Optional if time remains
- **TanStack** for a small web review dashboard

### Do not force
- Rust SDK
- Neon
- Mastra

Most credible stack for shipping:
- Flutter + Supabase + PowerSync + Cactus + Dart rules engine + Python tooling
