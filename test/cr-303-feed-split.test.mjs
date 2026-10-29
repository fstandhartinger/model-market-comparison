import { hasPublishedJevbenchV1716Release } from '../lib/jevbench-v1716-release.mjs';
import { hasPublishedJevbenchV1715Release } from '../lib/jevbench-v1715-release.mjs';
import { hasPublishedJevbenchV1714Release } from '../lib/jevbench-v1714-release.mjs';
import { hasPublishedJevbenchV1713Release } from '../lib/jevbench-v1713-release.mjs';
import { hasPublishedJevbenchV1711Release } from '../lib/jevbench-v1711-release.mjs';
import { hasPublishedJevbenchV1710Release } from '../lib/jevbench-v1710-release.mjs';
import { hasPublishedJevbenchV179Release } from '../lib/jevbench-v179-release.mjs';
import { hasPublishedJevbenchV178Release } from '../lib/jevbench-v178-release.mjs';
import { hasPublishedJevbenchV177Release } from '../lib/jevbench-v177-release.mjs';
import { hasPublishedJevbenchV176Release } from '../lib/jevbench-v176-release.mjs';
import { hasPublishedJevbenchV175Release } from '../lib/jevbench-v175-release.mjs';
import { hasPublishedJevbenchV174Release } from '../lib/jevbench-v174-release.mjs';
import { hasPublishedJevbenchV173Release } from '../lib/jevbench-v173-release.mjs';
import { hasPublishedJevbenchV172Release } from '../lib/jevbench-v172-release.mjs';
import { readFile } from 'node:fs/promises';
import { hasPublishedJevbenchV171Release } from '../lib/jevbench-v171-release.mjs';
import test from 'node:test';
import { V1638_ROW_SPEC } from '../lib/jevbench-v1638-release.mjs';
import { V1639_ROW_SPEC } from '../lib/jevbench-v1639-release.mjs';
import { V1640_ROW_SPEC } from '../lib/jevbench-v1640-release.mjs';
import { V1643_ROW_SPEC } from '../lib/jevbench-v1643-release.mjs';
import { V1642_ROW_SPEC } from '../lib/jevbench-v1642-release.mjs';
import assert from 'node:assert/strict';
import { readJevbenchAgentFeed } from '../lib/jevbench-agent-feed.mjs';
import { readJevbenchSeoData } from '../lib/jevbench-seo.mjs';
import { jevbenchFaq } from '../lib/jevbench-seo-jsonld.mjs';
import { jevbenchLlmsFull } from '../lib/jevbench-llms-full.mjs';
import { hasPublishedJevbenchV170Release } from '../lib/jevbench-v170-release.mjs';

const get = (feed, key) => feed.systems.find((s) => s.key === key);

