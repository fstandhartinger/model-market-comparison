import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseManifest, tableRows, familyIndex, diffFamilies, classifyFamily, summarize, TABLES } from '../lib/lumina-ledger.mjs';

// CR-37.2 (iteration 82): Lumina Bench as a discovery and provenance feed.
const sha = (t) => createHash('sha256').update(t).digest('hex');
const columns = {
  'benchmark-definitions': ['benchmarkSlug', 'benchmarkName', 'organisation', 'category', 'version', 'lifecycle', 'primarySourceKey', 'primarySourceUrl'],
  'benchmark-results': ['resultId', 'modelSlug', 'benchmarkSlug', 'score', 'evidenceState', 'observedAt', 'sourceKey', 'sourceUrl'],
  sources: ['sourceKey', 'url', 'licence', 'redistributionStatus'],
};
const tables = {
  'benchmark-definitions': [['alpha', 'Alpha', 'Lab A', 'coding', '1', 'active', 's1', 'https://alpha.example/board'], ['beta', 'Beta', 'Lab B', 'agents', null, 'active', null, null], ['gamma', 'Gamma', 'Lab C', 'math', '2', 'archived', null, null]],
  'benchmark-results': [
    ['r1', 'm1', 'alpha', 50, 'direct', '2026-08-01', 's1', 'https://alpha.example/board'],
    ['r2', 'm2', 'alpha', 40, 'supported', '2026-08-03', 's2', 'https://benchlm.ai/benchmarks/alpha'],
    ['r3', 'm2', 'alpha', 41, 'estimated', '2026-08-04', 's2', 'https://benchlm.ai/benchmarks/alpha'],
    ['r4', 'm1', 'beta', 10, 'direct', '2026-07-01', 's3', 'https://vendor.example/blog'],
  ],
  sources: [['s1', 'https://alpha.example/board', 'CC BY 4.0', 'allowed'], ['s2', 'https://benchlm.ai', null, 'unknown'], ['s3', 'https://vendor.example/blog', null, null]],
};
const policy = { host_roles: { evaluator: ['alpha.example'], vendor: ['vendor.example'], aggregator: ['benchlm.ai'] }, family_decisions: {} };

function fixture({ mutate = (t) => t } = {}) {
  const texts = {};
  const files = [];
  const manifestTables = [];
  for (const [id, file] of Object.entries(TABLES)) {
    texts[id] = mutate(JSON.stringify({ columns: columns[id], rows: tables[id] }), id);
    files.push({ fileName: file, sha256: sha(JSON.stringify({ columns: columns[id], rows: tables[id] })) });
    manifestTables.push({ id, recordCount: tables[id].length, columns: columns[id] });
  }
  const manifest = { ledgerSchemaVersion: '1.0.0', projection: 'public', generatedAt: '2026-09-01', sourceDataHash: 'a'.repeat(64), tables: manifestTables, files };
  return { manifestText: JSON.stringify(manifest), texts };
}

test('CR-37.2: the manifest is refused when its shape changes', () => {
  const { manifestText } = fixture();
  assert.ok(parseManifest(manifestText));
  const m = JSON.parse(manifestText);
  assert.throws(() => parseManifest(JSON.stringify({ ...m, ledgerSchemaVersion: '2.0.0' })), /ledgerSchemaVersion/);
  assert.throws(() => parseManifest(JSON.stringify({ ...m, sourceDataHash: 'x' })), /sourceDataHash/);
  assert.throws(() => parseManifest(JSON.stringify({ ...m, tables: m.tables.filter((t) => t.id !== 'sources') })), /table sources missing/);
  const noColumn = { ...m, tables: m.tables.map((t) => t.id === 'benchmark-results' ? { ...t, columns: t.columns.filter((c) => c !== 'sourceUrl') } : t) };
  assert.throws(() => parseManifest(JSON.stringify(noColumn)), /lacks sourceUrl/);
});

