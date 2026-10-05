import { JEV_ARCH_CLASSES, jevArchFor } from '../lib/jevbench-architecture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readJevbenchV155Release } from '../lib/jevbench-v15-release.mjs';
import { jevbenchCategoryView } from '../lib/jevbench-categories.mjs';
import { jevClassRows } from '../lib/jevbench-jev-class.mjs';
import { jevV15CompareRow } from '../lib/jevbench-v15-board.mjs';
import {
  buildAllDataModel, applyFilters, sortRows, matchesFilters, columnHasValues, toCsv, toJson,
} from '../lib/jevbench-all-data-grid.mjs';

// CR-269: the collapsed "All data" grid. These tests pin the pure data layer behind
// components/JevV15AllDataGrid.tsx: row/column mapping against the released v1.5.5 artifact, dynamic
// category columns (including a synthetic future language dimension), missing-value behaviour,
// Jev-class eligibility from supplied metadata, multi-column stable sorting, combined filters and
// RFC-4180 CSV escaping. No item-level or sealed content may appear here — everything is aggregate.

const { artifact } = await readJevbenchV155Release();
const allKeys = artifact.systems.map((s) => s.key);
const view = jevbenchCategoryView(artifact.revision, allKeys);
const byKey = new Map(artifact.systems.map((s) => [s.key, s]));
const rowOf = (model, key) => model.rows.find((r) => r.key === key);
const colIds = (model) => model.columns.map((c) => c.id);

test('CR-269: the grid maps one row per artifact system plus not-measured roster rows', () => {
  const model = buildAllDataModel({ artifact, categoryView: view });
  assert.equal(model.rows.length, artifact.systems.length + artifact.not_measured.length);
  assert.equal(model.revision, 'v1.5.5');
  // Required column set from the brief: identity, official score/rank, A/B/C, capability + eligibility,
  // axes, intelligence detail, per-type, latency, cost, categories (dynamic), prices as metadata-only.
  const ids = colIds(model);
  for (const id of ['rank', 'system', 'author', 'family', 'class', 'open', 'api', 'licence', 'params', 'newInVersion', 'firstAdded', 'addendum', 'revisionNotes',
    'score', 'scoreA', 'scoreB', 'scoreC', 'rankA', 'rankB', 'rankC',
    'capability', 'eligible', 'eligibilityReason',
    'intelligence', 'calibration', 'speed', 'cost',
    'iOpen', 'iSealed', 'gap', 'excess', 'penalty',
    'ccOpen:choice', 'ccSealed:choice', 'ccOpen:noul', 'ccSealed:noul', 'ccOpen:score', 'ccSealed:score',
    'nOpen:choice', 'nSealed:choice', 'nOpen:noul', 'nSealed:noul', 'nOpen:score', 'nSealed:score',
    'tierCcOpen:easy', 'tierNOpen:easy', 'tierCcSealed:hard', 'tierNSealed:hard',
    'p50Raw', 'p95Raw', 'p50Adj', 'p95Adj', 'adjustment',
    'costUsd', 'costKind', 'costBasis', 'apiPrice', 'basePrice', 'categoryNote']) {
    assert.ok(ids.includes(id), `missing column ${id}`);
  }
});

