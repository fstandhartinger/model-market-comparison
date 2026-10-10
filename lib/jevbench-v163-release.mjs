// JevBench v1.6.3: prospective same-draw completed-field addendum to the published v1.6.2 four-system release.
// Source-only, fail-closed loader. It never creates data, a review verdict or a manifest: without the six published
// v1.6.3 files it reports the release as unavailable. Contracts mirror ops/jevbench-v163/source (cohort.py,
// public_result_scaffold.py, public_proof.prepare_proof, category_builder.aggregate).
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import * as categoryLib from './jevbench-categories.mjs';
import { jevV15Composite } from './jevbench-v15-preview.mjs';
import { validateJevbenchV16Release, mentionsPrivateSystem, JEVBENCH_V16_EXCLUDED_KEYS } from './jevbench-v16-release.mjs';
import { V162_ROOT, V162_MANIFEST, V162_HISTORY_SHA256, V162_CARRY_SHA256, readOptionalJevbenchV162Release } from './jevbench-v162-release.mjs';
import publicSchema from '../ops/jevbench-v163/source/PUBLIC-SCHEMA-V162.json' with { type: 'json' };

export const V163_ROOT = V162_ROOT;
export const V163_MANIFEST = `${V163_ROOT}/jevbench-v1.6.3-publication.json`;
export const V163_FILE_KEYS = ['results', 'categories', 'proof', 'history', 'history-carry'];
export const V163_FILES = Object.fromEntries(V163_FILE_KEYS.map(k => [k, `${V163_ROOT}/jevbench-v1.6.3-${k}.json`]));
/** Bytes of the immutable published v1.6.2 publication manifest (predecessor). */
export const V162_PUBLICATION_SHA256 = '6d42101a4e9d96d46665690b9b8320d6fbeb4a0405fd4e90d1fa0c76533f54ff';
/** ops/jevbench-v163/source/cohort.py PREDECESSOR_COST_SHA256: published v1.6.2 proof cost basis (21 exclusions, 1,479 items). */
export const V163_PREDECESSOR_COST_SHA256 = '50d582d3976ba79d458756f931764cf6e80bc623fbbe2fa611d8744752e3fc7b';
// ops/jevbench-v163/source/cohort.py: frozen six-member roster and dispositions. Scope: original four + completed Decisor, optionally completed RYOTIDE; native median is always four.
export const V163_BASE = ['jeff_1_0_large', 'wald-4b-v2', 'metask-jev-rain-4b', 'metask_jev_rain_12b'];
export const V163_NATIVE = ['jeff_1_0_large', 'wald-4b-v2', 'metask-jev-rain-4b', 'decisor_4b'];
export const V163_WRAPPERS = ['metask_jev_rain_12b', 'ryotide_qwen9'];
export const V163_FIXED = [...V163_NATIVE, ...V163_WRAPPERS];
export const V163_CORE = [...V163_NATIVE, 'metask_jev_rain_12b'];
export const V163_COST_ITEMS = 1479;
/** Exactly the authenticated five-system Decisor addendum or all six; never RYOTIDE-only or arbitrary subsets. */
function completedKeys(systems) {
  if (!Array.isArray(systems)) fail('completed roster');
  const keys = systems.map(s => s.key);
  if (new Set(keys).size !== keys.length || !(sameSet(keys, V163_CORE) || sameSet(keys, V163_FIXED))) fail('exact five-or-six completed roster');
  return keys;
}

