// ranks_fixture_v175.mjs <pass-tree> <out.json>: writes test/fixtures/jevbench-v175-ranks.json.
// Orders (composite A/B/C and the four Capability class lists per view) come from receipts/topfive-after.json (topfive_v175.mjs, an independent computation);
// per-row ranks come from the PASS tree's own assembled board. Same shape as jevbench-v1637-ranks.json.
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const [root, out] = process.argv.slice(2);
if (!root || !out) throw new Error('usage: ranks_fixture_v175.mjs <pass-tree> <out.json>');
process.chdir(root);
const imp = (p) => import(pathToFileURL(`${root}/${p}`).href);
const { readJevbenchV161Release } = await imp('lib/jevbench-v16-release.mjs');
const { readJevbenchV157Release } = await imp('lib/jevbench-v15-release.mjs');
const { assembleJevBoard } = await imp('lib/jevbench-live-board.mjs');
const { jevLiveAllArtifact } = await imp('lib/jevbench-cohort-merge.mjs');
const { jevbenchScopeArtifact, jevScopeClassifier } = await imp('lib/jevbench-scope.mjs');
const [release, previous] = await Promise.all([readJevbenchV161Release(), readJevbenchV157Release()]);
const board = await assembleJevBoard({ release, previous, live: true, apiA4: JSON.parse(readFileSync(`${root}/data/jevbench-api-a4-equated.json`, 'utf8')) });
if (!board.method) throw new Error('the PASS tree does not restate (board.method missing)');
const { published, publishedCarry } = board;
const isApi = jevScopeClassifier(published.systems, publishedCarry.rows, previous.artifact.systems, previous.artifact.not_measured);
const J = new URL('.', import.meta.url).pathname;
const after = JSON.parse(readFileSync(`${J}/receipts/topfive-after.json`, 'utf8')).full_rankings;
const f = { _about: 'v1.7.5 synthetic PASS review roster: every merged-board ranking and rank under the 10 s rule; separate from the unchanged v1.6.37 and earlier fixtures.', views: {}, revision: 'v1.7.5' };
const arts = { all: jevLiveAllArtifact(published, isApi), open: jevbenchScopeArtifact(published, 'open', isApi), api: jevbenchScopeArtifact(published, 'api', isApi) };
for (const [v, a] of Object.entries(arts)) {
  f.views[v] = {
    capability: Object.fromEntries(Object.entries(after[v].capability).map(([k, arr]) => [k, arr.map((r) => r.key)])),
    composite: Object.fromEntries(Object.entries(after[v].composites).map(([o, arr]) => [o, arr.map((r) => r.key)])),
    ranks: Object.fromEntries(a.systems.filter((s) => s.ranked).map((s) => [s.key, [s.rank, s.ranks.A, s.ranks.B, s.ranks.C, s.ranks.capability]])),
  };
}
writeFileSync(out, JSON.stringify(f, null, 1) + '\n');
