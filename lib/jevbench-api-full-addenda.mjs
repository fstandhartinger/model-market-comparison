import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { jevWithApiA4Rows } from './jevbench-scope.mjs';

export const API_FULL_ADDENDA_PATH = 'data/jevbench-api-full-addenda.json';
const sha = (x) => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x);
const finite = (x) => Number.isFinite(x) && x >= 0 && x <= 100;
const fail = (m) => { throw new Error(`API full addendum: ${m}`); };
const privateKeys = /^(?:item_ids?|opaque_ids?|gold|expected|predictions?|labels_by_item|per_item|items|gold_labels|raw|credentials?|api_key|password|token|secret|prompt|messages|answers?)$/i;
function aggregateOnly(value) {
  if (!value || typeof value !== 'object') return;
  for (const [k, v] of Object.entries(value)) {
    if (privateKeys.test(k)) fail(`non-aggregate field ${k}`);
    aggregateOnly(v);
  }
}
function exactKeys(value, keys, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(name);
  if (Object.keys(value).some(k => !keys.includes(k))) fail(`${name}: unknown field`);
}

// Match the existing release-shaped aggregate row; unknown nested fields never
// become a route from this public registry to item records or arbitrary objects.
const tiers = ['easy', 'standard', 'hard', 'judge'];
const types = ['choice', 'noul', 'score'];
function leaves(value, keys, name) {
  exactKeys(value, keys, name);
  if (Object.values(value).some(v => v !== null && typeof v === 'object')) fail(`${name}: scalar aggregates required`);
}
function intervals(value, keys, name) {
  exactKeys(value, keys, name);
  for (const interval of Object.values(value)) {
    if (!Array.isArray(interval) || interval.length !== 2 || interval.some(v => !Number.isFinite(v))) fail(`${name}: aggregate interval required`);
  }
}
function aggregateRowObjects(r) {
  leaves(r.scores, ['A', 'B', 'C'], 'scores');
  leaves(r.axes, ['intelligence', 'calibration', 'cost', 'speed'], 'axes');
  if (r.ranks !== undefined) leaves(r.ranks, ['A', 'B', 'C', 'capability'], 'ranks');
  leaves(r.cost, ['basis', 'common_basis', 'kind', 'usage_estimated_rows', 'usd_per_1000'], 'cost');
  leaves(r.speed, ['adjustment', 'n', 'p50_s_adjusted', 'p50_s_raw', 'p95_s_adjusted', 'p95_s_raw'], 'speed');
  leaves(r.status, ['answered_ok', 'missing', 'rows', 'status'], 'status');
  if (r.composite_ci95 !== undefined) intervals(r.composite_ci95, ['A', 'B', 'C'], 'composite CI');
  if (r.capability_ci95 !== undefined && (!Array.isArray(r.capability_ci95) || r.capability_ci95.length !== 2 || r.capability_ci95.some(v => !Number.isFinite(v)))) fail('capability CI');
  if (r.intelligence !== undefined) {
    exactKeys(r.intelligence, ['I_open', 'I_sealed', 'base', 'excess', 'gap', 'penalty', 'per_type_split'], 'intelligence');
    const { per_type_split, ...scalar } = r.intelligence;
    leaves(scalar, ['I_open', 'I_sealed', 'base', 'excess', 'gap', 'penalty'], 'intelligence aggregate');
    if (per_type_split !== undefined) {
      exactKeys(per_type_split, types.flatMap(t => [`open|${t}`, `sealed|${t}`]), 'per-type split');
      for (const cell of Object.values(per_type_split)) {
        exactKeys(cell, ['cc', 'n', 'tiers'], 'per-type cell');
        leaves({ cc: cell.cc }, ['cc'], 'per-type competence');
        leaves(cell.n, tiers, 'per-tier counts'); leaves(cell.tiers, tiers, 'per-tier competence');
      }
    }
  }
  if (r.calibration !== undefined) {
    exactKeys(r.calibration, ['score', 'parts'], 'calibration');
    leaves({ score: r.calibration.score }, ['score'], 'calibration score');
    if (r.calibration.parts !== undefined) {
      exactKeys(r.calibration.parts, types, 'calibration parts');
      for (const part of Object.values(r.calibration.parts)) leaves(part, ['ece_hard', 'ece_score', 'mean_tvd', 'n', 'n_ece_hard', 'n_tvd', 'score', 'abstention_rate', 'brier', 'ece', 'interval90_coverage', 'interval90_width', 'nrps', 'top_ece'], 'calibration part');
    }
  }
  const v = r.v16;
  exactKeys(v, ['api_subset', 'api_subset_tag', 'breakdowns_equated', 'ci95', 'ci95_n', 'complete', 'equated', 'equating_flag', 'equating_offset', 'full_set_api', 'g_med_used', 'lane', 'metric_basis', 'n_items', 'n_public', 'n_sealed_side', 'on_S', 'per_type', 'raw_on_A', 'set', 'run_sha256', 'measured_on'], 'v16');
  const { ci95, on_S, per_type, equating_offset, raw_on_A, ...scalar } = v;
  leaves(scalar, Object.keys(scalar), 'v16 scalar aggregates');
  if (equating_offset !== undefined && equating_offset !== null) leaves(equating_offset, ['I', 'C'], 'equating offset');
  if (raw_on_A !== undefined && raw_on_A !== null) fail('full-set row has subset aggregates');
  if (on_S !== undefined) leaves(on_S, ['intelligence', 'calibration', 'capability'], 'sealed aggregate');
  if (ci95 !== undefined) {
    exactKeys(ci95, ['B', 'C', 'I', 'capability', 'composite', 'seed'], 'v16 CI');
    leaves({ B: ci95.B, seed: ci95.seed }, ['B', 'seed'], 'bootstrap metadata');
    for (const key of ['C', 'I', 'capability']) if (ci95[key] !== undefined) intervals({ [key]: ci95[key] }, [key], 'v16 interval');
    if (ci95.composite !== undefined) intervals(ci95.composite, ['A', 'B', 'C'], 'v16 composite CI');
  }
  if (per_type !== undefined) {
    exactKeys(per_type, types, 'v16 per-type');
    for (const part of Object.values(per_type)) {
      exactKeys(part, ['accuracy', 'calibration', 'cc', 'cc_by_type', 'cc_tiered', 'cc_tiered_open', 'cc_tiered_sealed', 'low_n', 'n', 'n_by_type', 'score'], 'v16 per-type part');
      const { cc_by_type, n_by_type, ...counts } = part;
      leaves(counts, Object.keys(counts), 'per-type scalar aggregates');
      if (cc_by_type !== undefined) leaves(cc_by_type, types, 'competence by type');
      if (n_by_type !== undefined) leaves(n_by_type, types, 'counts by type');
    }
  }
  if (r.model_pin !== undefined && r.model_pin !== null && typeof r.model_pin === 'object') leaves(r.model_pin, ['model', 'version', 'revision', 'deployment', 'response_model', 'provider', 'endpoint'], 'model identity');
  const nested = new Set(['scores', 'ranks', 'axes', 'cost', 'speed', 'status', 'composite_ci95', 'capability_ci95', 'intelligence', 'calibration', 'v16', 'model_pin']);
  for (const [key, value] of Object.entries(r)) if (!nested.has(key) && value !== null && typeof value === 'object') fail(`row ${key}: scalar required`);
}