const DIMS = ['topics', 'usecases', 'languages', 'families', 'types'];
const BREAKDOWN_SOURCE = { families: 'family', languages: 'lang', types: 'type' };
// category_builder.aggregate: fixed artifact field set and frozen descriptive text.
const CATEGORY_KEYS = ['G_med', 'benchmark', 'draw_release', 'families', 'kind', 'labelling', 'labels_sha256', 'lane_note', 'lanes', 'languages', 'metric', 'min_n', 'provisional', 'results_sha256', 'revision', 'rules', 'source_results_sha256', 'systems', 'topics', 'types', 'usecases'];
const CATEGORY_METRIC = 'O1S chance-corrected competence: equal mean over request types present, clipped to 0–100, using the pinned official group_stats function. Recorded failures remain in the denominator. Category scores are descriptive and do not alter headline Intelligence, Calibration, composite score or G_med.';
const CATEGORY_LABELLING = 'Subject topics and TypeSafe use cases use the actual shared local reference labels, with frozen T1/T2/T3/U1/U2 authoring rules. The original probabilities and model choice remain preserved in protected custody. The genuine 75-public-item handcheck is required. Family, type and language are frozen authoring metadata; non-English machine-authored items are not native-reviewed.';
const CATEGORY_RULES = ['Every nonempty category has a measured cell; zero-count taxonomy categories have no cell.', 'Categories below 30 items are indicative only; radar display retains its 30-item minimum.', 'No historic overlays, estimated cells, outcome exclusions or private item-level data are included.'];
// public_proof.prepare_proof: exact measurement row and category reference fields, inherited proof fields and immutable provenance.
const PROOF_ROW_KEYS = ['admission', 'admission_sha256', 'code_commit', 'code_url', 'completed_at', 'disposition', 'key', 'model_commit', 'model_url', 'native_receipt_sha256', 'raw_sha256', 'rows', 'scoring_admission_sha256', 'source_pins_sha256', 'source_review_sha256'];
const PROOF_ROW_HASHES = ['admission_sha256', 'raw_sha256', 'source_review_sha256', 'native_receipt_sha256', 'scoring_admission_sha256', 'source_pins_sha256'];
const PROOF_IMMUTABLE = ['rows', 'admission', 'admission_sha256', 'raw_sha256', 'native_receipt_sha256', 'source_review_sha256', 'model_commit', 'code_commit', 'model_url', 'code_url', 'completed_at', 'disposition'];
const CATEGORY_REFERENCE_KEYS = ['evidence_sha256', 'gold_sha256', 'input_sha256', 'public_handcheck_items', 'raw_labels_sha256', 'ruled_labels_sha256', 'scope', 'validated_label_records'];
const PROOF_INHERITED = ['schema_version', 'method', 'noul_method', 'bootstrap', 'cohort_preregistration_sha256', 'completion_rule', 'cost_basis_sha256', 'draw_release', 'freeze_manifest_sha256', 'frozen_capability_envelope', 'seed_commitment_sha256', 'source_dispositions_sha256'];
const PROOF_KEYS = [...PROOF_INHERITED, 'cohort_roster', 'revision', 'source_sha256', 'completed_baseline_sha256', 'systems', 'category_reference', 'predecessor', 'field_median'];
// Fixed scientific method inherited unchanged from the published v1.6.2 results.
const RESULT_METHOD_FIELDS = ['benchmark', 'protocol', 'headline', 'types', 'tier_weights', 'sealed_share_of_intelligence', 'options', 'views', 'bootstrap', 'noul_method', 'sample'];
// Original measurements of the four v1.6.2 rows are retained; only normalized scores/ranks/G_med restate.
const RESULT_MEASUREMENT_FIELDS = ['display', 'repo', 'model_pin', 'endpoint_kind', 'support', 'status', 'speed', 'cost', 'last_measured_on', 'measured_in', 'measurement_date_status', 'validity'];
const MANIFEST_KEYS = ['files', 'historical_carry_sha256', 'historical_results_sha256', 'historical_revision', 'predecessor', 'provisional', 'review', 'revision', 'schema_version', 'status'];
// public_result_scaffold.FORBIDDEN_KEYS plus the existing v1.6.2 item-level key guard.
const FORBIDDEN_KEYS = new Set(['actual_completed_field_baseline', 'fixed_roster', 'pending_roster', 'raw_path', 'source_pins', 'task_id', 'item_id', 'opaque_id', 'opaque_ids', 'exclude_opaque_ids', 'candidate_exclude_opaque_ids', 'gold', 'gold_probs', 'gold_label', 'gold.jsonl', 'id_map', 'order_id', 'job_dir', 'path', 'receipt_path', 'input_body', 'state', 'question', 'labels']);
const ITEM_LEVEL = /^(?:item_ids?|item_text|question(?:_text)?|golds?|expected|predictions?|predicted|per_item|item_results|prompt|task_id|input_text|item_state|raw_response|raw_inputs|seed_value|secret|token|password|customer|customer_email|email|invoice)$/i;
const PRIVATE_STRINGS = ['/home/', '/custody/', '/approval/', '/output/', 'file://'];

const fail = message => { throw new Error(`JevBench v1.6.3: ${message}`); };
const hex = v => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const commit = v => typeof v === 'string' && /^[a-f0-9]{40}$/.test(v);
const finite = v => typeof v === 'number' && Number.isFinite(v);
const sorted = values => [...values].sort();
const sameSet = (a, b) => isDeepStrictEqual(sorted(a), sorted(b));
const exactKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) && sameSet(Object.keys(value), keys);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
/** Python statistics.median over finite numbers. */
function median(values) {
  const v = [...values].sort((a, b) => a - b), n = v.length;
  return n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2;
}

