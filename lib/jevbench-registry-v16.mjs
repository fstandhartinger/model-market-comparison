/** Pure PUBLIC aggregate projection. No IO, artifact adoption or admission authority.
 * Caller authenticates the expected stored hashes/source approvals separately.
 * Existing v1.5 page, scorer and chart helpers are intentionally not reused here.
 */
import { validateCurrentCategoryArtifact } from './jevbench-categories-v16.mjs';
import { validateLanguageArtifact } from './jevbench-languages-v16.mjs';

const refuse = () => { throw new Error('Final v1.6 registry projection unavailable.'); };
const need = (ok) => { if (!ok) refuse(); };
const record = (v) => v !== null && typeof v === 'object' && !Array.isArray(v) && [Object.prototype, null].includes(Object.getPrototypeOf(v));
const exact = (v, keys) => { need(record(v) && Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v, k))); };
const unicode = (s) => { for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); if (c >= 0xd800 && c <= 0xdbff) { const n = s.charCodeAt(++i); if (!(n >= 0xdc00 && n <= 0xdfff)) return false; } else if (c >= 0xdc00 && c <= 0xdfff) return false; } return true; };
const text = (v) => typeof v === 'string' && v.trim().length > 0 && v.length <= 4000;
const key = (v) => text(v) && /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,95}$/.test(v) && !['__proto__', 'constructor', 'prototype'].includes(v);
const hash = (v) => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const number = (v) => typeof v === 'number' && Number.isFinite(v);
const nonnegative = (v) => number(v) && v >= 0;
const date = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v;
const same = (a, b) => canonical(a) === canonical(b);
const copy = (v) => structuredClone(v);
const categoryPins = ['scorer_sha256', 'cohort_sha256', 'labels_sha256', 'label_runtime_sha256'];

