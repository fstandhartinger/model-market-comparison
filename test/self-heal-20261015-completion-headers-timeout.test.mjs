// 2026-10-15 self-heal (CR-480 part 2): a completion call must not die at undici's default 300 s headers timeout.
// Measured: every Kimi K3 router critic "fetch failed" in run 2026-10-15T02-31-36 came 300-301 s after its start.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { Agent } from 'undici';
import { completionDispatcher } from '../ops/rebuild-2026-09/bin/worker-http.mjs';

function slowHeadersServer(delayMs) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => setTimeout(() => res.end('{"ok":true}'), delayMs));
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

test('the completion dispatcher, not undici\'s default, bounds how long response headers may take', async () => {
  const server = await slowHeadersServer(1500);
  const url = `http://127.0.0.1:${server.address().port}/`;
  try {
    // A short headersTimeout reproduces the failure shape seen live: a bare "fetch failed", well inside the AbortSignal.
    await assert.rejects(fetch(url, { method: 'POST', body: '{}', signal: AbortSignal.timeout(10_000), dispatcher: new Agent({ headersTimeout: 500 }) }), /fetch failed/);
    const ok = await fetch(url, { method: 'POST', body: '{}', signal: AbortSignal.timeout(10_000), dispatcher: completionDispatcher(10) });
    assert.deepEqual(await ok.json(), { ok: true });
  } finally { server.close(); }
});

test('completionDispatcher allows at least the worker timeout and rejects a missing one', () => {
  assert.throws(() => completionDispatcher(0), /positive integer/);
  assert.throws(() => completionDispatcher(undefined), /positive integer/);
  assert.ok(completionDispatcher(600));
});

test('both completion calls in worker-runner pass the dispatcher', () => {
  const source = readFileSync(new URL('../ops/rebuild-2026-09/bin/worker-runner.mjs', import.meta.url), 'utf8');
  const completionFetches = source.split('\n').filter((line) => /await fetch\(.*\/chat\/completions/.test(line)).length;
  const withDispatcher = source.match(/signal: AbortSignal\.timeout\(options\.timeout \* 1000\), dispatcher: completionDispatcher\(options\.timeout\)/g)?.length ?? 0;
  assert.equal(completionFetches, 2);
  assert.equal(withDispatcher, 2, 'router and OpenRouter completion fetches must both use completionDispatcher');
});
