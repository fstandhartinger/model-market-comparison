#!/bin/bash
set -euo pipefail
J=$(cd "$(dirname "$0")" && pwd)
I=/home/flori/jobs/jevbench-add-requests-20260919/workers/r185-e4b-score/field-chone4b
WT=${WT:-$(cd "$J/../.." && pwd)}
export CAT15="$WT/data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.4-categories.json"
timeout 600 bash "$J/cells_new_rows_v173.sh" chone4b "$I/out-v17-off/jevbench-v1.6.0-results.json" "$I/out-v17-share/jevbench-v1.6.0-results.json" "$I/REGISTRY.json" "$I/runs"
I=/home/flori/jobs/scaledown-eval-neal-20261023/official/field-sd
timeout 600 bash "$J/cells_new_rows_v173.sh" scaledown "$I/out-v17-off/jevbench-v1.6.0-results.json" "$I/out-v17-share/jevbench-v1.6.0-results.json" "$I/REGISTRY.json" "$I/runs"
python3 -B "$J/consolidate_new_rows_v173.py"
