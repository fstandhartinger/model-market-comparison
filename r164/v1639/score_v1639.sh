#!/bin/bash
# v1.6.39: 72 carried same-draw scorer rows plus one paid self-hosted row (h2o-lightning-31b); frozen common cost basis and scorer.
set -euo pipefail
export PYTHONDONTWRITEBYTECODE=1
OUTD=${OUTD:-out-v1639}; BOOT=${BOOT:-1000}
J=$(cd "$(dirname "$0")" && pwd)
BT=${V1639_BATCH:-$J/batch}; export V1639_BATCH=$BT
H=/home/flori/jobs/jevbench-v16-run-20261001/harness
D=/home/flori/jevbench-sealed/v1.6-run/v1.6-regular-20261012
CAT15=/opt/model-market-comparison/data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.4-categories.json
GMED=9.839526770355711
PRICING=/home/flori/jobs/jevbench-v15-measure-20260925/harness/pricing_v15.py
case "$(sha256sum $PRICING | cut -d" " -f1)" in a8a05890ddab2d39d1a1bd543f2b5c83842bdc70aa54766788bc89b7a8a448d7) echo pricing sha OK;; *) echo "WRONG PRICING MODULE"; exit 2;; esac
REV="${1:?revision label, e.g. v1.6.31-candidate}"
SHA=$(sha256sum $H/score_v16.py | cut -d' ' -f1)
case "$SHA" in 02132271117653e6302c509232a581d0094f0e78eac8b1bfc67596fd5d5097e9) echo "scorer sha OK $SHA";; *) echo "WRONG SCORER $SHA"; exit 2;; esac
rm -rf $BT/$OUTD
cd $H
JEV_NOUL_METHOD=O1S systemd-run --user --scope -q -p CPUQuota=${CPUQ:-200%} --nice=${NICEV:-15} python3 score_v16.py --release-dir $D \
  --registry $BT/REGISTRY-PUBLIC.json --runs $BT/runs --out $BT/$OUTD \
  --B $BOOT --seed 16 --workers ${WORKERS:-3} --revision "$REV" --g-med-fixed $GMED --cost-basis $BT/cost-basis-v1630.json | tee $BT/score-$OUTD.log
python3 build_categories_v16.py $BT/$OUTD/jevbench-v1.6.0-results.json $D/frozen/gold.jsonl \
  $CAT15 $BT/$OUTD/categories.json
JEV_NOUL_METHOD=O1S python3 decisive_v16.py $D $BT/REGISTRY-PUBLIC.json $BT/runs $BT/$OUTD/noul-decisive.json
sha256sum $BT/$OUTD/*
