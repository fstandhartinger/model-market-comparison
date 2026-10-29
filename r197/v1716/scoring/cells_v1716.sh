#!/bin/bash
# Cells (families, languages, use cases) + noul-decisive for the v1.7.16 rows (strike-1 + equality check of carried rows), unchanged frozen tools under run_under_v17.py,
# same recipe as r196/v1710/cells_new_rows_v1710.sh but on draw v1.6-regular-20261027 and WITHOUT build_topics_v16.py
# (the draw has no topic labels; topics are optional on the site since PR #338).
# usage: cells_v1716.sh <field-dir> <cat15-json>
set -euo pipefail
export PYTHONDONTWRITEBYTECODE=1 JEV_NOUL_METHOD=O1S
J=/home/flori/jobs/jevbench-add-requests-20260919
RUN=$J/r160/scorer/run_under_v17.py
H=/home/flori/jobs/jevbench-v16-run-20261001/harness
RD=/home/flori/jevbench-sealed/v1.6-run/v1.6-regular-20261027
F=$(readlink -f "$1"); CAT15=$(readlink -f "$2")
O=$F/cells; mkdir -p $O; chmod 700 $O; cd $H
for mode in off share; do
  flags=""; res=$F/out-v17-off/jevbench-v1.6.0-results.json
  [ "$mode" = share ] && { flags="--decision-limit-s 10 --timeout-treatment share"; res=$F/out-v17-share/jevbench-v1.6.0-results.json; }
  mkdir -p $O/$mode
  systemd-run --user --scope -q -p MemoryMax=4G nice -n 19 python3 $RUN $flags build_categories_v16.py $res $RD/frozen/gold.jsonl $CAT15 $O/$mode/categories.json > $O/$mode/categories.log 2>&1
  systemd-run --user --scope -q -p MemoryMax=4G nice -n 19 python3 $RUN $flags decisive_v16.py $RD $F/REGISTRY.json $F/runs $O/$mode/decisive.json > $O/$mode/decisive.log 2>&1
done
sha256sum $O/*/categories.json $O/*/decisive.json
