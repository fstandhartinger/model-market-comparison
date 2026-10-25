#!/bin/bash
# Isolated future-publication checks. Never changes the real review manifest.
set -euo pipefail
J=$(cd "$(dirname "$0")" && pwd)
WT=${WT:-$(cd "$J/../.." && pwd)}
export WT
python3 "$J/make_passtree_v172.py"
python3 - "$WT" "$J/.pass" <<'PY'
import pathlib,sys,shutil
W,P=map(pathlib.Path,sys.argv[1:])
if (P/'test').exists():shutil.rmtree(P/'test')
shutil.copytree(W/'test',P/'test')
for name in ['app','components','node_modules','scripts']:
 if not (P/name).exists():(P/name).symlink_to(W/name)
PY
(cd "$J/.pass" && timeout 600 ~/bin/heavy node --test --test-concurrency=2 \
 test/jevbench-v172-release.test.mjs test/jevbench-feed-live-board.test.mjs test/cr-303-feed-split.test.mjs \
 test/jevbench-v1630-release.test.mjs test/jevbench-v1630-open-fold.test.mjs test/jevbench-v1637-release.test.mjs test/jevbench-v170-release.test.mjs)
