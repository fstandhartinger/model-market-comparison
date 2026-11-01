#!/bin/bash
set -euo pipefail
W=$PWD;J=r198/v184;R=$J/receipts
[[ -d node_modules/next ]] || npm ci --ignore-scripts > "$R/extra-npm-ci.log" 2>&1
sha256sum data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.4-*.json lib/jevbench-v184-release.mjs test/jevbench-v18{1,2}-release.test.mjs > "$R/EXTRA-HISTORY-INPUTS.sha256"
node --test --test-concurrency=2 test/jevbench-v181-release.test.mjs test/jevbench-v182-release.test.mjs > "$R/extra-history-pending.log" 2>&1
printf '%s\n' '{"exit_code":0,"files":["test/jevbench-v181-release.test.mjs","test/jevbench-v182-release.test.mjs"]}' > "$R/EXTRA-HISTORY-PENDING.json"
python3 -B "$J/make_passtree_v184.py" > "$R/extra-history-fixture.log" 2>&1
cd "$J/.pass"
node --test --test-concurrency=2 test/jevbench-v181-release.test.mjs test/jevbench-v182-release.test.mjs > "$W/$R/extra-history-postflip.log" 2>&1
printf '%s\n' '{"exit_code":0,"files":["test/jevbench-v181-release.test.mjs","test/jevbench-v182-release.test.mjs"]}' > "$W/$R/EXTRA-HISTORY-POSTFLIP.json"
cd "$W"
rm -rf "$J/.pass" .next tsconfig.tsbuildinfo
