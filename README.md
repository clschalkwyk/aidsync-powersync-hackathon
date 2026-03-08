# AidSync

AidSync is an offline-first field medication safety app for clinicians working in low-connectivity environments.

It is designed for rural outreach, disaster response, and similar settings where patient care must continue even when the network does not.

The core workflow is:

1. `Scan`
2. `Check`
3. `Record`
4. `Sync`

## What AidSync Does

AidSync helps clinicians:

- access synced patient records from local SQLite
- create and update encounters offline
- review allergies, conditions, and current medications before treatment decisions
- scan medicine inserts or leaflets
- extract decision-critical medication safety data from OCR text
- compare that data against patient context on-device
- save warnings, reasoning, and clinician actions into encounter history
- sync updates back to the backend when connectivity returns

## What AidSync Is Not

AidSync is not:

- a diagnosis engine
- an autonomous prescribing system
- a full EMR
- a replacement for clinician judgment

The product is best understood as a clinical safety assist plus field workflow tool.

## Why This Exists

In field care settings, connectivity often fails at exactly the wrong time.

AidSync keeps the critical workflow local-first:

- patient history stays available offline
- encounter updates can be created locally
- medication checks can run against local patient context
- sync happens later through PowerSync when the connection returns

## Core Product Flow

1. A clinician opens a patient record from local storage
2. The clinician starts a new encounter
3. The clinician records notes, vitals, attachments, or voice notes
4. The clinician scans a medicine leaflet or insert
5. OCR extracts raw text
6. The app extracts decision-critical medication safety data
7. A deterministic Dart rules engine compares the medication data against:
   - allergies
   - current medications
   - known conditions
   - pregnancy or age-related cautions
8. The app shows an explainable result such as:
   - `Safe to consider`
   - `Use caution`
   - `Do not give`
   - `Manual review required`
9. The clinician stores the outcome in encounter history
10. PowerSync syncs the data back to Supabase when the network is available

## Tech Stack

- `Flutter` for the mobile app
- `PowerSync` for local SQLite sync
- `Supabase` for Auth, Postgres, and Storage
- `Dart` rules engine for deterministic medication safety checks
- `Cactus` for hybrid doctor note transcription
- `Python` for tooling, fixtures, evaluation helpers, and experiments

## Why PowerSync Matters

AidSync depends on PowerSync for the product to make sense.

PowerSync is not included as a generic sync checkbox. It is the layer that makes the main demo credible:

- patient records are queryable locally in SQLite
- encounter writes succeed offline
- medication checks run against local patient state
- updates reconcile later when connectivity returns

This is the central technical story of the project.

## Sponsor-Tech Fit

### PowerSync

Used meaningfully for:

- syncing patient data and reference data to local SQLite
- enabling offline encounter creation and updates
- keeping the app usable under intermittent connectivity
- syncing interaction check history and clinician actions back upstream

### Supabase

Used meaningfully for:

- authentication
- primary Postgres system of record
- storage for attachments and scan assets
- optional backend workflows and review tooling

### Cactus

Used meaningfully for:

- hybrid on-device/cloud transcription of clinician voice notes
- fast note capture during treatment

## Current Workspace Layout

```txt
aidsync/                 Flutter app for field clinicians
aidsync_dashboard/       Supporting dashboard/docs area
aidsync_gemma/           Gemma extraction experiment app
powersync/               PowerSync sync streams and notes
supabase/                Supabase config, migrations, and seed files
```

## Current Hackathon Focus

The strongest version of AidSync is:

An offline-first field medication safety copilot where clinicians can scan a medicine leaflet, extract decision-critical safety data, compare it against local patient history, store the outcome locally, and rely on PowerSync to reconcile everything later.

That means the current focus is:

- one strong end-to-end mobile workflow
- visible offline behavior
- visible sync recovery
- explainable safety reasoning
- a minimal online review surface, not a large dashboard

## MVP Scope

### Must Ship

- patient list
- patient detail
- encounter creation
- allergies and current medications
- scan leaflet or upload image
- OCR pipeline
- extraction of decision-critical medication safety fields
- deterministic safety checks in Dart
- local save of warning outcomes into encounter history
- PowerSync sync between device and backend

### Strong Enhancers

- voice note attached to encounter
- sync status and pending changes UI
- extraction confidence and manual review controls
- lightweight review dashboard

## Demo Flow

1. Open the app online and sync patient data
2. Open a patient record from local SQLite
3. Start a new encounter
4. Scan or upload a medicine leaflet
5. Show extracted medication safety data
6. Run an on-device safety check against patient context
7. Save the result locally
8. Turn connectivity off and continue working
9. Turn connectivity back on and show successful sync
10. Optionally review the synced result in the dashboard

## Example Decision Output

Patient context:

- allergy: penicillin
- current medication: warfarin
- condition: pregnancy

Scanned medication data:

- active ingredient: amoxicillin
- interaction warning: anticoagulants
- pregnancy warning present

Expected result:

- severe allergy warning
- medication interaction warning
- pregnancy caution
- clinician review required

## Roadmap After MVP

- broader leaflet support
- configurable medicine catalogs and formularies
- richer contraindication and interaction rules
- multilingual support
- stronger audit and review workflows
- dashboard-driven medication reference updates synced back to devices
