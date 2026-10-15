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
    assert.match(r.name, /\+ images/);
    assert.match(r.name, /preview/);
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

test('CR-482 Jev + images rows sit outside the capped Capability headline and leave the top five unchanged', () => {
  const cap = release.capability_eligibility;
  for (const key of KEYS) {
    const core = row(key).tracks.core;
    assert.ok(core.cost.usd_per_1000 > cap.cost_usd_per_1000_cap, `${key} is above the frozen cost cap`);
    assert.ok(row(key).rank > 5, `${key} is not in the composite top five`);
  }
  const top = release.ranking.filter((r) => r.ranked).sort((a, b) => a.rank - b.rank).slice(0, 5).map((r) => r.key);
  assert.deepEqual(top, ['wity_1', 'imajev_4b', 'surogate_rune_26b_v3', 'kushal_gemma4_31b_it_autoloops', 'imajev_9b']);
  const capped = release.ranking.filter((r) => r.ranked && r.tracks.core.cost.usd_per_1000 <= cap.cost_usd_per_1000_cap && r.tracks.core.speed.adjusted_p50_s <= cap.latency_p50_s_cap)
    .sort((a, b) => b.tracks.core.capability - a.tracks.core.capability).slice(0, 5).map((r) => r.key);
  assert.ok(!capped.some((k) => KEYS.includes(k)));
});

test('CR-482 the page tags the preview rows and keeps the Jev reference wording honest', async () => {
  const page = await read('../components/ImageJevV03Page.tsx');
  assert.match(page, /data-bh-imagejev-preview-tag/);
  assert.match(page, /data-bh-imagejev-preview-note/);
  assert.match(page, /Dreamer-ready/);
  assert.match(page, /15 Oct 2026 addendum/);
  assert.doesNotMatch(page, /native API accepts text only/);
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
