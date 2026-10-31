#!/bin/bash
set -euo pipefail
J=r198/v184;R=$J/receipts
node "$J/validate_v184.mjs" > "$R/provenance-final-validator.log" 2>&1
python3 -B "$J/check_public_text_v184.py" > "$R/provenance-final-public-text.log" 2>&1
python3 -B "$J/check_ref_pin_v184.py" > "$R/provenance-final-ref-pin.log" 2>&1
python3 -B "$J/check_helpers_v184.py" > "$R/provenance-final-helpers.log" 2>&1
printf '%s\n' '{"status":"PASS","exit_code":0,"checks":["final bundle and prose negatives","public text","model pins/placeholders","helper dry-run and PENDING freeze refusal"],"scope":"provenance-only delta after broad suite attempt and before production build/captures; results/categories/carry/history bytes unchanged"}' > "$R/FINAL-PROVENANCE-CHECKS.json"