/** Port of public_result_scaffold.safe and the v1.6.2 private/item-level guards: explicit keys, private paths, nonfinite numbers. */
export function assertPublicOnly(value, where = 'artifact', sourceKeys = true) {
  if (Array.isArray(value)) return value.forEach(v => assertPublicOnly(v, where, sourceKeys));
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if ((sourceKeys && FORBIDDEN_KEYS.has(key)) || ITEM_LEVEL.test(key) || key.toLowerCase().includes('djev')) fail(`private/item-level field ${key} in ${where}`);
      assertPublicOnly(child, where, sourceKeys);
    }
    return;
  }
  if (typeof value === 'string') {
    if (PRIVATE_STRINGS.some(p => value.includes(p)) || value.toLowerCase().includes('djev')) fail(`private path/category string in ${where}`);
    return;
  }
  if (typeof value === 'number' && !Number.isFinite(value)) fail(`nonfinite public value in ${where}`);
  if (value !== null && !['boolean', 'number'].includes(typeof value)) fail(`unsupported public value in ${where}`);
}
function rejectPrivateText(text, where) {
  if (JEVBENCH_V16_EXCLUDED_KEYS.some(key => text.includes(JSON.stringify(key))) || mentionsPrivateSystem(text)) fail(`private-only system in ${where}`);
}
/** Port of public_result_scaffold.schema_check over the accepted v1.6.2 public schema: unknown nested fields fail closed. */
export function checkPublicSchema(value, node = publicSchema.schema) {
  if (node && typeof node === 'object' && !Array.isArray(node) && exactKeys(node, ['__union__'])) {
    for (const option of node.__union__) { try { checkPublicSchema(value, option); return; } catch { /* next option */ } }
    fail('public schema type');
  }
  if (Array.isArray(node)) {
    if (!Array.isArray(value) || value.length > 128) fail('public aggregate array cap');
    for (const v of value) checkPublicSchema(v, node[0]);
  } else if (node && typeof node === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) fail('public schema object');
    for (const k of Object.keys(value)) if (!(k in node)) fail(`unknown nested public field ${k}`);
    for (const [k, v] of Object.entries(value)) checkPublicSchema(v, node[k]);
  } else if (node === 'z') { if (value !== null) fail('public null'); }
  else if (node === 'b') { if (typeof value !== 'boolean') fail('public boolean'); }
  else if (node === 'n') { if (!finite(value)) fail('public finite numeric field'); }
  else if (node === 's') { if (typeof value !== 'string' || /opaque[-_:]|(?:djev|item)[-_:]\d{4,}/i.test(value)) fail('opaque item identifier in public text'); }
  else fail('unexpected nonempty aggregate array');
}

/** The published generic Board/category interface must support fresh v1.6.3 categories; otherwise the release cannot render fully. */
export function jevbenchV163GenericSupport() {
  const fresh = Reflect.get(categoryLib, 'isFreshJevbenchV16Revision');
  return typeof fresh === 'function' && fresh('v1.6.3') === true && categoryLib.JEVBENCH_CATEGORY_REVISIONS.includes('v1.6.3');
}

/**
 * Validates an authenticated five- or six-system v1.6.3 bundle against the immutable v1.6.2 predecessor.
 * `predecessor` = { manifest, manifestSha256, artifact (v1.6.2 results), categories, proof } read from disk.
 */
export function validateJevbenchV163Bundle({ manifest, artifact, categories, proof, historicalSha256, historicalCarrySha256, predecessor }) {
  for (const [where, value] of Object.entries({ manifest, results: artifact, categories, proof })) {
    // The manifest's own exact schema carries repository file paths; Source key rules apply to the public artifacts.
    assertPublicOnly(value, where, where !== 'manifest');
    rejectPrivateText(JSON.stringify(value), where);
  }
  const prev = predecessor ?? fail('predecessor v1.6.2 publication unavailable');
  if (prev.manifestSha256 !== V162_PUBLICATION_SHA256 || prev.manifest?.revision !== 'v1.6.2' || prev.proof?.revision !== 'v1.6.2' || prev.artifact?.revision !== 'v1.6.2') fail('immutable v1.6.2 predecessor publication');
  if (prev.proof.cost_basis_sha256 !== V163_PREDECESSOR_COST_SHA256) fail('predecessor cost basis');
  validateManifest(manifest, prev, historicalSha256, historicalCarrySha256);
  validateResults(artifact, prev.artifact);
  validateProof(proof, artifact, manifest, prev);
  validateCategories(categories, artifact, proof, manifest, prev);
  return { manifest, artifact, categories, proof };
}

