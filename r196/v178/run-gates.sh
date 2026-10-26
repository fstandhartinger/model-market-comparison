#!/bin/bash
set -euo pipefail
J=$(cd "$(dirname "$0")" && pwd)
WT=${WT:-$(cd "$J/../.." && pwd)}
export WT
python3 -B "$J/prepare_v178.py" > "$J/receipts/prepare.log" 2>&1
python3 -B "$J/check_source_v178.py" > "$J/receipts/source.log" 2>&1
python3 -B "$J/check_repro_v178.py" > "$J/receipts/repro.log" 2>&1
(cd "$WT" && node "$J/validate_v178.mjs") > "$J/receipts/validator.log" 2>&1
python3 -B "$J/check_fairness_text_v178.py" > "$J/receipts/fairness-text.log" 2>&1
python3 -B "$J/final_sanity_v178.py" > "$J/receipts/final-sanity.log" 2>&1
python3 -B "$J/check_public_fields_v178.py" > "$J/receipts/public-fields.log" 2>&1
python3 -B "$J/check_helpers_v178.py" > "$J/receipts/helpers.log" 2>&1
(cd "$WT" && timeout 600 ~/bin/heavy node --test --test-concurrency=2 test/release-page-seo.test.mjs test/jevbench-architecture-data.test.mjs test/jevbench-v178-release.test.mjs test/jevbench-v177-release.test.mjs test/cr-205-jev-page-structure.test.mjs) > "$J/receipts/release-tests.log" 2>&1
(cd "$WT" && timeout 600 ~/bin/heavy npx --no-install tsc --noEmit) > "$J/receipts/tsc.log" 2>&1
(cd "$WT" && timeout 1800 ~/bin/heavy npm run build) > "$J/receipts/build.log" 2>&1
timeout 600 bash "$J/synthetic_gates_v178.sh" > "$J/receipts/synthetic-tests.log" 2>&1
(cd "$WT" && timeout 1800 ~/bin/heavy npm test) > "$J/receipts/fulltest.log" 2>&1
