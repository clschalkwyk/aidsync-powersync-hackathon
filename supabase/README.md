# Supabase Module

Schema, seed data, SQL migrations, and Edge Functions for AidSync.

## What This Module Does

`supabase/` holds the backend definition for the project:

- Postgres schema and migrations
- seeded demo data
- Edge Functions for medication preparation support
- deployment notes and operational SQL helpers

Supabase is the system of record. PowerSync then moves the relevant data to and
from the device runtime.

## Main Responsibilities

- store patients, encounters, and medication reference data
- store synced field updates from the mobile app
- provide seed scenarios for the demo patients and medications
- support medication-preparation workflows through Edge Functions

## Key Contents

- `migrations/`
- `seed.sql`
- `functions/prepare-medication-reference/`
- `DEPLOY.md`

## Local Development

```bash
cd /Users/raven/hackathons/powersync
supabase start
supabase db reset --local
```

Push schema changes:

```bash
supabase db push
```

Deploy the medication preparation function:

```bash
supabase functions deploy prepare-medication-reference
```

## Edge Function Environment

The `prepare-medication-reference` function expects environment variables such
as:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` or `SUPABASE_PUBLISHABLE_KEY`
- `OPENROUTER_API_KEY`
- `OCR_SERVICE_URL`
- `OCR_SERVICE_API_KEY`

Optional:

- `OPENROUTER_MODEL`
- `OPENROUTER_MERGE_MODEL`
- `OPENROUTER_HTTP_REFERER`
- `OPENROUTER_X_TITLE`

## Related Modules

- mobile app: [`/Users/raven/hackathons/powersync/aidsync_mobile/README.md`](/Users/raven/hackathons/powersync/aidsync_mobile/README.md)
- dashboard: [`/Users/raven/hackathons/powersync/aidsync_dashboard/README.md`](/Users/raven/hackathons/powersync/aidsync_dashboard/README.md)
- OCR service: [`/Users/raven/hackathons/powersync/aidsync_ocr_api/README.md`](/Users/raven/hackathons/powersync/aidsync_ocr_api/README.md)
- PowerSync config: [`/Users/raven/hackathons/powersync/powersync/README.md`](/Users/raven/hackathons/powersync/powersync/README.md)
