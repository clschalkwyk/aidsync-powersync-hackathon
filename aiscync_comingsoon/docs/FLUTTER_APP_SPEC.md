# AidSync Agents

This document defines the primary users and roles (agents) within the AidSync ecosystem. AidSync is designed for clinical safety and field workflow in low-connectivity environments.

---

## 1. The Field Clinician (Primary Agent)

The Field Clinician is the central user of the AidSync mobile application. They operate in rural outreach, disaster response, or conflict-affected areas where connectivity is unreliable.

### Key Characteristics
- **Role:** `Clinician` (Doctor, Nurse, NGO Medic)
- **Scope:** Local-first operation. Manages patient context and safety checks on-device.
- **Primary Interface:** AidSync Mobile App (Flutter).

### Core Capabilities (User Stories)

#### Patient & Record Management
- As a Clinician, I can search for and access patient records instantly from local SQLite, even without a network.
- As a Clinician, I can create or update patient profiles including demographics, allergies, and existing conditions.
- As a Clinician, I can view a patient's full encounter history while offline.

#### Encounter Capture
- As a Clinician, I can start a new encounter and record vitals (BP, HR, SpO2, Temp).
- As a Clinician, I can record voice notes during treatment and have them transcribed into structured notes.
- As a Clinician, I can attach images or other documents to an encounter.

#### Medication Safety Workflow
- As a Clinician, I can scan a physical medicine insert or leaflet using the device camera.
- As a Clinician, I can review the structured data extracted from the insert (active ingredients, interactions, warnings).
- As a Clinician, I can trigger a deterministic safety check that compares the medication against the patient's specific allergies and current meds.
- As a Clinician, I can see the exact reasoning for any "Red" or "Yellow" safety warnings.
- As a Clinician, I can record my decision (accept/dismiss/note) regarding a safety warning in the encounter history.

#### Sync & Connectivity
- As a Clinician, I can continue my entire workflow (Capture, Check, Record) while completely disconnected.
- As a Clinician, I can see the sync status of my records and know when they have successfully reached the backend.

---

## 2. The Supervisor / Clinical Lead

The Supervisor reviews field activity to ensure clinical quality and coordinate broader care efforts.

### Key Characteristics
- **Role:** `Supervisor` / `Admin`
- **Scope:** Fleet-wide or regional oversight. Focuses on synced data and audit trails.
- **Primary Interface:** Supabase Dashboard or (P2) Web Review Dashboard.

### Core Capabilities (User Stories)
- As a Supervisor, I can review synced encounter logs to monitor field activity and care quality.
- As a Supervisor, I can audit the safety check decisions made by field clinicians.
- As a Supervisor, I can monitor sync activity logs to identify areas with critical connectivity gaps.

---

## 3. The Care Team Member (Handoff Recipient)

The Care Team Member receives patients who have been stabilized or processed in the field.

### Key Characteristics
- **Role:** `Recipient Clinician`
- **Scope:** Continuity of care. Needs a clear summary of field treatments.
- **Primary Interface:** Handoff Summaries / PDF Reports.

### Core Capabilities (User Stories)
- As a Care Team Member, I can view a "Handoff Summary" generated from the clinician's field notes and safety checks.
- As a Care Team Member, I can quickly see what medications were checked and what warnings were flagged during the initial field encounter.
