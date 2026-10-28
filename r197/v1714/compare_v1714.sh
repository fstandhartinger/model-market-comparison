#!/bin/bash
# Recompute every comparison from captured aggregates; PENDING never appears in the real board.
# Baseline = the v1.7.13 board as it will be after its flip (synthetic PASS copy); candidate = v1.7.13 + v1.7.14 synthetic PASS.
set -euo pipefail
J=$(cd "$(dirname "$0")" && pwd)
export WT=${WT:-$(cd "$J/../.." && pwd)} V1714_RELEASE_DATE=${V1714_RELEASE_DATE:-2026-10-28}
cd "$WT"
KEYS=arcbright-elf-1-12b-r2,decisio-gemma-4-12b-tuned-commit-think,jeff_1_1_large,jeff_1_1_qwen_4b,torchcast-decision-31b-v1.0,h2o-lightning-4b-v1.4.1
python3 -B "$J/build_publication_v1714.py" --comparison-only
python3 -B "$J/make_lib_v1714.py"
python3 -B "$J/wire_v1714.py"
python3 -B "$J/make_passtree_v1714.py" --v1714 absent --out "$J/.pass/.alt-absent" >/dev/null
WATCH_KEYS=$KEYS node "$J/topfive_v1714.mjs" "$J/.pass/.alt-absent" > "$J/receipts/topfive-before-pristine.json"
python3 -B "$J/make_passtree_v1714.py" --v1714 pending --out "$J/.pass/.alt-pending" >/dev/null
WATCH_KEYS=$KEYS node "$J/topfive_v1714.mjs" "$J/.pass/.alt-pending" > "$J/receipts/topfive-before.json"
python3 -B "$J/make_passtree_v1714.py" --v1714 pass >/dev/null
WATCH_KEYS=$KEYS node "$J/topfive_v1714.mjs" "$J/.pass" > "$J/receipts/topfive-after.json"
node "$J/extended_preview_v1714.mjs"
node "$J/slider_preview_v1714.mjs"
node "$J/custom_preview_v1714.mjs"
python3 -B "$J/topfive_diff_v1714.py"
python3 - "$J" <<'PY'
import hashlib,json,pathlib,sys
j=pathlib.Path(sys.argv[1]);p=j/'inputs/APPROVAL.json';d=json.loads(p.read_text());d['top_five_preview']['sha256']=hashlib.sha256((j/'receipts/topfive-diff.json').read_bytes()).hexdigest();d['top_five_effect']='changed' if json.loads((j/'receipts/topfive-diff.json').read_text())['changed'] else 'unchanged';p.write_text(json.dumps(d,indent=1,sort_keys=True)+'\n')
PY
bash "$J/rebuild_v1714.sh"
python3 -B "$J/make_passtree_v1714.py" >/dev/null
node "$J/ranks_fixture_v1714.mjs" "$J/.pass" "$WT/test/fixtures/jevbench-v1714-ranks.json"
python3 -B "$J/preview_v1714.py" > "$J/receipts/preview.log" 2>&1
