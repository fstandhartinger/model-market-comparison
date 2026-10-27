#!/bin/bash
# Post-flip simulation: swap the synthetic PASS manifest/proof/loader from .pass into the worktree, run the release and
# roster suites, then restore and verify the original bytes. Synthetic PASS/FAIR confer no authority.
set -uo pipefail
J=$(cd "$(dirname "$0")" && pwd); W=$(cd "$J/../.." && pwd); V=data/raw/benchmarks/jevbench/v1.7
cd "$W"; B=$(mktemp -d)
FILES="$V/jevbench-v1.7.13-publication.json $V/jevbench-v1.7.13-proof.json lib/jevbench-v1713-release.mjs"
before=$(sha256sum $FILES)
for f in $FILES; do cp "$f" "$B/$(basename $f)"; cp "$J/.pass/$f" "$f"; done
timeout 900 ~/bin/heavy node --test --test-concurrency=3 test/cr-303-feed-split.test.mjs test/jevbench-breakdowns-every-listed-row.test.mjs test/jevbench-v1630-open-fold.test.mjs test/jevbench-v1630-release.test.mjs test/jevbench-v1713-release.test.mjs > "$J/receipts/postflip-fix-tests.log" 2>&1; rc=$?
for f in $FILES; do cp "$B/$(basename $f)" "$f"; done; rm -rf "$B"
after=$(sha256sum $FILES); [ "$before" == "$after" ] || { echo "RESTORE MISMATCH"; exit 3; }
echo "postflip tests rc $rc; real manifest/proof/loader restored byte-equal"; grep -E "^# (tests|pass|fail)" "$J/receipts/postflip-fix-tests.log"; exit $rc
