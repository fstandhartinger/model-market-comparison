import { createHash } from 'node:crypto';
import { readMultimodalPreviewV02 } from '../../lib/jevbench-multimodal-preview.mjs';

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
      'computer-use': track([descriptor('dense_ui', 24, 5), descriptor('multilingual', 62, 14)], { search_retrieval: [86, 19] }),
      'browser-use': track([descriptor('dense_ui', 24, 5), descriptor('multilingual', 45, 10)], { search_retrieval: [69, 15] }),
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

export { release, native, refs, missing, pins, fixture, receipt, digest, descriptor, usecases, syntheticHash };