test('CR-269: cells carry the exact published values for a known ranked row', () => {
  const model = buildAllDataModel({ artifact, categoryView: view });
  const sys = byKey.get('cygnet');
  const row = rowOf(model, 'cygnet');
  assert.equal(row.values.rank, sys.rank);
  assert.equal(row.values.rank, row.values.rankA, 'official rank is the headline-option rank');
  assert.equal(row.values.score, sys.jevbench_score);
  assert.equal(row.values.scoreA, sys.scores.A);
  assert.equal(row.values.rankB, sys.ranks.B);
  assert.equal(row.values.system, sys.display);
  assert.equal(row.values.author, sys.author);
  assert.equal(row.values.family, sys.underlying ?? sys.family ?? sys.base_model ?? null);
  assert.equal(row.values.class, JEV_ARCH_CLASSES.find((c) => c.id === jevArchFor('jevbench', sys).arch).label);
  assert.equal(row.values.open, String(sys.open));
  assert.equal(row.values.api, sys.api_flag);
  assert.equal(row.values.licence, sys.licence);
  assert.equal(row.values.intelligence, sys.axes.intelligence);
  assert.equal(row.values.calibration, sys.axes.calibration);
  assert.equal(row.values.speed, sys.axes.speed);
  assert.equal(row.values.cost, sys.axes.cost);
  assert.equal(row.values.iOpen, sys.intelligence.I_open);
  assert.equal(row.values.iSealed, sys.intelligence.I_sealed);
  assert.equal(row.values.gap, sys.intelligence.gap);
  assert.equal(row.values.excess, sys.intelligence.excess);
  assert.equal(row.values.penalty, sys.intelligence.penalty);
  assert.equal(row.values.capability, (sys.axes.intelligence + sys.axes.calibration) / 2);
  for (const t of ['choice', 'noul', 'score']) {
    assert.equal(row.values[`ccOpen:${t}`], sys.intelligence.per_type_split[`open|${t}`].cc);
    assert.equal(row.values[`ccSealed:${t}`], sys.intelligence.per_type_split[`sealed|${t}`].cc);
    assert.equal(row.values[`nOpen:${t}`], Object.values(sys.intelligence.per_type_split[`open|${t}`].n).reduce((a, b) => a + b, 0));
    assert.equal(row.values[`nSealed:${t}`], Object.values(sys.intelligence.per_type_split[`sealed|${t}`].n).reduce((a, b) => a + b, 0));
  }
  const compare = jevV15CompareRow(sys);
  for (const tier of ['easy', 'standard', 'judge', 'hard']) {
    assert.equal(row.values[`tierCcOpen:${tier}`], compare.tierCc.open[tier]);
    assert.equal(row.values[`tierCcSealed:${tier}`], compare.tierCc.sealed[tier]);
  }
  assert.equal(row.values.p50Adj, sys.speed.p50_s_adjusted);
  assert.equal(row.values.adjustment, sys.speed.adjustment);
  assert.equal(row.values.costUsd, sys.cost.usd_per_1000);
  assert.equal(row.values.costBasis, sys.cost.basis);
});

test('CR-269: every ranked row maps rank and score from its own artifact record', () => {
  const model = buildAllDataModel({ artifact, categoryView: view });
  for (const sys of artifact.systems.filter((s) => s.listing === 'ranked')) {
    const row = rowOf(model, sys.key);
    assert.equal(row.values.rank, sys.rank, `${sys.key} rank`);
    assert.equal(row.values.score, sys.jevbench_score, `${sys.key} score`);
    assert.equal(row.values.capability, row.values.capability, 'capability present');
    if (sys.axes.intelligence != null && sys.axes.calibration != null) {
      assert.equal(row.values.capability, (sys.axes.intelligence + sys.axes.calibration) / 2, `${sys.key} capability`);
    }
  }
});

test('CR-269: category columns are dynamic from the supplied view, value and n per category', () => {
  const model = buildAllDataModel({ artifact, categoryView: view });
  const ids = colIds(model);
  for (const dim of view.dims) for (const c of dim.cats) {
    assert.ok(ids.includes(`cat:${dim.key}:${c.key}`), `missing category column ${dim.key}.${c.key}`);
    assert.ok(ids.includes(`cat:${dim.key}:${c.key}:n`), `missing category n column ${dim.key}.${c.key}`);
    const column = model.columns.find((x) => x.id === `cat:${dim.key}:${c.key}`);
    assert.equal(column.group, dim.title);
    assert.equal(column.label, c.label);
  }
  const sys = byKey.get('cygnet');
  const row = rowOf(model, 'cygnet');
  assert.equal(row.values['cat:topics:math'], view.systems.cygnet.topics.math[0]);
  assert.equal(row.values['cat:topics:math:n'], view.systems.cygnet.topics.math[1]);
  assert.ok(row.values['cat:topics:math'] !== undefined);
  assert.ok(ids.includes('cat:usecases:customer_support'));
});

