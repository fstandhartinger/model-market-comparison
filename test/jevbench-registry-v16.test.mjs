import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import { projectJevV16Registry, canonicalV16Aggregate } from '../lib/jevbench-registry-v16.mjs';
import { categoryFixture } from './jevbench-category-fixture-v16.mjs';
if (!globalThis.crypto) globalThis.crypto = webcrypto;
const H = c => c.repeat(64);
const digest = raw => createHash('sha256').update(raw).digest('hex');
const store = v => { const raw = JSON.stringify(v); return { raw, sha256: digest(raw) }; };
const keys = ['synthetic-a', 'synthetic-b'];
function languageFixture() {
  const languages = ['ar', 'da', 'zh-Hans', ...Array.from({ length: 19 }, (_, i) => `synthetic-${i}`)].map(key => ({ key, label: `Synthetic ${key}`, sealed_n: ['ar', 'da', 'zh-Hans'].includes(key) ? 40 : 30, public_n: ['ar', 'da', 'zh-Hans'].includes(key) ? 40 : 30, native_review_basis: 'Synthetic; no actual labels or review.' }));
  const row = (api) => ({ name: 'Synthetic only', deployment: api ? 'api' : 'owned', model_version: 'synthetic-version', public_scope_sha256: H('b'), sealed_scope_sha256: api ? null : H('c'),
    public: Object.fromEntries(languages.map(l => [l.key, { status: 'measured', n: l.public_n, expected_n: l.public_n, non_ok_n: 1, cc: -7, accuracy: .25, measured_on: '2000-01-02', reason: null, n_by_type: { choice: l.public_n }, low_n: false }])),
    sealed: Object.fromEntries(languages.map(l => [l.key, api ? { status: 'unavailable', n: 0, expected_n: 0, non_ok_n: 0, cc: null, accuracy: null, measured_on: null, reason: 'API public-only.', n_by_type: {}, low_n: true } : { status: 'measured', n: l.sealed_n, expected_n: l.sealed_n, non_ok_n: 0, cc: -2, accuracy: .3, measured_on: '2000-01-02', reason: null, n_by_type: { choice: l.sealed_n }, low_n: false }])), carried_base: null });
  return { kind: 'language-diagnostics', schema_version: 1, benchmark: 'jevbench', revision: 'v1.6.0', supplement_id: 'v1.6.0-uc1.1', basis: 'uc1.1 Choice only', fixture: true, generated_utc: '2000-01-03T00:00:00Z', pool_manifest_sha256: H('b'), method: { version: 'synthetic', source_sha256: H('c'), description: 'Synthetic only' }, languages, systems: { 'synthetic-a': row(false), 'synthetic-b': row(true) } };
}
function parts() {
  const allKeys = [...keys, ...Array.from({ length: 113 }, (_, i) => `unmeasured-${i}`), 'fastino-gliner-2-5-decide'];
  const absent = allKeys.slice(112, 115);
  const registry = { source_status: 'INACTIVE_SOURCE_CANDIDATE', public_roster_count: 115, public_sha256: H('d'),
    catalogue: Object.fromEntries(allKeys.map(key => [key, { display: `Synthetic ${key}`, author: 'Synthetic author', historical_cost: { kind: 'estimate', usd_per_1000: .03, basis: 'Historical synthetic per1000 estimate.' }, historical_price_scenario: null }])),
    scorer_registry: Object.fromEntries(allKeys.filter(k => !absent.includes(k)).map(key => [key, { display: `Synthetic ${key}`, lane: key === 'synthetic-b' || key === 'fastino-gliner-2-5-decide' ? 'api' : 'selfhosted', endpoint_kind: key === 'synthetic-b' || key === 'fastino-gliner-2-5-decide' ? 'api' : 'own-server', author: 'Synthetic author', support: { choice: 'confidence', noul: 'confidence', score: 'confidence' } }])), pending_scorer_metadata_keys: absent };
  const categories = categoryFixture(), languages = languageFixture();
  const systems = keys.map((key, i) => ({ key, display: `Synthetic ${key}`, endpoint_kind: i ? 'api' : 'own-server', api_flag: !!i, ranked: true, full_coverage: true, status: { status: 'complete' }, axes: { intelligence: 80 + i * 10, calibration: 60 + i * 10, speed: 70, cost: 80 }, capability: 70 + i * 10, jevbench_score: 65 + i, cost: { kind: 'estimate', usd_per_1000: .1, basis: 'Disclosed synthetic carry cost; not billing.' }, speed: { n: i ? 600 : 1500, p50_s_raw: .2, p50_s_adjusted: .3, adjustment: i ? 'none (API)' : 'x2 + .15 assumption' }, v16: { lane: i ? 'api' : 'selfhosted', n_items: i ? 600 : 1500, n_public: 300, n_sealed_side: i ? 300 : 1200, complete: true } }));
  const rows = Object.fromEntries(keys.map((key, i) => [key, { key, status: 'current', measurement_revision: 'v1.6.0', method_version: 'synthetic-v16', model_version: 'synthetic-version', model_pin: `synthetic-pin-${i}`, measured_on: i ? '2000-01-02' : '2000-01-01', origin_sha256: H('e'), score_row_sha256: H('e'), scorer_sha256: H('a'), cohort_sha256: H('a'), serving: { lane: i ? 'api' : 'selfhosted', endpoint_kind: i ? 'api' : 'own-server', endpoint_condition: null, api_flag: !!i }, cost_rank_eligible: true, cost_admission_sha256: H('f') }]));
  return { registry, categories, languages, systems, rows, ref: { key: 'synthetic-a', usd_per_1000: .1, p50_s_adjusted: .3, cost_factor: 2, latency_factor: 2, source_sha256: H('a') } };
}
function input(p = parts()) {
  const registry = store(p.registry), categories = store(p.categories), languages = store(p.languages), origins = {};
  for (const row of p.systems) {
    const b = p.rows[row.key]; b.score_row_sha256 = digest(canonicalV16Aggregate(row));
    const origin = store({ kind: 'jevbench-measurement-origin', ...Object.fromEntries(['key', 'measurement_revision', 'method_version', 'model_version', 'model_pin', 'measured_on', 'scorer_sha256', 'cohort_sha256', 'serving'].map(k => [k, b[k]])) }); b.origin_sha256 = origin.sha256; origins[origin.sha256] = origin;
  }
  const referenceOrigin = store({ kind: 'jevbench-frozen-capability-reference', key: p.ref.key, model_version: 'synthetic-reference-version', model_pin: null, measurement_revision: 'synthetic-historic-reference', measured_on: null, ...Object.fromEntries(['usd_per_1000','p50_s_adjusted','cost_factor','latency_factor'].map(k => [k, p.ref[k]])) }); p.ref.source_sha256 = referenceOrigin.sha256; origins[referenceOrigin.sha256] = referenceOrigin;
  const release = store({ benchmark: 'JevBench', revision: 'v1.6.0', protocol: 'jevbench::v1.6', systems: p.systems, board: { capability: { order: [...keys].reverse() } }, projection: { schema_version: 1, fixture: true, generated_on: '2000-01-03', registry_sha256: registry.sha256, scorer_sha256: H('a'), method_version: 'synthetic-v16', category_sha256: categories.sha256, language_sha256: languages.sha256, category_provenance: p.categories.provenance, capability_reference: p.ref } });
  const bindings = store({ kind: 'jevbench-measurement-bindings', revision: 'v1.6.0', release_sha256: release.sha256, public_sha256: p.registry.public_sha256, rows: p.rows, diagnostics: Object.fromEntries(p.systems.filter(r => r.ranked).map(r => { const b = p.rows[r.key]; return [r.key, { key: r.key, model_version: b.model_version, model_pin: b.model_pin, main_measured_on: b.measured_on, category_sha256: categories.sha256, language_sha256: languages.sha256, category_provenance: p.categories.provenance, language_pool_sha256: p.languages.pool_manifest_sha256, language_method_sha256: p.languages.method.source_sha256 }]; })) });
  return { registry, release, bindings, categories, languages, origins };
}
const project = i => projectJevV16Registry(i, { allowFixture: true });
test('full catalogue, exact dates/pins, native600/1500 and unequated raw category negatives preserved', async () => {
  const i = input(), before = JSON.stringify(i), out = await project(i);
  assert.equal(out.catalogue_count, 116); assert.equal(out.approval, null); assert.deepEqual(out.capability_order, ['synthetic-b', 'synthetic-a']);
  const a = out.rows.find(r => r.key === 'synthetic-a'), b = out.rows.find(r => r.key === 'synthetic-b');
  assert.equal(a.measurement.model_pin, 'synthetic-pin-0'); assert.equal(a.measurement.measured_on, '2000-01-01'); assert.equal(b.categories.cohort, 'A300+P300'); assert.equal(a.categories.cohort, 'S1200+P300'); assert.equal(b.categories.equated, false);
  assert.equal(a.categories.topics['synthetic-0'].competence, -12.5); assert.equal(a.language.public.ar.cc, -7); assert.equal(b.language.sealed.ar.cc, null);
  assert.equal(a.cost.kind, 'estimate'); assert.match(a.cost.basis, /not billing/); assert.equal(JSON.stringify(i), before);
  const missing = out.rows.filter(r => r.status === 'metadata-unavailable'); assert.equal(missing.length, 3); assert.ok(missing.every(r => r.capability === null && r.measurement === null && r.headline_eligible === false));
});
test('frozen median and cost caps replace uncapped scorer board; exact boundaries inclusive', async () => {
  const p = parts(); p.systems[1].axes.intelligence = 100; p.systems[1].axes.calibration = 100; p.systems[1].capability = 100; p.systems[1].speed.p50_s_adjusted = .60001;
  const o = await project(input(p)); assert.deepEqual(o.capability_order, ['synthetic-a']); assert.equal(o.rows[1].capability, 100); assert.match(o.rows[1].eligibility_reasons.join(), /latency cap/);
  p.systems[1].speed.p50_s_adjusted = .6; p.systems[1].cost.usd_per_1000 = .2; assert.deepEqual((await project(input(p))).capability_order, ['synthetic-b', 'synthetic-a']);
  p.systems[1].cost.usd_per_1000 = .20001; assert.deepEqual((await project(input(p))).capability_order, ['synthetic-a']);
});
test('finite unadmitted cost remains outside headline, while declared ranked conflict refuses', async () => {
  const p = parts(); p.rows['synthetic-b'].cost_rank_eligible = false; p.rows['synthetic-b'].cost_admission_sha256 = null;
  await assert.rejects(project(input(p))); p.systems[1].ranked = false; p.systems[1].not_ranked_because = 'Cost not admitted.';
  const out = await project(input(p)), row = out.rows.find(r => r.key === 'synthetic-b'); assert.equal(row.cost.usd_per_1000, .1); assert.equal(row.headline_eligible, false); assert.equal(row.capability, 80); assert.equal(row.categories, null);
});
test('explicit unpriced finite operational estimate never enters capped ranking', async () => {
  const p = parts(); p.systems[1].ranked = false; p.systems[1].cost.kind = 'unpriced'; p.rows['synthetic-b'].cost_rank_eligible = false; p.rows['synthetic-b'].cost_admission_sha256 = null;
  assert.equal((await project(input(p))).rows[1].headline_eligible, false); p.rows['synthetic-b'].cost_rank_eligible = true; p.rows['synthetic-b'].cost_admission_sha256 = H('f'); await assert.rejects(project(input(p)));
});
test('API/base scenario bars separate; selfhost scenario never changes GPU latency', async () => {
  const p = parts(); p.systems[0].price_scenarios = [{ role: 'developer_api_list', usd_per_1000: .02, kind: 'estimate', basis: 'API list scenario only.', source_sha256: H('f') }]; p.systems[1].price_scenarios = [{ role: 'base_model_reference', usd_per_1000: .8, kind: 'estimate', basis: 'Striped base reference.', source_sha256: H('f') }];
  const out = await project(input(p)); assert.equal(out.rows[0].speed.p50_s_adjusted, .3); assert.equal(out.rows[0].cost.usd_per_1000, .1); assert.equal(out.rows[0].cost.bars[1].role, 'developer_api_list'); assert.equal(out.rows[1].cost.bars[1].ranking_eligible, false); assert.equal(out.rows[1].headline_eligible, true);
});
test('dated carry is never reclassified current or assigned current category values', async () => {
  const p = parts(); p.rows['synthetic-a'].status = 'carry'; p.rows['synthetic-a'].measurement_revision = 'v1.5.5'; await assert.rejects(project(input(p)));
  p.systems[0].ranked = false; p.rows['synthetic-a'].measured_on = null; const row = (await project(input(p))).rows[0]; assert.equal(row.status, 'carry'); assert.equal(row.measurement.measured_on, null); assert.equal(row.categories, null); assert.equal(row.headline_eligible, false);
});
test('fixture projection cannot pass production defaults', async () => { await assert.rejects(projectJevV16Registry(input())); });
for (const [label, mutate] of [
  ['missing ranked category', p => { delete p.categories.systems['synthetic-a']; }],
  ['missing ranked language', p => { delete p.languages.systems['synthetic-a']; }],
  ['category date conflict', p => { p.categories.systems['synthetic-a'].measured_on = '2000-01-02'; }],
  ['category lane conflict', p => { p.rows['synthetic-a'].serving.lane = 'api'; }],
  ['category scorer conflict', p => { p.categories.provenance.scorer_sha256 = H('c'); }],
  ['language version conflict', p => { p.languages.systems['synthetic-a'].model_version = 'wrong-version'; }],
  ['date absent', p => { delete p.rows['synthetic-a'].measured_on; }],
  ['future date', p => { p.rows['synthetic-a'].measured_on = '2000-01-04'; }],
  ['invalid date', p => { p.rows['synthetic-a'].measured_on = '2000-02-30'; }],
  ['model pin absent', p => { p.rows['synthetic-a'].model_pin = null; }],
  ['existing model pin conflict', p => { p.systems[0].model_pin = 'conflicting-pin'; }],
  ['existing date conflict', p => { p.systems[0].last_measured_on = '1999-12-31'; }],
  ['duplicate row', p => { p.systems.push(structuredClone(p.systems[0])); }],
  ['unsupported metadata row', p => { p.systems[0].key = p.registry.pending_scorer_metadata_keys[0]; p.rows[p.systems[0].key] = { ...p.rows['synthetic-a'], key: p.systems[0].key }; }],
  ['false native denominator', p => { p.systems[0].v16.n_items = 600; }],
  ['false API public count', p => { p.systems[1].v16.n_public = 299; }],
  ['capability cached lie', p => { p.systems[0].capability = 100; }],
  ['axes boolean', p => { p.systems[0].axes.intelligence = true; }],
  ['p50 boolean', p => { p.systems[0].speed.p50_s_adjusted = true; }],
  ['missing adjusted median', p => { delete p.systems[0].speed.p50_s_adjusted; }],
  ['ranked incomplete', p => { p.systems[0].status.status = 'partial'; p.systems[0].v16.complete = false; }],
  ['estimate lacks admission', p => { p.rows['synthetic-a'].cost_admission_sha256 = null; }],
  ['reference no cost', p => { p.ref.usd_per_1000 = 0; }],

  ['reference arbitrary cap', p => { p.ref.cost_factor = 10; }],
  ['catalogue removal', p => { delete p.registry.catalogue['unmeasured-2']; }],
  ['invented fourth support', p => { p.registry.pending_scorer_metadata_keys.pop(); }],
  ['negative scenario price', p => { p.systems[0].price_scenarios = [{ role: 'developer_api_list', usd_per_1000: -1, kind: 'estimate', basis: 'Synthetic', source_sha256: H('f') }]; }],
  ['scenario smuggled old axes', p => { p.systems[0].price_scenarios = [{ role: 'developer_api_list', usd_per_1000: .1, kind: 'estimate', basis: 'Synthetic', source_sha256: H('f'), axes: { cost: 100 } }]; }],
]) test(`refuse ${label}`, async () => { const p = parts(); mutate(p); await assert.rejects(async () => project(input(p))); });
test('row binding/whole bytes/origin mismatch and duplicate first JSON fail before projection', async () => {
  const i = input(); i.release.raw += ' '; await assert.rejects(project(i));
  const j = input(); const b = JSON.parse(j.bindings.raw); b.rows['synthetic-a'].score_row_sha256 = H('f'); j.bindings = store(b); await assert.rejects(project(j));
  const k = input(); const first = Object.keys(k.origins)[0]; delete k.origins[first]; await assert.rejects(project(k));
  const l = input(); l.registry.raw = l.registry.raw.replace('"public_roster_count":115', '"public_roster_count":115,"public_roster_count":115'); l.registry.sha256 = digest(l.registry.raw); await assert.rejects(project(l));
});

