#!/bin/bash
# Only disposable heavy-run snapshot; the real manifests remain PENDING.
set -euo pipefail
[[ $(pwd -P) == /srv/heavy/jobs/*/work ]] || { echo 'Refused: disposable heavy snapshot required'; exit 3; }
J=r198/v1719; R=$J/receipts
# Clear prior-run success receipts so an early failure cannot look complete.
rm -f "$R/TSC-EXIT.json" "$R/PENDING-EXIT.json" "$R/POSTFLIP-EXIT.json" "$R/BUILD-POSTFLIP-EXIT.json" "$R/FULLTEST-POSTFLIP-EXIT.json" "$R/BUILT-LINKS.json"
npm ci --ignore-scripts > "$R/npm-ci.log" 2>&1
npx --no-install tsc --noEmit > "$R/tsc.log" 2>&1
printf '%s\n' '{"exit_code":0}' > "$R/TSC-EXIT.json"
TESTS=(test/jevbench-v1719-release.test.mjs test/jevbench-v1718-release.test.mjs test/jevbench-v1717-release.test.mjs test/jevbench-v1716-release.test.mjs test/jevbench-v1715-release.test.mjs test/jevbench-v1714-release.test.mjs test/jevbench-v1713-release.test.mjs test/jevbench-v1712-release.test.mjs test/cr-303-feed-split.test.mjs test/jevbench-breakdowns-every-listed-row.test.mjs test/jevbench-v1630-open-fold.test.mjs test/jevbench-v1630-release.test.mjs test/cr-205-jev-page-structure.test.mjs test/jevbench-merged-board.test.mjs test/jevbench-feed-live-board.test.mjs test/jevbench-v1637-release.test.mjs test/jevbench-v170-release.test.mjs test/sitemap-releases-redirects.test.mjs test/jevbench-architecture-data.test.mjs test/release-page-seo.test.mjs test/jevbench-seo.test.mjs)
node --test --test-concurrency=2 "${TESTS[@]}" > "$R/release-tests.log" 2>&1
printf '%s\n' '{"exit_code":0}' > "$R/PENDING-EXIT.json"
python3 -B "$J/make_passtree_v1719.py" > "$R/heavy-fixture.log" 2>&1
test -s test/fixtures/jevbench-v1719-ranks.json
node "$J/visibility_v1719.mjs" "$J/.pass" > "$R/visibility-pass.json"

python3 -B "$J/make_passtree_v1719.py" --v1719 absent --out "$J/.baseline" >> "$R/heavy-fixture.log" 2>&1
node "$J/visibility_v1719.mjs" "$PWD/$J/.baseline" > "$R/visibility-before.json"
node "$J/check_visibility_v1719.mjs" > "$R/visibility.log"
node "$J/topfive_v1719.mjs" "$PWD/$J/.baseline" > "$R/topfive-before.json"
node "$J/topfive_v1719.mjs" "$PWD/$J/.pass" > "$R/topfive-after.json"
node "$J/check_assembled_v1719.mjs"
node "$J/ranks_fixture_v1719.mjs" "$PWD/$J/.pass" "$PWD/test/fixtures/jevbench-v1719-ranks.json"
rm -rf "$J/.baseline"
mapfile -t FILES < "$J/.pass/SWAP-FILES.txt"
BK=$(mktemp -d)
for f in "${FILES[@]}";do mkdir -p "$BK/$(dirname "$f")";cp "$f" "$BK/$f";cp "$J/.pass/$f" "$f";done
restore(){ for f in "${FILES[@]}";do cp "$BK/$f" "$f";cmp "$BK/$f" "$f";done;rm -rf "$BK" .next tsconfig.tsbuildinfo "$J/.pass"; echo 'All synthetic bindings restored byte-equal' >> "$R/heavy-fixture.log"; }
trap restore EXIT
node --test --test-concurrency=2 "${TESTS[@]}" test/jevbench-v163-fresh-source.test.mjs > "$R/postflip-tests.log" 2>&1
printf '%s\n' '{"exit_code":0}' > "$R/POSTFLIP-EXIT.json"
npm run build > "$R/build-postflip.log" 2>&1
node "$J/check_built_links_v1719.mjs" >> "$R/build-postflip.log" 2>&1
printf '%s\n' '{"exit_code":0}' > "$R/BUILD-POSTFLIP-EXIT.json"
# One full suite. Missing .git/HEAD is the lead's accepted environmental exception.
set +e
npm test > "$R/fulltest-postflip.log" 2>&1
rc=$?
set -e
printf '{"exit_code":%s,"command":"suite-slot heavy-run npm test (one run)"}\n' "$rc" > "$R/FULLTEST-POSTFLIP-EXIT.json"
exit "$rc"
