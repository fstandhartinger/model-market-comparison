import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readJevbenchAgentFeed } from '../lib/jevbench-agent-feed.mjs';
import { createJevbenchTools, handleMcpMessage, validateJevbenchInput, JEVBENCH_MCP_TOOLS, JEVBENCH_TOOL_LIMITS, MCP_PROTOCOL_VERSIONS } from '../lib/jevbench-mcp-tools.mjs';

// CR-335 (A34): read-only JevBench tools (hosted MCP + WebMCP) over the exact /api/jevbench/latest projection.
const { feed } = await readJevbenchAgentFeed();
let reads = 0;
const tools = createJevbenchTools(async () => { reads++; return feed; });
const rpc = (method, params, id = 1) => handleMcpMessage({ jsonrpc: '2.0', id, method, params }, tools);

test('list_models: default Capability sort, missing scores last, key tie-break, paging and filters', async () => {
  const r = await tools.list_models({});
  assert.equal(r.ok, true);
  assert.equal(r.revision, feed.revision);
  assert.equal(r.artifact_sha256, feed.source.artifact_sha256);
  assert.equal(r.total, feed.systems.length);
  assert.equal(r.models.length, JEVBENCH_TOOL_LIMITS.listDefault);
  const all = [];
  for (let cursor; ;) { const p = await tools.list_models({ limit: 50, ...(cursor ? { cursor } : {}) }); all.push(...p.models); if (!(cursor = p.next_cursor)) break; }
  assert.deepEqual(all.map((m) => m.key).sort(), feed.systems.map((s) => s.key).sort());
  const scores = all.map((m) => m.capability.score);
  const firstNull = scores.findIndex((s) => s == null);
  if (firstNull >= 0) assert.ok(scores.slice(firstNull).every((s) => s == null));
  for (let i = 1; i < (firstNull < 0 ? scores.length : firstNull); i++) assert.ok(scores[i - 1] >= scores[i]);
  const eligible = await tools.list_models({ eligible_only: true, limit: 50 });
  assert.equal(eligible.total, feed.systems.filter((s) => s.capability.eligible).length);
  assert.ok(eligible.models.every((m) => m.capability.eligible));
  for (const board of ['open', 'api']) {
    const b = await tools.list_models({ board, limit: 50 });
    assert.equal(b.total, feed.systems.filter((s) => s.board === board || s.board === 'reference').length);
    assert.ok(b.models.every((m) => m.board === board || m.board === 'reference'));
  }
  const cost = await tools.list_models({ sort_by: 'cost', limit: 50 });
  const costs = cost.models.map((m) => m.axes.cost).filter((v) => v != null);
  assert.deepEqual(costs, [...costs].sort((a, b) => b - a));
});

test('list rows carry the published values unchanged', async () => {
  const { models } = await tools.list_models({ limit: 50 });
  for (const m of models) {
    const s = feed.systems.find((x) => x.key === m.key);
    assert.deepEqual(m.axes, s.axes);
    assert.equal(m.capability.rank, s.capability.rank);
    assert.equal(m.capability.eligible, s.capability.eligible);
    assert.equal(m.rank, s.rank);
    assert.equal(m.listing, s.listing);
    assert.equal(m.usd_per_1000_decisions, s.price.usd_per_1000_decisions);
  }
});

test('get_model returns the exact feed row; unknown key is a structured error', async () => {
  const s = feed.systems[3];
  const r = await tools.get_model({ key: s.key });
  assert.equal(r.ok, true);
  assert.deepEqual(r.model, s);
  assert.equal((await tools.get_model({ key: 'no-such-model' })).error.code, 'not_found');
});

test('compare_models: both rows, first-minus-second differences, nulls for missing axes, encoded compare URL', async () => {
  const [a, b] = feed.systems.filter((s) => s.capability.score != null);
  const r = await tools.compare_models({ keys: [a.key, b.key] });
  assert.equal(r.ok, true);
  assert.deepEqual(r.models, [a, b]);
  for (const ax of ['intelligence', 'calibration', 'speed', 'cost']) assert.equal(r.differences[ax], a.axes[ax] == null || b.axes[ax] == null ? null : a.axes[ax] - b.axes[ax]);
  assert.equal(r.differences.capability, a.capability.score - b.capability.score);
  if (r.compare_url) assert.ok(r.compare_url.endsWith(`?compare=${encodeURIComponent(a.key)},${encodeURIComponent(b.key)}#compare`));
  const missing = await createJevbenchTools(async () => ({ ...feed, systems: [{ ...a, axes: { ...a.axes, speed: null } }, b] })).compare_models({ keys: [a.key, b.key] });
  assert.equal(missing.differences.speed, null);
  assert.equal((await tools.compare_models({ keys: [a.key, 'nope'] })).error.code, 'not_found');
  const pick = (board) => feed.systems.find((s) => s.board === board);
  const url = async (x, y) => (await tools.compare_models({ keys: [x.key, y.key] })).compare_url;
  const [open, api, ref] = [pick('open'), pick('api'), pick('reference')];
  assert.match(await url(open, ref), /^https:\/\/benchmarkheaven\.com\/jev-models\?compare=/);
  assert.match(await url(api, ref), /^https:\/\/benchmarkheaven\.com\/jev-models\/api\?compare=/);
  assert.equal(await url(open, api), null);
});