function validateManifest(m, prev, historicalSha256, historicalCarrySha256) {
  if (!exactKeys(m, MANIFEST_KEYS)) fail('manifest fields');
  if (m.schema_version !== 1 || m.revision !== 'v1.6.3' || m.status !== 'published' || m.provisional !== false) fail('publication status');
  if (!exactKeys(m.review, ['engine', 'receipt_sha256', 'verdict']) || m.review.verdict !== 'PASS' || m.review.engine !== 'claude' || !hex(m.review.receipt_sha256)) fail('independent release review');
  // A predecessor review cannot be inherited by the addendum.
  if (m.review.receipt_sha256 === prev.manifest.review?.receipt_sha256) fail('independent release review reused from v1.6.2');
  if (!exactKeys(m.predecessor, ['publication_sha256', 'revision']) || m.predecessor.revision !== 'v1.6.2' || m.predecessor.publication_sha256 !== V162_PUBLICATION_SHA256 || m.predecessor.publication_sha256 !== prev.manifestSha256) fail('predecessor publication binding');
  if (m.historical_revision !== 'v1.6.1' || m.historical_results_sha256 !== V162_HISTORY_SHA256 || m.historical_carry_sha256 !== V162_CARRY_SHA256 || historicalSha256 !== V162_HISTORY_SHA256 || historicalCarrySha256 !== V162_CARRY_SHA256) fail('historical source binding');
  if (!exactKeys(m.files, V163_FILE_KEYS)) fail('file bindings');
  for (const key of V163_FILE_KEYS) if (!exactKeys(m.files[key], ['path', 'sha256']) || m.files[key].path !== V163_FILES[key] || !hex(m.files[key].sha256)) fail(`file binding ${key}`);
  if (m.files.history.sha256 !== V162_HISTORY_SHA256 || m.files['history-carry'].sha256 !== V162_CARRY_SHA256) fail('historical file binding');
  for (const key of ['results', 'categories', 'proof']) if (m.files[key].sha256 === prev.manifest.files?.[key]?.sha256) fail(`file binding ${key} reuses v1.6.2 bytes`);
}

