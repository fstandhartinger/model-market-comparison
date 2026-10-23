#!/usr/bin/env bash
set -euo pipefail
J=$(cd "$(dirname "$0")" && pwd);WT=$(cd "$J/../.." && pwd);V=$WT/data/raw/benchmarks/jevbench/v1.6
printf '%s\n' '{"engine":"synthetic-review-only","verdict":"PASS"}' > "$J/receipts/TEST-PASS-ONLY.json"
printf '%s\n' '{"engine":"synthetic-review-only","verdict":"REVISE"}' > "$J/receipts/TEST-REVISE-ONLY.json"
sha256sum "$V/jevbench-v1.6.42-publication.json" > "$J/receipts/MANIFEST-before.txt"
WT="$WT" python3 "$J/flip_verdict_v1642.py" "$J/receipts/TEST-PASS-ONLY.json" --dry-run > "$J/receipts/FLIP-DRY.log"
if WT="$WT" python3 "$J/flip_verdict_v1642.py" "$J/receipts/TEST-PASS-ONLY.json" > "$J/receipts/FLIP-REFUSED.log" 2>&1;then exit 1;fi
if WT="$WT" python3 "$J/flip_verdict_v1642.py" "$J/receipts/TEST-REVISE-ONLY.json" --dry-run > "$J/receipts/FLIP-REVISE.log" 2>&1;then exit 1;fi
python3 "$J/freeze_v1642.py" --wt "$WT" > "$J/receipts/FREEZE-DRY.log"
if python3 "$J/freeze_v1642.py" --wt "$WT" --write > "$J/receipts/FREEZE-REFUSED.log" 2>&1;then exit 1;fi
sha256sum "$V/jevbench-v1.6.42-publication.json" > "$J/receipts/MANIFEST-after.txt"
cmp "$J/receipts/MANIFEST-before.txt" "$J/receipts/MANIFEST-after.txt"
test ! -e /home/flori/jevbench-sealed/v1.6-run/v1.6-regular-20261012/frozen-release-v1.6.42
printf 'PASS: flip/freeze dry-run; synthetic flip, REVISE and seal writes refused; manifest unchanged; no seal\n'
