import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readMultimodalPreviewV02 } from '../lib/jevbench-multimodal-preview.mjs';
import { validateImageJevV02CategoryArtifact as validate, imageJevV02CategoryView as view } from '../lib/imagejev-v02-categories.mjs';

// TEST ONLY: actual frozen aggregate release identities/configuration pins, invented
// category memberships and competences. Never write these fixtures under data/public.
const release = await readMultimodalPreviewV02();
const native = [...release.artifact.ranking, ...release.artifact.measured_unrankable_rows].map((r) => r.key);
const coverage = release.artifact.release_provenance['Configuration receipts'];
const refs = coverage.filter((r) => r.status === 'source-unavailable').map((r) => r.key);
const missing = Object.fromEntries(refs.map((k) => [k, release.artifact.reference_rows.find((r) => r.key === k).reason]));
const syntheticHash = 'a'.repeat(64);
const usecases = ['search_retrieval', 'scientific_discovery', 'model_routing', 'llm_guardrails', 'code_linting', 'feature_extraction', 'recruiting', 'lead_generation', 'customer_support', 'insurance_claims', 'financial_crime', 'legal_compliance', 'ecommerce_marketplaces', 'moderation_trust_safety', 'advertising', 'gaming', 'risk_assessment', 'demand_forecasting', 'knowledge_graphs', 'other'];
const pins = {
  manifest_sha256: 'b1e8aa8ea2cff94cc00b56ce2d0afb1f8046b6cea5ce431467d816b9f60d600c',
  original_results_sha256: '39f12af559d052e45261f66f879fbeaf79b54bf1fa9c4142ff12703246845ba8',
  presentation_results_sha256: '1d84879104fb3dfd0ea79f8156bea54d482c0405b42d8d24043c3496864f36d5',
  taxonomy_sha256: '16a31118d96990117a73023684163b77ba7b71e93b7cd98a141f713b4b9efb38',
};
const configs = Object.fromEntries(coverage.filter((r) => native.includes(r.key)).map((r) => [r.key, r.configuration_sha256]));
const metric = 'Pooled CORE diagnostic chance-corrected competence: 100 * (mean correctness - mean per-item random-choice chance) / (1 - mean chance). Public and sealed pooled. Not the official 35/65 Capability Score, calibration or gap-penalized Intelligence; values can be negative. Compare systems within each category.';
function descriptor(key, n, publicN) {
  return { key, label: `TEST ONLY ${key}`, covers: 'Synthetic aggregate test fixture', n, public: publicN, sealed: n - publicN, drawable: n >= 15 && key !== 'other' };
}
function track(capabilities, usecaseCounts) {
  const cases = usecases.map((k) => descriptor(k, ...(usecaseCounts[k] ?? [0, 0])));
  const systems = Object.fromEntries(native.map((k) => [k, Object.fromEntries([
    ['capabilities', capabilities], ['usecases', cases],
  ].map(([dim, cats]) => [dim, Object.fromEntries(cats.filter((c) => c.n > 0).map((c) => [c.key, { n: c.n, drawable: c.drawable, competence: -20 }]))]))]));
  return { capabilities, usecases: cases, systems };
}
function fixture() {
  const caps = [['multilingual', 93, 35], ['agent_safety', 50, 18], ['photo_docs', 49, 18], ['counting', 48, 18], ['trap_charts', 49, 18], ['small_text', 47, 18], ['spatial', 33, 12], ['multi_panel', 49, 20]].map((r) => descriptor(...r));
  return {
    benchmark: 'ImageJevBench', revision: 'v0.2.0', kind: 'category-aggregates', min_n: 15, built_utc: '2026-10-02T00:00:00Z', scope: 'core',
    n_items: 573, n_core_items: 418, n_public_core: 157, n_sealed_core: 261, metric,
    labelling: 'TEST ONLY synthetic labels: no actual classification or review performed', rules: ['TEST ONLY synthetic category values'],
    ...track(caps, { search_retrieval: [300, 110], model_routing: [118, 47], scientific_discovery: [14, 5], other: [10, 4] }),
    unavailable: { ...missing }, track_diagnostics: {
      'computer-use': track([descriptor('dense_ui', 86, 19)], { search_retrieval: [86, 19] }),
      'browser-use': track([descriptor('dense_ui', 69, 15)], { search_retrieval: [69, 15] }),
    },
    provenance: { ...pins, ...Object.fromEntries(['labels_sha256', 'prompt_sha256', 'request_template_sha256', 'handcheck_receipt_sha256', 'sample_sha256', 'reproduction_math_sha256', 'runtime_receipt_sha256', 'label_run_receipt_sha256'].map((k) => [k, syntheticHash])),
      runs: Object.fromEntries(native.map((k) => [k, { prediction_sha256: syntheticHash, receipt_sha256: syntheticHash, aggregate_sha256: syntheticHash,
        configuration_sha256: configs[k], numeric_fields_reproduced: 1, max_abs_diff: 0 }])) },
    independent_final_integrity_review_required: true, source_acceptance: 'PENDING_INDEPENDENT_R2_AND_FINAL_ARTIFACT_REVIEW',
  };
}
const digest = (a) => createHash('sha256').update(JSON.stringify(a)).digest('hex');
// TEST ONLY receipt. It is not an authentic review sidecar and is never persisted.
function receipt(a) {
  return { verdict: 'PASS', artifact_sha256: digest(a), review_receipt_sha256: syntheticHash, source_receipt_sha256: syntheticHash, ...pins,
    coverage: { n_items: 573, n_native_systems: 48, n_reference_systems: 3, native_keys: [...native], unavailable: { ...missing }, configuration_sha256: { ...configs } } };
}
const cell = (a) => a.systems[native[0]].capabilities.multilingual;
const cat = (a, key) => a.usecases.find((c) => c.key === key);