function validateResults(a, prevArtifact) {
  checkPublicSchema(a);
  if (a?.revision !== 'v1.6.3' || a.status !== 'published' || a.provisional !== false || a.run_kind !== 'paid-fast-lane') fail('addendum identity');
  for (const field of RESULT_METHOD_FIELDS) if (!isDeepStrictEqual(a[field], prevArtifact[field])) fail(`inherited method field ${field}`);
  if (!isDeepStrictEqual(a.bootstrap, { B: 1000, bootstrap_seed: 16, g_med_fixed: true }) || a.noul_method?.applied !== 'O1S') fail('official bootstrap/O1S');
  if (!isDeepStrictEqual(a.sample, { open: 300, published_open: 300, sealed: 1200, total: 1500 })) fail('scoring denominator');
  const keys = completedKeys(a.systems);
  if (!Array.isArray(a.not_measured) || a.not_measured.length || a.roster_count !== keys.length || a.n_ranked !== 4) fail('authenticated completed systems');
  // Existing score/capability/board reproduction remains authoritative; only release identity and run kind differ.
  validateJevbenchV16Release({ ...a, revision: 'v1.6.1', run_kind: 'scheduled-refresh' }, 'v1.6.1');
  const v = a.v16;
  if (v?.counts?.S !== 1200 || v.counts.P !== 300 || v.counts.selfhosted_input !== 1500) fail('input counts');
  if (v.draw_release !== prevArtifact.v16.draw_release || v.freeze_manifest_sha256 !== prevArtifact.v16.freeze_manifest_sha256) fail('frozen draw binding');
  // The all-selfhosted scorer may record unused API reference offsets once the completed pool reaches its threshold.
  // Preserve those official finite values; no API row or API-equating application is admitted in this cohort.
  const offsets = v.equating?.offsets;
  if ((offsets !== null && (!exactKeys(offsets, ['I', 'C']) || !finite(offsets.I) || !finite(offsets.C))) || v.equating_A2 != null || !sameSet(v.ranked_selfhosted ?? [], V163_NATIVE)) fail('equating metadata or ranked cohort');
  if (!sameSet(v.equating?.pool ?? [], keys) || v.equating?.pool_n !== keys.length) fail('completed pool');
  const prevRows = new Map(prevArtifact.systems.map(s => [s.key, s]));
  for (const s of a.systems) {
    const native = V163_NATIVE.includes(s.key);
    if (s.ranked !== native || s.listing !== (native ? 'ranked' : 'wrapper')) fail(`frozen disposition ${s.key}`);
    if (!native && (s.rank != null || s.ranks != null)) fail(`wrapper rank ${s.key}`);
    if (s.v16?.lane !== 'selfhosted' || s.api_flag !== false || s.api_subset !== false || s.v16.api_subset !== false || s.v16.equated || s.v16.equating_offset != null) fail(`self-hosted lane ${s.key}`);
    if (s.status?.status !== 'complete' || s.status.rows !== 1500 || s.status.missing !== 0 || !Number.isInteger(s.status.answered_ok) || s.status.answered_ok < 0 || s.status.answered_ok > 1500) fail(`complete rows ${s.key}`);
    if (s.full_coverage !== true || s.v16.n_items !== 1500 || s.v16.complete !== true || s.v16.set !== 'S+P') fail(`full coverage ${s.key}`);
    if (s.cost?.common_basis?.n_items !== V163_COST_ITEMS || s.cost.common_basis.rule !== 'common' || !finite(s.cost.common_basis.usd_per_1000_all_items) || !finite(s.cost.usd_per_1000)) fail(`cost basis ${s.key}`);
    if (s.cost.usage_estimated_rows !== 0 || s.cost.usd_per_1000 < 0 || s.cost.common_basis.usd_per_1000_all_items < 0) fail(`measured nonnegative cost ${s.key}`);
    if (s.v16.g_med_used !== a.G_med) fail(`whole-field G_med rescoring ${s.key}`);
    if (!finite(s.intelligence?.gap)) fail(`finite gap ${s.key}`);
    for (const o of ['A', 'B', 'C']) {
      const want = jevV15Composite(s.axes, a.options[o].weights, a.options[o].intelligence_floor);
      if (!finite(s.scores?.[o]) || want == null || Math.abs(want - s.scores[o]) > 0.01) fail(`all-row composite reproduction ${s.key}.${o}`);
      const ci = s.composite_ci95?.[o];
      if (!Array.isArray(ci) || ci.length !== 2 || !ci.every(finite) || ci[0] > ci[1] || ci[0] < 0 || ci[1] > 100) fail(`confidence interval ${o} ${s.key}`);
    }
    if (!finite(s.capability) || Math.abs(s.capability - (s.axes.intelligence + s.axes.calibration) / 2) > 1e-9 || s.jevbench_score !== s.scores[a.headline]) fail(`all-row headline/capability ${s.key}`);
    for (const axis of ['intelligence', 'calibration', 'speed', 'cost']) if (!finite(s.axes?.[axis])) fail(`axis ${axis} ${s.key}`);
    if (typeof s.repo !== 'string' || !s.repo.startsWith('https://')) fail(`repository ${s.key}`);
    if (V163_BASE.includes(s.key)) {
      const old = prevRows.get(s.key) ?? fail(`missing original row ${s.key}`);
      for (const field of RESULT_MEASUREMENT_FIELDS) if (!isDeepStrictEqual(s[field], old[field])) fail(`original measurement changed ${s.key}.${field}`);
      if (!isDeepStrictEqual(s.v16.breakdowns, old.v16.breakdowns)) fail(`original measurement changed ${s.key}.breakdowns`);
    } else if (s.measured_in !== 'v1.6.3') fail(`new measurement identity ${s.key}`);
  }
  for (const o of ['A', 'B', 'C', 'capability']) {
    const order = a.board?.[o]?.order;
    if (!Array.isArray(order) || !sameSet(order, V163_NATIVE)) fail(`board membership ${o}`);
    order.forEach((key, i) => { if (a.systems.find(s => s.key === key).ranks?.[o] !== i + 1) fail(`rank ${o} ${key}`); });
  }
  for (const s of a.systems.filter(s => s.ranked)) if (s.rank !== s.ranks[a.headline]) fail(`headline rank ${s.key}`);
  const gaps = a.systems.filter(s => V163_NATIVE.includes(s.key)).map(s => s.intelligence.gap);
  if (gaps.length !== 4 || !finite(a.G_med) || a.G_med !== median(gaps)) fail('native four-member G_med');
}

