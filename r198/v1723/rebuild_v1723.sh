#!/bin/bash
set -euo pipefail
J=$(cd "$(dirname "$0")" && pwd)
python3 -B "$J/build_publication_v1723.py"
python3 -B "$J/make_lib_v1723.py"
python3 -B "$J/wire_v1723.py"
