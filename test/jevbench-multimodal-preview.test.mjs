import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readMultimodalPreview } from '../lib/jevbench-multimodal-preview.mjs';

const expectedRanking = [
  'Mapika decider-2b-vision BF16',
  'Reflex 4B (released stable configuration)',
  'djev-spark NVFP4',
  'djev-dev BF16',
  'GPT-6 Luna',
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

test('Image JevBench v0.1 preview contains the frozen aggregate candidate and top-five cut', async () => {
  const a = await readMultimodalPreview();
  assert.equal(a.benchmark, 'Image JevBench v0.1 candidate');
  assert.equal(a.sealed_item_details_included, false);
  assert.deepEqual([a.split.items_total, a.split.items_public, a.split.items_sealed], [444, 265, 179]);
  assert.deepEqual([a.split.licensed_core_total, a.split.licensed_core_public, a.split.licensed_core_sealed], [294, 176, 118]);
  assert.deepEqual([a.split.everyday_photo_total, a.split.everyday_photo_public, a.split.everyday_photo_sealed], [150, 89, 61]);
  assert.equal(a.split.synthetic_total, 150);
  assert.ok(Math.abs(a.split.synthetic_share_percent - 33.78378378) < 0.001);
  assert.equal(Object.values(a.split.public_source_counts).reduce((sum, n) => sum + n, 0), 176);
  assert.deepEqual(a.ranking.map((s) => s.name), expectedRanking);
  assert.deepEqual(a.ranking.slice(0, 5).map((s) => s.name), expectedRanking.slice(0, 5));
  assert.equal(a.ranking.filter((s) => s.api_flag).length, 4);
  assert.ok(a.ranking.every((s) => s.tracks.all.public.n === 265 && s.tracks.all.sealed.n === 179));
  assert.ok(a.ranking.every((s) => s.tracks.core.public.n === 176 && s.tracks.core.sealed.n === 118));
  assert.ok(a.ranking.every((s) => s.tracks.everyday_photo.public.n === 89 && s.tracks.everyday_photo.sealed.n === 61));
  const spark = a.ranking.find((s) => s.key === 'djev_spark_nvfp4');
  assert.deepEqual([spark.tracks.everyday_photo.sealed.correct, spark.tracks.everyday_photo.sealed.n], [53, 61]);
  assert.equal(forbiddenItemFields(a).length, 0);
});

test('preview stays noindex, unlinked, and uses only aggregate candidate content', async () => {
  const [page, data, nav, sitemap] = await Promise.all([
    readFile(new URL('../app/jev-models/multimodal-preview/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../data/raw/benchmarks/jevbench/multimodal-preview/preview.json', import.meta.url), 'utf8'),
    readFile(new URL('../components/Nav.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/sitemap.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(page, /robots: \{ index: false, follow: false/);
  assert.match(page, /not part of the JevBench Score/);
  assert.match(page, /Current top five by candidate composite/);
  assert.match(page, /data-bh-djev-spark-sealed-photo/);
  assert.doesNotMatch(page, /Public example items|a\.examples/);
  assert.doesNotMatch(nav, /multimodal-preview/);
  assert.doesNotMatch(sitemap, /multimodal-preview/);
  assert.equal(forbiddenItemFields(JSON.parse(data)).length, 0);
});
