#!/bin/bash
# v1.6.38: 69 carried same-draw scorer rows plus three paid rows; frozen common cost basis and scorer.
set -euo pipefail
export PYTHONDONTWRITEBYTECODE=1
OUTD=${OUTD:-out-v1638}; BOOT=${BOOT:-1000}
J=/home/flori/jobs/jevbench-add-requests-20260919/workers/r160-v1638-build2/wt/r160/v1638
BT=${V1638_BATCH:-$J/batch}; export V1638_BATCH=$BT
H=/home/flori/jobs/jevbench-v16-run-20261001/harness
D=/home/flori/jevbench-sealed/v1.6-run/v1.6-regular-20261012
CAT15=/opt/model-market-comparison/data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.4-categories.json
GMED=9.839526770355711
PRICING=/home/flori/jobs/jevbench-v15-measure-20260925/harness/pricing_v15.py
case "$(sha256sum $PRICING | cut -d" " -f1)" in 1f4d1f7b1ce97ab27b938043444b9c2757e4a9dbecc799a803122588401f5bf1) echo pricing sha OK;; *) echo "WRONG PRICING MODULE"; exit 2;; esac
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
