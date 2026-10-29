#!/bin/bash
set -euo pipefail
S=/home/flori/jobs/jevbench-add-requests-20260919/workers/r198-v1722-build/score
F=$S/field/fnew
H=/home/flori/jobs/jevbench-v16-run-20261001/harness
D=/home/flori/jevbench-sealed/v1.6-run/v1.6-regular-20261027
export JEV_NOUL_METHOD=O1S PYTHONDONTWRITEBYTECODE=1
for m in off share;do
 mkdir -p "$F/cells/$m"
 python3 "$H/build_categories_v16.py" "$F/out-v17-$m/jevbench-v1.6.0-results.json" "$D/frozen/gold.jsonl" /opt/model-market-comparison/data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.4-categories.json "$F/cells/$m/categories.json"
 python3 "$H/decisive_v16.py" "$D" "$F/REGISTRY.json" "$F/runs" "$F/cells/$m/decisive.json"
done
