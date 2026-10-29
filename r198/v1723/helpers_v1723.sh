#!/bin/bash
set -euo pipefail
[[ $(pwd -P) == /srv/heavy/jobs/*/work ]] || exit 3
J=r198/v1723; R=$J/receipts
python3 -B "$J/make_passtree_v1723.py" > "$R/helper-fixture.log" 2>&1
mkdir -p "$J/.pass/$R"
cp "$R/topfive-diff.json" "$J/.pass/$R/topfive-diff.json"
OUT="$PWD/$J/.pass/$R/FREEZE-DRYRUN.json"
python3 -B "$J/freeze_v1723.py" --wt "$PWD/$J/.pass" --output "$OUT" > "$R/freeze-dryrun.log" 2>&1
cp "$OUT" "$R/FREEZE-SYNTHETIC-DRYRUN.json"
echo '{"status":"PASS","real_manifest":"PENDING","synthetic_freeze_only":true,"seal_written":false,"fixed":"Copied the approval-bound top-five receipt into the disposable fixture before freeze inspection"}' > "$R/AUX-EXIT.json"
