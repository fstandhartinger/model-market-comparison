#!/bin/bash
# Lead (run 201): capture-only refresh of the preview on the final reviewed head after the D1 disclosure fix.
# Production build + built check + capture. No tests, flips or seals.
set -euo pipefail
[[ $(pwd -P) == /srv/heavy/jobs/*/work ]] || { echo 'Disposable heavy snapshot required';exit 3; }
W=$PWD;J=r198/v180;R=$J/receipts/final-capture
mkdir -p "$R"
npm ci --ignore-scripts > "$R/npm-ci.log" 2>&1
python3 -B "$J/browser_v180.py" > "$R/BROWSER.json" 2> "$R/browser.log"
node "$J/validate_v180.mjs" > "$R/validator.log" 2>&1
python3 -B "$J/make_passtree_v180.py" > "$R/fixture.log" 2>&1
cd "$J/.pass"
npm run build > "$W/$R/build.log" 2>&1
node "$J/check_built_v180.mjs" > "$W/$R/built-check.log" 2>&1
python3 -B "$J/capture_v180.py" --out "$W/$J/preview" > "$W/$R/capture.log" 2>&1
cd "$W"
sha256sum data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.0-results.json > "$R/results.sha256"
printf '%s\n' '{"status":"PASS","head":"1d9e11146","tests_repeated":false}' > "$R/FINAL-CAPTURE.json"
rm -rf "$J/.pass" .next tsconfig.tsbuildinfo
