#!/bin/bash
set -euo pipefail
J=$(cd "$(dirname "$0")" && pwd)
python3 -B "$J/build_v1810.py"
python3 -B "$J/wire_v1810.py"
