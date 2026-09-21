import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readMultimodalPreview } from '../lib/jevbench-multimodal-preview.mjs';

test('preview artifact recomputes public real rankings and keeps synthetic separate', async () => {
  const a = await readMultimodalPreview();
  assert.equal(a.public_real_items, 128);
  assert.equal(a.held_out_items_published, 0);
  assert.deepEqual(a.counts, { image_reasoning: 80, computer_use: 36, browser_use: 12 });
  assert.deepEqual(a.systems.map((s) => [s.display, s.overall.correct]), [['GPT-5.6 Luna', 76], ['Gemini 3.1 Flash-Lite', 73], ['djev-dev BF16', 61], ['AlexWortega/openjev 4B v2 BF16', 60], ['Mapika/decider-2b-vision BF16', 55], ['kshetrajna12/reflex 4B BF16', 55]]);
  assert.equal(a.synthetic.n, 8);
  assert.equal(a.synthetic.rank_worthy, false);
  assert.deepEqual(Object.fromEntries(Object.entries(a.synthetic.scores).map(([k, v]) => [k, v.correct])), { luna: 7, gemini: 7, djev: 7, openjev: 7, decider: 6, reflex: 7 });
  assert.ok(a.examples.every((e) => e.source_url.startsWith('https://') && e.licence));
});

test('preview is noindex and absent from navigation and sitemap', async () => {
  const [page, nav, sitemap] = await Promise.all([
    readFile(new URL('../app/jev-models/multimodal-preview/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/Nav.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/sitemap.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(page, /robots: \{ index: false, follow: false/);
  assert.match(page, /not part of the JevBench Score/);
  assert.doesNotMatch(nav, /multimodal-preview/);
  assert.doesNotMatch(sitemap, /multimodal-preview/);
});
