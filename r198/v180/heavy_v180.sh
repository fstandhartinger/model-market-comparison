#!/bin/bash
# Only disposable heavy-run snapshot; no real approval, flip, seal or credential operations.
set -euo pipefail
[[ $(pwd -P) == /srv/heavy/jobs/*/work ]] || { echo 'Refused: disposable heavy-run snapshot required' >&2; exit 3; }
W=$PWD;J=r198/v180;R=$J/receipts
[[ ! -e $R/fulltest-postflip.log ]] || { echo "Refused: full suite already started" >&2; exit 3; }
npm ci --ignore-scripts > "$R/npm-ci.log" 2>&1
bash "$J/rebuild_v180.sh" > "$R/rebuild-canonical-host.log" 2>&1
node "$J/validate_v180.mjs" > "$R/validator.log" 2>&1
node "$J/check_alldata_v180.mjs" > "$R/alldata-pending.log" 2>&1
npx --no-install tsc --noEmit > "$R/tsc.log" 2>&1
printf '%s\n' '{"exit_code":0}' > "$R/TSC-EXIT.json"
# Real PENDING view must match the immutable v1.7.22 baseline.
node "$J/topfive_v180.mjs" "$W" > "$R/topfive-before.json"
python3 -B "$J/make_passtree_v180.py" > "$R/fixture.log" 2>&1
node "$J/topfive_v180.mjs" "$W/$J/.pass" > "$R/topfive-after.json"
node "$J/extended_preview_v180.mjs" "$W" > "$R/extended.log" 2>&1
node "$J/slider_preview_v180.mjs" > "$R/sliders.log" 2>&1
node "$J/custom_preview_v180.mjs" > "$R/custom.log" 2>&1
python3 -B "$J/compare_v180.py" > "$R/compare.log" 2>&1
# Rebind the final comparison receipt, then prove byte-deterministic output twice.
bash "$J/rebuild_v180.sh" > "$R/rebuild-1.log" 2>&1
find data/raw/benchmarks/jevbench/v1.8 -type f -print0 | sort -z | xargs -0 sha256sum > "$R/rebuild-1.sha256"
bash "$J/rebuild_v180.sh" > "$R/rebuild-2.log" 2>&1
find data/raw/benchmarks/jevbench/v1.8 -type f -print0 | sort -z | xargs -0 sha256sum > "$R/rebuild-2.sha256"
cmp "$R/rebuild-1.sha256" "$R/rebuild-2.sha256"
printf '%s\n' '{"status":"PASS","two_rebuilds_byte_equal":true}' > "$R/REBUILD.json"
node "$J/validate_v180.mjs" >> "$R/validator.log" 2>&1
node "$J/ranks_fixture_v180.mjs" "$W/$J/.pass" "$W/test/fixtures/jevbench-v180-ranks.json" > "$R/ranks.log" 2>&1
# Pending approval refuses both helpers, even a dry flip; no seal helper is executed.
printf '%s\n' '{"engine":"fixture-only","verdict":"PASS"}' > "$R/fixture-review.json"
if python3 -B "$J/flip_verdict_v180.py" "$R/fixture-review.json" --dry-run > "$R/flip-pending.log" 2>&1;then echo 'ERROR PENDING flip accepted';exit 1;fi
if python3 -B "$J/freeze_v180.py" --wt "$W" --output "$W/$R/forbidden-freeze.json" > "$R/freeze-pending.log" 2>&1;then echo 'ERROR PENDING freeze accepted';exit 1;fi
printf '%s\n' '{"status":"PASS","dry_flip_refused":true,"freeze_refused":true,"seal_helper_never_run":true}' > "$R/HELPERS.json"
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