test('CR-37.2: a table is read only when its bytes, columns and row count match the manifest', () => {
  const { manifestText, texts } = fixture();
  const manifest = parseManifest(manifestText);
  assert.equal(tableRows(texts['benchmark-results'], manifest, 'benchmark-results').length, 4);
  const tampered = texts['benchmark-results'].replace('50', '99');
  assert.throws(() => tableRows(tampered, manifest, 'benchmark-results'), /does not match the manifest/);
  const short = JSON.parse(manifestText);
  short.tables.find((t) => t.id === 'sources').recordCount = 7;
  assert.throws(() => tableRows(texts.sources, short, 'sources'), /manifest says 7/);
});

test('CR-37.2: results are counted by who the cited host is; estimates and unknown hosts are kept apart; no score survives', () => {
  const { manifestText, texts } = fixture();
  const manifest = parseManifest(manifestText);
  const read = (id) => tableRows(texts[id], manifest, id);
  const { families, unclassified_hosts } = familyIndex({ definitions: read('benchmark-definitions'), results: read('benchmark-results'), sources: read('sources') }, policy);
  const alpha = families.find((f) => f.slug === 'alpha');
  assert.deepEqual(alpha.by_role, { evaluator: 1, vendor: 0, aggregator: 1, estimated: 1 });
  assert.equal(alpha.models, 2);
  assert.equal(alpha.latest_observed, '2026-08-04');
  assert.equal(alpha.primary_source_licence, 'CC BY 4.0');
  assert.deepEqual(unclassified_hosts, {});
  assert.doesNotMatch(JSON.stringify(families), /"score"|"value"/);
  const strict = { ...policy, host_roles: { ...policy.host_roles, vendor: [] } };
  const out = familyIndex({ definitions: read('benchmark-definitions'), results: read('benchmark-results'), sources: read('sources') }, strict);
  assert.deepEqual(out.unclassified_hosts, { 'vendor.example': 1 });
  assert.equal(classifyFamily(out.families.find((f) => f.slug === 'beta'), strict), 'needs_host_review');
  const orphan = read('benchmark-results').concat([{ resultId: 'x', modelSlug: 'm', benchmarkSlug: 'nope', evidenceState: 'direct', sourceUrl: 'https://alpha.example/' }]);
  assert.throws(() => familyIndex({ definitions: read('benchmark-definitions'), results: orphan, sources: read('sources') }, policy), /without a definition/);
});

test('CR-37.2: classification — a reviewed decision wins, otherwise it follows from the cited hosts', () => {
  const f = (slug, by_role, results = 1) => ({ slug, results, by_role: { evaluator: 0, vendor: 0, aggregator: 0, estimated: 0, ...by_role } });
  assert.equal(classifyFamily(f('a', {}, 0), policy), 'no_results');
  assert.equal(classifyFamily(f('a', { evaluator: 1, aggregator: 3 }, 4), policy), 'evaluator_result');
  assert.equal(classifyFamily(f('a', { vendor: 2, aggregator: 1 }, 3), policy), 'vendor_reported');
  assert.equal(classifyFamily(f('a', { aggregator: 1, estimated: 2 }, 3), policy), 'aggregator_only');
  assert.equal(classifyFamily(f('a', { evaluator: 1 }, 1), { ...policy, family_decisions: { a: { decision: 'excluded', reason: 'x' } } }), 'excluded');
});

test('CR-37.2: the diff names added, removed and changed families', () => {
  const prev = [{ slug: 'a', name: 'A', results: 1 }, { slug: 'b', name: 'B', results: 2 }];
  const next = [{ slug: 'b', name: 'B', results: 5 }, { slug: 'c', name: 'C', results: 0 }];
  assert.deepEqual(diffFamilies(prev, next), { added: ['c'], removed: ['a'], changed: [{ slug: 'b', fields: ['results'] }] });
});

// The committed feed and its reviewed policy.
const snapshot = JSON.parse(readFileSync(new URL('../data/raw/lumina-ledger.json', import.meta.url), 'utf8'));
const committedPolicy = JSON.parse(readFileSync(new URL('../data/lumina-feed-policy.json', import.meta.url), 'utf8'));
const registry = JSON.parse(readFileSync(new URL('../data/raw/benchmarks/registry.json', import.meta.url), 'utf8'));

