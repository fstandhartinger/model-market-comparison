#!/bin/bash
set -euo pipefail
J=$(cd "$(dirname "$0")" && pwd)
I=/home/flori/jobs/jevbench-auto-intake/r24-score
C=/home/flori/jobs/jevbench-add-requests-20260919/workers/r181-chonfast-score/field-chonfast
for spec in 'r10a r10a2' 'r10b r10b2'; do
 read -r old new <<< "$spec"
 timeout 600 bash "$J/cells_new_rows_v171.sh" "$old" "$I/field-$old/out-v17-off/jevbench-v1.6.0-results.json" "$I/field-$old/out-v17-share/jevbench-v1.6.0-results.json" "$I/field-$new/REGISTRY.json" "$I/field-$new/runs"
done
timeout 600 bash "$J/cells_new_rows_v171.sh" chonfast "$C/out-v17-off/jevbench-v1.6.0-results.json" "$C/out-v17-share/jevbench-v1.6.0-results.json" "$C/REGISTRY.json" "$C/runs"
