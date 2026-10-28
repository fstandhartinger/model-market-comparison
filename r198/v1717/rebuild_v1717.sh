#!/bin/bash
# Aggregate-only deterministic rebuild from the captured, already-scored inputs.
set -euo pipefail
export V1717_RELEASE_DATE=${V1717_RELEASE_DATE:-2026-10-28}
J=$(cd "$(dirname "$0")" && pwd)
python3 -B "$J/build_publication_v1717.py"
python3 -B "$J/make_lib_v1717.py"
python3 -B "$J/wire_v1717.py"
python3 -B "$J/add_topics_exception_v1717.py" >/dev/null