test('completed low-coverage listing stays listed without false incomplete receipt or headline', async () => {
 const p = parts(); p.systems[0].full_coverage = false; p.systems[0].ranked = false; p.systems[0].not_ranked_because = 'No full coverage.';
 const row = (await project(input(p))).rows[0]; assert.equal(row.ranked, false); assert.equal(row.capability, 70); assert.equal(row.categories, null);
});
test('catalogue source facts and unknown historic date survive without inferred current metadata', async () => {
 const p = parts(); p.registry.catalogue['unmeasured-0'].last_measured_on = null; p.registry.catalogue['unmeasured-0'].model_pin = 'old-explicit-pin';
 const row = (await project(input(p))).rows.find(r => r.key === 'unmeasured-0'); assert.equal(row.catalogue.author, 'Synthetic author'); assert.equal(row.catalogue.last_measured_on, null); assert.equal(row.catalogue.model_pin, 'old-explicit-pin'); assert.equal(row.measurement, null);
});
test('old price axes/scores/views never emerge as current alternatives', async () => {
 const p = parts(); p.registry.catalogue['synthetic-a'].historical_price_scenario = { label: 'Old scenario', usd_per_1000: .4, axes: { cost: 99 }, scores: { A: 99 }, views: { fake: 99 } };
 const row = (await project(input(p))).rows[0]; assert.deepEqual(row.historical_price_scenario, { label: 'Old scenario', usd_per_1000: .4 }); assert.equal(row.cost.bars.length, 1);
});
for (const [name, mutate] of [
 ['current method from wrong version', p => { p.rows['synthetic-a'].method_version = 'old-v15'; }],
 ['current scorer from old source', p => { p.rows['synthetic-a'].scorer_sha256 = H('c'); }],
 ['aggregate axes body', p => { p.systems[0].axes.task = 'synthetic body'; }],
 ['aggregate speed body', p => { p.systems[0].speed.gold = 'synthetic'; }],
 ['aggregate cost body', p => { p.systems[0].cost.question = 'synthetic'; }],
]) test(`reject ${name}`, async () => { const p = parts(); mutate(p); await assert.rejects(project(input(p))); });

