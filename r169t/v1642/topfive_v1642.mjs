// Usage: cd <site tree> && node topfive_v1642.mjs  -> JSON of top fives (and every watched row's position) on the
// merged live board; mirrors the v1.6.36 production assembly and compares all seven rankings in all three scopes.
import { readFileSync } from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const imp = (p) => import(path.join(root, p));
const { readJevbenchV161Release } = await imp('lib/jevbench-v16-release.mjs');
const { readJevbenchV157Release } = await imp('lib/jevbench-v15-release.mjs');
const { jevWithApiA4Rows, jevScopeClassifier, jevbenchScopeArtifact } = await imp('lib/jevbench-scope.mjs');
const { withApiRerunSplits } = await imp('lib/jevbench-api-rerun-cells.mjs');
const { readApiFullAddenda, withApiFullAddenda } = await imp('lib/jevbench-api-full-addenda.mjs');
const { readCohortRows, jevWithCohortRows, jevLiveAllArtifact } = await imp('lib/jevbench-cohort-merge.mjs');
const { readCarryAdditions, withCarryAdditions } = await imp('lib/jevbench-carry-additions.mjs');
const { jevClassRows, JEV_V16_CLASS_OPTIONS } = await imp('lib/jevbench-jev-class.mjs');
const WATCH = (process.env.WATCH_KEYS || '').split(',').filter(Boolean);
const apiA4 = JSON.parse(readFileSync(path.join(root, 'data/jevbench-api-a4-equated.json'), 'utf8'));
const [{ artifact: rel, carry: relCarry }, previous] = await Promise.all([readJevbenchV161Release(), readJevbenchV157Release()]);
const a4Meta = new Map([...previous.artifact.systems, ...relCarry.rows].map((r) => [r.key, r]));
const addenda = await readApiFullAddenda();
let m = jevWithApiA4Rows(rel, withApiRerunSplits(apiA4), a4Meta);
if (addenda.entries.length) m = withApiFullAddenda(m, addenda);
const logs = [];
const cohort = await readCohortRows(root, (x) => logs.push(x));
m = jevWithCohortRows(m, cohort);
const a4Keys = new Set(m.systems.map((s) => s.key));
const carryBase = withCarryAdditions(relCarry, await readCarryAdditions(), a4Keys);
const carry = { ...carryBase, rows: carryBase.rows.filter((r) => !a4Keys.has(r.key)) };
const isApi = jevScopeClassifier(m.systems, carry.rows, previous.artifact.systems, previous.artifact.not_measured);
const views = { all: jevLiveAllArtifact(m, isApi), open: jevbenchScopeArtifact(m, 'open', isApi), api: jevbenchScopeArtifact(m, 'api', isApi) };
const out = { cohort_rows: cohort.rows.length, cohort_releases: [...new Set(cohort.rows.map((r) => r.draw.release))].sort(), cohort_log: logs, merged_rows: m.systems.length, views: {}, full_rankings: {} };
for (const [name, art] of Object.entries(views)) {
  const ranked = art.systems.filter((s) => s.ranked);
  const by = new Map(art.systems.map((s) => [s.key, s]));
  for (const metric of ['A', 'B', 'C', 'capability']) {
    const leaked = (art.board?.[metric]?.order ?? []).filter(k => by.get(k)?.ranked === false);
    if (leaked.length) throw new Error(`${name}.${metric}: unranked rows in order: ${leaked}`);
  }
  for (const key of (process.env.UNRANKED_KEYS ?? 'nemotron-deciffusion-8b-v2,trio-spark-v1.3,bongard-mini,jevora-9b-v1,kev-9b-v2,nagi-huge,ryotide-gemma,tde-general-large,purplemist-flash-1.0').split(',').filter(Boolean)) if (ranked.some(s => s.key === key)) throw new Error(`${name}: unranked row ${key} ranked`);
  const v = { ranked: ranked.length, rows: art.systems.length, watch_in_view: WATCH.filter((k) => by.has(k)),
    watch_listing: Object.fromEntries(WATCH.filter((k) => by.has(k)).map((k) => [k, { listing: by.get(k).listing ?? null, ranked: by.get(k).ranked ?? null, api: isApi(by.get(k)) }])) };
  for (const o of ['A', 'B', 'C']) {
    const ord = art.board[o].order.filter((k) => ranked.some((s) => s.key === k));
    v[`composite_${o}`] = ord.slice(0, 5).map((k) => [k, +by.get(k).scores[o].toFixed(3)]);
    v[`composite_${o}_pos`] = Object.fromEntries(WATCH.map((k) => [k, ord.indexOf(k) + 1 || null]));
  }
  for (const [label, opt] of [['capability_official_caps', {}], ['capability_no_caps', { costFactor: Infinity, latencyFactor: Infinity }],
                              ['capability_cost_none_latency_2x', { costFactor: Infinity }], ['capability_latency_none', { latencyFactor: Infinity }]]) {
    const { rows } = jevClassRows(ranked, { ...JEV_V16_CLASS_OPTIONS, ...opt });
    const inc = rows.filter((r) => r.inClass);
    v[label] = inc.slice(0, 5).map((r) => [r.row.key, +r.capability.toFixed(3)]);
    v[`${label}_pos`] = Object.fromEntries(WATCH.map((k) => {
      const pos = inc.findIndex((r) => r.row.key === k) + 1;
      return [k, pos ? { pos, of: inc.length } : { pos: null, reasons: rows.find((r) => r.row.key === k)?.reasons ?? 'not in this scope' }];
    }));
    const jev = inc.findIndex((r) => r.row.key === 'jev-1.13.0') + 1; if (jev) v[`${label}_jev_1_13_pos`] = jev;
  }
  out.views[name] = v;
  const full = { composites: {}, capability: {} };
  for (const o of ['A', 'B', 'C']) {
    const order = art.board[o].order.filter((k) => ranked.some((s) => s.key === k));
    full.composites[o] = order.map((k, i) => {
      const row = by.get(k);
      return { rank: i + 1, key: k, display: row.display, score: row.scores[o], capability: row.capability,
        axes: row.axes, cost_usd_per_1000: row.cost?.usd_per_1000 ?? null };
    });
  }
  for (const [label, opt] of [['official_caps', {}], ['no_caps', { costFactor: Infinity, latencyFactor: Infinity }],
                              ['cost_off_latency_2x', { costFactor: Infinity }], ['latency_none', { latencyFactor: Infinity }]]) {
    const { rows } = jevClassRows(ranked, { ...JEV_V16_CLASS_OPTIONS, ...opt });
    full.capability[label] = rows.filter((r) => r.inClass).map((r, i) => ({ rank: i + 1, key: r.row.key, display: r.row.display,
      score: r.capability, axes: r.row.axes, cost_usd_per_1000: r.row.cost?.usd_per_1000 ?? null }));
  }
  full.extra_capability = {};
  for (const [label,opt] of [['cost_7x',{costFactor:7}],['cost_10x',{costFactor:10}],['rank_field',{costFactor:Infinity,latencyFactor:Infinity}],['cost_7x_latency_none',{costFactor:7,latencyFactor:Infinity}],['cost_10x_latency_none',{costFactor:10,latencyFactor:Infinity}]]) {
    const {rows} = jevClassRows(ranked,{...JEV_V16_CLASS_OPTIONS,...opt});
    full.extra_capability[label]=rows.filter(r=>r.inClass).map((r,i)=>({rank:i+1,key:r.row.key,display:r.row.display,score:r.capability,axes:r.row.axes}));
  }
  out.full_rankings[name] = full;
}
console.log(JSON.stringify(out, null, 1));
