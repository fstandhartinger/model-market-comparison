#!/usr/bin/env bash
set -euo pipefail
J=$(cd "$(dirname "$0")" && pwd); WT=$(cd "$J/../.." && pwd)
bash "$J/topics_v1638.sh"
rm -f "$J/receipts/topfive-diff.json"
python3 "$J/build_publication_v1638.py"
python3 "$J/make_lib_v1638.py"
python3 "$J/wire_v1638.py" "$WT"
bash "$J/make_passtree_v1638.sh"
(cd "$J/pass" && node "$J/topfive_v1638.mjs") > "$J/receipts/topfive-after.json"
python3 "$J/topfive_diff_v1638.py" "$WT"
python3 "$J/build_publication_v1638.py"
python3 "$J/make_lib_v1638.py"
bash "$J/make_passtree_v1638.sh"
python3 "$J/preview_v1638.py"
