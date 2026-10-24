#!/usr/bin/env bash
# Reconstruct the exact live baseline and emit aggregate rankings.
set -euo pipefail
J=$(cd "$(dirname "$0")" && pwd);WT=$(cd "$J/../.." && pwd)
DEST=$J/before
mkdir -p "$DEST"
git -C "$WT" archive 1da05e6fc76807aad3287524dc0edbee7317b956 | tar -x -C "$DEST"
(cd "$DEST" && node "$J/topfive_v1643.mjs") > "$J/receipts/topfive-before.json"
python3 "$J/cleanup_v1643.py" before
