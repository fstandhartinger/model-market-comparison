#!/bin/bash
set -euo pipefail
J=$(cd "$(dirname "$0")" && pwd)
cd "$J/../.."
python3 -B "$J/check_pricing_reference_v1710.py" > "$J/receipts/pricing-references.log" 2>&1
python3 -B "$J/check_repro_v1710.py" > "$J/receipts/repro.log" 2>&1
timeout 120 systemd-run --user --scope -q -p MemoryMax=4G python3 -B "$J/check_iota_raw_v1710.py" > "$J/receipts/iota-raw.log" 2>&1
node "$J/check_preview_v1710.mjs" > "$J/receipts/preview-check.log" 2>&1
python3 -B "$J/check_source_v1710.py" > "$J/receipts/source.log" 2>&1
node "$J/validate_v1710.mjs" > "$J/receipts/validator.log" 2>&1
python3 -B "$J/check_helpers_v1710.py" > "$J/receipts/helpers.log" 2>&1
timeout 600 ~/bin/heavy node --test --test-concurrency=2 test/release-page-seo.test.mjs test/jevbench-architecture-data.test.mjs test/jevbench-v1710-release.test.mjs test/jevbench-v179-release.test.mjs test/cr-205-jev-page-structure.test.mjs > "$J/receipts/release-tests.log" 2>&1
timeout 600 ~/bin/heavy npx --no-install tsc --noEmit > "$J/receipts/tsc.log" 2>&1
printf '%s\n' '{"exit_code":0,"command":"npx --no-install tsc --noEmit"}' > "$J/receipts/TSC-EXIT.json"
timeout 1800 ~/bin/heavy npm run build > "$J/receipts/build.log" 2>&1
printf '%s\n' '{"exit_code":0,"command":"npm run build"}' > "$J/receipts/BUILD-EXIT.json"
if [[ "${RUN_FULL_SUITE:-0}" == 1 ]]; then
 timeout 3600 ~/bin/heavy npm test > "$J/receipts/fulltest.log" 2>&1
fi
