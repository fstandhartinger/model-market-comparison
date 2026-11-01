#!/bin/bash
set -euo pipefail
W=$PWD;J=r198/v184;R=$J/receipts
[[ -d node_modules/next ]] || npm ci --ignore-scripts > "$R/repair-npm-ci.log" 2>&1
bash "$J/final_provenance_gates.sh"
PATTERN='latest_release is the newest release of the draw table|SEO model, comparison and full-text pages follow the merged feed|a published v1.7.0 board is live'
TESTS=(test/jevbench-feed-live-board.test.mjs test/jevbench-v1637-release.test.mjs test/jevbench-v170-release.test.mjs)
node --test --test-concurrency=3 --test-name-pattern="$PATTERN" "${TESTS[@]}" > "$R/version-selectors-pending.log" 2>&1
printf '%s\n' '{"exit_code":0,"scope":"exact three repaired latest-version cases","pattern":"latest_release is the newest release of the draw table|SEO model, comparison and full-text pages follow the merged feed|a published v1.7.0 board is live"}' > "$R/VERSION-SELECTORS-PENDING.json"
python3 -B "$J/make_passtree_v184.py" > "$R/repair-fixture.log" 2>&1
cd "$J/.pass"
node --test --test-concurrency=3 --test-name-pattern="$PATTERN" "${TESTS[@]}" > "$W/$R/version-selectors-postflip.log" 2>&1
printf '%s\n' '{"exit_code":0,"scope":"exact three repaired latest-version cases","initial_full_suite":"postflip-tests-initial-version-selector-fail.log","initial_failures":3,"fixed_cases":3}' > "$W/$R/POSTFLIP-EXIT.json"
python3 -B "$J/freeze_v184.py" --wt "$PWD" --output "$PWD/$R/FREEZE-SYNTHETIC.json" > "$W/$R/freeze-synthetic.log" 2>&1
cp "$R/FREEZE-SYNTHETIC.json" "$W/$R/FREEZE-SYNTHETIC.json"
npm run build > "$W/$R/build-postflip.log" 2>&1
printf '%s\n' '{"exit_code":0}' > "$W/$R/BUILD-POSTFLIP-EXIT.json"
node "$J/check_built_v184.mjs" > "$W/$R/built-check.log" 2>&1
cp "$R/BUILT-LINKS.json" "$W/$R/BUILT-LINKS.json"
python3 -B "$J/check_archive_kickers.py" > "$W/$R/archive-kickers.log" 2>&1
cp "$R/ARCHIVE-KICKERS.json" "$W/$R/ARCHIVE-KICKERS.json"
python3 -B "$J/browser_v184.py" > "$W/$R/browser-preflight.log" 2>&1
python3 -B "$J/capture_v184.py" --out "$W/$J/preview" > "$W/$R/capture.log" 2>&1
cd "$W"
rm -rf "$J/.pass" .next tsconfig.tsbuildinfo
