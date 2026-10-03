/** SOURCE-ONLY uc1.1 aggregate contract. No release artifact, score calculation or item I/O. */
export const LANGUAGE_DIAGNOSTIC_MIN_N = 30;
const fail = (message) => { throw new Error(`Language diagnostics: ${message}`); };
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const exact = (value, keys, where) => {
  if (!record(value) || Object.keys(value).length !== keys.length || keys.some((key) => !Object.hasOwn(value, key))) fail(`${where}: fields`);
};
const text = (value) => typeof value === 'string' && value.trim().length > 0 && value.length <= 10000;
const hash = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const count = (value) => Number.isSafeInteger(value) && value >= 0;
const safeKey = (key) => text(key) && !['__proto__', 'constructor', 'prototype'].includes(key);
const date = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2}))?$/.test(value) || !Number.isFinite(Date.parse(value))) return false;
  const day = value.slice(0, 10);
  return new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) === day;
};
function validateCell(cell, expected, where, generated) {
  exact(cell, ['status', 'n', 'expected_n', 'non_ok_n', 'cc', 'accuracy', 'measured_on', 'reason', 'n_by_type', 'low_n'], where);
  if (![cell.n, cell.expected_n, cell.non_ok_n].every(count) || cell.expected_n !== expected || typeof cell.low_n !== 'boolean' || cell.low_n !== (cell.n < LANGUAGE_DIAGNOSTIC_MIN_N)) fail(`${where}: counts`);
  if (cell.status === 'measured') {
    if (cell.n !== expected || expected === 0 || cell.non_ok_n > cell.n || !Number.isFinite(cell.cc) || cell.cc > 100 || !Number.isFinite(cell.accuracy) || cell.accuracy < 0 || cell.accuracy > 1 || !date(cell.measured_on) || Date.parse(cell.measured_on) > generated || cell.reason !== null) fail(`${where}: measured cell`);
    exact(cell.n_by_type, ['choice'], `${where}.n_by_type`);
    if (cell.n_by_type.choice !== cell.n) fail(`${where}: Choice count`);
  } else if (cell.status === 'unavailable') {
    if (cell.n !== 0 || cell.non_ok_n !== 0 || cell.cc !== null || cell.accuracy !== null || cell.measured_on !== null || !text(cell.reason)) fail(`${where}: unavailable cell`);
    exact(cell.n_by_type, [], `${where}.n_by_type`);
  } else fail(`${where}: status`);
}
export function validateLanguageArtifact(a, { allowFixture = false } = {}) {
  exact(a, ['kind', 'schema_version', 'benchmark', 'revision', 'supplement_id', 'basis', 'fixture', 'generated_utc', 'pool_manifest_sha256', 'method', 'languages', 'systems'], 'artifact');
  if (a.kind !== 'language-diagnostics' || a.schema_version !== 1 || a.benchmark !== 'jevbench' || a.revision !== 'v1.6.0' || a.supplement_id !== 'v1.6.0-uc1.1' || a.basis !== 'uc1.1 Choice only' || typeof a.fixture !== 'boolean' || typeof allowFixture !== 'boolean' || (a.fixture && !allowFixture) || !hash(a.pool_manifest_sha256)) fail('identity / fixture / pool');
  if (!date(a.generated_utc) || !a.generated_utc.includes('T') || !a.generated_utc.endsWith('Z')) fail('generation UTC provenance');
  const generated = Date.parse(a.generated_utc);
  exact(a.method, ['version', 'source_sha256', 'description'], 'method');
  if (!text(a.method.version) || !text(a.method.description) || !hash(a.method.source_sha256)) fail('method provenance');
  if (!Array.isArray(a.languages) || a.languages.length !== 22) fail('22 owner-provided languages required');
  const known = new Set();
  for (const language of a.languages) {
    exact(language, ['key', 'label', 'sealed_n', 'public_n', 'native_review_basis'], 'language');
    if (!safeKey(language.key) || known.has(language.key) || !text(language.label) || !text(language.native_review_basis)) fail('language identity / review basis');
    known.add(language.key);
    const minimum = ['ar', 'da', 'zh-Hans'].includes(language.key) ? 40 : 30;
    if (![language.sealed_n, language.public_n].every(count) || language.sealed_n < minimum || language.public_n < minimum) fail('language split floors');
  }
  if (['ar', 'da', 'zh-Hans'].some((key) => !known.has(key)) || ['public_n', 'sealed_n'].some((split) => a.languages.reduce((sum, language) => sum + language[split], 0) < 690)) fail('priority languages / split total');
  if (!record(a.systems) || Object.keys(a.systems).length === 0) fail('system rows required');
  for (const [key, system] of Object.entries(a.systems)) {
    exact(system, ['name', 'deployment', 'model_version', 'public_scope_sha256', 'sealed_scope_sha256', 'public', 'sealed', 'carried_base'], `system ${key}`);
    if (!safeKey(key) || !text(system.name) || !text(system.model_version) || !['owned', 'api'].includes(system.deployment)) fail('system identity');
    for (const split of ['public', 'sealed']) {
      const scope = system[`${split}_scope_sha256`];
      if (scope !== null && !hash(scope)) fail(`${key}: scope hash`);
      exact(system[split], [...known], `${key}.${split}`);
      if (system.deployment === 'api' && split === 'sealed' && scope !== null) fail('API sealed supplement forbidden');
      for (const language of a.languages) {
        const expected = system.deployment === 'api' && split === 'sealed' ? 0 : language[`${split}_n`];
        const cell = system[split][language.key];
        validateCell(cell, expected, `${key}.${split}.${language.key}`, generated);
        if (cell.status === 'measured' && scope === null) fail('measured scope absent');
      }
    }
    if (system.carried_base !== null) {
      exact(system.carried_base, ['revision', 'method_version', 'measured_on', 'basis', 'n', 'source_sha256'], 'carried base');
      const carry = system.carried_base;
      if (!text(carry.revision) || !text(carry.method_version) || !text(carry.basis) || !date(carry.measured_on) || Date.parse(carry.measured_on) > generated || !count(carry.n) || carry.n === 0 || !hash(carry.source_sha256)) fail('carried original measurement provenance');
    }
  }
  return a;
}
export function languageComparisonView(a, keys, split = 'public', options = {}) {
  validateLanguageArtifact(a, options);
  if (!Array.isArray(keys) || keys.length !== 2 || keys[0] === keys[1] || keys.some((key) => typeof key !== 'string' || !Object.hasOwn(a.systems, key)) || !['public', 'sealed'].includes(split)) fail('comparison pair / split');
  const rows = keys.map((key) => a.systems[key]);
  const scopes = rows.map((row) => row[`${split}_scope_sha256`]);
  const apiSealed = split === 'sealed' && rows.some((row) => row.deployment === 'api');
  const comparable = !apiSealed && scopes[0] !== null && scopes[0] === scopes[1];
  return { revision: a.revision, generated_utc: a.generated_utc, basis: a.basis, split, method: a.method, languages: a.languages,
    systems: Object.fromEntries(keys.map((key) => [key, a.systems[key]])), comparable,
    reason: comparable ? null : apiSealed ? 'Hosted API supplements are public-only; original sealed measurement is dated separately.' : 'Input scope hashes differ or this split has not been measured.', minN: LANGUAGE_DIAGNOSTIC_MIN_N };
}
