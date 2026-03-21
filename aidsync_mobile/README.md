# AidSync Mobile

The offline-first Flutter field client for AidSync.

## What This Module Does

`aidsync_mobile` is the primary hackathon surface. It is used by field
clinicians to:

- open synced patient records from local SQLite
- review allergies, conditions, current medications, and local history
- start or resume encounters offline
- capture presenting complaint, clinician note, and vitals
- select medications from the locally synced catalog
- run deterministic medication safety checks on-device
- store clinician actions and encounter results locally first
- sync encounters and review metadata when connectivity returns

The mobile app is the source of truth for encounter capture.

## Main Flows

### Field Encounter Flow

1. Sync patient and medication reference data to the device
2. Open a patient from local storage
3. Start or resume an encounter
4. Select a medication from the local catalog
5. Run the local safety check automatically
6. Record clinician action and notes
7. Save locally and sync later if offline

### Review Feedback Flow

1. Dashboard supervisor reviews an encounter
2. Supervisor review note syncs back through PowerSync
3. Mobile app shows the review state on the encounter summary

## Tech Stack

- Flutter
- Dart
- PowerSync client
- Supabase Flutter
- local SQLite through PowerSync

## Required Runtime Defines

This app uses `--dart-define` values instead of a checked-in `.env` file.

Required values:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-publishable-key
POWERSYNC_URL=https://your-powersync-instance
```

If these are missing, the app shows a visible configuration warning on startup.

## Run Locally

```bash
cd /Users/raven/hackathons/powersync/aidsync_mobile
flutter pub get
flutter run \
  --dart-define=SUPABASE_URL=<supabase-url> \
  --dart-define=SUPABASE_PUBLISHABLE_KEY=<supabase-publishable-key> \
  --dart-define=POWERSYNC_URL=<powersync-url>
```

Useful commands:

```bash
flutter analyze
flutter build apk \
  --dart-define=SUPABASE_URL=<supabase-url> \
  --dart-define=SUPABASE_PUBLISHABLE_KEY=<supabase-publishable-key> \
  --dart-define=POWERSYNC_URL=<powersync-url>
```

## Demo Capture

For a physical Android device demo, use:

```bash
cd /Users/raven/hackathons/powersync/aidsync_mobile
./scripts/record_mobile_caution_demo.sh
```

This script:

- assumes the device is connected with `adb`
- assumes AidSync Mobile is already unlocked
- assumes the app is already open on the `Patients` tab
- records a short caution-path clip using the seeded `Amina Dlamini + Advil` flow
- writes the resulting MP4 to `demo-artifacts/mobile-caution-demo.mp4`

The app PIN screen still requires manual unlock before running the script because the secure PIN field does not accept reliable `adb` text injection on this device.

## Product Scope In This Module

Built now:

- patient list and patient detail
- encounter capture and handoff summary
- local medication reference visibility
- automatic local medication safety checks
- pending sync and synced review metadata
- patient context editing for fields like pregnancy status

Not part of the current shipped mobile flow:

- live leaflet scanning on device
- live voice transcription capture

## Related Modules

- system overview: [`/Users/raven/hackathons/powersync/README.md`](/Users/raven/hackathons/powersync/README.md)
- dashboard: [`/Users/raven/hackathons/powersync/aidsync_dashboard/README.md`](/Users/raven/hackathons/powersync/aidsync_dashboard/README.md)
- PowerSync config: [`/Users/raven/hackathons/powersync/powersync/README.md`](/Users/raven/hackathons/powersync/powersync/README.md)
- backend schema and seed data: [`/Users/raven/hackathons/powersync/supabase/README.md`](/Users/raven/hackathons/powersync/supabase/README.md)