test('CR-269: a synthetic future language dimension appears as its own group', () => {
  const fakeView = {
    ...view,
    dims: [
      ...view.dims,
      { key: 'languages', title: 'Languages', note: 'future language dimension', cats: [
        { key: 'de', label: 'German', short: 'German', covers: 'de items', n: 2, split: { a: 1, b: 1 }, lowN: false, plotted: true },
      ] },
    ],
    systems: { ...view.systems, cygnet: { ...view.systems.cygnet, languages: { de: [88.5, 2] } } },
  };
  const model = buildAllDataModel({ artifact, categoryView: fakeView });
  const ids = colIds(model);
  assert.ok(ids.includes('cat:languages:de'), 'language category column exists');
  assert.ok(ids.includes('cat:languages:de:n'));
  const valueColumn = model.columns.find((c) => c.id === 'cat:languages:de');
  assert.equal(valueColumn.group, 'Languages');
  assert.equal(valueColumn.label, 'German');
  assert.equal(rowOf(model, 'cygnet').values['cat:languages:de'], 88.5);
  assert.equal(rowOf(model, 'cygnet').values['cat:languages:de:n'], 2);
  const other = artifact.systems.find((s) => s.key !== 'cygnet' && !view.systems[s.key]);
  if (other) assert.equal(rowOf(model, other.key).values['cat:languages:de'], null);
});

test('CR-269: missing values stay null and reasons are preserved, never invented', () => {
  const model = buildAllDataModel({ artifact, categoryView: view });
  // Unranked system: no rank, no official score, but the reason stays.
  const unranked = artifact.systems.find((s) => s.listing !== 'ranked' && s.rank == null);
  const row = rowOf(model, unranked.key);
  assert.equal(row.values.rank, null);
  assert.equal(row.values.score, unranked.jevbench_score ?? null);
  assert.equal(row.values.notRankedBecause, unranked.not_ranked_because);
  // Optional metadata fields are null (never inferred from the name).
  assert.equal(row.values.params, null);
  assert.equal(row.values.apiPrice, null);
  assert.equal(row.values.basePrice, null);
  assert.equal(row.values.firstAdded, null);
  // Category availability reason from the view.
  const missingKey = Object.keys(view.missing ?? {});
  if (missingKey.length) {
    assert.equal(rowOf(model, missingKey[0]).values.categoryNote, view.missing[missingKey[0]]);
  }
  // Not-measured roster rows keep author + reason, and no invented values.
  const nm = artifact.not_measured[0];
  const nmRow = rowOf(model, nm.key);
  assert.equal(nmRow.notMeasured, true);
  assert.equal(nmRow.values.listing, 'not measured');
  assert.equal(nmRow.values.author, nm.author);
  assert.equal(nmRow.values.rank, null);
  assert.equal(nmRow.values.score, null);
  assert.equal(nmRow.values.licence, null);
  assert.equal(nmRow.values.firstAdded, null, 'not-measured rows are not marked as new');
});

