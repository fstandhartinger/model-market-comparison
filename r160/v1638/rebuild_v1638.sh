#!/usr/bin/env bash
# Full deterministic one-flag candidate rebuild; real review remains PENDING.
set -euo pipefail
J=$(cd "$(dirname "$0")" && pwd)
python3 "$J/prepare_v1638.py" "$@"
bash "$J/score_v1638.sh" v1.6.38-candidate
bash "$J/run-finalize.sh"
node "$J/ranks_fixture_v1638.mjs"
python3 "$J/update_tests_v1638.py"
bash "$J/make_passtree_v1638.sh"
