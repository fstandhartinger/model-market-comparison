import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

// JevBench v1.5 — UNPUBLISHED PREVIEW (25 Sep 2026). The artifact is produced by the v1.5 measurement job's
// convert_v15.py from the scorer output (diagnostic now, official later) and is served only on a hidden, noindex route.
// Unlike the frozen releases it is not pinned by hash: swapping the data file for the official one is the only change
// the release needs. The validator below keeps it aggregate-only and checks every composite reproduces from its axes.

export const JEVBENCH_V15_PREVIEW_ARTIFACT = 'data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.0-preview.json';
export const JEVBENCH_V15_PREVIEW_ROUTE = '/wip-oiifi41ouv1f/jevbench-v15';
export const JEVBENCH_V15_OPTIONS = ['A', 'B', 'C'];
export const JEVBENCH_V15_AXES = ['intelligence', 'calibration', 'speed', 'cost'];
export const JEVBENCH_V15_TYPES = ['choice', 'noul', 'score'];
const JEVBENCH_V15_DOCS = 'https://github.com/fstandhartinger/jevbench/blob/main/docs';
export const JEVBENCH_V15_METHOD_LINKS = Object.freeze([
  { label: 'Frozen scoring method', filename: 'METHOD-v1.5.md', url: `${JEVBENCH_V15_DOCS}/METHOD-v1.5.md` },
  { label: 'Pricing rules', filename: 'METHOD-v1.5-ADDENDUM-PRICING.md', url: `${JEVBENCH_V15_DOCS}/METHOD-v1.5-ADDENDUM-PRICING.md` },
  { label: 'Pricing interpretation', filename: 'METHOD-v1.5-ADDENDUM-PRICING-INTERPRETATION-1.md', url: `${JEVBENCH_V15_DOCS}/METHOD-v1.5-ADDENDUM-PRICING-INTERPRETATION-1.md` },
  { label: 'Equal-axis, equal-type headline amendment', filename: 'METHOD-v1.5-ADDENDUM-HEADLINE-A-EQUAL-TYPES.md', url: `${JEVBENCH_V15_DOCS}/METHOD-v1.5-ADDENDUM-HEADLINE-A-EQUAL-TYPES.md` },
  { label: 'Addendum placement and What-If interpretation', filename: 'METHOD-v1.5-ADDENDUM-PLACEMENT-INTERPRETATION-1.md', url: `${JEVBENCH_V15_DOCS}/METHOD-v1.5-ADDENDUM-PLACEMENT-INTERPRETATION-1.md` },
  { label: 'DeepInfra pricing disclosure correction', filename: 'METHOD-v1.5-ADDENDUM-PRICING-DEEPINFRA-DISCLOSURE-CORRECTION-1.md', url: `${JEVBENCH_V15_DOCS}/METHOD-v1.5-ADDENDUM-PRICING-DEEPINFRA-DISCLOSURE-CORRECTION-1.md` },
  { label: 'Imajev-4B pricing application (original wording)', filename: 'METHOD-v1.5-ADDENDUM-PRICING-A2-IMAJEV-I2-APPLICATION-1.md', url: `${JEVBENCH_V15_DOCS}/METHOD-v1.5-ADDENDUM-PRICING-A2-IMAJEV-I2-APPLICATION-1.md` },
  { label: 'Imajev-4B pricing application (corrected disclosure)', filename: 'METHOD-v1.5-ADDENDUM-PRICING-A2-IMAJEV-I2-APPLICATION-2.md', url: `${JEVBENCH_V15_DOCS}/METHOD-v1.5-ADDENDUM-PRICING-A2-IMAJEV-I2-APPLICATION-2.md` },
]);
export const JEVBENCH_V15_METHOD_URL = JEVBENCH_V15_METHOD_LINKS[0].url;
export const JEVBENCH_V15_PRICING_URL = JEVBENCH_V15_METHOD_LINKS[1].url;
export const JEVBENCH_V15_HEADLINE_METHOD_URL = JEVBENCH_V15_METHOD_LINKS[3].url;

