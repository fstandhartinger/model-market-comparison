import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { defaultMultimodalPreviewVersion, readMultimodalPreview, readMultimodalPreviewV02PageData } from '../lib/jevbench-multimodal-preview.mjs';
import { OFFICIAL_WEIGHTS, weightedJevScore } from '../lib/jevbench-axis-weights.mjs';

// CR-241 (Florian 30 Sep 2026): PR #105 replaced /image-jev-bench with a standalone route.ts that returned a raw HTML
// file. Route handlers bypass app/layout.tsx, so the public page lost the Benchmark Heaven header, menu and footer,
// and it listed 5 systems instead of the 50 in v0.1.4. Every public benchmark page must be a page.tsx
// rendered inside the root layout. A new version with fewer systems goes into a tab or section of the existing page
// and never replaces it.

// Lower this only after Florian approves it in writing, and cite that DECISIONS.md entry next to the new value.
const IMAGEJEV_MIN_RANKED_SYSTEMS = 50;
const BENCHMARK_PAGES = ['/jev-models', '/image-jev-bench', '/audio-jev-bench'];

const exists = (path) => access(new URL(path, import.meta.url)).then(() => true, () => false);
const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('CR-241: every benchmark page renders inside the Benchmark Heaven layout and is in the menu', async () => {
  const [layout, nav] = await Promise.all([read('../app/layout.tsx'), read('../components/Nav.tsx')]);
  assert.match(layout, /<Nav \/>/, 'the root layout renders the site header and menu');
  for (const route of BENCHMARK_PAGES) {
    assert.ok(await exists(`../app${route}/page.tsx`), `${route} is a page.tsx rendered in the root layout`);
    assert.ok(!(await exists(`../app${route}/route.ts`)), `${route} must not be a route handler (it would bypass the layout and menu)`);
    assert.ok(nav.includes(`["${route}", `), `${route} stays in the site menu`);
  }
});

test('CR-241: the public page preserves the complete v0.1.4 ranking', async () => {
  const [content, artifact] = await Promise.all([read('../app/jev-models/multimodal-preview/page.tsx'), readMultimodalPreview()]);
  assert.ok(artifact.ranking.length >= IMAGEJEV_MIN_RANKED_SYSTEMS,
    `ImageJevBench lists ${artifact.ranking.length} systems; the public page may not drop below ${IMAGEJEV_MIN_RANKED_SYSTEMS} without an explicit override`);
  assert.match(content, /export async function MultimodalPreviewContent/);
  assert.match(content, /<ScoreBars systems=\{a\.ranking\} track="all" \/>/);
  assert.match(content, /<RankingTable systems=\{a\.ranking\} track="all" all \/>/);
  assert.match(content, /<ImageJevRadar systems=\{a\.ranking\} \/>/);
});

