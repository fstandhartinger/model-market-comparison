import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = async (p) => JSON.parse(await readFile(new URL(p, import.meta.url), 'utf8'));
const release = await read('../data/imagejev-v03.json');
const key = 'h2o_lightning_31b_image';
const row = release.ranking.find((r) => r.key === key);

test('CR-536 H2O-31B: pinned official GPU row discloses licence, engine, timing and cost basis', () => {
  assert.equal(row.name, 'H2O-Lightning-31B (image)');
  assert.equal(row.kind, 'gpu');
  assert.equal(row.api_flag, false);
  assert.equal(row.licence, 'H2O Model Non-Commercial Licence v1.1');
  assert.equal(row.open, true);
  assert.match(row.repo, /ca6e6f6e8e08e2d21c8c9f45261e05444626647a$/);
  assert.match(row.inference_setting, /custom vLLM 0.30.0 build, one-engine profile, FP8/);
  assert.match(row.measurement_source, /1,500 of 1,500 answered, no inference errors, no retries/);
  assert.match(row.measurement_source, /base google\/gemma-4-31B-it/);
  assert.match(row.measurement_source, /reads each image once at a 560-token budget; its image re-read is disabled/);
  assert.match(row.measurement_source, /wall clock of each loopback request/);
  assert.match(row.pricing_note, /USD 1.19 per GPU-hour/);
  assert.match(row.pricing_note, /USD 2.5354931506849314 per hour/);
  assert.match(row.pricing_note, /non-production use only/);
  assert.equal(row.tracks.core.cost.source, 'measured GPU seconds x $1.19/GPU-hour');
  assert.equal(row.tracks.core.failures, 0);
  assert.deepEqual(row.holds, []);
});

test('CR-536 H2O-31B: full image/use-case coverage is bound to the official output; TS20 is explicitly pending', async () => {
  const cats = release.categories.systems[key];
  assert.equal(Object.keys(cats.capabilities).length, 14);
  assert.equal(Object.keys(cats.usecases).length, 5);
  const coverage = (await read('../data/raw/benchmarks/jevbench/multimodal-preview/answered-coverage-v0.3.json')).systems[key];
  for (const dim of ['capabilities', 'usecases']) {
    assert.equal(Object.values(cats[dim]).reduce((n, c) => n + c[1], 0), 1500);
    for (const cell of Object.values(coverage.cells[dim])) assert.equal(cell[0], cell[1]);
  }
  assert.equal(coverage.source.output_sha256, '4f6ca17c14094444fc46a9f99f5d6245738e1d67e375b3d7c02c617ab83b4cbe');
  assert.equal(coverage.source.public_score_sha256, row.source_sha256);
  assert.equal((await read('../data/imagejev-ts20-categories.json')).systems[key], undefined);
  const ex = (await read('../data/jevbench-breakdown-exceptions.json')).entries.find((x) => x.board === 'imagejevbench' && x.key === key);
  assert.deepEqual(ex.dims, ['typesafe']);
  assert.match(ex.reason, /^TEMPORARY:/);
  assert.match(ex.decision, /board #\d+/);
});

test('CR-536 H2O-31B: both paid public top-five changes and capped Capability eligibility are explicit', async () => {
  const c = row.tracks.core;
  assert.ok(Math.abs(c.capability - 80.87514534412216) < 1e-9);
  assert.ok(Math.abs(c.composite.score - 51.223777781083754) < 1e-9);
  assert.equal(row.rank, 5);
  assert.ok(Math.abs(c.cost.usd_per_1000 - 0.07527457930166843) < 1e-12);
  assert.ok(Math.abs(c.speed.raw_p50_s - 0.2188372124999205) < 1e-12);
  const e = release.capability_eligibility;
  const capped = release.ranking.filter((r) => r.ranked && r.tracks.core.cost.usd_per_1000 <= e.cost_usd_per_1000_cap && r.tracks.core.speed.adjusted_p50_s <= e.latency_p50_s_cap).sort((a,b) => b.tracks.core.capability - a.tracks.core.capability);
  assert.equal(capped.length, 54);
  assert.equal(capped[0].key, key);
  const page = await readFile(new URL('../components/ImageJevV03Page.tsx', import.meta.url), 'utf8');
  assert.match(page, /22 Oct 2026 addendum, new row:<\/b> adds H2O-Lightning-31B/);
  assert.match(page, /Both top fives change: H2O-Lightning-31B enters at #5 by composite/);
  assert.match(page, /H2O-Lightning-31B enters at #1 \(80.88\)/);
});
