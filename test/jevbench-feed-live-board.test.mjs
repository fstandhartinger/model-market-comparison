// The agent feed (/api/jevbench/latest) lists exactly the merged live board the pages render.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { readJevbenchAgentFeed } from '../lib/jevbench-agent-feed.mjs';
import { assembleJevBoard, readLatestJevbenchRelease } from '../lib/jevbench-live-board.mjs';
import { readJevbenchV161Release } from '../lib/jevbench-v16-release.mjs';
import { readJevbenchV157Release } from '../lib/jevbench-v15-release.mjs';
import { jevScopeClassifier } from '../lib/jevbench-scope.mjs';
import { readDrawEquating, jevLiveAllArtifact } from '../lib/jevbench-cohort-merge.mjs';
import { jevbenchScopeArtifact, jevRowScope } from '../lib/jevbench-scope.mjs';
import { jevClassRows, JEV_V16_CLASS_OPTIONS } from '../lib/jevbench-jev-class.mjs';
import { jevV15BoardSystem } from '../lib/jevbench-v15-board.mjs';

const { feed, bytes, sha256 } = await readJevbenchAgentFeed();
const rel = await readJevbenchV161Release();
const previous = await readJevbenchV157Release();
const apiA4 = JSON.parse(await readFile(new URL('../data/jevbench-api-a4-equated.json', import.meta.url), 'utf8'));
const board = await assembleJevBoard({ release: { artifact: rel.artifact, categories: rel.categories, carry: rel.carry }, previous, live: true, apiA4 });
board.isApi = jevScopeClassifier(board.published.systems, board.publishedCarry.rows, previous.artifact.systems, previous.artifact.not_measured);
const byKey = new Map(feed.systems.map((s) => [s.key, s]));

test('feed key set equals the merged live board and the page shares the assembly', async () => {
  assert.deepEqual(feed.systems.map((s) => s.key), board.published.systems.map((s) => s.key));
  assert.equal(new Set(feed.systems.map((s) => s.key)).size, feed.systems.length);
  assert.ok(feed.systems.length >= 206);
  for (const key of ['liquid-d1-ultra', 'vllm-sr-d3', 'subq-snap-preview']) assert.ok(byKey.has(key), key);
  const route = await readFile(new URL('../components/JevBenchV16ReleaseRoute.tsx', import.meta.url), 'utf8');
  assert.match(route, /assembleJevBoard\(/);
  const feedSrc = await readFile(new URL('../lib/jevbench-agent-feed.mjs', import.meta.url), 'utf8');
  assert.match(feedSrc, /assembleJevBoard\([^\n]*live: true/);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), sha256);
});

test('latest_release is the newest release of the draw table, not a hard-coded list', async () => {
  const { draws } = await readDrawEquating();
  const newest = draws.map((d) => d.latest_release).sort((a, b) => a.localeCompare(b, 'en', { numeric: true })).at(-1);
  assert.equal(feed.revision, newest);
  assert.equal(feed.latest_release, newest);
  assert.equal(feed.latest_release_page, `/jev-models/${newest}`);
  assert.equal(feed.base_release, 'v1.6.1');
  assert.equal(await readLatestJevbenchRelease('v1.6.1'), newest);
});

test('feed ranks equal the ranks of the open and API Capability default views', () => {
  const opts = { ...JEV_V16_CLASS_OPTIONS, nearCapPrecision: true };
  for (const scope of ['open', 'api']) {
    const art = jevbenchScopeArtifact(board.published, scope, board.isApi);
    const { rows } = jevClassRows(art.systems.map(jevV15BoardSystem), opts);
    let rank = 0;
    for (const r of rows) {
      const expected = r.inClass && r.row.ranked && jevRowScope(r.row, board.isApi) === scope ? ++rank : null;
      assert.equal(byKey.get(r.row.key).capability[`${scope}_board_rank`], expected, `${scope} ${r.row.key}`);
    }
    assert.ok(rank > 0);
  }
  const all = jevLiveAllArtifact(board.published, board.isApi);
  for (const s of all.systems) {
    assert.equal(byKey.get(s.key).rank, s.rank ?? null, s.key);
    assert.equal(byKey.get(s.key).board, jevRowScope(s, board.isApi), s.key);
  }
});

test('rows carry their draw so agents can tell which draw a row was measured on', () => {
  const row = byKey.get('liquid-d1-ultra');
  assert.equal(row.measured_in, 'v1.6.21');
  // draw.release follows the draw's newest same-draw release (v1.6.21 at first, v1.6.22 since), never a fixed version
  assert.equal(row.draw.id, 'v1.6-regular-20261012');
  assert.ok(/^v1\.6\.\d+$/.test(row.draw.release) && row.draw.release >= 'v1.6.21', row.draw.release);
  assert.equal(byKey.get('jev-1.13.0').draw, null);
});
