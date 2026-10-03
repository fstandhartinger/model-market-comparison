/** Current v1.6 aggregate display contract. No IO, historic fallback or admission authority.
 * Schema follows aggregate_categories.py; callers separately bind actual admitted artifacts.
 */
const dims = ['topics', 'usecases', 'languages'];
const pins = ['scorer_sha256', 'cohort_sha256', 'labels_sha256', 'label_runtime_sha256'];
const metric = 'Raw chance-corrected competence; equal weights across present request types.';
const rules = ['API categories use A300+P300 and are unequated.', 'Self-hosted categories use S1200+P300.',
  'Failures stay in the original denominator.', 'Competence is unclipped; score clips to 0–100.',
  'Usecase and language are the original frozen metadata.', 'Empty cells are unavailable; counts below min_n are marked.'];
const require = (ok) => { if (!ok) throw new Error('Current category aggregate unavailable.'); };
const record = (v) => v !== null && typeof v === 'object' && !Array.isArray(v) && [Object.prototype, null].includes(Object.getPrototypeOf(v));
const exact = (v, keys) => { require(record(v)); require(Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v, k))); };
const key = (v) => typeof v === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,95}$/.test(v) && !['__proto__', 'prototype', 'constructor'].includes(v);
const count = (v) => Number.isSafeInteger(v) && v >= 0;
const text = (v) => typeof v === 'string' && v.length > 0 && v.length <= 400;
const date = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v;
function counts(v, min) {
  require(count(v.n) && count(v.public) && count(v.sealed) && v.n === v.public + v.sealed);
  require(typeof v.low_n === 'boolean' && v.low_n === (v.n < min));
}
/** Validates only a public aggregate shape. Hash strings are not proof of admission. */
export function validateCurrentCategoryArtifact(a) {
  exact(a, ['kind', 'benchmark', 'revision', 'min_n', 'metric', 'rules', 'provenance', ...dims, 'systems', 'plotted_coverage_complete']);
  require(a.kind === 'category-aggregates' && a.benchmark === 'jevbench' && a.revision === 'v1.6.0');
  require(count(a.min_n) && a.min_n >= 1 && a.metric === metric);
  require(Array.isArray(a.rules) && a.rules.length === rules.length && a.rules.every((r, i) => r === rules[i]));
  exact(a.provenance, pins); require(pins.every(p => typeof a.provenance[p] === 'string' && /^[0-9a-f]{64}$/.test(a.provenance[p])));
  for (const dim of dims) {
    require(Array.isArray(a[dim]) && a[dim].length > 0 && a[dim].length <= 1500);
    const seen = new Set();
    for (const d of a[dim]) {
      exact(d, ['key', 'label', 'covers', 'n', 'public', 'sealed', 'low_n']);
      require(key(d.key) && !seen.has(d.key) && text(d.label) && text(d.covers)); seen.add(d.key); counts(d, a.min_n);
    }
    require(a[dim].reduce((s, d) => s + d.n, 0) === 1500 && a[dim].reduce((s, d) => s + d.public, 0) === 300);
  }
  require(record(a.systems) && Object.keys(a.systems).length > 0);
  let coverage = true;
  for (const [systemKey, system] of Object.entries(a.systems)) {
    require(key(systemKey)); exact(system, ['lane', 'cohort', 'measured_on', 'equated', ...dims]);
    require(['api', 'selfhosted'].includes(system.lane) && system.cohort === (system.lane === 'api' ? 'A300+P300' : 'S1200+P300'));
    require(system.equated === false && date(system.measured_on));
    for (const dim of dims) {
      exact(system[dim], a[dim].map(d => d.key));
      for (const d of a[dim]) {
        const c = system[dim][d.key];
        exact(c, c?.n === 0 ? ['n', 'public', 'sealed', 'low_n', 'competence', 'score', 'unavailable'] :
          ['n', 'public', 'sealed', 'n_by_type', 'failed', 'accuracy', 'competence', 'score', 'low_n']);
        counts(c, a.min_n);
        require(c.public === d.public && c.sealed <= d.sealed && (system.lane !== 'selfhosted' || c.sealed === d.sealed));
        if (c.n === 0) require(c.competence === null && c.score === null && c.unavailable === 'No items in this lane category.');
        else {
          require(record(c.n_by_type) && Object.keys(c.n_by_type).length > 0 && Object.keys(c.n_by_type).every(t => ['choice', 'noul', 'score'].includes(t)));
          require(Object.values(c.n_by_type).every(n => count(n) && n > 0) && Object.values(c.n_by_type).reduce((s, n) => s + n, 0) === c.n);
          require(count(c.failed) && c.failed <= c.n && typeof c.accuracy === 'number' && Number.isFinite(c.accuracy) && c.accuracy >= 0 && c.accuracy <= 1);
          require(typeof c.competence === 'number' && Number.isFinite(c.competence) && typeof c.score === 'number' && c.score === Math.max(0, Math.min(100, c.competence)));
        }
        if (d.n >= a.min_n && d.key !== 'unclassified' && c.n === 0) coverage = false;
      }
      require(Object.values(system[dim]).reduce((s, c) => s + c.n, 0) === (system.lane === 'api' ? 600 : 1500));
      if (dim !== 'languages') {
        const global = a[dim].filter(d => d.key !== 'unclassified' && d.n >= a.min_n);
        if (global.length < 5 || global.filter(d => system[dim][d.key].n >= a.min_n).length < 5) coverage = false;
      }
    }
  }
  require(typeof a.plotted_coverage_complete === 'boolean' && a.plotted_coverage_complete === coverage);
  return a;
}
/** Each selected system retains its own cohort. Missing current rows have no invented date/value. */
export function currentCategoryView(artifact, pair) {
  const a = validateCurrentCategoryArtifact(artifact);
  require(Array.isArray(pair) && pair.length === 2 && pair.every(key) && pair[0] !== pair[1]);
  return { revision: a.revision, minN: a.min_n, metric: a.metric, rules: a.rules, provenance: a.provenance,
    topics: a.topics, usecases: a.usecases, systems: pair.map(k => ({ key: k, measurement: Object.hasOwn(a.systems, k) ? a.systems[k] : null })) };
}
