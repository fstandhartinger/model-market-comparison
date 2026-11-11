#!/bin/bash
set -euo pipefail
J=$(cd "$(dirname "$0")" && pwd)
python3 -B "$J/build_v189.py"
python3 -B "$J/wire_v189.py"
python3 -B "$J/add_topics_exception_v189.py"
