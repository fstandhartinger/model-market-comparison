import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as pause } from 'node:timers/promises';

// CR-335 (A34, 7 Oct 2026): protocol-level check of the hosted read-only MCP endpoint against the production build: an MCP
// client's initialize → notifications/initialized → tools/list → tools/call sequence over Streamable HTTP, CORS
// preflight, size/format rejections, and equality with /api/jevbench/latest. Runs after the production build.
test('POST /api/mcp speaks MCP over Streamable HTTP and serves the /api/jevbench/latest data', { timeout: 180000 }, async () => {
  const socket = createServer();
  await new Promise((resolve) => socket.listen(0, '127.0.0.1', resolve));
  const port = socket.address().port;
  await new Promise((resolve) => socket.close(resolve));
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(port), '--hostname', '127.0.0.1'], {
    env: { ...process.env, OPENAI_API_KEY: '' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  server.stdout.on('data', (chunk) => { log += chunk; });
  server.stderr.on('data', (chunk) => { log += chunk; });
  const base = `http://127.0.0.1:${port}`;
  const headers = { 'content-type': 'application/json', accept: 'application/json, text/event-stream' };
  const post = (body, extra = {}) => fetch(`${base}/api/mcp`, { method: 'POST', headers: { ...headers, ...extra }, body: typeof body === 'string' ? body : JSON.stringify(body) });
  const call = async (id, method, params) => { const r = await post({ jsonrpc: '2.0', id, method, params }, { 'mcp-protocol-version': '2025-06-18' }); assert.equal(r.status, 200); return r.json(); };
  try {
    for (let i = 0; i < 100; i++) {
      if (server.exitCode !== null) throw new Error(`Production server exited: ${log}`);
      try { if ((await fetch(`${base}/api/jevbench/latest`)).ok) break; } catch { /* Wait for Next's listener. */ }
      await pause(200);
    }
    const feed = await (await fetch(`${base}/api/jevbench/latest`)).json();

    const init = await post({ jsonrpc: '2.0', id: 0, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } } });
    assert.equal(init.status, 200);
    assert.match(init.headers.get('content-type'), /^application\/json/);
    assert.equal(init.headers.get('access-control-allow-origin'), '*');
    assert.equal((await init.json()).result.protocolVersion, '2025-06-18');
    assert.equal((await post({ jsonrpc: '2.0', method: 'notifications/initialized' })).status, 202);

    const list = await call(1, 'tools/list', {});
    assert.deepEqual(list.result.tools.map((t) => t.name), ['list_models', 'get_model', 'compare_models']);

    const top = (await call(2, 'tools/call', { name: 'list_models', arguments: { eligible_only: true, limit: 5 } })).result;
    assert.equal(top.isError, false);
    assert.equal(top.structuredContent.revision, feed.revision);
    assert.deepEqual(top.structuredContent.models.map((m) => m.key),
      feed.systems.filter((s) => s.capability.eligible).sort((a, b) => b.capability.score - a.capability.score || a.key.localeCompare(b.key)).slice(0, 5).map((s) => s.key));

    const [a, b] = top.structuredContent.models;
    const one = (await call(3, 'tools/call', { name: 'get_model', arguments: { key: a.key } })).result;
    assert.deepEqual(one.structuredContent.model, feed.systems.find((s) => s.key === a.key));
    const cmp = (await call(4, 'tools/call', { name: 'compare_models', arguments: { keys: [a.key, b.key] } })).result;
    assert.equal(cmp.structuredContent.differences.capability, a.capability.score - b.capability.score);
    assert.equal((await call(5, 'tools/call', { name: 'get_model', arguments: { key: 'no-such-model' } })).result.isError, true);
    assert.equal((await call(6, 'tools/call', { name: 'get_model', arguments: { key: a.key, path: '/etc/passwd' } })).result.structuredContent.error.code, 'invalid_input');

    const pre = await fetch(`${base}/api/mcp`, { method: 'OPTIONS', headers: { origin: 'https://example.org', 'access-control-request-method': 'POST', 'access-control-request-headers': 'content-type, mcp-protocol-version' } });
    assert.equal(pre.status, 204);
    assert.match(pre.headers.get('access-control-allow-methods'), /POST/);
    assert.match(pre.headers.get('access-control-allow-headers'), /Mcp-Protocol-Version/);
    assert.equal((await fetch(`${base}/api/mcp`)).status, 405);
    assert.equal((await post('{nope')).status, 400);
    assert.equal((await post([{ jsonrpc: '2.0', id: 1, method: 'ping' }])).status, 400);
    assert.equal((await post({ jsonrpc: '2.0', id: 1, method: 'ping' }, { 'mcp-protocol-version': '1999-01-01' })).status, 400);
    assert.equal((await post(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping', params: { pad: 'x'.repeat(20000) } }))).status, 413);
    // Other public APIs keep their GET-only CORS policy.
    const other = await fetch(`${base}/api/jevbench/latest`, { method: 'OPTIONS' });
    assert.doesNotMatch(other.headers.get('access-control-allow-methods') ?? '', /POST/);
  } finally {
    server.kill();
  }
});
