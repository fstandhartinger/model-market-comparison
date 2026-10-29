#!/bin/bash
# Runs only on the heavy-run disposable snapshot. No sealed data or real publication writes.
set -euo pipefail
[[ $(pwd -P) == /srv/heavy/jobs/*/work ]] || { echo 'Refused: this harness requires a disposable heavy-run snapshot' >&2; exit 3; }
J=r198/v1723; R=$J/receipts
npm ci --ignore-scripts > "$R/npm-ci.log" 2>&1
node "$J/validate_v1723.mjs" > "$R/validator.log" 2>&1
node "$J/check_alldata_v1723.mjs" > "$R/alldata-pending-final.log" 2>&1
npx --no-install tsc --noEmit > "$R/tsc.log" 2>&1
printf '%s\n' '{"exit_code":0,"command":"suite-slot heavy-run tsc --noEmit"}' > "$R/TSC-EXIT.json"
python3 -B "$J/make_passtree_v1723.py" > "$R/heavy-fixture.log" 2>&1
node "$J/ranks_fixture_v1723.mjs" "$PWD/$J/.pass" "$PWD/test/fixtures/jevbench-v1723-ranks.json" > "$R/heavy-ranks.log" 2>&1
TESTS=(test/jevbench-v1723-release.test.mjs test/jevbench-v1722-release.test.mjs test/jevbench-v1721-release.test.mjs test/jevbench-v1720-release.test.mjs test/jevbench-v1719-release.test.mjs test/jevbench-v1718-release.test.mjs test/jevbench-v1717-release.test.mjs test/jevbench-v1716-release.test.mjs test/jevbench-v1715-release.test.mjs test/jevbench-v1714-release.test.mjs test/jevbench-v1713-release.test.mjs test/jevbench-v1712-release.test.mjs test/cr-303-feed-split.test.mjs test/jevbench-breakdowns-every-listed-row.test.mjs test/jevbench-v1630-open-fold.test.mjs test/jevbench-v1630-release.test.mjs test/cr-205-jev-page-structure.test.mjs test/jevbench-merged-board.test.mjs test/jevbench-feed-live-board.test.mjs test/jevbench-v1637-release.test.mjs test/jevbench-v170-release.test.mjs test/sitemap-releases-redirects.test.mjs test/jevbench-architecture-data.test.mjs test/release-page-seo.test.mjs test/jevbench-alldata-fetch.test.mjs)
set +e
node --test --test-concurrency=2 "${TESTS[@]}" > "$R/release-tests.log" 2>&1
rc=$?
set -e
printf '{"exit_code":%s}\n' "$rc" > "$R/PENDING-EXIT.json"
python3 - <<'PY'
from pathlib import Path
import re
s=Path('r198/v1723/receipts/release-tests.log').read_text()
failures=re.findall(r'^not ok \d+ - (.*)$',s,re.M)
assert failures in [[],['gate: no listed row lacks topic, use-case or language cells without a recorded exception']],s[-2500:]
PY
python3 -B "$J/make_passtree_v1723.py" > "$R/heavy-fixture.log" 2>&1
mapfile -t FILES < "$J/.pass/SWAP-FILES.txt"
[ "${#FILES[@]}" -ge 1 ]
BK=$(mktemp -d)
for f in "${FILES[@]}";do mkdir -p "$BK/$(dirname "$f")";cp "$f" "$BK/$f";cp "$J/.pass/$f" "$f";done
restore(){ for f in "${FILES[@]}";do cp "$BK/$f" "$f";cmp "$BK/$f" "$f";done;rm -rf "$BK" .next tsconfig.tsbuildinfo "$J/.pass"; echo 'All synthetic bindings restored byte-equal' >> "$R/heavy-fixture.log"; }
trap restore EXIT
python3 -B "$J/freeze_v1723.py" --wt "$PWD" --output "$PWD/$R/FREEZE-POSTFLIP-DRYRUN.json" > "$R/freeze-postflip-dryrun.log" 2>&1
node --test --test-concurrency=2 "${TESTS[@]}" test/jevbench-v163-fresh-source.test.mjs > "$R/postflip-tests.log" 2>&1
printf '%s\n' '{"exit_code":0}' > "$R/POSTFLIP-EXIT.json"
npm run build > "$R/build-postflip.log" 2>&1
node "$J/check_alldata_v1723.mjs" >> "$R/build-postflip.log" 2>&1
node "$J/check_built_links_v1723.mjs" >> "$R/build-postflip.log" 2>&1
python3 -B "$J/scan_rendered_v1723.py" > "$R/RENDERED-REPO-SCAN.json"
printf '%s\n' '{"exit_code":0}' > "$R/BUILD-POSTFLIP-EXIT.json"
set +e
npm test > "$R/fulltest-postflip.log" 2>&1
rc=$?
set -e
printf '{"exit_code":%s,"command":"suite-slot heavy-run npm test (one run)"}\n' "$rc" > "$R/FULLTEST-POSTFLIP-EXIT.json"
exit "$rc"
