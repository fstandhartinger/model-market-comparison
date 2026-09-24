// CR-139: source is the official JevBench v1.3.0 tag's results/v1.2/jevbench-v1.2-topics.json
// (embedded revision v1.2.15; retrieved 2026-09-24). It contains per-topic aggregates for 47 systems.
// Five reranker systems added later have no published topic aggregates and are intentionally absent here.
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { scanForbidden } from './jevbench.mjs';

export const JEVBENCH_V12_TOPICS_ARTIFACT = 'data/raw/benchmarks/jevbench/v1.2/jevbench-v1.2-topics.json';
export const JEVBENCH_V12_TOPICS_SHA256 = '858aca87ed42eb441251b85c49374e8c9417336c0eecff52f4e98f596141e754'; // exact official bytes at tag v1.3.0, embedded revision v1.2.15
export const TOPIC_DATA_UNPUBLISHED_SYSTEMS = ['bge-reranker-v2-m3', 'gte-reranker-modernbert-base', 'mxbai-rerank-base-v2', 'qwen3-reranker-4b', 'zerank-2'];
/** Shorter labels for the radar spokes; the artifact's labels stay in the value table. */
export const TOPIC_SHORT = { math: 'Math', coding: 'Coding', law_policy: 'Rules & law', finance_commerce: 'Finance', support_ops: 'Support & ops', everyday_language: 'Everyday language', safety_security: 'Safety & security' };

const fail = (message) => { throw new Error(`JevBench v1.2 topics artifact: ${message}`); };
const int = (v) => Number.isInteger(v) && v >= 0;

/** `v12` = the validated v1.2 results artifact; the topic file covers the exact systems in the official topic publication. */
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
  const unpublished = new Set(TOPIC_DATA_UNPUBLISHED_SYSTEMS);
  if (TOPIC_DATA_UNPUBLISHED_SYSTEMS.some((k) => !v12Keys.includes(k))) fail('unpublished-topic list must name v1.2 systems');
  const expectedTopicKeys = v12Keys.filter((k) => !unpublished.has(k)).sort();
  if (Object.keys(a.systems ?? {}).sort().join() !== expectedTopicKeys.join()) fail('systems must match the officially published topic aggregates');
  for (const s of v12.systems) {
    if (unpublished.has(s.key)) continue;
    const t = a.systems[s.key].topics;
    for (const k of keys) {
      const c = t?.[k];
      if (!c || c.n !== a.n_items[k] || !int(c.attempted) || !int(c.correct) || c.attempted > c.n || c.correct > c.attempted) fail(`${s.key}.${k}: counts`);
      if (c.attempted === 0 ? c.accuracy !== null : Math.abs(c.accuracy - c.correct / c.attempted) > 5e-5) fail(`${s.key}.${k}: accuracy does not recompute`);
    }
    // A full run answered every decision, so its topic accuracies are its tier accuracies regrouped: the correct counts must
    // add up to Σ tier accuracy × tier size. CR-97: an honorable mention is a full run too, so the check is on `partial`.
    if (!s.partial) {
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
    sha256, sourceRevision: a.revision, minAttempted: a.min_attempted, note: a.note,
    unpublishedSystems: [...TOPIC_DATA_UNPUBLISHED_SYSTEMS],
    topics: a.topics.map((t) => ({ key: t.key, label: t.label, short: TOPIC_SHORT[t.key] ?? t.label, covers: t.covers, n: a.n_items[t.key], byTier: a.n_items_by_tier[t.key] })),
    systems: Object.fromEntries(Object.entries(a.systems).map(([k, s]) => [k, Object.fromEntries(Object.entries(s.topics).map(([t, c]) => [t, { n: c.n, attempted: c.attempted, correct: c.correct, accuracy: c.accuracy }]))])),
  };
}
