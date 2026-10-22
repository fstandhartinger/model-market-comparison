#!/usr/bin/env bash
# Full deterministic candidate rebuild; real review remains PENDING.
#   (no flag)        variant A: Drex Max priced at its launch list price (current pricing module a8a05890)
#   --without-drex   variant C: Myles-G 12B + iota-decide-4b only, no Drex row (run it in a scratch checkout of the base)
#   --drex-unpriced  variant B (Drex unpriced): kept in prepare only, no longer rebuilt or verified
# The last step is the second pass: rebuild the release bytes again and require them byte-identical.
set -euo pipefail
J=$(cd "$(dirname "$0")" && pwd)
python3 "$J/prepare_v1638.py" "$@"
bash "$J/score_v1638.sh" v1.6.38-candidate
bash "$J/run-finalize.sh"
node "$J/ranks_fixture_v1638.mjs"
python3 "$J/update_tests_v1638.py"
bash "$J/make_passtree_v1638.sh"
python3 -B "$J/verify_v1638.py" --repro
