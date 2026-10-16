import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const release = JSON.parse(await read('../data/imagejev-v03.json'));
const row = (key) => release.ranking.find((r) => r.key === key);
const ROWS = [
  { key: 'kettei_fat', name: 'kettei-fat (Sqwish)', model: 'kettei-fat', window: '17:24-17:34 UTC', price: /USD 0\.06 per 1M input tokens/, rank: 1 },
  { key: 'kettei_chub', name: 'kettei-chub (Sqwish)', model: 'kettei-chub', window: '17:35-17:43 UTC', price: /USD 0\.04 per 1M input tokens/, rank: 4 },
];

for (const R of ROWS) {
  test(`CR-497 ${R.name}: official pass 1 via Sqwish /v1/systemone, paid fast-lane order, served model and transforms disclosed`, () => {
    const r = row(R.key);
    assert.ok(r, `${R.key} present`);
    assert.equal(r.api_flag, true);
    assert.equal(r.author, 'Sqwish');
    assert.equal(r.name, R.name);
    assert.equal(r.licence, 'proprietary API');
    assert.equal(r.preview_feature, undefined);
    assert.match(r.inference_setting, /api\.sqwish\.ai\/v1\/systemone/);
    assert.match(r.inference_setting, new RegExp(`model ${R.model},`));
    assert.match(r.inference_setting, /no fallback/);
    assert.match(r.measurement_source, new RegExp(`16 Oct 2026 \\(${R.window}\\)`));
    assert.match(r.measurement_source, new RegExp(`${R.model} was reported on all 600 responses`));
    assert.match(r.measurement_source, /600 of 600 answered \(HTTP 200\): no refusals, no errors/);
    assert.match(r.measurement_source, /7 of 600 images were transformed/);
    assert.match(r.measurement_source, /image treatment differs between rows/);
    assert.match(r.measurement_source, /one request at a time/);
    assert.match(r.measurement_source, /paid fast-lane evaluation order; published under the order's public-visibility setting/);
    assert.match(r.measurement_source, /Cost counts the 64 tokens Sqwish bills per image; on the about 1,400 tokens the model reads per item \(text plus about 1,310 image tokens\) the composite would be 45\.4 \(kettei-fat, #5\) and 50\.2 \(kettei-chub, #3\)/); // critic K1 (rendered on the detail page)
    assert.match(r.measurement_source, /pricing page says you pay for what OneHot reads, while its images page bills each image as 64 input tokens/); // critic K3
    assert.match(r.prior_exposure, /paid fast-lane order/);
    assert.match(r.pricing_note, R.price);
    assert.match(r.pricing_note, /charged USD 0/);
    // critic K1/K3: cost-basis sensitivity and the two Sqwish wordings
    assert.match(r.pricing_note, /Cost counts the 64 tokens Sqwish bills per image; on the about 1,400 tokens the model reads per item \(text plus about 1,310 image tokens\) the composite would be 45\.4 \(kettei-fat, #5\) and 50\.2 \(kettei-chub, #3\)\./);
    assert.match(r.pricing_note, /pricing page says you pay for what OneHot reads, while its images page bills each image as 64 input tokens/);
    assert.match(r.tracks.core.cost.source, /^Sqwish list price/);
    assert.equal(r.measurement_date_basis, `Run timestamps: 16 Oct 2026, ${R.window}.`);
    assert.equal(r.ranked, true);
    assert.equal(r.rank, R.rank);
  });

  test(`CR-497 ${R.name} has aggregate-only category, answered-coverage and TypeSafe-20 cells`, async () => {
    const cells = release.categories.systems[R.key];
    assert.equal(Object.keys(cells.capabilities).length, 14);
    assert.equal(Object.keys(cells.usecases).length, 5);
    assert.equal(Object.values(cells.usecases).reduce((n, c) => n + c[1], 0), 600);
    const coverage = JSON.parse(await read('../data/raw/benchmarks/jevbench/multimodal-preview/answered-coverage-v0.3.json'));
    assert.equal(coverage.systems[R.key].source.public_score_sha256, row(R.key).source_sha256);
    const ts20 = JSON.parse(await read('../data/imagejev-ts20-categories.json'));
    assert.ok(ts20.systems[R.key].typesafe);
    assert.deepEqual(ts20.summary[R.key], { rows: 600, errors: 0 });
  });
}

test('CR-497 revision history records the kettei addendum and both top-five changes', async () => {
  const page = await read('../components/ImageJevV03Page.tsx');
  assert.match(page, /16 Oct 2026 addendum, two new rows:<\/b> adds kettei-fat and kettei-chub/);
  assert.match(page, /paid fast-lane evaluation orders, published under the orders’ public-visibility setting/);
  assert.match(page, /Capability headline \(50 of 61 rows\) kettei-fat, Sage 1\.4 \+ images/);
  // critic K1/K2/K3
  assert.match(page, /kettei-fat&apos;s composite #1 depends on the cost basis: cost counts the 64 tokens Sqwish bills per image; on the about 1,400 tokens the model reads per item \(text plus about 1,310 image tokens\) the composite would be 45\.4 \(kettei-fat, #5\) and 50\.2 \(kettei-chub, #3\), and Wity-1 would lead\./);
  assert.match(page, /kettei-fat leads Sage 1\.4 \+ images by only 0\.1 pp \(75\.95 vs 75\.85\)/);
  assert.match(page, /pricing page says you pay for what OneHot reads/);
});
