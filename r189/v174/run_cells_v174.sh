#!/bin/bash
set -euo pipefail
J=$(cd "$(dirname "$0")" && pwd)
I=/home/flori/jobs/jevbench-auto-intake/r24-score
WT=${WT:-$(cd "$J/../.." && pwd)}
export CAT15="$WT/data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.4-categories.json"
timeout 600 bash "$J/cells_new_rows_v174.sh" dopest "$I/field-r12a/out-v17-off/jevbench-v1.6.0-results.json" "$I/field-r12a/out-v17-share/jevbench-v1.6.0-results.json" "$I/field-r12a2/REGISTRY.json" "$I/field-r12a2/runs"
python3 -B "$J/consolidate_new_rows_v174.py"
