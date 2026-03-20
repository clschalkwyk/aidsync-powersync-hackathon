# PowerSync Module

PowerSync configuration for AidSync.

## What This Module Does

This folder holds the PowerSync-specific configuration that supports the core
AidSync loop:

1. prepare medication reference data online
2. sync reference and patient data to devices
3. capture encounters locally first
4. sync encounter and review metadata back

## Files

- [`/Users/raven/hackathons/powersync/powersync/sync-rules.yaml`](/Users/raven/hackathons/powersync/powersync/sync-rules.yaml)
  defines the sync model used by PowerSync
- [`/Users/raven/hackathons/powersync/powersync/STREAMS_NOTES.md`](/Users/raven/hackathons/powersync/powersync/STREAMS_NOTES.md)
  contains stream notes and implementation context

## Scope

This folder is configuration, not an app. It does not run independently.

The actual client usage lives in:

- mobile app: [`/Users/raven/hackathons/powersync/aidsync_mobile/README.md`](/Users/raven/hackathons/powersync/aidsync_mobile/README.md)
- backend schema: [`/Users/raven/hackathons/powersync/supabase/README.md`](/Users/raven/hackathons/powersync/supabase/README.md)
