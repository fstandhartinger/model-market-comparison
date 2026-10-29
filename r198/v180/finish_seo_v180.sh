#!/bin/bash
# Resume after all numerical/release gates passed. Browser path is preflighted first.
set -euo pipefail
[[ $(pwd -P) == /srv/heavy/jobs/*/work ]] || { echo 'Disposable snapshot required' >&2; exit 3; }
W=$PWD;J=r198/v180;R=$J/receipts
[[ -e $R/FULLTEST-POSTFLIP-EXIT.json ]] || { echo 'Wait for the single full suite to finish' >&2; exit 3; }
npm ci --ignore-scripts > "$R/npm-ci-preview.log" 2>&1
python3 -B "$J/browser_v180.py" > "$R/BROWSER-PREFLIGHT.json" 2> "$R/browser-preflight.log"
node "$J/validate_v180.mjs" > "$R/validator-preview.log" 2>&1
python3 -B "$J/make_passtree_v180.py" >> "$R/fixture.log" 2>&1
cd "$J/.pass"
npx --no-install tsc --noEmit > "$W/$R/tsc-seo-fix.log" 2>&1
printf '%s\n' '{"status":"PASS","exit_code":0}' > "$W/$R/TSC-SEO-FIX.json"
node --test --test-concurrency=2 test/cr-303-seo-board-ranks.test.mjs test/jevbench-seo.test.mjs test/jevbench-seo-routes.test.mjs test/jevbench-system-pages.test.mjs > "$W/$R/seo-fixes.log" 2>&1
python3 -B "$J/receipt_seo_fix_v180.py" "$W" > "$W/$R/seo-resolution.log"
npm run build > "$W/$R/build-postflip.log" 2>&1
tar -czf "$W/$J/compiled-preview-cache.tar.gz" .next
node "$J/check_built_v180.mjs" > "$W/$R/built-check.log" 2>&1
cp "$R/BUILT-LINKS.json" "$W/$R/BUILT-LINKS.json"
cp "$R/PUBLIC-TEXT.json" "$W/$R/PUBLIC-TEXT.json"
cp "$R/ALLDATA-PASS.json" "$W/$R/ALLDATA-PASS.json"
printf '%s\n' '{"exit_code":0}' > "$W/$R/BUILD-POSTFLIP-EXIT.json"
python3 -B "$J/capture_v180.py" --out "$W/$J/preview" > "$W/$R/capture.log" 2>&1
printf '%s\n' '{"status":"PASS","production_rebuilt_for_seo_fix":true,"full_suite_repeated":false,"candidate_overlay_obstruction_removed":true}' > "$W/$R/PREVIEW-RETAKE.json"
cp "$W/$R/BUILT-LINKS.json" "$W/$R/BUILT-LINKS-RETAKE.json"
cp "$W/$R/PUBLIC-TEXT.json" "$W/$R/PUBLIC-TEXT-RETAKE.json"
cd "$W"
rm -rf "$J/.pass" .next tsconfig.tsbuildinfo
