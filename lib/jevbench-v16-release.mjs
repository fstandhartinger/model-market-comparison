import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { jevV15Composite } from './jevbench-v15-preview.mjs';
import { JEVBENCH_V157_RELEASE_ARTIFACT, readJevbenchV157Release } from './jevbench-v15-release.mjs';

// Public v1.6.0 release artifacts contain only system-level aggregates. The release
// card approved the current-pool scope; low-count language cells remain flagged and
// the uc1.1 extension is tracked for v1.6.1.
export const JEVBENCH_V16_RELEASE_RESULTS = 'data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.0-results.json';
export const JEVBENCH_V16_RELEASE_CATEGORIES = 'data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.0-categories.json';
export const JEVBENCH_V16_RELEASE_CARRY = 'data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.0-dated-carry.json';
// v1.6.1 (5 Oct 2026): hosted/API systems answer the same full 1,500-item set as self-hosted systems. Self-hosted rows are
// byte-identical to v1.6.0. The dated-carry file is shared and unchanged (its own revision stays v1.6.0).
export const JEVBENCH_V161_RELEASE_RESULTS = 'data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-results.json';
export const JEVBENCH_V161_RELEASE_CATEGORIES = 'data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-categories.json';
export const JEVBENCH_V161_RELEASE_CARRY = JEVBENCH_V16_RELEASE_CARRY;
/** Private systems under a standing exclusion; they must not appear in any public v1.6 artifact. */
export const JEVBENCH_V16_EXCLUDED_KEYS = ['djev', 'djev-thinking'];
/** SHA-256 of lower-case name tokens of private-only systems (names are not published). */
export const JEVBENCH_V16_EXCLUDED_TOKEN_SHA256 = ['5abd15f81ff200ebeb028ff68a02ff55ea2867ea3ea8173e605aa01bb7858c4f'];
/** True when any alphanumeric token of the text hashes to an excluded private name. */
export function mentionsPrivateSystem(text) {
  const tokens = new Set(text.toLowerCase().match(/[a-z0-9]+/g) ?? []);
  for (const t of tokens) if (JEVBENCH_V16_EXCLUDED_TOKEN_SHA256.includes(createHash('sha256').update(t).digest('hex'))) return true;
  return false;
}

const fail = (message) => { throw new Error(`JevBench v1.6.0 release: ${message}`); };
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
  if (mentionsPrivateSystem(bytes)) fail(`${name} lists a private-only system`);
}