test('feed carries board and open-board rank next to the unchanged combined rank', async () => {
  const { feed } = await readJevbenchAgentFeed();
  // v1.7.0 (10 s rule) restates the whole board once it is published: the open-board order moves (H2O-Lightning-31B is #1, Basal Omni #2, arcbright-elf-1-31b, Capability 81.8, enters at #3) and the two hosted Super Decider rows join the capped combined board: [open-board rank, and for torchcast the combined Capability rank]; v1.6.39 values before that.
  const v170 = await hasPublishedJevbenchV170Release();
  let want = v170 ? { quyet: [4], h2o: [15], surogate: [16], xor: [23], torchcast: [19, 38], basal: [2] } : { quyet: [4], h2o: [13], surogate: [15], xor: [18], torchcast: [20, 32 + Number(V1638_ROW_SPEC['drex-max'].ranked) + Number(V1639_ROW_SPEC['h2o-lightning-31b'].ranked) + Number(V1640_ROW_SPEC['fastino-glide-api'].ranked) + Number(V1642_ROW_SPEC['torchcast-decision-4b-v1.3'].ranked) + Number(V1643_ROW_SPEC['subq-snap-1.1'].ranked)], basal: [3] };
  if ((await hasPublishedJevbenchV173Release()) || (await hasPublishedJevbenchV172Release()) || (await hasPublishedJevbenchV171Release())) {
    const fixture = JSON.parse(await readFile(`test/fixtures/jevbench-${(await hasPublishedJevbenchV1716Release()) ? 'v1716' : (await hasPublishedJevbenchV1715Release()) ? 'v1715' : (await hasPublishedJevbenchV1714Release()) ? 'v1714' : (await hasPublishedJevbenchV1713Release()) ? 'v1713' : (await hasPublishedJevbenchV1711Release()) ? 'v1711' : (await hasPublishedJevbenchV1710Release()) ? 'v1710' : (await hasPublishedJevbenchV179Release()) ? 'v179' : (await hasPublishedJevbenchV178Release()) ? 'v178' : (await hasPublishedJevbenchV177Release()) ? 'v177' : (await hasPublishedJevbenchV176Release()) ? 'v176' : (await hasPublishedJevbenchV175Release()) ? 'v175' : (await hasPublishedJevbenchV174Release())?'v174':(await hasPublishedJevbenchV173Release())?'v173':(await hasPublishedJevbenchV172Release())?'v172':'v171'}-ranks.json`,'utf8'));
    const rank = (scope,key) => fixture.views[scope].capability.official_caps.indexOf(key)+1;
    want = {quyet:[rank('open','quyet-1-0-large')],h2o:[rank('open','h2o-lightning-4b')],surogate:[rank('open','surogate-rune-26b-a4b-v3-v16')],xor:[rank('open','xor-26b-a4b')],torchcast:[rank('open','torchcast-decision-12b'),rank('all','torchcast-decision-12b')],basal:[rank('open','basal-omni-1.0-ultra')]};
  }
  assert.deepEqual(feed.boards, { open: '/jev-models', api: '/jev-models/api' });
  assert.equal(get(feed, 'sage-1.3.0').board, 'api');
  assert.equal(get(feed, 'sage-1.3.0').capability.open_board_rank, null);
  assert.equal(get(feed, 'jev-1.13.0').board, 'reference');
  assert.equal(get(feed, 'jev-1.13.0').capability.open_board_rank, null);
  // v1.6.32: paid Chon-1.0-12B enters the capped open Capability board above the carried rows.
  // v1.6.39: H2O-Lightning-31B (Capability 85.2, self-hosted, inside both caps) enters the open board at #2, one place above Quyet.
  assert.equal(get(feed, 'quyet-1-0-large').capability.open_board_rank, want.quyet[0]);
  // v1.6.28: basal-omni-1.0-ultra (Capability 82.5) enters the open board at #1, so every open-board rank below it moves down by one.
  // CR-338 adds decisio and René to the open board, and the merged live board adds the cohort rows (16 Oct 2026), shifting these older rows below the new entrants.
  assert.equal(get(feed, 'h2o-lightning-4b').capability.open_board_rank, want.h2o[0]);
  assert.equal(get(feed, 'surogate-rune-26b-a4b-v3-v16').capability.open_board_rank, want.surogate[0]);
  assert.equal(get(feed, 'xor-26b-a4b').capability.open_board_rank, want.xor[0]);
  assert.equal(get(feed, 'torchcast-decision-12b').capability.open_board_rank, want.torchcast[0]);
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
  // v1.6.38: Drex and Myles-G 12B join the capped combined board; open-board ranks above Iota are unchanged.
  // v1.6.36: the paid hosted Myles-G 31B (Capability 78.8, API row, inside both caps) joins above it (31 -> 32); HS1 (65.0) and the two NeoHorse rows sit below it.
  assert.equal(get(feed, 'torchcast-decision-12b').capability.rank, want.torchcast[1]);
  const ranks = feed.systems.map((s) => s.capability.open_board_rank).filter((r) => r != null).sort((a, b) => a - b);
  assert.equal(get(feed, 'basal-omni-1.0-ultra').capability.open_board_rank, want.basal[0]);
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
  assert.ok(faq[1].answer.startsWith(`${data.ranked[0].display} ranks #1 on the open-weights board`));
  assert.match(faq[1].answer, new RegExp(`among ${data.openRanked.length} ranked open-weights models in ${data.artifact.revision.replace(/\./g, '\\.')}\\.`));
  assert.ok(data.openRanked.length >= 61, 'ranked open-weights models only grow with addenda (61 at v1.6.1)');
  // the exact open-board count is pinned above; it must never include the API offerings
  assert.ok(data.openRanked.every((row) => row.board === 'open'), 'open-weights count excludes API offerings');
});
