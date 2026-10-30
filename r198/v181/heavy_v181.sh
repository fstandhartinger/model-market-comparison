#!/bin/bash
set -euo pipefail
W=$PWD;J=r198/v181;R=$J/receipts
[[ -d node_modules/next ]] || npm ci --ignore-scripts > "$R/npm-ci.log" 2>&1
bash "$J/rebuild_v181.sh" > "$R/rebuild.log" 2>&1
node "$J/validate_v181.mjs" > "$R/validator.log" 2>&1
npx --no-install tsc --noEmit > "$R/tsc.log" 2>&1
printf '%s\n' '{"exit_code":0}' > "$R/TSC-EXIT.json"
node "$J/topfive_v181.mjs" "$W" > "$R/topfive-before.json"
python3 -B "$J/make_passtree_v181.py" > "$R/fixture.log" 2>&1
node "$J/topfive_v181.mjs" "$W/$J/.pass" > "$R/topfive-after.json"
node "$J/extended_preview_v181.mjs" "$W" > "$R/extended.log" 2>&1
node "$J/slider_preview_v181.mjs" > "$R/sliders.log" 2>&1
node "$J/custom_preview_v181.mjs" > "$R/custom.log" 2>&1
python3 -B "$J/compare_v181.py" > "$R/compare.log" 2>&1
python3 -B "$J/check_repro_v181.py" > "$R/rebuild-determinism.log" 2>&1
node "$J/validate_v181.mjs" > "$R/validator.log" 2>&1
python3 -B "$J/check_public_text_v181.py" > "$R/public-text.log" 2>&1
node "$J/check_base_overlay_v181.mjs" > "$R/base-overlay.log" 2>&1
python3 -B "$J/check_helpers_v181.py" > "$R/helpers.log" 2>&1
python3 -B "$J/make_passtree_v181.py" > "$R/fixture.log" 2>&1
node "$J/ranks_fixture_v181.mjs" "$W/$J/.pass" "$W/test/fixtures/jevbench-v181-ranks.json" > "$R/ranks.log" 2>&1
TESTS=(test/jevbench-v181-release.test.mjs test/cr-254-base-model-display.test.mjs test/jevbench-v180-release.test.mjs test/jevbench-v1723-release.test.mjs test/jevbench-v1722-release.test.mjs test/jevbench-v1721-release.test.mjs test/jevbench-v1720-release.test.mjs test/jevbench-v1719-release.test.mjs test/jevbench-v1718-release.test.mjs test/jevbench-v1717-release.test.mjs test/jevbench-v1716-release.test.mjs test/jevbench-v1715-release.test.mjs test/jevbench-v1714-release.test.mjs test/jevbench-v1713-release.test.mjs test/jevbench-v1712-release.test.mjs test/cr-303-feed-split.test.mjs test/jevbench-breakdowns-every-listed-row.test.mjs test/jevbench-v1630-open-fold.test.mjs test/jevbench-v1630-release.test.mjs test/cr-205-jev-page-structure.test.mjs test/jevbench-merged-board.test.mjs test/jevbench-feed-live-board.test.mjs test/jevbench-v1637-release.test.mjs test/jevbench-v170-release.test.mjs test/sitemap-releases-redirects.test.mjs test/jevbench-architecture-data.test.mjs test/release-page-seo.test.mjs test/jevbench-alldata-fetch.test.mjs)
# Both the PENDING and isolated synthetic PASS suites must pass.
node --test --test-concurrency=4 "${TESTS[@]}" > "$R/release-tests.log" 2>&1
printf '%s\n' '{"exit_code":0}' > "$R/PENDING-EXIT.json"
python3 -B "$J/make_passtree_v181.py" >> "$R/fixture.log" 2>&1
cd "$J/.pass"
node --test --test-concurrency=4 "${TESTS[@]}" > "$W/$R/postflip-tests.log" 2>&1
printf '%s\n' '{"exit_code":0}' > "$W/$R/POSTFLIP-EXIT.json"
node "$J/validate_v181.mjs" > "$W/$R/validator-pass.log" 2>&1
python3 -B "$J/freeze_v181.py" --wt "$PWD" --output "$PWD/$R/FREEZE-SYNTHETIC.json" > "$W/$R/freeze-synthetic.log" 2>&1
cp "$R/FREEZE-SYNTHETIC.json" "$W/$R/FREEZE-SYNTHETIC.json"
npm run build > "$W/$R/build-postflip.log" 2>&1
printf '%s\n' '{"exit_code":0}' > "$W/$R/BUILD-POSTFLIP-EXIT.json"
node "$J/check_built_v181.mjs" > "$W/$R/built-check.log" 2>&1
cp "$R/BUILT-LINKS.json" "$W/$R/BUILT-LINKS.json"
python3 -B "$J/check_archive_kickers.py" > "$W/$R/archive-kickers.log" 2>&1
cp "$R/ARCHIVE-KICKERS.json" "$W/$R/ARCHIVE-KICKERS.json"
python3 -B "$J/capture_v181.py" --out "$W/$J/preview" > "$W/$R/capture.log" 2>&1
cd "$W"
rm -rf "$J/.pass" .next tsconfig.tsbuildinfo