const LISTINGS = new Set(['ranked', 'partial', 'unranked', 'unpriced', 'addendum', 'honorable_mention']);
const fail = (message) => { throw new Error(`Invalid JevBench v1.5 artifact: ${message}`); };
const finite = (v) => typeof v === 'number' && Number.isFinite(v);

function rejectItemLevelData(value, path = 'artifact') {
  if (Array.isArray(value)) return value.forEach((item, index) => rejectItemLevelData(item, `${path}[${index}]`));
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (/^(item_id|item_ids|item_text|question|question_text|expected|gold|golds|prediction|predicted|per_item|item_results|prompt)$/i.test(key)) fail(`item-level field at ${path}.${key}`);
    rejectItemLevelData(child, `${path}.${key}`);
  }
}

/** METHOD-v1.5 §6: weighted harmonic mean of the four axes; Intelligence below the option's floor and Speed or Cost
 *  below 50 each multiply the score by (axis / floor)². */
export function jevV15Composite(axes, weights, floor) {
  const values = JEVBENCH_V15_AXES.map((axis) => axes?.[axis]);
  if (values.some((v) => !finite(v))) return null;
  if (values.some((v) => v <= 0)) return 0;
  const w = JEVBENCH_V15_AXES.map((axis) => weights[axis]);
  let score = w.reduce((a, b) => a + b, 0) / w.reduce((sum, wi, i) => sum + wi / values[i], 0);
  for (const [axis, f] of [['intelligence', floor], ['speed', 50], ['cost', 50]]) if (axes[axis] < f) score *= (axes[axis] / f) ** 2;
  return score;
}

/** F-206: how many adjacent pairs the paired bootstrap cannot separate. Counts markers, never rows: a board with no
 *  markers reports `pairs: 0`, so the page can say the intervals are not in the data file yet instead of claiming "0 ties". */
export function jevV15TieSummary(board) {
  const markers = Array.isArray(board?.markers) ? board.markers : [];
  return { ties: markers.filter((m) => m?.tie === true).length, pairs: markers.length };
}

/** F-206: the systems the headline sentence may call joint leaders — the rank 1/2 tie marker, extended to rank 3 only
 *  when rank 3 is itself tied with rank 2. Returns `tie: false` with the single leader when the top pair is separated. */
export function jevV15LeaderKeys(board) {
  const order = Array.isArray(board?.order) ? board.order : [];
  const markers = Array.isArray(board?.markers) ? board.markers : [];
  if (order.length < 2) return null;
  const between = (upper, lower) => markers.find((m) => m?.upper === upper && m?.lower === lower) ?? null;
  const top = between(order[0], order[1]);
  if (!top) return null;
  if (!top.tie) return { tie: false, keys: [order[0]], runnerUp: order[1] };
  const keys = [order[0], order[1]];
  if (order.length > 2 && between(order[1], order[2])?.tie) keys.push(order[2]);
  return { tie: true, keys, runnerUp: null };
}

const WORDS = (text) => new Set((String(text).toLowerCase().match(/[a-z0-9.%]+/g) ?? []).filter((w) => w.length >= 3));

/** F-206: the leader line names its systems instead of reading "joint leaders" with no subject. `nameOf` maps a system key
 *  to its display name; the artifact's own `leader_wording` is appended only when it carries a word the sentence lacks. */
export function jevV15LeaderSentence(board, nameOf) {
  const leaders = jevV15LeaderKeys(board);
  if (!leaders) return null;
  const label = (key) => String(nameOf(key) ?? key);
  let sentence;
  if (leaders.tie) {
    const names = leaders.keys.map(label);
    sentence = `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} are joint leaders (statistical tie).`;
  } else {
    sentence = `${label(leaders.keys[0])} leads: its paired-bootstrap interval against ${label(leaders.runnerUp)} excludes zero, so first place is not a statistical tie.`;
  }
  const wording = board?.leader_wording;
  if (wording) {
    const have = WORDS(sentence);
    if ([...WORDS(wording)].some((w) => !have.has(w))) {
      const trimmed = String(wording).trim();
      sentence += ` ${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}${/[.!?]$/.test(trimmed) ? '' : '.'}`;
    }
  }
  return sentence;
}

