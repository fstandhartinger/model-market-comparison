// CR-65.14 — the board lifecycle, told once and told everywhere.
//
// Artificial Analysis retires boards and keeps publishing the values it already collected. The
// registry records that as `status: "retained"`. Until 2026-09-18 that field was validated and then
// never read: the daily protocol review's packet omitted it, so the reviewer read the omission as a
// claim that the board was still live, disputed every retired board, and the whole AA arm failed
// closed from 2026-09-11 on; and no surface on the site told a reader that a row had stopped moving.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { protocolReviewRow, PROTOCOL_REVIEW_CRITERIA } from '../ops/daily/refresh-benchmarks.mjs';
import { rowTags, isRetired, CAVEAT_TAGS, buildBenchmarkMatrix, versionLine } from '../lib/benchmark-matrix.mjs';
import { buildBenchmarkView } from '../lib/benchmark-view.mjs';
import { assertAaBenchmarkContinuity, AA_COVERAGE_DROP } from '../lib/aa-benchmark-fields.mjs';

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url)));
const registry = read('../data/raw/benchmarks/registry.json');
const taxonomy = read('../data/benchmark-taxonomy.json');
const caveats = read('../data/benchmark-caveats.json');
const dataset = read('../data/dataset.json');

test('the protocol review row states the lifecycle, for every registry entry', () => {
  for (const entry of registry.entries) {
    const row = protocolReviewRow(entry);
    assert.equal(row.id, entry.id);
    assert.equal(row.status, entry.status, `${entry.id}: status must reach the reviewer`);
    assert.equal(row.version_status, entry.version_status, `${entry.id}: version status must reach the reviewer`);
    assert.equal(row.superseded_by, entry.superseded_by ?? null, `${entry.id}: supersession must reach the reviewer`);
    // The row is the artifact the critic echoes by hash; it must not leak anything else.
    assert.deepEqual(Object.keys(row).sort(), ['description', 'id', 'maintainer', 'scoring', 'status',
      'superseded_by', 'version', 'version_guard', 'version_status']);
  }
});

test('the review asks about the lifecycle, and says a supersession alone is not a retirement', () => {
  assert.equal(PROTOCOL_REVIEW_CRITERIA.length, 2);
  const [identity, lifecycle] = PROTOCOL_REVIEW_CRITERIA;
  assert.match(identity, /cannot silently reuse the existing identity/);
  for (const field of ['status', 'version_status', 'superseded_by']) assert.ok(lifecycle.includes(field), `the criterion must name ${field}`);
  // Terminal-Bench 2.1 is superseded in the Intelligence Index and still reported in the Coding
  // Index. A criterion that equated supersession with retirement would have mislabelled it.
  assert.match(lifecycle, /supersession note alone is not a retirement/);
});

test('a retired board is tagged on the page, from the registry and nowhere else', () => {
  assert.ok(CAVEAT_TAGS.includes('retired'), 'retired is a caveat tag, shown in the Simple table too');
  assert.equal(CAVEAT_TAGS[0], 'retired', 'it reads before the other caveats');
  assert.ok(taxonomy.tags.retired?.label);
  assert.ok(taxonomy.tags.retired.tip.length > 20, 'the tag needs its one-sentence tooltip');
  assert.equal(isRetired('retained'), true);
  assert.equal(isRetired('active'), false);
  assert.equal(isRetired(null), false);
  assert.ok(rowTags('aa-aime', 'Artificial Analysis', taxonomy, caveats, null, 'retained').includes('retired'));
  assert.ok(!rowTags('aa-aime', 'Artificial Analysis', taxonomy, caveats, null, 'active').includes('retired'));
  // F-98 order: source tags, tier, then the caveats — retired first among them.
  const tags = rowTags('aa-aime', 'Artificial Analysis', taxonomy, caveats, { saturated: true }, 'retained');
  assert.deepEqual(tags.slice(-2), ['retired', 'saturated']);
});

