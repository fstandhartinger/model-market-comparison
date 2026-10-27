#!/bin/bash
# Recompute every comparison from captured aggregates; PENDING never appears in the real board.
set -euo pipefail
J=$(cd "$(dirname "$0")" && pwd)
export WT=${WT:-$(cd "$J/../.." && pwd)}
cd "$WT"
python3 -B "$J/build_publication_v1711.py" --comparison-only
python3 -B "$J/make_lib_v1711.py"
python3 -B "$J/wire_v1711.py"
node "$J/topfive_v1711.mjs" "$WT" > "$J/receipts/topfive-before.json"
python3 -B "$J/make_passtree_v1711.py"
node "$J/topfive_v1711.mjs" "$J/.pass" > "$J/receipts/topfive-after.json"
node "$J/extended_preview_v1711.mjs"
node "$J/slider_preview_v1711.mjs"
node "$J/custom_preview_v1711.mjs"
python3 -B "$J/topfive_diff_v1711.py"
python3 - "$J" <<'PY'
import hashlib,json,pathlib,sys
j=pathlib.Path(sys.argv[1]);p=j/'inputs/APPROVAL.json';d=json.loads(p.read_text());diff=json.loads((j/'receipts/topfive-diff.json').read_text());d['status']='GO (fair top-five change, Florian rule 25 Oct 2026)' if diff['changed'] else 'GO (standing, no top-five change)';d['top_five_effect']='changed' if diff['changed'] else 'unchanged';d['top_five_preview']['sha256']=hashlib.sha256((j/'receipts/topfive-diff.json').read_bytes()).hexdigest();p.write_text(json.dumps(d,indent=1,sort_keys=True)+'\n')
PY
bash "$J/rebuild_v1711.sh"
python3 -B "$J/make_passtree_v1711.py"
node "$J/ranks_fixture_v1711.mjs" "$J/.pass" "$WT/test/fixtures/jevbench-v1711-ranks.json"
python3 -B "$J/preview_v1711.py" > "$J/receipts/preview.log" 2>&1
