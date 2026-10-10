// Source-only support for a prospective JevBench v1.6.3 same-draw completed-field addendum. Synthetic fixtures only: no
// v1.6.3 data or manifest exists; prospective routes and conditional navigation remain unavailable without them.
import test from 'node:test';
import { jevV15CompareRow } from '../lib/jevbench-v15-board.mjs';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { JEVBENCH_FRESH_V16_REVISIONS, isFreshJevbenchV16Revision, JEVBENCH_CATEGORY_REVISIONS, freshJevbenchCategoryRows, jevbenchCategoryView } from '../lib/jevbench-categories.mjs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const v161 = JSON.parse(read('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-categories.json'));

/** A fresh-cohort categories artifact built from the historical one, with distinct competence values and a zero-count category. */
function freshCategories(revision, competence) {
  const c = structuredClone(v161);
  c.revision = revision;
  for (const field of ['unavailable', 'supplement', 'live_category_cells', 'language_cells']) delete c[field];
  const keys = Object.keys(c.systems).slice(0, 2);
  c.systems = Object.fromEntries(keys.map((k) => [k, c.systems[k]]));
  for (const row of Object.values(c.systems)) for (const dim of ['topics', 'usecases', 'languages']) {
    row[dim] = Object.fromEntries(c[dim].filter(d => d.n > 0).map(d => [d.key, { n: d.n, competence, coverage_n: d.n }]));
  }
  // Zero-count fresh taxonomy entry: the category exists on the draw but no item fell into it, so no system has a cell.
  c.usecases.push({ key: 'fixture_zero', label: 'Fixture zero', covers: 'No items in this draw', n: 0, open: 0, sealed: 0, low_n: true });
  return { c, keys };
}
const cat = (view, dim, key) => view.dims.find((d) => d.key === dim).cats.find((x) => x.key === key);

test('fresh-v16 helper covers exactly v1.6.2, v1.6.3 and v1.6.4', () => {
  assert.deepEqual(JEVBENCH_FRESH_V16_REVISIONS, ['v1.6.2', 'v1.6.3', 'v1.6.4']);
  for (const r of ['v1.6.2', 'v1.6.3', 'v1.6.4']) assert.equal(isFreshJevbenchV16Revision(r), true, r);
  for (const r of ['v1.6.1', 'v1.6.0', 'v1.5.7', 'v1.5.6', 'v1.5.5', 'v1.5.0', 'v1.6.5', 'v1.6', '', undefined, null]) assert.equal(isFreshJevbenchV16Revision(r), false, String(r));
  assert.ok(JEVBENCH_CATEGORY_REVISIONS.includes('v1.6.3'));
});

test('v1.6.3 honours its own passed category artifact, distinct from v1.6.2', () => {
  const a = freshCategories('v1.6.3', 61.5), b = freshCategories('v1.6.2', 12.25);
  const key = a.keys[0], topic = a.c.topics.find((t) => a.c.systems[key].topics[t.key]).key;
  const v163 = jevbenchCategoryView('v1.6.3', a.keys, { artifact: a.c });
  const v162 = jevbenchCategoryView('v1.6.2', b.keys, { artifact: b.c });
  assert.equal(v163.revision, 'v1.6.3');
  assert.equal(v163.systems[key].topics[topic][0], 61.5);
  assert.equal(v162.systems[key].topics[topic][0], 12.25);
  // Never the historical overlays.
  assert.deepEqual(v163.spokeExceptions, {});
  assert.deepEqual(v163.exposureNotes, {});
});

test('a missing fresh v1.6.3 artifact never falls back to historical categories', () => {
  for (const options of [undefined, {}, { artifact: null }, { artifact: undefined }, { supplement: true }, { supplement: true, artifact: null }]) {
    assert.equal(jevbenchCategoryView('v1.6.3', Object.keys(v161.systems), options), null, JSON.stringify(options));
    assert.equal(jevbenchCategoryView('v1.6.2', Object.keys(v161.systems), options), null, JSON.stringify(options));
  }
  // A v1.6.2 (or historical) artifact cannot stand in for v1.6.3.
  assert.throws(() => jevbenchCategoryView('v1.6.3', [], { artifact: freshCategories('v1.6.2', 50).c }), /revision mismatch/);
  assert.throws(() => jevbenchCategoryView('v1.6.3', [], { artifact: v161 }), /revision mismatch/);
});

