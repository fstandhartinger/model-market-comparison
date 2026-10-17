import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const release = JSON.parse(await read('../data/imagejev-v03.json'));
const KEY = 'celeris_1_decision';
const row = release.ranking.find((r) => r.key === KEY);

test('CR-500 Celeris-1 Decision: official pass 1 via Celeris /v1/systemone, paid fast-lane order, resolution, transforms and latency disclosed', () => {
  assert.ok(row, `${KEY} present`);
  assert.equal(row.api_flag, true);
  assert.equal(row.author, 'Celeris');
  assert.equal(row.name, 'Celeris-1 Decision (Celeris)');
  assert.equal(row.licence, 'proprietary API');
  assert.equal(row.preview_feature, undefined);
  assert.match(row.inference_setting, /inference\.celeris\.ai\/celeris-1-decision\/v1\/systemone/);
  assert.match(row.inference_setting, /model celeris-1-decision,/);
  assert.match(row.inference_setting, /x_celeris\.images data URL/);
  assert.match(row.inference_setting, /max_soft_tokens 280 \(documented default\)/);
  assert.match(row.inference_setting, /no fallback/);
  assert.match(row.measurement_source, /16 Oct 2026 \(20:12-20:26 UTC\)/);
  assert.match(row.measurement_source, /celeris-1-decision, which was reported on all 600 responses/);
  assert.match(row.measurement_source, /600 of 600 answered \(HTTP 200\): no refusals, no errors/);
  assert.match(row.measurement_source, /Celeris recommends 1120 for OCR, documents and small text; that setting was not used/);
  assert.match(row.measurement_source, /11 of 600 images were transformed/);
  assert.match(row.measurement_source, /no image was resized/);
  assert.match(row.measurement_source, /image treatment differs between rows/);
  assert.match(row.measurement_source, /one request at a time: median 0\.89 s, 95th percentile 1\.53 s; 131 of 600 requests took longer than 1\.233 s/);
  assert.match(row.measurement_source, /paid fast-lane evaluation order; published under the order's public-visibility setting/);
  assert.match(row.prior_exposure, /paid fast-lane order/);
  assert.match(row.pricing_note, /USD 0\.04 per 1M input tokens, output free/);
  assert.match(row.pricing_note, /actual charge is not known/);
  assert.match(row.tracks.core.cost.source, /^Celeris list price/);
  assert.equal(row.measurement_date_basis, 'Run timestamps: 16 Oct 2026, 20:12-20:26 UTC.');
  assert.equal(row.ranked, true);
  assert.equal(row.rank, 9); // #8 when added (CR-500); CR-506 (basal-omni-1.0-ultra) enters at #8
});

test('CR-500 Celeris-1 Decision has aggregate-only category, answered-coverage and TypeSafe-20 cells', async () => {
  const cells = release.categories.systems[KEY];
  assert.equal(Object.keys(cells.capabilities).length, 14);
  assert.equal(Object.keys(cells.usecases).length, 5);
  assert.equal(Object.values(cells.usecases).reduce((n, c) => n + c[1], 0), 600);
  const coverage = JSON.parse(await read('../data/raw/benchmarks/jevbench/multimodal-preview/answered-coverage-v0.3.json'));
  assert.equal(coverage.systems[KEY].source.public_score_sha256, row.source_sha256);
  const ts20 = JSON.parse(await read('../data/imagejev-ts20-categories.json'));
  assert.ok(ts20.systems[KEY].typesafe);
  assert.deepEqual(ts20.summary[KEY], { rows: 600, errors: 0 });
});

test('CR-500 revision history records the Celeris addendum with no top-five change', async () => {
  const page = await read('../components/ImageJevV03Page.tsx');
  assert.match(page, /16 Oct 2026 addendum, new row:<\/b> adds Celeris-1 Decision/);
  assert.match(page, /paid fast-lane evaluation order, published under the order’s public-visibility setting/);
  assert.match(page, /Neither top five changes: Celeris-1 Decision ranks #8 by composite and #15 in the Capability headline \(51 of 62 rows\)/);
  assert.match(page, /Celeris recommends max_soft_tokens 1120 for documents and small text; that setting was not used/);
});