test('exact frozen release test fixture validates unchanged PREPARED bytes and accepted view has full48 +3 coverage', () => {
  const a = fixture(), before = JSON.stringify(a);
  assert.equal(release.sha256, pins.presentation_results_sha256);
  assert.equal(native.length, 48); assert.equal(refs.length, 3);
  assert.equal(validate(a, release), a);
  const v = view(a, release, [...native, ...refs], receipt(a), digest(a));
  assert.equal(Object.keys(v.systems).length, 48);
  assert.deepEqual({ ...v.missing }, missing);
  assert.deepEqual(v.dims.map((d) => d.key), ['capabilities', 'usecases']);
  assert.deepEqual(v.splitNames, ['public', 'sealed']);
  assert.deepEqual(v.systems.winnow_12b_q8.capabilities.multilingual, [-20, 93]);
  assert.ok(v.systems.imajev_4b_20260926);
  assert.ok(v.systems.standard_one_8b); // its archive reference must not make it unavailable
  assert.equal(v.dims[1].cats.find((c) => c.key === 'other').plotted, false);
  assert.equal(v.dims[1].cats.find((c) => c.key === 'scientific_discovery').lowN, true);
  assert.equal(v.dims[0].cats.some((c) => c.key === 'dense_ui'), false);
  assert.equal(v.systems[native[0]]['computer-use'], undefined);
  assert.equal(v.provenance, undefined);
  assert.equal(JSON.stringify(a), before);
  v.systems[native[0]].capabilities.multilingual[0] = 99;
  assert.equal(cell(a).competence, -20);
});

