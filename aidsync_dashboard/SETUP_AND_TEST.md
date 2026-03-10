# AidSync Dashboard Setup And Test

This is the shortest path to get the online dashboard usable for the PowerSync demo.

## 1. Environment

Create `.env` from `.env.example` and set:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

## 2. Database State

From the repo root, ensure hosted Supabase has the latest schema:

```bash
supabase db push
```

If you want sample data online:

```bash
psql "$DATABASE_URL" -f supabase/seed.sql
```

If you want a safer hosted demo seed without truncating existing data:

```bash
psql "$DATABASE_URL" -f supabase/demo_roundtrip_upsert.sql
```

## 3. PowerSync State

Ensure the hosted publication includes the reference tables:

```sql
alter publication powersync add table public.active_ingredients;
alter publication powersync add table public.medication_catalog;
alter publication powersync add table public.medication_catalog_ingredients;
alter publication powersync add table public.medication_interaction_rules;
alter publication powersync add table public.medication_contraindication_rules;
```

Then deploy:

- `powersync/sync-rules.yaml`

## 4. Dashboard Run

```bash
cd aidsync_dashboard
npm install
npm run dev
```

## 5. Dashboard Role Check

Reference-data editing in the dashboard is intentionally restricted by RLS.

- `supervisor` and `admin` can create and edit medication reference data
- `clinician` is review-only on those screens

Check your profile role in Supabase:

```sql
select id, full_name, role, updated_at
from public.profiles
order by updated_at desc;
```

If your dashboard user needs editing access for setup or demo prep:

```sql
update public.profiles
set role = 'admin'
where id = '<your-auth-user-id>';
```

## 6. Minimum Data To Enter Online

Before testing sync to device, the dashboard should contain:

- at least 1 `active_ingredient`
- at least 1 `medication_catalog` row
- at least 1 `medication_catalog_ingredients` link
- at least 1 `medication_interaction_rules` row
- at least 1 `medication_contraindication_rules` row
- at least 1 `patient`
- at least 1 `current_medications` row or allergy/condition row on that patient

The dashboard UI currently supports direct management for the medication reference tables. Clinical tables are review-first.

## 7. PowerSync Roundtrip Test

Use this exact test sequence:

1. Open dashboard and confirm overview counts are non-zero.
2. Add or edit a medication reference record online.
3. Confirm the record exists in Supabase.
4. Open the Flutter app with PowerSync configured.
5. Confirm local reference table counts become non-zero.
6. Open a patient offline on the device.
7. Run a medication suitability check using synced reference data.
8. Save the encounter locally.
9. Reconnect the device.
10. Confirm the encounter appears in dashboard review.

## 8. What Counts As Success

The dashboard is functionally ready for the hackathon when:

- medication reference data can be created and edited online
- the mobile app receives that data through PowerSync
- the mobile app can create encounter outcomes offline
- the dashboard can review those synced outcomes later

## 9. Current Limits

- Dashboard ingestion is catalog-first, not raw leaflet workflow-first.
- Leaflet extraction and normalization still belong to the online preparation layer conceptually, but the real schema today is published-reference oriented.
- If draft/review/versioning tables are needed later, add them deliberately via new Supabase migrations.
