import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtemp, mkdir, symlink, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readApiFullAddenda, withApiFullAddenda } from '../lib/jevbench-api-full-addenda.mjs';
import { readJevbenchV161Release } from '../lib/jevbench-v16-release.mjs';
import { readJevbenchV157Release } from '../lib/jevbench-v15-release.mjs';
import { jevWithApiA4Rows, jevbenchScopeArtifact, jevScopeClassifier } from '../lib/jevbench-scope.mjs';
import { withApiRerunSplits } from '../lib/jevbench-api-rerun-cells.mjs';
import { jevClassRows, JEV_V16_CLASS_OPTIONS } from '../lib/jevbench-jev-class.mjs';
import { readJevbenchA4ModelPages } from '../lib/jevbench-a4-model-pages.mjs';

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const a4 = JSON.parse(src('data/jevbench-api-a4-equated.json'));

test('every A4 key gets a model page with the API-board ranks', async () => {
  const livePages = await readJevbenchA4ModelPages();
  const addenda = await readApiFullAddenda();
  assert.deepEqual([...livePages.keys()].sort(), [...a4.rows, ...(a4.a5_rows ?? []), ...(a4.full_rows ?? []), ...addenda.entries.map(e => e.row)].map(r => r.key).sort());
  const [{ artifact: release, carry }, previous] = await Promise.all([readJevbenchV161Release(), readJevbenchV157Release()]);
  const meta = new Map([...previous.artifact.systems, ...carry.rows].map(r => [r.key, r]));
  const merged = withApiFullAddenda(jevWithApiA4Rows(release, withApiRerunSplits(a4), meta), addenda);
  const api = jevbenchScopeArtifact(merged, 'api', jevScopeClassifier(merged.systems, carry.rows, previous.artifact.systems, previous.artifact.not_measured));
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
  await mkdir(path.join(root, 'data'));
  await symlink(path.resolve('data/raw'), path.join(root, 'data/raw'), 'dir');
  await symlink(path.resolve('data/jevbench-api-a4-equated.json'), path.join(root, 'data/jevbench-api-a4-equated.json'));
  await writeFile(path.join(root, 'data/jevbench-api-full-addenda.json'), JSON.stringify({ schema_version: 1, kind: 'jevbench-api-full-addenda', entries: [] }));
  const pages = await readJevbenchA4ModelPages(root);
  assert.deepEqual([...pages.keys()].sort(), [...a4.rows, ...(a4.a5_rows ?? []), ...(a4.full_rows ?? [])].map((r) => r.key).sort());
  assert.equal(pages.get('liquid-d1').full, true);
  assert.equal(pages.get('liquid-d1').nItems, 1500);
  assert.equal(pages.get('fastino-glide').compositeRank, 14); // CR-338 adds Mercury Decide and SPX-CD to the API board
  assert.equal(pages.get('instinct').compositeRank, 8);
  assert.equal(pages.get('instinct').capabilityRank, 7);
  assert.equal(pages.get('openai-decisions').subset, 'A5');
  assert.equal(pages.get('openai-decisions').round, 'score-a5-1');
  assert.equal(pages.get('instinct').row.jevbench_score, 62.24);
  assert.equal(pages.get('classifier-dev-fast').compositeRank, null);
  assert.equal(pages.get('gpt-6-luna').compositeRank, 13);
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
