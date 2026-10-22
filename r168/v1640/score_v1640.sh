#!/bin/bash
# v1.6.40: ONE hosted-API row (fastino-glide-api) scored by a second invocation of the UNMODIFIED frozen scorer 02132271 on the derived
# release directory batch/rel1497 (gold.jsonl lacks exactly the 3 custody-excluded ids; everything else identical). Carried rows are not
# re-scored (their v1.6.39 bytes are carried and verified later). Same release recipe: O1S, B=1000, seed 16, fixed G_med, common cost basis.
set -euo pipefail
export PYTHONDONTWRITEBYTECODE=1
OUTD=${OUTD:-out-v1640}; BOOT=${BOOT:-1000}
J=$(cd "$(dirname "$0")" && pwd)
BT=${V1640_BATCH:-$J/batch}; export V1640_BATCH=$BT
H=/home/flori/jobs/jevbench-v16-run-20261001/harness
D=$BT/rel1497
CAT15=/opt/model-market-comparison/data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.4-categories.json
GMED=9.839526770355711
PRICING=/home/flori/jobs/jevbench-v15-measure-20260925/harness/pricing_v15.py
case "$(sha256sum $PRICING | cut -d" " -f1)" in aa2afcd5a58d0c4cc0e3d6867d590c70b6ac58e971410c27faf9628f97bcf8b7) echo pricing sha OK;; *) echo "WRONG PRICING MODULE"; exit 2;; esac
REV="${1:?revision label, e.g. v1.6.40-candidate}"
SHA=$(sha256sum $H/score_v16.py | cut -d' ' -f1)
case "$SHA" in 02132271117653e6302c509232a581d0094f0e78eac8b1bfc67596fd5d5097e9) echo "scorer sha OK $SHA";; *) echo "WRONG SCORER $SHA"; exit 2;; esac
[ "$(sha256sum < $D/frozen/gold.jsonl | cut -c1-64)" = 9f1f8200d0a1b4384f43ffc0a91f3f36e4790fc3dbcef7486bf233b0142baa47 ] || { echo "WRONG DERIVED GOLD"; exit 2; }
mkdir -p $BT/runs-glide; ln -sfn $BT/runs/fastino-glide-api.jsonl $BT/runs-glide/fastino-glide-api.jsonl
rm -rf $BT/$OUTD
cd $H
JEV_NOUL_METHOD=O1S systemd-run --user --scope -q -p CPUQuota=${CPUQ:-200%} --nice=${NICEV:-15} python3 score_v16.py --release-dir $D \
  --registry $BT/REGISTRY-GLIDE.json --runs $BT/runs-glide --out $BT/$OUTD \
  --B $BOOT --seed 16 --workers ${WORKERS:-3} --revision "$REV" --g-med-fixed $GMED --cost-basis $BT/cost-basis-v1630.json | tee $BT/score-$OUTD.log
python3 build_categories_v16.py $BT/$OUTD/jevbench-v1.6.0-results.json $D/frozen/gold.jsonl \
  $CAT15 $BT/$OUTD/categories.json
JEV_NOUL_METHOD=O1S python3 decisive_v16.py $D $BT/REGISTRY-GLIDE.json $BT/runs-glide $BT/$OUTD/noul-decisive.json
sha256sum $BT/$OUTD/*
