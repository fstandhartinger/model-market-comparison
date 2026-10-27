#!/bin/bash
# Full test suite in the simulated post-flip state (synthetic PASS manifest/proof/loader from .pass; no authority), then restore.
set -uo pipefail
J=$(cd "$(dirname "$0")" && pwd); W=$(cd "$J/../.." && pwd); V=data/raw/benchmarks/jevbench/v1.7
cd "$W"; B=$(mktemp -d)
FILES="$V/jevbench-v1.7.13-publication.json $V/jevbench-v1.7.13-proof.json lib/jevbench-v1713-release.mjs"
before=$(sha256sum $FILES)
restore(){ for f in $FILES; do cp "$B/$(basename $f)" "$f"; done; after=$(sha256sum $FILES); [ "$before" == "$after" ] && echo "restored byte-equal" >> "$J/receipts/fulltest-postflip.log" || echo "RESTORE MISMATCH" >> "$J/receipts/fulltest-postflip.log"; rm -rf "$B"; }
trap restore EXIT
for f in $FILES; do cp "$f" "$B/$(basename $f)"; cp "$J/.pass/$f" "$f"; done
timeout 5400 ~/bin/heavy npm test > "$J/receipts/fulltest-postflip.log" 2>&1; rc=$?
echo "{\"exit_code\":$rc,\"command\":\"npm test (simulated post-flip state, .next from the post-flip build)\"}" > "$J/receipts/FULLTEST-POSTFLIP-EXIT.json"
