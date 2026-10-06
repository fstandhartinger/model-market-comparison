import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readJevbenchA4ModelPages } from '../lib/jevbench-a4-model-pages.mjs';

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const a4 = JSON.parse(src('data/jevbench-api-a4-equated.json'));

test('every A4 key gets a model page with the API-board ranks', async () => {
  const pages = await readJevbenchA4ModelPages();
  assert.deepEqual([...pages.keys()].sort(), a4.rows.map((r) => r.key).sort());
  assert.equal(pages.get('fastino-glide').compositeRank, 9);
  assert.equal(pages.get('instinct').compositeRank, 4);
  assert.equal(pages.get('instinct').capabilityRank, 3);
  assert.equal(pages.get('instinct').row.jevbench_score, 62.24);
  assert.equal(pages.get('classifier-dev-fast').compositeRank, null);
  assert.equal(pages.get('gpt-6-luna').compositeRank, 8);
  assert.ok(pages.get('gpt-6-luna').capabilityOutside);
});

test('the system page serves A4 keys from the API board and keeps the old figures as labelled history', () => {
  const page = src('app/jev-models/[system]/page.tsx');
  assert.match(page, /generateStaticParams[\s\S]*readJevbenchA4ModelPages/);
  assert.match(page, /Previous measurement \(v1\.5\.x, not comparable\)/);
  assert.match(page, /on A4 ∪ P, \{page\.nItems\} items, equated/);
  assert.ok(page.indexOf('a4Page') < page.indexOf('if (seoRow) return'));
});
