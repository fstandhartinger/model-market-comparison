import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { formatMatchedGapPp, readMultimodalPreview, validatePreviewTracks } from '../lib/jevbench-multimodal-preview.mjs';

const expectedRanking = [
  'Mapika decider-2b-vision BF16',
  'Reflex 4B (released stable configuration)',
  'Jev-Omni',
  'Kushal Patil — Gemma 4 31B IT (Autoloops)',
  'djev-spark NVFP4',
  'djev-dev BF16',
  'Bonsai-2-27B v2 PQ2_0 + Q8_0 MMProj',
  'GPT-6 Luna (low reasoning effort)',
  'GPT-5.6 Luna',
  'Gemini 3.1 Flash Lite',
  'Gemini 3.8 Flash',
  'OpenJev 4B NLI v2 (official image-premise path)',
];

function forbiddenItemFields(value) {
  const forbidden = new Set(['token', 'question', 'prompt', 'gold', 'answer_index', 'prediction', 'image_url']);
  if (Array.isArray(value)) return value.flatMap(forbiddenItemFields);
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, child]) => forbidden.has(key) ? [key] : forbiddenItemFields(child));
}

function longArrays(value, path = 'root') {
  if (Array.isArray(value)) {
    return [ ...(value.length >= 50 ? [path] : []), ...value.flatMap((item, index) => longArrays(item, `${path}[${index}]`)) ];
  }
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, child]) => longArrays(child, `${path}.${key}`));
}

test('Image JevBench v0.1 preview retains aggregate split, exact roster and Jev-Omni metrics', async () => {
  const a = await readMultimodalPreview();
  assert.equal(a.benchmark, 'Image JevBench v0.1 candidate');
  assert.equal(a.sealed_item_details_included, false);
  assert.deepEqual([a.split.items_total, a.split.items_public, a.split.items_sealed], [444, 228, 216]);
  assert.deepEqual([a.split.licensed_core_total, a.split.licensed_core_public, a.split.licensed_core_sealed], [294, 139, 155]);
  assert.deepEqual([a.split.everyday_photo_total, a.split.everyday_photo_public, a.split.everyday_photo_sealed], [150, 89, 61]);
  assert.equal(a.split.synthetic_total, 150);
  assert.ok(Math.abs(a.split.synthetic_share_percent - 33.78378378) < 0.001);
  const familyRows = Object.entries(a.split.family_counts);
  assert.equal(familyRows.reduce((sum, [, counts]) => sum + counts.public, 0), a.split.items_public);
  assert.equal(familyRows.reduce((sum, [, counts]) => sum + counts.sealed, 0), a.split.items_sealed);
  const coreFamilies = familyRows.filter(([family]) => family !== 'Everyday photo');
  assert.deepEqual(coreFamilies.reduce((totals, [, counts]) => ({ public: totals.public + counts.public, sealed: totals.sealed + counts.sealed }), { public: 0, sealed: 0 }), { public: 139, sealed: 155 });
  assert.deepEqual(a.weights, { public: 0.35, sealed: 0.65 });
  assert.equal(a.gap_allowance_pp, 15);
  assert.equal(a.n_systems, 12);
  assert.deepEqual(a.ranking.map((s) => s.name), expectedRanking);
  assert.deepEqual(a.ranking.slice(0, 5).map((s) => s.name), expectedRanking.slice(0, 5));
  assert.equal(a.ranking.filter((s) => s.api_flag).length, 5);
  assert.ok(a.ranking.every((s, i) => s.rank === i + 1));
  assert.ok(a.ranking.every((s) => s.tracks.all.public.n === 228 && s.tracks.all.sealed.n === 216));
  assert.ok(a.ranking.every((s) => s.tracks.core.public.n === 139 && s.tracks.core.sealed.n === 155));
  assert.ok(a.ranking.every((s) => s.tracks.everyday_photo.public.n === 89 && s.tracks.everyday_photo.sealed.n === 61));
  assert.ok(a.ranking.every((s) => ['all', 'core', 'everyday_photo'].every((track) => Number.isFinite(s.tracks[track].penalty_multiplier))));

  const jevOmni = a.ranking.find((s) => s.key === 'jev_omni');
  assert.ok(jevOmni);
  assert.equal(jevOmni.api_flag, false);
  assert.ok(Math.abs(jevOmni.score - 55.627382518052855) < 0.005);
  assert.deepEqual([jevOmni.tracks.all.public.n, jevOmni.tracks.all.public.correct], [228, 153]);
  assert.deepEqual([jevOmni.tracks.all.sealed.n, jevOmni.tracks.all.sealed.correct], [216, 128]);
  for (const [axis, expected] of Object.entries({ intelligence: 46.25259078796315, calibration: 83.44405529116375, speed: 89.94839872362184, cost: 59.48707347669823 })) {
    assert.ok(Math.abs(jevOmni.tracks.all.axes[axis] - expected) < 0.005, axis);
  }
  assert.equal(jevOmni.tracks.all.public.probability_coverage, 1);
  assert.equal(jevOmni.tracks.all.sealed.probability_coverage, 1);
  assert.equal(jevOmni.tracks.all.cost.source, 'measured GPU seconds x $1.29/GPU-hour');

  const spark = a.ranking.find((s) => s.key === 'djev_spark_nvfp4');
  assert.deepEqual([spark.tracks.everyday_photo.sealed.correct, spark.tracks.everyday_photo.sealed.n], [53, 61]);
  assert.deepEqual([a.preview_tracks.computer_use.items_total, a.preview_tracks.computer_use.public, a.preview_tracks.computer_use.sealed], [400, 147, 253]);
  assert.deepEqual([a.preview_tracks.browser_use.items_total, a.preview_tracks.browser_use.public, a.preview_tracks.browser_use.sealed], [400, 240, 160]);
  assert.deepEqual(a.preview_tracks.computer_use.public_decision_types, ['target location', 'element type', 'next action class']);
  assert.deepEqual(a.preview_tracks.computer_use.sealed_decision_types, ['task completion', 'action success', 'dialog safety', 'blocker status']);
  assert.equal(a.preview_tracks.computer_use.sealed_origin, 'original synthetic local fixtures');
  assert.equal(a.preview_tracks.browser_use.mind2web_public_only, 133);
  assert.match(a.preview_tracks.cross_track_rule, /shares a source row or screenshot with a sealed core item is sealed too/);
  assert.match(a.preview_tracks.kev_flag, /Mind2Web/);
  assert.deepEqual(forbiddenItemFields(a), []);
  assert.deepEqual(longArrays(a), []);
});

