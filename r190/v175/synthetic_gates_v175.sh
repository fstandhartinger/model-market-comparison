#!/bin/bash
# Future publication exercised solely in an isolated synthetic FAIR/PASS fixture.
set -euo pipefail
J=$(cd "$(dirname "$0")" && pwd)
WT=${WT:-$(cd "$J/../.." && pwd)}
export WT
python3 -B "$J/make_passtree_v175.py"
python3 - "$WT" "$J/.pass" <<'PY'
import pathlib,sys,shutil
W,P=map(pathlib.Path,sys.argv[1:])
if (P/'test').exists():shutil.rmtree(P/'test')
shutil.copytree(W/'test',P/'test')
for name in ['app','components','node_modules','scripts']:
 if not (P/name).exists():(P/name).symlink_to(W/name)
PY
(cd "$J/.pass" && timeout 600 ~/bin/heavy node --test --test-concurrency=2 \
 test/jevbench-v175-release.test.mjs test/jevbench-v174-release.test.mjs test/jevbench-v173-release.test.mjs test/jevbench-feed-live-board.test.mjs test/cr-303-feed-split.test.mjs \
 test/jevbench-v1630-release.test.mjs test/jevbench-v1630-open-fold.test.mjs test/jevbench-v1637-release.test.mjs test/jevbench-v170-release.test.mjs)