test('CR-242: the public ImageJevBench page stages v0.2 in version tabs with aggregate-only data', async () => {
  const [publicPage, content, table, charts] = await Promise.all([
    read('../app/image-jev-bench/page.tsx'), read('../app/jev-models/multimodal-preview/page.tsx'),
    read('../components/ImageJevV02RankingTable.tsx'), read('../components/ImageJevV02Charts.tsx'),
  ]);
  assert.match(publicPage, /ImageJevBenchContent/, '/image-jev-bench renders the versioned results page');
  assert.match(publicPage, /canonical: '\/image-jev-bench'/);
  assert.doesNotMatch(publicPage, /robots:/, 'the public page stays indexable');
  for (const marker of ['<ScoreBars', 'id="overall-heading"', '<RankingTable', '<ImageJevRadar']) {
    assert.ok(content.includes(marker), `ImageJevBench keeps the v0.1.4 ${marker}`);
  }
  const artifact = await readMultimodalPreview();
  assert.ok(artifact.ranking.length >= IMAGEJEV_MIN_RANKED_SYSTEMS,
    `the v0.1.4 tab retains at least ${IMAGEJEV_MIN_RANKED_SYSTEMS} systems`);

  const v02Start = content.indexOf('function ImageJevV02Page');
  assert.ok(v02Start >= 0, 'the v0.2 version has its own normal-page content');
  const v02 = content.slice(v02Start);
  const ordered = [
    '<JevCapabilityRanking systems={chartSystems}',
    '<CapabilityStatusRows measured={measuredWithoutComposite} references={referenceOnlyRows} />',
    '<ImageJevV02Charts systems={systems} references={referenceOnlyRows} showCapabilityBars={!classOptions} caps={limits ? { cost: limits.cost, latency: limits.latency } : null} />',
    'data-bh-imagejev-v02-composite',
    '<ImageJevRadar systems={systems} track="core" />',
    'data-bh-imagejev-v02-ranking',
    '<MeasuredWithoutCompositeRows rows={measuredWithoutComposite} references={allReferences} />',
    '<ReferenceRows rows={referenceOnlyRows} />',
    'data-bh-imagejev-v02-method',
    '<ImageJevV02WhatIf systems={systems} />',
    'data-bh-imagejev-v02-history',
  ].map((marker) => v02.indexOf(marker));
  assert.ok(ordered.every((position) => position >= 0), 'v0.2 includes capability, composite, comparison, tables, method, What-If and history');
  assert.deepEqual(ordered, [...ordered].sort((a, b) => a - b), 'v0.2 sections follow the required order');
  assert.doesNotMatch(v02, /tracks\.all/, 'v0.2 never presents the 573 items as a combined score');
  assert.match(charts, /className=\{view === '2d' \? 'mt-4 grid min-w-0 gap-4 lg:grid-cols-2' : 'hidden'\} data-bh-imagejev-v02-synced-charts/,
    'switching to 3D applies an exclusive hidden class to the synced 2D charts');
  assert.match(charts, /!points\.length && view === '2d' &&/,
    'the no-measurements placeholder also follows the 2D view selection');
  assert.match(charts, /!points\.length && view === '3d' &&/,
    'the no-measurements placeholder displays the selected 3D view alone');

  const v02Bundle = await readMultimodalPreviewV02PageData();
  assert.equal(v02Bundle.artifact.headline_track, 'core');
  const measuredKeys = new Set(v02Bundle.artifact.ranking.map((row) => row.key));
  const unrankableRows = v02Bundle.artifact.measured_unrankable_rows ?? [];
  const unrankableKeys = new Set(unrankableRows.map((row) => row.key));
  assert.equal(unrankableKeys.size, unrankableRows.length, 'fresh measured-without-composite rows have unique keys');
  const visibleKeys = new Set(measuredKeys);
  for (const row of unrankableRows) {
    assert.equal(row.score, null);
    assert.equal(row.rank, null);
    assert.equal(row.tracks.core.composite, null);
    assert.ok(Number.isFinite(row.tracks.core.axes.intelligence));
    assert.ok(Number.isFinite(row.tracks.core.axes.calibration));
    assert.ok(Number.isFinite(row.tracks.core.axes.speed));
    assert.equal(row.tracks.core.axes.cost, null);
    assert.ok(!measuredKeys.has(row.key), `${row.key} stays out of the scored ranking`);
    visibleKeys.add(row.key);
  }
  for (const row of v02Bundle.artifact.reference_rows) {
    assert.equal(row.reference_revision, 'v0.1.4');
    assert.ok(!Object.hasOwn(row, 'score') && !Object.hasOwn(row, 'rank') && !Object.hasOwn(row, 'tracks'), `${row.key} has no v0.2 score fields`);
    if (unrankableKeys.has(row.key)) {
      const unrankable = unrankableRows.find((candidate) => candidate.key === row.key);
      assert.equal(row.reason, `Fresh v0.2 run complete, but unrankable: ${unrankable.reason}; v0.1.4 reference only.`);
    } else {
      assert.ok(!measuredKeys.has(row.key), `${row.key} is never both ranked and reference-only`);
    }
    visibleKeys.add(row.key);
  }
  assert.deepEqual([...artifact.ranking.map((row) => row.key).filter((key) => !visibleKeys.has(key))], [], 'every prior v0.1.4 system is measured or visibly listed as a reference');
  if (v02Bundle.staging) {
    assert.equal(v02Bundle.artifact.ranking.length, 0, 'staging contains no fake v0.2 scores');
    assert.equal(unrankableRows.length, 0, 'staging contains no fake measured axes');
    assert.equal(v02Bundle.artifact.reference_rows.length, artifact.ranking.length, 'the staging reference section retains every v0.1.4 system');
  } else {
    assert.ok(visibleKeys.size >= IMAGEJEV_MIN_RANKED_SYSTEMS, 'v0.2 keeps the full visible system roster with labeled references');
    assert.equal(visibleKeys.size, 51, 'the finished release represents all 50 prior systems plus the distinct historical Imajev configuration');
    assert.ok(visibleKeys.has('imajev_4b_20260926'), 'the additional historical Imajev configuration is independently represented');
    assert.equal(visibleKeys.size, 51, 'measured-without-composite rows do not double-count their matching reference keys');
    assert.ok(content.includes('<MeasuredWithoutCompositeRows rows={measuredWithoutComposite} references={allReferences} />'));
    assert.ok(content.includes('<ImageJevV02Charts systems={systems} references={referenceOnlyRows} showCapabilityBars={!classOptions} caps={limits ? { cost: limits.cost, latency: limits.latency } : null} />'), 'unrankable rows stay outside reference-only visualizations');
    assert.ok(content.includes('const chartSystems = eligibilityFrozen ? imageJevBoardSystems(artifact) : [];'), 'the Capability Score headline ranks only fresh v0.2 composite rows; NULL and reference rows are listed separately');
    for (const row of v02Bundle.artifact.ranking) {
      const reproduced = weightedJevScore(row.tracks.core.axes, OFFICIAL_WEIGHTS);
      assert.ok(Number.isFinite(reproduced) && Math.abs(reproduced - row.score) < 0.005, `${row.key} official score matches the What-If formula`);
    }
  }
  assert.equal(await defaultMultimodalPreviewVersion(), v02Bundle.artifact.status === 'preview' && v02Bundle.artifact.ranking.length > 0 ? 'v0.2.0' : 'v0.1.4');
  assert.match(content, /<ImageJevV02RankingTable systems=\{systems\} \/>/);
  assert.match(content, /data-bh-imagejev-v02-unrankable-table/);
  for (const marker of ['data-bh-imagejev-v02-table-controls', 'Search measured systems', 'data-bh-imagejev-v02-filter', 'aria-sort={ariaSort}', 'data-bh-imagejev-v02-columns="compact"', 'data-bh-imagejev-v02-measured-row']) {
    assert.ok(table.includes(marker), `the v0.2 full table exposes ${marker}`);
  }
});

test('CR-241: the legacy v0.2 preview stays noindex and the prior archive path selects v0.1.4', async () => {
  const [route, sitemap, nav, nextConfig] = await Promise.all([
    read('../app/wip-imagejev-v02-9e2d4a/route.ts'), read('../app/sitemap.ts'), read('../components/Nav.tsx'), read('../next.config.mjs'),
  ]);
  assert.match(route, /data\/previews\/imagejev-v02\.html/);
  assert.match(route, /'X-Robots-Tag': 'noindex, nofollow, noarchive'/);
  for (const source of [sitemap, nav]) assert.doesNotMatch(source, /wip-imagejev|imagejev-v02/);
  assert.match(nextConfig, /source: "\/image-jev-bench\/v0\.1\.4", destination: "\/image-jev-bench\?version=v0\.1\.4"/);
  const [normalPage, content] = await Promise.all([read('../app/image-jev-bench/page.tsx'), read('../app/jev-models/multimodal-preview/page.tsx')]);
  assert.match(normalPage, /searchParams/);
  assert.match(content, /data-bh-imagejev-version-tabs/);
  assert.match(content, /data-bh-imagejev-version-tab=\{version\}/);
});
