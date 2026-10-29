#!/bin/bash
# Aggregate-only deterministic rebuild from the captured, already-scored inputs.
set -euo pipefail
export V1721_RELEASE_DATE=${V1721_RELEASE_DATE:-2026-10-29}
J=$(cd "$(dirname "$0")" && pwd)
python3 -B "$J/build_publication_v1721.py"
python3 -B "$J/make_lib_v1721.py"
python3 -B "$J/wire_v1721.py"
python3 -B "$J/add_topics_exception_v1721.py" >/dev/null
