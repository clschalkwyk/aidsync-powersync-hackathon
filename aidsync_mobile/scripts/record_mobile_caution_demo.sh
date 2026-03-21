#!/bin/zsh
set -euo pipefail

ADB=${ADB:-/Users/raven/Library/Android/sdk/platform-tools/adb}
OUT_FILE=${1:-/Users/raven/hackathons/powersync/aidsync_mobile/demo-artifacts/mobile-caution-demo.mp4}
REMOTE_FILE=${REMOTE_FILE:-/sdcard/aidsync-mobile-caution-demo.mp4}
BIT_RATE=${BIT_RATE:-6000000}
TIME_LIMIT=${TIME_LIMIT:-45}

mkdir -p "$(dirname "$OUT_FILE")"

sleep_for() {
  sleep "$1"
}

tap() {
  "$ADB" shell input tap "$1" "$2"
}

swipe() {
  "$ADB" shell input swipe "$1" "$2" "$3" "$4" "$5"
}

cleanup_remote() {
  "$ADB" shell rm -f "$REMOTE_FILE" >/dev/null 2>&1 || true
}

trap cleanup_remote EXIT

cat <<'MSG'
Assumptions:
- The device is connected and unlocked.
- AidSync Mobile is already open on the Patients tab.
- The seeded patient queue still shows Amina Dlamini in the first card position.
MSG

cleanup_remote

"$ADB" shell screenrecord --bit-rate "$BIT_RATE" --time-limit "$TIME_LIMIT" "$REMOTE_FILE" >/dev/null 2>&1 &
REC_PID=$!

sleep_for 1

# Patients tab -> Amina action sheet -> start encounter
tap 472 2371
sleep_for 1.2
tap 610 2063
sleep_for 1.0
tap 610 2143
sleep_for 2.0

# Encounter workspace -> add medication check -> open catalog
tap 338 2442
sleep_for 1.8
tap 610 1476
sleep_for 1.8

# Select Advil from seeded local catalog
tap 610 1504
sleep_for 2.8

# Reveal clinician action/save and save the result
swipe 610 2200 610 1200 300
sleep_for 1.5
swipe 610 2200 610 1200 300
sleep_for 1.5
tap 610 2434
sleep_for 3.0

wait "$REC_PID" || true
"$ADB" pull "$REMOTE_FILE" "$OUT_FILE" >/dev/null

cat <<MSG
Saved mobile caution demo to:
$OUT_FILE
MSG
