#!/bin/bash
set -euo pipefail
J=$(cd "$(dirname "$0")" && pwd)
export WT=${WT:-$(cd "$J/../.." && pwd)}
python3 -B "$J/make_passtree_v177.py"
python3 - "$WT" "$J/.pass" <<'PY'
import pathlib,sys,shutil
W,P=map(pathlib.Path,sys.argv[1:])
if (P/'test').exists():shutil.rmtree(P/'test')
shutil.copytree(W/'test',P/'test')
for name in ['app','components','node_modules','scripts']:
 if not (P/name).exists():(P/name).symlink_to(W/name)
PY
(cd "$J/.pass" && timeout 600 ~/bin/heavy node --test --test-concurrency=2 test/jevbench-v177-release.test.mjs)
(cd "$J/.pass" && timeout 600 ~/bin/heavy node --test --test-concurrency=2 test/jevbench-feed-live-board.test.mjs test/cr-303-feed-split.test.mjs test/jevbench-v1630-release.test.mjs test/jevbench-v1630-open-fold.test.mjs test/jevbench-v1637-release.test.mjs test/jevbench-v170-release.test.mjs)
