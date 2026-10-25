#!/bin/bash
# Sandy-only, aggregate category extraction with the unchanged frozen tools.
set -euo pipefail
J=$(cd "$(dirname "$0")" && pwd)
I=/home/flori/jobs/jevbench-auto-intake/r24-score
WT=${WT:-$(cd "$J/../.." && pwd)}
export CAT15="$WT/data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.4-categories.json"
timeout 600 bash "$J/cells_new_rows_v172.sh" r11a "$I/field-r11a/out-v17-off/jevbench-v1.6.0-results.json" "$I/field-r11a/out-v17-share/jevbench-v1.6.0-results.json" "$I/field-r11a2/REGISTRY.json" "$I/field-r11a2/runs"
python3 -B "$J/consolidate_new_rows_v172.py"
