// CR-92 (Florian 2026-09-19 ~13:20 UTC): JevBench v1.2 final — the JevBench Score. Four axes (Intelligence, Calibration,
// Speed, Cost), 25 % each, geometric mean. Every number on /jev-models is read from the committed artifact (= results/v1.2/ at
// tag v1.2 of the public repo). This module validates it by recomputing every axis from its published inputs and every score
// from its axes — to prove the published numbers, never to replace them — and only selects, orders and labels.
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { scanForbidden } from './jevbench.mjs';

export const JEVBENCH_V12_ARTIFACT = 'data/raw/benchmarks/jevbench/v1.2/jevbench-v1.2-results.json';
// CR-95 (2026-09-19): v1.2.2 adds Laya, jeff, GLiNER2, openJev Verdict and classifier.dev (fast tier) on the same frozen
// items and unchanged scoring; no other row changed. (CR-93 added djev in v1.2.1.)
export const JEVBENCH_V12_SHA256 = '5b9d5d0355d7c5c754571dbbf2e31c0e85afcb489d31ccfecccfa22b671783f3'; // = results/v1.2/jevbench-v1.2-results.json at tag v1.2.2
import { TIERS, AXES, TIER_WEIGHTS, intelligence, adjustedLatency, speedPoint, speedScore, costScore, geometric } from './jevbench-v12-score.mjs';
export { TIERS, AXES, TIER_WEIGHTS, intelligence, adjustedLatency, speedPoint, speedScore, costScore, geometric };
const EP_KINDS = ['api', 'gpu', 'demo', 'cpu'];

const fail = (message) => { throw new Error(`JevBench v1.2 artifact: ${message}`); };
const near = (a, b) => typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < 1e-6;

export function validateJevbenchV12(a) {
  if (!a || a.protocol !== 'jevbench::v1.2' || !['v1.2', 'v1.2.1', 'v1.2.2', 'v1.2.3'].includes(a.revision) || a.status !== 'final') fail('protocol jevbench::v1.2, status final');
  scanForbidden(a, '$', fail);
  for (const k of AXES) if (a.axis_weights?.[k] !== 0.25) fail('axis weights must be 25 % each');
  for (const t of TIERS) if (!near(a.tier_weights?.[t], TIER_WEIGHTS[t])) fail(`tier weight ${t}`);
  if (typeof a.speed_note !== 'string' || !/assumption/i.test(a.speed_note) || !/raw/i.test(a.speed_note)) fail('the speed note must call the adjustment an assumption and point to raw numbers');
  if (!a.presets?.[a.main] || !a.scoring || ['jevbench_score', 'intelligence', 'calibration', 'speed', 'cost', 'ranked'].some((k) => typeof a.scoring[k] !== 'string')) fail('scoring texts / presets');
  if (!Array.isArray(a.systems) || !a.systems.length) fail('no systems');
  const keys = new Set();
  for (const s of a.systems) {
    const where = `systems.${s.key}`;
    if (!s.key || keys.has(s.key)) fail(`duplicate or missing key ${s.key}`);
    keys.add(s.key);
    for (const k of ['display', 'author', 'licence', 'class', 'endpoint_condition']) if (typeof s[k] !== 'string' || !s[k].trim()) fail(`${where}.${k}`);
    if (!EP_KINDS.includes(s.endpoint_kind)) fail(`${where}.endpoint_kind`);
    if (typeof s.ranked !== 'boolean' || s.ranked === s.partial) fail(`${where}: exactly one of ranked/partial`);
    const sp = s.speed, c = s.cost, ax = s.axes;
    if (!(sp?.p50_s_raw > 0 && sp?.p95_s_raw > 0)) fail(`${where}: raw latency`);
    if (!near(sp.p50_s_adjusted, adjustedLatency(sp.p50_s_raw, s.endpoint_kind)) || !near(sp.p95_s_adjusted, adjustedLatency(sp.p95_s_raw, s.endpoint_kind))) fail(`${where}: adjusted latency`);
    // Cost: a price is required (never an automatic 100); an estimate or an announced (not yet charged) price must say so.
    if (!['measured', 'estimate', 'announced'].includes(c?.kind) || !(c.usd_per_1000 > 0) || typeof c.basis !== 'string') fail(`${where}: cost kind/price/basis`);
    if (c.kind === 'estimate' && !/estimate/i.test(c.basis)) fail(`${where}: an estimated cost must say so in its basis`);
    if (c.kind === 'announced' && !/announced/i.test(c.basis)) fail(`${where}: an announced price must say so in its basis`);
    if (!near(ax?.intelligence, intelligence(s.tiers))) fail(`${where}: intelligence does not recompute`);
    if (!near(ax.speed, speedScore(sp.p50_s_raw, sp.p95_s_raw, s.endpoint_kind))) fail(`${where}: speed does not recompute`);
    if (!near(ax.cost, costScore(c.usd_per_1000))) fail(`${where}: cost does not recompute`);
    if (ax.calibration === null ? s.has_distribution !== false || !s.calibration?.note : !(ax.calibration >= 0 && ax.calibration <= 100)) fail(`${where}: calibration (label-only ⇒ null with a note)`);
    if (!near(s.jevbench_score, geometric(ax, a.axis_weights))) fail(`${where}: JevBench Score ${s.jevbench_score} does not recompute`);
    for (const [p, w] of Object.entries(a.presets)) if (!near(s.presets?.[p], geometric(ax, w))) fail(`${where}: preset ${p}`);
  }
  const ranked = a.systems.filter((s) => s.ranked);
  const byScore = [...ranked].sort((x, y) => y.jevbench_score - x.jevbench_score);
  if (byScore.some((s, i) => s.rank !== i + 1)) fail('rank must follow the JevBench Score, 1..N');
  if (a.systems.some((s) => s.partial && s.rank !== null)) fail('partial runs carry no rank');
  for (const p of Object.keys(a.presets)) {
    const order = [...ranked].sort((x, y) => y.presets[p] - x.presets[p]);
    if (order.some((s, i) => s.rank_under?.[p] !== i + 1)) fail(`rank_under["${p}"] disagrees with its scores`);
  }
  return a;
}

