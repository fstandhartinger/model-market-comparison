import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const page = await readFile(new URL('../app/jev-models/page.tsx', import.meta.url), 'utf8');
const image = await readFile(new URL('../app/jev-models/opengraph-image.tsx', import.meta.url), 'utf8');
const preview = await readFile(new URL('../app/jev-models/multimodal-preview/page.tsx', import.meta.url), 'utf8');
const sitemap = await readFile(new URL('../app/sitemap.ts', import.meta.url), 'utf8');

test('CR-131 changing board metadata stays evergreen and complete for large link cards', () => {
  const metadata = page.slice(page.indexOf('export async function generateMetadata'), page.indexOf('\nconst day ='));
  assert.match(page, /generateMetadata\(\)/);
  assert.match(metadata, /alternates: \{ canonical: '\/jev-models' \}/);
  assert.match(metadata, /card: 'summary_large_image'/);
  assert.match(metadata, /width: 1200, height: 630/);
  assert.match(metadata, /JevBench by Benchmark Heaven/);
  assert.doesNotMatch(metadata, /view\.revision|view\.decisions|rank|score|\bleads at\b/i);
  assert.match(page, /href="\/jev-models\/v1\.4" data-bh-jev-version-share>Share this version/);
});

test('CR-131 generated image is an evergreen 1200 by 630 JevBench card', () => {
  assert.match(image, /export const size = \{ width: 1200, height: 630 \}/);
  assert.match(image, /JevBench by Benchmark Heaven/);
  assert.match(image, /Jev-class decision models/);
  assert.doesNotMatch(image, /v1\.\d|rank|score|\bleads at\b/i);
});

test('CR-120 visible FAQ and schema cover the requested intent without a GDPR claim', () => {
  for (const phrase of ['What are open-source alternatives to Jev?', 'Which Jev-class models can I self-host in the EU', 'How is JevBench scored?', 'How do I submit my model?']) assert.match(page, new RegExp(phrase.replace(/[?]/g, '\\?')));
  assert.match(page, /'@type': 'Dataset'/);
  assert.match(page, /'@type': 'FAQPage'/);
  assert.match(page, /self-hosted open decision models/);
  assert.match(page, /run by the authors of this benchmark/);
  assert.match(page, /does not by itself make a deployment GDPR-compliant/);
  assert.doesNotMatch(page, /(?:is|are|fully) GDPR[- ]compliant/i);
});

test('CR-120 preserves the multimodal preview noindex and sitemap exclusion', () => {
  assert.match(preview, /robots: \{ index: false, follow: false/);
  assert.doesNotMatch(sitemap, /multimodal-preview/);
});
