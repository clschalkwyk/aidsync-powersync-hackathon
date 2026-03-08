# AidSync

AidSync is an offline-first field medication safety system for clinicians working in low-connectivity environments.

It is designed for rural outreach, disaster response, and similar settings where patient care must continue even when the network does not.

The core workflow is:

1. `Prepare`
2. `Sync`
3. `Check`
4. `Record`
5. `Sync back`

## Product Narrative

AidSync is not just a leaflet scanning app.

The stronger system is:

- medication safety reference data is prepared online
- that reference data is synced to field devices through PowerSync
- clinicians use the local data offline during care sessions
- encounter outcomes sync back when connectivity returns

This makes PowerSync central to the product rather than incidental infrastructure.

## What AidSync Does

AidSync helps teams:

- ingest and normalize medication leaflet data online
- publish medication safety reference data to devices
- sync patient records and reference data into local SQLite
- run medication suitability checks offline against patient context
- record clinician reasoning and actions locally first
- sync encounter outcomes back to the backend later

## What AidSync Is Not

AidSync is not:

- a diagnosis engine
- an autonomous prescribing system
- a full EMR
- a replacement for clinician judgment

The product is best understood as a clinical safety assist plus field workflow tool.

## Primary System Design

### Online surfaces

The online surface prepares medication knowledge for field use:

- ingest leaflet content or medication reference data
- review and normalize decision-critical medication safety fields
- manage a medication catalog and safety reference data
- review synced encounters and clinician actions

### Offline field surface

The mobile app handles the care session itself:

- open synced patient records from local SQLite
- start and update encounters offline
- review allergies, conditions, and current medications
- select or scan medication data available on-device
- run deterministic local safety checks
- save the outcome locally

### Sync loop

PowerSync keeps shared state moving between both sides:

- medication reference data syncs down to devices
- encounter results sync back up
- local SQLite remains the primary runtime data plane on device

## Why This Exists

In field care settings, connectivity often fails at exactly the wrong time.

AidSync keeps the critical workflow local-first:

- patient history remains available offline
- medication reference data remains queryable offline
- encounter updates succeed locally
- safety checks run against local patient context
- sync happens later through PowerSync when the connection returns

## Core Product Flow

1. A supervisor or operator ingests medication reference data online
2. The reviewed medication data is stored in Supabase/Postgres
3. PowerSync Sync Streams sync that medication reference data to local SQLite on devices
4. A clinician opens a patient record from local storage
5. The clinician starts a new encounter offline if necessary
6. The clinician selects or scans a medication leaflet
7. The app resolves decision-critical medication safety data
8. A deterministic Dart rules engine compares the medication data against:
   - allergies
   - current medications
   - known conditions
   - pregnancy or age-related cautions
9. The app shows an explainable result such as:
   - `Safe to consider`
   - `Use caution`
   - `Do not give`
   - `Manual review required`
10. The clinician stores the outcome in encounter history
11. PowerSync syncs the encounter updates back to Supabase when the network is available

## Tech Stack

- `Flutter` for the mobile app
- `PowerSync` for local SQLite sync using Sync Streams
- `Supabase` for Auth, Postgres, and Storage
- `Dart` rules engine for deterministic medication safety checks
- `Cactus` for hybrid doctor note transcription
- `Python` for tooling, fixtures, evaluation helpers, and experiments

## Why PowerSync Matters

AidSync depends on PowerSync for the product to make sense.

PowerSync is not included as a generic sync checkbox. It is the layer that makes the main demo credible:

- patient records are queryable locally in SQLite
- medication reference data is synced to field devices
- encounter writes succeed offline
- local safety checks run against local patient state and local medication data
- updates reconcile later when connectivity returns

This is the central technical story of the project.

## Sponsor-Tech Fit

### PowerSync

Used meaningfully for:

- syncing patient data and medication reference data to local SQLite
- enabling offline encounter creation and updates
- keeping the app usable under intermittent connectivity
- syncing clinician decisions, warnings, and encounter history back upstream

### Supabase

Used meaningfully for:

- authentication
- primary Postgres system of record
- storage for attachments and scan assets
- online medication reference ingestion and review workflows

### Cactus

Used meaningfully for:

- hybrid on-device/cloud transcription of clinician voice notes
- fast note capture during treatment

## Current Workspace Layout

```txt
aidsync/                 Flutter app for field clinicians
aidsync_dashboard/       Dashboard/docs and online review surface
aidsync_gemma/           Gemma extraction experiment app
powersync/               PowerSync sync streams and notes
supabase/                Supabase config, migrations, and seed files
```

## Current Hackathon Focus

The strongest version of AidSync is:

An offline-first medication safety copilot where medication reference data is prepared online, synced to field devices with PowerSync, used locally during disconnected care sessions, and synced back into a reviewable audit trail when connectivity returns.

That means the current focus is:

- one strong end-to-end mobile workflow
- one clear online medication reference workflow
- visible offline behavior
- visible sync recovery
- explainable safety reasoning

## MVP Scope

### Must Ship

- patient list
- patient detail
- encounter creation
- allergies and current medications
- medication reference data available locally on device
- leaflet or medication ingestion online
- deterministic safety checks in Dart
- local save of warning outcomes into encounter history
- PowerSync sync between device and backend using Sync Streams

### Strong Enhancers

- voice note attached to encounter
- sync status and pending changes UI
- extraction confidence and manual review controls
- lightweight online review dashboard

## Demo Flow

1. Open the dashboard online
2. Load or review medication safety reference data
3. Show that the medication data syncs to the mobile device
4. Open the mobile app and load patient data from local SQLite
5. Start a new encounter
6. Run an on-device safety check against local patient context and local medication data
7. Save the result locally
8. Turn connectivity off and continue working
9. Turn connectivity back on and show successful sync
10. Review the synced outcome in the dashboard

## Example Decision Output

Patient context:

- allergy: penicillin
- current medication: warfarin
- condition: pregnancy

Medication reference data:

- active ingredient: amoxicillin
- major interaction warning: anticoagulants
- pregnancy caution present

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
