#!/bin/bash
# Cells (families, languages, use cases) + noul-decisive for microsoft-decision-1-r2, unchanged frozen tools under run_under_v17.py,
# same recipe as r197/v1714/scoring/cells_v1714.sh, except the release dir = the private 1,493-item gold view of draw
# v1.6-regular-20261027 (the 7 items the provider had seen earlier are excluded; same view the round-2 scores were computed on).
# No build_topics_v16.py (the draw has no topic labels). usage: cells_v1715.sh <field-dir> <cat15-json>
set -euo pipefail
export PYTHONDONTWRITEBYTECODE=1 JEV_NOUL_METHOD=O1S
J=/home/flori/jobs/jevbench-add-requests-20260919
RUN=$J/r160/scorer/run_under_v17.py
H=/home/flori/jobs/jevbench-v16-run-20261001/harness
RD=/home/flori/jevbench-sealed/v1.6-run/v1.6-regular-20261027/runs-fastlane/microsoft-decision-1-r2-scoreview-1493
case "$(sha256sum $RD/frozen/gold.jsonl | cut -d' ' -f1)" in 120d0ba7*) ;; *) echo WRONG GOLD VIEW; exit 2;; esac
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
