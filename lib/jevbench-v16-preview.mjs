import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { jevV15Composite } from './jevbench-v15-preview.mjs';

// JevBench v1.6.0 PROVISIONAL preview (unlisted, noindex). Public aggregate files built by
// scripts/build-jevbench-v16-preview.py from the provisional scorer output; nothing here is a release.
// The strict v1.6 release loader (lib/jevbench-page-v16*.mjs) stays untouched: its adopted registry, origin
// receipts and uc1.1 language supplement do not exist yet, so this preview does not claim to pass it.
export const JEVBENCH_V16_PREVIEW_RESULTS = 'data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.0-results.json';
export const JEVBENCH_V16_PREVIEW_CATEGORIES = 'data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.0-categories.json';
export const JEVBENCH_V16_PREVIEW_CARRY = 'data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.0-dated-carry.json';
export const JEVBENCH_V16_PREVIEW_ROUTE = '/wip-jevbench-v16-7c3e9a';
/** Private systems under a standing exclusion; they must not appear in any public v1.6 artifact. */
export const JEVBENCH_V16_EXCLUDED_KEYS = ['djev', 'djev-thinking'];

const fail = (message) => { throw new Error(`JevBench v1.6.0 preview: ${message}`); };
const finite = (v) => typeof v === 'number' && Number.isFinite(v);
const ITEM_LEVEL = /^(item_id|item_ids|item_text|question|question_text|expected|gold|golds|prediction|predicted|per_item|item_results|prompt|task_id)$/i;

function rejectItemLevel(value, path) {
  if (Array.isArray(value)) return value.forEach((v, i) => rejectItemLevel(v, `${path}[${i}]`));
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (ITEM_LEVEL.test(key)) fail(`item-level field at ${path}.${key}`);
    rejectItemLevel(child, `${path}.${key}`);
  }
}
function rejectExcluded(bytes, name) {
  for (const key of JEVBENCH_V16_EXCLUDED_KEYS) if (bytes.includes(`"${key}"`)) fail(`${name} lists the excluded system ${key}`);
  if (/weiche/i.test(bytes)) fail(`${name} lists a private-only system`);
}

export function validateJevbenchV16Preview(a) {
  if (a?.benchmark !== 'JevBench' || a.revision !== 'v1.6.0' || a.protocol !== 'jevbench::v1.6') fail('revision/protocol');
  if (a.provisional !== true || a.status !== 'preview-not-published') fail('must stay a provisional, unpublished preview');
  if (a.headline !== 'A' || !a.options?.A) fail('headline option A');
  const keys = [...a.systems, ...a.not_measured].map((s) => s.key);
  if (new Set(keys).size !== keys.length || a.roster_count !== keys.length) fail('roster');
  const ranked = a.systems.filter((s) => s.ranked);
  if (ranked.length !== a.n_ranked) fail('n_ranked');
  for (const s of a.systems) {
    if ((s.listing === 'ranked') !== (s.ranked === true)) fail(`listing: ${s.key}`);
    if (!['api', 'selfhosted'].includes(s.v16?.lane)) fail(`lane: ${s.key}`);
    const expected = s.v16.lane === 'api' ? 600 : 1500;
    if (s.status?.rows !== expected) fail(`item count: ${s.key}`);
    if (!s.ranked) continue;
    for (const o of ['A', 'B', 'C']) {
      const want = jevV15Composite(s.axes, a.options[o].weights, a.options[o].intelligence_floor);
      if (want == null || Math.abs(want - s.scores[o]) > 0.01) fail(`score ${o} does not reproduce from the axes: ${s.key}`);
    }
    if (s.jevbench_score !== s.scores[a.headline]) fail(`headline score: ${s.key}`);
    if (!finite(s.capability) || Math.abs(s.capability - (s.axes.intelligence + s.axes.calibration) / 2) > 1e-9) fail(`capability: ${s.key}`);
  }
  for (const o of ['A', 'B', 'C']) {
    const order = a.board?.[o]?.order;
    if (!Array.isArray(order) || order.length !== ranked.length) fail(`board ${o}`);
    const byKey = new Map(ranked.map((s) => [s.key, s]));
    for (let i = 1; i < order.length; i++) if (byKey.get(order[i - 1]).scores[o] + 1e-9 < byKey.get(order[i]).scores[o]) fail(`board ${o} order`);
  }
  rejectItemLevel(a, 'results');
  return a;
}

export function validateJevbenchV16Carry(c, measuredKeys) {
  if (c?.kind !== 'dated-carry' || c.revision !== 'v1.6.0' || c.provisional !== true) fail('carry identity');
  const published = new Map(c.releases.map((r) => [r.revision, r.published_on]));
  const seen = new Set();
  for (const r of c.rows) {
    if (seen.has(r.key) || measuredKeys.has(r.key)) fail(`carry row ${r.key} duplicates a measured row`);
    seen.add(r.key);
    const day = published.get(r.measured_revision);
    if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day) || r.measured_label !== `measured on ${r.measured_revision} (${day})`) fail(`carry date: ${r.key}`);
    if (!finite(r.capability) || !finite(r.composite_v15)) fail(`carry numbers: ${r.key}`);
  }
  rejectItemLevel(c, 'carry');
  return c;
}

async function readJson(path, root) {
  const bytes = await readFile(`${root}/${path}`);
  const text = bytes.toString('utf8');
  rejectExcluded(text, path);
  return { value: JSON.parse(text), sha256: createHash('sha256').update(bytes).digest('hex') };
}

export async function readJevbenchV16Preview(root = process.cwd()) {
  const [results, categories, carry] = await Promise.all([
    readJson(JEVBENCH_V16_PREVIEW_RESULTS, root), readJson(JEVBENCH_V16_PREVIEW_CATEGORIES, root), readJson(JEVBENCH_V16_PREVIEW_CARRY, root),
  ]);
  const artifact = validateJevbenchV16Preview(results.value);
  if (categories.value.provisional !== true || categories.value.revision !== 'v1.6.0') fail('categories identity');
  const measured = new Set(artifact.systems.map((s) => s.key));
  return {
    artifact, sha256: results.sha256,
    categories: categories.value, categoriesSha256: categories.sha256,
    carry: validateJevbenchV16Carry(carry.value, measured), carrySha256: carry.sha256,
  };
}
