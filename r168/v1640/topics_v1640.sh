#!/bin/bash
# v1.6.40 topic/use-case cells for the ONE new row: the UNCHANGED build_topics_v16.py (sha ec04ab59...) over the derived release dir (gold lacking
# the 3 custody-excluded ids) with the ruled label file lacking the same 3 ids (made by make_gold_1497.py; frozen labels be5a5209...),
# the glide registry/run and its scorer categories, and the v1.5.4 categories for the use-case labels/descriptions.
# JEV_NOUL_METHOD=O1S is required (the scorer's method). Carried rows' topic cells are not recomputed: the supplement keeps them byte-identical.
set -euo pipefail
export PYTHONDONTWRITEBYTECODE=1
B=${V1640_BATCH:-$(cd "$(dirname "$0")" && pwd)/batch}
H=/home/flori/jobs/jevbench-v16-run-20261001/harness
[ "$(sha256sum < $H/build_topics_v16.py | cut -c1-8)" = ec04ab59 ] || { echo "topic builder changed"; exit 2; }
[ "$(sha256sum < $B/rel1497/labels-1497.jsonl | cut -c1-8)" = aee4480b ] || { echo "derived labels changed"; exit 2; }
mkdir -p $B/topics-v1640 $B/runs-glide
cd $H
JEV_NOUL_METHOD=O1S python3 build_topics_v16.py $B/rel1497 $B/REGISTRY-GLIDE.json $B/runs-glide \
  $B/rel1497/labels-1497.jsonl $B/out-v1640/categories.json \
  $B/topics-v1640/categories-with-topics.json /opt/model-market-comparison/data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.4-categories.json \
  | tee $B/topics-v1640/build.log
