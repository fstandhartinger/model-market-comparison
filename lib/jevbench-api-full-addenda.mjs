import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { jevWithApiA4Rows } from './jevbench-scope.mjs';

export const API_FULL_ADDENDA_PATH = 'data/jevbench-api-full-addenda.json';
const sha = (x) => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x);
const finite = (x) => Number.isFinite(x) && x >= 0 && x <= 100;
const fail = (m) => { throw new Error(`API full addendum: ${m}`); };
const privateKeys = /^(?:item_ids?|opaque_ids?|gold|expected|predictions?|labels_by_item|raw|credentials?|api_key|password|token|secret|prompt|messages|answers?)$/i;
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

/** Only an explicitly published aggregate bundle can enter the live API board.
 * Source preparation ships an empty registry. No inference, custody grant or scorer runs here. */
export function validateApiFullAddenda(a) {
  exactKeys(a, ['schema_version', 'kind', 'entries'], 'registry');
  if (a.schema_version !== 1 || a.kind !== 'jevbench-api-full-addenda' || !Array.isArray(a.entries)) fail('registry schema');
  aggregateOnly(a);
  const seen = new Set();
  for (const e of a.entries) {
    exactKeys(e, ['key', 'published_at', 'publication_status', 'release', 'provenance', 'row', 'coverage'], 'entry');
    if (!e.key || seen.has(e.key) || e.row?.key !== e.key) fail('duplicate/mismatched key');
    seen.add(e.key);
    if (e.publication_status !== 'published' || !Number.isFinite(Date.parse(e.published_at)) || !e.release) fail('unpublished entry');
    const p = e.provenance;
    exactKeys(p, ['parent', 'method', 'g_med_s', 'counts', 'cost_n', 'input_sha256', 'run_sha256', 'scorer_sha256', 'categories_sha256', 'acceptance_sha256', 'publication_receipt_sha256', 'cost_mask_sha256', 'source_url'], 'provenance');
    if (!p.parent || p.method !== 'O1S' || !(p.g_med_s > 0) || p.counts?.S !== 1200 || p.counts?.P !== 300 || p.cost_n !== 1479) fail('incomplete full-set provenance');
    for (const k of ['input_sha256', 'run_sha256', 'scorer_sha256', 'categories_sha256', 'acceptance_sha256', 'publication_receipt_sha256', 'cost_mask_sha256']) if (!sha(p[k])) fail(`missing ${k}`);
    if (typeof p.source_url !== 'string' || !/^https:\/\//.test(p.source_url)) fail('public source URL');
    const r = e.row;
    exactKeys(r, ['key', 'display', 'author', 'class', 'open', 'licence', 'repo', 'endpoint_kind', 'endpoint_condition', 'api_flag', 'ranked', 'rank', 'ranks', 'listing', 'not_ranked_because', 'jevbench_score', 'scores', 'composite_ci95', 'capability', 'capability_ci95', 'axes', 'intelligence', 'calibration', 'cost', 'speed', 'status', 'v16', 'last_measured_on', 'model_pin'], 'aggregate row');
    exactKeys(p.counts, ['S', 'P'], 'counts');
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
        exactKeys(c, ['key', 'label', 'n', 'answered_ok', 'errors', 'competence', 'types', 'pool'], `${dim} cell`);
        if (!c.key || !c.label || !c.pool || !Number.isInteger(c.n) || c.n < 0 || !Number.isInteger(c.answered_ok) || !Number.isInteger(c.errors) || c.answered_ok < 0 || c.errors < 0 || c.answered_ok + c.errors !== c.n) fail(`${dim}: counts`);
        if (!Array.isArray(c.types) || c.types.some(t => !['choice', 'noul', 'score'].includes(t)) || new Set(c.types).size !== c.types.length) fail(`${dim}: types`);
        if (c.n < 15 ? c.competence !== null : !finite(c.competence)) fail(`${dim}: official cell minimum`);
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
export function withApiFullAddendumCategories(base, registry) {
  validateApiFullAddenda(registry);
  if (!registry.entries.length) return base;
  const systems = { ...base.systems };
  for (const e of registry.entries) {
    if (systems[e.key]) fail('existing category row cannot be overridden');
    const row = { coverage: 'S+P' };
    for (const dim of ['topics', 'usecases', 'languages']) {
      const taxonomy = new Set(base[dim].map(c => c.key));
      if (e.coverage[dim].some(c => !taxonomy.has(c.key))) fail(`${dim}: taxonomy mismatch`);
      row[dim] = Object.fromEntries(e.coverage[dim].filter(c => c.n >= 15).map(c => [c.key, { n: c.n, coverage_n: c.answered_ok, competence: c.competence }]));
    }
    systems[e.key] = row;
  }
  return { ...base, systems };
}

export function coverageStatus(cell) {
  return cell.n < 15 ? 'insufficient sample — N/A' : cell.n < 30 ? 'low sample — table only' : cell.answered_ok < 30 ? 'fewer than 30 completed — table only' : 'radar sample minimum met';
}