/** Canonical aggregate row binding; never hashes protected item bodies. */
export function canonicalV16Aggregate(v) { return canonical(v); }
function canonical(v) {
  if (v === null || typeof v === 'boolean' || typeof v === 'string') return JSON.stringify(v);
  if (number(v)) return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  need(record(v)); return `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`;
}
async function sha(raw) {
  need(typeof raw === 'string' && raw.length > 0 && raw.length <= 16 * 1024 * 1024);
  // Reject unpaired UTF16 surrogates before UTF8's replacement normalization.
  for (let i = 0; i < raw.length; i++) {
    const c = raw.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) { const next = raw.charCodeAt(++i); need(next >= 0xdc00 && next <= 0xdfff); }
    else need(c < 0xdc00 || c > 0xdfff);
  }
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  return [...new Uint8Array(digest)].map(n => n.toString(16).padStart(2, '0')).join('');
}
/** Duplicate-preserving first JSON parse; no reviver after JSON.parse collapse. */
function strictJSON(raw) {
  let i = 0;
  const ws = () => { while (/[\t\r\n ]/.test(raw[i] ?? '') && i < raw.length) i++; };
  const string = () => {
    const start = i++; let escaped = false;
    while (i < raw.length) {
      const c = raw[i++];
      if (!escaped && c === '"') { let out; try { out = JSON.parse(raw.slice(start, i)); } catch { refuse(); } need(unicode(out)); return out; }
      if (!escaped && c === '\\') escaped = true; else escaped = false;
    }
    refuse();
  };
  const value = (depth) => {
    need(depth < 100); ws(); const c = raw[i];
    if (c === '"') return string();
    if (c === '{') {
      i++; ws(); const out = Object.create(null);
      if (raw[i] === '}') { i++; return out; }
      while (true) {
        need(raw[i] === '"'); const k = string(); need(!Object.hasOwn(out, k)); ws(); need(raw[i++] === ':');
        out[k] = value(depth + 1); ws(); const sep = raw[i++]; if (sep === '}') return out; need(sep === ','); ws();
      }
    }
    if (c === '[') {
      i++; ws(); const out = []; if (raw[i] === ']') { i++; return out; }
      while (true) { out.push(value(depth + 1)); ws(); const sep = raw[i++]; if (sep === ']') return out; need(sep === ','); }
    }
    for (const [literal, v] of [['null', null], ['true', true], ['false', false]]) if (raw.startsWith(literal, i)) { i += literal.length; return v; }
    const match = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(raw.slice(i)); need(match); i += match[0].length; const n = Number(match[0]); need(number(n)); return n;
  };
  const result = value(0); ws(); need(i === raw.length); return result;
}
async function stored(v) {
  exact(v, ['raw', 'sha256']); need(hash(v.sha256)); need(await sha(v.raw) === v.sha256); return strictJSON(v.raw);
}
const nullMetric = () => ({ intelligence: null, calibration: null, speed: null, cost: null });
function registration(meta) {
  if (meta === undefined) return null;
  need(record(meta) && text(meta.display) && ['api','selfhosted'].includes(meta.lane) && text(meta.endpoint_kind));
  exact(meta.support, ['choice','noul','score']); need(Object.values(meta.support).every(text));
  need(meta.author === undefined || meta.author === null || text(meta.author));
  return { display: meta.display, author: meta.author ?? null, lane: meta.lane, endpoint_kind: meta.endpoint_kind, support: copy(meta.support) };
}
function catalogueMetadata(c) {
  need(record(c));
  const scalarKeys = ['display', 'author', 'repo', 'licence', 'class', 'open', 'listing', 'not_ranked_because', 'last_measured_on', 'measurement_date_status', 'endpoint_kind', 'api_flag', 'endpoint_condition', 'model_pin', 'underlying', 'public_v155_ranked', 'scorer_registry_status'];
  return Object.fromEntries(scalarKeys.map(k => { const v = c[k] ?? null; need(v === null || typeof v === 'boolean' || typeof v === 'string'); return [k, v]; }));
}
function historicPrice(c) {
  const v = c.historical_cost;
  if (v === undefined || v === null) return null;
  need(record(v));
  const out = Object.fromEntries(['kind', 'usd_per_1000', 'basis'].map(k => [k, v[k] ?? null]));
  need(out.usd_per_1000 === null || nonnegative(out.usd_per_1000));
  need(out.kind === null || text(out.kind)); need(out.basis === null || text(out.basis));
  return out;
}
function historicScenario(c) {
  const v = c.historical_price_scenario;
  if (v === undefined || v === null) return null;
  need(record(v));
  // No historical axes/scores/views can escape as current alternatives.
  const out = {};
  for (const k of ['label', 'note', 'basis', 'cost_basis', 'kind', 'usd_per_1000']) if (Object.hasOwn(v, k)) {
    need(k === 'usd_per_1000' ? nonnegative(v[k]) : v[k] === null || text(v[k])); out[k] = copy(v[k]);
  }
  return out;
}
function price(row, binding, lane) {
  need(record(row.cost) && Object.keys(row.cost).every(k => ['kind','usd_per_1000','basis','usage_estimated_rows'].includes(k)) && ['measured', 'estimate', 'estimated', 'mixed', 'unpriced'].includes(row.cost.kind) && text(row.cost.basis));
  const cost = row.cost.usd_per_1000;
  need(cost === null || nonnegative(cost)); need(typeof binding.cost_rank_eligible === 'boolean');
  if (row.cost.kind === 'unpriced') need(binding.cost_rank_eligible === false);
  if (binding.cost_rank_eligible) {
    need(cost !== null && row.cost.kind !== 'unpriced' && hash(binding.cost_admission_sha256));
  } else need(binding.cost_admission_sha256 === null || hash(binding.cost_admission_sha256));
  const bars = [{ role: 'served_cost', usd_per_1000: cost, kind: row.cost.kind, basis: row.cost.basis, ranking_eligible: binding.cost_rank_eligible }];
  if (row.price_scenarios !== undefined) {
    need(Array.isArray(row.price_scenarios) && row.price_scenarios.length <= 2); const roles = new Set();
    for (const p of row.price_scenarios) {
      exact(p, ['role', 'usd_per_1000', 'kind', 'basis', 'source_sha256']);
      need(['base_model_reference', 'developer_api_list'].includes(p.role) && !roles.has(p.role) && nonnegative(p.usd_per_1000) && ['measured', 'estimate', 'estimated'].includes(p.kind) && text(p.basis) && hash(p.source_sha256));
      roles.add(p.role); bars.push({ ...copy(p), ranking_eligible: false });
    }
  }
  // Scenarios are disclosure bars. They never replace GPU latency or served cost.
  return { ...copy(row.cost), cost_rank_eligible: binding.cost_rank_eligible, admission_sha256: binding.cost_admission_sha256, serving_lane: lane, bars };
}
function bindingFor(b, row, today) {
  exact(b, ['key', 'status', 'measurement_revision', 'method_version', 'model_version', 'model_pin', 'measured_on', 'origin_sha256', 'score_row_sha256', 'scorer_sha256', 'cohort_sha256', 'serving', 'cost_rank_eligible', 'cost_admission_sha256']);
  need(key(b.key) && b.key === row.key && ['current', 'carry'].includes(b.status) && text(b.measurement_revision) && text(b.method_version) && text(b.model_version) && text(b.model_pin) && hash(b.origin_sha256) && hash(b.score_row_sha256) && hash(b.scorer_sha256) && hash(b.cohort_sha256));
  need(b.measured_on === null || date(b.measured_on) && b.measured_on <= today);
  if (b.status === 'current') need(b.measurement_revision === 'v1.6.0' && date(b.measured_on));
  else need(b.measurement_revision !== 'v1.6.0');
  exact(b.serving, ['lane', 'endpoint_kind', 'endpoint_condition', 'api_flag']);
  need(['api', 'selfhosted'].includes(b.serving.lane) && text(b.serving.endpoint_kind) && (b.serving.endpoint_condition === null || text(b.serving.endpoint_condition)) && typeof b.serving.api_flag === 'boolean' && b.serving.api_flag === (b.serving.lane === 'api'));
  need(row.endpoint_kind === b.serving.endpoint_kind && row.api_flag === b.serving.api_flag);
  if (Object.hasOwn(row, 'endpoint_condition')) need(row.endpoint_condition === b.serving.endpoint_condition);
  if (Object.hasOwn(row, 'cost_rank_eligible')) need(row.cost_rank_eligible === b.cost_rank_eligible);
  for (const [field, expected] of [['model_pin', b.model_pin], ['model_version', b.model_version], ['last_measured_on', b.measured_on]]) if (Object.hasOwn(row, field)) need(row[field] === expected);
  return b;
}
function categoryProfile(a, b) {
  const m = a.systems[b.key]; need(m && b.status === 'current' && m.lane === b.serving.lane && m.measured_on === b.measured_on);
  need(a.provenance.scorer_sha256 === b.scorer_sha256 && a.provenance.cohort_sha256 === b.cohort_sha256);
  return { kind: 'current', measured_on: m.measured_on, lane: m.lane, cohort: m.cohort, equated: false,
    topics: copy(m.topics), usecases: copy(m.usecases), languages: copy(m.languages) };
}
function diagnosticsFor(manifest, b, categories, languages, input) {
  const d = manifest[b.key];
  exact(d, ['key','model_version','model_pin','main_measured_on','category_sha256','language_sha256','category_provenance','language_pool_sha256','language_method_sha256']);
  need(d.key === b.key && d.model_version === b.model_version && d.model_pin === b.model_pin && d.main_measured_on === b.measured_on && d.category_sha256 === input.categories.sha256 && d.language_sha256 === input.languages.sha256);
  need(same(d.category_provenance, categories.provenance) && d.language_pool_sha256 === languages.pool_manifest_sha256 && d.language_method_sha256 === languages.method.source_sha256);
}
function languageProfile(a, b) {
  const m = a.systems[b.key]; need(m && m.model_version === b.model_version && m.deployment === (b.serving.lane === 'api' ? 'api' : 'owned'));
  // Supplement dates belong to their own cells. They are not the main score date.
  return copy(m);
}

