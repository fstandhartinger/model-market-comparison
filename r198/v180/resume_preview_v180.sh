#!/bin/bash
# Resume after all numerical/release gates passed. Browser path is preflighted first.
set -euo pipefail
[[ $(pwd -P) == /srv/heavy/jobs/*/work ]] || { echo 'Disposable snapshot required' >&2; exit 3; }
W=$PWD;J=r198/v180;R=$J/receipts
[[ ! -e $R/fulltest-postflip.log ]] || { echo 'Full suite already started; do not repeat' >&2; exit 3; }
npm ci --ignore-scripts > "$R/npm-ci-preview.log" 2>&1
python3 -B "$J/browser_v180.py" > "$R/BROWSER-PREFLIGHT.json" 2> "$R/browser-preflight.log"
node "$J/validate_v180.mjs" > "$R/validator-preview.log" 2>&1
python3 -B "$J/make_passtree_v180.py" >> "$R/fixture.log" 2>&1
cd "$J/.pass"
npm run build > "$W/$R/build-postflip.log" 2>&1
tar -czf "$W/$J/compiled-preview-cache.tar.gz" .next
node "$J/check_built_v180.mjs" > "$W/$R/built-check.log" 2>&1
cp "$R/BUILT-LINKS.json" "$W/$R/BUILT-LINKS.json"
cp "$R/PUBLIC-TEXT.json" "$W/$R/PUBLIC-TEXT.json"
cp "$R/ALLDATA-PASS.json" "$W/$R/ALLDATA-PASS.json"
printf '%s\n' '{"exit_code":0}' > "$W/$R/BUILD-POSTFLIP-EXIT.json"
python3 -B "$J/capture_v180.py" --out "$W/$J/preview" > "$W/$R/capture.log" 2>&1
set +e
npm test > "$W/$R/fulltest-postflip.log" 2>&1
rc=$?
set -e
printf '{"exit_code":%s,"command":"suite-slot heavy-run npm test; exactly one run"}\n' "$rc" > "$W/$R/FULLTEST-POSTFLIP-EXIT.json"
cd "$W"
rm -rf "$J/.pass" .next tsconfig.tsbuildinfo
# Keep the node_modules symlink/directory and every receipt.
exit "$rc"
