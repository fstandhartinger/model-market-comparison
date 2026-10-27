#!/bin/bash
# Production build in the simulated post-flip state (synthetic PASS manifest/proof/loader from .pass; no authority), then restore.
set -uo pipefail
J=$(cd "$(dirname "$0")" && pwd); W=$(cd "$J/../.." && pwd); V=data/raw/benchmarks/jevbench/v1.7
cd "$W"; B=$(mktemp -d)
FILES="$V/jevbench-v1.7.13-publication.json $V/jevbench-v1.7.13-proof.json lib/jevbench-v1713-release.mjs"
before=$(sha256sum $FILES)
restore(){ for f in $FILES; do cp "$B/$(basename $f)" "$f"; done; after=$(sha256sum $FILES); [ "$before" == "$after" ] && echo "restored byte-equal" >> "$J/receipts/build-postflip.log" || echo "RESTORE MISMATCH" >> "$J/receipts/build-postflip.log"; rm -rf "$B"; }
trap restore EXIT
for f in $FILES; do cp "$f" "$B/$(basename $f)"; cp "$J/.pass/$f" "$f"; done
timeout 2400 ~/bin/heavy npm run build > "$J/receipts/build-postflip.log" 2>&1; rc=$?
echo "{\"exit_code\":$rc,\"command\":\"npm run build (simulated post-flip state)\"}" > "$J/receipts/BUILD-POSTFLIP-EXIT.json"