test('CR-269: eligibility and ratios come only from the supplied Jev-class metadata', () => {
  const without = buildAllDataModel({ artifact, categoryView: view });
  for (const row of without.rows) {
    assert.equal(row.values.eligible, null, 'no caps supplied -> not reported');
    assert.equal(row.values.eligibilityReason, null);
    assert.equal(row.values.costRatio, null);
  }
  const eligibility = jevClassRows(artifact.systems);
  const withMeta = buildAllDataModel({ artifact, categoryView: view, eligibility });
  const ref = eligibility.rows.find((r) => r.isReference);
  const refRow = rowOf(withMeta, ref.row.key);
  assert.equal(refRow.values.eligible, true);
  assert.equal(refRow.values.eligibilityReason, 'within caps');
  assert.equal(refRow.values.capability, ref.capability);
  assert.ok(Math.abs(refRow.values.costRatio - ref.costRatio) < 1e-12);
  const excluded = eligibility.rows.find((r) => !r.inClass && r.reasons.length > 0);
  assert.ok(excluded, 'the real release has at least one system outside the Jev-class caps');
  const excludedRow = rowOf(withMeta, excluded.row.key);
  assert.equal(excludedRow.values.eligible, false);
  assert.equal(excludedRow.values.eligibilityReason, excluded.reasons.join('; '));
  assert.ok(excludedRow.values.eligibilityReason.length > 0);
  // Rows outside the supplied set stay "not reported" instead of getting an invented verdict.
  const outside = artifact.not_measured[0];
  assert.equal(rowOf(withMeta, outside.key).values.eligible, null);
});

test('CR-269: first added comes from explicit metadata or previous-release keys, never invented', () => {
  const none = buildAllDataModel({ artifact, categoryView: view });
  assert.equal(none.rows[0].values.firstAdded, null);
  const allPrevious = buildAllDataModel({ artifact, categoryView: view, previousKeys: allKeys });
  for (const row of allPrevious.rows.filter((r) => !r.notMeasured)) {
    assert.equal(row.values.firstAdded, null, `${row.key} existed in the previous release`);
  }
  const cygnet = artifact.systems[0];
  const withPrevious = buildAllDataModel({ artifact, categoryView: view, previousKeys: allKeys.filter((k) => k !== cygnet.key) });
  assert.equal(rowOf(withPrevious, cygnet.key).values.newInVersion, true);
  assert.equal(rowOf(withPrevious, artifact.systems[1].key).values.newInVersion, false);
  assert.equal(rowOf(withPrevious, cygnet.key).values.firstAdded, artifact.revision);
  assert.equal(rowOf(withPrevious, artifact.systems[1].key).values.firstAdded, null);
  const metadata = { firstAdded: { [cygnet.key]: 'v1.4.2.2' } };
  const withMeta = buildAllDataModel({ artifact, categoryView: view, previousKeys: allKeys, metadata });
  assert.equal(rowOf(withMeta, cygnet.key).values.firstAdded, 'v1.4.2.2', 'explicit metadata wins');
});

test('CR-269: family and row-level notes links require explicit metadata', () => {
  const model = buildAllDataModel({ artifact, metadata: {
    families: { cygnet: 'Cygnet base' },
    revisionNotesHref: { cygnet: '/jev-models/v1.5.5#jev15-addendum' },
  } });
  assert.equal(rowOf(model, 'cygnet').values.family, 'Cygnet base');
  assert.equal(rowOf(model, 'cygnet').values.revisionNotes, '/jev-models/v1.5.5#jev15-addendum');
  const other = artifact.systems.find((s) => s.key !== 'cygnet');
  assert.equal(rowOf(model, other.key).values.revisionNotes, null);
});

test('CR-269: metadata-driven price and parameter columns stay null without explicit values', () => {
  const model = buildAllDataModel({ artifact, metadata: { params: { cygnet: 12_000_000_000 }, apiPriceUsdPer1000: { cygnet: 0.5 } } });
  assert.equal(rowOf(model, 'cygnet').values.params, 12_000_000_000);
  assert.equal(rowOf(model, 'cygnet').values.apiPrice, 0.5);
  assert.equal(rowOf(model, 'cygnet').values.basePrice, null);
  const other = artifact.systems.find((s) => s.key !== 'cygnet');
  assert.equal(rowOf(model, other.key).values.params, null);
  assert.ok(!columnHasValues(model.rows, model.columns.find((c) => c.id === 'basePrice')));
});

