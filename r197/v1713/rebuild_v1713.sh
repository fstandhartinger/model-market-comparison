#!/bin/bash
# Aggregate-only deterministic rebuild from the captured, already-scored inputs.
set -euo pipefail
J=$(cd "$(dirname "$0")" && pwd)
python3 -B "$J/build_publication_v1713.py"
python3 -B "$J/make_lib_v1713.py"
python3 -B "$J/wire_v1713.py"
