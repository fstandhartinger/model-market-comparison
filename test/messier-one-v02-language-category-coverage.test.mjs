import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { languageCoverage, jevbenchCategoryView, withLiveCategoryCells, L3_EXPOSURE_NOTES } from '../lib/jevbench-categories.mjs';
import { validateRadarSpokeGate } from '../lib/jevbench-radar-spoke-gate.mjs';
import { listedRadarBoards, listedRadarCategoryView } from '../scripts/jevbench-radar-spokes.mjs';
const bytes = (p) => readFileSync(new URL(`../${p}`, import.meta.url));
const read = (p) => JSON.parse(bytes(p));
const sha256 = (b) => createHash('sha256').update(b).digest('hex');
const key = 'messier-one-v0.2', path = 'ops/evidence/messier-one-v0.2-language-category-complete-20261010.json';
const sha = 'e03206ca5efcd1133eb94b7fe82b6a78bdcee4769354473263af0127c128676e';
const evidence = read(path), language = read('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-language-cells.json');
const category = read('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-category-cells.json');

// CR-410. Release-wide invariance is verified against the actual base in the owner receipt.
// Permanent tests bind this row's aggregate; they do not freeze unrelated future releases.
test('Messier breakdown evidence preserves headline, rank, Composite and price scope', () => {
  for (const source of [language, category]) {
    const prov = source.row_provenance[key];
    assert.equal(prov.headline_or_rank_changed, false);
    assert.equal(prov.composite_changed, false);
    assert.equal(prov.original_row_price_changed, false);
    assert.equal(prov.partial_completeness_exception, false);
  }
  for (const flag of ['headline_changed', 'rank_changed', 'Composite_changed']) assert.equal(evidence[flag], false, flag);
});

test('Messier cells copy the sanitized aggregate exactly', () => {
  assert.equal(sha256(bytes(path)), sha);
  assert.equal(evidence.system, key); assert.equal(evidence.method, 'O1S');
  assert.deepEqual(language.systems[key].languages, evidence.languages);
  for (const dim of ['families', 'topics', 'usecases']) {
    assert.deepEqual(category.systems[key][dim], evidence[dim]);
    assert.deepEqual(category.systems[key].category_spoke_n[dim], evidence.category_spoke_n[dim]);
    assert.deepEqual(category.systems[key].category_spoke_n[dim], Object.fromEntries(Object.entries(evidence[dim]).map(([k, c]) => [k, c.n])));
  }
  assert.equal(category.systems[key].category_n_items, evidence.category_n_items);
  assert.equal(evidence.category_n_items, 3005);
  assert.equal(category.systems[key].families.calibration.n, 22);
  for (const source of [language, category]) {
    assert.equal(source.row_provenance[key].sha256, sha);
    assert.equal(source.row_provenance[key].aggregate_artifact, path);
  }
  const view = jevbenchCategoryView('v1.6.1', [key], { supplement: true });
  for (const dim of ['topics', 'usecases']) for (const [name, cell] of Object.entries(evidence[dim])) assert.deepEqual(view.systems[key][dim][name], [cell.competence, cell.n, cell.coverage_n]);
  const live = withLiveCategoryCells(read('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-categories.json'));
  assert.deepEqual(live.systems[key].families, evidence.families);
  assert.deepEqual(live.systems[key].languages, evidence.languages);
});

test('All 23 languages reach 60 and all 7 topics and 20 use cases reach 30 on actual completed counts', () => {
  for (const [dim, count, min, gate] of [['languages', 23, 65, 60], ['topics', 7, 109, 30], ['usecases', 20, 83, 30]]) {
    const cells = Object.values(evidence[dim]);
    assert.equal(cells.length, count, dim);
    assert.equal(Math.min(...cells.map((c) => c.coverage_n)), min, dim);
    assert.ok(cells.every((c) => Number.isFinite(c.competence) && c.coverage_n >= gate), dim);
    assert.deepEqual(evidence.answered_counts[dim], Object.fromEntries(Object.entries(evidence[dim]).map(([k, c]) => [k, c.coverage_n])));
  }
  for (const dim of ['languages', 'topics', 'usecases', 'families']) for (const cell of Object.values(evidence[dim])) {
    assert.equal(cell.n, cell.response_n + cell.refusal_n + cell.operational_failure_n);
    assert.equal(cell.coverage_n, cell.response_n + cell.refusal_n);
  }
  assert.deepEqual(evidence.gates, { languages23_ge60: true, topics7_usecases20_ge30: true });
  assert.equal(language.systems[key].language_target_complete, true);
  assert.equal(language.systems[key].languages_below_target60, 0);
  assert.equal(read('data/jevbench-radar-spoke-exceptions.json').some((x) => x.key === key), false);
  validateRadarSpokeGate(jevbenchCategoryView('v1.6.1', [key], { supplement: true }), [key], []);
});

