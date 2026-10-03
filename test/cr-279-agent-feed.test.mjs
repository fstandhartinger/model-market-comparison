import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { readCurrentJevbench, CURRENT_JEVBENCH_PAGE } from '../lib/jevbench-current.mjs';
import { readJevbenchAgentFeed, projectJevbenchFeed } from '../lib/jevbench-agent-feed.mjs';
import { jevClassRows } from '../lib/jevbench-jev-class.mjs';
import { jevV15BoardSystem } from '../lib/jevbench-v15-board.mjs';
const { artifact, sha256 } = await readCurrentJevbench();
const { feed, bytes, sha256: feedHash } = await readJevbenchAgentFeed();

test('current feed shares the live page release pointer and exactly its published result keys', async () => {
  const page = await readFile(new URL('../app/jev-models/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /await readCurrentJevbench\(\)/);
  assert.match(page, /versionPath=\{CURRENT_JEVBENCH_PAGE\}/);
  assert.equal(feed.revision, artifact.revision);
  assert.equal(feed.source.frozen_page, CURRENT_JEVBENCH_PAGE);
  assert.equal(feed.source.artifact_sha256, sha256);
  assert.deepEqual(feed.systems.map(r => r.key), artifact.systems.map(r => r.key));
  assert.equal(feedHash, createHash('sha256').update(bytes).digest('hex'));
  assert.deepEqual(JSON.parse(bytes), feed);
});

test('feed preserves published axes, composite ranks and price basis, and uses page Capability policy', () => {
  const view = jevClassRows(artifact.systems.map(jevV15BoardSystem));
  const rankedKeys = view.rows.filter(r => r.inClass && r.row.ranked).map(r => r.row.key);
  for (const [i, row] of feed.systems.entries()) {
    const original = artifact.systems[i];
    assert.deepEqual(row.axes, original.axes);
    assert.equal(row.rank, original.rank ?? null);
    assert.equal(row.composite_score, original.jevbench_score ?? null);
    assert.equal(row.price.basis, original.cost?.basis ?? null);
    assert.equal(row.price.usd_per_1000_decisions, original.cost?.usd_per_1000 ?? null);
    const expectedRank = rankedKeys.indexOf(row.key) + 1;
    assert.equal(row.capability.rank, expectedRank || null);
    assert.equal(row.capability.eligible, expectedRank > 0);
    if (!row.ranked) assert.equal(row.capability.rank, null);
  }
});

test('projection cannot publish item data or arbitrary nested draft fields', () => {
  const contaminated = structuredClone(artifact);
  contaminated.sealed_items = ['private sentinel'];
  contaminated.systems[0].predictions = ['private sentinel'];
  contaminated.systems[0].cost.draft = 'private sentinel';
  contaminated.systems[0].axes.draft = 'private sentinel';
  assert.doesNotMatch(JSON.stringify(projectJevbenchFeed(contaminated, sha256)), /private sentinel|sealed_items|predictions/);
  contaminated.status = 'preview';
  assert.throws(() => projectJevbenchFeed(contaminated, sha256), /released/);
});

test('llms guidance advertises the current feed and compare keys; legacy response is marked', async () => {
  const llms = await readFile(new URL('../app/llms.txt/route.ts', import.meta.url), 'utf8');
  const legacy = await readFile(new URL('../app/api/jevbench/route.ts', import.meta.url), 'utf8');
  assert.match(llms, /\/api\/jevbench\/latest/);
  assert.match(llms, /## For agents/);
  assert.match(llms, /\?compare=a,b#compare/);
  assert.match(llms, /\/submit/);
  assert.match(legacy, /legacy-frozen-v1/);
  assert.match(legacy, /successor-version/);
});
