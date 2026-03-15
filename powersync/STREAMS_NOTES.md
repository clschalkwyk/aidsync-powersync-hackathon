# PowerSync Sync Streams Notes

This file captures the current working assumptions and validator findings for AidSync's PowerSync Sync Streams setup.

## Confirmed Format

Use Sync Streams, not legacy bucket sync rules.

- `config.edition: 3`
- `streams:`
- `query:` or `queries:`
- `auto_subscribe: true` where appropriate

## Supported Syntax Confirmed From Docs

Docs checked:

- https://docs.powersync.com/sync/streams/overview
- https://docs.powersync.com/sync/streams/ctes
- https://docs.powersync.com/sync/streams/queries
- https://docs.powersync.com/sync/streams/examples

Documented supported items:

- `auth.user_id()`
- `auth.parameter('key')`
- `queries:`
- `with:` CTEs
- subqueries in supported forms

## Syntax That Failed In Validator

These patterns were rejected by the PowerSync validator in this project:

- legacy `bucket_definitions:` config
- `auth.jwt() ->> 'role'`
- `EXISTS (...)`
- subquery expressions around `profiles` that the validator flagged as unsupported

Treat those as unsupported for this repo unless proven otherwise by a passing validator run.

## Current Role Gating Strategy

Use:

```sql
auth.parameter('role')
```

Current streams assume PowerSync auth exposes a `role` parameter with one of:

- `clinician`
- `supervisor`
- `admin`

If validation passes but no data syncs, first check whether the auth token / PowerSync auth mapping is actually exposing `role`.

## Publication Requirement

Any table used in a stream must be in the `powersync` publication on Supabase.

The medication catalog tables added for the local reference-data story must be added explicitly:

```sql
alter publication powersync add table public.active_ingredients;
alter publication powersync add table public.medication_catalog;
alter publication powersync add table public.medication_catalog_ingredients;
alter publication powersync add table public.medication_interaction_rules;
alter publication powersync add table public.medication_contraindication_rules;
```

## Current Intent Of Streams

- `profile_self`: sync the signed-in user's `profiles` row
- `reference_data`: sync medicine catalog/reference tables for allowed roles
- `clinical_data`: sync patient and encounter tables for allowed roles

## Important Caveat

Current Supabase RLS is still permissive for clinical tables. Streams role-gating is therefore not the only access control boundary.

If access needs to be tightened later:

1. tighten Supabase RLS
2. tighten PowerSync streams
3. keep both aligned