for (const [name, mutate] of [
 ['contradictory cost eligibility', p => { p.systems[0].cost_rank_eligible = false; }],
 ['contradictory serving condition', p => { p.systems[0].endpoint_condition = 'contradictory'; }],
 ['cap multiplication overflow', p => { p.ref.usd_per_1000 = 1e308; }],
 ['display conflicts with catalogue', p => { p.systems[0].display = 'Wrong alias'; }],
]) test(`reject ${name}`, async () => { const p = parts(); mutate(p); await assert.rejects(project(input(p))); });
test('escaped duplicate keys and unused overflow reject at first parse', async () => {
 const i = input(); i.registry.raw = i.registry.raw.replace('"public_roster_count":115', '"public_roster_count":115,"public_roster_\\u0063ount":115'); i.registry.sha256 = digest(i.registry.raw); await assert.rejects(project(i));
 const j = input(); j.registry.raw = j.registry.raw.replace('{', '{"unused_numeric":1e999,'); j.registry.sha256 = digest(j.registry.raw); await assert.rejects(project(j));
});

test('declared support preserved only for113 registered rows; three missing registrations remain null', async () => {
 const out = await project(input()); assert.equal(out.rows.filter(r => r.registration !== null).length, 113); assert.ok(out.rows.filter(r => r.status === 'metadata-unavailable').every(r => r.registration === null));
 assert.deepEqual(out.rows.find(r => r.key === 'fastino-gliner-2-5-decide').registration.support, { choice: 'confidence', noul: 'confidence', score: 'confidence' });
});
test('missing support metadata and decoded unpaired surrogate refuse', async () => {
 const p = parts(); delete p.registry.scorer_registry['synthetic-a'].support; await assert.rejects(project(input(p)));
 const i = input(); i.registry.raw = i.registry.raw.replace('Synthetic author', '\\ud800'); i.registry.sha256 = digest(i.registry.raw); await assert.rejects(project(i));
});

