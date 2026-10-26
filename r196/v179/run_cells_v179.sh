#!/bin/bash
set -euo pipefail
J=$(cd "$(dirname "$0")" && pwd)
I=/home/flori/jobs/jevbench-auto-intake/r24-score/field-r16b
export CAT15="${WT:?}/data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.4-categories.json"
timeout 600 bash "$J/cells_new_rows_v179.sh" gliclass9b "$I/out-v17-off/jevbench-v1.6.0-results.json" "$I/out-v17-share/jevbench-v1.6.0-results.json" "$I/REGISTRY.json" "$I/runs"
python3 -B "$J/consolidate_new_rows_v179.py"
