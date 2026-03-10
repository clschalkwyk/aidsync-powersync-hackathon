# Next Steps For Gemini: AidSync Dashboard UI

This is the current UI handoff for the AidSync online dashboard.

## Current Status

The following are already fixed and should not be reworked unless there is a specific bug:

- add forms now render correctly as route-backed modals
- edit forms now render correctly as route-backed modals
- medication detail hosts its own edit modal correctly
- dashboard builds cleanly with `npm run build`
- real admin login was verified in-browser
- the temporary dev auth bypass has been removed

Verified with the real admin account:

- add medication reference modal
- add interaction rule modal
- add contraindication rule modal
- ingredient edit modal shell

## Source Of Truth

Do not invent schema.

Use these files as authoritative:

- `/Users/raven/hackathons/powersync/supabase/migrations/20260306230000_initial_schema.sql`
- `/Users/raven/hackathons/powersync/supabase/migrations/20260306232000_auth_and_rls.sql`
- `/Users/raven/hackathons/powersync/supabase/migrations/20260307170000_medication_catalog.sql`
- `/Users/raven/hackathons/powersync/FORM_SPEC.md`
- `/Users/raven/hackathons/powersync/KIMI_HANDOFF.md`
- `/Users/raven/hackathons/powersync/GEMINI_TASKS.md`

If UI ideas conflict with the real schema, the schema wins.

## Important Constraints

### 1. Keep the product story aligned

The dashboard exists to support this flow:

1. prepare medication reference data online
2. sync reference data to devices via PowerSync
3. use that data offline on the mobile device
4. sync encounter outcomes back for review

This is not a generic admin panel.

### 2. Role-aware UX matters

Reference-data editing is only for:

- `admin`
- `supervisor`

`clinician` users are review-only on those screens.

Do not remove that behavior.

### 3. Do not build against fake tables

Do not create UI that assumes these exist unless migrations are added first:

- `leaflet_sources`
- `leaflet_extractions`
- `medication_drafts`
- `medication_publish_events`
- `encounter_reviews`

They are not real tables today.

## Current UI Shape

Existing screens:

- login
- overview
- medications list
- medication detail
- ingredients list
- interactions list
- contraindications list
- patients list/detail
- encounters list/detail

Existing modal flows already working:

- `/medications/new`
- `/medications/:medicationId/edit`
- `/ingredients/new`
- `/ingredients/:ingredientId/edit`
- `/interactions/new`
- `/interactions/:ruleId/edit`
- `/contraindications/new`
- `/contraindications/:ruleId/edit`

One flow is still intentionally a dedicated page:

- `/medications/link-ingredient`

Do not convert that unless asked. It is functional and not blocking.

## What Gemini Should Do Next

## Priority 1: Improve Medication Detail Page

Target:

- `/Users/raven/hackathons/powersync/aidsync_dashboard/src/routes/_authenticated/medications.$medicationId.tsx`

This should become the strongest editorial workspace in the dashboard.

Focus on:

- better hierarchy between medication identity, ingredient composition, and safety rules
- clearer ingredient list readability
- clearer rule summaries for linked interactions and contraindications
- more obvious editorial CTAs without changing behavior
- remove any visual clutter that competes with the core medication review task

Do not change the route behavior or modal plumbing that is already working.

## Priority 2: Improve Encounter Review UI

Targets:

- `/Users/raven/hackathons/powersync/aidsync_dashboard/src/routes/_authenticated/encounters.tsx`
- `/Users/raven/hackathons/powersync/aidsync_dashboard/src/routes/_authenticated/encounters.$encounterId.tsx`

These screens need to better answer:

- what happened in this field session?
- what warning or safety check was produced?
- what did the clinician decide?
- does this need follow-up?

Improve:

- severity visibility
- clinician action visibility
- clinician note readability
- interaction check presentation
- manual review cues

Keep it clinical and readable.

## Priority 3: Improve Overview For Demo Use

Target:

- `/Users/raven/hackathons/powersync/aidsync_dashboard/src/routes/_authenticated/overview.tsx`

The overview should support the hackathon demo, not act like a generic BI dashboard.

Improve:

- clarity of the `Prepare -> Sync -> Care -> Audit` story
- better scanability of counts and states
- stronger primary CTAs into the medication and encounter workflows
- cleaner empty-state messaging

Do not add fake metrics.

## Priority 4: Polish Rule And Ingredient Screens

Targets:

- `/Users/raven/hackathons/powersync/aidsync_dashboard/src/routes/_authenticated/ingredients.tsx`
- `/Users/raven/hackathons/powersync/aidsync_dashboard/src/routes/_authenticated/interactions.tsx`
- `/Users/raven/hackathons/powersync/aidsync_dashboard/src/routes/_authenticated/contraindications.tsx`
- `/Users/raven/hackathons/powersync/aidsync_dashboard/src/components/forms/*`

Improve:

- spacing
- grouping
- label clarity
- empty states
- severity readability
- reduce visual noise in the forms

Do not add new workflow concepts.

## What Not To Touch

Do not spend time on:

- dashboard-wide refactors
- changing routing architecture
- converting more screens to modals
- charts
- settings
- analytics
- permissions redesign
- speculative ingestion pipeline UI
- fake sync panels

## Design Direction

The UI should feel:

- calm
- clinical
- operational
- quietly technical
- trustworthy

Avoid:

- flashy AI visuals
- generic SaaS polish for its own sake
- neon treatments
- purple gradients
- hype language

Preferred language:

- `Medication Reference`
- `Ready for Sync`
- `Manual Review Required`
- `Clinician Action`
- `Encounter Review`
- `Prepared Online, Available Offline`

## Delivery Rules

When changing UI:

1. preserve real data flow
2. preserve buildability
3. preserve current working modal behavior
4. do not invent fields
5. improve existing screens before adding new ones

## Expected Output

Gemini should work in this order:

1. medication detail
2. encounter detail
3. encounter list
4. overview
5. ingredients/interactions/contraindications polish

The goal is not more features.
The goal is a clearer, more credible online workflow for the demo.
