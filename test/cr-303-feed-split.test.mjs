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
  // v1.6.32: paid Chon-1.0-12B enters the capped open Capability board above the carried rows.
  assert.equal(get(feed, 'quyet-1-0-large').capability.open_board_rank, 3);
  // v1.6.28: basal-omni-1.0-ultra (Capability 82.5) enters the open board at #1, so every open-board rank below it moves down by one.
  // CR-338 adds decisio and René to the open board, and the merged live board adds the cohort rows (16 Oct 2026), shifting these older rows below the new entrants.
  assert.equal(get(feed, 'h2o-lightning-4b').capability.open_board_rank, 11);
  assert.equal(get(feed, 'surogate-rune-26b-a4b-v3-v16').capability.open_board_rank, 13);
  assert.equal(get(feed, 'xor-26b-a4b').capability.open_board_rank, 16);
  assert.equal(get(feed, 'torchcast-decision-12b').capability.open_board_rank, 18);
  // v1.6.24 (16 Oct 2026): the paid hosted kettei-fat (#1) and kettei-chub join the combined Capability ranking above it (22 -> 24);
  // they are API rows, so its open-board rank (15 at the time) did not move. v1.6.25: the paid hosted Celeris-1 Decision (Capability 73.6)
  // joins above it as well (24 -> 25); the StartLux rows are over the cost cap and take no capped Capability rank.
  // v1.6.26: the hosted Nimble-v4-max (Capability 79.7) is re-priced inside the cost cap and joins above it (25 -> 26); the
  // Batch BCD rows above it by Capability (nagi-enormous) are over the cap. v1.6.27: the hosted Jev 1.14.0 (Capability 75.0,
  // inside both caps) joins above it (26 -> 27); Verdin-4B (59.5) sits below it. v1.6.28: the self-hosted basal-omni-1.0-ultra
  // (Capability 82.5, inside both caps) joins above it (27 -> 28); the unranked PurpleMIST-Flash-1.0 takes no rank.
  // v1.6.29: paid Torchcast Decision 4B v1.2 (Capability 72.6) joins above these rows (28 -> 29); Vega-U is below the latency cap cutoff.
  // v1.6.30: the common cost basis puts subq-snap-preview (Capability 81.5) inside the official cost cap, above these rows (29 -> 30);
  // amos-1-medium also moves inside the cap but sits below them by Capability.
  // v1.6.36: the paid hosted Myles-G 31B (Capability 78.8, API row, inside both caps) joins above it (31 -> 32); HS1 (65.0) and the two NeoHorse rows sit below it.
  assert.equal(get(feed, 'torchcast-decision-12b').capability.rank, 32);
  const ranks = feed.systems.map((s) => s.capability.open_board_rank).filter((r) => r != null).sort((a, b) => a - b);
  assert.equal(get(feed, 'basal-omni-1.0-ultra').capability.open_board_rank, 2);
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