test('preview tracks validator rejects missing or changed counts', async () => {
  const a = await readMultimodalPreview();
  assert.equal(validatePreviewTracks(a.preview_tracks), a.preview_tracks);
  const missing = structuredClone(a.preview_tracks);
  delete missing.computer_use;
  assert.throws(() => validatePreviewTracks(missing), /Invalid computer_use preview track counts/);
  const changed = structuredClone(a.preview_tracks);
  changed.browser_use.sealed = 159;
  assert.throws(() => validatePreviewTracks(changed), /Invalid browser_use preview track counts/);
});

test('matched gap formatting removes negative zero', () => {
  assert.equal(formatMatchedGapPp(-0.04), '0.0 pp');
  assert.equal(formatMatchedGapPp(-0), '0.0 pp');
  assert.equal(formatMatchedGapPp(0.04), '0.0 pp');
  assert.equal(formatMatchedGapPp(0.15), '+0.1 pp');
  assert.equal(formatMatchedGapPp(-0.15), '-0.1 pp');
});

test('preview stays noindex, unlinked, and uses only aggregate candidate content', async () => {
  const [page, data, nav, sitemap, builder] = await Promise.all([
    readFile(new URL('../app/jev-models/multimodal-preview/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../data/raw/benchmarks/jevbench/multimodal-preview/preview.json', import.meta.url), 'utf8'),
    readFile(new URL('../components/Nav.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/sitemap.ts', import.meta.url), 'utf8'),
    readFile(new URL('../scripts/build-jevbench-multimodal-preview.mjs', import.meta.url), 'utf8'),
  ]);
  assert.match(page, /robots: \{ index: false, follow: false/);
  assert.match(page, /not part of the JevBench Score/);
  assert.match(page, /Current top five by candidate composite/);
  assert.match(page, /Split/);
  assert.match(page, /Computer Use and Browser Use tracks \(preview\)/);
  assert.ok(page.indexOf('id="split-heading"') < page.indexOf('id="preview-tracks-heading"'));
  assert.match(page, /Not measured yet — no scores\./);
  assert.match(page, /a\.preview_tracks\.cross_track_rule/);
  assert.match(page, /a\.preview_tracks\.kev_flag/);
  assert.match(page, /formatMatchedGapPp\(t\.matched_gap_pp\)/);
  assert.match(page, /Gap \(matched\)/);
  assert.match(page, /t\.penalty_multiplier\.toFixed\(3\)/);
  assert.doesNotMatch(page, /80% public|25 points/);
  assert.match(page, /data-bh-djev-spark-sealed-photo/);
  assert.match(page, /<ImageJevExamples\s*\/>/);
  assert.doesNotMatch(page, /a\.examples/);
  assert.doesNotMatch(nav, /multimodal-preview/);
  assert.doesNotMatch(sitemap, /multimodal-preview/);
  assert.match(builder, /preview\.legacy-candidate\.json/);
  assert.doesNotMatch(builder, /multimodal-preview\/preview\.json/);
  const artifact = JSON.parse(data);
  assert.equal(artifact.sealed_item_details_included, false);
  assert.deepEqual(forbiddenItemFields(artifact), []);
  assert.deepEqual(longArrays(artifact), []);
});
