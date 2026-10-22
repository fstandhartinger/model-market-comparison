#!/bin/bash
# Reproduction checks (aggregates only), run with the UNMODIFIED frozen scorer on the REAL 1,500-item gold:
#  (a) FIELD: the 73 carried registry rows -> every point estimate equals the published v1.6.39 row;
#  (b) STANDALONE: each API row scored alone (as fastino-glide-api is) equals its published row, i.e. a one-row invocation does not change an API row's numbers.
set -euo pipefail
export PYTHONDONTWRITEBYTECODE=1
J=$(cd "$(dirname "$0")" && pwd); BT=${V1640_BATCH:-$J/batch}
H=/home/flori/jobs/jevbench-v16-run-20261001/harness
D=/home/flori/jevbench-sealed/v1.6-run/v1.6-regular-20261012
GMED=9.839526770355711
[ "$(sha256sum $H/score_v16.py | cut -c1-8)" = 02132271 ] || { echo WRONG SCORER; exit 2; }
cd $H
JEV_NOUL_METHOD=O1S python3 score_v16.py --release-dir $D --registry $BT/REGISTRY-CARRIED.json --runs $BT/runs --out $BT/out-field-v1640 \
  --B 1000 --seed 16 --workers 3 --revision v1.6.40-field-check --g-med-fixed $GMED --cost-basis $BT/cost-basis-v1630.json | tail -1
python3 build_categories_v16.py $BT/out-field-v1640/jevbench-v1.6.0-results.json $D/frozen/gold.jsonl \
  /opt/model-market-comparison/data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.4-categories.json $BT/out-field-v1640/categories.json | tail -1
JEV_NOUL_METHOD=O1S python3 decisive_v16.py $D $BT/REGISTRY-CARRIED.json $BT/runs $BT/out-field-v1640/noul-decisive.json
python3 - "$BT" <<'PY'
import json, sys
bt = sys.argv[1]
reg = json.load(open(bt + "/REGISTRY-CARRIED.json"))
api = sorted(k for k, m in reg.items() if m["lane"] == "api")
json.dump({k: reg[k] for k in api}, open(bt + "/REGISTRY-CARRIED-API.json", "w"))
import os
os.makedirs(bt + "/runs-carried-api", exist_ok=True)
for k in api:
    d = bt + "/runs-carried-api/" + k + ".jsonl"
    if os.path.islink(d): os.unlink(d)
    os.symlink(os.path.realpath(bt + "/runs/" + k + ".jsonl"), d)
PY
JEV_NOUL_METHOD=O1S python3 score_v16.py --release-dir $D --registry $BT/REGISTRY-CARRIED-API.json --runs $BT/runs-carried-api --out $BT/out-api-alone-v1640 \
  --B 1000 --seed 16 --workers 3 --revision v1.6.40-api-alone-check --g-med-fixed $GMED --cost-basis $BT/cost-basis-v1630.json | tail -1
