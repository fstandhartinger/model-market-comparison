#!/bin/bash
# Fixed pod entrypoint. Runs inside docker --network none with /input/recipe.json, /input/services.sh (host-rendered
# from the reviewed recipe), ro /models /code /harness /driver /inputs/text, rw /output, tmpfs /tmp.
set -u
export HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1 HF_TOKEN= OPENAI_API_KEY= VLLM_NO_USAGE_STATS=1 DO_NOT_TRACK=1 HOME=/tmp
bash /input/services.sh || { echo SERVICES_FAILED; exit 2; }
python3 /driver/pod_driver.py
RC=$?
echo DRIVER_RC=$RC
exit $RC
