// CR-545 (2026-10-23): Artificial Analysis Coding Agent Index v2.0 (FrontierCode v1.1 Main, Terminal-Bench 4.0,
// SWE-Atlas-QnA-AA) is its own registry identity. v1.5 is frozen at its last capture like v1.4, and no v1.4/v1.5
// value is ever merged, bridged or ranked with a v2.0 value.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { mergeBestOf } from '../lib/benchmark-matrix.mjs';
import { CODING_AGENT_CONTRACTS, CODING_AGENT_FILE, CODING_AGENT_VERSION, FROZEN_CODING_AGENT_FILES } from '../lib/aa-coding-agents.mjs';

const json = async (p) => JSON.parse(await readFile(new URL(`../${p}`, import.meta.url), 'utf8'));
const sha256 = async (p) => createHash('sha256').update(await readFile(new URL(`../${p}`, import.meta.url))).digest('hex');

test('CR-545: the collector targets v2.0 and v1.5 is a frozen, superseded identity', async () => {
  assert.equal(CODING_AGENT_VERSION, '2.0');
  assert.equal(CODING_AGENT_FILE, 'aa-coding-agents-v2.0.json');
  assert.deepEqual(FROZEN_CODING_AGENT_FILES, ['aa-coding-agents-v1.5.json']);
  assert.deepEqual(CODING_AGENT_CONTRACTS['2.0'].components, ['frontiercode-v1.1-main', 'swe-atlas-qna', 'terminal-bench-v4']);
  const registry = await json('data/raw/benchmarks/registry.json');
  const byId = new Map(registry.entries.map((e) => [e.id, e]));
  const v15 = byId.get('aa-coding-agent-index::1.5'), v20 = byId.get('aa-coding-agent-index::2.0');
  assert.equal(v15.status, 'retained');
  assert.equal(v15.superseded_by, 'aa-coding-agent-index::2.0');
  assert.equal(v20.status, 'active');
  assert.equal(v20.family, v15.family);
  assert.equal(v20.scoring.bridge_break, true);
  const snapshot = await json('data/raw/aa-coding-agents-v2.0.json');
  assert.equal(snapshot.version, '2.0');
  assert.equal(snapshot.count, snapshot.rows.length);
  for (const row of snapshot.rows) {
    assert.deepEqual(row.components.map((c) => c.id).sort(), [...CODING_AGENT_CONTRACTS['2.0'].components].sort());
    assert.ok(Math.abs(row.components.reduce((s, c) => s + c.score / 3, 0) - row.score) < 1e-9);
  }
  const frozen = await json('data/raw/aa-coding-agents-v1.5.json');
  assert.equal(frozen.version, '1.5');
  assert.equal(frozen.collected_at, '2026-10-22');
});

test('CR-545: the ingestion lock binds the reviewed v2.0 capture', async () => {
  const lock = await json('data/raw/benchmarks/ingestion-lock.json');
  const spec = lock.coding['2.0'];
  assert.equal(spec.sha256, await sha256(spec.file));
  assert.deepEqual((await json(spec.file)).rows, (await json('data/raw/aa-coding-agents-v2.0.json')).rows);
});

test('CR-545: v2.0 never joins the v1.4/v1.5 best-of row', () => {
  const tax = { best_of: { harness_cohorts: ['Claude Code', 'Codex'], across_versions: [{ key: 'idx', versions: ['1.4', '1.5'] }] } };
  const row = (version, cohort) => ({ id: `idx::${version}@@${cohort}`, benchmarkId: `idx::${version}`, key: 'idx', name: `idx v${version}`, cohort, version, unit: 'fraction', higherBetter: true, tags: [], saturation: null, asOf: '2026-10-23' });
  const cand = (r, values) => ({ row: r, byModel: new Map(Object.entries(values)) });
  const c = [
    cand(row('1.4', 'Claude Code'), { a: [0.70, 0] }),
    cand(row('1.5', 'Claude Code'), { a: [0.62, 0] }),
    cand(row('2.0', 'Claude Code'), { a: [0.55, 0] }),
    cand(row('2.0', 'Codex'), { a: [0.58, 0] }),
  ];
  mergeBestOf(c, tax);
  assert.equal(c.length, 2);
  const old = c.find((x) => x.row.bestOf?.acrossVersions), current = c.find((x) => x.row.version === '2.0');
  assert.equal(old.row.version, '1.4 / 1.5');
  assert.deepEqual(old.byModel.get('a'), [0.70, 0]);
  // v2.0 merges only its own harness runs; the best is a v2.0 value.
  assert.equal(current.row.bestOf.acrossVersions, false);
  assert.deepEqual(current.byModel.get('a'), [0.58, 0]);
});

test('CR-545: the published dataset keeps versions apart and the Composite on v1.4', async () => {
  const taxonomy = await json('data/benchmark-taxonomy.json');
  assert.deepEqual(taxonomy.best_of.across_versions, [{ key: 'aa-coding-agent-index', versions: ['1.4', '1.5'] }]);
  const ds = await json('data/dataset.json');
  assert.equal(ds.source_status.aa_coding_agents.version, '1.4');
  assert.equal(ds.source_status.aa_coding_agents_v1_5.status, 'retained');
  assert.equal(ds.source_status.aa_coding_agents_v2_0.version, '2.0');
  const observations = ds.benchmark_results.observations.filter((o) => o.benchmark_id === 'aa-coding-agent-index::2.0');
  assert.equal(observations.length, (await json('data/raw/aa-coding-agents-v2.0.json')).count);
  for (const o of observations) assert.match(o.protocol, /^Coding Agent Index 2\.0;/);
  const bridged = ds.benchmark_results.historical.estimates.filter((e) => e.benchmark_id === 'aa-coding-agent-index::2.0' && e.status === 'estimated');
  assert.deepEqual(bridged, []);
});
