#!/usr/bin/env bash
# Full deterministic candidate rebuild of v1.6.42 (one paid self-hosted row, torchcast-decision-4b-v1.3); real review remains PENDING.
#   prepare          : registry/raw hashes, price through the frozen module aa2afcd5, 73-row field registry + the new row
#   score_v1642.sh   : the unmodified frozen scorer, one field invocation on the real 1,500-item gold, --cost-basis
#   topics, finalize : topic cells, release files, wiring, top-five diff, preview
# The last step is the second pass: rebuild the release bytes again and require them byte-identical.
set -euo pipefail
J=$(cd "$(dirname "$0")" && pwd)
python3 "$J/prepare_v1642.py" "$@"
bash "$J/score_v1642.sh" v1.6.42-candidate
bash "$J/run-finalize.sh"
node "$J/ranks_fixture_v1642.mjs"
python3 "$J/update_tests_v1642.py"
bash "$J/make_passtree_v1642.sh"
python3 -B "$J/verify_v1642.py" --repro
python3 -B "$J/make_v17_input_v1642.py"
