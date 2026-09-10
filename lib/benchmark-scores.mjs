// Versioned observations are additive: this module never writes legacy benchmark slots.
export const MISSING_STATUSES = ['unknown', 'not_tested', 'not_published', 'source_unreachable', 'contested'];
const text = (v) => typeof v === 'string' && v.trim().length > 0;
const finite = (v) => typeof v === 'number' && Number.isFinite(v);
const date = (v) => text(v) && /^\d{4}-\d\d-\d\d(?:T|$)/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v.slice(0, 10);
const url = (v) => { try { const u = new URL(v); return u.protocol === 'https:' && !u.username && !u.password; } catch { return false; } };
const fail = (message) => { throw new Error(`Benchmark scores: ${message}`); };

export function validateScoreSource(s, label) {
  if (!s || !url(s.url) || !date(s.retrieved_at) || !(s.published_at === null || date(s.published_at))
      || !/^[a-f0-9]{64}$/.test(s.sha256 || '') || !text(s.file) || s.file.startsWith('/')
      || s.file.split('/').includes('..') || !text(s.locator)) fail(`${label}: missing or invalid source provenance`);
}

export function validateBenchmarkScores(snapshot, registry, modelIds = null) {
  if (snapshot?.schema_version !== 1 || !Array.isArray(snapshot.observations) || !Array.isArray(snapshot.missing)
      || !Array.isArray(snapshot.collections) || !Array.isArray(snapshot.rejected)) fail('schema');
  const entries = new Map(registry.entries.map((e) => [e.id, e]));
  const ids = new Set();
  for (const o of snapshot.observations) {
    const e = entries.get(o.benchmark_id);
    if (!e || !text(o.id) || ids.has(o.id)) fail(`${o.id}: unknown version or duplicate id`);
    ids.add(o.id);
    if (!finite(o.value) || o.unit !== e.scoring.unit) fail(`${o.id}: numeric value/unit`);
    const [lo, hi] = e.scoring.range;
    if (lo !== null && o.value < lo || hi !== null && o.value > hi) fail(`${o.id}: outside published score range`);
    if (!['measured', 'self_reported', 'derived'].includes(o.basis)) fail(`${o.id}: invalid basis`);
    if (o.basis === 'derived' && (!['measured', 'self_reported'].includes(o.source_basis) || !text(o.derivation?.formula) || !Array.isArray(o.derivation?.inputs) || !o.derivation.inputs.length || !o.derivation.inputs.every(finite))) fail(`${o.id}: incomplete derivation`);
    if (o.basis !== 'derived' && (o.source_basis !== undefined || o.derivation !== undefined)) fail(`${o.id}: derivation requires derived basis`);
    const s = o.subject;
    if (!s || !text(s.source_id) || !text(s.name) || !(s.model_id === null || text(s.model_id))
        || !(s.variant === null || text(s.variant)) || !(s.harness === null || text(s.harness))) fail(`${o.id}: subject identity`);
    if (s.model_id !== null && modelIds && !modelIds.has(s.model_id)) fail(`${o.id}: unknown model`);
    if (!text(o.protocol) || !(o.comparison_key === null || text(o.comparison_key))) fail(`${o.id}: comparison protocol`);
    if (o.comparison_key !== null && (!text(o.comparison_note) || s.model_id === null)) fail(`${o.id}: comparison needs an exact model and documented compatibility`);
    validateScoreSource(o.source, o.id);
    if (o.supporting_sources !== undefined && !Array.isArray(o.supporting_sources)) fail(`${o.id}: supporting sources`);
    for (const source of o.supporting_sources || []) validateScoreSource(source, o.id);
  }
  const cells = new Set();
  for (const m of snapshot.missing) {
    if (!entries.has(m.benchmark_id) || !text(m.model_id) || modelIds && !modelIds.has(m.model_id)
        || !MISSING_STATUSES.includes(m.status) || !text(m.reason)) fail('invalid missing cell');
    const key = `${m.model_id}\0${m.benchmark_id}`;
    if (cells.has(key)) fail('duplicate missing cell');
    cells.add(key);
    validateScoreSource(m.source, key);
    if (m.status !== 'contested' && snapshot.observations.some((o) => o.benchmark_id === m.benchmark_id && o.subject.model_id === m.model_id)) fail('missing cell contradicts published observation');
  }
  const collectionIds = new Set();
  for (const c of snapshot.collections) {
    if (!entries.has(c.benchmark_id) || collectionIds.has(c.benchmark_id) || !text(c.reason)
        || !['collected', 'not_published', 'source_unreachable', 'contested', 'manual_required'].includes(c.status)
        || !url(c.source_url)) fail(`invalid collection ${c.benchmark_id}`);
    collectionIds.add(c.benchmark_id);
  }
  if (registry.entries.some((e) => !collectionIds.has(e.id))) fail('collection plan does not cover every registry identity');
  return snapshot;
}