test('diagnostic per-key modelpin/version/source bindings cannot borrow a same-name model', async () => {
 for (const [field, bad] of [['model_pin','wrong-pin'],['model_version','wrong-version'],['category_sha256',H('f')],['language_sha256',H('f')],['language_method_sha256',H('f')],['main_measured_on','1999-12-31']]) {
   const i = input(), b = JSON.parse(i.bindings.raw); b.diagnostics['synthetic-a'][field] = bad; i.bindings = store(b); await assert.rejects(project(i));
 }
 const i = input(), b = JSON.parse(i.bindings.raw); delete b.diagnostics['synthetic-a']; i.bindings = store(b); await assert.rejects(project(i));
});
test('median without measured latency samples and malformed p95/n cannot be classified', async () => {
 for (const patch of [{ n: 0 }, { n: true }, { p95_s_adjusted: true }, { adjustment: false }]) {
  const p = parts(); Object.assign(p.systems[0].speed, patch); await assert.rejects(project(input(p)));
 }
});

test('frozen reference requires actual origin bytes and exact metrics/key identity', async () => {
 const i = input(), release = JSON.parse(i.release.raw), h = release.projection.capability_reference.source_sha256; delete i.origins[h]; await assert.rejects(project(i));
 for (const patch of [{ key: 'synthetic-b' }, { usd_per_1000: .7 }, { p50_s_adjusted: .8 }, { model_version: null }, { measured_on: '2000-01-04' }]) {
  const i = input(), r = JSON.parse(i.release.raw), origin = JSON.parse(i.origins[r.projection.capability_reference.source_sha256].raw); Object.assign(origin, patch); const o = store(origin); i.origins[o.sha256] = o; r.projection.capability_reference.source_sha256 = o.sha256; i.release = store(r); const b = JSON.parse(i.bindings.raw); b.release_sha256 = i.release.sha256; i.bindings = store(b); await assert.rejects(project(i));
 }
});
test('nonfixture requires Jev1.13.0 identity, never an arbitrary catalogue reference', async () => {
 const i = input(), r = JSON.parse(i.release.raw), l = JSON.parse(i.languages.raw); r.projection.fixture = false; l.fixture = false; i.languages = store(l); r.projection.language_sha256 = i.languages.sha256; i.release = store(r); const b = JSON.parse(i.bindings.raw); b.release_sha256 = i.release.sha256; i.bindings = store(b); await assert.rejects(projectJevV16Registry(i));
});
