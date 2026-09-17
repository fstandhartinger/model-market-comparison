// CR-56: read-only WebMCP tools — schemas, bounds, structured errors and results equal to the published data.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createWebMcpTools, validateInput, WEBMCP_LIMITS, WEBMCP_TOOL_SCHEMAS } from '../lib/webmcp-tools.mjs';

const ds = JSON.parse(readFileSync(new URL('../data/dataset.json', import.meta.url), 'utf8'));
const r = ds.benchmark_results;
// The same filters as app/api/benchmarks and app/api/benchmark-scores (GET, public).
const calls = [];
async function get(path) {
  calls.push(path);
  const url = new URL(path, 'https://benchmarkheaven.test');
  if (url.pathname === '/api/benchmarks') return { benchmarks: r.registry.map((e) => ({ ...e, coverage: r.coverage.by_benchmark[e.id] })) };
  if (url.pathname === '/api/benchmark-scores') {
    const q = url.searchParams, b = q.get('benchmark_id'), m = q.get('model_id');
    if (b && !r.registry.some((e) => e.id === b)) throw Object.assign(new Error('404'), { status: 404 });
    if (m && !ds.models.some((x) => x.id === m)) throw Object.assign(new Error('404'), { status: 404 });
    const rows = r.observations.filter((o) => (!b || o.benchmark_id === b) && (!m || o.subject.model_id === m));
    const offset = Number(q.get('offset') ?? 0), limit = Number(q.get('limit') ?? 100);
    return { total: rows.length, observations: rows.slice(offset, offset + limit), coverage: { model: m ? r.coverage.by_model[m] : null }, cell: null };
  }
  throw Object.assign(new Error('404'), { status: 404 });
}
const tools = createWebMcpTools(get);

test('CR-56.1: every tool has a closed JSON schema with caps; invalid and boundary inputs give structured errors', async () => {
  for (const schema of Object.values(WEBMCP_TOOL_SCHEMAS)) { assert.equal(schema.type, 'object'); assert.equal(schema.additionalProperties, false); }
  assert.equal(validateInput('search_benchmarks', {}), null);
  assert.equal(validateInput('search_benchmarks', { limit: WEBMCP_LIMITS.searchMax }), null);
  for (const [name, input] of [['search_benchmarks', { limit: WEBMCP_LIMITS.searchMax + 1 }], ['search_benchmarks', { limit: 0 }], ['search_benchmarks', { extra: 1 }],
    ['search_benchmarks', { query: 'x'.repeat(101) }], ['get_benchmark_results', {}], ['get_benchmark_results', { benchmark_id: '../../etc' }],
    ['get_benchmark_results', { benchmark_id: 'a::b', model_ids: Array.from({ length: 11 }, (_, i) => `m${i}`) }], ['get_model_benchmark_summary', { model_id: 'a', benchmark_ids: ['x', 'x'] }], ['get_model_benchmark_summary', []]]) {
    const out = await tools[name](input);
    assert.equal(out.ok, false, `${name} ${JSON.stringify(input).slice(0, 60)}`);
    assert.equal(out.error.code, 'invalid_input');
  }
  const before = calls.length;
  await tools.get_benchmark_results({ benchmark_id: 'bad id with spaces' });
  assert.equal(calls.length, before, 'an invalid input never reaches the API');
  assert.equal((await tools.get_model_benchmark_summary({ model_id: 'no-such-model::x' })).error.code, 'not_found');
  assert.equal((await tools.get_benchmark_results({ benchmark_id: 'no-such-benchmark::1' })).error.code, 'not_found');
  assert.equal((await createWebMcpTools(async () => { throw new Error('offline'); }).search_benchmarks({})).error.code, 'unavailable');
});

test('CR-56.2: results carry the published identities, values, units, basis and provenance — and null, never an estimate', async () => {
  const search = await tools.search_benchmarks({ query: 'gpqa', limit: 5 });
  assert.ok(search.ok && search.benchmarks.length >= 1 && search.benchmarks.length <= 5);
  const b = search.benchmarks.find((x) => r.coverage.by_benchmark[x.benchmark_id]?.available > 0);
  const entry = r.registry.find((e) => e.id === b.benchmark_id);
  assert.deepEqual([b.unit, b.higher_is_better, b.version, b.last_verified], [entry.scoring.unit, entry.scoring.higher_better, entry.version, entry.last_verified]);
  // Paging through every result reproduces the published observations exactly.
  const published = r.observations.filter((o) => o.benchmark_id === b.benchmark_id);
  const seen = []; let cursor;
  do { const page = await tools.get_benchmark_results({ benchmark_id: b.benchmark_id, limit: 50, ...(cursor ? { cursor } : {}) }); assert.ok(page.ok && page.results.length <= 50); seen.push(...page.results); cursor = page.next_cursor; } while (cursor);
  assert.equal(seen.length, published.length);
  seen.forEach((row, i) => { assert.equal(row.value, published[i].value); assert.equal(row.basis, published[i].basis); assert.equal(row.source.url, published[i].source.url); assert.equal(row.source.retrieved_at, published[i].source.retrieved_at); });
  // A model summary for a requested benchmark without a result says so with null.
  const modelId = published.find((o) => o.subject.model_id)?.subject.model_id;
  const missing = r.registry.find((e) => !r.observations.some((o) => o.benchmark_id === e.id && o.subject.model_id === modelId));
  const summary = await tools.get_model_benchmark_summary({ model_id: modelId, benchmark_ids: [b.benchmark_id, missing.id] });
  assert.ok(summary.ok);
  assert.equal(summary.results[0].value, published.find((o) => o.subject.model_id === modelId).value);
  assert.deepEqual([summary.results[1].value, summary.results[1].status], [null, 'no_published_result']);
  // Output stays bounded: no raw evidence, collection recipes or hashes leave the tools.
  const text = JSON.stringify([search, summary]);
  assert.ok(!/how_to_collect|sha256|evidence/.test(text));
  assert.ok(text.length < 60_000);
});
