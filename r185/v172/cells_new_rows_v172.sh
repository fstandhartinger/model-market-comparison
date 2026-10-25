#!/bin/bash
# Cells (families, languages, use cases, topics) and noul-decisive for rows scored outside the S12 bases (a NEW row of v1.7.1, or a v1.6.38 row pre-scored for the rebuild),
# with the UNCHANGED frozen tools under run_under_v17.py, same recipe as workers/r160-v171-s3/src/cells_draw.sh + run_decisive.sh (draw v1.6-regular-20261012, O1S).
# usage: cells_new_rows_v171.sh <tag> <results-off.json> <results-share.json> <registry.json> <runs-dir>
# RD / LABELS (env) override the release dir and the labels file: the hosted-GLiDE row uses the derived 1,497-item gold and labels (bases/d1022g/rel1497).
set -euo pipefail
export PYTHONDONTWRITEBYTECODE=1 JEV_NOUL_METHOD=O1S
J=/home/flori/jobs/jevbench-add-requests-20260919
RUN=$J/r160/scorer/run_under_v17.py
H=/home/flori/jobs/jevbench-v16-run-20261001/harness
RD=${RD:-/home/flori/jevbench-sealed/v1.6-run/v1.6-regular-20261012}
LABELS=${LABELS:-/home/flori/jevbench-sealed/v1.6-run/topic-categories-v1/labels-v1621-d3-ruled.jsonl}
CAT15=${CAT15:?set CAT15 to the worktree v1.5.4 categories JSON}
tag=$1; roff=$2; rsh=$3; reg=$4; runs=$5
O=$(cd "$(dirname "$0")" && pwd)/cells/new-rows/$tag; mkdir -p $O; chmod 700 $O; cd $H
for mode in off share; do
  flags=""; res=$roff; [ "$mode" = share ] && { flags="--decision-limit-s 10 --timeout-treatment share"; res=$rsh; }
  mkdir -p $O/$mode
  systemd-run --user --scope -q -p MemoryMax=4G nice -n 19 ionice -c 3 python3 $RUN $flags build_categories_v16.py $res $RD/frozen/gold.jsonl $CAT15 $O/$mode/categories.json > $O/$mode/categories.log
  systemd-run --user --scope -q -p MemoryMax=4G nice -n 19 ionice -c 3 python3 $RUN $flags build_topics_v16.py $RD $reg $runs $LABELS $O/$mode/categories.json $O/$mode/categories-with-topics.json $CAT15 > $O/$mode/topics.log
  systemd-run --user --scope -q -p MemoryMax=4G nice -n 19 ionice -c 3 python3 $RUN $flags decisive_v16.py $RD $reg $runs $O/$mode/decisive.json > $O/$mode/decisive.log
done
sha256sum $O/*/categories-with-topics.json $O/*/decisive.json