test('every retained registry entry that has a row is marked, and nothing else is', () => {
  const matrix = buildBenchmarkMatrix(buildBenchmarkView(dataset), dataset, taxonomy, caveats);
  const status = new Map(dataset.benchmark_results.registry.map((e) => [e.id, e.status]));
  assert.ok(matrix.rows.some((r) => r.retired), 'the fixture has at least one retired row');
  for (const row of matrix.rows) {
    const ids = row.bestOf ? row.bestOf.variants.map((v) => v.benchmarkId) : [row.benchmarkId];
    const known = ids.filter((id) => id && status.has(id));
    // CR-65.14: a best-of row is retired only when every version it merges is retired — the Coding
    // Agent Index merges a retained v1.4 into a live v1.5, and that board is still reported.
    const expected = known.length > 0 && known.every((id) => status.get(id) === 'retained');
    assert.equal(row.retired === true, expected, `${row.id}: retired flag must follow the registry`);
    assert.equal(row.tags.includes('retired'), expected, `${row.id}: the tag must follow the flag`);
  }
});

// ── The other half of CR-65.14: a withdrawn result must not stop the whole AA refresh ──────────

const inventory = (numeric) => ({ count: 600, inventory: [{ field: 'gpqa', present: 600, numeric, structured: 0, null: 600 - numeric }] });

test('ordinary attrition is recorded; a retirement still fails closed', () => {
  const before = inventory(600);
  assert.deepEqual(assertAaBenchmarkContinuity(before, inventory(600)), [], 'no drop, nothing to record');
  assert.deepEqual(assertAaBenchmarkContinuity(before, inventory(610)), [], 'growth is not a drop');
  // 5 % of 600 is 30 results — AA deprecating a handful of models is not a source change.
  assert.deepEqual(assertAaBenchmarkContinuity(before, inventory(575)), [{ field: 'gpqa', measure: 'numeric', from: 600, to: 575 }]);
  assert.throws(() => assertAaBenchmarkContinuity(before, inventory(569)), /coverage shrank: gpqa numeric 600→569/);
  // A small board gets the row floor instead of the fraction, and an emptied field always fails.
  const small = inventory(10);
  assert.deepEqual(assertAaBenchmarkContinuity(small, inventory(7)), [{ field: 'gpqa', measure: 'numeric', from: 10, to: 7 }]);
  assert.throws(() => assertAaBenchmarkContinuity(small, inventory(6)), /coverage shrank/);
  assert.throws(() => assertAaBenchmarkContinuity(inventory(3), inventory(0)), /coverage shrank/);
  assert.throws(() => assertAaBenchmarkContinuity(before, { count: 600, inventory: [] }), /field disappeared: gpqa/);
  assert.equal(assertAaBenchmarkContinuity(null, inventory(1)).length, 0);
});

test('the bound is a policy number, stated once', () => {
  assert.equal(AA_COVERAGE_DROP.fraction, 0.05);
  assert.equal(AA_COVERAGE_DROP.rows, 3);
});

test('an unversioned board shows the date it was read, not the date its identity was minted', () => {
  // The identity of an AA component board stays put across refreshes, so `snapshot-2026-09-10` means
  // "first pinned on". Printing it next to a newer read date would show two dates and no way to tell
  // which one the numbers came from.
  assert.equal(versionLine({ version: 'snapshot-2026-09-10', asOf: '2026-09-18' }), 'values as published on 2026-09-18');
  assert.equal(versionLine({ version: 'snapshot-2026-09-10', asOf: '2026-09-10' }), 'values as published on 2026-09-10');
  // A board nobody has re-read has no read date; the pinning date is then the only date there is.
  assert.equal(versionLine({ version: 'snapshot-2026-09-10', asOf: null }), 'Published 2026-09-10');
  // A numbered version is unaffected.
  assert.equal(versionLine({ version: '2025', asOf: '2026-09-11', freshness: { taskWindow: { from: '2025' } } }),
    'Version 2025 · values as published on 2026-09-11 · tasks from 2025');
});
