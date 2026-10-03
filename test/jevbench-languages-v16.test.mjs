import test from 'node:test';
import assert from 'node:assert/strict';
import { validateLanguageArtifact, languageComparisonView } from '../lib/jevbench-languages-v16.mjs';
const hash = (letter) => letter.repeat(64);
function fixture() {
  const languages = ['ar', 'da', 'zh-Hans', ...Array.from({ length: 19 }, (_, i) => `fixture-${i}`)].map((key) => ({
    key, label: `Synthetic ${key}`, public_n: ['ar', 'da', 'zh-Hans'].includes(key) ? 40 : 30,
    sealed_n: ['ar', 'da', 'zh-Hans'].includes(key) ? 40 : 30, native_review_basis: 'Invented public test descriptor, no real review' }));
  const cells = (split, api = false) => Object.fromEntries(languages.map((language) => {
    const unavailable = api && split === 'sealed', n = unavailable ? 0 : language[`${split}_n`];
    return [language.key, { status: unavailable ? 'unavailable' : 'measured', n, expected_n: n,
      non_ok_n: 0, cc: unavailable ? null : -7, accuracy: unavailable ? null : 0.25,
      measured_on: unavailable ? null : '2000-01-01T00:00:00Z', reason: unavailable ? 'API supplement public-only' : null,
      n_by_type: unavailable ? {} : { choice: n }, low_n: n < 30 }];
  }));
  const row = (name, api = false) => ({ name, deployment: api ? 'api' : 'owned', model_version: 'synthetic-version',
    public_scope_sha256: hash('a'), sealed_scope_sha256: api ? null : hash('b'), public: cells('public', api), sealed: cells('sealed', api),
    carried_base: api ? { revision: 'v1.6.0', method_version: 'synthetic-v16', measured_on: '1999-12-31', basis: 'original primary synthetic fixture', n: 600, source_sha256: hash('c') } : null });
  return { kind: 'language-diagnostics', schema_version: 1, benchmark: 'jevbench', revision: 'v1.6.0', supplement_id: 'v1.6.0-uc1.1',
    basis: 'uc1.1 Choice only', fixture: true, generated_utc: '2000-01-02T00:00:00Z', pool_manifest_sha256: hash('d'),
    method: { version: 'synthetic', source_sha256: hash('e'), description: 'Synthetic only, no official metric generated.' },
    languages, systems: { local: row('Synthetic local'), local2: row('Synthetic local2'), api: row('Synthetic API', true) } };
}
const validate = (a) => validateLanguageArtifact(a, { allowFixture: true });
const compare = (a, pair, split) => languageComparisonView(a, pair, split, { allowFixture: true });
test('synthetic marker is rejected by default and requires explicit fixture-only option', () => {
  assert.throws(() => validateLanguageArtifact(fixture()), /fixture/);
  assert.equal(validate(fixture()).languages.length, 22);
});
test('default public compares identical scope with actual per-split counts, dates and raw negative cc', () => {
  const a = fixture(), view = compare(a, ['local', 'api']);
  assert.equal(view.split, 'public'); assert.equal(view.comparable, true);
  assert.equal(view.systems.local.public.ar.cc, -7); assert.equal(view.systems.api.public.ar.n, 40);
  assert.equal(view.systems.api.sealed.ar.cc, null); assert.equal(view.systems.api.sealed.ar.n, 0);
  assert.equal(view.systems.api.carried_base.measured_on, '1999-12-31');
  for (const field of ['capability', 'composite', 'calibration', 'ci']) assert.equal(Object.hasOwn(view, field), false);
});
test('API sealed is unavailable; identical local sealed scopes compare', () => {
  const a = fixture();
  assert.equal(compare(a, ['local', 'local2'], 'sealed').comparable, true);
  const api = compare(a, ['local', 'api'], 'sealed'); assert.equal(api.comparable, false); assert.match(api.reason, /public-only/);
});
test('different or missing input-scope hash suppresses comparison', () => {
  const a = fixture(); a.systems.api.public_scope_sha256 = hash('f');
  assert.equal(compare(a, ['local', 'api']).comparable, false);
});
for (const [label, mutate] of [
  ['missing language', (a) => a.languages.pop()], ['duplicate language', (a) => a.languages[3].key = 'ar'],
  ['priority missing', (a) => { a.languages[0].key = 'fixture-unknown'; }], ['priority below40', (a) => { a.languages[0].sealed_n = 39; }],
  ['nonpriority below30', (a) => { a.languages[3].public_n = 29; }], ['measured partial', (a) => { a.systems.local.public.ar.n = 39; }],
  ['wrong expected', (a) => { a.systems.local.public.ar.expected_n = 41; }], ['native failures exceedn', (a) => { a.systems.local.public.ar.non_ok_n = 41; }],
  ['bad scope', (a) => { a.systems.local.public_scope_sha256 = 'not-a-hash'; }], ['measured scope absent', (a) => { a.systems.local.public_scope_sha256 = null; }],
  ['NaN metric', (a) => { a.systems.local.public.ar.cc = NaN; }], ['infinite metric', (a) => { a.systems.local.public.ar.cc = Infinity; }],
  ['boolean count', (a) => { a.systems.local.public.ar.n = true; }], ['bad accuracy', (a) => { a.systems.local.public.ar.accuracy = 1.1; }],
  ['nonChoice cell', (a) => { a.systems.local.public.ar.n_by_type = { noul: 40 }; }], ['false low_n', (a) => { a.systems.local.public.ar.low_n = true; }],
  ['impossible date', (a) => { a.systems.local.public.ar.measured_on = '2000-02-30'; }], ['missing generation date', (a) => { delete a.generated_utc; }], ['invalid generation date', (a) => { a.generated_utc = '2000-02-30T00:00:00Z'; }], ['future cell date', (a) => { a.systems.local.public.ar.measured_on = '2000-01-03'; }], ['future carry date', (a) => { a.systems.api.carried_base.measured_on = '2000-01-03'; }], ['carry missing method', (a) => { delete a.systems.api.carried_base.method_version; }], ['carry untracked date', (a) => { a.systems.api.carried_base.measured_on = null; }],
  ['extra sealed API exposure', (a) => { a.systems.api.sealed_scope_sha256 = hash('b'); }],
  ['API sealed wrong denominator', (a) => { a.systems.api.sealed.ar.expected_n = 40; }],
  ['unavailable becomes zero', (a) => { a.systems.api.sealed.ar.cc = 0; }], ['missing unavailable reason', (a) => { a.systems.api.sealed.ar.reason = null; }],
  ['missing system language', (a) => { delete a.systems.local.public.ar; }],
  ['item question', (a) => { a.question = 'invented fixture'; }], ['nested gold', (a) => { a.systems.local.public.ar.gold = 'invented fixture'; }],
  ['synthetic CI', (a) => { a.systems.local.public.ar.ci = [0, 100]; }], ['unsafe language key', (a) => { a.languages[3].key = '__proto__'; }],
]) test(`reject ${label}`, () => { const a = fixture(); mutate(a); assert.throws(() => validate(a)); });
test('pair must contain exactly two distinct existing systems and a real split', () => {
  for (const pair of [[], ['local'], ['local', 'local'], ['local', 'missing'], ['local', 'local2', 'api']]) assert.throws(() => compare(fixture(), pair));
  assert.throws(() => compare(fixture(), ['local', 'api'], 'pooled'));
});
test('unavailable local cell has null metrics and own expected counts, not a partial estimate', () => {
  const a = fixture(); a.systems.local.public.ar = { status: 'unavailable', n: 0, expected_n: 40, non_ok_n: 0,
    cc: null, accuracy: null, measured_on: null, reason: 'Incomplete run; output count is not a score', n_by_type: {}, low_n: true };
  assert.equal(validate(a).systems.local.public.ar.cc, null);
});

test('historical1624 sample carry retains explicit old method, source, basis and date outside supplement', () => {
  const a = fixture(); const carry = a.systems.api.carried_base;
  carry.revision = 'v1.5.5'; carry.method_version = 'synthetic-v15-method'; carry.n = 1624;
  carry.basis = 'original v1.5.5 complete synthetic primary draw';
  const view = compare(a, ['local', 'api']);
  assert.equal(view.systems.api.carried_base.n, 1624); assert.equal(view.systems.api.carried_base.method_version, 'synthetic-v15-method');
  assert.equal(view.systems.api.sealed.ar.cc, null);
});
