/** Pure aggregate-only contract. Structural validity is not independent review acceptance.
 * Callers must hash the exact producer bytes before parsing and authenticate the review
 * sidecar independently. No schema can prove labels, correctness, or reviewer identity.
 */
const PINS = Object.freeze({
  manifest_sha256: 'b1e8aa8ea2cff94cc00b56ce2d0afb1f8046b6cea5ce431467d816b9f60d600c',
  original_results_sha256: '39f12af559d052e45261f66f879fbeaf79b54bf1fa9c4142ff12703246845ba8',
  presentation_results_sha256: '1d84879104fb3dfd0ea79f8156bea54d482c0405b42d8d24043c3496864f36d5',
  taxonomy_sha256: '16a31118d96990117a73023684163b77ba7b71e93b7cd98a141f713b4b9efb38',
});
const CORE = { multilingual: 93, agent_safety: 50, photo_docs: 49, counting: 48, trap_charts: 49, small_text: 47, spatial: 33, multi_panel: 49 };
// Frozen v0.2 metadata: these diagnostic pools have distinct family memberships.
const DIAGNOSTIC_FAMILIES = { 'computer-use': { dense_ui: 24, multilingual: 62 }, 'browser-use': { dense_ui: 24, multilingual: 45 } };
// Public taxonomy.py USE_CASES, with category_math.py's two export renames.
const USECASES = ['search_retrieval', 'scientific_discovery', 'model_routing', 'llm_guardrails', 'code_linting', 'feature_extraction', 'recruiting', 'lead_generation', 'customer_support', 'insurance_claims', 'financial_crime', 'legal_compliance', 'ecommerce_marketplaces', 'moderation_trust_safety', 'advertising', 'gaming', 'risk_assessment', 'demand_forecasting', 'knowledge_graphs', 'other'];
const HASHES = [...Object.keys(PINS), 'labels_sha256', 'prompt_sha256', 'request_template_sha256', 'handcheck_receipt_sha256', 'sample_sha256', 'reproduction_math_sha256', 'runtime_receipt_sha256', 'label_run_receipt_sha256'];
const RUN_HASHES = ['prediction_sha256', 'receipt_sha256', 'aggregate_sha256', 'configuration_sha256'];
const METRIC = 'Pooled CORE diagnostic chance-corrected competence: 100 * (mean correctness - mean per-item random-choice chance) / (1 - mean chance). Public and sealed pooled. Not the official 35/65 Capability Score, calibration or gap-penalized Intelligence; values can be negative. Compare systems within each category.';
const fail = (why) => { throw new Error(`ImageJevBench v0.2 categories: ${why}`); };
const require = (ok, why) => { if (!ok) fail(why); };
const object = (x) => x !== null && typeof x === 'object' && !Array.isArray(x) && [Object.prototype, null].includes(Object.getPrototypeOf(x));
const hash = (x) => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x);
const text = (x) => typeof x === 'string' && x.trim().length > 0;
const count = (x) => Number.isSafeInteger(x) && x >= 0;
const sameKeys = (a, b) => a.length === b.length && new Set(a).size === a.length && [...a].sort().every((k, i) => k === [...b].sort()[i]);
function fields(x, keys, where) { require(object(x) && sameKeys(Object.keys(x), keys), `${where} fields`); }
function rows(x, where) {
  require(Array.isArray(x) && x.every((r) => object(r) && text(r.key)), `${where} identities`);
  require(new Set(x.map((r) => r.key)).size === x.length, `${where} duplicate identities`);
  return x;
}
function releaseContext(expectedRelease) {
  const a = expectedRelease?.artifact;
  require(a?.version === 'v0.2.0' && a.headline_track === 'core' && a.split?.items_total === 573
    && expectedRelease.sha256 === PINS.presentation_results_sha256
    && a.derived_from?.sha256 === PINS.original_results_sha256, 'selected release pins/version');
  const ranked = rows(a.ranking, 'release ranking');
  const unrankable = rows(a.measured_unrankable_rows, 'release measured-unrankable');
  const refs = rows(a.reference_rows, 'release references');
  const receipts = rows(a.release_provenance?.['Configuration receipts'], 'release coverage');
  const native = [...ranked, ...unrankable].map((r) => r.key);
  require(ranked.length === 45 && unrankable.length === 3 && new Set(native).size === 48
    && native.includes('winnow_12b_q8') && native.includes('imajev_4b_20260926'), 'release native48 coverage');
  const unavailable = receipts.filter((r) => r.status === 'source-unavailable').map((r) => r.key);
  require(unavailable.length === 3 && receipts.length === 51 && sameKeys(receipts.map((r) => r.key), [...native, ...unavailable]), 'release selected51 coverage');
  const configs = Object.create(null), missing = Object.create(null);
  for (const row of receipts) {
    const expectedStatus = ranked.some((r) => r.key === row.key) ? 'measured'
      : unrankable.some((r) => r.key === row.key) ? 'measured-unrankable' : 'source-unavailable';
    require(row.status === expectedStatus && hash(row.configuration_sha256) && hash(row.evidence_sha256), 'release coverage status/hash');
    if (native.includes(row.key)) configs[row.key] = row.configuration_sha256;
    else {
      const ref = refs.find((r) => r.key === row.key);
      require(ref && text(ref.reason), 'release unavailable reason');
      missing[row.key] = ref.reason;
    }
  }
  require(refs.every((r) => unavailable.includes(r.key) || unrankable.some((u) => u.key === r.key)), 'release unexpected reference');
  for (const [track, totals] of Object.entries({ core: [418, 157, 261], 'computer-use': [86, 19, 67], 'browser-use': [69, 15, 54] })) {
    const s = a.split[track];
    require(s?.items_total === totals[0] && s.items_public === totals[1] && s.items_sealed === totals[2], 'release track counts');
  }
  return { a, native, unavailable, configs, missing };
}
function validateTrack(track, trackName, context) {
  fields(track, ['systems', 'capabilities', 'usecases'], `${trackName} aggregate`);
  const split = context.a.split[trackName];
  const descriptors = {};
  for (const dim of ['capabilities', 'usecases']) {
    const cats = rows(track[dim], `${trackName}.${dim}`);
    const keys = cats.map((c) => c.key);
    if (dim === 'usecases') require(sameKeys(keys, USECASES), 'usecase taxonomy keys');
    else if (trackName === 'core') require(sameKeys(keys, Object.keys(CORE)), 'CORE family keys');
    else require(sameKeys(keys, Object.keys(DIAGNOSTIC_FAMILIES[trackName])), 'diagnostic family keys');
    let n = 0, pub = 0, sealed = 0;
    for (const c of cats) {
      fields(c, ['key', 'label', 'covers', 'n', 'public', 'sealed', 'drawable'], 'category descriptor');
      require(text(c.label) && text(c.covers) && count(c.n) && count(c.public) && count(c.sealed)
        && c.public + c.sealed === c.n && c.n <= split.items_total
        && c.public <= split.items_public && c.sealed <= split.items_sealed, 'category counts/split');
      require(c.drawable === (c.n >= 15 && c.key !== 'other'), 'category drawable');
      if (dim === 'capabilities' && trackName === 'core') require(c.n === CORE[c.key], 'CORE family count');
      if (dim === 'capabilities' && trackName !== 'core') require(c.n === DIAGNOSTIC_FAMILIES[trackName][c.key], 'diagnostic family count');
      const family = split.family_counts?.[c.key];
      if (dim === 'capabilities' && split.family_counts) {
        require(family && family.public === c.public && family.sealed === c.sealed, 'release family split binding');
      }
      n += c.n; pub += c.public; sealed += c.sealed;
    }
    if (dim === 'capabilities') require(n === split.items_total && pub === split.items_public && sealed === split.items_sealed, 'family totals');
    else require(n >= split.items_total && n <= 2 * split.items_total && pub >= split.items_public && pub <= 2 * split.items_public
      && sealed >= split.items_sealed && sealed <= 2 * split.items_sealed, 'usecase membership totals');
    descriptors[dim] = cats;
  }
  fields(track.systems, context.native, `${trackName} native systems`);
  for (const key of context.native) {
    fields(track.systems[key], ['capabilities', 'usecases'], 'system dimensions');
    for (const dim of ['capabilities', 'usecases']) {
      const cats = descriptors[dim].filter((c) => c.n > 0);
      fields(track.systems[key][dim], cats.map((c) => c.key), 'positive category cells');
      for (const c of cats) {
        const cell = track.systems[key][dim][c.key];
        fields(cell, ['n', 'drawable', 'competence'], 'category cell');
        // Binary choices give the conservative -100 floor. A reviewed aggregate
        // with tighter category chance metadata may narrow it, never extend it.
        require(cell.n === c.n && cell.drawable === c.drawable && Number.isFinite(cell.competence)
          && cell.competence >= -100 && cell.competence <= 100, 'category cell n/drawable/competence');
      }
    }
  }
}
/** Returns the unchanged PREPARED artifact after structural validation; never accepts it. */
export function validateImageJevV02CategoryArtifact(artifact, expectedRelease) {
  const context = releaseContext(expectedRelease);
  fields(artifact, ['benchmark', 'revision', 'kind', 'min_n', 'built_utc', 'scope', 'n_items', 'n_core_items', 'n_public_core', 'n_sealed_core', 'metric', 'labelling', 'rules', 'capabilities', 'usecases', 'systems', 'unavailable', 'track_diagnostics', 'provenance', 'independent_final_integrity_review_required', 'source_acceptance'], 'artifact');
  require(artifact.benchmark === 'ImageJevBench' && artifact.revision === 'v0.2.0' && artifact.kind === 'category-aggregates'
    && artifact.min_n === 15 && artifact.scope === 'core' && artifact.n_items === 573 && artifact.n_core_items === 418
    && artifact.n_public_core === 157 && artifact.n_sealed_core === 261, 'artifact revision/scope/counts');
  require(text(artifact.built_utc) && Number.isFinite(Date.parse(artifact.built_utc)) && artifact.metric === METRIC
    && text(artifact.labelling) && Array.isArray(artifact.rules) && artifact.rules.length > 0 && artifact.rules.every(text), 'aggregate metadata/metric');
  require(artifact.independent_final_integrity_review_required === true
    && artifact.source_acceptance === 'PENDING_INDEPENDENT_R2_AND_FINAL_ARTIFACT_REVIEW', 'producer PREPARED state');
  fields(artifact.unavailable, context.unavailable, 'unavailable systems');
  for (const key of context.unavailable) require(artifact.unavailable[key] === context.missing[key], 'exact unavailable reason');
  fields(artifact.provenance, [...HASHES, 'runs'], 'provenance');
  for (const field of HASHES) require(hash(artifact.provenance[field]), `provenance hash ${field}`);
  for (const [field, value] of Object.entries(PINS)) require(artifact.provenance[field] === value, `provenance pin ${field}`);
  fields(artifact.provenance.runs, context.native, 'native provenance');
  for (const key of context.native) {
    const run = artifact.provenance.runs[key];
    fields(run, [...RUN_HASHES, 'numeric_fields_reproduced', 'max_abs_diff'], 'native run proof');
    require(RUN_HASHES.every((f) => hash(run[f])) && run.configuration_sha256 === context.configs[key]
      && Number.isSafeInteger(run.numeric_fields_reproduced) && run.numeric_fields_reproduced > 0 && run.max_abs_diff === 0, 'native run hashes/reproduction');
  }
  validateTrack({ systems: artifact.systems, capabilities: artifact.capabilities, usecases: artifact.usecases }, 'core', context);
  fields(artifact.track_diagnostics, ['computer-use', 'browser-use'], 'separate track diagnostics');
  for (const name of ['computer-use', 'browser-use']) validateTrack(artifact.track_diagnostics[name], name, context);
  return artifact;
}
/** Throws on any missing or mismatched receipt. Receipt authenticity remains an external gate.
 * artifactSha256 MUST be the independently calculated digest of the exact parsed bytes.
 */