/** Hash-bound public inputs only; no self-authentication or current artifact fallback.
 * bindings joins actual aggregate rows to upstream version/pin/date provenance.
 * A stored binding manifest is data, never a source/runtime/release approval.
 */
export async function projectJevV16Registry(input, { allowFixture = false } = {}) {
  exact(input, ['registry', 'release', 'bindings', 'categories', 'languages', 'origins']); need(typeof allowFixture === 'boolean');
  const [registry, release, bindings, categories, languages] = await Promise.all([input.registry, input.release, input.bindings, input.categories, input.languages].map(stored));
  const p = release.projection;
  exact(p, ['schema_version', 'fixture', 'generated_on', 'registry_sha256', 'scorer_sha256', 'method_version', 'category_sha256', 'language_sha256', 'category_provenance', 'capability_reference']);
  need(p.schema_version === 1 && typeof p.fixture === 'boolean' && (!p.fixture || allowFixture) && date(p.generated_on));
  need(release.benchmark === 'JevBench' && release.revision === 'v1.6.0' && release.protocol === 'jevbench::v1.6' && Array.isArray(release.systems));
  need(p.registry_sha256 === input.registry.sha256 && p.category_sha256 === input.categories.sha256 && p.language_sha256 === input.languages.sha256 && hash(p.scorer_sha256) && text(p.method_version));
  need(registry.public_roster_count === 115 && hash(registry.public_sha256) && record(registry.catalogue) && record(registry.scorer_registry) && Array.isArray(registry.pending_scorer_metadata_keys));
  const catalogueKeys = Object.keys(registry.catalogue); need(catalogueKeys.length === 116 && catalogueKeys.every(key) && Object.hasOwn(registry.catalogue, 'fastino-gliner-2-5-decide'));
  need(Object.keys(registry.scorer_registry).length === 113 && registry.pending_scorer_metadata_keys.length === 3 && new Set(registry.pending_scorer_metadata_keys).size === 3);
  need(registry.pending_scorer_metadata_keys.every(k => Object.hasOwn(registry.catalogue, k) && !Object.hasOwn(registry.scorer_registry, k)));
  need(Object.keys(registry.scorer_registry).every(k => Object.hasOwn(registry.catalogue, k)));
  for (const meta of Object.values(registry.scorer_registry)) registration(meta);
  exact(bindings, ['kind', 'revision', 'release_sha256', 'public_sha256', 'rows', 'diagnostics']);
  need(bindings.kind === 'jevbench-measurement-bindings' && bindings.revision === 'v1.6.0' && bindings.release_sha256 === input.release.sha256 && bindings.public_sha256 === registry.public_sha256 && record(bindings.rows) && record(bindings.diagnostics));
  validateCurrentCategoryArtifact(categories); validateLanguageArtifact(languages, { allowFixture });
  need(languages.fixture === p.fixture && languages.generated_utc.slice(0, 10) <= p.generated_on);
  need(Object.keys(categories.systems).every(k => Object.hasOwn(registry.catalogue, k)) && Object.keys(languages.systems).every(k => Object.hasOwn(registry.catalogue, k)));
  exact(p.category_provenance, categoryPins); need(same(p.category_provenance, categories.provenance) && categories.provenance.scorer_sha256 === p.scorer_sha256);
  const ref = p.capability_reference;
  exact(ref, ['key', 'usd_per_1000', 'p50_s_adjusted', 'cost_factor', 'latency_factor', 'source_sha256']);
  need((p.fixture || ref.key === 'jev-1.13.0') && key(ref.key) && Object.hasOwn(registry.catalogue, ref.key) && number(ref.usd_per_1000) && ref.usd_per_1000 > 0 && number(ref.p50_s_adjusted) && ref.p50_s_adjusted > 0 && ref.cost_factor === 2 && ref.latency_factor === 2 && hash(ref.source_sha256));
  need(number(ref.usd_per_1000 * ref.cost_factor) && number(ref.p50_s_adjusted * ref.latency_factor));
  need(record(input.origins)); const origins = Object.create(null);
  for (const [h, v] of Object.entries(input.origins)) { need(hash(h) && v.sha256 === h); origins[h] = await stored(v); }
  const referenceOrigin = origins[ref.source_sha256];
  exact(referenceOrigin, ['kind','key','model_version','model_pin','measurement_revision','measured_on','usd_per_1000','p50_s_adjusted','cost_factor','latency_factor']);
  need(referenceOrigin.kind === 'jevbench-frozen-capability-reference' && text(referenceOrigin.model_version) && (referenceOrigin.model_pin === null || text(referenceOrigin.model_pin)) && text(referenceOrigin.measurement_revision) && (referenceOrigin.measured_on === null || date(referenceOrigin.measured_on) && referenceOrigin.measured_on <= p.generated_on));
  need(['key','usd_per_1000','p50_s_adjusted','cost_factor','latency_factor'].every(k => referenceOrigin[k] === ref[k]));
  const seen = new Set(), measured = new Map();
  for (const row of release.systems) {
    need(record(row) && key(row.key) && !seen.has(row.key) && Object.hasOwn(registry.scorer_registry, row.key)); seen.add(row.key);
    const b = bindingFor(bindings.rows[row.key], row, p.generated_on); need(await sha(canonical(row)) === b.score_row_sha256);
    const origin = origins[b.origin_sha256]; need(origin); exact(origin, ['kind', 'key', 'measurement_revision', 'method_version', 'model_version', 'model_pin', 'measured_on', 'scorer_sha256', 'cohort_sha256', 'serving']);
    need(origin.kind === 'jevbench-measurement-origin' && ['key', 'measurement_revision', 'method_version', 'model_version', 'model_pin', 'measured_on', 'scorer_sha256', 'cohort_sha256', 'serving'].every(k => same(origin[k], b[k])));
    const meta = registry.scorer_registry[row.key]; need(text(meta.display) && row.display === meta.display && registry.catalogue[row.key].display === meta.display); need(meta.lane === b.serving.lane && meta.endpoint_kind === b.serving.endpoint_kind);
    exact(row.axes, ['intelligence','calibration','speed','cost']);
    need(record(row.axes) && ['intelligence', 'calibration', 'speed', 'cost'].every(k => row.axes[k] === null || number(row.axes[k])) && typeof row.ranked === 'boolean');
    const I = row.axes.intelligence, C = row.axes.calibration; const capability = I === null || C === null ? null : (I + C) / 2; need(capability === null || number(capability));
    if (Object.hasOwn(row, 'capability')) need(row.capability === capability);
    const pricing = price(row, b, b.serving.lane);
    need(record(row.speed) && Object.keys(row.speed).every(k => ['p50_s_raw','p95_s_raw','p50_s_adjusted','p95_s_adjusted','n','adjustment'].includes(k)));
    for (const k of ['p50_s_raw','p95_s_raw','p50_s_adjusted','p95_s_adjusted']) if (Object.hasOwn(row.speed,k)) need(row.speed[k] === null || nonnegative(row.speed[k]));
    need(Number.isSafeInteger(row.speed.n) && row.speed.n >= 0 && (row.speed.adjustment === undefined || text(row.speed.adjustment)));
    const median = row.speed?.p50_s_adjusted; need(median === null || nonnegative(median) && row.speed.n > 0);
    if (row.speed?.p50_s_raw !== undefined) need(row.speed.p50_s_raw === null || nonnegative(row.speed.p50_s_raw));
    need(row.jevbench_score === null || number(row.jevbench_score));
    need(typeof row.full_coverage === 'boolean');
    const runComplete = row.status?.status === 'complete', complete = runComplete && row.full_coverage;
    if (b.status === 'current') need(b.method_version === p.method_version && b.scorer_sha256 === p.scorer_sha256 && b.cohort_sha256 === categories.provenance.cohort_sha256 && row.v16?.lane === b.serving.lane && row.v16.n_items === (b.serving.lane === 'api' ? 600 : 1500) && row.v16.n_public === 300 && row.v16.n_sealed_side === (b.serving.lane === 'api' ? 300 : 1200) && row.v16.complete === runComplete);
    if (row.ranked) need(complete && date(b.measured_on) && capability !== null && row.jevbench_score !== null && pricing.cost_rank_eligible);
    const reasons = [];
    if (!row.ranked) reasons.push(text(row.not_ranked_because) ? row.not_ranked_because : 'Not ranked.');
    if (!pricing.cost_rank_eligible) reasons.push('Cost has no admission for capped rankings.');
    if (pricing.usd_per_1000 === null) reasons.push('Cost unavailable.');
    else if (pricing.usd_per_1000 > ref.usd_per_1000 * ref.cost_factor) reasons.push('Outside the cost cap.');
    if (median === null) reasons.push('Median latency unavailable.');
    else if (median > ref.p50_s_adjusted * ref.latency_factor) reasons.push('Outside the median latency cap.');
    if (capability === null) reasons.push('Capability unavailable.');
    let category = null, language = null;
    if (row.ranked) { diagnosticsFor(bindings.diagnostics, b, categories, languages, input); category = categoryProfile(categories, b); language = languageProfile(languages, b); }
    measured.set(row.key, { key: row.key, display: meta.display, status: b.status, ranked: row.ranked,
      catalogue: catalogueMetadata(registry.catalogue[row.key]), registration: registration(meta), measurement: copy(b), axes: copy(row.axes), composite: row.jevbench_score, capability,
      headline_eligible: reasons.length === 0, eligibility_reasons: reasons, cost: pricing, speed: copy(row.speed),
      categories: category, language, historical_price: historicPrice(registry.catalogue[row.key]),
      historical_price_scenario: historicScenario(registry.catalogue[row.key]) });
  }
  const rankedKeys = release.systems.filter(r => r.ranked).map(r => r.key); need(Object.keys(bindings.diagnostics).length === rankedKeys.length && Object.keys(bindings.diagnostics).every(k => rankedKeys.includes(k)));
  need(Object.keys(bindings.rows).length === seen.size && Object.keys(bindings.rows).every(k => seen.has(k)));
  const rows = catalogueKeys.map(k => measured.get(k) ?? { key: k, display: registry.catalogue[k].display,
    catalogue: catalogueMetadata(registry.catalogue[k]), registration: registration(registry.scorer_registry[k]), status: registry.pending_scorer_metadata_keys.includes(k) ? 'metadata-unavailable' : 'unmeasured', ranked: false, measurement: null,
    axes: nullMetric(), composite: null, capability: null, headline_eligible: false, eligibility_reasons: ['No complete bound measurement.'],
    cost: { kind: 'unpriced', usd_per_1000: null, basis: 'No final measurement.', cost_rank_eligible: false, bars: [] }, speed: null,
    categories: null, language: null, historical_price: historicPrice(registry.catalogue[k]),
    historical_price_scenario: historicScenario(registry.catalogue[k]) });
  const order = (field, pred) => rows.filter(pred).sort((a, b) => b[field] - a[field] || a.key.localeCompare(b.key)).map(r => r.key);
  return { revision: release.revision, fixture: p.fixture, catalogue_count: rows.length, reference: copy(ref), reference_origin: copy(referenceOrigin), rows,
    capability_order: order('capability', r => r.headline_eligible), composite_order: order('composite', r => r.ranked),
    category_descriptors: { topics: copy(categories.topics), usecases: copy(categories.usecases), languages: copy(categories.languages) },
    language_descriptors: copy(languages.languages), category_provenance: copy(categories.provenance),
    source_hashes: { registry: input.registry.sha256, release: input.release.sha256, bindings: input.bindings.sha256, categories: input.categories.sha256, languages: input.languages.sha256 },
    approval: null };
}
