#!/bin/bash
# Release owner: bounded tests of the REAL independent-review-bound v188 manifest.
# No build, model query, seal or publication. Public-only heavy snapshot required.
set -euo pipefail
[[ $(pwd -P) == /srv/heavy/jobs/*/work ]] || { echo 'Disposable heavy snapshot required'; exit 3; }
[[ ${1:-} =~ ^[a-f0-9]{64}$ ]] || { echo 'Actual independent review receipt SHA256 required'; exit 3; }
W=$PWD; J=r198/v188; R=$J/receipts/postflip-real
mkdir -p "$R"
[[ -d node_modules/next ]] || npm ci --ignore-scripts > "$R/npm-ci.log" 2>&1
node --input-type=module - "$1" <<'JS'
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readJevbenchV188ForBoard} from './lib/jevbench-v188-release.mjs';
const m=JSON.parse(readFileSync('data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.8-publication.json'));
assert.equal(m.review.verdict,'PASS');
assert.equal(m.review.receipt_sha256,process.argv[2]);
assert.ok(m.review.engine && !/^(fixture|synthetic|pending|dry-run)/i.test(m.review.engine));
assert.ok(await readJevbenchV188ForBoard(),'Actual review-bound release must be publicly visible');
JS
node "$J/validate_v188.mjs" > "$R/validator.log" 2>&1
TESTS=(test/jevbench-v188-release.test.mjs test/jevbench-v187-release.test.mjs test/jevbench-v186-release.test.mjs test/jevbench-v185-release.test.mjs test/jevbench-v183-release.test.mjs test/jevbench-v182-release.test.mjs test/jevbench-v181-release.test.mjs)
for f in "${TESTS[@]}"; do [[ -f $f ]] || { echo "Required test missing: $f"; exit 3; }; done
node --test --test-concurrency=2 "${TESTS[@]}" > "$R/suites.log" 2>&1
printf '%s\n' '{"status":"PASS","scope":"real independent-review-bound manifest; five release suites and validator"}' > "$R/POSTFLIP-REAL.json"
rm -rf .next tsconfig.tsbuildinfo
