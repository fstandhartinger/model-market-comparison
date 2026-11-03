import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildPacket, GAUNTLET_LIMITS, normalizeCriteria } from '../ops/daily/gauntlet.mjs';
import { boundScoreSources, SCORE_REVIEW_CRITERIA, SCORE_PACKET_HEADROOM_BYTES } from '../ops/daily/refresh-benchmarks.mjs';

const registry = { id: 'vulcanbench-frontier::4', version: '4', scoring: { notes: 'n'.repeat(12_800) } };
const protocol = 'p'.repeat(1_200);
const rowSource = { url: 'https://example.test/board.csv', sha256: 'a'.repeat(64), retrieved_at: '2026-11-03T03:07:34Z' };
const capture = (index, bytes) => ({ url: `https://example.test/${index}.json`, sha256: String(index).padStart(64, '0'),
  retrieved_at: '2026-11-03T03:07:34Z', locator: 'Complete native JSON', content: 'c'.repeat(bytes) });
const protocolSources = Array.from({ length: 16 }, (_, index) => capture(index, 15_000 + index));
const rows = Array.from({ length: 15 }, (_, index) => ({ id: `public:${index}`, benchmark_id: registry.id, value: 90 + index,
  source: { url: rowSource.url, locator: `source row ${index}` }, filler: 'r'.repeat(1_900) }));
const native = (index) => ({ name: `Model ${index}`, combined_full_denominator: String(90 + index) });
const publicEvidence = new Map(rows.map((row, index) => [row.id, { source: rowSource, native: native(index), protocol, registry, protocolSources }]));
const full = [...rows.map((row, index) => ({ ...rowSource, locator: row.source.locator,
  content: JSON.stringify({ native_source_row: native(index), protocol, registry }) })), ...protocolSources];
const packetBytes = (sources) => Buffer.byteLength(buildPacket({ artifactId: 'scores-5', artifactSha256: '0'.repeat(64), round: 1, producers: [],
  criteria: normalizeCriteria(SCORE_REVIEW_CRITERIA), rows, sources, limits: GAUNTLET_LIMITS }));
const bound = (sources, evidence = publicEvidence) => boundScoreSources({ artifactId: 'scores-5', rows, criteria: SCORE_REVIEW_CRITERIA, sources, publicEvidence: evidence });

test('the uncompacted VulcanBench score batch reproduces the packet overflow', () => {
  assert.throws(() => packetBytes(full), /Frozen packet exceeds/);
});

test('an oversized score batch fits the unchanged bound with headroom and loses no row evidence', () => {
  const sources = bound(full);
  assert.ok(packetBytes(sources) <= GAUNTLET_LIMITS.packetBytesCap - SCORE_PACKET_HEADROOM_BYTES);
  const text = JSON.stringify(sources);
  rows.forEach((row, index) => assert.ok(sources.some((s) => s.locator === row.source.locator
    && JSON.parse(s.content).native_source_row.combined_full_denominator === native(index).combined_full_denominator)));
  assert.equal(sources.filter((s) => s.content.includes(registry.scoring.notes)).length, 1);
  assert.ok(text.includes(protocol));
});

test('every protocol capture stays named by digest; only the largest become receipts, naming the accepting gauntlet', () => {
  const sources = bound(full);
  for (const capture of protocolSources) assert.equal(sources.filter((s) => s.sha256 === capture.sha256).length, 1);
  const receipts = sources.filter((s) => s.content.startsWith('Extract omitted'));
  assert.ok(receipts.length > 0 && receipts.length < protocolSources.length);
  for (const receipt of receipts) assert.match(receipt.content, /protocol gauntlet protocol-vulcanbench-frontier::4 of this same run accepted this 150\d\d-byte extract \(sha256 [0-9a-f]{64}\)/);
  const smallestOmitted = Math.min(...receipts.map((r) => protocolSources.find((c) => c.sha256 === r.sha256).content.length));
  for (const kept of sources.filter((s) => s.content.startsWith('ccc'))) assert.ok(kept.content.length <= smallestOmitted);
});

test('a generated summary is never replaced by a capture receipt', () => {
  const generated = { ...capture(99, 200_000), locator: 'Observed scale; generated summary of this run' };
  const evidence = new Map(rows.map((row, index) => [row.id, { source: rowSource, native: native(index), protocol, registry, protocolSources: [generated] }]));
  const sources = bound([...full.slice(0, 15), generated], evidence);
  assert.ok(sources.some((s) => s.content === generated.content));
});

test('a batch inside the budget, and a batch without public evidence, keep their sources untouched', () => {
  const small = [rowSource, capture(1, 100)].map((s) => ({ ...s, content: s.content ?? '{}' }));
  assert.equal(bound(small), small);
  assert.equal(bound(full, new Map()), full);
});

test('anything that cannot be split safely keeps its full sources and fails closed in the packet builder', () => {
  const mixed = new Map(publicEvidence); mixed.delete(rows[3].id);
  assert.equal(bound(full, mixed), full);
  const twoProtocols = new Map(rows.map((row, index) => [row.id, { ...publicEvidence.get(row.id), protocol: `${protocol}${index % 2}` }]));
  assert.equal(bound(full, twoProtocols), full);
  const extra = [...full, capture(77, 10)];
  assert.equal(bound(extra), extra);
  assert.throws(() => packetBytes(bound(extra)), /Frozen packet exceeds/);
});

test('a batch that cannot fit even with every capture as a receipt still fails closed', () => {
  const huge = rows.map((row) => ({ ...row, filler: 'r'.repeat(30_000) }));
  const sources = boundScoreSources({ artifactId: 'scores-5', rows: huge, criteria: SCORE_REVIEW_CRITERIA, sources: full, publicEvidence });
  assert.throws(() => buildPacket({ artifactId: 'scores-5', artifactSha256: '0'.repeat(64), round: 1, producers: [],
    criteria: normalizeCriteria(SCORE_REVIEW_CRITERIA), rows: huge, sources, limits: GAUNTLET_LIMITS }), /Frozen packet exceeds/);
});

test('the row protocol text names every revision the guard admits', () => {
  const read = (file) => JSON.parse(readFileSync(new URL(`../data/raw/benchmarks/${file}`, import.meta.url), 'utf8'));
  const guard = read('registry.json').entries.find((e) => e.id === registry.id).how_to_collect.version_guard;
  const revisions = [...guard.split('Any other')[0].matchAll(/code-quality-maintenance-(v\d+\.\d+)/g)].map((m) => m[1]);
  const planned = read('collection-plan.json').entries.find((e) => e.benchmark_id === registry.id).protocol;
  assert.ok(revisions.length >= 11);
  for (const revision of revisions) assert.match(planned, new RegExp(`${revision.replace('.', '\\.')}\\b`));
});