// Compare only explicitly audited, same-version, same-model/configuration pairs.
// No family aliases, cross-version normalization or choice of the largest claim.
export function computeDivergences(observations) {
  const groups = new Map();
  for (const o of observations) {
    if (!o.subject.model_id || !o.comparison_key) continue;
    const key = JSON.stringify([o.subject.model_id, o.benchmark_id, o.unit, o.subject.variant, o.subject.harness, o.comparison_key]);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(o);
  }
  const result = [];
  for (const group of groups.values()) for (const claim of group.filter((o) => (o.source_basis ?? o.basis) === 'self_reported')) {
    for (const measured of group.filter((o) => (o.source_basis ?? o.basis) === 'measured')) {
      if (claim.source.url === measured.source.url) continue;
      const delta = claim.value - measured.value;
      const relative = measured.value === 0 ? null : delta / Math.abs(measured.value) * 100;
      if (!finite(delta) || relative !== null && !finite(relative)) fail('nonfinite divergence');
      result.push({ id: `${claim.id}--vs--${measured.id}`, model_id: claim.subject.model_id,
        benchmark_id: claim.benchmark_id, basis: 'derived', self_reported_id: claim.id, measured_id: measured.id,
        self_reported_value: claim.value, measured_value: measured.value, delta, unit: claim.unit,
        relative_percent: relative, formula: 'self_reported - measured; relative = delta / abs(measured) * 100; zero denominator => null',
        comparison_key: claim.comparison_key, source_urls: [claim.source.url, measured.source.url],
        source_dates: [claim.source.retrieved_at, measured.source.retrieved_at] });
    }
  }
  return result;
}

export function benchmarkCell(results, modelId, benchmarkId) {
  if (!results.registry.some((e) => e.id === benchmarkId)) throw new Error(`Unknown benchmark version: ${benchmarkId}`);
  const scores = results.observations.filter((o) => o.subject.model_id === modelId && o.benchmark_id === benchmarkId);
  const missing = results.missing.find((m) => m.model_id === modelId && m.benchmark_id === benchmarkId);
  if (missing) return { ...missing, observations: scores };
  if (scores.length) return { model_id: modelId, benchmark_id: benchmarkId, status: 'available', observations: scores };
  const collection = results.collections.find((c) => c.benchmark_id === benchmarkId);
  // A failed source is collection-level evidence; it is not proof of testing.
  const unavailable = collection?.status === 'source_unreachable';
  return { model_id: modelId, benchmark_id: benchmarkId, status: unavailable ? 'source_unreachable' : 'unknown',
    reason: unavailable ? collection.reason : 'No attributable result for this exact model configuration. Testing/publication status is unknown.',
    source_url: collection?.source_url ?? null, observations: [] };
}

export function buildBenchmarkResults(snapshot, registry, models) {
  validateBenchmarkScores(snapshot, registry, new Set(models.map((m) => m.id)));
  const results = { ...snapshot, registry: registry.entries, divergences: computeDivergences(snapshot.observations) };
  const byModel = Object.fromEntries(models.map((m) => [m.id, { total_benchmarks: registry.entries.length, available: 0,
    unknown: 0, not_tested: 0, not_published: 0, source_unreachable: 0, contested: 0, measured: 0, self_reported: 0 }]));
  const byBenchmark = Object.fromEntries(registry.entries.map((e) => [e.id, { total_models: models.length, available: 0,
    unknown: 0, not_tested: 0, not_published: 0, source_unreachable: 0, contested: 0, measured: 0, self_reported: 0,
    observations: 0, unmatched_observations: 0 }]));
  const cells = new Map();
  for (const o of snapshot.observations) {
    byBenchmark[o.benchmark_id].observations++;
    if (!o.subject.model_id) { byBenchmark[o.benchmark_id].unmatched_observations++; continue; }
    const key = `${o.subject.model_id}\0${o.benchmark_id}`;
    if (!cells.has(key)) cells.set(key, new Set());
    cells.get(key).add(o.source_basis ?? o.basis);
  }
  const missing = new Map(snapshot.missing.map((m) => [`${m.model_id}\0${m.benchmark_id}`, m.status]));
  const unreachable = new Set(snapshot.collections.filter((c) => c.status === 'source_unreachable').map((c) => c.benchmark_id));
  for (const model of models) for (const entry of registry.entries) {
    const key = `${model.id}\0${entry.id}`;
    const bases = cells.get(key);
    const status = missing.get(key) ?? (bases ? 'available' : unreachable.has(entry.id) ? 'source_unreachable' : 'unknown');
    for (const counter of [byModel[model.id], byBenchmark[entry.id]]) {
      counter[status]++;
      for (const basis of bases || []) counter[basis]++;
    }
  }
  results.coverage = { by_model: byModel, by_benchmark: byBenchmark,
    note: 'Denominators are catalog model configurations × versioned registry entries. Basis counts count covered cells, not runs; measured and self_reported may overlap. Unmatched source identities remain in observations and never inflate catalog coverage.' };
  return results;
}
