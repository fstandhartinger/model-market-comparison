#!/bin/bash
# Bounded cheap-worker calls. The JS runner validates model policy and response completeness.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
for source_file in "$HOME/.config/dev-secrets.env" /root/.config/dev-secrets.env; do
  if [ -r "$source_file" ]; then . "$source_file"; break; fi
done
unset OPENAI_API_KEY OPENAI_BASE_URL
exec node "$HERE/worker-runner.mjs" "$@"
