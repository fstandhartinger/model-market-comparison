#!/usr/bin/env bash
# No dispatch, authority flip, seal or publication. Raw runs remain private symlinks.
set -euo pipefail
J=$(cd "$(dirname "$0")" && pwd)
/home/flori/bin/disk-preflight 6
bash "$J/baseline_v1643.sh"
timeout 120 systemd-run --user --scope -q -p MemoryMax=4G python3 -B "$J/prepare_v1643.py"
timeout 1800 systemd-run --user --scope -q -p MemoryMax=6G bash "$J/score_v1643.sh" v1.6.43-candidate
timeout 600 systemd-run --user --scope -q -p MemoryMax=4G bash "$J/run-finalize.sh"
node "$J/ranks_fixture_v1643.mjs"
python3 -B "$J/update_tests_v1643.py"
bash "$J/make_passtree_v1643.sh"
python3 -B "$J/verify_v1643.py" --repro
