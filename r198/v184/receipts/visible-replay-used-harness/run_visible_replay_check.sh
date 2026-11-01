#!/bin/bash
set -euo pipefail
W=$PWD;J=r198/v184;R=$J/receipts
[[ -d node_modules/next ]] || npm ci --ignore-scripts > "$R/visible-replay-npm-ci.log" 2>&1
python3 -B "$J/check_visible_replay_delta.py" > "$R/visible-replay-equivalence.log" 2>&1
node "$J/validate_v184.mjs" > "$R/visible-replay-validator.log" 2>&1
python3 -B "$J/check_public_text_v184.py" > "$R/visible-replay-public-text.log" 2>&1
python3 -B "$J/check_ref_pin_v184.py" > "$R/visible-replay-ref-pin.log" 2>&1
python3 -B "$J/check_helpers_v184.py" > "$R/visible-replay-helpers.log" 2>&1
python3 -B "$J/make_passtree_v184.py" > "$R/visible-replay-fixture.log" 2>&1
cd "$J/.pass"
python3 -B "$J/capture_visible_replay.py" "$W/$J/visible-replay-preview" > "$W/$R/visible-replay-render.log" 2>&1
cd "$W"
printf '%s\n' '{"status":"PASS","exit_code":0,"source":"One actual Granite model page; unchanged production TSX, final data-only replay delta; Next dev synthetic PASS, not a new production build"}' > "$R/VISIBLE-REPLAY-RENDER.json"
rm -rf "$J/.pass" .next tsconfig.tsbuildinfo