const mutations = {
  'old684 pool': (a) => { a.n_items = 684; },
  'oldv015 revision': (a) => { a.revision = 'v0.1.5'; },
  'official score masquerading as diagnostic': (a) => { a.metric = 'Capability Score'; },
  '45 ranked only': (a) => { for (const r of release.artifact.measured_unrankable_rows) delete a.systems[r.key]; },
  'missing Winnow': (a) => { delete a.systems.winnow_12b_q8; },
  'missing historical Imajev': (a) => { delete a.systems.imajev_4b_20260926; },
  'extra native identity': (a) => { a.systems.extra = a.systems[native[0]]; },
  'reference cells': (a) => { a.systems[refs[0]] = a.systems[native[0]]; },
  'missing reference reason': (a) => { delete a.unavailable[refs[0]]; },
  'wrong reference reason': (a) => { a.unavailable[refs[0]] = 'old aggregate-only exemption'; },
  'Winnow exemption': (a) => { a.unavailable.winnow_12b_q8 = 'v015 missing per-item data'; },
  'missing native provenance': (a) => { delete a.provenance.runs.winnow_12b_q8; },
  'bad prediction hash': (a) => { a.provenance.runs[native[0]].prediction_sha256 = 'not-a-hash'; },
  'wrong config binding': (a) => { a.provenance.runs[native[0]].configuration_sha256 = syntheticHash; },
  'no numeric reproduction': (a) => { a.provenance.runs[native[0]].numeric_fields_reproduced = 0; },
  'nonzero reproduction difference': (a) => { a.provenance.runs[native[0]].max_abs_diff = 0.001; },
  'category split mismatch': (a) => { a.capabilities[0].public++; },
  'CORE family count mismatch': (a) => { a.capabilities[0].n++; a.capabilities[0].sealed++; },
  'negative category count': (a) => { cat(a, 'other').n = -1; },
  'duplicate family': (a) => { a.capabilities[1].key = a.capabilities[0].key; },
  'unknown usecase': (a) => { a.usecases[0].key = 'invented'; },
  'Other drawable': (a) => { cat(a, 'other').drawable = true; },
  'lowN drawable': (a) => { cat(a, 'scientific_discovery').drawable = true; },
  'zero-n cell': (a) => { a.systems[native[0]].usecases.recruiting = { n: 0, competence: 0, drawable: false }; },
  'missing positive-n cell': (a) => { delete a.systems[native[0]].usecases.other; },
  'cell n mismatch': (a) => { cell(a).n--; },
  'cell drawable mismatch': (a) => { cell(a).drawable = false; },
  'nonfinite cell': (a) => { cell(a).competence = NaN; },
  'infinite cell': (a) => { cell(a).competence = Infinity; },
  'competence over100': (a) => { cell(a).competence = 100.01; },
  'competence below-100': (a) => { cell(a).competence = -100.01; },
  'CU leaking CORE': (a) => { a.capabilities.push(descriptor('dense_ui', 86, 19)); },
  'BU leaking CORE cells': (a) => { a.systems[native[0]]['browser-use'] = {}; },
  'CU missing system': (a) => { delete a.track_diagnostics['computer-use'].systems[native[0]]; },
  'BU wrong totals': (a) => { a.track_diagnostics['browser-use'].capabilities[0].n = 86; },
  'CU bad cell': (a) => { a.track_diagnostics['computer-use'].systems[native[0]].capabilities.dense_ui.n = 573; },
  'per-item information': (a) => { a.provenance.task_tokens = ['TEST ONLY']; },
  'cell probabilities': (a) => { cell(a).probabilities = [0.5, 0.5]; },
  'mutated producer acceptance': (a) => { a.source_acceptance = 'PASS'; },
};
for (const field of Object.keys(pins)) mutations[`wrong ${field}`] = (a) => { a.provenance[field] = syntheticHash; };
for (const [name, mutate] of Object.entries(mutations)) test(`structural refusal: ${name}`, () => {
  const a = fixture(); mutate(a); assert.throws(() => validate(a, release), /ImageJevBench v0.2 categories/);
});