export async function readJevbenchV12(root = process.cwd()) {
  const bytes = await readFile(`${root}/${JEVBENCH_V12_ARTIFACT}`);
  return { artifact: validateJevbenchV12(JSON.parse(bytes.toString('utf8'))), bytes, sha256: createHash('sha256').update(bytes).digest('hex') };
}

/** Every benchmarked project links out; the hosted instruction models link the vendor page the harness cites for their API. */
export const VENDOR_LINKS = {
  'gemini-3.1-flash-lite': 'https://ai.google.dev',
  'gpt-5.6-luna': 'https://platform.openai.com',
  'deepseek-flash': 'https://api-docs.deepseek.com',
  'qwen3.8-27b': 'https://chutes.ai',
};
export const EP_LABEL = { api: 'production API', gpu: 'our RunPod GPU', demo: "author's demo server", cpu: 'our CPU' };

export function jevbenchV12View({ artifact: a, sha256 }) {
  const row = (s) => ({
    key: s.key, display: s.display, author: s.author, cls: s.class, link: s.repo ?? VENDOR_LINKS[s.key] ?? null, licence: s.licence, open: s.open,
    ranked: s.ranked, rank: s.rank, main: s.jevbench_score, axes: s.axes, presets: s.presets, rankUnder: s.rank_under ?? null,
    tiers: Object.fromEntries(TIERS.map((t) => [t, s.tiers[t] ?? null])),
    p50: s.speed.p50_s_raw, p95: s.speed.p95_s_raw, p50Adj: s.speed.p50_s_adjusted, p95Adj: s.speed.p95_s_adjusted, adjustment: s.speed.adjustment,
    endpointKind: s.endpoint_kind, endpoint: s.endpoint_condition,
    usd: s.cost.usd_per_1000, costKind: s.cost.kind, costBasis: s.cost.basis,
    hasDistribution: s.has_distribution, calibrationNote: s.calibration?.note ?? null, footnote: a.footnotes?.[s.key] ?? null,
  });
  const byMain = (x, y) => y.main - x.main || x.display.localeCompare(y.display);
  return {
    sha256, revision: a.revision, protocol: a.protocol, generated: a.generated_utc, revisionNote: a.revision_note, scoreName: a.score_name, oneLiner: a.score_one_liner,
    speedNote: a.speed_note, scoring: a.scoring, presets: a.presets, main: a.main, tierCounts: a.tiers, tierWeights: a.tier_weights,
    decisions: Object.values(a.tiers).reduce((x, y) => x + y, 0),
    ranked: a.systems.filter((s) => s.ranked).map(row).sort(byMain), partial: a.systems.filter((s) => !s.ranked).map(row).sort(byMain),
  };
}
