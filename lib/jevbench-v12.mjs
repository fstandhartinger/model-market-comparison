// CR-92 (Florian 2026-09-19 ~13:20 UTC): JevBench v1.2 final — the JevBench Score. Four axes (Intelligence, Calibration,
// Speed, Cost), 25 % each, geometric mean. Every number on /jev-models is read from the committed artifact (= results/v1.2/ at
// tag v1.2 of the public repo). This module validates it by recomputing every axis from its published inputs and every score
// from its axes — to prove the published numbers, never to replace them — and only selects, orders and labels.
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { scanForbidden } from './jevbench.mjs';

export const JEVBENCH_V12_ARTIFACT = 'data/raw/benchmarks/jevbench/v1.2/jevbench-v1.2-results.json';
// CR-113 (2026-09-21): v1.2.14 adds Winnow-12B Q8 and preserves the upstream v1.2.12/v1.2.13 thinking rows.
// CR-112 (2026-09-21): v1.2.11 corrects djev's provenance only: djev-dev is Apache-2.0 code over Google's
// Apache-2.0 DiffusionGemma weights, adds no djev-specific weights, and is self-hostable. Scores/ranks are unchanged.
// CR-111 (2026-09-21): v1.2.10 adds smalljev semantic-v9, measured locally from its Apache-2.0 checkpoint.
// CR-110 (2026-09-21): v1.2.9 adds Certo v1, measured locally from AltSlate Labs' MIT checkpoint.
// CR-108 (2026-09-21): v1.2.8 adds eleven requested systems as ranked rows (among them decision-machine-1, a closed
// decision API with its own class), and jqv's partial row becomes a complete run on our own GPU.
// CR-107 (2026-09-20): v1.2.7 adds the GLiNER2.5 small and multi checkpoints as ranked rows and jqv as a
// partial row — its endpoint is the submitter's own machine, so the held-out hard items were not sent to it.
// CR-106 (2026-09-20): v1.2.7 adds the GLiNER2.5 small and multi checkpoints as ranked rows and jqv as a
// partial row — its endpoint is the submitter's own machine, so the held-out hard items were not sent to it.
// CR-105 (2026-09-20): v1.2.6 adds Verdict 1.4 and two SimpleJev configurations on the unchanged frozen task set.
// CR-101 (2026-09-20): v1.2.5 adds four independently measured kev checkpoints on the unchanged frozen task set.
// CR-97 (2026-09-20): v1.2.4 takes classifier.dev out of the ranking. A service that runs another entrant's model is listed
// with every number it earned, but not ranked against the models — so each row now carries a `listing`
// (ranked / honorable_mention / partial) and only a ranked row carries a rank. No measurement, axis or score changed.
// (CR-96 corrected the prices in v1.2.3, CR-95 added five systems in v1.2.2, CR-93 djev in v1.2.1.)
export const JEVBENCH_V12_SHA256 = 'a0617dd820c94a01807c0d8e2192f47d5df0a4c1f498d0b33beeaa4ec067b87c'; // = results/v1.2/jevbench-v1.2-results.json at tag v1.2.14
import { TIERS, AXES, TIER_WEIGHTS, intelligence, adjustedLatency, speedPoint, speedScore, costScore, geometric } from './jevbench-v12-score.mjs';
export { TIERS, AXES, TIER_WEIGHTS, intelligence, adjustedLatency, speedPoint, speedScore, costScore, geometric };
const EP_KINDS = ['api', 'gpu', 'demo', 'cpu'];
// CR-97 (2026-09-20): exactly one of these per row. A ranked row is a system's own model with a complete run; an
// honorable mention is a service running another entrant's model (listed, never ranked); a partial run missed a tier.
export const LISTINGS = ['ranked', 'honorable_mention', 'partial'];

const fail = (message) => { throw new Error(`JevBench v1.2 artifact: ${message}`); };
const near = (a, b) => typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < 1e-6;