for (const [name, mutate] of Object.entries({
  'missing receipt': () => undefined,
  'pending verdict': (r) => { r.verdict = 'PENDING'; return r; },
  'wrong artifact hash': (r) => { r.artifact_sha256 = syntheticHash; return r; },
  'invalid review hash': (r) => { r.review_receipt_sha256 = ''; return r; },
  'missing source receipt hash': (r) => { delete r.source_receipt_sha256; return r; },
  'wrong native48 coverage': (r) => { r.coverage.native_keys.pop(); return r; },
  'duplicate coverage identity': (r) => { r.coverage.native_keys[0] = r.coverage.native_keys[1]; return r; },
  'wrong coverage config': (r) => { r.coverage.configuration_sha256[native[0]] = syntheticHash; return r; },
  'wrong unavailable coverage': (r) => { r.coverage.unavailable[refs[0]] = 'unavailable'; return r; },
  ...Object.fromEntries(Object.keys(pins).map((k) => [`wrong receipt ${k}`, (r) => { r[k] = syntheticHash; return r; }])),
})) test(`view fails closed: ${name}`, () => {
  const a = fixture(); assert.throws(() => view(a, release, native, mutate(receipt(a)), digest(a)), /ImageJevBench v0.2 categories/);
});

test('view refuses unselected/old/duplicate requested identities and missing independent byte hash', () => {
  const a = fixture();
  for (const keys of [['unknown'], ['winnow_12b_q8', 'winnow_12b_q8']]) assert.throws(() => view(a, release, keys, receipt(a), digest(a)), /requested/);
  assert.throws(() => view(a, release, native, receipt(a), undefined), /acceptance/);
});

test('expected release coverage must distinguish native-null rows from reference-only rows', () => {
  const a = fixture();
  for (const mutate of [
    (r) => { r.artifact.version = 'v0.1.5'; },
    (r) => { r.sha256 = syntheticHash; },
    (r) => { r.artifact.measured_unrankable_rows.pop(); },
    (r) => { r.artifact.ranking[1].key = r.artifact.ranking[0].key; },
    (r) => { r.artifact.release_provenance['Configuration receipts'].find((x) => x.key === 'standard_one_8b').status = 'source-unavailable'; },
  ]) {
    const r = structuredClone(release); mutate(r); assert.throws(() => validate(a, r), /ImageJevBench v0.2 categories/);
  }
});

test('available public release family split counts are binding, even when totals remain correct', () => {
  const a = fixture(), r = structuredClone(release);
  r.artifact.split.core.family_counts = Object.fromEntries(a.capabilities.map((c) => [c.key, { public: c.public, sealed: c.sealed }]));
  validate(a, r);
  const first = a.capabilities[0], second = a.capabilities[1];
  first.public++; first.sealed--; second.public--; second.sealed++;
  assert.throws(() => validate(a, r), /family split binding/);
});

test('usecase membership totals cannot omit items or exceed two memberships per item', () => {
  for (const over of [false, true]) {
    const a = fixture();
    a.usecases = usecases.map((k, i) => descriptor(k, over && i < 3 ? 418 : 0, over && i < 3 ? 157 : 0));
    assert.throws(() => validate(a, release), /usecase membership totals/);
  }
});

test('native run receipt and aggregate hashes and label provenance are mandatory hashes', () => {
  for (const field of ['receipt_sha256', 'aggregate_sha256']) {
    const a = fixture(); a.provenance.runs[native[0]][field] = null;
    assert.throws(() => validate(a, release), /native run hashes/);
  }
  for (const field of ['labels_sha256', 'handcheck_receipt_sha256', 'runtime_receipt_sha256', 'sample_sha256', 'prompt_sha256', 'request_template_sha256', 'label_run_receipt_sha256', 'reproduction_math_sha256']) {
    const a = fixture(); a.provenance[field] = 'unreviewed';
    assert.throws(() => validate(a, release), /provenance hash/);
  }
});

test('a receipt for earlier category bytes cannot accept a later structurally valid revision of those bytes', () => {
  const a = fixture(), accepted = receipt(a);
  cell(a).competence = 10;
  validate(a, release);
  assert.throws(() => view(a, release, native, accepted, digest(a)), /acceptance verdict\/hash/);
});