function expectedRoster(previousRoster, keys) {
  return previousRoster.map(row => {
    if (!keys.includes(row.key)) return structuredClone(row);
    const next = { ...structuredClone(row), status: 'complete', rows: 1500, included_in_field_median: V163_NATIVE.includes(row.key) };
    delete next.reason;
    return next;
  });
}

function validateProof(p, a, manifest, prev) {
  const old = prev.proof;
  if (!exactKeys(p, PROOF_KEYS)) fail('proof fields');
  if (p.revision !== 'v1.6.3' || p.method !== 'jevbench::v1.6' || p.noul_method !== 'O1S' || !isDeepStrictEqual(p.bootstrap, { B: 1000, seed: 16 })) fail('method proof');
  for (const field of PROOF_INHERITED) if (!isDeepStrictEqual(p[field], old[field])) fail(`predecessor binding ${field}`);
  if (p.cost_basis_sha256 !== V163_PREDECESSOR_COST_SHA256) fail('cost basis proof');
  if (old.cohort_roster.length !== 6 || !sameSet(old.cohort_roster.map(r => r.key), V163_FIXED) || !isDeepStrictEqual(p.cohort_roster, expectedRoster(old.cohort_roster, a.systems.map(s => s.key)))) fail('frozen six roster');
  if (!hex(p.source_sha256) || p.source_sha256 !== a.source_sha256 || p.source_sha256 === old.source_sha256) fail('new official source binding');
  if (!hex(p.completed_baseline_sha256) || p.completed_baseline_sha256 === old.completed_baseline_sha256) fail('new completed baseline');
  if (!exactKeys(p.predecessor, ['publication_sha256', 'revision']) || p.predecessor.revision !== 'v1.6.2' || p.predecessor.publication_sha256 !== manifest.predecessor.publication_sha256) fail('proof predecessor binding');
  if (a.v16.draw_release !== p.draw_release || a.v16.freeze_manifest_sha256 !== p.freeze_manifest_sha256) fail('cohort draw binding');
  const ref = p.category_reference, oldRef = old.category_reference;
  if (!exactKeys(ref, CATEGORY_REFERENCE_KEYS) || ref.validated_label_records !== 3000 || ref.public_handcheck_items !== 75 || typeof ref.scope !== 'string') fail('category reference');
  for (const field of ['raw_labels_sha256', 'ruled_labels_sha256', 'input_sha256', 'gold_sha256']) if (!hex(ref[field]) || ref[field] !== oldRef[field]) fail(`unchanged label/draw provenance ${field}`);
  const evidence = ref.evidence_sha256;
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence) || !Object.keys(evidence).length || !Object.values(evidence).every(hex)) fail('category evidence hashes');
  if (evidence.categories !== manifest.files.categories.sha256 || isDeepStrictEqual(evidence, oldRef.evidence_sha256)) fail('new category evidence binding');
  const rows = p.systems;
  if (!Array.isArray(rows) || rows.length !== a.systems.length || !sameSet(rows.map(r => r.key), a.systems.map(s => s.key))) fail('system proof coverage');
  const oldRows = new Map(old.systems.map(r => [r.key, r]));
  const bySystem = new Map(a.systems.map(s => [s.key, s]));
  for (const r of rows) {
    if (!exactKeys(r, PROOF_ROW_KEYS)) fail(`exact measurement proof fields ${r.key}`);
    if (r.rows !== 1500 || r.admission !== 'ACCEPTED' || r.disposition !== (V163_NATIVE.includes(r.key) ? 'native_ranked' : 'wrapper_unranked')) fail(`system proof ${r.key}`);
    if (!PROOF_ROW_HASHES.every(f => hex(r[f])) || !commit(r.model_commit) || !commit(r.code_commit)) fail(`system proof hashes ${r.key}`);
    if (!['model_url', 'code_url'].every(f => typeof r[f] === 'string' && r[f].startsWith('https://'))) fail(`system proof repository ${r.key}`);
    if (typeof r.completed_at !== 'string' || !/(?:Z|[+-]\d{2}:\d{2})$/.test(r.completed_at) || !Number.isFinite(Date.parse(r.completed_at))) fail(`system proof completion ${r.key}`);
    const s = bySystem.get(r.key);
    if (s.model_pin !== r.model_commit || s.repo !== r.model_url || s.last_measured_on !== new Date(r.completed_at).toISOString().slice(0, 10)) fail(`result/proof provenance join ${r.key}`);
    const was = oldRows.get(r.key);
    if (V163_BASE.includes(r.key)) {
      if (!was || PROOF_IMMUTABLE.some(f => !isDeepStrictEqual(r[f], was[f]))) fail(`original measured provenance changed ${r.key}`);
    } else {
      const reused = new Set(old.systems.flatMap(o => PROOF_ROW_HASHES.map(f => o[f])));
      if (PROOF_ROW_HASHES.some(f => reused.has(r[f]))) fail(`new measurement reuses v1.6.2 receipt ${r.key}`);
    }
  }
  const fm = p.field_median;
  if (!exactKeys(fm, ['G_med', 'historical_rows_included', 'members', 'minimum_complete', 'wrappers_included']) || fm.minimum_complete !== 3 || fm.historical_rows_included !== false || fm.wrappers_included !== false) fail('field median rule');
  const members = a.systems.filter(s => V163_NATIVE.includes(s.key)).map(s => ({ key: s.key, gap: s.intelligence.gap }));
  if (!isDeepStrictEqual(fm.members, members) || fm.G_med !== a.G_med || fm.G_med !== median(members.map(m => m.gap))) fail('field median cohort');
}