test('fresh v1.6.3 keeps zero-count categories and plots Other, like v1.6.2', () => {
  for (const revision of JEVBENCH_FRESH_V16_REVISIONS) {
    const { c, keys } = freshCategories(revision, 40);
    const view = jevbenchCategoryView(revision, keys, { artifact: c });
    const zero = cat(view, 'usecases', 'fixture_zero');
    assert.ok(zero, `${revision} keeps zero-count taxonomy entry`);
    assert.equal(zero.n, 0); assert.equal(zero.plotted, false); assert.equal(zero.lowSample, false); assert.equal(zero.lowN, true);
    assert.equal(cat(view, 'usecases', 'other').plotted, true, `${revision} plots Other`);
    for (const k of keys) assert.equal(view.systems[k].usecases.fixture_zero, undefined);
  }
});

test('historical revisions keep their imported artifacts and hide Other', () => {
  for (const revision of ['v1.6.1', 'v1.6.0', 'v1.5.7', 'v1.5.6', 'v1.5.5', 'v1.5.0']) {
    const view = jevbenchCategoryView(revision, []);
    assert.equal(view?.revision?.startsWith(revision.slice(0, 4)), true, revision);
    const other = cat(view, 'usecases', 'other');
    if (other) assert.equal(other.plotted, false, `${revision} still hides Other`);
  }
  assert.equal(jevbenchCategoryView('v1.6.1', []).revision, 'v1.6.1');
});

