import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { formatMatchedGapPp, readMultimodalPreview, validatePreviewTracks } from '../lib/jevbench-multimodal-preview.mjs';

const expectedRanking = [
  'Jev-Omni',
  'Mapika decider-2b-vision BF16',
  'Reflex 4B (released stable configuration)',
  'djev-spark NVFP4',
  'Autoloops – Gemma 4 31B IT',
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

test('Image JevBench v0.1 preview retains aggregate clean split, exact roster and Jev-Omni metrics', async () => {
  const a = await readMultimodalPreview();
  assert.equal(a.benchmark, 'Image JevBench v0.1 candidate');
  assert.equal(a.revision, 'v0.1-clean-split-20260925');
  assert.equal(a.sealed_item_details_included, false);
  assert.equal(a.split_sha256, '4cb721cd36c4fbe4320ec1d5420f56bedd82e060c2c634b3fe7c420353d51224');
  assert.equal(a.method_sha256, 'e7eaa2acffb7fd9655480311b96feafd528f112452fcebb170e48ceeacd555a3');
  assert.deepEqual([a.split.items_total, a.split.items_public, a.split.items_sealed, a.split.items_retired], [684, 228, 456, 93]);
  assert.deepEqual([a.split.kept_sealed, a.split.fresh_sealed], [123, 333]);
  assert.equal(a.split.disposition.status, 'compliant');
  assert.deepEqual([a.split.core_total, a.split.core_public, a.split.core_sealed], [500, 139, 361]);
  assert.deepEqual([a.split.licensed_core_total, a.split.licensed_core_public, a.split.licensed_core_sealed, a.split.pool_core_sealed], [201, 139, 62, 299]);
  assert.deepEqual([a.split.everyday_photo_total, a.split.everyday_photo_public, a.split.everyday_photo_sealed, a.split.everyday_photo_sealed_fresh], [184, 89, 95, 34]);
  assert.equal(a.split.synthetic_total, 483);
  assert.ok(Math.abs(a.split.synthetic_share_percent - 70.61403509) < 0.001);
  const familyRows = Object.entries(a.split.family_counts);
  assert.equal(familyRows.reduce((sum, [, counts]) => sum + counts.public, 0), a.split.items_public);
  assert.equal(familyRows.reduce((sum, [, counts]) => sum + counts.sealed, 0), a.split.items_sealed);
  assert.equal(familyRows.reduce((sum, [, counts]) => sum + counts.retired, 0), a.split.items_retired);
  assert.deepEqual([a.split.family_counts.ScreenSpot.retired, a.split.family_counts['ScreenSpot-Pro'].retired, a.split.family_counts['Android-in-the-Wild (AITW_Single mirror)'].retired], [45, 31, 17]);
  const coreFamilies = familyRows.filter(([family]) => family !== 'Everyday photo');
  assert.deepEqual(coreFamilies.reduce((totals, [, counts]) => ({ public: totals.public + counts.public, sealed: totals.sealed + counts.sealed }), { public: 0, sealed: 0 }), { public: 139, sealed: 361 });
  assert.match(a.method.difficulty_caveat, /easier for frontier API models/);
  assert.deepEqual(a.weights, { public: 0.35, sealed: 0.65 });
  assert.equal(a.gap_allowance_pp, 15);
  assert.equal(a.n_systems, 12);
  assert.deepEqual(a.ranking.map((s) => s.name), expectedRanking);
  assert.deepEqual(a.ranking.slice(0, 5).map((s) => s.name), expectedRanking.slice(0, 5));
  assert.equal(a.ranking.filter((s) => s.api_flag).length, 5);
  assert.ok(a.ranking.every((s, i) => s.rank === i + 1));
  assert.ok(a.ranking.every((s) => s.tracks.all.public.n === 228 && s.tracks.all.sealed.n === 456));
  assert.ok(a.ranking.every((s) => s.tracks.core.public.n === 139 && s.tracks.core.sealed.n === 361));
  assert.ok(a.ranking.every((s) => s.tracks.everyday_photo.public.n === 89 && s.tracks.everyday_photo.sealed.n === 95));
  assert.ok(a.ranking.every((s) => ['all', 'core', 'everyday_photo'].every((track) => Number.isFinite(s.tracks[track].penalty_multiplier))));

  const jevOmni = a.ranking.find((s) => s.key === 'jev_omni');
  assert.ok(jevOmni);
  assert.equal(jevOmni.api_flag, false);
  assert.equal(jevOmni.rank, 1);
  assert.ok(Math.abs(jevOmni.score - 73.10053647043314) < 0.005);
  assert.deepEqual([jevOmni.previous_rank, jevOmni.previous_score], [3, 55.63]);
  assert.deepEqual([jevOmni.tracks.all.public.n, jevOmni.tracks.all.public.correct], [228, 153]);
  assert.deepEqual([jevOmni.tracks.all.sealed.n, jevOmni.tracks.all.sealed.correct], [456, 368]);
  for (const [axis, expected] of Object.entries({ intelligence: 63.92802530124383, calibration: 89.89724215081463, speed: 89.68343733284763, cost: 59.51521419000006 })) {
    assert.ok(Math.abs(jevOmni.tracks.all.axes[axis] - expected) < 0.005, axis);
  }
  assert.equal(jevOmni.tracks.all.public.probability_coverage, 1);
  assert.equal(jevOmni.tracks.all.sealed.probability_coverage, 1);
  assert.equal(jevOmni.tracks.all.cost.source, 'measured GPU seconds x $1.29/GPU-hour');

  const spark = a.ranking.find((s) => s.key === 'djev_spark_nvfp4');
  assert.deepEqual([spark.tracks.everyday_photo.sealed.correct, spark.tracks.everyday_photo.sealed.n], [83, 95]);
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

test('public Image JevBench route leads with the ranking and preserves aggregate-only data', async () => {
  const [page, publicPage, radar, data, nav, sitemap, builder] = await Promise.all([
    readFile(new URL('../app/jev-models/multimodal-preview/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/image-jev-bench/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/ImageJevRadar.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../data/raw/benchmarks/jevbench/multimodal-preview/preview.json', import.meta.url), 'utf8'),
    readFile(new URL('../components/Nav.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/sitemap.ts', import.meta.url), 'utf8'),
    readFile(new URL('../scripts/build-jevbench-multimodal-preview.mjs', import.meta.url), 'utf8'),
  ]);
  assert.match(page, /robots: \{ index: false, follow: false/);
  assert.match(publicPage, /canonical: '\/image-jev-bench'/);
  assert.match(publicPage, /openGraph:/);
  // F-198 (pass 36, iter235): the page is its results. Order: head → Composite score → Full ranking →
  // Compare two systems → Examples → Results by track → Split → preview tracks → Method → closed candidates.
  assert.doesNotMatch(page, /Top five by composite score/, 'the top-five panel is gone');
  assert.doesNotMatch(page, /Clean split/, 'the clean-split alert is gone');
  assert.doesNotMatch(page, /approved/i, 'no review-trail wording in the copy');
  assert.ok(page.indexOf('id="bars-heading"') < page.indexOf('id="overall-heading"'));
  assert.ok(page.indexOf('id="overall-heading"') < page.indexOf('<ImageJevRadar systems={a.ranking} />'));
  assert.ok(page.indexOf('<ImageJevExamples />') < page.indexOf('id="track-heading"'));
  assert.ok(page.indexOf('id="track-heading"') < page.indexOf('id="split-heading"'));
  assert.ok(page.indexOf('id="split-heading"') < page.indexOf('id="preview-tracks-heading"'));
  assert.ok(page.indexOf('id="preview-tracks-heading"') < page.indexOf('id="method-heading"'));
  assert.match(page, /Earlier split/, 'the former top-five fact is a table column');
  assert.doesNotMatch(page, /<th[^>]*>Penalty<\/th>/, 'the ×1.000 Penalty column is dropped');
  assert.doesNotMatch(page, /Cost coverage<\/th>/, 'Cost coverage folds into the row note');
  assert.match(page, /data-bh-mm-gated/, 'gated rows name the gate');
  assert.match(page, /data-bh-mm-candidates-details/, 'the candidate table sits in a disclosure');
  assert.match(page, /Requested and excluded candidates \(/);
  assert.match(radar, /from "\.\/JevRadars"/);
  assert.match(radar, /type="search" role="combobox"/);
  assert.match(radar, /ranked\[0\]\.key/);
  assert.match(radar, /ranked\[1\]\.key/);
  assert.match(page, /Split/);
  assert.match(page, /Computer Use and Browser Use tracks \(preview\)/);
  assert.ok(page.indexOf('id="split-heading"') < page.indexOf('id="preview-tracks-heading"'));
  assert.match(page, /Not measured yet — no scores\./);
  assert.match(page, /a\.preview_tracks\.cross_track_rule/);
  assert.match(page, /a\.preview_tracks\.kev_flag/);
  assert.match(page, /formatMatchedGapPp\(t\.matched_gap_pp\)/);
  assert.match(page, /Gap \(matched\)/);
  assert.doesNotMatch(page, /t\.penalty_multiplier\.toFixed\(3\)/, 'no Penalty column to print');
  assert.doesNotMatch(page, /80% public|25 points/);
  assert.match(page, /data-bh-djev-spark-sealed-photo/);
  assert.match(page, /<ImageJevExamples\s*\/>/);
  assert.doesNotMatch(page, /a\.examples/);
  assert.doesNotMatch(nav, /multimodal-preview/);
  assert.match(nav, /\/image-jev-bench/);
  assert.match(sitemap, /\/image-jev-bench/);
  assert.doesNotMatch(sitemap, /multimodal-preview/);
  assert.match(builder, /preview\.legacy-candidate\.json/);
  assert.doesNotMatch(builder, /multimodal-preview\/preview\.json/);
  assert.doesNotMatch(builder, /jevbench-multimodal-preview\//, 'legacy example images are removed');
  await assert.rejects(access(new URL('../public/jevbench-multimodal-preview', import.meta.url)), 'legacy public image folder stays deleted');
  await access(new URL('../app/image-jev-bench/page.tsx', import.meta.url));
  assert.match(page, /data-bh-mm-difficulty-caveat/);
  assert.doesNotMatch(page, /data-bh-mm-split-disposition/, 'the disposition alert is gone; Split says the numbers plainly');
  assert.doesNotMatch(page, /Split target deviation|deviation pending/);
  const artifact = JSON.parse(data);
  assert.equal(artifact.sealed_item_details_included, false);
  assert.deepEqual(forbiddenItemFields(artifact), []);
  assert.deepEqual(longArrays(artifact), []);
});