function validateCategories(c, a, p, manifest, prev) {
  const old = prev.categories;
  if (!exactKeys(c, CATEGORY_KEYS)) fail('category fields');
  if (c.benchmark !== 'JevBench' || c.kind !== 'category-aggregates' || c.revision !== 'v1.6.3' || c.provisional !== false || c.min_n !== 1) fail('category identity');
  if (c.results_sha256 !== manifest.files.results.sha256 || c.source_results_sha256 !== a.source_sha256 || c.source_results_sha256 !== p.source_sha256 || c.draw_release !== p.draw_release || c.G_med !== a.G_med || c.labels_sha256 !== p.category_reference.ruled_labels_sha256) fail('category source binding');
  if (c.metric !== CATEGORY_METRIC || c.labelling !== CATEGORY_LABELLING || !isDeepStrictEqual(c.rules, CATEGORY_RULES) || typeof c.lane_note !== 'string' || !c.lane_note.trim()) fail('category method text');
  if (!exactKeys(c.lanes, a.systems.map(s => s.key)) || !Object.values(c.lanes).every(l => l === 'selfhosted')) fail('category lanes');
  if (!exactKeys(c.systems, a.systems.map(s => s.key))) fail('category cohort');
  for (const dim of DIMS) {
    const descriptors = c[dim];
    if (!Array.isArray(descriptors) || new Set(descriptors.map(d => d.key)).size !== descriptors.length) fail(`category descriptors ${dim}`);
    for (const d of descriptors) {
      if (!exactKeys(d, ['covers', 'key', 'label', 'low_n', 'n', 'open', 'sealed']) || typeof d.key !== 'string' || !d.key || typeof d.label !== 'string' || typeof d.covers !== 'string'
        || !Number.isInteger(d.n) || !Number.isInteger(d.open) || !Number.isInteger(d.sealed) || d.open < 0 || d.sealed < 0 || d.n !== d.open + d.sealed || d.low_n !== (d.n < 30)) fail(`category descriptor ${dim}.${d.key}`);
    }
    if (descriptors.reduce((n, d) => n + d.n, 0) !== 1500 || descriptors.reduce((n, d) => n + d.open, 0) !== 300 || descriptors.reduce((n, d) => n + d.sealed, 0) !== 1200) fail(`category denominator ${dim}`);
    // Same frozen draw and labels: the taxonomy descriptors cannot change.
    if (!isDeepStrictEqual(descriptors, old[dim])) fail(`category descriptors changed ${dim}`);
  }
  for (const s of a.systems) {
    const row = c.systems[s.key];
    if (!exactKeys(row, DIMS)) fail(`category dimensions ${s.key}`);
    for (const dim of DIMS) {
      const known = new Map(c[dim].map(d => [d.key, d.n]));
      for (const [key, n] of known) if (n > 0 && !row[dim][key]) fail(`missing category ${s.key}.${dim}.${key}`);
      for (const [key, cell] of Object.entries(row[dim])) {
        const n = known.get(key);
        if (!n) fail(`fabricated category cell ${s.key}.${dim}.${key}`);
        if (!exactKeys(cell, ['competence', 'coverage_n', 'n']) || cell.n !== n || !Number.isInteger(cell.coverage_n) || cell.coverage_n < 0 || cell.coverage_n > cell.n
          || !finite(cell.competence) || cell.competence < 0 || cell.competence > 100) fail(`category cell ${s.key}.${dim}.${key}`);
        const source = BREAKDOWN_SOURCE[dim];
        if (source) {
          const stored = s.v16.breakdowns?.[source]?.[key];
          if (!stored || stored.n !== cell.n || Math.abs(stored.score - cell.competence) > 0.005 + 1e-9) fail(`stored breakdown reproduction ${s.key}.${dim}.${key}`);
        }
      }
    }
    // Original measurements' category cells stay fixed.
    if (V163_BASE.includes(s.key) && !isDeepStrictEqual(row, old.systems[s.key])) fail(`original category cells changed ${s.key}`);
  }
  categoryLib.validateCategoryArtifact(c, ['topics', 'usecases', 'languages']);
}