test('strict inputs: unknown fields, wrong types, bounds, duplicates', () => {
  const bad = [
    ['list_models', { foo: 1 }], ['list_models', { sort_by: 'price' }], ['list_models', { limit: 0 }], ['list_models', { limit: 51 }],
    ['list_models', { eligible_only: 'yes' }], ['list_models', { board: 'closed' }], ['list_models', { cursor: '-1' }], ['list_models', []],
    ['get_model', {}], ['get_model', { key: '' }], ['get_model', { key: 'x'.repeat(129) }], ['get_model', { key: 5 }], ['get_model', { key: 'a', extra: true }],
    ['compare_models', { keys: ['a'] }], ['compare_models', { keys: ['a', 'a'] }], ['compare_models', { keys: ['a', 'b', 'c'] }], ['compare_models', { keys: 'a,b' }], ['compare_models', { keys: ['a', 7] }],
  ];
  for (const [name, input] of bad) assert.equal(validateJevbenchInput(name, input)?.error.code, 'invalid_input', `${name} ${JSON.stringify(input)}`);
  assert.equal(validateJevbenchInput('list_models', { board: 'api', eligible_only: true, sort_by: 'speed', limit: 50, cursor: '10' }), null);
  assert.equal(validateJevbenchInput('compare_models', { keys: ['a', 'b'] }), null);
});

test('feed failure is a structured unavailable error, never partial data', async () => {
  const down = createJevbenchTools(async () => { throw new Error('offline'); });
  for (const [name, input] of [['list_models', {}], ['get_model', { key: 'a' }], ['compare_models', { keys: ['a', 'b'] }]]) {
    assert.deepEqual(Object.keys(await down[name](input)), ['ok', 'error']);
    assert.equal((await down[name](input)).error.code, 'unavailable');
  }
});

test('JSON-RPC: initialize, ping, tools/list, tools/call, notifications and errors', async () => {
  const init = await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '0' } });
  assert.equal(init.result.protocolVersion, '2025-06-18');
  assert.deepEqual(init.result.capabilities, { tools: { listChanged: false } });
  assert.equal((await rpc('initialize', { protocolVersion: '1999-01-01' })).result.protocolVersion, MCP_PROTOCOL_VERSIONS[0]);
  assert.deepEqual((await rpc('ping', {})).result, {});
  const list = await rpc('tools/list', {});
  assert.deepEqual(list.result.tools.map((t) => t.name), ['list_models', 'get_model', 'compare_models']);
  for (const t of list.result.tools) { assert.equal(t.annotations.readOnlyHint, true); assert.equal(t.annotations.destructiveHint, false); assert.equal(t.inputSchema.additionalProperties, false); }
  const call = await rpc('tools/call', { name: 'get_model', arguments: { key: feed.systems[0].key } });
  assert.equal(call.result.isError, false);
  assert.deepEqual(JSON.parse(call.result.content[0].text), call.result.structuredContent);
  assert.equal((await rpc('tools/call', { name: 'get_model', arguments: { key: 'nope' } })).result.isError, true);
  assert.equal((await rpc('tools/call', { name: 'delete_model', arguments: {} })).error.code, -32602);
  assert.equal((await rpc('resources/list', {})).error.code, -32601);
  assert.equal(await handleMcpMessage({ jsonrpc: '2.0', method: 'notifications/initialized' }, tools), null);
  assert.equal((await handleMcpMessage({ jsonrpc: '1.0', id: 1, method: 'ping' }, tools)).error.code, -32600);
  assert.equal((await handleMcpMessage('x', tools)).error.code, -32600);
  assert.equal((await rpc('ping', [])).error.code, -32602);
  assert.equal(JEVBENCH_MCP_TOOLS.length, 3);
  assert.ok(reads > 0);
});

test('route, middleware and browser registration stay read-only and single', async () => {
  const route = await readFile(new URL('../app/api/mcp/route.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(route, /fetch\(|writeFile|process\.env/);
  assert.match(route, /MCP_MAX_BODY_BYTES/);
  const mw = await readFile(new URL('../middleware.ts', import.meta.url), 'utf8');
  assert.match(mw, /path === "\/api\/mcp" \? MCP_CORS : CORS/);
  const lib = await readFile(new URL('../lib/jevbench-mcp-tools.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(lib, /fetch\(|node:fs|process\.env/);
  const web = await readFile(new URL('../components/WebMcpTools.tsx', import.meta.url), 'utf8');
  assert.match(web, /document as Document & \{ modelContext\?/);
  assert.match(web, /get\("\/api\/jevbench\/latest"\)/);
  const layout = await readFile(new URL('../app/layout.tsx', import.meta.url), 'utf8');
  assert.equal(layout.match(/<WebMcpTools \/>/g).length, 1);
});
