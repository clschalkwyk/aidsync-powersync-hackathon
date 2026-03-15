# Supabase And PowerSync Deployment

This repo already contains:

- schema migrations in `supabase/migrations/`
- demo seed data in `supabase/seed.sql`
- initial PowerSync rules in `powersync/sync-rules.yaml`

## 1. Link To Hosted Supabase

```bash
cd /Users/raven/hackathons/powersync
supabase link --project-ref <your-project-ref>
```

If you prefer not to link the repo globally, use `--project-ref` plus `--password` where needed on each command.

## 2. Push Schema To Hosted Supabase

Dry run first:

```bash
cd /Users/raven/hackathons/powersync
supabase db push --dry-run
```

Apply migrations:

```bash
cd /Users/raven/hackathons/powersync
supabase db push
```

## 3. Optional: Seed Hosted Supabase

Only do this if you want demo data in the hosted project.

```bash
cd /Users/raven/hackathons/powersync
psql "$DATABASE_URL" -f supabase/seed.sql
```

## 4. Deploy PowerSync Sync Rules

For PowerSync Cloud, open the instance dashboard and paste the contents of:

- `powersync/sync-rules.yaml`

Then deploy the rules in the dashboard.

The current rules do two things:

- sync the signed-in user's own `profiles` row
- sync all clinical tables for any signed-in user with role `clinician`, `supervisor`, or `admin`

This matches the current permissive RLS posture in the Supabase migrations. If you later tighten RLS to assigned patients only, update both the RLS policies and these sync rules together.

## 5. Update App Config

### Flutter app (`aidsync`)

Provide:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `POWERSYNC_URL`

Run with:

```bash
cd /Users/raven/hackathons/powersync/aidsync
flutter run \
  --dart-define=SUPABASE_URL=<supabase-url> \
  --dart-define=SUPABASE_PUBLISHABLE_KEY=<supabase-publishable-key> \
  --dart-define=POWERSYNC_URL=<powersync-url>
```

### Dashboard app (`aidsync_dashboard`)

Provide:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY` only in trusted server-side code

## 6. Verify Hosted State

After deployment:

- confirm all tables exist in Supabase
- confirm `profiles` is populated after auth sign-up
- confirm PowerSync connects to the source database
- confirm a signed-in user receives `profiles` plus clinical tables
- confirm local writes upload successfully back through Supabase
