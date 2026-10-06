import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readJevbenchV161Release } from '../lib/jevbench-v16-release.mjs';
import { systemsBaselineSha256, categoriesBaselineSha256 } from '../lib/jevbench-add-rows-baseline.mjs';

// scripts/jevbench-add-rows.py appends rows measured on the same frozen v1.6 pool to the v1.6.1 release and records an `additions`
// entry with baseline hashes of everything that existed before. These checks hold for every addendum, however many are applied.
const read = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const { artifact: a, categories } = await readJevbenchV161Release();
const architecture = read('data/jevbench-architecture.json').benchmarks.jevbench;
const baseModels = read('data/jevbench-base-models.json').benchmarks.jevbench;
const additions = a.additions ?? [];
const rows = new Map(a.systems.map((s) => [s.key, s]));
const REQUIRED = ['class', 'open', 'licence', 'repo', 'gpu', 'endpoint_condition', 'underlying', 'model_pin', 'last_measured_on', 'measurement_date_status', 'measured_in', 'noul_decisive', 'provenance'];

test('baseline hashes ignore rank fields and key order only', () => {
  const s = [{ key: 'a', x: 1, rank: 3, ranks: { A: 3 } }, { key: 'b', y: { q: 1, p: 2 } }];
  assert.equal(systemsBaselineSha256(s), systemsBaselineSha256([{ key: 'a', rank: 9, ranks: {}, x: 1 }, { key: 'b', y: { p: 2, q: 1 } }]));
  assert.notEqual(systemsBaselineSha256(s), systemsBaselineSha256([{ key: 'a', x: 2 }, s[1]]));
  assert.equal(systemsBaselineSha256(s, ['b']), systemsBaselineSha256([s[0]]));
  assert.notEqual(categoriesBaselineSha256({ a: { n: 1 } }), categoriesBaselineSha256({ a: { n: 2 } }));
});

test('every addendum keeps the published rows and cells unchanged and is complete for its new keys', () => {
  additions.forEach((add, i) => {
    const later = additions.slice(i).flatMap((x) => x.keys);
    assert.equal(systemsBaselineSha256(a.systems, later), add.baseline_systems_sha256, `${add.label}: a published row changed`);
    assert.equal(categoriesBaselineSha256(categories.systems, later), add.baseline_categories_sha256, `${add.label}: a published category cell changed`);
    assert.match(add.scorer_source_sha256, /^[0-9a-f]{64}$/);
    assert.match(add.date, /^\d{4}-\d{2}-\d{2}$/);
    for (const key of add.keys) {
      const s = rows.get(key);
      assert.ok(s, `${key} is a result row`);
      assert.equal(s.ranked, true, key);
      assert.equal(s.v16.lane, 'selfhosted', key);
      assert.equal(s.status.rows, 1500, key);
      assert.equal(s.v16.breakdowns, undefined, `${key}: per-category aggregates ship in the categories file`);
      for (const f of REQUIRED) assert.ok(s[f] !== undefined, `${key}.${f}`);
      assert.match(s.provenance.kind, new RegExp(`^v1\\.6\\.1 addendum ${add.label} `), key);
      assert.ok(!a.not_measured.some((n) => n.key === key), `${key} is no longer listed as not measured`);
      const cells = categories.systems[key];
      assert.ok(cells, `${key} has category cells`);
      for (const dim of ['topics', 'usecases', 'families', 'languages']) assert.ok(Object.keys(cells[dim]).length >= 3, `${key}.${dim}`);
      assert.equal(categories.lanes[key], 'selfhosted', key);
      assert.ok(architecture[key]?.evidence?.length, `${key} architecture entry`);
      assert.ok(baseModels[key]?.label && baseModels[key].sources?.length, `${key} base-model entry`);
    }
  });
});

test('counts, ranks and board orders cover the enlarged field', () => {
  const ranked = a.systems.filter((s) => s.ranked);
  assert.equal(a.n_ranked, ranked.length);
  assert.equal(a.roster_count, a.systems.length + a.not_measured.length);
  for (const o of ['A', 'B', 'C']) {
    const order = [...ranked].sort((x, y) => y.scores[o] - x.scores[o] || (x.key < y.key ? -1 : 1)).map((s) => s.key);
    assert.deepEqual(a.board[o].order, order, `board ${o}`);
    ranked.forEach((s) => assert.equal(s.ranks[o], order.indexOf(s.key) + 1, `${s.key} rank ${o}`));
  }
  const cap = [...ranked].sort((x, y) => y.capability - x.capability || (x.key < y.key ? -1 : 1)).map((s) => s.key);
  ranked.forEach((s) => assert.equal(s.ranks.capability, cap.indexOf(s.key) + 1, `${s.key} capability rank`));
  const keys = new Set([...Object.keys(categories.systems)]);
  for (const s of ranked) assert.ok(keys.has(s.key), `${s.key} has category cells`);
});
