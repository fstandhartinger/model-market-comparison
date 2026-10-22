#!/bin/bash
# v1.6.39 topic/use-case cells: the UNCHANGED build_topics_v16.py (sha ec04ab59...) over this release's registry, runs and
# scorer categories, with the supplement's ruled label file (be5a5209...) and the v1.5.4 categories for the use-case
# labels/descriptions (7th argument). JEV_NOUL_METHOD=O1S is required (the scorer's method; without it noul items score
# differently and the carried cells move). Run after score_v1639.sh.
set -euo pipefail
export PYTHONDONTWRITEBYTECODE=1
B=${V1639_BATCH:-$(cd "$(dirname "$0")" && pwd)/batch}
H=/home/flori/jobs/jevbench-v16-run-20261001/harness
[ "$(sha256sum < $H/build_topics_v16.py | cut -c1-8)" = ec04ab59 ] || { echo "topic builder changed"; exit 2; }
mkdir -p $B/topics-v1639
cd $H
JEV_NOUL_METHOD=O1S python3 build_topics_v16.py /home/flori/jevbench-sealed/v1.6-run/v1.6-regular-20261012 $B/REGISTRY-PUBLIC.json $B/runs \
  /home/flori/jevbench-sealed/v1.6-run/topic-categories-v1/labels-v1621-d3-ruled.jsonl $B/out-v1639/categories.json \
  $B/topics-v1639/categories-with-topics.json /opt/model-market-comparison/data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.4-categories.json \
  | tee $B/topics-v1639/build.log
