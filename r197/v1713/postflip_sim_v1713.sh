#!/bin/bash
# Post-flip simulation: swap the synthetic PASS manifest/proof/loader from .pass into the worktree, run the release and
# roster suites, then restore and verify the original bytes. Synthetic PASS/FAIR confer no authority.
set -uo pipefail
J=$(cd "$(dirname "$0")" && pwd); W=$(cd "$J/../.." && pwd); V=data/raw/benchmarks/jevbench/v1.7
cd "$W"; B=$(mktemp -d)
FILES="$V/jevbench-v1.7.13-publication.json $V/jevbench-v1.7.13-proof.json lib/jevbench-v1713-release.mjs"
before=$(sha256sum $FILES)
for f in $FILES; do cp "$f" "$B/$(basename $f)"; cp "$J/.pass/$f" "$f"; done
timeout 900 ~/bin/heavy node --test --test-concurrency=3 test/jevbench-v1713-release.test.mjs test/jevbench-v1712-release.test.mjs test/jevbench-merged-board.test.mjs test/jevbench-feed-live-board.test.mjs test/jevbench-v1637-release.test.mjs test/jevbench-v170-release.test.mjs test/cr-205-jev-page-structure.test.mjs test/sitemap-releases-redirects.test.mjs test/jevbench-v163-fresh-source.test.mjs test/jevbench-architecture-data.test.mjs test/release-page-seo.test.mjs > "$J/receipts/postflip-tests.log" 2>&1; rc=$?
for f in $FILES; do cp "$B/$(basename $f)" "$f"; done; rm -rf "$B"
after=$(sha256sum $FILES); [ "$before" == "$after" ] || { echo "RESTORE MISMATCH"; exit 3; }
echo "postflip tests rc $rc; real manifest/proof/loader restored byte-equal"; grep -E "^# (tests|pass|fail)" "$J/receipts/postflip-tests.log"; exit $rc
