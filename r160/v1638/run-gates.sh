#!/usr/bin/env bash
set -euo pipefail
J=$(cd "$(dirname "$0")" && pwd); PASS=${V1638_PASS:-$J/pass}
cd "$PASS"
run() { local name=$1;shift;set +e; /home/flori/bin/heavy nice -n 15 "$@" > "$J/receipts/$name.log" 2>&1;local code=$?;set -e;printf '%s %s\n' "$name" "$code" | tee -a "$J/receipts/GATES.txt";return "$code"; }
: > "$J/receipts/GATES.txt"
run tsc node node_modules/typescript/bin/tsc --noEmit
run release node --test "$PASS/test/jevbench-v1638-release.test.mjs"
run targeted env GIT_EDITOR=true node --test --test-concurrency=3 test/jevbench-cohort-supersession.test.mjs test/jevbench-seo.test.mjs test/jevbench-system-pages.test.mjs test/cr-279-agent-feed.test.mjs test/jevbench-v1637-release.test.mjs test/jevbench-v1636-release.test.mjs test/jevbench-v1635-release.test.mjs test/jevbench-v1630-open-fold.test.mjs test/jevbench-v1630-release.test.mjs test/jevbench-v1629-release.test.mjs test/cr-205-jev-page-structure.test.mjs test/cr-303*.test.mjs test/jevbench-merged-board.test.mjs test/jevbench-architecture*.test.mjs test/jevbench-v163-fresh-source.test.mjs test/cr-292*.test.mjs test/jevbench-v1623-release.test.mjs test/jevbench-v1620-release.test.mjs test/jevbench-v1626-release.test.mjs test/cr-257-category-radars.test.mjs
run build env NEXT_BUILD_CPUS=3 CIRCLE_NODE_TOTAL=3 npm run build
[ -n "${V1638_SKIP_FULL:-}" ] || run fulltest env GIT_EDITOR=true node --test --test-concurrency=6 test/
