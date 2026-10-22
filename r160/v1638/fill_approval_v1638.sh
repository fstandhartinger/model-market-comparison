#!/usr/bin/env bash
# fill_approval_v1638.sh --card <id> --selection <label> --png-sha256 <hex64> --channel telegram-button|direct-message \
#                        --recorded-at <UTC timestamp> --recorded-in <where it is written down>
# Variant A changes public top-five lists (Drex Max enters 22 of 40), so the build carries Florian's top-five preview approval.
# Until this script runs, approval-v1638.json is absent and the build carries PLACEHOLDER values that the loader rejects.
# It writes approval-v1638.json (read by build_publication_v1638.py, so rebuild_v1638.sh and verify --repro stay deterministic) and
# reruns the whole two-pass rebuild. The card must be newer than #17911. Commit the result yourself; then the critic reviews those
# bytes, then flip_verdict_v1638.py, freeze_v1638.py --write.
set -euo pipefail
J=$(cd "$(dirname "$0")" && pwd)
declare -A V
while [ $# -gt 0 ]; do
  case "$1" in
    --card|--selection|--png-sha256|--channel|--recorded-at|--recorded-in) V[$1]="$2"; shift 2;;
    *) echo "unknown argument $1" >&2; exit 2;;
  esac
done
for k in --card --selection --png-sha256 --channel --recorded-at --recorded-in; do
  [ -n "${V[$k]:-}" ] || { echo "missing $k" >&2; exit 2; }
done
case "${V[--channel]}" in telegram-button|direct-message) ;; *) echo "--channel must be telegram-button or direct-message" >&2; exit 2;; esac
[[ "${V[--png-sha256]}" =~ ^[0-9a-f]{64}$ ]] || { echo "--png-sha256 must be 64 lowercase hex" >&2; exit 2; }
[[ "${V[--card]}" =~ ^[1-9][0-9]*$ ]] && [ "${V[--card]}" -gt 17911 ] || { echo "--card must be a numeric Telegram card id newer than 17911" >&2; exit 2; }
python3 - "$J/approval-v1638.json" "${V[--card]}" "${V[--selection]}" "${V[--png-sha256]}" "${V[--channel]}" "${V[--recorded-at]}" "${V[--recorded-in]}" <<'PY'
import json, sys
p, card, sel, sha, ch, at, inn = sys.argv[1:]
json.dump(dict(card_id=card, selection=sel, preview_png_sha256=sha, channel=ch, recorded_at=at, recorded_in=inn),
          open(p, "w"), indent=1, sort_keys=True, ensure_ascii=False)
open(p, "a").write("\n")
PY
bash "$J/rebuild_v1638.sh"
if grep -q PLACEHOLDER "$J"/../../data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.38-proof.json "$J"/../../data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.38-results.json; then
  echo "FAILED: placeholder still present" >&2; exit 1
fi
git -C "$J" status --short
echo "approval filled; review the diff, commit, then run the critic on these bytes"
