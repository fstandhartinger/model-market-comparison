#!/bin/bash
set -euo pipefail
J=$(cd "$(dirname "$0")" && pwd)
cd "$J/../.."
BASE=${BASE:-6ef616054c679ad69bd8366654ba92e471bca74a}
for name in repro source pricing_reference public_text raw helpers visibility;do
 script="$J/check_${name}_v1717.py"
 if [[ $name == source ]];then python3 -B "$script" "$BASE" > "$J/receipts/$name.log" 2>&1;else python3 -B "$script" > "$J/receipts/$name.log" 2>&1;fi
done
node "$J/validate_v1717.mjs" > "$J/receipts/validator.log" 2>&1
node "$J/check_preview_v1717.mjs" > "$J/receipts/preview-check.log" 2>&1
# The full suite is deliberately opt-in and run only once for this build.
if [[ ${RUN_HEAVY:-0} == 1 ]];then
 ~/bin/suite-slot --max-wait 1800 -- ~/bin/heavy-run --in "$PWD" --no-fallback --back r198/v1717/receipts --back test/fixtures/jevbench-v1717-ranks.json -- bash r198/v1717/heavy_v1717.sh
fi
