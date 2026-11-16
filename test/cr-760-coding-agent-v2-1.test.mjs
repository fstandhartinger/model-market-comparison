// CR-760 (2026-11-16): Artificial Analysis Coding Agent Index v2.1 (FrontierCode-AA 2.0, Terminal-Bench 4.1,
// SWE-Atlas-QnA-AA) is its own registry identity. v2.0 is frozen at its last capture (2026-11-13) like v1.4 and v1.5,
// and no earlier value is ever merged, bridged or ranked with a v2.1 value. The Composite stays on v1.4.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { CODING_AGENT_CONTRACTS, CODING_AGENT_FILE, CODING_AGENT_SOURCE_KEY, CODING_AGENT_VERSION, CODING_AGENT_VERSION_CHANGED, FROZEN_CODING_AGENT_FILES, parseCodingAgents } from '../lib/aa-coding-agents.mjs';
import { RETIRED_COLLECTORS } from '../ops/daily/source-health.mjs';
import { DAILY_FRESH_SOURCES } from '../ops/daily/policy.mjs';

const json = async (p) => JSON.parse(await readFile(new URL(`../${p}`, import.meta.url), 'utf8'));
const sha256 = async (p) => createHash('sha256').update(await readFile(new URL(`../${p}`, import.meta.url))).digest('hex');

test('CR-760: the collector targets v2.1; v1.5 and v2.0 are frozen', () => {
  assert.equal(CODING_AGENT_VERSION, '2.1');
  assert.equal(CODING_AGENT_FILE, 'aa-coding-agents-v2.1.json');
  assert.equal(CODING_AGENT_SOURCE_KEY, 'aa_coding_agents_v2_1');
  assert.deepEqual(FROZEN_CODING_AGENT_FILES, ['aa-coding-agents-v1.5.json', 'aa-coding-agents-v2.0.json']);
  assert.deepEqual(CODING_AGENT_CONTRACTS['2.1'].components, ['frontiercode-v2.0', 'swe-atlas-qna', 'terminal-bench-v4']);
  assert.equal(CODING_AGENT_CONTRACTS['2.1'].component_labels['terminal-bench-v4'], 'Terminal-Bench 4.1');
  assert.ok(DAILY_FRESH_SOURCES.includes('aa_coding_agents_v2_1'));
  assert.ok(!DAILY_FRESH_SOURCES.includes('aa_coding_agents_v2_0'));
  // The frozen v2.0 step must not keep reporting "failing since 14 Nov" in the staleness digest.
  assert.match(RETIRED_COLLECTORS['fetch-coding-v2.0'], /v2\.1/);
});

test('CR-760: registry — v2.0 retained and superseded, v2.1 active with a bridge break', async () => {
  const registry = await json('data/raw/benchmarks/registry.json');
  const byId = new Map(registry.entries.map((e) => [e.id, e]));
  const v20 = byId.get('aa-coding-agent-index::2.0'), v21 = byId.get('aa-coding-agent-index::2.1');
  assert.equal(v20.status, 'retained');
  assert.equal(v20.version_status, 'retained');
  assert.equal(v20.superseded_by, 'aa-coding-agent-index::2.1');
  assert.equal(v21.status, 'active');
  assert.equal(v21.version, '2.1');
  assert.equal(v21.family, v20.family);
  assert.equal(v21.superseded_by, null);
  assert.equal(v21.scoring.bridge_break, true);
  for (const e of v21.evidence) assert.equal(e.sha256, await sha256(e.file));
});

test('CR-760: the v2.1 snapshot is complete and the ingestion lock binds the reviewed capture', async () => {
  const snapshot = await json('data/raw/aa-coding-agents-v2.1.json');
  assert.equal(snapshot.version, '2.1');
  assert.equal(snapshot.count, snapshot.rows.length);
  assert.ok(snapshot.count >= 13);
  for (const row of snapshot.rows) {
    assert.deepEqual(row.components.map((c) => c.id).sort(), [...CODING_AGENT_CONTRACTS['2.1'].components].sort());
    assert.ok(Math.abs(row.components.reduce((s, c) => s + c.score / 3, 0) - row.score) < 1e-9);
  }
  const lock = await json('data/raw/benchmarks/ingestion-lock.json');
  assert.equal(lock.coding['2.1'].sha256, await sha256(lock.coding['2.1'].file));
  // v2.0 stays locked to a capture of its own frozen file.
  assert.deepEqual((await json(lock.coding['2.0'].file)).rows, (await json('data/raw/aa-coding-agents-v2.0.json')).rows);
  const frozen = await json('data/raw/aa-coding-agents-v2.0.json');
  assert.equal(frozen.version, '2.0');
  assert.equal(frozen.collected_at, '2026-11-13');
});

test('CR-760: the v2.1 collector refuses a v2.0 page, and the reviewed v2.1 page parses', async () => {
  const gz = await readFile(new URL('../ops/cr-760/evidence/80780cab814ee43dea56.gz', import.meta.url));
  const { gunzipSync } = await import('node:zlib');
  const html = gunzipSync(gz).toString('utf8');
  const parsed = parseCodingAgents(html, null);
  assert.equal(parsed.version, '2.1');
  assert.deepEqual(parsed.rows, (await json('ops/cr-760/evidence/aa-coding-agents-v2.1.json')).rows);
  // A page that still states v2.0 is a version change for the v2.1 collector, never a silent adoption.
  const v20page = html.replaceAll('Coding Agent Index v2.1', 'Coding Agent Index v2.0');
  assert.throws(() => parseCodingAgents(v20page, null), (e) => e.message.startsWith(`${CODING_AGENT_VERSION_CHANGED} (page states v2.0`));
  // A v2.0 snapshot is never replaced by v2.1 rows.
  const v20snapshot = await json('data/raw/aa-coding-agents-v2.0.json');
  assert.throws(() => parseCodingAgents(html, v20snapshot), /never replace a different benchmark version/);
});

test('CR-760: the published dataset keeps v2.0 and v2.1 apart and the Composite on v1.4', async () => {
  const ds = await json('data/dataset.json');
  assert.equal(ds.source_status.aa_coding_agents.version, '1.4');
  assert.equal(ds.source_status.aa_coding_agents_v2_0.status, 'retained');
  assert.equal(ds.source_status.aa_coding_agents_v2_0.collected_at, '2026-11-13');
  assert.equal(ds.source_status.aa_coding_agents_v2_1.version, '2.1');
  assert.equal(ds.sources.aa_coding_agents_v2_0, '2026-11-13');
  const taxonomy = await json('data/benchmark-taxonomy.json');
  assert.deepEqual(taxonomy.best_of.across_versions, [{ key: 'aa-coding-agent-index', versions: ['1.4', '1.5'] }]);
  const observations = ds.benchmark_results.observations.filter((o) => o.benchmark_id === 'aa-coding-agent-index::2.1');
  assert.equal(observations.length, (await json('data/raw/aa-coding-agents-v2.1.json')).count);
  for (const o of observations) assert.match(o.protocol, /^Coding Agent Index 2\.1;/);
  const bridged = ds.benchmark_results.historical.estimates.filter((e) => e.benchmark_id === 'aa-coding-agent-index::2.1' && e.status === 'estimated');
  assert.deepEqual(bridged.filter((e) => !/^hist-state:[^:]+:aa-coding-agent-index::2\.1:/.test(e.id)), []);
});
