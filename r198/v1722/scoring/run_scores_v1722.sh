#!/bin/bash
set -euo pipefail
S=/home/flori/jobs/jevbench-add-requests-20260919/workers/r198-v1722-build/score
F=$S/field/fnew
D=/home/flori/jevbench-sealed/v1.6-run/v1.6-regular-20261027
H=/home/flori/jobs/jevbench-v16-run-20261001/harness
J=/home/flori/jobs/jevbench-add-requests-20260919
[[ $(sha256sum "$H/score_v16.py" | cut -d' ' -f1) == 02132271117653e6302c509232a581d0094f0e78eac8b1bfc67596fd5d5097e9 ]]
[[ $(sha256sum "$J/r160/scorer/score_v17.py" | cut -d' ' -f1) == 6363458d208a52f4ad5aaf73027cad1b7e0358ff962e581d57a3cc462c8f1978 ]]
export JEV_NOUL_METHOD=O1S PYTHONDONTWRITEBYTECODE=1
cd "$H"
common=(--release-dir "$D" --registry "$F/REGISTRY.json" --runs "$F/runs" --B 1000 --seed 16 --workers 3 --g-med-fixed 2.573387642438244 --cost-basis "$S/private/cost-basis-v1722.json")
nice -n 15 python3 score_v16.py "${common[@]}" --revision v1.7.22-frozen --out "$F/out-frozen" > "$F/out-frozen.log" 2>&1
nice -n 15 python3 "$J/r160/scorer/score_v17.py" "${common[@]}" --revision v1.7.22-off --out "$F/out-v17-off" > "$F/out-v17-off.log" 2>&1
nice -n 15 python3 "$J/r160/scorer/score_v17.py" "${common[@]}" --revision v1.7.22-share --decision-limit-s 10 --timeout-treatment share --out "$F/out-v17-share" > "$F/out-v17-share.log" 2>&1
