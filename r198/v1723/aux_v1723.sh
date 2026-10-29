#!/bin/bash
# Disposable fixture checks only; no real publication or seal writes.
set -euo pipefail
[[ $(pwd -P) == /srv/heavy/jobs/*/work ]] || exit 3
J=r198/v1723; R=$J/receipts
npm ci --ignore-scripts > "$R/aux-npm-ci.log" 2>&1
python3 -B "$J/check_visibility_v1723.py" > "$R/visibility.log" 2>&1
node "$J/check_alldata_v1723.mjs" > "$R/alldata.log" 2>&1
node "$J/check_alldata_v1723.mjs" "$PWD/$J/.pass" >> "$R/alldata.log" 2>&1
python3 -B "$J/flip_verdict_v1723.py" "$R/DRYRUN-REVIEW-FIXTURE.json" --dry-run > "$R/FLIP-DRYRUN.json"
mkdir -p "$J/.pass/$R"
cp "$R/topfive-diff.json" "$J/.pass/$R/topfive-diff.json"
OUT="$PWD/$J/.pass/$R/FREEZE-DRYRUN.json"
python3 -B "$J/freeze_v1723.py" --wt "$PWD/$J/.pass" --output "$OUT" > "$R/freeze-dryrun.log" 2>&1
cp "$OUT" "$R/FREEZE-SYNTHETIC-DRYRUN.json"
echo '{"status":"PASS","real_manifest":"PENDING","synthetic_freeze_only":true,"seal_written":false}' > "$R/AUX-EXIT.json"
