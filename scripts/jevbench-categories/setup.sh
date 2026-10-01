#!/bin/bash
# Pod-side: build winnow-inference @ 6c2b3c04 (as images/winnow-12b/Dockerfile) and fetch Winnow-12B Q8 @ b6ac22b0 (sha-checked).
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq && apt-get install -y -qq --no-install-recommends build-essential cmake git python3 libssl-dev curl ca-certificates >/dev/null
mkdir -p /workspace/lab && cd /workspace/lab
[ -d winnow-inference ] || git clone -q https://github.com/EldanRing/winnow-inference.git
git -C winnow-inference checkout -q 6c2b3c04e248a319f2cb43832628eba03e55fe38
(cd winnow-inference && python3 scripts/build.py --cuda-arch 89 --jobs 16 > /workspace/lab/build.log 2>&1)
test -x winnow-inference/.build/bin/winnow-server
[ -f Winnow-12B-Q8_0.gguf ] || curl -fsSL --retry 5 -o Winnow-12B-Q8_0.gguf 'https://huggingface.co/EldanRing/Winnow-12B/resolve/b6ac22b0d51b69b18200acacb3fbdd98073fffe8/gguf/Winnow-12B-Q8_0.gguf'
echo 'b710efc4c0d048ee61eed92c5fef5ce323a4d17e7c51f9f0533cc72ae50818ea  Winnow-12B-Q8_0.gguf' | sha256sum --check --strict
python3 -c 'import secrets;print(secrets.token_hex(32))' > /workspace/lab/key; chmod 600 /workspace/lab/key
(cd winnow-inference && nohup python3 scripts/serve.py --model /workspace/lab/Winnow-12B-Q8_0.gguf --context 8192 --decision-parallel 4 --chat-parallel 1 --cache q8_0 --memory exclusive --host 127.0.0.1 --port 20011 --api-key-file /workspace/lab/key > /workspace/lab/serve.log 2>&1 &)
for i in $(seq 1 180); do curl -fs http://127.0.0.1:20011/health >/dev/null && { echo READY; exit 0; }; sleep 5; done
echo NOT_READY; tail -20 /workspace/lab/serve.log; exit 1
