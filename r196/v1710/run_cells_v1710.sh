#!/bin/bash
set -euo pipefail
J=$(cd "$(dirname "$0")" && pwd)
export CAT15="$J/../../data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.4-categories.json"
for k in phillylabs_philly_decider_v2 iota-decide-4b-v0.3 decisio-qwen3.6-35b-a3b-v090; do
 runs=$(python3 -c 'import json,sys,pathlib; d=json.load(open(sys.argv[1]))[sys.argv[2]]; print(pathlib.Path(d["v17-share"]["path"]).parents[1]/"runs")' "$J/receipts/INPUTS.json" "$k")
 bash "$J/cells_new_rows_v1710.sh" "$k" "$J/scoring/$k/off.json" "$J/scoring/$k/share.json" "$J/scoring/$k/registry.json" "$runs"
done
