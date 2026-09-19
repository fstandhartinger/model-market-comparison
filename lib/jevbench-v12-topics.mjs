// CR-94 (Florian 2026-09-19 ~17:30 UTC): accuracy per subject topic for the /jev-models topic radar (completes CR-90.3).
// The artifact is the jevbench repo's results/v1.2/jevbench-v1.2-topics.json (commit d0a11e0): per system and topic only
// n / attempted / correct / accuracy over all four tiers — no item text, no held-out id. This module validates it (every
// accuracy recomputes, every system's topic totals equal its v1.2 tier totals) and only selects and labels.
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { scanForbidden } from './jevbench.mjs';

export const JEVBENCH_V12_TOPICS_ARTIFACT = 'data/raw/benchmarks/jevbench/v1.2/jevbench-v1.2-topics.json';
export const JEVBENCH_V12_TOPICS_SHA256 = '6211c5e3711a112054400545834a39f66daf68b014eb291a06ff5377d9a2d2f0'; // = results/v1.2/jevbench-v1.2-topics.json at d0a11e0
/** Shorter labels for the radar spokes; the artifact's labels stay in the value table. */
export const TOPIC_SHORT = { math: 'Math', coding: 'Coding', law_policy: 'Rules & law', finance_commerce: 'Finance', support_ops: 'Support & ops', everyday_language: 'Everyday language', safety_security: 'Safety & security' };

const fail = (message) => { throw new Error(`JevBench v1.2 topics artifact: ${message}`); };
const int = (v) => Number.isInteger(v) && v >= 0;

/** `v12` = the validated v1.2 results artifact: the topic file must cover exactly its systems and add up to its decisions. */
export function validateJevbenchV12Topics(a, v12) {
  if (!a || a.protocol !== 'jevbench::v1.2' || a.status !== 'final' || !int(a.min_attempted) || a.min_attempted < 1) fail('protocol, status, min_attempted');
  // The topic descriptors are {key, label, covers} — "label" is a topic name here, not an item's gold label; everything else
  // goes through the item-level scan.
  scanForbidden({ ...a, topics: null }, '$', fail);
  const keys = (a.topics ?? []).map((t) => t.key);
  if (keys.length < 6 || keys.length > 9 || new Set(keys).size !== keys.length || a.topics.some((t) => Object.keys(t).sort().join() !== 'covers,key,label' || typeof t.label !== 'string' || typeof t.covers !== 'string')) fail('6–9 topics, each exactly {key, label, covers}');
  const decisions = Object.values(v12.tiers).reduce((x, y) => x + y, 0);
  if (keys.some((k) => !int(a.n_items?.[k]) || a.n_items[k] < a.min_attempted) || keys.reduce((s, k) => s + a.n_items[k], 0) !== decisions) fail(`topic sizes must be ≥ ${a.min_attempted} and add up to ${decisions}`);
  for (const k of keys) if (Object.keys(v12.tiers).reduce((s, t) => s + (a.n_items_by_tier?.[k]?.[t] ?? NaN), 0) !== a.n_items[k]) fail(`n_items_by_tier.${k}`);
  const v12Keys = v12.systems.map((s) => s.key);
  if (Object.keys(a.systems ?? {}).sort().join() !== [...v12Keys].sort().join()) fail('systems must be exactly the v1.2 systems');
  for (const s of v12.systems) {
    const t = a.systems[s.key].topics;
    for (const k of keys) {
      const c = t?.[k];
      if (!c || c.n !== a.n_items[k] || !int(c.attempted) || !int(c.correct) || c.attempted > c.n || c.correct > c.attempted) fail(`${s.key}.${k}: counts`);
      if (c.attempted === 0 ? c.accuracy !== null : Math.abs(c.accuracy - c.correct / c.attempted) > 5e-5) fail(`${s.key}.${k}: accuracy does not recompute`);
    }
    // A full run answered every decision, so its topic accuracies are its tier accuracies regrouped: the correct counts must
    // add up to Σ tier accuracy × tier size.
    if (s.ranked) {
      const correct = Object.entries(v12.tiers).reduce((x, [tier, n]) => x + Math.round(s.tiers[tier] * n), 0);
      if (keys.reduce((x, k) => x + t[k].correct, 0) !== correct || keys.some((k) => t[k].attempted !== t[k].n)) fail(`${s.key}: topic totals differ from its tier accuracies`);
    }
  }
  return a;
}

export async function readJevbenchV12Topics(v12, root = process.cwd()) {
  const bytes = await readFile(`${root}/${JEVBENCH_V12_TOPICS_ARTIFACT}`);
  return { artifact: validateJevbenchV12Topics(JSON.parse(bytes.toString('utf8')), v12), sha256: createHash('sha256').update(bytes).digest('hex') };
}

/** What the page ships to the browser: labels, sizes and per-system aggregates — nothing item-level. */
export function jevbenchV12TopicsView({ artifact: a, sha256 }) {
  return {
    sha256, minAttempted: a.min_attempted, note: a.note,
    topics: a.topics.map((t) => ({ key: t.key, label: t.label, short: TOPIC_SHORT[t.key] ?? t.label, covers: t.covers, n: a.n_items[t.key], byTier: a.n_items_by_tier[t.key] })),
    systems: Object.fromEntries(Object.entries(a.systems).map(([k, s]) => [k, Object.fromEntries(Object.entries(s.topics).map(([t, c]) => [t, { n: c.n, attempted: c.attempted, correct: c.correct, accuracy: c.accuracy }]))])),
  };
}
