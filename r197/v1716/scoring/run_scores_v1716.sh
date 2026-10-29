#!/bin/bash
# v1.7.16 Phase A: re-score the four d1027 fields with the same-items cost rule. Same scorer commands/flags as
# r197/v1713/score/run_scores_h2o141.sh (B 1000, seed 16, workers 3, O1S, fixed reference G_med, 10 s share) PLUS
# --cost-basis (v1.6.30 precedent). Microsoft r2 keeps its own 1,493-item gold view and its own cost-basis file (same common set).
# usage: run_scores_v1716.sh <fields-dir>
set -uo pipefail
FS=$(readlink -f "$1"); G=2.573387642438244
J=/home/flori/jobs/jevbench-add-requests-20260919
H=/home/flori/jobs/jevbench-v16-run-20261001/harness
D=/home/flori/jevbench-sealed/v1.6-run/v1.6-regular-20261027
P=$J/r197/v1716/score/private
case "$(sha256sum $H/score_v16.py | cut -d' ' -f1)" in 02132271*) ;; *) echo WRONG SCORER; exit 2;; esac
case "$(sha256sum $J/r160/scorer/score_v17.py | cut -d' ' -f1)" in 6363458d*) ;; *) echo WRONG V17 SCORER; exit 2;; esac
cd $H
export JEV_NOUL_METHOD=O1S PYTHONDONTWRITEBYTECODE=1
for f in f13 f14 fms fst; do
  F=$FS/$f; RD=$D; CB=$P/cost-basis-v1716.json
  [ $f = fms ] && { RD=$D/runs-fastlane/microsoft-decision-1-r2-scoreview-1493; CB=$P/cost-basis-v1716-msft.json; }
  COMMON="--release-dir $RD --registry $F/REGISTRY.json --runs $F/runs --B 1000 --seed 16 --workers 3 --g-med-fixed $G --cost-basis $CB"
  nice -n 15 python3 score_v16.py $COMMON --revision v1.7.16-frozen --out $F/out-frozen > $F/out-frozen.log 2>&1; echo $f frozen rc $?
  nice -n 15 python3 $J/r160/scorer/score_v17.py $COMMON --revision v1.7.16-off --out $F/out-v17-off > $F/out-v17-off.log 2>&1; echo $f off rc $?
  nice -n 15 python3 $J/r160/scorer/score_v17.py $COMMON --revision v1.7.16-share --decision-limit-s 10 --timeout-treatment share --out $F/out-v17-share > $F/out-v17-share.log 2>&1; echo $f share rc $?
done
