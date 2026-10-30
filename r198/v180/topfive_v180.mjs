// Usage: cd <site tree> && node topfive_v180.mjs  -> JSON of the top fives (and every watched row's position) of the live board, built with the site's own assembleJevBoard
// so the before tree (v1.7.23 PASS, v1.8.0 PENDING) and the after tree (synthetic v1.8.0 PASS) are read by exactly the same code.
// 36 merged variants (3 scopes x 12 lists, incl. cost caps of 7x/10x the reference cost (Jev 1.13.0; the official cap is 2x) with no latency cap) + 4 release-board lists (= the all-scope A/B/C/Capability lists, by definition for v1.7.23).
import { readFileSync } from 'node:fs';
import path from 'node:path';
const root = process.argv[2] ?? process.cwd();
process.chdir(root);
const imp = (p) => import(path.join(root, p));
const { readJevbenchV161Release } = await imp('lib/jevbench-v16-release.mjs');
const { readJevbenchV157Release } = await imp('lib/jevbench-v15-release.mjs');
const { jevScopeClassifier, jevbenchScopeArtifact } = await imp('lib/jevbench-scope.mjs');
const { jevLiveAllArtifact } = await imp('lib/jevbench-cohort-merge.mjs');
const { assembleJevBoard } = await imp('lib/jevbench-live-board.mjs');
const { jevClassRows, JEV_V16_CLASS_OPTIONS } = await imp('lib/jevbench-jev-class.mjs');
const WATCH = (process.env.WATCH_KEYS || '').split(',').filter(Boolean);
const apiA4 = JSON.parse(readFileSync(path.join(root, 'data/jevbench-api-a4-equated.json'), 'utf8'));
const [release, previous] = await Promise.all([readJevbenchV161Release(), readJevbenchV157Release()]);
const logs = [];
const origError = console.error; console.error = (...a) => logs.push(a.join(' '));
const board = await assembleJevBoard({ release, previous, live: true, apiA4, root });
console.error = origError;
const { published, publishedCarry } = board;
const isApi = jevScopeClassifier(published.systems, publishedCarry.rows, previous.artifact.systems, previous.artifact.not_measured);
const views = { all: jevLiveAllArtifact(published, isApi), open: jevbenchScopeArtifact(published, 'open', isApi), api: jevbenchScopeArtifact(published, 'api', isApi) };
const out = { restated_by: published.restated_by ?? null, merged_rows: published.systems.length, cohort_log: logs, views: {}, full_rankings: {}, release_lists: {} };
for (const [name, art] of Object.entries(views)) {
  const ranked = art.systems.filter((s) => s.ranked);
  const by = new Map(art.systems.map((s) => [s.key, s]));
  for (const metric of ['A', 'B', 'C']) {
    const leaked = (art.board?.[metric]?.order ?? []).filter((k) => by.get(k)?.ranked === false);
    if (leaked.length) throw new Error(`${name}.${metric}: unranked rows in order: ${leaked}`);
  }
  const v = { ranked: ranked.length, rows: art.systems.length, watch_in_view: WATCH.filter((k) => by.has(k)),
    watch_listing: Object.fromEntries(WATCH.filter((k) => by.has(k)).map((k) => [k, { listing: by.get(k).listing ?? null, ranked: by.get(k).ranked ?? null, api: isApi(by.get(k)) }])) };
  for (const o of ['A', 'B', 'C']) {
    const ord = art.board[o].order.filter((k) => ranked.some((s) => s.key === k));
    v[`composite_${o}`] = ord.slice(0, 5).map((k) => [k, +by.get(k).scores[o].toFixed(3)]);
    v[`composite_${o}_pos`] = Object.fromEntries(WATCH.map((k) => [k, ord.indexOf(k) + 1 || null]));
  }
  out.views[name] = v;
  const full = { composites: {}, capability: {}, extra_capability: {} };
  for (const o of ['A', 'B', 'C']) {
    const order = art.board[o].order.filter((k) => ranked.some((s) => s.key === k));
    full.composites[o] = order.map((k, i) => ({ rank: i + 1, key: k, display: by.get(k).display, score: by.get(k).scores[o], capability: by.get(k).capability, axes: by.get(k).axes, cost_usd_per_1000: by.get(k).cost?.usd_per_1000 ?? null }));
  }
  for (const [label, opt] of [['official_caps', {}], ['no_caps', { costFactor: Infinity, latencyFactor: Infinity }], ['cost_off_latency_2x', { costFactor: Infinity }], ['latency_none', { latencyFactor: Infinity }]]) {
    const { rows } = jevClassRows(ranked, { ...JEV_V16_CLASS_OPTIONS, ...opt });
    full.capability[label] = rows.filter((r) => r.inClass).map((r, i) => ({ rank: i + 1, key: r.row.key, display: r.row.display, score: r.capability, axes: r.row.axes, cost_usd_per_1000: r.row.cost?.usd_per_1000 ?? null }));
  }
  for (const [label, opt] of [['cost_7x', { costFactor: 7 }], ['cost_10x', { costFactor: 10 }], ['rank_field', { costFactor: Infinity, latencyFactor: Infinity }], ['cost_7x_latency_none', { costFactor: 7, latencyFactor: Infinity }], ['cost_10x_latency_none', { costFactor: 10, latencyFactor: Infinity }]]) {
    const { rows } = jevClassRows(ranked, { ...JEV_V16_CLASS_OPTIONS, ...opt });
    full.extra_capability[label] = rows.filter((r) => r.inClass).map((r, i) => ({ rank: i + 1, key: r.row.key, display: r.row.display, score: r.capability, axes: r.row.axes }));
  }
  out.full_rankings[name] = full;
}
// release-board lists: the all-scope official lists (for v1.7.23 the release board IS the merged all-scope board)
const all = views.all;
const rankedAll = all.systems.filter((s) => s.ranked);
for (const o of ['A', 'B', 'C']) out.release_lists[o] = all.board[o].order.filter((k) => rankedAll.some((s) => s.key === k));
out.release_lists.capability = rankedAll.slice().sort((x, y) => x.ranks.capability - y.ranks.capability).map((s) => s.key);
out.pending_in_lists = rankedAll.filter((s) => s.listing === 'remeasure-pending').map((s) => s.key);
console.log(JSON.stringify(out, null, 1));
