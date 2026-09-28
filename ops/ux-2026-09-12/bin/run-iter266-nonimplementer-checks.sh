#!/usr/bin/env bash
# Runs the three pending live verifiers (D248, D250, D252/D253) against all three hosts
# and prints one "<verifier> <host> pass/total" line per run, plus every FAIL line.
# Receipts: /opt/benchmarkheaven/state/ux-evidence/iter266-verify/<verifier>/<host>/verification.json
set -uo pipefail
cd /opt/model-market-comparison
OUTROOT=/opt/benchmarkheaven/state/ux-evidence/iter266-verify
HOSTS="https://benchmarkheaven.com https://www.benchmarkheaven.com https://model-market-comparison.app.mintapis.com"
for v in d248 d250 d252-d253; do
  case "$v" in
    d248) script=ops/ux-2026-09-12/bin/verify-d248-live.mjs ;;
    d250) script=ops/ux-2026-09-12/bin/verify-d250-live.mjs ;;
    d252-d253) script=ops/ux-2026-09-12/bin/verify-d252-d253-live.mjs ;;
  esac
  for h in $HOSTS; do
    slug=$(echo "$h" | sed 's#https://##; s#[./]#-#g')
    out="$OUTROOT/$v/$slug"
    rm -rf "$out"; mkdir -p "$out"
    echo "=== $v @ $h ==="
    node "$script" "$h" "$out" 2>&1 | tail -20
  done
done
echo "=== SUMMARY ==="
for f in $(find "$OUTROOT" -name verification.json | sort); do
  node -e 'const j=require(process.argv[1]);const p=j.pass??j.passed??(j.checks||[]).filter(c=>c.pass??c.ok).length;console.log(process.argv[1].replace("/opt/benchmarkheaven/state/ux-evidence/iter266-verify/","")+" "+p+"/"+j.total)' "$f"
done
