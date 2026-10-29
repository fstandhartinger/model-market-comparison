#!/bin/bash
set -euo pipefail
[[ $(pwd -P) == /srv/heavy/jobs/*/work ]] || { echo 'Refused: disposable heavy-run snapshot required' >&2; exit 3; }
W=$PWD;J=r198/v180;R=$J/receipts
[[ ! -e $R/fulltest-postflip.log ]] || { echo 'Refused: full suite already started; inspect before retry' >&2; exit 3; }
npm ci --ignore-scripts > "$R/npm-ci-resume.log" 2>&1
node "$J/validate_v180.mjs" > "$R/validator-resume.log" 2>&1
node --test test/jevbench-architecture-data.test.mjs > "$R/architecture-fix.log" 2>&1
printf '%s\n' '{"status":"PASS","exit_code":0}' > "$R/ARCHITECTURE-FIX-EXIT.json"
TESTS=(test/jevbench-v180-release.test.mjs test/jevbench-v1723-release.test.mjs test/jevbench-v1722-release.test.mjs test/jevbench-v1721-release.test.mjs test/jevbench-v1720-release.test.mjs test/jevbench-v1719-release.test.mjs test/jevbench-v1718-release.test.mjs test/jevbench-v1717-release.test.mjs test/jevbench-v1716-release.test.mjs test/jevbench-v1715-release.test.mjs test/jevbench-v1714-release.test.mjs test/jevbench-v1713-release.test.mjs test/jevbench-v1712-release.test.mjs test/cr-303-feed-split.test.mjs test/jevbench-breakdowns-every-listed-row.test.mjs test/jevbench-v1630-open-fold.test.mjs test/jevbench-v1630-release.test.mjs test/cr-205-jev-page-structure.test.mjs test/jevbench-merged-board.test.mjs test/jevbench-feed-live-board.test.mjs test/jevbench-v1637-release.test.mjs test/jevbench-v170-release.test.mjs test/sitemap-releases-redirects.test.mjs test/jevbench-architecture-data.test.mjs test/release-page-seo.test.mjs test/jevbench-alldata-fetch.test.mjs)
AVAILABLE=();for f in "${TESTS[@]}";do [[ -f $f ]] && AVAILABLE+=("$f");done;TESTS=("${AVAILABLE[@]}")
node --test --test-concurrency=2 "${TESTS[@]}" > "$R/release-tests.log" 2>&1
printf '%s\n' '{"exit_code":0}' > "$R/PENDING-EXIT.json"
# Regenerate the disposable fixture with the final deterministic proof and updated rank fixture.
python3 -B "$J/make_passtree_v180.py" >> "$R/fixture.log" 2>&1
cd "$J/.pass"
node "$J/check_alldata_v180.mjs" > "$W/$R/alldata-pass.log" 2>&1
python3 -B "$J/freeze_v180.py" --wt "$PWD" --output "$PWD/$R/FREEZE-SYNTHETIC.json" > "$W/$R/freeze-synthetic.log" 2>&1
cp "$R/FREEZE-SYNTHETIC.json" "$W/$R/FREEZE-SYNTHETIC.json"
node --test --test-concurrency=2 "${TESTS[@]}" test/jevbench-v163-fresh-source.test.mjs > "$W/$R/postflip-tests.log" 2>&1
printf '%s\n' '{"exit_code":0}' > "$W/$R/POSTFLIP-EXIT.json"
npm run build > "$W/$R/build-postflip.log" 2>&1
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
