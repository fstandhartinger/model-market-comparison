import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { JEV_COMPARISONS, isOpenWeightJevRow, readJevbenchSeoData } from '../lib/jevbench-seo.mjs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('open-weight inventory is every public Jev-style row of v1.4.2, never a proprietary one', async () => {
  const data = await readJevbenchSeoData();
  const rows = data.openWeightAlternatives;
  assert.equal(rows.length, 60);
  assert.equal(rows[0].key, 'decider-4b-v2');
  assert.ok(rows.some((row) => row.key === 'jevk5-v02'), 'JevK5 is Apache-2.0 although its open field is empty');
  for (const key of ['jev-1.13.0', 'instinct', 'jevact']) assert.ok(!rows.some((row) => row.key === key), key);
  assert.ok(rows.every((row) => ['jev-rebuild', 'system-one-open'].includes(row.class) && /^https:\/\//.test(row.repo) && row.licence.trim()));
  assert.deepEqual(rows.map((row) => row.rank), [...rows.map((row) => row.rank)].sort((a, b) => a - b));
  assert.equal(isOpenWeightJevRow({ class: 'jev-rebuild', open: null, licence: 'proprietary service', repo: 'https://x' }), false);
});

test('new SEO routes are canonical, in the sitemap and linked from the hub and guides', () => {
  const sitemap = read('app/sitemap.ts');
  const blocks = read('components/JevBenchSeoBlocks.tsx');
  const related = read('components/JevBenchRelatedLinks.tsx');
  for (const path of ['/jev-models/open-source-jev', ...JEV_COMPARISONS.map((pair) => `/jev-models/${pair.slug}`)]) {
    assert.ok(sitemap.includes(`"${path}"`), `${path} in sitemap`);
  }
  assert.match(read('app/jev-models/open-source-jev/page.tsx'), /const PATH = '\/jev-models\/open-source-jev'/);
  assert.match(read('app/jev-models/open-source-jev/page.tsx'), /jevIntentMetadata\(/);
  assert.match(blocks, /href: '\/jev-models\/open-source-jev'/);
  assert.match(blocks, /<JevBoardGuides links=/);
  assert.match(blocks, /JEV_COMPARISONS\.map/);
  assert.match(related, /JEV_COMPARISONS/);
});

test('the new #1 comparison shows the approved top-five sentence and each row states how it was measured', () => {
  const compare = read('components/JevComparisonPage.tsx');
  assert.match(compare, /rival\.rank === 1 \? .*top_five_note/);
  assert.match(compare, /data-bh-jev-top-five-note/);
  assert.match(compare, /<MeasurementConditions row=\{row\} \/>/);
});

test('an IndexNow key file is served from the site root', () => {
  const keys = readdirSync(new URL('../public/', import.meta.url)).filter((name) => /^[0-9a-f]{32}\.txt$/.test(name));
  assert.ok(keys.length >= 1);
  for (const name of keys) assert.equal(read(`public/${name}`).trim(), name.slice(0, -4));
});