async function load(path, root) {
  const bytes = await readFile(`${root}/${path}`);
  const text = bytes.toString('utf8');
  rejectPrivateText(text, path.split('/').pop());
  return { value: JSON.parse(text), bytes, sha256: digest(bytes) };
}

/**
 * Missing publication manifest means v1.6.3 is unavailable (null). Any present but invalid publication fails closed.
 * Never falls back to v1.6.2 values; v1.6.2 files are read only as the immutable predecessor.
 */
export async function readOptionalJevbenchV163Release(root = process.cwd(), { genericSupport = jevbenchV163GenericSupport } = {}) {
  let publication;
  try { publication = await load(V163_MANIFEST, root); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  if (!genericSupport()) fail('published generic fresh Board/category interface does not support v1.6.3');
  const previous = await readOptionalJevbenchV162Release(root);
  if (!previous) fail('predecessor v1.6.2 publication unavailable');
  const [results, categories, proof, history, carry, previousManifest] = await Promise.all([
    load(V163_FILES.results, root), load(V163_FILES.categories, root), load(V163_FILES.proof, root),
    load(V163_FILES.history, root), load(V163_FILES['history-carry'], root), load(V162_MANIFEST, root),
  ]);
  for (const [key, value] of Object.entries({ results, categories, proof, history, 'history-carry': carry })) if (publication.value.files?.[key]?.sha256 !== value.sha256) fail(`bytes hash ${key}`);
  // History and carry are the immutable v1.6.2 historical bundle, byte for byte.
  if (history.sha256 !== V162_HISTORY_SHA256 || carry.sha256 !== V162_CARRY_SHA256 || previous.historical.sha256 !== history.sha256 || previous.historical.carrySha256 !== carry.sha256) fail('immutable historical source hash');
  validateJevbenchV163Bundle({
    manifest: publication.value, artifact: results.value, categories: categories.value, proof: proof.value,
    historicalSha256: history.sha256, historicalCarrySha256: carry.sha256,
    predecessor: { manifest: previousManifest.value, manifestSha256: previousManifest.sha256, artifact: previous.artifact, categories: previous.categories, proof: previous.proof },
  });
  return {
    artifact: results.value, bytes: results.bytes, sha256: results.sha256,
    categories: categories.value, categoriesSha256: categories.sha256, proof: proof.value, proofSha256: proof.sha256,
    manifest: publication.value, manifestSha256: publication.sha256, predecessorSha256: previousManifest.sha256,
    historical: previous.historical,
  };
}

/** Board input for the existing generic page. Re-checks generic v1.6.3 support; never relabels the release as v1.6.2. */
export function v163BoardInput(release, genericSupport = jevbenchV163GenericSupport) {
  if (!genericSupport()) fail('published generic fresh Board/category interface does not support v1.6.3');
  if (release?.artifact?.revision !== 'v1.6.3' || release.categories?.revision !== 'v1.6.3') fail('board input revision');
  return { artifact: release.artifact, categories: release.categories };
}

/** Optional navigation: a failed v1.6.3 validation omits the tab and never breaks older boards. */
export async function hasPublishedJevbenchV163Release(root = process.cwd(), log = console.error) {
  try { return Boolean(await readOptionalJevbenchV163Release(root)); }
  catch { log('JevBench v1.6.3 navigation omitted: publication validation failed'); return false; }
}
