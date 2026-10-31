#!/bin/bash
# Lead (run 208): v1.8.4 release suites on the REAL flipped manifest (review PASS, standing GO). No builds, no seals.
set -euo pipefail
[[ $(pwd -P) == /srv/heavy/jobs/*/work ]] || { echo 'Disposable heavy snapshot required';exit 3; }
W=$PWD;J=r198/v184;R=$J/receipts/postflip-real
mkdir -p "$R"
[[ -d node_modules/next ]] || npm ci --ignore-scripts > "$R/npm-ci.log" 2>&1
node "$J/validate_v184.mjs" > "$R/validator.log" 2>&1
# Broad release integration suites already passed PENDING and synthetic PASS;
# this checks the real review-bound manifest through the four modified release-history tests.
TESTS=(test/jevbench-v184-release.test.mjs test/jevbench-v183-release.test.mjs test/jevbench-v182-release.test.mjs test/jevbench-v181-release.test.mjs)
for f in "${TESTS[@]}";do [[ -f $f ]] || { echo "Required test missing: $f";exit 3; };done
node --test --test-concurrency=2 "${TESTS[@]}" > "$R/suites.log" 2>&1
printf '%s\n' '{"status":"PASS"}' > "$R/POSTFLIP-REAL.json"
rm -rf .next tsconfig.tsbuildinfo
