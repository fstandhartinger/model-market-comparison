import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { IMAGEJEV_V04_MIN_CELL_N, loadImageJevV04Feed, validateImageJevV04Feed } from '../lib/imagejev-v04-feed.mjs';

const fixture = JSON.parse(await readFile(new URL('../data/fixtures/imagejev-v04.fixture.json', import.meta.url), 'utf8'));
const copy = () => structuredClone(fixture);

test('v0.4 fixture validates without importing or ranking any v0.3 models', () => {
  assert.deepEqual(validateImageJevV04Feed(fixture), fixture);
  assert.equal(fixture.data_kind, 'fixture');
  assert.equal((fixture.rows[0].intelligence + fixture.rows[0].calibration) / 2, 75);
  const measured = copy();
  measured.data_kind = 'measured';
  measured.rows[0].id = 'example-model';
  measured.rows[0].name = 'Example model';
  measured.method_disclosure = 'Reviewed v0.4 method text.';
  assert.deepEqual(validateImageJevV04Feed(measured), measured);
});

test('every feed and row field is required; no incomplete rows are salvaged', () => {
  for (const field of Object.keys(fixture)) {
    const value = copy(); delete value[field];
    assert.equal(validateImageJevV04Feed(value), null, `missing feed.${field}`);
  }
  for (const field of Object.keys(fixture.rows[1])) {
    const value = copy(); delete value.rows[1][field];
    assert.equal(validateImageJevV04Feed(value), null, `missing second row.${field}`);
  }
});

test('wrong versions, invalid metadata and extra legacy fields fail closed', () => {
  for (const [field, values] of Object.entries({
    schema_version: [0, 2, '1', null], benchmark: ['JevBench', null],
    scale: ['v0.3', 'v0.4-A', null], revision: ['v0.3.0', 'v0.40', '', null],
    data_kind: ['released', '', null], items: [0, -1, 1.5, '300', Infinity, 1_000_001, null],
    built_utc: ['2026-02-30T12:00:00.000Z', 'yesterday', '2026-11-12', null],
    method_disclosure: ['', ' ', 1, {}, []], rows: [null, {}, [], [null]],
  })) for (const bad of values) {
    const value = copy(); value[field] = bad;
    assert.equal(validateImageJevV04Feed(value), null, `${field}=${String(bad)}`);
  }
  for (const field of ['ranking', 'carried', 'v03_delta', 'rank']) {
    const value = copy(); value[field] = [];
    assert.equal(validateImageJevV04Feed(value), null, field);
  }
  for (const value of [null, false, 0, '', [], { revision: 'v0.4-A' }]) assert.equal(validateImageJevV04Feed(value), null);
});

test('invalid scores, counts, timing, duplicates and disguised fixtures hide the whole feed', () => {
  for (const field of ['intelligence', 'calibration', 'composite']) {
    for (const bad of [-0.01, 100.01, NaN, Infinity, '75', true, ...(field === 'composite' ? [] : [null])]) {
      const value = copy(); value.rows[1][field] = bad;
      assert.equal(validateImageJevV04Feed(value), null, `${field}=${String(bad)}`);
    }
    for (const edge of [0, 100]) {
      const value = copy(); value.rows[1][field] = edge;
      assert.ok(validateImageJevV04Feed(value));
    }
  }
  for (const field of ['latency_p50_s', 'usd_per_1000']) for (const bad of [-1, Infinity, NaN, '0', ...(field === 'usd_per_1000' ? [null] : [])]) {
    const value = copy(); value.rows[1][field] = bad;
    assert.equal(validateImageJevV04Feed(value), null, field);
  }
  for (const [field, bad] of [
    ['n', 301], ['n', 1.5], ['n', 0], ['n', '300'],
    ['name', ''], ['name', ' '], ['name', null], ['name', 'Real model'],
    ['id', 'Bad ID'], ['id', 'real-model'], ['id', 'fixture-amber'],
    ['measured_utc', '2026-11-13T12:00:00.000Z'], ['measured_utc', '2026-02-30T12:00:00.000Z'],
    ['rank', 1], ['delta_v03', 2],
  ]) {
    const value = copy(); value.rows[1][field] = bad;
    assert.equal(validateImageJevV04Feed(value), null, `${field}=${String(bad)}`);
  }
});