export function validateJevbenchV16Release(a, revision = 'v1.6.0') {
  if (a?.benchmark !== 'JevBench' || a.revision !== revision || a.protocol !== 'jevbench::v1.6') fail('revision/protocol');
  if (a.provisional !== false || a.status !== 'published' || a.run_kind !== 'scheduled-refresh') fail('release status');
  if (a.headline !== 'A' || !a.options?.A) fail('headline option A');
  const keys = [...a.systems, ...a.not_measured].map((s) => s.key);
  if (new Set(keys).size !== keys.length || a.roster_count !== keys.length) fail('roster');
  const ranked = a.systems.filter((s) => s.ranked);
  if (ranked.length !== a.n_ranked) fail('n_ranked');
  for (const s of a.systems) {
    if ((s.listing === 'ranked') !== (s.ranked === true)) fail(`listing: ${s.key}`);
    if (!['api', 'selfhosted'].includes(s.v16?.lane)) fail(`lane: ${s.key}`);
    // v1.6.0: hosted APIs answered the 600-item API subset + P. v1.6.1: a row flagged full_set_api answered all 1,500 items.
    const expected = s.v16.lane === 'api' && !(revision === 'v1.6.1' && s.v16.full_set_api === true) ? 600 : 1500;
    if (revision === 'v1.6.1' && s.v16.lane === 'api' && s.v16.full_set_api === true && (s.v16.equated || s.v16.api_subset)) fail(`full-set API row must not be equated or subset-tagged: ${s.key}`);
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

function sameJson(a, b) {
  return isDeepStrictEqual(a, b);
}

export function validateJevbenchV16Carry(c, measuredKeys, previous = null, previousSha256 = null) {
  if (c?.kind !== 'dated-carry' || c.revision !== 'v1.6.0' || c.provisional !== false) fail('carry identity');
  if (!previous || !/^[0-9a-f]{64}$/.test(previousSha256 ?? '')) fail('carry source release is unavailable');
  if (c.carried_from?.revision !== 'v1.5.7' || c.carried_from?.path !== JEVBENCH_V157_RELEASE_ARTIFACT || c.carried_from?.sha256 !== previousSha256) fail('carry source release hash');
  const v156Release = c.releases.find((r) => r.revision === 'v1.5.7');
  if (!v156Release || v156Release.path !== JEVBENCH_V157_RELEASE_ARTIFACT || v156Release.sha256 !== previousSha256) fail('dated carry release hash');
  const previousRows = new Map(previous.systems.map((row) => [row.key, row]));
  const published = new Map(c.releases.map((r) => [r.revision, r.published_on]));
  const seen = new Set();
  for (const r of c.rows) {
    if (seen.has(r.key) || measuredKeys.has(r.key)) fail(`carry row ${r.key} duplicates a measured row`);
    seen.add(r.key);
    const source = previousRows.get(r.key);
    if (!source || source.listing !== 'ranked' || source.rank == null) fail(`carry row ${r.key} is not ranked in v1.5.7`);
    const sourceSpeed = Object.fromEntries(['p50_s_adjusted', 'p95_s_adjusted', 'n', 'adjustment'].map((key) => [key, (source.speed ?? {})[key] ?? null]));
    const expectedCarry = {
      display: source.display, author: source.author ?? null, class: source.class ?? null,
      open: source.open ?? null, licence: source.licence ?? null, repo: source.repo ?? null,
      endpoint_kind: source.endpoint_kind ?? null, api_flag: source.api_flag ?? null,
      axes: source.axes, capability: (source.axes.intelligence + source.axes.calibration) / 2,
      composite_v15: source.jevbench_score, v156_rank: source.rank, cost: source.cost ?? null,
      speed: sourceSpeed,
    };
    for (const [field, expected] of Object.entries(expectedCarry)) {
      if (!sameJson(r[field] ?? null, expected)) fail(`carry source value ${field}: ${r.key}`);
    }
    if (r.carried_from !== 'v1.5.7') fail(`carry source label: ${r.key}`);
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
  return { value: JSON.parse(text), bytes, sha256: createHash('sha256').update(bytes).digest('hex') };
}

async function readRelease(root, spec) {
  const [results, categories, carry, previous] = await Promise.all([
    readJson(spec.results, root), readJson(spec.categories, root), readJson(spec.carry, root),
    readJevbenchV157Release(root),
  ]);
  const artifact = validateJevbenchV16Release(results.value, spec.revision);
  if (categories.value.provisional !== false || categories.value.revision !== spec.revision) fail('categories identity');
  if (categories.value.source_results_sha256 !== artifact.source_sha256) fail('category results source hash');
  const measured = new Set(artifact.systems.map((s) => s.key));
  return {
    artifact, bytes: results.bytes, sha256: results.sha256,
    categories: categories.value, categoriesSha256: categories.sha256,
    carry: validateJevbenchV16Carry(carry.value, measured, previous.artifact, previous.sha256), carrySha256: carry.sha256,
  };
}

/** The frozen v1.6.0 release (still served at /jev-models/v1.6.0 and /api/jevbench/v1.6.0). */
export async function readJevbenchV16Release(root = process.cwd()) {
  return readRelease(root, { revision: 'v1.6.0', results: JEVBENCH_V16_RELEASE_RESULTS, categories: JEVBENCH_V16_RELEASE_CATEGORIES, carry: JEVBENCH_V16_RELEASE_CARRY });
}

/** The v1.6.1 release (hosted APIs on the full item set), the live board since its publication. */
export async function readJevbenchV161Release(root = process.cwd()) {
  return readRelease(root, { revision: 'v1.6.1', results: JEVBENCH_V161_RELEASE_RESULTS, categories: JEVBENCH_V161_RELEASE_CATEGORIES, carry: JEVBENCH_V161_RELEASE_CARRY });
}