export function validateJevbenchV15Preview(a) {
  if (!a || a.benchmark !== 'JevBench' || !['v1.5.0', 'v1.5.1', 'v1.5.2', 'v1.5.3'].includes(a.revision) || a.protocol !== 'jevbench::v1.5') fail('revision/protocol');
  if (!['preview-not-published', 'released'].includes(a.status)) fail('status');
  if (!['diagnostic', 'official'].includes(a.run_kind)) fail('run_kind');
  if (a.headline !== 'A') fail('headline must be the approved equal-axis option A');
  if (!/^[0-9a-f]{64}$/.test(a.method_sha256 ?? '') || !/^[0-9a-f]{64}$/.test(a.pricing_addendum_sha256 ?? '') ||
      !/^[0-9a-f]{64}$/.test(a.headline_method_addendum_sha256 ?? '') ||
      !/^[0-9a-f]{64}$/.test(a.pricing_disclosure_correction_sha256 ?? '') ||
      !/^[0-9a-f]{64}$/.test(a.pricing_disclosure_normalizer_sha256 ?? '')) fail('method hashes');
  if (!a.types || ['choice', 'noul', 'score'].some((t) => !finite(a.types[t]) || Math.abs(a.types[t] - 1 / 3) > 1e-12)) fail('headline type weights must be equal');
  if (!Array.isArray(a.systems) || !Array.isArray(a.not_measured)) fail('systems/not_measured');
  const keys = [...a.systems, ...a.not_measured].map((s) => s.key);
  if (new Set(keys).size !== keys.length || keys.some((k) => typeof k !== 'string' || !k)) fail('system keys must be unique');
  if (a.roster_count !== keys.length) fail('roster_count');
  const ranked = a.systems.filter((s) => s.listing === 'ranked');
  if (ranked.length !== a.n_ranked) fail('n_ranked');
  for (const s of a.systems) {
    if (!LISTINGS.has(s.listing) || (s.ranked === true) !== (s.listing === 'ranked')) fail(`listing: ${s.key}`);
    if (s.addendum != null && (!/^v1\.5 roster addendum A\d+$/.test(s.addendum.label ?? '') || s.addendum.release !== 'v1.5')) fail(`addendum label: ${s.key}`);
    if (s.api_flag === true && !/operator's endpoint received sealed item text, without answers/i.test(s.api_exposure_note ?? '')) fail(`API exposure note: ${s.key}`);
    if (s.listing === 'unpriced' && (s.cost?.usd_per_1000 != null || s.jevbench_score != null)) fail(`unpriced row carries numbers: ${s.key}`);
    if (s.listing === 'unpriced' || s.listing === 'unranked' && s.jevbench_score == null) continue;
    for (const o of JEVBENCH_V15_OPTIONS) {
      const want = jevV15Composite(s.axes, a.options[o].weights, a.options[o].intelligence_floor);
      if (want == null || Math.abs(want - s.scores[o]) > 0.01) fail(`score ${o} does not reproduce from the axes: ${s.key}`);
    }
    if (s.jevbench_score !== s.scores[a.headline]) fail(`headline score: ${s.key}`);
  }
  for (const o of JEVBENCH_V15_OPTIONS) {
    const order = a.board?.[o]?.order;
    if (!Array.isArray(order) || order.length !== ranked.length || new Set(order).size !== order.length) fail(`board ${o}`);
    const rankedKeys = new Set(ranked.map((s) => s.key));
    if (order.some((k) => !rankedKeys.has(k))) fail(`board ${o} ranks an unranked row`);
    const byKey = new Map(ranked.map((s) => [s.key, s]));
    for (let i = 1; i < order.length; i++) if (byKey.get(order[i - 1]).scores[o] + 1e-9 < byKey.get(order[i]).scores[o]) fail(`board ${o} is not score-descending`);
  }
  rejectItemLevelData(a);
  return a;
}

export async function readJevbenchV15Preview(root = process.cwd()) {
  const bytes = await readFile(`${root}/${JEVBENCH_V15_PREVIEW_ARTIFACT}`);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  return { artifact: validateJevbenchV15Preview(JSON.parse(bytes.toString('utf8'))), sha256 };
}
