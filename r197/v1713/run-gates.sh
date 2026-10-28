#!/bin/bash
set -euo pipefail
J=$(cd "$(dirname "$0")" && pwd)
cd "$J/../.."
python3 -B "$J/check_pricing_reference_v1713.py" > "$J/receipts/pricing-references.log" 2>&1
python3 -B "$J/check_repro_v1713.py" > "$J/receipts/repro.log" 2>&1
timeout 120 systemd-run --user --scope -q -p MemoryMax=4G python3 -B "$J/check_raw_v1713.py" > "$J/receipts/raw.log" 2>&1
node "$J/check_preview_v1713.mjs" > "$J/receipts/preview-check.log" 2>&1
python3 -B "$J/check_source_v1713.py" > "$J/receipts/source.log" 2>&1
python3 -B "$J/check_public_text_v1713.py" > "$J/receipts/public-text.log" 2>&1
node "$J/validate_v1713.mjs" > "$J/receipts/validator.log" 2>&1
python3 -B "$J/check_helpers_v1713.py" > "$J/receipts/helpers.log" 2>&1
timeout 600 ~/bin/heavy node --test --test-concurrency=3 test/cr-303-feed-split.test.mjs test/jevbench-breakdowns-every-listed-row.test.mjs test/jevbench-v1630-open-fold.test.mjs test/jevbench-v1630-release.test.mjs test/jevbench-v1713-release.test.mjs test/jevbench-v1712-release.test.mjs test/cr-205-jev-page-structure.test.mjs test/jevbench-merged-board.test.mjs test/jevbench-feed-live-board.test.mjs test/jevbench-v1637-release.test.mjs test/jevbench-v170-release.test.mjs test/sitemap-releases-redirects.test.mjs test/jevbench-architecture-data.test.mjs test/release-page-seo.test.mjs > "$J/receipts/release-tests.log" 2>&1
timeout 600 ~/bin/heavy npx --no-install tsc --noEmit > "$J/receipts/tsc.log" 2>&1
printf '%s\n' '{"exit_code":0,"command":"npx --no-install tsc --noEmit"}' > "$J/receipts/TSC-EXIT.json"
python3 -B "$J/make_passtree_v1713.py" >/dev/null
python3 -B "$J/check_visibility_v1713.py" > "$J/receipts/visibility.log" 2>&1
bash "$J/postflip_sim_v1713.sh" > "$J/receipts/postflip-sim.log" 2>&1
bash "$J/postflip_build_v1713.sh"
if [[ "${RUN_FULL_SUITE:-0}" == 1 ]]; then
 bash "$J/postflip_fulltest_v1713.sh"
fi
