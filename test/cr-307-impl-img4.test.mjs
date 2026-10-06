import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { imageJevBoardSystems } from '../lib/imagejev-board.mjs';
import { imageJevAuthorLabel } from '../lib/imagejev-system-links.mjs';
import { readImageJevSitemapPaths } from '../lib/imagejev-sitemap.mjs';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const release = JSON.parse(await read('../data/imagejev-v03.json'));

test('CR-307 v0.3 page: revision history, rank/Jev-class columns, source links, API note, archive opener', async () => {
  const page = await read('../components/ImageJevV03Page.tsx');
  assert.match(page, /data-bh-imagejev-v03-history/);
  assert.match(page, /<th>Rank<\/th>.*<th>Jev-class \(within caps\)<\/th>/);
  assert.match(page, /imageJevSourceUrl\(r\.key, r\.repo\)/);
  assert.doesNotMatch(page, /href=\{r\.repo \?\? '#v03-method'\}/);
  assert.match(page, /imageJevAuthorLabel\(r\)/);
  assert.match(page, /data-bh-v03-computer-use-api-note/);
  assert.match(page, /<ImageJevArchiveOpener \/>/);
  assert.match(page, /built_utc\)\.slice\(0, 10\)/);
  assert.doesNotMatch(page, /do not contain category competence aggregates, so their panels state that values are unavailable\. No v0\.1\.5/);
  assert.ok(release.categories.dims.length > 0, 'v0.3 has category values, so the method note may say so');
});

test('CR-307 author label never names a base-model owner; hosted API rows say so', () => {
  const byKey = Object.fromEntries(release.ranking.map((r) => [r.key, r]));
  for (const key of ['glance_qwen3vl_4b', 'jevision', 'visual_jev_generic_baseline']) assert.equal(imageJevAuthorLabel(byKey[key]), 'Author not reported', key);
  assert.equal(imageJevAuthorLabel(byKey.jpt_4b), 'kirp (model repository owner)');
  assert.equal(imageJevAuthorLabel(byKey['s1-vision']), 'Hosted API provider');
});

test('CR-307 s1-vision cost from usage receipts is measured, not announced', () => {
  const s1 = imageJevBoardSystems(release).find((r) => r.key === 's1-vision');
  assert.equal(s1.cost.kind, 'measured');
});

test('CR-307 metadata and JSON-LD derive version and count from the data', async () => {
  const page = await read('../app/image-jev-bench/page.tsx');
  assert.match(page, /release\.revision/);
  assert.match(page, /release\.ranking\.length/);
  assert.doesNotMatch(page, /v0\.3\.0|45 measured/);
  assert.match(page, /'@type': 'Dataset'/);
  assert.match(page, /'@type': 'BreadcrumbList'/);
  assert.match(page, /'@type': 'WebPage'/);
});

test('CR-307 sitemap lists every per-system page and still excludes multimodal-preview', async () => {
  const paths = await readImageJevSitemapPaths();
  for (const r of [...release.ranking, ...release.carried]) assert.ok(paths.includes(`/image-jev-bench/${r.key}`), r.key);
  assert.ok(paths.length >= release.ranking.length + release.carried.length);
  const sitemap = await read('../app/sitemap.ts');
  assert.match(sitemap, /readImageJevSitemapPaths/);
  assert.doesNotMatch(sitemap, /multimodal-preview/);
});

test('CR-307 detail page: archived banner, v0.1.5 rank wording, date-only publish line', async () => {
  const page = await read('../app/image-jev-bench/[system]/page.tsx');
  assert.match(page, /data-bh-imagejev-archived-banner/);
  assert.match(page, /v0\.1\.5 rank #\$\{row\.rank\} of \$\{rankedCount\} \(archived\)/);
  assert.match(page, /built_utc\)\.slice\(0, 10\)/);
});
