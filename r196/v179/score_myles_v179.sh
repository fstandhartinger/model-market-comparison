#!/bin/bash
# Existing measurement only; fixed O1S method, seed 46, B=1000; never calls an API.
set -euo pipefail
J=$(cd "$(dirname "$0")" && pwd)
export JEV_NOUL_METHOD=O1S PYTHONDONTWRITEBYTECODE=1 PYTHONHASHSEED=0
for mode in share off; do
 flags=(); if [ "$mode" = share ]; then flags=(--decision-limit-s 10 --timeout-treatment share); fi
 timeout 1200 systemd-run --user --scope -q -p MemoryMax=4G -p CPUQuota=150% nice -n 19 ionice -c 3 python3 -B /home/flori/jobs/jevbench-add-requests-20260919/r160/scorer/score_v17.py --release-dir /home/flori/jevbench-sealed/v1.6-run/v1.6-regular-20261012 --registry "$J/inputs/MYLESG12-REGISTRY.json" --runs /home/flori/jobs/jevbench-add-requests-20260919/r160/v170/bases/d1012b/runs --out "$J/scoring/$mode" --B 1000 --seed 46 --workers 1 --g-med-fixed 9.839526770355711 --cost-basis /home/flori/jobs/jevbench-add-requests-20260919/r154/v1636/batch/cost-basis-v1630.json "${flags[@]}" --revision v1.7.9 > "$J/receipts/myles-$mode.log" 2>&1
done