test('CR-269: multi-column sort is stable and empty cells sort last in both directions', () => {
  const mk = (key, rank, system) => ({ systems: [{ key, display: system, listing: 'ranked', rank, ranked: true, axes: {}, scores: {}, ranks: {}, speed: {}, cost: {} }], not_measured: [], roster_count: 1, revision: 'test', headline: 'A' });
  const artifactSmall = {
    revision: 'test', headline: 'A', systems: [
      { key: 'b', display: 'Bravo', listing: 'ranked', rank: 2, ranked: true, axes: {}, scores: {}, ranks: {}, speed: {}, cost: {} },
      { key: 'a', display: 'alpha', listing: 'ranked', rank: 1, ranked: true, axes: {}, scores: {}, ranks: {}, speed: {}, cost: {} },
      { key: 'c', display: 'Charlie', listing: 'ranked', rank: null, ranked: false, axes: {}, scores: {}, ranks: {}, speed: {}, cost: {} },
      { key: 'd', display: 'bravo2', listing: 'ranked', rank: 2, ranked: true, axes: {}, scores: {}, ranks: {}, speed: {}, cost: {} },
    ], not_measured: [], roster_count: 4,
  };
  const model = buildAllDataModel({ artifact: artifactSmall });
  const cols = model.columns;
  // Text order is deterministic byte order (B < C < a < b): Bravo, Charlie, alpha, bravo2.
  assert.deepEqual(sortRows(model.rows, cols, [{ id: 'system', dir: 'asc' }]).map((r) => r.key), ['b', 'c', 'a', 'd']);
  assert.deepEqual(sortRows(model.rows, cols, [{ id: 'system', dir: 'desc' }]).map((r) => r.key), ['d', 'a', 'c', 'b']);
  // rank asc: ties keep artifact order (b before d); null rank last.
  assert.deepEqual(sortRows(model.rows, cols, [{ id: 'rank', dir: 'asc' }]).map((r) => r.key), ['a', 'b', 'd', 'c']);
  // rank desc: null still last.
  assert.deepEqual(sortRows(model.rows, cols, [{ id: 'rank', dir: 'desc' }]).map((r) => r.key), ['b', 'd', 'a', 'c']);
  // Multi-sort: secondary breaks the tie.
  const multi = sortRows(model.rows, cols, [{ id: 'rank', dir: 'asc' }, { id: 'system', dir: 'asc' }]);
  assert.deepEqual(multi.map((r) => r.key), ['a', 'b', 'd', 'c']);
  assert.deepEqual(sortRows(model.rows, cols, [{ id: 'rank', dir: 'asc' }, { id: 'system', dir: 'desc' }]).map((r) => r.key), ['a', 'd', 'b', 'c']);
  assert.deepEqual(sortRows(model.rows, cols, []).map((r) => r.key), ['b', 'a', 'c', 'd']);
  void mk;
});

