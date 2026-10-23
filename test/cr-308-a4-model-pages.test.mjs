import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readApiFullAddenda } from '../lib/jevbench-api-full-addenda.mjs';
import { assembleJevBoard } from '../lib/jevbench-live-board.mjs';
import { mirrorDataRoot } from './fixtures/mirror-data-root.mjs';
import { readJevbenchV161Release } from '../lib/jevbench-v16-release.mjs';
import { readJevbenchV157Release } from '../lib/jevbench-v15-release.mjs';
import { jevbenchScopeArtifact, jevScopeClassifier } from '../lib/jevbench-scope.mjs';
import { jevClassRows, JEV_V16_CLASS_OPTIONS } from '../lib/jevbench-jev-class.mjs';
import { readJevbenchA4ModelPages } from '../lib/jevbench-a4-model-pages.mjs';

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const a4 = JSON.parse(src('data/jevbench-api-a4-equated.json'));

test('every A4 key gets a model page with the API-board ranks', async () => {
  const livePages = await readJevbenchA4ModelPages();
  const addenda = await readApiFullAddenda();
  assert.deepEqual([...livePages.keys()].sort(), [...a4.rows, ...(a4.a5_rows ?? []), ...(a4.full_rows ?? []), ...addenda.entries.map(e => e.row)].map(r => r.key).sort());
  // v1.7.0: the pages follow the assembled live board (cohort rows, and the restated rows once v1.7.0 is published), not a private v1.6.1 + A4 rebuild.
  const [{ artifact: release, categories, carry }, previous] = await Promise.all([readJevbenchV161Release(), readJevbenchV157Release()]);
  const live = await assembleJevBoard({ release: { artifact: release, categories, carry }, previous, live: true, apiA4: a4 });
  const api = jevbenchScopeArtifact(live.published, 'api', jevScopeClassifier(live.published.systems, live.publishedCarry.rows, previous.artifact.systems, previous.artifact.not_measured));
  const capRows = jevClassRows(api.systems.filter(r => r.ranked), JEV_V16_CLASS_OPTIONS).rows.filter(r => r.inClass);
  for (const [key, page] of livePages) {
    const row = api.systems.find(r => r.key === key);
    assert.equal(page.compositeRank, row.ranked ? row.rank : null, key + ': actual live API rank');
    assert.equal(page.capabilityRank, capRows.some(r => r.row.key === key) ? capRows.findIndex(r => r.row.key === key) + 1 : null, key + ': live capped rank');
  }
  for (const e of addenda.entries) { assert.equal(livePages.get(e.key).nItems, 1500); assert.equal(livePages.get(e.key).full, true); assert.equal(livePages.get(e.key).offsets, null); }
  // Preserve the original historical expectations with an isolated empty-addendum registry.
  const root = await mkdtemp(path.join(tmpdir(), 'bh-cr308-history-'));
  try {
  // The live board needs the whole data/ tree (draw equating, cohort files, ...): mirror it with symlinks, leave out only the addenda registry and the
  // v1.7 folder, so the expectations below stay the pre-v1.7.0 live board with an empty addendum registry in both the PENDING and the PASS state.
  await mirrorDataRoot(path.resolve('data'), path.join(root, 'data'), [['jevbench-api-full-addenda.json'], ['raw', 'benchmarks', 'jevbench', 'v1.7']]);
  await writeFile(path.join(root, 'data/jevbench-api-full-addenda.json'), JSON.stringify({ schema_version: 1, kind: 'jevbench-api-full-addenda', entries: [] }));
  const pages = await readJevbenchA4ModelPages(root);
  assert.deepEqual([...pages.keys()].sort(), [...a4.rows, ...(a4.a5_rows ?? []), ...(a4.full_rows ?? [])].map((r) => r.key).sort());
  assert.equal(pages.get('liquid-d1').full, true);
  assert.equal(pages.get('liquid-d1').nItems, 1500);
  // The pages now follow the assembled live board (v1.7.0 slice), so the ranks include the cohort rows that joined the API board after CR-338 and the two API rows of v1.6.38 (14 -> 29, 8 -> 20, 7 -> 17, 13 -> 27), plus the hosted GLiDE API row of v1.6.40, which ranks above all of them (+1 each: 30, 21, 18, 28).
  assert.equal(pages.get('fastino-glide').compositeRank, 30);
  assert.equal(pages.get('instinct').compositeRank, 21);
  assert.equal(pages.get('instinct').capabilityRank, 18);
  assert.equal(pages.get('openai-decisions').subset, 'A5');
  assert.equal(pages.get('openai-decisions').round, 'score-a5-1');
  assert.equal(pages.get('instinct').row.jevbench_score, 62.24);
  assert.equal(pages.get('classifier-dev-fast').compositeRank, null);
  assert.equal(pages.get('gpt-6-luna').compositeRank, 28);
  assert.ok(pages.get('gpt-6-luna').capabilityOutside);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('the system page serves A4 keys from the API board and keeps the old figures as labelled history', () => {
  const page = src('app/jev-models/[system]/page.tsx');
  assert.match(page, /generateStaticParams[\s\S]*readJevbenchA4ModelPages/);
  assert.match(page, /Previous measurement \(v1\.5\.x, not comparable\)/);
  assert.match(page, /on \{page\.subset \?\? 'A4'\} ∪ P, \{page\.nItems\} items, equated/);
  assert.match(page, /on the full v1\.6\.1 set \(\{page\.nItems\} items\), scored like the other full-set API rows, not equated/);
  assert.ok(page.indexOf('a4Page') < page.indexOf('if (seoRow) return'));
});
