import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readJevbenchLiveCategoryView } from '../lib/jevbench-a4-model-pages.mjs';
import { jevbenchCategoryView } from '../lib/jevbench-categories.mjs';
import { readJevbenchSeoData } from '../lib/jevbench-seo.mjs';

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

// CR-780 (18 Nov 2026, Karpo-Decision-31B / customer UID 38270): /jev-models/jev-vs-<key> read the base revision's frozen
// category cells, so every row measured on a fresh draw showed "No per-category values" there while /jev-models#compare
// showed them. Both the comparison page and the system page now read the live board's cells.
test('fresh-draw rows get live category cells that the frozen base view lacks', async () => {
  const data = await readJevbenchSeoData();
  const fresh = [];
  for (const s of data.systems) {
    const frozen = jevbenchCategoryView(data.artifact.base_revision, [s.key], { supplement: true });
    if (frozen?.systems?.[s.key]) continue;
    const live = await readJevbenchLiveCategoryView([s.key]);
    if (live?.systems?.[s.key]?.usecases) fresh.push(s.key);
  }
  assert.ok(fresh.length > 0, 'at least one current row has live-only category cells');
  if (data.systems.some((s) => s.key === 'karpo_decision_31b')) assert.ok(fresh.includes('karpo_decision_31b'));
  const pair = await readJevbenchLiveCategoryView([data.reference.key, fresh[0]]);
  assert.ok(pair?.systems?.[fresh[0]]?.usecases, 'the Jev-vs pair view carries the rival cells');
});

test('a key without live cells yields null so callers keep the frozen fallback', async () => {
  assert.equal(await readJevbenchLiveCategoryView(['no-such-system-cr780']), null);
});

test('the comparison and system pages use the live view', () => {
  const cmp = src('components/JevComparisonPage.tsx');
  assert.match(cmp, /readJevbenchLiveCategoryView\(\[jev\.key,rival\.key\]\)/);
  assert.match(cmp, /categories=\{categories\}/);
  const page = src('app/jev-models/[system]/page.tsx');
  assert.match(page, /<LiveBreakdowns cats=\{cats\} systemKey=\{row\.key\} \/>/);
  assert.match(page, /readJevbenchLiveCategoryView\(\[seoRow\.key\]\)/);
});
