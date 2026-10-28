import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { imageJevBoardSystems, imageJevCompareRows } from '../lib/imagejev-board.mjs';
import { withTs20 } from '../lib/imagejev-ts20.mjs';
const read = p => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const a = read('../data/imagejev-v03.json');
const key = 'h2o_lightning_4b_v141_d7f1_image';
const row = a.ranking.find(r => r.key === key);

test('CR-599: same-weight second read has scores and no rank in artifact and board adapters', () => {
  assert.equal(row.ranked, false);
  assert.equal(row.rank, null);
  assert.equal(row.listing, 'unranked');
  assert.equal(row.name, 'H2O-Lightning-4B v1.4.1 @d7f1b05a (image)');
  assert.match(row.not_ranked_because, /same weights \(c9b6290d\).*0.65 -> 1.0.*BM25.*transformers 5.20.2.*second read/);
  for (const rows of [imageJevBoardSystems(a), imageJevCompareRows(a)]) {
    const r = rows.find(r => r.key === key);
    assert.equal(r.rank, null);
    assert.equal(r.listing, 'unranked');
  }
  assert.ok(a.ranking.indexOf(row) > a.ranking.findLastIndex(r => r.ranked));
  assert.equal(row.tracks.core.capability, 71.83726300566951);
  assert.equal(row.tracks.core.composite.score, 68.5137371492465);
  assert.equal(row.tracks.core.cost.usd_per_1000, 0.0285248427972811);
  assert.equal(row.tracks.core.speed.raw_p50_s, 0.0862887115000035);
  assert.equal(row.tracks.core.failures, 0);
});

test('CR-599: every existing row, rank, score and field statistic stays byte-identical to the published field', () => {
  const existing = a.ranking.filter(r => r.key !== key);
  assert.equal(existing.length, 66);
  const hash = createHash('sha256').update(JSON.stringify(existing)).digest('hex');
  assert.equal(hash, '5c5c616d61af4c9028be0126e567fe24a146564608b2a1002b1b93925b41b249');
  assert.equal(existing.filter(r => r.ranked).length, 64);
});

test('CR-599: no TS20 values are borrowed; permanent exception and revision-specific cell text', () => {
  const ts = read('../data/imagejev-ts20-categories.json');
  assert.equal(ts.systems[key], undefined);
  assert.equal(ts.summary[key], undefined);
  assert.ok(ts.systems.h2o_lightning_4b_v141_image);
  const cats = withTs20(a.categories, ts);
  assert.equal(cats.systems[key].typesafe, undefined);
  assert.equal(cats.missing[key], 'not measured for this revision (temperature refit); ranked TS20 is on the @cc18ee33 row');
  const exceptions = read('../data/jevbench-breakdown-exceptions.json').entries.filter(e => e.key === key);
  assert.equal(exceptions.length, 1);
  assert.deepEqual(exceptions[0].dims, ['typesafe']);
  assert.equal(exceptions[0].decision, 'board #31072');
  assert.match(exceptions[0].reason, /Permanent/);
  const compare = readFileSync(new URL('../components/JevCompareV15.tsx', import.meta.url), 'utf8');
  assert.match(compare, /texts: cells.map\(\(v, i\).*cats.missing\[pair\[i\].key\]/);
  assert.match(compare, /const absent = pair.filter\(\(r\) => !categories!.systems\[r.key\]\?\.\[dim.key\]\)/);
});

test('CR-599: pinned provenance, full image coverage, refit disclosure and unchanged top-five addendum', () => {
  assert.match(row.repo, /d7f1b05aa0b4e789b3896116f309ef842440e260$/);
  assert.equal(row.licence, 'Apache-2.0');
  for (const text of ['temperature 1.0', 'MAX_LEN 40960', 'GPU_UTIL 0.70', '1,048,576', 'transformers 5.20.2', 'vLLM 0.30.0', '@b05cc29a', '1,500 of 1,500 answered', 'state_selection_items: 0 of 1,500', 'effort_log_match true', '12,210', '1,493', '3,961']) assert.ok(row.measurement_source.includes(text), text);
  assert.match(row.pricing_note, /USD 1.19 per GPU-hour/);
  assert.match(row.pricing_note, /USD 2.661 per hour/);
  const cov = read('../data/raw/benchmarks/jevbench/multimodal-preview/answered-coverage-v0.3.json').systems[key];
  assert.equal(cov.source.output_sha256, '1918cf93c071c43a921d0b7e1231683736826ba9e3e5ea5f2abee598e933642d');
  assert.equal(cov.source.public_score_sha256, row.source_sha256);
  for (const dim of ['capabilities', 'usecases']) {
    assert.equal(Object.values(a.categories.systems[key][dim]).reduce((n, c) => n + c[1], 0), 1500);
    for (const c of Object.values(cov.cells[dim])) assert.equal(c[0], c[1]);
  }
  const page = readFileSync(new URL('../components/ImageJevV03Page.tsx', import.meta.url), 'utf8');
  assert.match(page, /28 Oct 2026 addendum, unranked second read/);
  assert.match(page, /@d7f1b05a Capability 71.84, composite 68.51; @cc18ee33 Capability 66.16, composite 66.58 \(deltas \+5.68 and \+1.94 points\)/);
  assert.match(page, /all top-five lists unchanged/);
});