test('composite and latency may be null (not measured), never strings or estimates', () => {
  const value = copy(); value.rows[0].composite = null; value.rows[0].latency_p50_s = null;
  assert.ok(validateImageJevV04Feed(value));
});

test('release gate: every listed breakdown cell needs >= 30 scored items and the cells cover the row exactly', () => {
  assert.equal(IMAGEJEV_V04_MIN_CELL_N, 30);
  const atFloor = copy();
  atFloor.rows[0].breakdowns.use_case = [
    { id: 'a', label: 'A', n: 30, correct: 10, chance: 0.25 },
    { id: 'b', label: 'B', n: 270, correct: 100, chance: 0.25 },
  ];
  assert.ok(validateImageJevV04Feed(atFloor), 'a 30-item cell is allowed');
  const below = structuredClone(atFloor);
  below.rows[0].breakdowns.use_case[0].n = 29; below.rows[0].breakdowns.use_case[1].n = 271;
  assert.equal(validateImageJevV04Feed(below), null, 'a 29-item cell hides the whole feed');
  const imageBelow = structuredClone(atFloor);
  imageBelow.rows[0].breakdowns.image_type = structuredClone(below.rows[0].breakdowns.use_case);
  assert.equal(validateImageJevV04Feed(imageBelow), null, 'the image-type breakdown has the same floor');
  for (const mutate of [
    (b) => { b.use_case[1].n = 260; },
    (b) => { b.use_case[1].id = 'a'; },
    (b) => { b.use_case[0].correct = 31; },
    (b) => { b.use_case[0].chance = 0; },
    (b) => { b.use_case[0].chance = 1; },
    (b) => { b.use_case[0].rank = 1; },
    (b) => { b.use_case = []; },
    (b) => { delete b.image_type; },
    (b) => { b.category = null; },
  ]) {
    const value = structuredClone(atFloor); mutate(value.rows[0].breakdowns);
    assert.equal(validateImageJevV04Feed(value), null, String(mutate));
  }
  const none = copy(); none.rows[0].breakdowns = { use_case: null, image_type: null };
  assert.ok(validateImageJevV04Feed(none), 'breakdowns may be withheld entirely');
});

test('the committed measured v0.4-A feed passes the cell gate when present', async () => {
  let raw;
  try { raw = await readFile(new URL('../data/imagejev-v04.json', import.meta.url), 'utf8'); } catch { return; }
  const feed = validateImageJevV04Feed(JSON.parse(raw));
  assert.ok(feed, 'data/imagejev-v04.json must validate');
  assert.equal(feed.data_kind, 'measured');
  for (const row of feed.rows) for (const cells of Object.values(row.breakdowns)) for (const cell of cells ?? []) {
    assert.ok(cell.n >= IMAGEJEV_V04_MIN_CELL_N, `${row.id} ${cell.id} n=${cell.n}`);
  }
});

test('loader catches missing/unreadable/malformed feeds and requires fixture opt-in', async () => {
  const json = JSON.stringify(fixture);
  assert.equal(await loadImageJevV04Feed(async () => { throw new Error('ENOENT'); }), null);
  assert.equal(await loadImageJevV04Feed(async () => '{'), null);
  assert.equal(await loadImageJevV04Feed(async () => JSON.stringify({ ...fixture, scale: 'v0.3' })), null);
  assert.equal(await loadImageJevV04Feed(async () => json), null);
  assert.deepEqual(await loadImageJevV04Feed(async () => json, { allowFixture: true }), fixture);
  const measured = { ...fixture, data_kind: 'measured' };
  assert.deepEqual(await loadImageJevV04Feed(async () => JSON.stringify(measured)), measured);
});

test('an actual legacy v0.3 release artifact is rejected rather than used as fallback', async () => {
  const legacy = await readFile(new URL('../data/imagejev-v03.json', import.meta.url), 'utf8');
  assert.equal(await loadImageJevV04Feed(async () => legacy, { allowFixture: true }), null);
});
