#!/bin/bash
# Recompute every comparison from captured aggregates; PENDING never appears in the real board.
set -euo pipefail
J=$(cd "$(dirname "$0")" && pwd)
export WT=${WT:-$(cd "$J/../.." && pwd)}
cd "$WT"
python3 -B "$J/build_publication_v1710.py" --comparison-only
python3 -B "$J/make_lib_v1710.py"
python3 -B "$J/wire_v1710.py"
node "$J/topfive_v1710.mjs" "$WT" > "$J/receipts/topfive-before.json"
python3 -B "$J/make_passtree_v1710.py"
node "$J/topfive_v1710.mjs" "$J/.pass" > "$J/receipts/topfive-after.json"
node "$J/extended_preview_v1710.mjs"
node "$J/slider_preview_v1710.mjs"
node "$J/custom_preview_v1710.mjs"
python3 -B "$J/topfive_diff_v1710.py"
python3 - "$J" <<'PY'
import hashlib,json,pathlib,sys
j=pathlib.Path(sys.argv[1]);p=j/'inputs/APPROVAL.json';d=json.loads(p.read_text());d['top_five_preview']['sha256']=hashlib.sha256((j/'receipts/topfive-diff.json').read_bytes()).hexdigest();p.write_text(json.dumps(d,indent=1,sort_keys=True)+'\n')
PY
bash "$J/rebuild_v1710.sh"
python3 -B "$J/make_passtree_v1710.py"
node "$J/ranks_fixture_v1710.mjs" "$J/.pass" "$WT/test/fixtures/jevbench-v1710-ranks.json"
python3 -B "$J/preview_v1710.py" > "$J/receipts/preview.log" 2>&1
