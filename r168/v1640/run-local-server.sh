#!/usr/bin/env bash
set -euo pipefail
J=$(cd "$(dirname "$0")" && pwd); cd "${V1640_PASS:-$J/pass}"
echo "$$" > "$J/receipts/LOCAL-SERVER.pid"
exec nice -n 15 node node_modules/next/dist/bin/next start -p 3639 --hostname 127.0.0.1 > "$J/receipts/LOCAL-SERVER.log" 2>&1
