// Usage: node visibility_v1718.mjs <site tree>  -> JSON: every row of the merged live board and of the /api/jevbench/latest feed
// (key, draw, ranked, listing, ranks), read with the site's own assembleJevBoard / readJevbenchAgentFeed. Run on the PENDING
// worktree (= the v1.7.17 board) and on the synthetic PASS copy (.pass); check_visibility_v1718.py compares them.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const root = path.resolve(process.argv[2] ?? process.cwd());
process.chdir(root);
const imp = (p) => import(pathToFileURL(path.join(root, p)).href);
const { readJevbenchV161Release } = await imp('lib/jevbench-v16-release.mjs');
const { readJevbenchV157Release } = await imp('lib/jevbench-v15-release.mjs');
const { assembleJevBoard } = await imp('lib/jevbench-live-board.mjs');
const { jevScopeClassifier, jevbenchScopeArtifact } = await imp('lib/jevbench-scope.mjs');
const { readJevbenchAgentFeed } = await imp('lib/jevbench-agent-feed.mjs');
const [release, previous] = await Promise.all([readJevbenchV161Release(root), readJevbenchV157Release(root)]);
const board = await assembleJevBoard({ release, previous, live: true, apiA4: JSON.parse(readFileSync(path.join(root, 'data/jevbench-api-a4-equated.json'), 'utf8')), root });
const { published, publishedCarry } = board;
const isApi = jevScopeClassifier(published.systems, publishedCarry.rows, previous.artifact.systems, previous.artifact.not_measured);
const row = (s) => ({ draw: s.draw?.id ?? null, ranked: !!s.ranked, listing: s.listing ?? null, rank: s.rank ?? null, ranks: s.ranks ?? null, not_ranked_because: s.not_ranked_because ?? null, usd_per_1000: s.cost?.usd_per_1000 ?? null, cost_axis: s.axes?.cost ?? null, score_A: s.scores?.A ?? null, intelligence: s.axes?.intelligence ?? null });
const scopes = Object.fromEntries(['open', 'api'].map((sc) => [sc, jevbenchScopeArtifact(published, sc, isApi).systems.map((s) => s.key).sort()]));
const { feed } = await readJevbenchAgentFeed(root);
console.log(JSON.stringify({
  restated_by: published.restated_by ?? null, latest_release: feed.latest_release,
  board: Object.fromEntries(published.systems.map((s) => [s.key, row(s)])),
  orders: Object.fromEntries(Object.entries(published.board ?? {}).map(([m, b]) => [m, b.order])),
  scopes,
  feed: Object.fromEntries(feed.systems.map((s) => [s.key, { draw: s.draw?.id ?? null, ranked: s.ranked, listing: s.listing, rank: s.rank, open_board_rank: s.open_board_rank, api_board_rank: s.api_board_rank, capability_rank: s.capability.rank, open_capability_rank: s.capability.open_board_rank, not_ranked_because: s.not_ranked_because, composite_score: s.composite_score }])),
}, null, 1));
