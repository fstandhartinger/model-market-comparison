#!/usr/bin/env bash
set -euo pipefail
J=$(cd "$(dirname "$0")" && pwd);B=$J/batch
H=/home/flori/jobs/jevbench-v16-run-20261001/harness
D=/home/flori/jevbench-sealed/v1.6-run/v1.6-regular-20261012
CAT15=/opt/model-market-comparison/data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.4-categories.json
cd "$H"
export JEV_NOUL_METHOD=O1S PYTHONDONTWRITEBYTECODE=1
python3 build_categories_v16.py "$B/out-v1643/jevbench-v1.6.0-results.json" "$D/frozen/gold.jsonl" "$CAT15" "$B/out-v1643/categories.json"
python3 decisive_v16.py "$D" "$B/REGISTRY-FIELD.json" "$B/runs" "$B/out-v1643/noul-decisive.json"
