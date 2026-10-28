#!/bin/bash
set -euo pipefail
J=$(cd "$(dirname "$0")" && pwd)
python3 -B "$J/finalize_topfive_v1718.py"
python3 -B "$J/build_publication_v1718.py"
python3 -B "$J/make_lib_v1718.py"
python3 -B "$J/wire_v1718.py"
python3 -B "$J/add_breakdown_exceptions_v1718.py"
python3 -B "$J/check_carried_equality_v1718.py"
