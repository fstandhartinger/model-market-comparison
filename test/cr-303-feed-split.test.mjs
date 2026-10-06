import test from 'node:test';
import assert from 'node:assert/strict';
import { readJevbenchAgentFeed } from '../lib/jevbench-agent-feed.mjs';
import { readJevbenchSeoData } from '../lib/jevbench-seo.mjs';
import { jevbenchFaq } from '../lib/jevbench-seo-jsonld.mjs';
import { jevbenchLlmsFull } from '../lib/jevbench-llms-full.mjs';

const get = (feed, key) => feed.systems.find((s) => s.key === key);

test('feed carries board and open-board rank next to the unchanged combined rank', async () => {
  const { feed } = await readJevbenchAgentFeed();
  assert.deepEqual(feed.boards, { open: '/jev-models', api: '/jev-models/api' });
  assert.equal(get(feed, 'sage-1.3.0').board, 'api');
  assert.equal(get(feed, 'sage-1.3.0').capability.open_board_rank, null);
  assert.equal(get(feed, 'jev-1.13.0').board, 'reference');
  assert.equal(get(feed, 'jev-1.13.0').capability.open_board_rank, null);
  assert.equal(get(feed, 'quyet-1-0-large').capability.open_board_rank, 1);
  assert.equal(get(feed, 'torchcast-decision-12b').capability.open_board_rank, 3);
  assert.equal(get(feed, 'torchcast-decision-12b').capability.rank, 5);
  const ranks = feed.systems.map((s) => s.capability.open_board_rank).filter((r) => r != null).sort((a, b) => a - b);
  assert.deepEqual(ranks, ranks.map((_, i) => i + 1));
  for (const s of feed.systems) if (s.board !== 'open') assert.equal(s.capability.open_board_rank, null);
});

test('llms-full and FAQ use the open-weights board', async () => {
  const text = await jevbenchLlmsFull();
  assert.match(text, /## Open-weights board \(\/jev-models\)/);
  assert.match(text, /## API offerings \(ranked separately on https:\/\/benchmarkheaven\.com\/jev-models\/api\)/);
  assert.doesNotMatch(text, /## Full current ranking/);
  assert.match(text, /\| reference, not ranked \| Jev 1\.13\.0/);
  assert.match(text, /\| see API leaderboard \| Sage/);
  const open = text.slice(text.indexOf('## Open-weights board'), text.indexOf('## API offerings'));
  assert.doesNotMatch(open, /\| Sage/);
  const data = await readJevbenchSeoData();
  const faq = jevbenchFaq(data);
  assert.match(faq[1].answer, new RegExp(`^Quyet.*ranks #1 on the open-weights board.*among ${data.openRanked.length} ranked open-weights models`));
  assert.ok(data.openRanked.length >= 61, 'ranked open-weights models only grow with addenda (61 at v1.6.1)');
  // the exact open-board count is pinned above; it must never include the API offerings
  assert.ok(data.openRanked.every((row) => row.board === 'open'), 'open-weights count excludes API offerings');
});