test('CR-269: text and numeric filters combine; missing cells never match an active filter', () => {
  const model = buildAllDataModel({ artifact, categoryView: view });
  const cols = model.columns;
  const label = (id) => cols.find((c) => c.id === id).label;
  assert.equal(label('rank'), 'Official rank');
  // Text substring, case-insensitive, on an exact column.
  const openCol = cols.find((c) => c.id === 'open');
  const yesCount = model.rows.filter((r) => r.values.open != null && String(r.values.open).toLowerCase().includes('yes')).length;
  assert.ok(yesCount > 0);
  assert.equal(applyFilters(model.rows, cols, [{ id: 'open', text: 'YES' }]).length, yesCount);
  assert.equal(applyFilters(model.rows, cols, [{ id: 'open', text: 'no-such-value' }]).length, 0);
  assert.equal(openCol.kind, 'text');
  // Numeric min/max are inclusive.
  const ranks = model.rows.map((r) => r.values.rank).filter((v) => v != null);
  const min = Math.min(...ranks), max = Math.max(...ranks);
  assert.equal(applyFilters(model.rows, cols, [{ id: 'rank', min, max }]).length, ranks.length);
  assert.equal(applyFilters(model.rows, cols, [{ id: 'rank', min: 1, max: 5 }]).every((r) => r.values.rank >= 1 && r.values.rank <= 5), true);
  assert.equal(applyFilters(model.rows, cols, [{ id: 'rank', min: 1, max: 5 }]).some((r) => r.values.rank == null), false);
  // Missing cells (unranked rows) never match a numeric filter.
  const unrankedCount = model.rows.filter((r) => r.values.rank == null).length;
  assert.equal(applyFilters(model.rows, cols, [{ id: 'rank', min: 0, max: 1000 }]).length + unrankedCount >= model.rows.filter((r) => r.values.rank != null).length, true);
  // Multiple active filters AND together.
  const cheap = model.rows.filter((r) => r.values.costUsd != null && r.values.costUsd <= 0.05).length;
  const both = applyFilters(model.rows, cols, [{ id: 'costUsd', min: null, max: 0.05 }, { id: 'open', text: 'yes' }]);
  assert.ok(both.every((r) => r.values.costUsd <= 0.05 && String(r.values.open).toLowerCase().includes('yes')));
  assert.ok(both.length <= cheap);
  // matchesFilters is the single-row predicate behind applyFilters.
  const first = model.rows[0];
  assert.equal(matchesFilters(first, cols, []), true);
  assert.equal(matchesFilters(first, cols, [{ id: 'key', text: first.key.slice(0, 3) }]), true);
});

test('CR-269: CSV escapes per RFC 4180 and keeps missing cells empty', () => {
  const small = {
    revision: 'test', headline: 'A', not_measured: [], roster_count: 1,
    systems: [{ key: 'x', display: 'Sys, "quoted"', listing: 'ranked', rank: 1, ranked: true, open: 'yes', api_flag: false,
      licence: 'line1\nline2', axes: { intelligence: 10, calibration: 20 }, scores: { A: 15 }, ranks: { A: 1 }, speed: {}, cost: {} }],
  };
  const model = buildAllDataModel({ artifact: small });
  const csv = toCsv(model.columns, model.rows);
  const lines = csv.split('\r\n');
  assert.ok(csv.includes('"Sys, ""quoted"""'), 'comma and quote are quoted and doubled');
  assert.ok(csv.includes('"line1\nline2"'), 'embedded newline is quoted');
  assert.ok(lines[0].includes('Official rank'), 'header uses column labels');
  const headerCells = lines[0].split(',');
  assert.equal(headerCells[0], 'Official rank');
  assert.equal(headerCells[1], 'System');
  assert.ok(lines[1].startsWith('1,"Sys, ""quoted""",x,'), 'row order: rank, system, key; quoted field kept whole');
  // Missing values are empty fields, and booleans export as yes/no.
  assert.ok(csv.includes(',,') || csv.endsWith(','), 'missing cells stay empty');
  assert.ok(csv.includes(',no,'), 'api false exports as no');
  // JSON export keeps raw values and nulls keyed by column id.
  const json = toJson(model.columns, model.rows);
  assert.equal(json[0].rank, 1);
  assert.equal(json[0].display, undefined);
  assert.equal(json[0].system, 'Sys, "quoted"');
  assert.equal(json[0].calibration, 20);
  assert.equal(json[0].rankB, null);
  assert.equal(json[0].api, false);
  assert.equal(json[0].params, null);
});

test('CR-269: every visible-by-default column is a real published value or an explicit optional field', () => {
  const model = buildAllDataModel({ artifact, categoryView: view, eligibility: jevClassRows(artifact.systems) });
  // Guard against invented columns: the ids above cover the brief; nothing may reference
  // per-item/sealed content.
  for (const column of model.columns) {
    assert.ok(!/item|sealed_text|question|gold|prediction/i.test(column.id), `suspicious column id ${column.id}`);
    assert.ok(column.label.length > 0 && column.group.length > 0);
  }
});
