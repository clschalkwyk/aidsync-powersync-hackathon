# AidSync Dashboard

The online preparation, review, and oversight surface for AidSync.


## Live Demo

Public dashboard deployment:

- [https://aidsync.co.za](https://aidsync.co.za)

## What This Module Does

`aidsync_dashboard` is the online part of the product. It is used to:

- create medication preparation sessions
- ingest leaflet page images or regulator PDFs
- build and review medication drafts before publish
- manage medication, interaction, and contraindication reference data
- review synced encounters from the mobile app
- add supervisor review notes and resolve flagged decisions

The dashboard is not the runtime safety engine. It prepares and reviews the
reference data that the mobile app uses offline.

## Main Flows

### Medication Preparation

1. Create a preparation session
2. Upload page images or import a leaflet PDF
3. Extract text and build a medication draft
4. Review ingredients, interactions, and contraindications
5. Publish to the shared medication catalog

### Encounter Review

1. Open synced encounters from field devices
2. Filter to `Needs Review`
3. Inspect medication checks, warnings, and clinician actions
4. Mark checks reviewed and add supervisor review notes
5. Let review metadata sync back to the mobile device through PowerSync

## Tech Stack

- React 18
- Vite
- TypeScript
- TanStack Router
- TanStack Query
- TanStack AI
- Tailwind CSS
- Supabase JS
- Playwright
- `pdfjs-dist` for PDF text extraction

## TanStack AI In This Module

The dashboard includes `TanStack AI` in the stack for optional preparation and
review assistance on the online side.

It is not the medication safety engine.

Clinical safety decisions shown in the field flow still come from deterministic
rules executed on-device in the mobile app.

## Environment

Copy `.env.example` to `.env`.

Required variables:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Notes:

- local PDF upload is the reliable PDF path
- PDF URL import depends on the source allowing browser fetches
- OCR-backed preparation also depends on the Supabase Edge Function environment
  under [`/Users/raven/hackathons/powersync/supabase/README.md`](/Users/raven/hackathons/powersync/supabase/README.md)

## Run Locally

```bash
cd /Users/raven/hackathons/powersync/aidsync_dashboard
npm install
npm run dev
```

Useful commands:

```bash
npm run build
npm run test:e2e
npm run demo:dashboard
npm run demo:video:capture
npm run demo:video:voiceover
npm run demo:video:render
```

## Demo Video Pipeline

The dashboard now includes a small demo-video pipeline under `demo-video/`.

It works like this:

1. Playwright captures deterministic dashboard scenes
2. a manifest stores the scene captions and narration text
3. ElevenLabs can synthesize per-scene voiceover audio
4. Remotion renders the final MP4

Voiceover generation requires:

```bash
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=...
```

## Key Routes

- `/overview`
- `/medications`
- `/medications/prepare`
- `/medications/prepare-session/:sessionId`
- `/patients`
- `/patients/:patientId`
- `/encounters`
- `/encounters/:encounterId`
- `/interactions`
- `/contraindications`

## Data Touch Points

This module reads and writes primarily through Supabase tables such as:

- `medication_catalog`
- `medication_catalog_ingredients`
- `medication_interaction_rules`
- `medication_contraindication_rules`
- `patients`
- `encounters`
- `interaction_checks`
- preparation-session tables used by the medication import workflow

It also works with:

- Supabase Storage for uploaded leaflet images
- the `prepare-medication-reference` Edge Function for OCR-assisted draft building

## Related Modules

- mobile runtime: [`/Users/raven/hackathons/powersync/aidsync_mobile/README.md`](/Users/raven/hackathons/powersync/aidsync_mobile/README.md)
- OCR service: [`/Users/raven/hackathons/powersync/aidsync_ocr_api/README.md`](/Users/raven/hackathons/powersync/aidsync_ocr_api/README.md)
- PowerSync config: [`/Users/raven/hackathons/powersync/powersync/README.md`](/Users/raven/hackathons/powersync/powersync/README.md)
- backend schema and functions: [`/Users/raven/hackathons/powersync/supabase/README.md`](/Users/raven/hackathons/powersync/supabase/README.md)
