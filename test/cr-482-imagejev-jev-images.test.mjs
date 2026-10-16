import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const release = JSON.parse(await read('../data/imagejev-v03.json'));
const row = (key) => release.ranking.find((r) => r.key === key);
const KEYS = ['jev_1_13_images', 'jev_1_14_images'];

test('CR-482 Jev + images rows: official pass 1, TypeSafe API, preview feature disclosed', () => {
  for (const key of KEYS) {
    const r = row(key);
    assert.ok(r, `${key} present`);
    assert.equal(r.api_flag, true);
    assert.equal(r.author, 'TypeSafe');
    assert.equal(r.preview_feature, true);
    // the chart labels cut a name at " (", so the preview marker must sit before the author in parentheses
    assert.match(r.name, /^Jev 1\.1[34]\.0 \+ images, preview \(TypeSafe\)$/);
    // the preview note leads the measurement note shown on the board and the detail page
    assert.match(r.measurement_source, /^Preview feature: TypeSafe documents image input as "Dreamer-ready"/);
    assert.match(r.measurement_source, /179 of the 600 images/);
    assert.match(r.measurement_source, /image treatment differs between rows/);
    assert.match(r.pricing_note, /USD 0\.042 per 1M input tokens/);
    assert.equal(r.tracks.core.n_public + r.tracks.core.n_sealed > 400, true);
    assert.equal(r.ranked, true);
  }
  assert.match(row('jev_1_13_images').measurement_source, /599 of 600 answered/);
  assert.match(row('jev_1_14_images').measurement_source, /598 of 600 answered/);
  assert.match(row('jev_1_14_images').measurement_source, /earlier Jev 1\.14\.0 attempt was invalidated/);
  assert.doesNotMatch(JSON.stringify(release.ranking.map((r) => r.measurement_source)), /jev114-img-1/);
});

test('CR-482 cost reference is Jev with images; both top fives are the reviewed ones (CR-496: + Sage 1.4 + images; CR-XXX: + kettei-fat, kettei-chub)', () => {
  const e = release.capability_eligibility;
  const jev14 = row('jev_1_14_images').tracks.core.cost.usd_per_1000;
  assert.equal(row('jev_1_13_images').tracks.core.cost.usd_per_1000, jev14, 'both Jev + images rows share one price');
  assert.equal(e.cost_reference, 'jev-1.14.0 + images');
  assert.equal(e.cost_reference_usd_per_1000, jev14);
  assert.equal(e.cost_usd_per_1000_cap, 2 * jev14, 'cost cap = 2x the Jev-with-images price (Florian, 15 Oct 2026)');
  // the latency reference stays Jev 1.13.0 text (v1.5.4): unchanged cap, so Wity-1 and the GPT Lunas still miss it
  assert.equal(e.latency_p50_s_cap, 1.2329566404223442);
  assert.equal(e.anchor, 'jev-1.13.0');
  for (const key of KEYS) assert.ok(row(key).tracks.core.cost.usd_per_1000 <= e.cost_usd_per_1000_cap, `${key} is inside the cost cap it defines`);
  const composite = release.ranking.filter((r) => r.ranked).sort((a, b) => a.rank - b.rank).slice(0, 5).map((r) => r.key);
  assert.deepEqual(composite, ['kettei_fat', 'wity_1', 'imajev_4b', 'kettei_chub', 'sage_1_4_images']); // CR-XXX (kettei): kettei-fat #1 on the billed cost basis (#5 on the tokens-read basis; disclosed in the row note and addendum)
  const inCap = (r) => r.ranked && r.tracks.core.cost.usd_per_1000 != null && r.tracks.core.cost.usd_per_1000 <= e.cost_usd_per_1000_cap
    && r.tracks.core.speed.adjusted_p50_s <= e.latency_p50_s_cap;
  const capped = release.ranking.filter(inCap).sort((a, b) => b.tracks.core.capability - a.tracks.core.capability);
  assert.deepEqual(capped.slice(0, 5).map((r) => r.key),
    ['kettei_fat', 'sage_1_4_images', 'jev_1_13_images', 'kushal_gemma4_31b_it_autoloops', 'imajev_4b']); // CR-XXX (kettei): kettei-fat enters at #1, 0.1 pp ahead of Sage 1.4 + images (Sage would be #7 if its 80 abstentions were scored wrong; disclosed in the row note)
  assert.equal(capped.length, 50); // CR-XXX (kettei): + kettei-fat, kettei-chub
  // Wity-1 and the GPT Lunas stay out on latency, not cost
  for (const key of ['wity_1', 'gpt6_luna', 'gpt56_luna']) assert.ok(row(key).tracks.core.speed.adjusted_p50_s > e.latency_p50_s_cap, key);
  assert.match(e.rationale, /Jev would otherwise be excluded from its own headline/);
});

test('CR-482 the page tags the preview rows and keeps the Jev reference wording honest', async () => {
  const page = await read('../components/ImageJevV03Page.tsx');
  assert.match(page, /data-bh-imagejev-preview-tag/);
  assert.match(page, /data-bh-imagejev-preview-note/);
  assert.match(page, /Dreamer-ready/);
  assert.match(page, /15 Oct 2026 addendum/);
  assert.doesNotMatch(page, /native API accepts text only/);
  assert.match(page, /Jev reference.{0,40}has two frozen parts/);
});

test('CR-482 every Jev + images row has aggregate-only category cells for all image types and use cases', () => {
  for (const key of KEYS) {
    const cells = release.categories.systems[key];
    assert.equal(Object.keys(cells.capabilities).length, 14);
    assert.equal(Object.keys(cells.usecases).length, 5);
    const total = Object.values(cells.usecases).reduce((n, c) => n + c[1], 0);
    assert.equal(total, 600);
  }
});

test('CR-482 System1 s1-vision is no longer an ImageJevBench row anywhere in the published data (own offering, Florian 15 Oct 2026)', async () => {
  assert.equal(row('s1-vision'), undefined);
  assert.equal(release.categories.systems['s1-vision'], undefined);
  const coverage = JSON.parse(await read('../data/raw/benchmarks/jevbench/multimodal-preview/answered-coverage-v0.3.json'));
  assert.equal(coverage.systems['s1-vision'], undefined);
  const ts20 = JSON.parse(await read('../data/imagejev-ts20-categories.json'));
  assert.equal(ts20.systems['s1-vision'], undefined);
  assert.equal(ts20.summary['s1-vision'], undefined);
  assert.ok(!/s1-vision|System1 s1|Blink/.test(JSON.stringify(release)), 'no mention of the removed row in the published data');
  assert.equal(release.ranking.length, 61); // CR-XXX (kettei): + kettei-fat, kettei-chub; CR-496: + Sage 1.4 + images
});
