# AidSync Mobile Screen Brief

Updated: 2026-03-14

## Goal

This brief defines the core mobile screens AidSync needs, why each screen exists, and which data each screen should consume or create.

The product is an offline-first medication safety sidekick for field clinicians.

The mobile app should feel:

- calm
- fast
- local-first
- explainable
- clinically useful under pressure

It should not feel like:

- a debugging console
- a generic admin app
- an AI demo

## Core Mobile Story

1. clinician unlocks the app
2. sees local readiness and next actions
3. opens a patient file
4. reviews allergies, conditions, and current medications
5. runs a medication suitability check from synced local reference data
6. reviews explicit reasons
7. records the clinical action locally
8. syncs back later when connectivity returns

## Primary Screens

## 1. Sign-In Screen

### Purpose

Authenticate online once and restore a working session for offline use later.

### Primary actions

- sign in with email/password
- show sign-in failure clearly

### Data involved

- Supabase Auth session
- user identity

### Notes

- this is not part of the main care workflow
- it should be simple and short

## 2. PIN Unlock Screen

### Purpose

Let a previously authenticated clinician re-enter the app offline using a local device PIN.

### Primary actions

- unlock with 4-digit PIN
- set PIN on first use
- clear/reset PIN if needed

### Data involved

- cached Supabase session presence
- local PIN state

### Notes

- this is the offline entry point
- should feel fast and trustworthy

## 3. Briefing Screen

### Purpose

Act as the field-ready home screen.
Show whether local data is ready, what the clinician can do next, and whether sync is active or paused.

### Primary actions

- open patients
- start medication assessment
- refresh sync
- sign out
- reset PIN

### Data involved

- sync state from PowerSync
- local reference-data counts
- local patient count
- local interaction-check count
- last sync / connection state

### Recommended content

- status banner:
  - device ready
  - local-only mode
  - sync paused
- quick actions
- key counts:
  - patients
  - medications
  - ingredients
  - checks
- recent local checks

### Notes

- keep sync visible but not dominant
- this is a clinician briefing surface, not a technical dashboard

## 4. Patient Queue Screen

### Purpose

Show locally available patient files and let the clinician quickly open one for review.

### Primary actions

- browse local patients
- select a patient
- refresh queue
- add patient locally

### Data involved

- `patients`

### Recommended content

- patient cards with:
  - full name
  - age
  - sex
  - location
- active patient selection state

### Notes

- should feel like a field caseload
- avoid raw database presentation

## 5. Patient Detail Screen

### Purpose

Provide the local patient context needed before medication decisions are made.

### Primary actions

- review allergies
- review conditions
- review current medications
- proceed into medication assessment

### Data involved

- `patients`
- `patient_allergies`
- `patient_conditions`
- `current_medications`

### Recommended content

- patient identity header
- context chips:
  - age
  - sex
  - pregnancy/lactation
  - location
- separate sections:
  - allergies
  - conditions
  - current medications

### Notes

- this screen must support safe context review quickly
- it should clearly answer:
  - who is this patient?
  - what are the known risks?

## 6. Patient Entry Screen

### Purpose

Create a new patient locally when a clinician is offline or in the field.

### Primary actions

- capture minimum patient identity
- capture sex / pregnancy context
- capture location
- save locally

### Data involved

- creates `patients`

### Recommended fields

- full name
- date of birth
- sex
- pregnancy status when relevant
- location or facility

### Notes

- this should be fast and forgiving
- local-first save behavior must be obvious

## 7. Medication Assessment Screen

### Purpose

Run the local medication suitability workflow using synced reference data and local patient context.

### Primary actions

- choose patient
- choose medication
- run/review assessment
- proceed to record encounter

### Data involved

- `patients`
- `patient_allergies`
- `patient_conditions`
- `current_medications`
- `medication_catalog`
- `medication_catalog_ingredients`
- `medication_interaction_rules`
- `medication_contraindication_rules`

### Recommended content

- patient selector
- medication selector
- outcome badge:
  - safe to consider
  - use caution
  - do not give
  - manual review
- medication identity
- ingredient chips
- explicit reasons list

### Notes

- this is the core decision-support screen
- reasoning must be explicit and local
- this should never feel like opaque AI output

## 8. Assessment Result / Decision Card

### Purpose

Present the assessment outcome in a format that supports clinician judgment and next action.

### Primary actions

- read summary
- review reasons
- proceed to encounter record

### Data involved

- generated local assessment object
- medication data
- patient context
- matched ingredient names

### Recommended content

- strong outcome banner
- one-line summary
- explicit reasons grouped by severity
- clear next step:
  - record encounter

### Notes

- may be part of the assessment screen or a separate presentation layer within it

## 9. Encounter Record Screen

### Purpose

Capture what the clinician actually decided and save it locally first.

### Primary actions

- choose clinician action
- add note
- save locally

### Data involved

- creates `encounters`
- creates `interaction_checks`

### Recommended content

- patient name
- medication summary
- check outcome summary
- clinician action selector:
  - accept warning
  - dismiss warning
  - add note only
- encounter note field
- local save confirmation

### Notes

- this is the audit trail point
- should be quick and unambiguous

## 10. Local Sync State Surface

### Purpose

Show whether the device is ready, syncing, or paused, without turning the app into a technical console.

### Primary actions

- refresh sync
- understand whether local workflows can continue

### Data involved

- PowerSync status
- local counts
- pending local writes if available

### Recommended content

- short banner states:
  - syncing updates
  - device ready
  - local-only mode
  - sync paused

### Notes

- this should stay lightweight
- avoid raw stream/debug language in the main UI

## 11. Recent Checks / Local Activity Screen

### Purpose

Let the clinician or supervisor see recent locally stored medication checks and encounter activity.

### Primary actions

- scan recent local actions
- confirm work was recorded

### Data involved

- `interaction_checks`
- `encounters`

### Recommended content

- recent checks list
- severity
- result status
- clinician action

### Notes

- this can live on the briefing screen first
- separate screen only if needed later

## Supporting Data Model

These are the main mobile-side entities the screens rely on:

- `patients`
- `patient_allergies`
- `patient_conditions`
- `current_medications`
- `encounters`
- `interaction_checks`
- `active_ingredients`
- `medication_catalog`
- `medication_catalog_ingredients`
- `medication_interaction_rules`
- `medication_contraindication_rules`

## Screen Priority

## P0 Must Feel Strong

- PIN unlock
- briefing screen
- patient queue
- patient detail
- patient entry
- medication assessment
- assessment result presentation
- encounter record

## P1 Helpful Enhancers

- recent local checks as a stronger dedicated surface
- richer sync history
- encounter history per patient

## Design Direction

The mobile app should feel like:

- a field notebook
- a clinical sidekick
- a calm treatment tool

It should use:

- strong information hierarchy
- large touch targets
- clear status language
- reserved safety colors only for real warning states

Avoid:

- debug labels
- raw technical IDs
- oversized sync diagnostics
- generic SaaS cards everywhere

## Short Design Prompt

Design a mobile app for offline field clinicians.

The app helps them:

- open local patient files
- review allergies and conditions
- check medication suitability offline
- record treatment decisions locally
- sync back later

The interface should feel:

- calm
- practical
- quietly technical
- medically credible

The core screens are:

- PIN unlock
- clinician briefing
- patient queue
- patient detail
- patient entry
- medication assessment
- encounter record

Sync state should be visible but secondary.
Medication warnings and reasons should be explicit and readable.

