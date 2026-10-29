#!/bin/bash
set -euo pipefail
J=$(cd "$(dirname "$0")" && pwd)
cd "$J/../.."
BASE=${BASE:-89a9594688b6d8f78bdba0b136c20590729b640f}
for name in repro source pricing_reference public_text raw helpers visibility;do
 script="$J/check_${name}_v1722.py"
 if [[ $name == source ]];then python3 -B "$script" "$BASE" > "$J/receipts/$name.log" 2>&1;else python3 -B "$script" > "$J/receipts/$name.log" 2>&1;fi
done
node "$J/validate_v1722.mjs" > "$J/receipts/validator.log" 2>&1
node "$J/check_alldata_v1722.mjs" > "$J/receipts/alldata-pending.log" 2>&1
node "$J/check_alldata_v1722.mjs" "$J/.pass" > "$J/receipts/alldata-pass.log" 2>&1
node "$J/check_preview_v1722.mjs" > "$J/receipts/preview-check.log" 2>&1
# The full suite is deliberately opt-in and run only once for this build.
if [[ ${RUN_HEAVY:-0} == 1 ]];then
 ~/bin/suite-slot --max-wait 1800 -- ~/bin/heavy-run --in "$PWD" --no-fallback --back r198/v1722/receipts --back test/fixtures/jevbench-v1722-ranks.json -- env RUN_FULL="${RUN_FULL:-0}" bash r198/v1722/heavy_v1722.sh
fi
