#!/bin/bash
set -euo pipefail
S=/home/flori/jobs/jevbench-add-requests-20260919/workers/r201-v181-build/score
H=/home/flori/jobs/jevbench-v16-run-20261001/harness
D=/home/flori/jevbench-sealed/v1.6-run/v1.6-regular-20261027
J=/home/flori/jobs/jevbench-add-requests-20260919
[[ $(sha256sum "$H/score_v16.py" | cut -d' ' -f1) == 02132271117653e6302c509232a581d0094f0e78eac8b1bfc67596fd5d5097e9 ]]
[[ $(sha256sum "$J/r160/scorer/score_v17.py" | cut -d' ' -f1) == 6363458d208a52f4ad5aaf73027cad1b7e0358ff962e581d57a3cc462c8f1978 ]]
export JEV_NOUL_METHOD=O1S PYTHONDONTWRITEBYTECODE=1
cd "$H"
common=(--release-dir "$D" --registry "$S/REGISTRY.json" --runs "$S/runs" --B 1000 --seed 16 --workers 3 --g-med-fixed 2.573387642438244 --cost-basis "$S/private/cost-basis.json")
python3 score_v16.py "${common[@]}" --revision v1.8.1-frozen --out "$S/out-frozen" > "$S/out-frozen.log" 2>&1
python3 "$J/r160/scorer/score_v17.py" "${common[@]}" --revision v1.8.1-off --out "$S/out-v17-off" > "$S/out-v17-off.log" 2>&1
python3 "$J/r160/scorer/score_v17.py" "${common[@]}" --revision v1.8.1-share --decision-limit-s 10 --timeout-treatment share --out "$S/out-v17-share" > "$S/out-v17-share.log" 2>&1
for m in off share;do
 mkdir -p "$S/cells/$m"
 python3 "$H/build_categories_v16.py" "$S/out-v17-$m/jevbench-v1.6.0-results.json" "$D/frozen/gold.jsonl" /opt/model-market-comparison/data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.4-categories.json "$S/cells/$m/categories.json" > "$S/cells/$m/categories.log" 2>&1
 python3 "$H/decisive_v16.py" "$D" "$S/REGISTRY.json" "$S/runs" "$S/cells/$m/decisive.json" > "$S/cells/$m/decisive.log" 2>&1
done