export function imageJevV02CategoryView(artifact, expectedRelease, keys, acceptanceReceipt, artifactSha256) {
  validateImageJevV02CategoryArtifact(artifact, expectedRelease);
  const context = releaseContext(expectedRelease);
  const r = acceptanceReceipt;
  fields(r, ['verdict', 'artifact_sha256', 'review_receipt_sha256', 'source_receipt_sha256', ...Object.keys(PINS), 'coverage'], 'acceptance receipt');
  require(r.verdict === 'PASS' && hash(artifactSha256) && r.artifact_sha256 === artifactSha256
    && hash(r.review_receipt_sha256) && hash(r.source_receipt_sha256), 'acceptance verdict/hash');
  for (const [field, value] of Object.entries(PINS)) require(r[field] === value && r[field] === artifact.provenance[field], `acceptance pin ${field}`);
  fields(r.coverage, ['n_items', 'n_native_systems', 'n_reference_systems', 'native_keys', 'unavailable', 'configuration_sha256'], 'acceptance coverage');
  require(r.coverage.n_items === 573 && r.coverage.n_native_systems === 48 && r.coverage.n_reference_systems === 3
    && Array.isArray(r.coverage.native_keys) && sameKeys(r.coverage.native_keys, context.native), 'acceptance native48 coverage');
  fields(r.coverage.unavailable, context.unavailable, 'acceptance unavailable');
  fields(r.coverage.configuration_sha256, context.native, 'acceptance configurations');
  for (const key of context.native) require(r.coverage.configuration_sha256[key] === context.configs[key], 'acceptance configuration binding');
  for (const key of context.unavailable) require(r.coverage.unavailable[key] === context.missing[key], 'acceptance unavailable reason');
  require(Array.isArray(keys) && new Set(keys).size === keys.length && keys.every((k) => typeof k === 'string' && [...context.native, ...context.unavailable].includes(k)), 'requested selected-release identities');
  const dims = ['capabilities', 'usecases'].map((dim) => ({ key: dim, title: dim === 'capabilities' ? 'CORE image capabilities' : 'TypeSafe use cases',
    note: 'Pooled CORE diagnostic; public and sealed items combined.', cats: artifact[dim].map((c) => ({ key: c.key, label: c.label, short: c.label,
      covers: c.covers, n: c.n, split: { a: c.public, b: c.sealed }, lowN: c.n < 15, plotted: c.drawable })) }));
  const systems = Object.create(null), missing = Object.create(null);
  for (const key of keys) {
    if (context.unavailable.includes(key)) { missing[key] = context.missing[key]; continue; }
    systems[key] = Object.fromEntries(['capabilities', 'usecases'].map((dim) => [dim,
      Object.fromEntries(Object.entries(artifact.systems[key][dim]).map(([cat, cell]) => [cat, [cell.competence, cell.n]]))]));
  }
  return { revision: artifact.revision, minN: 15, metric: artifact.metric, labelling: artifact.labelling,
    rules: [...artifact.rules], splitNames: ['public', 'sealed'], dims, systems, missing };
}
