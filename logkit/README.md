# logkit (vendored, CR-822)
Zero-dependency structured logging; canonical copy /home/flori/tools/logkit (logging standard, AGENTS.md).
The runner starts `node -r ./logkit/logkit-preload.cjs node_modules/next/dist/bin/next start`: console output -> JSON lines
with level, crash stacks, one `http.request` line per request with request id (X-Request-Id echoed). LOG_IP=0 / LOG_UA=0.