test('All 1,505 supplemental items answered natively; P300 is carried once and there are no operational failures', () => {
  const pc = evidence.pool_counts;
  assert.equal(evidence.supplemental_native_records, 1505);
  // Each supplement pool is its new items plus the same 300 P items.
  for (const [p, fresh] of [['L1', 354], ['L2', 33], ['L3', 1118]]) {
    assert.equal(pc[p].denominator, fresh + 300, p); assert.equal(pc[p].recorded, pc[p].denominator, p);
    assert.equal(pc[p].native_HTTP200, pc[p].denominator, p);
    assert.equal(pc[p].official_status.missing, 0, p); assert.equal(pc[p].official_status.status, 'complete', p);
  }
  assert.deepEqual([pc.S.denominator, pc.S.native_HTTP200, pc.S.official_status.missing], [1500, 1500, 0]);
  assert.equal(Object.values(evidence.languages).reduce((s, c) => s + c.n, 0), 3005);
  assert.equal(Object.values(evidence.languages).reduce((s, c) => s + c.operational_failure_n, 0), 0);
  assert.deepEqual(language.systems[key].pool_ok, { S: 1200, P: 300, L1: 354, L2: 33, L3: 1118 });
  for (const source of [language, category]) {
    const prov = source.row_provenance[key];
    assert.equal(prov.original_http500_retained_unimputed, 0);
    assert.equal(prov.P300_carried_by_stable_identity_counted_once, true);
    assert.equal(prov.supplemental_native_records, 1505);
  }
});

test('Messier discloses its S+P+L1+L2+L3 pools and meets the listed-row radar gate', () => {
  assert.equal(languageCoverage(language.systems[key]), 'S+P+L1+L2+L3');
  assert.equal(category.systems[key].category_pools, 'S+P+L1+L2+L3');
  const boards = listedRadarBoards();
  assert.ok(boards.open.includes(key));
  const view = jevbenchCategoryView('v1.6.1', boards.open, { supplement: true });
  assert.equal(view.categoryPools[key], 'S+P+L1+L2+L3');
  assert.equal(view.spokeExceptions[key], undefined);
  // Gate on the same addenda-aware view the page and release script use.
  validateRadarSpokeGate(listedRadarCategoryView(boards.open), boards.open, read('data/jevbench-radar-spoke-exceptions.json'));
});

test('The coverage note keeps P300 carry and the L3 OpenAI review exposure visible, in public terms', () => {
  const note = language.systems[key].coverage_note;
  assert.equal(category.systems[key].coverage_note, note);
  // Same text as the aggregate's coverage_note, except "L3-based cells" reads "cells based on L3" (the cells artifacts must not contain the substring "l3-").
  assert.equal(note, evidence.coverage_note.replace('L3-based cells carry', 'cells based on L3 carry'));
  for (const pattern of [/1,505 newly completed/, /354 L1, 33 L2, 1,118 L3/, /same original P300 answers by stable item identity/, /count once in the union/,
    /All 1,505 supplemental requests succeeded/, /Headline, rank, Composite and original pricing are unchanged/, /reviewed by an OpenAI model/, /headline scores do not use L3/]) assert.match(note, pattern);
  for (const source of [language, category]) assert.doesNotMatch(JSON.stringify(source.systems[key]), /R59|\/home\/|[A-Z]:\\/);
  const live = withLiveCategoryCells(read('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-categories.json'));
  assert.equal(live.systems[key].language_coverage_note, note);
  const view = jevbenchCategoryView('v1.6.1', [key], { supplement: true });
  assert.equal(view.coverageNotes[key], note);
});

test('Public handoff contains only aggregates and no local paths', () => {
  const raw = bytes(path).toString();
  assert.doesNotMatch(raw, /"(?:item_ids?|item_text|question|gold|prediction|task_id|per_item|input|prompt|raw_output|answer_text)"|\/home\/|\/Users\/|[A-Z]:\\\\/i);
  assert.equal(evidence.kind, 'MESSIER_OFFICIAL_O1S_COMPLETED1505_PUBLIC_AGGREGATES');
});
