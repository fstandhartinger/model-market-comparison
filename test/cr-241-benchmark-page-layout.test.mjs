import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { readMultimodalPreview } from '../lib/jevbench-multimodal-preview.mjs';

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

test('CR-241: the public ImageJevBench page keeps the full v0.1.4 structure and model list', async () => {
  const [publicPage, content] = await Promise.all([read('../app/image-jev-bench/page.tsx'), read('../app/jev-models/multimodal-preview/page.tsx')]);
  assert.match(publicPage, /MultimodalPreviewContent/, '/image-jev-bench renders the full results page');
  assert.match(publicPage, /canonical: '\/image-jev-bench'/);
  assert.doesNotMatch(publicPage, /robots:/, 'the public page stays indexable');
  for (const marker of ['<ScoreBars', 'id="overall-heading"', '<RankingTable', '<JevCompareV15']) {
    assert.ok(content.includes(marker), `ImageJevBench page keeps ${marker}`);
  }
  // CR-290 (Florian 5 Oct 2026): exactly one "Compare two systems" section — JevCompareV15 already carries the
  // four-axis radar, so the older ImageJevRadar section was a duplicate.
  assert.equal(content.split('<JevCompareV15').length - 1, 1);
  assert.doesNotMatch(content, /<ImageJevRadar/);
  const artifact = await readMultimodalPreview();
  assert.ok(artifact.ranking.length >= IMAGEJEV_MIN_RANKED_SYSTEMS,
    `ImageJevBench lists ${artifact.ranking.length} systems; the public page may not drop below ${IMAGEJEV_MIN_RANKED_SYSTEMS} without an explicit override`);
});

test('CR-241: ImageJevBench v0.2 stays on the hidden noindex preview only', async () => {
  const [route, sitemap, nav, nextConfig] = await Promise.all([
    read('../app/wip-imagejev-v02-9e2d4a/route.ts'), read('../app/sitemap.ts'), read('../components/Nav.tsx'), read('../next.config.mjs'),
  ]);
  assert.match(route, /data\/previews\/imagejev-v02\.html/);
  assert.match(route, /'X-Robots-Tag': 'noindex, nofollow, noarchive'/);
  for (const source of [sitemap, nav]) assert.doesNotMatch(source, /wip-imagejev|imagejev-v02/);
  assert.match(nextConfig, /source: "\/image-jev-bench\/v0\.1\.4", destination: "\/image-jev-bench"/);
});
