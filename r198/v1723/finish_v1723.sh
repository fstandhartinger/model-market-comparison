#!/bin/bash
# Final checks after the five architecture prose corrections; the full suite has not run before this harness.
set -euo pipefail
[[ $(pwd -P) == /srv/heavy/jobs/*/work ]] || exit 3
J=r198/v1723; R=$J/receipts
npm ci --ignore-scripts > "$R/npm-ci-final.log" 2>&1
node "$J/validate_v1723.mjs" > "$R/validator.log" 2>&1
node "$J/check_alldata_v1723.mjs" > "$R/alldata-pending-final.log" 2>&1
npx --no-install tsc --noEmit > "$R/tsc.log" 2>&1
echo '{"exit_code":0,"scope":"Final 182-exception bundle"}' > "$R/TSC-EXIT.json"
TESTS=(test/jevbench-v1723-release.test.mjs test/jevbench-architecture-data.test.mjs)
node --test --test-concurrency=2 "${TESTS[@]}" > "$R/release-final.log" 2>&1
echo '{"exit_code":0,"scope":"Final v1.7.23 release and architecture suite; broader release-tests.log also passed before the five architecture-only corrections"}' > "$R/PENDING-EXIT.json"
python3 -B "$J/make_passtree_v1723.py" > "$R/heavy-fixture-final.log" 2>&1
mapfile -t FILES < "$J/.pass/SWAP-FILES.txt"
[ "${#FILES[@]}" -ge 1 ]
BK=$(mktemp -d)
for f in "${FILES[@]}";do mkdir -p "$BK/$(dirname "$f")";cp "$f" "$BK/$f";cp "$J/.pass/$f" "$f";done
restore(){ for f in "${FILES[@]}";do cp "$BK/$f" "$f";cmp "$BK/$f" "$f";done; echo 'All synthetic bindings restored byte-equal' >> "$R/heavy-fixture-final.log"; }
trap restore EXIT
python3 -B "$J/freeze_v1723.py" --wt "$PWD" --output "$PWD/$R/FREEZE-POSTFLIP-DRYRUN.json" > "$R/freeze-postflip-dryrun.log" 2>&1
node --test --test-concurrency=2 "${TESTS[@]}" > "$R/postflip-final.log" 2>&1
echo '{"exit_code":0,"scope":"Final v1.7.23 release and architecture suite; broader postflip-tests.log also passed before the five architecture-only corrections"}' > "$R/POSTFLIP-EXIT.json"
npm run build > "$R/build-postflip.log" 2>&1
node "$J/check_alldata_v1723.mjs" >> "$R/build-postflip.log" 2>&1
node "$J/check_built_links_v1723.mjs" >> "$R/build-postflip.log" 2>&1
python3 -B "$J/scan_rendered_v1723.py" > "$R/RENDERED-REPO-SCAN.json"
echo '{"exit_code":0,"scope":"Final 182-exception bundle"}' > "$R/BUILD-POSTFLIP-EXIT.json"
set +e
npm test > "$R/fulltest-postflip.log" 2>&1
rc=$?
set -e
printf '{"exit_code":%s,"command":"suite-slot heavy-run npm test (one full run; final 182-exception bundle)"}\n' "$rc" > "$R/FULLTEST-POSTFLIP-EXIT.json"
exit "$rc"
