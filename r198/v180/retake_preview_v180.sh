#!/bin/bash
# Capture-only follow-up using the exact retained production build. Never runs tests/builds/flips/seals.
set -euo pipefail
[[ $(pwd -P) == /srv/heavy/jobs/*/work ]] || { echo 'Disposable snapshot required' >&2; exit 3; }
W=$PWD;J=r198/v180;R=$J/receipts
[[ -f $R/FULLTEST-POSTFLIP-EXIT.json && -f $J/compiled-preview-cache.tar.gz ]] || { echo 'Finished full suite and retained build required' >&2; exit 3; }
npm ci --ignore-scripts > "$R/npm-ci-retake.log" 2>&1
python3 -B "$J/browser_v180.py" > "$R/BROWSER-PREFLIGHT-RETAKE.json"
python3 -B "$J/make_passtree_v180.py" >> "$R/fixture.log" 2>&1
cd "$J/.pass"
tar -xzf "$W/$J/compiled-preview-cache.tar.gz"
node "$J/check_built_v180.mjs" > "$W/$R/built-retake.log" 2>&1
cp "$R/BUILT-LINKS.json" "$W/$R/BUILT-LINKS-RETAKE.json"
cp "$R/PUBLIC-TEXT.json" "$W/$R/PUBLIC-TEXT-RETAKE.json"
python3 -B "$J/capture_v180.py" --out "$W/$J/preview" > "$W/$R/capture-retake.log" 2>&1
printf '%s\n' '{"status":"PASS","same_retained_production_build":true,"tests_or_build_repeated":false,"candidate_overlay_obstruction_removed":true}' > "$W/$R/PREVIEW-RETAKE.json"
cd "$W"
rm -rf "$J/.pass" .next tsconfig.tsbuildinfo
