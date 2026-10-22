#!/usr/bin/env bash
# Full deterministic candidate rebuild of v1.6.40 (one hosted-API row, fastino-glide-api); real review remains PENDING.
#   prepare            : registry/raw hashes, derived 1,497-item gold (make_gold_1497.py), price through the frozen module aa2afcd5
#   score_v1640.sh     : the unmodified frozen scorer on the derived gold, glide only
#   field_check        : reproduction of the 73 carried rows (real gold) and of the 17 API rows scored alone
#   topics, finalize   : topic cells, release files, wiring, top-five diff, preview
# The last step is the second pass: rebuild the release bytes again and require them byte-identical.
set -euo pipefail
J=$(cd "$(dirname "$0")" && pwd)
python3 "$J/prepare_v1640.py" "$@"
bash "$J/score_v1640.sh" v1.6.40-candidate
[ -n "${SKIP_FIELD:-}" ] || bash "$J/field_check_v1640.sh"
bash "$J/run-finalize.sh"
node "$J/ranks_fixture_v1640.mjs"
python3 "$J/update_tests_v1640.py"
bash "$J/make_passtree_v1640.sh"
python3 -B "$J/verify_v1640.py" --repro
