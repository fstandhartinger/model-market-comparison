#!/bin/bash
# Bounded local-only fix verification in a disposable heavy snapshot. Never run the full suite.
set -euo pipefail
[[ $(pwd -P) == /srv/heavy/jobs/*/work ]] || { echo 'Disposable heavy snapshot required';exit 3; }
W=$PWD;J=r198/v180;R=$J/receipts/fix-round
mkdir -p "$R"
phase(){ printf '%s\n' "$1" | tee "$W/$R/PHASE"; }
trap 'rc=$?; printf "{\"exit_code\":%s}\n" "$rc" > "$W/$R/EXIT.json"' EXIT
phase install
npm ci --ignore-scripts > "$R/npm-ci.log" 2>&1
python3 -B "$J/browser_v180.py" > "$R/BROWSER.json" 2> "$R/browser.log"
phase rebuild
bash "$J/rebuild_v180.sh" > "$R/rebuild.log" 2>&1
node "$J/validate_v180.mjs" > "$R/validator.log" 2>&1
node "$J/check_alldata_v180.mjs" > "$R/alldata-pending.log" 2>&1
phase comparison
node "$J/topfive_v180.mjs" "$W" > "$J/receipts/topfive-before.json" 2> "$R/topfive-before.log"
python3 -B "$J/make_passtree_v180.py" > "$R/fixture.log" 2>&1
node "$J/topfive_v180.mjs" "$W/$J/.pass" > "$J/receipts/topfive-after.json" 2> "$R/topfive-after.log"
node "$J/extended_preview_v180.mjs" "$W" > "$R/extended.log" 2>&1
node "$J/slider_preview_v180.mjs" > "$R/slider.log" 2>&1
node "$J/custom_preview_v180.mjs" > "$R/custom.log" 2>&1
python3 -B "$J/compare_v180.py" > "$R/compare.log" 2>&1
node "$J/fix_round_equality.mjs" > "$R/equality.log" 2>&1
phase deterministic-rebind
bash "$J/rebuild_v180.sh" > "$R/rebuild-1.log" 2>&1
find data/raw/benchmarks/jevbench/v1.8 -type f -print0 | sort -z | xargs -0 sha256sum > "$R/rebuild-1.sha256"
bash "$J/rebuild_v180.sh" > "$R/rebuild-2.log" 2>&1
find data/raw/benchmarks/jevbench/v1.8 -type f -print0 | sort -z | xargs -0 sha256sum > "$R/rebuild-2.sha256"
cmp "$R/rebuild-1.sha256" "$R/rebuild-2.sha256"
node "$J/validate_v180.mjs" > "$R/validator-final.log" 2>&1
phase tsc
npx --no-install tsc --noEmit > "$R/tsc.log" 2>&1
printf '%s\n' '{"exit_code":0}' > "$R/TSC.json"
TESTS=(test/jevbench-v180-release.test.mjs test/jevbench-v1723-release.test.mjs test/jevbench-v1722-release.test.mjs test/jevbench-v1721-release.test.mjs test/jevbench-v1720-release.test.mjs test/jevbench-v1719-release.test.mjs test/jevbench-v1718-release.test.mjs test/jevbench-v1717-release.test.mjs test/jevbench-v1716-release.test.mjs test/jevbench-v1715-release.test.mjs test/jevbench-v1714-release.test.mjs test/jevbench-v1713-release.test.mjs test/jevbench-v1712-release.test.mjs test/cr-303-feed-split.test.mjs test/jevbench-breakdowns-every-listed-row.test.mjs test/jevbench-v1630-open-fold.test.mjs test/jevbench-v1630-release.test.mjs test/cr-205-jev-page-structure.test.mjs test/jevbench-merged-board.test.mjs test/jevbench-feed-live-board.test.mjs test/jevbench-v1637-release.test.mjs test/jevbench-v170-release.test.mjs test/sitemap-releases-redirects.test.mjs test/jevbench-architecture-data.test.mjs test/release-page-seo.test.mjs test/jevbench-alldata-fetch.test.mjs)
AVAILABLE=();for f in "${TESTS[@]}";do [[ -f $f ]] && AVAILABLE+=("$f");done;TESTS=("${AVAILABLE[@]}")
phase pending-suite
node --test --test-concurrency=2 "${TESTS[@]}" > "$R/pending.log" 2>&1
printf '%s\n' '{"exit_code":0}' > "$R/PENDING.json"
python3 -B "$J/make_passtree_v180.py" > "$R/fixture-final.log" 2>&1
node "$J/ranks_fixture_v180.mjs" "$W/$J/.pass" "$W/test/fixtures/jevbench-v180-ranks.json" > "$R/ranks.log" 2>&1
cp test/fixtures/jevbench-v180-ranks.json "$J/.pass/test/fixtures/jevbench-v180-ranks.json"
cd "$J/.pass"
phase postflip-suite
node "$J/check_alldata_v180.mjs" > "$W/$R/alldata-postflip.log" 2>&1
node --test --test-concurrency=2 "${TESTS[@]}" test/jevbench-v163-fresh-source.test.mjs > "$W/$R/postflip.log" 2>&1
printf '%s\n' '{"exit_code":0}' > "$W/$R/POSTFLIP.json"
phase production-build
npm run build > "$W/$R/build.log" 2>&1
node "$J/check_built_v180.mjs" > "$W/$R/built-check.log" 2>&1
cp "$J/receipts/BUILT-LINKS.json" "$W/$R/BUILT-LINKS.json"
cp "$J/receipts/PUBLIC-TEXT.json" "$W/$R/PUBLIC-TEXT.json"
printf '%s\n' '{"exit_code":0}' > "$W/$R/BUILD.json"
phase screenshots
python3 -B "$J/capture_v180.py" --out "$W/$J/preview" > "$W/$R/capture.log" 2>&1
cd "$W"
node "$J/fix_round_equality.mjs" > "$R/equality-final.log" 2>&1
phase complete
rm -rf "$J/.pass" .next tsconfig.tsbuildinfo
