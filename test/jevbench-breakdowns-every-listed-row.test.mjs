// RELEASE GATE — standing rule (Florian, DECISIONS 2026-10-16 13:30 UTC): every system listed on the live JevBench boards
// (open weights and API) has measured cells in the Use-case radar, the Capability-by-subject-topic radar and the Languages
// table. The gate rebuilds the boards with the same function the pages use (lib/jevbench-live-board.mjs), so a row added
// by any path — v1.6.1 overlay, API addendum, fresh-draw cohort release, dated carry — fails here until its cells exist
// or data/jevbench-breakdown-exceptions.json records why (with a decision reference).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readJevbenchV161Release } from '../lib/jevbench-v16-release.mjs';
import { readJevbenchV157Release } from '../lib/jevbench-v15-release.mjs';
import { assembleJevBoard } from '../lib/jevbench-live-board.mjs';
import { jevBreakdownGaps, imageJevBreakdownGaps, readBreakdownExceptions, unexcusedBreakdownGaps, validateBreakdownExceptions } from '../lib/jevbench-breakdown-gate.mjs';
import { withCohortCategoryCells, validateCohortTopicCells, readCohortTopicCells } from '../lib/jevbench-cohort-categories.mjs';
import { validateCategoryArtifact } from '../lib/jevbench-categories.mjs';

const apiA4 = JSON.parse(readFileSync(new URL('../data/jevbench-api-a4-equated.json', import.meta.url)));
const previous = await readJevbenchV157Release();
const release = await readJevbenchV161Release();
const board = await assembleJevBoard({ release, previous, live: true, apiA4 });
const exceptions = await readBreakdownExceptions();

test('gate: no listed row lacks topic, use-case or language cells without a recorded exception', () => {
  const { open, stale } = unexcusedBreakdownGaps(jevBreakdownGaps(board, previous), exceptions);
  assert.deepEqual(open.map((g) => `${g.key}: ${g.dims.join('+')} (${g.where.join(', ')})`), []);
  assert.deepEqual(stale, [], 'exception entries without a matching gap must be removed');
});

test('gate catches a future fresh-draw row whose release ships no category cells', () => {
  const victim = board.published.systems.find((s) => s.draw && s.listing !== 'preliminary');
  const systems = { ...board.categories.systems };
  delete systems[victim.key];
  const gaps = jevBreakdownGaps({ ...board, categories: { ...board.categories, systems } }, previous);
  const g = gaps.find((x) => x.key === victim.key);
  assert.ok(g, victim.key);
  assert.deepEqual(g.dims, ['topics', 'usecases', 'languages']);
});

test('gate catches an added API row and a carry row without language cells', () => {
  const fresh = { ...board.published.systems.find((s) => s.key === 'liquid-d1-ultra'), key: 'future-api-row', display: 'Future API row' };
  const carryRow = { ...board.publishedCarry.rows[0], key: 'future-carry-row', display: 'Future carry row' };
  const gaps = jevBreakdownGaps({ ...board, published: { ...board.published, systems: [...board.published.systems, fresh] },
    publishedCarry: { ...board.publishedCarry, rows: [...board.publishedCarry.rows, carryRow] } }, previous);
  assert.deepEqual(gaps.find((g) => g.key === 'future-api-row')?.dims, ['topics', 'usecases', 'languages']);
  assert.deepEqual(gaps.find((g) => g.key === 'future-carry-row')?.dims, ['languages']);
});

test('exceptions need a reason and a decision reference', () => {
  assert.throws(() => validateBreakdownExceptions({ ...exceptions, entries: [{ key: 'x', dims: ['topics'], reason: 'labels are not done yet for this row' }] }), /recorded decision/);
  assert.throws(() => validateBreakdownExceptions({ ...exceptions, entries: [{ key: 'x', dims: ['radar'], reason: 'labels are not done yet for this row', decision: 'board #1' }] }), /dims/);
});

test('fresh-draw rows carry their own draw cells, tagged with the draw; no row of the base is overridden', () => {
  const d1u = board.categories.systems['liquid-d1-ultra'];
  assert.equal(d1u.coverage, 'S+P (draw v1.6-regular-20261012)');
  assert.ok(Object.keys(d1u.usecases).length >= 10 && Object.keys(d1u.languages).length >= 5);
  const wald = board.categories.systems['wald-4b-v2'];
  assert.equal(wald.coverage, 'S+P (draw v1.6-fastlane-20261009)');
  assert.ok(wald.usecases.ecommerce_marketplaces || wald.usecases.moderation_trust_safety, 'v1.6.4 short use-case keys are mapped');
  for (const [key, row] of Object.entries(board.categories.systems)) for (const dim of ['topics', 'usecases', 'languages'])
    for (const [c, cell] of Object.entries(row[dim] ?? {})) assert.ok(cell.n >= 15 && Number.isFinite(cell.competence), `${key}.${dim}.${c}`);
  // The merged artifact passes the standard category validation (cells within each row's pool counts).
  assert.doesNotThrow(() => validateCategoryArtifact(board.categories, ['topics', 'usecases']));
  // Rows already in the live artifact keep their cells.
  const cohort = { rows: [{ row: { key: 'aplomb-1' }, draw: { id: 'v1.6-regular-20261012' } }], categories: [] };
  assert.equal(withCohortCategoryCells(board.categories, cohort).systems['aplomb-1'], board.categories.systems['aplomb-1']);
});

test('cohort topic supplement is aggregate-only and validated', async () => {
  const sup = await readCohortTopicCells();
  assert.doesNotThrow(() => validateCohortTopicCells(sup));
  assert.throws(() => validateCohortTopicCells({ ...sup, draws: { d: { item_ids: [] } } }), /item-level|labels_sha256/);
});

test('gate (ImageJevBench v0.3): every ranking row has image-type, use-case and TypeSafe-20 cells or a recorded exception', () => {
  const read = (f) => JSON.parse(readFileSync(new URL(`../${f}`, import.meta.url)));
  const release = read('data/imagejev-v03.json'), ts20 = read('data/imagejev-ts20-categories.json');
  const { open, stale } = unexcusedBreakdownGaps(imageJevBreakdownGaps(release, ts20), exceptions, 'imagejevbench');
  assert.deepEqual(open.map((g) => `${g.key}: ${g.dims.join('+')}`), []);
  assert.deepEqual(stale, []);
  // A future row without cells fails.
  const added = { ...release, ranking: [...release.ranking, { key: 'future-image-row' }] };
  assert.deepEqual(imageJevBreakdownGaps(added, ts20).find((g) => g.key === 'future-image-row').dims, ['capabilities', 'usecases', 'typesafe']);
});