test('CR-37.2: every reviewed decision names a Lumina family and, for in_registry, boards that exist', () => {
  const slugs = new Set(snapshot.families.map((f) => f.slug));
  const ids = new Set(registry.entries.map((e) => e.id));
  const dataset = readFileSync(new URL('../data/dataset.json', import.meta.url), 'utf8');
  const allowed = new Set(['in_registry', 'on_hold', 'excluded', 'planned', 'vendor_reported']);
  for (const [slug, d] of Object.entries(committedPolicy.family_decisions)) {
    assert.ok(slugs.has(slug), `${slug} is not a Lumina family`);
    assert.ok(allowed.has(d.decision), `${slug}: decision ${d.decision}`);
    if (d.decision === 'in_registry') {
      assert.ok((d.benchmark_ids || []).length || (d.dataset_fields || []).length, `${slug}: in_registry without a board`);
      for (const id of d.benchmark_ids || []) assert.ok(ids.has(id), `${slug}: ${id} is not in the registry`);
      for (const field of d.dataset_fields || []) assert.ok(dataset.includes(`"${field}"`), `${slug}: ${field} is not a dataset field`);
    } else assert.ok(d.reason || d.note || d.collector, `${slug}: ${d.decision} without a reason`);
  }
});

test('CR-37.2: nothing in the committed feed waits unread — no unknown host, and every evaluator result was read by hand', () => {
  assert.deepEqual(snapshot.unclassified_hosts, {});
  const { counts } = summarize(snapshot.families, committedPolicy);
  assert.equal(counts.needs_host_review, undefined);
  assert.equal(counts.evaluator_result, undefined, 'an evaluator_result family needs a reviewed decision in data/lumina-feed-policy.json');
  assert.equal(snapshot.families.length, snapshot.ledger.record_counts.definitions);
});

test('CR-38.4: the Lumina feed carries no result values', () => {
  const keys = new Set();
  const walk = (v) => { if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { keys.add(k); walk(x); } };
  walk(snapshot);
  for (const k of ['score', 'value', 'normalizedScore', 'values']) assert.ok(!keys.has(k), `the feed must not keep ${k}`);
});

// 2026-09-22: Lumina paused its bulk downloads. Only the data page's own sentence makes a 404 a pause.
test('pauseNotice reads the pause sentence from the live /data/ page, nothing else', async () => {
  const { pauseNotice } = await import('../lib/lumina-ledger.mjs');
  const live = '<p class="text-muted">Public bulk downloads are paused. Model pages, charts and source attribution remain available.</p><a href="/methodology">';
  assert.equal(pauseNotice(live), 'Public bulk downloads are paused. Model pages, charts and source attribution remain available.');
  const flight = '[\\"$\\",\\"p\\",null,{\\"className\\":\\"text-muted\\",\\"children\\":\\"Public bulk downloads are paused. Model pages, charts and source attribution remain available.\\"}]';
  assert.equal(pauseNotice(flight), 'Public bulk downloads are paused. Model pages, charts and source attribution remain available.');
  assert.equal(pauseNotice('<p>Public bulk downloads are paused. Something else.</p>'), 'Public bulk downloads are paused.');
  assert.equal(pauseNotice('<p>Public bulk downloads are paused soon</p>'), null);
  assert.equal(pauseNotice('<p>Download the ledger manifest</p>'), null);
  assert.equal(pauseNotice(''), null);
});

test('the committed snapshot records the pause and still carries the last ledger', () => {
  const snapshot = JSON.parse(readFileSync(new URL('../data/raw/lumina-ledger.json', import.meta.url), 'utf8'));
  if (!snapshot.availability) return; // downloads back: the collector drops the field on the next good manifest
  assert.equal(snapshot.availability.state, 'paused_by_source');
  assert.match(snapshot.availability.notice, /^Public bulk downloads are paused\./);
  assert.equal(snapshot.availability.evidence_url, 'https://luminabench.com/data/');
  assert.ok(snapshot.families.length >= 400, 'the paused feed keeps the last ledger, it does not empty it');
});
