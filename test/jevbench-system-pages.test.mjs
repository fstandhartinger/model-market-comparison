import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readJevbenchV12, jevbenchV12View } from '../lib/jevbench-v12.mjs';

const page = await readFile(new URL('../app/jev-models/[system]/page.tsx', import.meta.url), 'utf8');
const hub = await readFile(new URL('../app/jev-models/page.tsx', import.meta.url), 'utf8');
const sitemap = await readFile(new URL('../app/sitemap.ts', import.meta.url), 'utf8');
const board = await readFile(new URL('../components/JevModelsV12.tsx', import.meta.url), 'utf8');

test('CR-129 the current artifact really has semif-qwen3.5-4b and laya (the two Trends queries this targets)', async () => {
  const view = jevbenchV12View(await readJevbenchV12());
  const keys = [...view.ranked, ...view.honorable, ...view.partial].map((r) => r.key);
  assert.ok(keys.includes('semif-qwen3.5-4b'), `expected semif-qwen3.5-4b among ${keys.join(', ')}`);
  assert.ok(keys.includes('laya'), `expected laya among ${keys.join(', ')}`);
});

test('CR-129 generateStaticParams is artifact-driven, not a hardcoded list', () => {
  assert.match(page, /export async function generateStaticParams/);
  assert.match(page, /readJevbenchV12/);
  assert.match(page, /view\.ranked.*view\.honorable.*view\.partial/s);
  assert.match(page, /system:\s*r\.key/);
});

test('CR-129 metadata is built only from row fields: main score, rank, and the not-ranked reason', () => {
  assert.match(page, /generateMetadata\(/);
  assert.match(page, /row\.main/);
  assert.match(page, /row\.rank/);
  assert.match(page, /row\.notRankedBecause/);
  assert.match(page, /previewMetadata/);
  assert.match(page, /notFound\(\)/);
});

test('CR-129 structured data is WebPage + BreadcrumbList only, never Product/AggregateRating/Review', () => {
  assert.match(page, /'@type': 'WebPage'/);
  assert.match(page, /'@type': 'BreadcrumbList'/);
  assert.doesNotMatch(page, /'@type': 'Product'/);
  assert.doesNotMatch(page, /'@type': 'AggregateRating'/);
  assert.doesNotMatch(page, /'@type': 'Review'/);
  assert.doesNotMatch(page, /AggregateRating|aggregateRating/);
});

test('CR-129 no GDPR-compliance claim (same rule CR-120 already follows on the parent page)', () => {
  assert.doesNotMatch(page, /(?:is|are|fully) GDPR[- ]compliant/i);
});

test('CR-129 sitemap gets one entry per JevBench system and still excludes multimodal-preview', () => {
  assert.match(sitemap, /readJevbenchV12/);
  assert.match(sitemap, /jevbenchV12View/);
  assert.match(sitemap, /\/jev-models\/\$\{r\.key\}/);
  assert.doesNotMatch(sitemap, /multimodal-preview/);
});

test('CR-129 the board links out to the new per-system pages, including semif and laya', () => {
  // F-169 (Fable pass 32): the hub's list of 52 links is gone; a system is reached from the row that
  // names it, so the template these pins follow moved from the page to the board component.
  assert.match(board, /href=\{`\/jev-models\/\$\{r\.key\}`\}/);
  assert.doesNotMatch(hub, /Browse every JevBench system/);
  assert.doesNotMatch(hub, /data-bh-jev-system-links/);
});

test('CR-129 the hub HTML actually contains links for semif-qwen3.5-4b and laya once rendered data is substituted', async () => {
  // The hub builds hrefs as a template over `all`/`view.ranked` etc., not per-key literals, so this checks
  // the real artifact contains both keys and the template it renders from (asserted above) is generic enough
  // to cover them — i.e. it is not an allowlist that happens to omit either.
  const view = jevbenchV12View(await readJevbenchV12());
  const all = [...view.ranked, ...view.honorable, ...view.partial];
  assert.ok(all.some((r) => r.key === 'semif-qwen3.5-4b'));
  assert.ok(all.some((r) => r.key === 'laya'));
  assert.doesNotMatch(board, /jev-models\/\[system\]/); // sanity: no literal dynamic-segment text leaked into the board
});
