#!/bin/bash
set -euo pipefail
J=$(cd "$(dirname "$0")" && pwd)
python3 -B "$J/build_v180.py"
python3 -B "$J/make_lib_v180.py"
python3 -B "$J/wire_v180.py"
python3 -B "$J/make_method_v180.py"
