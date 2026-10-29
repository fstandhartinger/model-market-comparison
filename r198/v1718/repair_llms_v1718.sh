#!/bin/bash
# Reverify the changed candidate after the full suite exposed the over-cap text-export omission.
set -euo pipefail
[[ $(pwd -P) == /srv/heavy/jobs/*/work ]] || { echo 'Refused: disposable heavy snapshot required'; exit 3; }
J=r198/v1718; R=$J/receipts
rm -f "$R/TSC-EXIT.json" "$R/BUILD-POSTFLIP-EXIT.json" "$R/BUILT-LINKS.json"
npm ci --ignore-scripts > "$R/npm-ci.log" 2>&1
npx --no-install tsc --noEmit > "$R/tsc.log" 2>&1
printf '%s\n' '{"exit_code":0}' > "$R/TSC-EXIT.json"
node --test --test-concurrency=2 test/jevbench-seo.test.mjs > "$R/seo-pending-fix.log" 2>&1
printf '%s\n' '{"exit_code":0}' > "$R/SEO-PENDING-FIX-EXIT.json"
python3 -B "$J/make_passtree_v1718.py" > "$R/heavy-fixture.log" 2>&1
mapfile -t FILES < "$J/.pass/SWAP-FILES.txt"
BK=$(mktemp -d)
for f in "${FILES[@]}";do mkdir -p "$BK/$(dirname "$f")";cp "$f" "$BK/$f";cp "$J/.pass/$f" "$f";done
restore(){ for f in "${FILES[@]}";do cp "$BK/$f" "$f";cmp "$BK/$f" "$f";done;rm -rf "$BK" .next tsconfig.tsbuildinfo "$J/.pass"; echo 'All synthetic bindings restored byte-equal' >> "$R/heavy-fixture.log"; }
trap restore EXIT
node --test --test-concurrency=2 test/jevbench-seo.test.mjs test/jevbench-v1718-release.test.mjs > "$R/seo-postflip-fix.log" 2>&1
printf '%s\n' '{"exit_code":0}' > "$R/SEO-POSTFLIP-FIX-EXIT.json"
npm run build > "$R/build-postflip.log" 2>&1
node "$J/check_built_links_v1718.mjs" >> "$R/build-postflip.log" 2>&1
printf '%s\n' '{"exit_code":0}' > "$R/BUILD-POSTFLIP-EXIT.json"
# The brief permits one full-suite invocation: preserve that run's result and repair only affected gates.
printf '%s\n' '{"status":"PASS","full_suite_rerun":false,"reason":"one full suite requested; affected SEO cases and compiled text route reverified"}' > "$R/LLMS-REPAIR.json"
