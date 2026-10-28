#!/bin/bash
# v1.7.13 Phase A: same scorer commands/flags as r196/score-iota03/run_scores.sh (B 1000, seed 16, workers 3, O1S),
# except: release dir = fresh draw v1.6-regular-20261027; --g-med-fixed = the merged board's reference G_med
# (data/jevbench-draw-equating.json reference.G_med = v1.7.x results G_med); no --cost-basis (no other row on this draw:
# all 1,500 items). usage: run_scores_h2o141.sh <field-dir> [gmed]
set -uo pipefail
F=$(readlink -f "$1"); G=${2:-2.573387642438244}
J=/home/flori/jobs/jevbench-add-requests-20260919
H=/home/flori/jobs/jevbench-v16-run-20261001/harness
D=/home/flori/jevbench-sealed/v1.6-run/v1.6-regular-20261027
case "$(sha256sum $H/score_v16.py | cut -d' ' -f1)" in 02132271*) ;; *) echo WRONG SCORER; exit 2;; esac
case "$(sha256sum $J/r160/scorer/score_v17.py | cut -d' ' -f1)" in 6363458d*) ;; *) echo WRONG V17 SCORER; exit 2;; esac
cd $H
export JEV_NOUL_METHOD=O1S PYTHONDONTWRITEBYTECODE=1
COMMON="--release-dir $D --registry $F/REGISTRY.json --runs $F/runs --B 1000 --seed 16 --workers 3 --g-med-fixed $G"
nice -n 15 python3 score_v16.py $COMMON --revision v1.7.13-frozen --out $F/out-frozen > $F/out-frozen.log 2>&1; echo frozen rc $?
nice -n 15 python3 $J/r160/scorer/score_v17.py $COMMON --revision v1.7.13-off --out $F/out-v17-off > $F/out-v17-off.log 2>&1; echo off rc $?
nice -n 15 python3 $J/r160/scorer/score_v17.py $COMMON --revision v1.7.13-share --decision-limit-s 10 --timeout-treatment share --out $F/out-v17-share > $F/out-v17-share.log 2>&1; echo share rc $?
