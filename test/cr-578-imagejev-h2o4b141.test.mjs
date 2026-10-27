import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = async (p) => JSON.parse(await readFile(new URL(p, import.meta.url), 'utf8'));
const release = await read('../data/imagejev-v03.json');
const key = 'h2o_lightning_4b_v141_image';
const row = release.ranking.find((r) => r.key === key);

test('CR-578 H2O-4B v1.4.1: pinned official GPU row discloses version, engine, image cap, timing and cost basis', () => {
  assert.equal(row.name, 'H2O-Lightning-4B v1.4.1 (image)');
  assert.equal(row.kind, 'gpu');
  assert.equal(row.api_flag, false);
  assert.equal(row.licence, 'Apache-2.0');
  assert.equal(row.open, true);
  assert.match(row.repo, /cc18ee330e6895c41b9a60f37a0dd122dc4c3461$/);
  assert.match(row.measurement_source, /base Qwen\/Qwen3.5-4B/);
  assert.match(row.measurement_source, /1,500 of 1,500 answered, no inference errors/);
  assert.match(row.measurement_source, /serve_config.json/);
  assert.match(row.measurement_source, /MAX_LEN 40960, GPU_UTIL 0.70/);
  assert.match(row.measurement_source, /h2oai\/vllm @b05cc29a/);
  assert.match(row.measurement_source, /1,048,576/);
  assert.match(row.measurement_source, /same per-request cap as the earlier H2O-Lightning-4B image row/);
  assert.doesNotMatch(row.measurement_source, /serving fallback/);
  assert.match(row.measurement_source, /base64/);
  assert.match(row.measurement_source, /wall clock of each loopback request/);
  assert.match(row.measurement_source, /TypeSafe-20 was not run in this pod session/);
  assert.match(row.pricing_note, /USD 1.19 per GPU-hour/);
  assert.match(row.pricing_note, /USD 2.635 per hour/);
  assert.equal(row.tracks.core.cost.source, 'measured GPU seconds x $1.19/GPU-hour');
  assert.equal(row.tracks.core.failures, 0);
  assert.deepEqual(row.holds, []);
  // the earlier v1.1 row stays on the board
  assert.equal(release.ranking.find((r) => r.key === 'h2o_lightning_4b_image').name, 'H2O-Lightning-4B (image)');
});

test('CR-578 H2O-4B v1.4.1: full image/use-case coverage is bound to the official output; TS20 cells are measured and the temporary exception is removed', async () => {
  const cats = release.categories.systems[key];
  assert.equal(Object.keys(cats.capabilities).length, 14);
  assert.equal(Object.keys(cats.usecases).length, 5);
  const coverage = (await read('../data/raw/benchmarks/jevbench/multimodal-preview/answered-coverage-v0.3.json')).systems[key];
  for (const dim of ['capabilities', 'usecases']) {
    assert.equal(Object.values(cats[dim]).reduce((n, c) => n + c[1], 0), 1500);
    for (const cell of Object.values(coverage.cells[dim])) assert.equal(cell[0], cell[1]);
  }
  assert.equal(coverage.source.output_sha256, '1350387a12fc22a234654cbd6fde401a45ccd7a81538db339e5c541a73ae050f');
  assert.equal(coverage.source.public_score_sha256, row.source_sha256);
  const ts20 = await read('../data/imagejev-ts20-categories.json');
  assert.equal(Object.keys(ts20.systems[key].typesafe).length, 20);
  assert.deepEqual(ts20.summary[key], { rows: 600, errors: 0 });
  const ex = (await read('../data/jevbench-breakdown-exceptions.json')).entries.filter((x) => x.key === key);
  assert.equal(ex.length, 0);
});

test('CR-578 H2O-4B v1.4.1: scores, composite top-five change and unchanged capped Capability top five are explicit', async () => {
  const c = row.tracks.core;
  assert.ok(Math.abs(c.capability - 66.15780162629164) < 1e-9);
  assert.ok(Math.abs(c.composite.score - 66.57682418099431) < 1e-9);
  assert.equal(row.rank, 3);
  assert.ok(Math.abs(c.cost.usd_per_1000 - 0.028574540528741414) < 1e-12);
  assert.ok(Math.abs(c.speed.raw_p50_s - 0.08696616150001546) < 1e-12);
  const e = release.capability_eligibility;
  const capped = release.ranking.filter((r) => r.ranked && r.tracks.core.cost.usd_per_1000 <= e.cost_usd_per_1000_cap && r.tracks.core.speed.adjusted_p50_s <= e.latency_p50_s_cap).sort((a, b) => b.tracks.core.capability - a.tracks.core.capability);
  assert.equal(capped.length, 55);
  assert.equal(capped.findIndex((r) => r.key === key) + 1, 10);
  assert.deepEqual(capped.slice(0, 5).map((r) => r.key), ['h2o_lightning_31b_image', 'kettei_fat', 'sage_1_4_images', 'drex_max', 'jev_1_13_images']);
  const page = await readFile(new URL('../components/ImageJevV03Page.tsx', import.meta.url), 'utf8');
  assert.match(page, /27 Oct 2026 addendum, new row:<\/b> adds H2O-Lightning-4B v1.4.1 \(image\)/);
  assert.match(page, /TypeSafe-20 cells for this row were measured on 27 Oct 2026 on the 600 sealed items with 0 errors; the TypeSafe-20 bank had previously been exposed to API providers/);
  assert.match(page, /The composite top five changes: H2O-Lightning-4B v1.4.1 enters at #3 \(66.58\)/);
  assert.match(page, /The capped Capability headline \(55 of 66 rows\) keeps its top five/);
});
