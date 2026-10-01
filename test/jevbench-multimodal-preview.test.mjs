import { createHash } from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { formatMatchedGapPp, readArchivedMultimodalPreviewV011, readArchivedMultimodalPreviewV012, readArchivedMultimodalPreviewV013, readArchivedMultimodalPreviewV014, readMultimodalPreview, validatePreviewTracks } from '../lib/jevbench-multimodal-preview.mjs';

const expectedTopFive = [
  'Imajev-4B',
  'Wity-1',
  'Jev-Omni',
  'NeoHorse Jev 4B',
  'Visual-Jev 4B Answer-SFT',
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

test('Image JevBench v0.1.4 preserves the frozen method and prices Wity-1 at its base-model estimate', async () => {
  const { artifact: a } = await readArchivedMultimodalPreviewV014();
  assert.equal(a.benchmark, 'Image JevBench v0.1.4');
  assert.equal(a.revision, 'v0.1.4');
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
  assert.equal(a.n_systems, 50);
  assert.deepEqual(a.ranking.slice(0, 5).map((s) => s.name), expectedTopFive);
  const wity = a.ranking.find((s) => s.key === 'wity_1');
  assert.ok(wity);
  assert.equal(wity.name, 'Wity-1');
  assert.equal(wity.kind, 'api');
  assert.equal(wity.api_flag, true);
  assert.equal(wity.rank, 2);
  assert.equal(wity.previous_rank, undefined);
  assert.equal(wity.tracks.all.public.n, 228);
  assert.equal(wity.tracks.all.sealed.n, 456);
  assert.ok(Math.abs(wity.score - 74.36394536053653) < 1e-9);
  assert.ok(Math.abs(wity.tracks.all.cost.total_usd - 0.0180813) < 1e-12);
  assert.ok(Math.abs(wity.tracks.all.cost.usd_per_1000 - 0.026434649122807023) < 1e-12);
  assert.equal(wity.tracks.all.cost.coverage, 1);
  assert.equal(wity.tracks.all.cost.source, 'Estimated Qwen3.6-35B-A3B base-model market reference: USD 0.15/M input, USD 1.00/M output; measured Wity usage (zero output tokens)');
  assert.equal(wity.inference_setting, 'Wity SystemOne, reasoning=auto');
  assert.match(wity.measurement_source, /production-named Wity SystemOne endpoint/);
  assert.deepEqual(a.ranking.slice(0, 5).map((s) => s.key), ['imajev_4b', 'wity_1', 'jev_omni', 'neohorse_jev_4b', 'visual_jev_4b']);
  const imajev = a.ranking.find((s) => s.key === 'imajev_4b');
  assert.ok(imajev);
  assert.equal(imajev.name, 'Imajev-4B');
  assert.equal(imajev.kind, 'gpu');
  assert.equal(imajev.api_flag, false);
  assert.equal(imajev.rank, 1);
  assert.ok(Math.abs(imajev.score - 76.38798675595419) < 1e-10);
  assert.equal(imajev.previous_rank, 1);
  assert.ok(Math.abs(imajev.previous_score - 76.38798675595419) < 1e-10);
  assert.match(imajev.inference_setting, /--fast.*--merge-lora/);
  assert.equal(imajev.tracks.all.cost.source, 'measured GPU seconds x $0.67/GPU-hour');
  const coverage = a.candidate_coverage.candidates.find((row) => row.candidate === 'Imajev-4B');
  assert.equal(coverage.status, 'included in v0.1.4 ranking (#1 of 50)');
  assert.equal(coverage.ranking_key, 'imajev_4b');
  const wityCoverage = a.candidate_coverage.candidates.find((row) => row.candidate === 'Wity-1');
  assert.equal(wityCoverage.status, 'included in v0.1.4 ranking (#2 of 50)');
  assert.equal(wityCoverage.ranking_key, 'wity_1');
  assert.equal(a.release_provenance.parent_revision, 'v0.1.3');
  assert.equal(a.ranking.filter((s) => s.api_flag).length, 6);
  assert.ok(a.ranking.every((s, i) => s.rank === i + 1));
  assert.ok(a.ranking.every((s) => s.tracks.all.public.n === 228 && s.tracks.all.sealed.n === 456));
  assert.ok(a.ranking.every((s) => s.tracks.core.public.n === 139 && s.tracks.core.sealed.n === 361));
  assert.ok(a.ranking.every((s) => s.tracks.everyday_photo.public.n === 89 && s.tracks.everyday_photo.sealed.n === 95));
  assert.ok(a.ranking.every((s) => ['all', 'core', 'everyday_photo'].every((track) => Number.isFinite(s.tracks[track].penalty_multiplier))));

  const jevOmni = a.ranking.find((s) => s.key === 'jev_omni');
  assert.ok(jevOmni);
  assert.equal(jevOmni.api_flag, false);
  assert.equal(jevOmni.rank, 3);
  assert.ok(Math.abs(jevOmni.score - 73.10053647043314) < 0.005);
  assert.deepEqual([jevOmni.previous_rank, jevOmni.previous_score], [2, 73.10053647043314]);
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
  // The release candidate-coverage roster is metadata, not per-item output.
  // Reject every other unexpectedly long array in the validated artifact.
  assert.deepEqual(longArrays(a), ['root.ranking', 'root.candidate_coverage.candidates']);
});

test('Image JevBench v0.1.4 archive is byte-pinned separately from the live preview', async () => {
  const archived = await readArchivedMultimodalPreviewV014();
  assert.equal(archived.sha256, '385aba04acb0649f73264f57b237fa6bcf481763641978d732f81b4e88ba2150');
  assert.equal(archived.artifact.revision, 'v0.1.4');
  assert.equal(archived.artifact.n_systems, 50);
});

test('Image JevBench v0.1.1 is preserved as the exact parent release artifact', async () => {
  const archived = await readArchivedMultimodalPreviewV011();
  assert.equal(archived.sha256, '749aae5c79b52e41eb691c50e4de2de65188bda8943e24afd8ad71434ac88140');
  assert.equal(archived.artifact.revision, 'v0.1.1');
  assert.equal(archived.artifact.n_systems, 48);
});

test('Image JevBench v0.1.2 is preserved as the exact parent release artifact', async () => {
  const archived = await readArchivedMultimodalPreviewV012();
  assert.equal(archived.sha256, '08ca91cada08c74656bffb9c648572e8ad148ff598d614ed62280906c2b9abd3');
  assert.equal(archived.artifact.revision, 'v0.1.2');
  assert.equal(archived.artifact.n_systems, 49);
});

test('Image JevBench v0.1.3 is preserved as the exact parent release artifact', async () => {
  const archived = await readArchivedMultimodalPreviewV013();
  assert.equal(archived.sha256, '539b78d92a1fe4d1c7bb0719ceba3e7e5525cfa6017635d0898bf670cc04397a');
  assert.equal(archived.artifact.revision, 'v0.1.3');
  assert.equal(archived.artifact.n_systems, 49);
  assert.deepEqual(archived.artifact.ranking.slice(0, 5).map((row) => row.key), ['imajev_4b', 'jev_omni', 'neohorse_jev_4b', 'visual_jev_4b', 'jpt_4b']);
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
  assert.match(page, /Image JevBench v0\.1\.4/);
  assert.match(page, /data-bh-mm-author-review/);
  assert.match(page, /data-bh-mm-author-review-summary/);
  assert.match(publicPage, /canonical: '\/image-jev-bench'/);
  assert.match(publicPage, /Image JevBench v0\.1\.4/);
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
  // The 69-entry release candidate-coverage manifest is metadata, not per-item output.
  // Keep rejecting every other unexpectedly long array in the public artifact.
  assert.deepEqual(longArrays(artifact), ['root.ranking', 'root.candidate_coverage.candidates']);
});

test('API.md pins the current JevBench and Image JevBench artifact hashes', async () => {
  const releases = [
    {
      version: 'v1.4.2.1',
      results: '../data/raw/benchmarks/jevbench/v1.4.2.1/jevbench-v1.4.2.1-results.json',
      families: '../data/raw/benchmarks/jevbench/v1.4.2.1/jevbench-v1.4.2.1-family-supplement.json',
    },
    {
      version: 'v1.4.2.2',
      results: '../data/raw/benchmarks/jevbench/v1.4.2.2/jevbench-v1.4.2.2-results.json',
      families: '../data/raw/benchmarks/jevbench/v1.4.2.2/jevbench-v1.4.2.2-family-supplement.json',
    },
  ];
  const imagePreviewFile = '../data/raw/benchmarks/jevbench/multimodal-preview/preview.json';
  const [api, ...artifacts] = await Promise.all([
    readFile(new URL('../API.md', import.meta.url), 'utf8'),
    ...releases.flatMap(({ results, families }) => [results, families])
      .concat(imagePreviewFile)
      .map((file) => readFile(new URL(file, import.meta.url))),
  ]);
  for (const [index, release] of releases.entries()) {
    const row = api.split('\n').find((line) => line.startsWith(`| ${release.version} |`));
    assert.ok(row, `API.md must include a ${release.version} release row`);
    for (const [label, file, artifact] of [
      ['results', release.results, artifacts[index * 2]],
      ['family supplement', release.families, artifacts[index * 2 + 1]],
    ]) {
      const sha256 = createHash('sha256').update(artifact).digest('hex');
      assert.ok(row.includes(`\`${sha256}\``), `${release.version} API row must pin ${label} ${file} SHA-256 ${sha256}`);
    }
  }
  const imagePreviewSha256 = createHash('sha256').update(artifacts.at(-1)).digest('hex');
  const imagePin = api.match(/multimodal-preview\/preview\.json`\r?\n\(SHA-256 `([0-9a-f]{64})`\)/);
  assert.equal(imagePin?.[1], imagePreviewSha256, `Image JevBench section must pin preview.json SHA-256 ${imagePreviewSha256}`);
});