export function validateJevbenchV12(a) {
  if (!a || a.protocol !== 'jevbench::v1.2' || !['v1.2', 'v1.2.1', 'v1.2.2', 'v1.2.3', 'v1.2.4', 'v1.2.5', 'v1.2.6', 'v1.2.7', 'v1.2.8', 'v1.2.9', 'v1.2.10', 'v1.2.11', 'v1.2.12', 'v1.2.13', 'v1.2.14'].includes(a.revision) || a.status !== 'final') fail('protocol jevbench::v1.2, status final');
  scanForbidden(a, '$', fail);
  for (const k of AXES) if (a.axis_weights?.[k] !== 0.25) fail('axis weights must be 25 % each');
  for (const t of TIERS) if (!near(a.tier_weights?.[t], TIER_WEIGHTS[t])) fail(`tier weight ${t}`);
  if (typeof a.speed_note !== 'string' || !/assumption/i.test(a.speed_note) || !/raw/i.test(a.speed_note)) fail('the speed note must call the adjustment an assumption and point to raw numbers');
  // CR-96 (2026-09-20): a reader read the Cost column as dollars per 1,000 tokens. The unit now travels with the artifact and
  // every surface that shows a price must be able to state it, so it is required here.
  const u = a.cost_unit;
  if (!u || u.unit !== '$ per 1,000 decisions' || u.not_unit !== '$ per 1,000 tokens') fail('cost_unit must name the unit and the unit it is not');
  for (const k of ['one_liner', 'worked_example', 'short_note']) if (typeof u[k] !== 'string' || !/decision/i.test(u[k])) fail(`cost_unit.${k} must speak of decisions`);
  if (!/per MILLION input tokens/.test(u.worked_example)) fail('cost_unit.worked_example must spell out the tariff unit');
  if (!/not per 1,000 tokens/i.test(a.scoring.cost)) fail('the Cost scoring text must say it is not per 1,000 tokens');
  if (!a.presets?.[a.main] || !a.scoring || ['jevbench_score', 'intelligence', 'calibration', 'speed', 'cost', 'ranked'].some((k) => typeof a.scoring[k] !== 'string')) fail('scoring texts / presets');
  if (!Array.isArray(a.systems) || !a.systems.length) fail('no systems');
  const keys = new Set();
  for (const s of a.systems) {
    const where = `systems.${s.key}`;
    if (!s.key || keys.has(s.key)) fail(`duplicate or missing key ${s.key}`);
    keys.add(s.key);
    for (const k of ['display', 'author', 'licence', 'class', 'endpoint_condition']) if (typeof s[k] !== 'string' || !s[k].trim()) fail(`${where}.${k}`);
    if (!EP_KINDS.includes(s.endpoint_kind)) fail(`${where}.endpoint_kind`);
    if (!LISTINGS.includes(s.listing)) fail(`${where}.listing must be one of ${LISTINGS.join(', ')}`);
    if (s.ranked !== (s.listing === 'ranked') || s.partial !== (s.listing === 'partial')) fail(`${where}: ranked/partial must agree with listing`);
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
  if (a.systems.some((s) => !s.ranked && s.rank !== null)) fail('only a ranked system carries a rank');
  // CR-97: the honorable-mention rule is published with the data, and every such row must name the ranked system whose
  // model it runs — otherwise "not ranked" would be an unexplained demotion rather than a stated rule.
  const honorable = a.systems.filter((s) => s.listing === 'honorable_mention');
  const hm = a.honorable_mentions;
  if (honorable.length || hm) {
    if (typeof hm?.rule !== 'string' || !/not ranked/i.test(hm.rule) || !/another entrant/i.test(hm.rule)) fail('honorable_mentions.rule must state the rule');
    if (typeof hm.heading !== 'string' || !hm.heading.trim()) fail('honorable_mentions.heading');
    if (!/not ranked/i.test(a.scoring.ranked)) fail('the ranked scoring text must carry the honorable-mention rule');
    if (Object.keys(hm.systems ?? {}).sort().join(',') !== honorable.map((s) => s.key).sort().join(',')) fail('honorable_mentions.systems must match the rows marked honorable_mention');
    for (const s of honorable) {
      const d = hm.systems[s.key];
      for (const k of ['runs_on', 'short_reason', 'why_not_ranked', 'price_note', 'tier_measured', 'not_pass_through', 'credit']) {
        if (typeof d[k] !== 'string' || !d[k].trim()) fail(`honorable_mentions.systems.${s.key}.${k}`);
      }
      if (s.not_ranked_because !== d.short_reason) fail(`systems.${s.key}.not_ranked_because must repeat the published reason`);
      const runsOn = a.systems.find((x) => x.key === d.runs_on_key);
      if (!runsOn?.ranked || runsOn.key === s.key) fail(`honorable_mentions.systems.${s.key}.runs_on_key must name another, ranked system`);
      if (!Array.isArray(d.sources) || !d.sources.length || d.sources.some((u) => !/^https:\/\//.test(u))) fail(`honorable_mentions.systems.${s.key}.sources`);
    }
  }
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
    key: s.key, display: s.display, author: s.author, cls: s.class, link: s.repo ?? VENDOR_LINKS[s.key] ?? null, licence: s.licence, open: s.open, underlying: s.underlying ?? null,
    ranked: s.ranked, listing: s.listing, notRankedBecause: s.not_ranked_because ?? null, rank: s.rank, main: s.jevbench_score, axes: s.axes, presets: s.presets, rankUnder: s.rank_under ?? null,
    tiers: Object.fromEntries(TIERS.map((t) => [t, s.tiers[t] ?? null])),
    p50: s.speed.p50_s_raw, p95: s.speed.p95_s_raw, p50Adj: s.speed.p50_s_adjusted, p95Adj: s.speed.p95_s_adjusted, adjustment: s.speed.adjustment,
    endpointKind: s.endpoint_kind, endpoint: s.endpoint_condition,
    usd: s.cost.usd_per_1000, costKind: s.cost.kind, costBasis: s.cost.basis,
    // CR-99: keep the published hard-run inputs beside the all-task values so the client can
    // recompute every axis for the hard-only view without changing or duplicating the artifact.
    hardSubset: s.hard && s.hard.n_items > 0 && s.speed.hard_tier_p50_s > 0 && s.speed.hard_tier_p95_s > 0 && s.cost.usd_per_1000_hard > 0 ? {
      n: s.hard.n_items, attempted: s.hard.n_attempted, intelligence: 100 * s.hard.accuracy,
      calibration: s.has_distribution === false ? null : s.hard.calibration_score,
      p50: s.speed.hard_tier_p50_s, p95: s.speed.hard_tier_p95_s, usd: s.cost.usd_per_1000_hard,
    } : null,
    hasDistribution: s.has_distribution, calibrationNote: s.calibration?.note ?? null, footnote: a.footnotes?.[s.key] ?? null,
  });
  const byMain = (x, y) => y.main - x.main || x.display.localeCompare(y.display);
  return {
    sha256, revision: a.revision, protocol: a.protocol, generated: a.generated_utc, revisionNote: a.revision_note, scoreName: a.score_name, oneLiner: a.score_one_liner,
    speedNote: a.speed_note, scoring: a.scoring, presets: a.presets, main: a.main, tierCounts: a.tiers, tierWeights: a.tier_weights,
    costUnit: a.cost_unit, costCorrection: a.cost_correction ?? null, costCorrectionTable: a.cost_correction_table ?? null,
    revisionLog: a.revision_log ?? [],
    decisions: Object.values(a.tiers).reduce((x, y) => x + y, 0),
    honorableMentions: a.honorable_mentions ?? null,
    ranked: a.systems.filter((s) => s.listing === 'ranked').map(row).sort(byMain),
    honorable: a.systems.filter((s) => s.listing === 'honorable_mention').map(row).sort(byMain),
    partial: a.systems.filter((s) => s.listing === 'partial').map(row).sort(byMain),
  };
}