test('board dispatches fresh behaviour through the helper and keeps every section', () => {
  const board = read('components/JevBenchV16Board.tsx');
  assert.match(board, /const fresh = isFreshJevbenchV16Revision\(a\.revision\);/);
  assert.equal([...board.matchAll(/artifact: fresh \? categories : undefined/g)].length, 2, 'Compare and All data both pass only the release categories');
  assert.match(board, /\(!fresh \|\| carry\.rows\.length > 0\) && <DatedCarry/);
  assert.match(board, /if \(isFreshJevbenchV16Revision\(a\.revision\)\) return <>/);
  assert.match(board, /isFreshJevbenchV16Revision\(props\.a\.revision\) \? `Method notes · fresh native cohort\$\{props\.a\.revision === 'v1\.6\.2' \? '' :/);
  assert.doesNotMatch(board, /revision === ["']v1\.6\.2["'] \? categories/);
  for (const section of ['<JevBenchV16Charts', '<JevScoreChart', '<JevCompareV15', '<JevV15AllDataGrid', '<LanguageView', '<DatedCarry', '<Method ']) assert.ok(board.includes(section), section);
});

// Source infrastructure may precede data. Publication remains unavailable/inactive until its genuine bundle exists.
// Validate genuine publication when present; missing or malformed bundles remain unavailable/fail closed.
test('actual candidate presence requires strict validation and navigation stays conditional', async () => {
  const dir = 'data/raw/benchmarks/jevbench';
  const present = readdirSync(new URL(`../${dir}`, import.meta.url), {recursive:true}).filter((f) => f.includes('1.6.3')).sort();
  const loaderPath = new URL('../lib/jevbench-v163-release.mjs', import.meta.url);
  const pagePath = new URL('../app/jev-models/v1.6.3/page.tsx', import.meta.url);
  const apiPath = new URL('../app/api/jevbench/v1.6.3/route.ts', import.meta.url);
  const nav = read('components/JevBenchReleaseVersionNav.tsx');
  if (existsSync(loaderPath)) {
    assert.ok(existsSync(pagePath) && existsSync(apiPath), 'prospective loader has both guarded routes');
    const loader = await import(loaderPath.href);
    const release = await loader.readOptionalJevbenchV163Release(); // malformed manifest throws; no catch/skip
    if (release) {
      assert.deepEqual(present, [...Object.values(loader.V163_FILES), loader.V163_MANIFEST].map(p => p.slice(`${dir}/`.length)).sort());
      assert.equal(await loader.hasPublishedJevbenchV163Release(), true);
      assert.equal(release.artifact.n_ranked, 4);
      assert.ok([5, 6].includes(release.artifact.systems.length));
    } else {
      assert.deepEqual(present, []);
      assert.equal(await loader.hasPublishedJevbenchV163Release(process.cwd(), () => assert.fail('absent manifest must not log')), false);
    }
    assert.match(read('app/jev-models/v1.6.3/page.tsx'), /if \(\!release\) notFound\(\);/);
    assert.match(read('app/api/jevbench/v1.6.3/route.ts'), /if \(\!release\) return new Response\('Not found', \{ status: 404 \}\)/);
    assert.match(nav, /const visible163 = fresh163 \?\? await hasPublishedJevbenchV163Release\(\)/);
    assert.match(nav, /visible163 \? \[\{ version: 'v1\.6\.3'/);
  } else {
    assert.deepEqual(present, []);
    assert.equal(existsSync(pagePath), false); assert.equal(existsSync(apiPath), false);
    assert.doesNotMatch(nav, /1\.6\.3/);
  }
  assert.doesNotMatch(read('lib/jevbench-categories.mjs'), /jevbench-v1\.6\.3/);
  assert.doesNotMatch(read('lib/decision-benchmark-manifest.mjs'), /v1\.6\.3/);
  assert.doesNotMatch(read('app/jev-models/page.tsx'), /v163|1\.6\.3/);
});

test('fresh category coverage is mandatory and cannot bring historical overlays', () => {
  const { c, keys } = freshCategories('v1.6.3', 40);
  const cell = Object.values(c.systems[keys[0]].topics)[0];
  for (const value of [undefined, -1, cell.n + 1, 0.5]) {
    const bad = structuredClone(c); Object.values(bad.systems[keys[0]].topics)[0].coverage_n = value;
    assert.throws(() => jevbenchCategoryView('v1.6.3', keys, { artifact: bad }), /completed coverage/);
  }
  for (const field of ['live_category_cells', 'supplement', 'language_cells', 'unavailable']) {
    const bad = structuredClone(c); bad[field] = {};
    assert.throws(() => jevbenchCategoryView('v1.6.3', keys, { artifact: bad }), /historical fresh overlay/);
  }
});
test('fresh category view rows preserve native and wrapper cells, wrappers last', () => {
  const rows = [{ key: 'RYO', listing: 'wrapper' }, { key: 'Decisor', ranked: true }, { key: '12B', listing: 'wrapper' }, { key: 'Jeff', ranked: true }];
  const ordered = freshJevbenchCategoryRows(rows);
  assert.deepEqual(ordered.map(r => r.key), ['Decisor', 'Jeff', 'RYO', '12B']);
  assert.deepEqual(rows.map(r => r.key), ['RYO', 'Decisor', '12B', 'Jeff']);
  const board = read('components/JevBenchV16Board.tsx');
  assert.match(board, /const compareSources = \['v1\.6\.3', 'v1\.6\.4'\]\.includes\(a\.revision\) \? freshJevbenchCategoryRows\(a.systems\) : ranked/);
  assert.match(board, /\['v1\.6\.3', 'v1\.6\.4'\]\.includes\(a\.revision\) \? freshJevbenchCategoryRows\(a.systems.filter/);
});


test('six completed rows carry actual topic/usecase/language cells through Compare projection', () => {
  const { c } = freshCategories('v1.6.3', 41);
  const original = Object.values(c.systems)[0];
  const rows = [
    {key:'RYO', listing:'wrapper', ranked:false}, {key:'D',rank:4,ranked:true},
    {key:'12B',listing:'wrapper',ranked:false}, {key:'J',rank:1,ranked:true},
    {key:'W',rank:3,ranked:true}, {key:'M',rank:2,ranked:true},
  ].map((r, i) => ({...r, display:r.key, jevbench_score:100-i, axes:{}}));
  c.systems = Object.fromEntries(rows.map((r,i) => {
    const cells = structuredClone(original);
    for (const dim of ['topics','usecases','languages']) for (const cell of Object.values(cells[dim])) cell.competence = 31+i;
    return [r.key, cells];
  }));
  const ordered = freshJevbenchCategoryRows(rows);
  assert.deepEqual(ordered.map(r=>r.key), ['J','M','W','D','RYO','12B']);
  const projected = ordered.map(jevV15CompareRow);
  const view = jevbenchCategoryView('v1.6.3', projected.map(r=>r.key), {artifact:c});
  assert.deepEqual(Object.keys(view.systems), projected.map(r=>r.key));
  assert.deepEqual(view.missing, {});
  for (const r of rows) {
    for (const dim of ['topics','usecases']) {
      const [key, cell] = Object.entries(c.systems[r.key][dim])[0];
      assert.deepEqual(view.systems[r.key][dim][key], [cell.competence, cell.n, cell.coverage_n]);
    }
    assert.ok(Object.values(c.systems[r.key].languages).every(cell=>cell.coverage_n===cell.n));
  }
  assert.deepEqual(projected.slice(-2).map(r=>[r.key,r.rank,r.listing]), [['RYO',null,'wrapper'],['12B',null,'wrapper']]);
  assert.deepEqual(rows.filter(r=>r.ranked).map(r=>r.key).sort(), ['D','J','M','W']);
});

test('v163 languages and every nonempty category require complete measured cells', () => {
  const {c,keys}=freshCategories('v1.6.3',40);
  for (const dim of ['topics','usecases','languages']) {
    const bad=structuredClone(c);const category=Object.keys(bad.systems[keys[0]][dim])[0];
    delete bad.systems[keys[0]][dim][category];
    assert.throws(()=>jevbenchCategoryView('v1.6.3',keys,{artifact:bad}), /missing completed cell/);
  }
  const bad=structuredClone(c);Object.values(bad.systems[keys[0]].languages)[0].coverage_n=undefined;
  assert.throws(()=>jevbenchCategoryView('v1.6.3',keys,{artifact:bad}), /completed coverage/);
});

test('v163 and v164 restatements are distinct and v162 row dispatch is unchanged', () => {
  const board=read('components/JevBenchV16Board.tsx');
  assert.match(board, /a.revision === 'v1.6.3' && <p[^>]*>This same-draw addendum rescores/);
  assert.match(board, /original four systems/);
  assert.match(board, /restate and supersede v1.6.2/);
  assert.match(board, /not comparable one-to-one/);
  assert.match(board, /a.revision === 'v1.6.4' && <p[^>]*>This same-draw six-model addendum/);
  assert.match(board, /five prior measurements, point scores and four-native field median are retained/);
  // Explicit two-version dispatch preserves existing v162 Compare ranked and Languages listedRow/byBoard paths.
  assert.match(board, /const compareSources = \['v1\.6\.3', 'v1\.6\.4'\]\.includes\(a\.revision\) \? freshJevbenchCategoryRows\(a.systems\) : ranked/);
  assert.match(board, /const systems = \['v1\.6\.3', 'v1\.6\.4'\]\.includes\(a\.revision\) \? .* : categories.language_cells \?/);
  assert.match(board, /a.systems.filter\(\(s\) => listedRow\(s\) && categories.systems\[s.key\]\).sort\(byBoard\)/);
});

test('v1.6.4 uses its own stored cells and refuses missing fresh artifact', () => {
  const { c, keys } = freshCategories('v1.6.4', 37.75);
  const view = jevbenchCategoryView('v1.6.4', keys, { artifact: c });
  const topic = c.topics.find(t => c.systems[keys[0]].topics[t.key]).key;
  assert.equal(view.systems[keys[0]].topics[topic][0], 37.75);
  assert.deepEqual(view.spokeExceptions, {});
  assert.equal(jevbenchCategoryView('v1.6.4', keys), null);
  assert.throws(() => jevbenchCategoryView('v1.6.4', keys, { artifact: freshCategories('v1.6.3', 40).c }), /revision mismatch/);
});
