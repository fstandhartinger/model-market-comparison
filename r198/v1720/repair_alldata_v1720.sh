#!/bin/bash
set -euo pipefail
[[ $(pwd -P) == /srv/heavy/jobs/*/work ]] || { echo 'Refused: disposable heavy snapshot required'; exit 3; }
python3 -B r198/v1720/make_passtree_v1720.py > r198/v1720/receipts/alldata-fixture.log
node r198/v1720/check_alldata_v1720.mjs "$PWD/r198/v1720/.pass"
