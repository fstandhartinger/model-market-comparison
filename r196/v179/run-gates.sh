#!/bin/bash
set -euo pipefail
J=$(cd "$(dirname "$0")" && pwd)
WT=${WT:-$(cd "$J/../.." && pwd)}
export WT
python3 -B "$J/prepare_v179.py" > "$J/receipts/prepare.log" 2>&1
python3 -B "$J/check_myles_pricing_v179.py" > "$J/receipts/myles-pricing.log" 2>&1
python3 -B "$J/check_source_v179.py" > "$J/receipts/source.log" 2>&1
python3 -B "$J/check_repro_v179.py" > "$J/receipts/repro.log" 2>&1
(cd "$WT" && node "$J/validate_v179.mjs") > "$J/receipts/validator.log" 2>&1
python3 -B "$J/check_bind_numbers_v179.py" > "$J/receipts/bind-numbers.log" 2>&1
python3 -B "$J/check_cost_kind_v179.py" > "$J/receipts/cost-kind.log" 2>&1
python3 -B "$J/check_fairness_text_v179.py" > "$J/receipts/fairness-text.log" 2>&1
python3 -B "$J/final_sanity_v179.py" > "$J/receipts/final-sanity.log" 2>&1
python3 -B "$J/check_public_fields_v179.py" > "$J/receipts/public-fields.log" 2>&1
python3 -B "$J/check_helpers_v179.py" > "$J/receipts/helpers.log" 2>&1
(cd "$WT" && timeout 600 ~/bin/heavy node --test --test-concurrency=2 test/release-page-seo.test.mjs test/jevbench-architecture-data.test.mjs test/jevbench-v179-release.test.mjs test/jevbench-v178-release.test.mjs test/cr-205-jev-page-structure.test.mjs) > "$J/receipts/release-tests.log" 2>&1
(cd "$WT" && timeout 600 ~/bin/heavy npx --no-install tsc --noEmit) > "$J/receipts/tsc.log" 2>&1
(cd "$WT" && timeout 1800 ~/bin/heavy npm run build) > "$J/receipts/build.log" 2>&1
timeout 1500 bash "$J/synthetic_gates_v179.sh" > "$J/receipts/synthetic-tests.log" 2>&1
(cd "$WT" && timeout 3600 ~/bin/heavy npm test) > "$J/receipts/fulltest.log" 2>&1
