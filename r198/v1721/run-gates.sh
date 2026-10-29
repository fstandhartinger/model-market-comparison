#!/bin/bash
set -euo pipefail
J=$(cd "$(dirname "$0")" && pwd)
cd "$J/../.."
BASE=${BASE:-dfad0a062b25fe6d6bd79fb1beb1af6a5e204f6e}
for name in repro source pricing_reference public_text raw helpers visibility;do
 script="$J/check_${name}_v1721.py"
 if [[ $name == source ]];then python3 -B "$script" "$BASE" > "$J/receipts/$name.log" 2>&1;else python3 -B "$script" > "$J/receipts/$name.log" 2>&1;fi
done
node "$J/validate_v1721.mjs" > "$J/receipts/validator.log" 2>&1
node "$J/check_alldata_v1721.mjs" > "$J/receipts/alldata-pending.log" 2>&1
node "$J/check_alldata_v1721.mjs" "$J/.pass" > "$J/receipts/alldata-pass.log" 2>&1
node "$J/check_preview_v1721.mjs" > "$J/receipts/preview-check.log" 2>&1
# The full suite is deliberately opt-in and run only once for this build.
if [[ ${RUN_HEAVY:-0} == 1 ]];then
 ~/bin/suite-slot --max-wait 1800 -- ~/bin/heavy-run --in "$PWD" --no-fallback --back r198/v1721/receipts --back test/fixtures/jevbench-v1721-ranks.json -- bash r198/v1721/heavy_v1721.sh
fi