/** Only a Root-authorized staged or published aggregate bundle can enter the API board.
 * Source preparation ships an empty registry. No inference, custody grant or scorer runs here. */
export function validateApiFullAddenda(a) {
  exactKeys(a, ['schema_version', 'kind', 'entries'], 'registry');
  if (a.schema_version !== 1 || a.kind !== 'jevbench-api-full-addenda' || !Array.isArray(a.entries)) fail('registry schema');
  aggregateOnly(a);
  const seen = new Set();
  for (const e of a.entries) {
    exactKeys(e, ['key', 'published_at', 'prepared_at', 'publication_status', 'release', 'provenance', 'row', 'coverage'], 'entry');
    if (!e.key || seen.has(e.key) || e.row?.key !== e.key) fail('duplicate/mismatched key');
    seen.add(e.key);
    if (!e.release) fail('missing release');
    if (e.publication_status === 'published') {
      if (typeof e.published_at !== 'string' || !Number.isFinite(Date.parse(e.published_at))) fail('published timestamp required');
    } else if (e.publication_status === 'approved_for_publication') {
      if (e.published_at != null || typeof e.prepared_at !== 'string' || !Number.isFinite(Date.parse(e.prepared_at))) fail('staged release timestamp required; not published');
    } else fail('unpublished entry');
    const p = e.provenance;
    exactKeys(p, ['parent', 'method', 'g_med_s', 'counts', 'cost_n', 'input_sha256', 'run_sha256', 'scorer_sha256', 'categories_sha256', 'acceptance_sha256', 'publication_receipt_sha256', 'release_authorization_sha256', 'cost_mask_sha256', 'source_url'], 'provenance');
    if (!p.parent || p.method !== 'O1S' || !(p.g_med_s > 0) || p.counts?.S !== 1200 || p.counts?.P !== 300 || p.cost_n !== 1479) fail('incomplete full-set provenance');
    for (const k of ['input_sha256', 'run_sha256', 'scorer_sha256', 'categories_sha256', 'acceptance_sha256', 'cost_mask_sha256']) if (!sha(p[k])) fail(`missing ${k}`);
    if (e.publication_status === 'published') {
      if (!sha(p.publication_receipt_sha256)) fail('missing publication receipt');
    } else {
      if (!sha(p.release_authorization_sha256) || p.publication_receipt_sha256 != null) fail('staged release authorization required; no publication receipt');
    }
    if (typeof p.source_url !== 'string' || !/^https:\/\//.test(p.source_url)) fail('public source URL');
    const r = e.row;
    exactKeys(r, ['key', 'display', 'author', 'class', 'open', 'licence', 'repo', 'endpoint_kind', 'endpoint_condition', 'api_flag', 'ranked', 'rank', 'ranks', 'listing', 'not_ranked_because', 'jevbench_score', 'scores', 'composite_ci95', 'capability', 'capability_ci95', 'axes', 'intelligence', 'calibration', 'cost', 'speed', 'status', 'v16', 'last_measured_on', 'model_pin'], 'aggregate row');
    exactKeys(p.counts, ['S', 'P'], 'counts');
    aggregateRowObjects(r);
    if (r.api_flag !== true || r.v16?.lane !== 'api' || r.v16.full_set_api !== true || r.v16.n_items !== 1500 || r.v16.equated !== false || r.v16.api_subset_tag || r.a4) fail('API full-set row required');
    if (r.v16.run_sha256 !== p.run_sha256 || r.status?.rows !== 1500 || r.status?.status !== 'complete' || !Number.isInteger(r.status.answered_ok) || r.status.answered_ok < 0 || r.status.answered_ok > 1500) fail('incomplete run');
    if (!finite(r.capability) || !['A', 'B', 'C'].every(k => finite(r.scores?.[k])) || !['intelligence', 'calibration', 'speed', 'cost'].every(k => finite(r.axes?.[k]))) fail('invalid score axes');
    if (!(r.speed?.p50_s_raw > 0) || r.speed.p50_s_adjusted !== r.speed.p50_s_raw || r.speed.adjustment !== 'none (API)' || !(r.cost?.usd_per_1000 >= 0) || !r.cost.basis) fail('native speed/cost required');
    if (r.alt || r.base_model_reference || r.reference_bar) fail('API-only base reference');
    exactKeys(e.coverage, ['topics', 'usecases', 'languages'], 'coverage');
    for (const [dim, count] of [['topics', 7], ['usecases', 20], ['languages', 23]]) {
      const cells = e.coverage[dim];
      if (!Array.isArray(cells) || cells.length !== count || new Set(cells.map(c => c.key)).size !== count) fail(`${dim}: complete inventory required`);
      for (const c of cells) {
        exactKeys(c, ['key', 'label', 'n', 'answered_ok', 'coverage_n', 'errors', 'competence', 'types', 'pool'], `${dim} cell`);
        if (!c.key || !c.label || !c.pool || !Number.isInteger(c.n) || c.n < 0 || !Number.isInteger(c.answered_ok) || !Number.isInteger(c.errors) || c.answered_ok < 0 || c.errors < 0 || c.answered_ok + c.errors !== c.n) fail(`${dim}: counts`);
        if (c.coverage_n !== undefined && (!Number.isInteger(c.coverage_n) || c.coverage_n < c.answered_ok || c.coverage_n > c.n)) fail(`${dim}: completed coverage`);
        if (!Array.isArray(c.types) || c.types.some(t => !['choice', 'noul', 'score'].includes(t)) || new Set(c.types).size !== c.types.length) fail(`${dim}: types`);
        if (c.n < 15 ? c.competence !== null : !(Number.isFinite(c.competence) && c.competence >= -100 && c.competence <= 100)) fail(`${dim}: official cell minimum`);
      }
    }
  }
  return a;
}

export async function readApiFullAddenda(root = process.cwd()) {
  return validateApiFullAddenda(JSON.parse(await readFile(path.join(root, API_FULL_ADDENDA_PATH), 'utf8')));
}

export function withApiFullAddenda(artifact, registry) {
  validateApiFullAddenda(registry);
  for (const e of registry.entries) if (artifact.systems.some(r => r.key === e.key)) fail('existing model cannot be overridden');
  return jevWithApiA4Rows(artifact, { full_rows: registry.entries.map(e => ({ ...e.row, fresh_api_addendum: { release: e.release, ...e.provenance } })) });
}

/** Preserve all labels separately; only eligible official cells join the scoring view. */
// Only this validated registry builder can attach independent row-pool bounds.
// A copied/hand-authored artifact gets no exemption from historical bounds.
const categoryBounds = new WeakMap();
export const apiFullAddendumCategoryBounds = artifact => categoryBounds.get(artifact);
export const hasApiFullAddendumCategories = artifact => categoryBounds.has(artifact);
export function withApiFullAddendumCategories(base, registry) {
  validateApiFullAddenda(registry);
  if (!registry.entries.length) return base;
  const systems = { ...base.systems };
  const bounds = {};
  for (const e of registry.entries) {
    if (systems[e.key]) fail('existing category row cannot be overridden');
    const pools = [...new Set(Object.values(e.coverage).flat().map(c => c.pool))];
    const row = { coverage: pools.join('; ') };
    for (const dim of ['topics', 'usecases', 'languages']) {
      const taxonomy = new Set(base[dim].map(c => c.key));
      if (e.coverage[dim].some(c => !taxonomy.has(c.key))) fail(`${dim}: taxonomy mismatch`);
      row[dim] = Object.fromEntries(e.coverage[dim].filter(c => c.n >= 15).map(c => [c.key, { n: c.n, coverage_n: c.coverage_n ?? c.answered_ok, competence: c.competence, pool: c.pool }]));
    }
    systems[e.key] = row;
    bounds[e.key] = Object.freeze(Object.fromEntries(['topics', 'usecases', 'languages'].map(dim => [dim,
      Object.freeze(Object.fromEntries(e.coverage[dim].map(c => [c.key, c.n])))])));
  }
  const artifact = { ...base, systems };
  categoryBounds.set(artifact, Object.freeze(bounds));
  return artifact;
}

export function coverageStatus(cell) {
  return cell.n < 15 ? 'insufficient sample — N/A' : cell.n < 30 ? 'low sample — table only' : (cell.coverage_n ?? cell.answered_ok) < 30 ? 'fewer than 30 completed — table only' : 'radar sample minimum met';
}
