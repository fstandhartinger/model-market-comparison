import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const release = JSON.parse(await read('../data/imagejev-v03.json'));
const KEY = 'drex_max';
const row = release.ranking.find((r) => r.key === KEY);

test('CR-530 Drex Max: official pass 1 via Nace AI /v1/systemone, paid fast-lane order, image form, transforms, latency and price basis disclosed', () => {
  assert.ok(row, `${KEY} present`);
  assert.equal(row.api_flag, true);
  assert.equal(row.kind, 'api');
  assert.equal(row.author, 'Nace AI');
  assert.equal(row.name, 'Drex Max (Nace AI)');
  assert.equal(row.licence, 'proprietary API');
  assert.equal(row.preview_feature, undefined);
  assert.match(row.inference_setting, /drex\.nace\.ai\/v1\/systemone/);
  assert.match(row.inference_setting, /model drex-max,/);
  assert.match(row.inference_setting, /top-level images array/);
  assert.match(row.inference_setting, /no fallback/);
  assert.match(row.measurement_source, /21 Oct 2026 \(21:03-21:18 UTC\)/);
  assert.match(row.measurement_source, /drex-max, which was reported on all 600 responses/);
  assert.match(row.measurement_source, /"Image 1"/);
  assert.match(row.measurement_source, /Drex has no image-resolution setting; it resizes images to at most 1,638,400 pixels itself/);
  assert.match(row.measurement_source, /600 of 600 answered \(HTTP 200\): no refusals, no errors/);
  assert.match(row.measurement_source, /18 of 600 images were transformed \(12 public, 6 sealed\)/);
  assert.match(row.measurement_source, /7 BMP files re-encoded losslessly as PNG/);
  assert.match(row.measurement_source, /11 PNG files over 2\.75 MiB re-encoded as JPEG quality 95/);
  assert.match(row.measurement_source, /no image was resized/);
  assert.match(row.measurement_source, /image treatment differs between rows/);
  assert.match(row.measurement_source, /one request at a time: median 0\.85 s, 95th percentile 1\.78 s; 158 of 600 requests took longer than 1\.233 s/);
  assert.match(row.measurement_source, /paid fast-lane evaluation order; published under the order's public-visibility setting/);
  assert.match(row.prior_exposure, /paid fast-lane order/);
  assert.match(row.pricing_note, /USD 0\.06 per 1M input tokens, output not billed/);
  assert.match(row.pricing_note, /actual charge is not known/);
  for (const t of ['core', 'all', 'computer-use']) assert.match(row.tracks[t].cost.source, /^Nace AI list price USD 0\.06 per 1M input tokens/);
  assert.equal(row.measurement_date_basis, 'Run timestamps: 21 Oct 2026, 21:03-21:18 UTC.');
  assert.equal(row.ranked, true);
  assert.equal(row.rank, 6);
  assert.equal(row.release_ready, true);
  assert.deepEqual(row.holds, []);
});

test('CR-530 Drex Max has aggregate-only category and answered-coverage cells; TypeSafe-20 cells were added by CR-531 and the temporary exception is gone', async () => {
  const cells = release.categories.systems[KEY];
  assert.equal(Object.keys(cells.capabilities).length, 14);
  assert.equal(Object.keys(cells.usecases).length, 5);
  assert.equal(Object.values(cells.usecases).reduce((n, c) => n + c[1], 0), 600);
  const coverage = JSON.parse(await read('../data/raw/benchmarks/jevbench/multimodal-preview/answered-coverage-v0.3.json'));
  assert.equal(coverage.systems[KEY].source.public_score_sha256, row.source_sha256);
  const ts20 = JSON.parse(await read('../data/imagejev-ts20-categories.json'));
  assert.equal(Object.keys(ts20.systems[KEY].typesafe).length, 20);
  assert.deepEqual(ts20.summary[KEY], { rows: 600, errors: 0 });
  const exceptions = JSON.parse(await read('../data/jevbench-breakdown-exceptions.json'));
  assert.ok(!exceptions.entries.some((e) => e.key === KEY));
});

test('CR-530 Drex Max scores: Capability, composite rank and the top-five effect', () => {
  const c = row.tracks.core;
  assert.ok(Math.abs(c.capability - 72.47) < 0.01);
  assert.ok(Math.abs(c.composite.score - 44.65) < 0.01);
  const e = release.capability_eligibility;
  assert.ok(c.cost.usd_per_1000 <= e.cost_usd_per_1000_cap && c.speed.adjusted_p50_s <= e.latency_p50_s_cap, 'inside the Capability cost and latency caps');
});

test('CR-530 revision history records the Drex Max addendum with the Capability top-five change', async () => {
  const page = await read('../components/ImageJevV03Page.tsx');
  assert.match(page, /21 Oct 2026 addendum, new row:<\/b> adds Drex Max/);
  assert.match(page, /paid fast-lane evaluation order, published under the order’s public-visibility setting/);
  assert.match(page, /The composite top five does not change: Drex Max ranks #6 by composite \(44\.6\)/);
  assert.match(page, /The Capability headline \(53 of 64 rows\) top five changes: Drex Max enters at #3/);
  assert.match(page, /TypeSafe-20 cells for this row were measured on 21 Oct 2026 on the 600 sealed items with 0 errors; the TypeSafe-20 bank had previously been exposed to 16 other API providers/);
});
