// v1.6.20: same-draw SubQ Snap repricing; no new model measurements.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { validateJevbenchV16Release, mentionsPrivateSystem, JEVBENCH_V16_EXCLUDED_KEYS } from './jevbench-v16-release.mjs';
import { validateCategoryArtifact } from './jevbench-categories.mjs';
import { V1618_ROOT, V1618_CARRIED_KEYS, V1618_CORE_NEW_KEYS, V1618_OPTIONAL_KEYS,
         V1618_UNRANKED_CARRIED_KEYS, V1618_CARRIED_PRELIMINARY_KEYS, V1618_ABOVE_COST_CAP_KEYS,
         readOptionalJevbenchV1618Release } from './jevbench-v1618-release.mjs';

export const V1620_ROOT = V1618_ROOT;
export const V1620_MANIFEST = `${V1620_ROOT}/jevbench-v1.6.20-publication.json`;
export const V1620_FILE_KEYS = ['results', 'categories', 'proof', 'history', 'history-carry'];
const files = Object.fromEntries(V1620_FILE_KEYS.map(k => [k, `${V1620_ROOT}/jevbench-v1.6.20-${k}.json`]));
export const V1620_REPRICED_KEYS = ['subq-snap-preview'];
export const V1620_CARRIED_KEYS = [...V1618_CARRIED_KEYS, ...V1618_CORE_NEW_KEYS, ...V1618_OPTIONAL_KEYS];
export const V1620_CARRIED_PRELIMINARY_KEYS = [...V1618_CARRIED_PRELIMINARY_KEYS];
export const V1620_UNRANKED_CARRIED_KEYS = V1618_UNRANKED_CARRIED_KEYS.filter(k => !V1620_REPRICED_KEYS.includes(k));
export const V1620_ABOVE_COST_CAP_KEYS = [...V1618_ABOVE_COST_CAP_KEYS, 'subq-snap-preview'];
export const V1620_FIXED_G_MED = 9.839526770355711;
export const V1620_COST_CAP = 0.06459465517241379;
export const V1620_DRAW_RELEASE = 'v1.6-regular-20261012';
const fail = message => { throw new Error(`JevBench v1.6.20: ${message}`); };
const hex = x => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x);
const same = (a, b, message) => { if (!isDeepStrictEqual(a, b)) fail(message); };
const sameSet = (a, b) => a.length === b.length && JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const itemField = /^(?:item_ids?|item_text|question(?:_text)?|golds?|expected|predictions?|predicted|per_item|item_results|prompt|task_id|input_text|item_state|raw_response|raw_inputs|seed_value|secret|token|password)$/i;
function subqFrozenMeasurement(row) {
  const copy = structuredClone(row);
  for (const key of ['cost', 'scores', 'composite_ci95', 'jevbench_score', 'listing', 'rank', 'ranked', 'ranks',
    'views', 'repriced_in', 'not_ranked_because', 'ranked_false_reason']) delete copy[key];
  if (copy.axes) delete copy.axes.cost;
  if (copy.v16?.ci95) delete copy.v16.ci95.composite;
  return copy;
}
function publicOnly(value) {
  if (Array.isArray(value)) return value.forEach(publicOnly);
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (itemField.test(key)) fail(`private/item-level field ${key}`);
    publicOnly(child);
  }
}
function excluded(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  if (JEVBENCH_V16_EXCLUDED_KEYS.some(key => text.includes(JSON.stringify(key))) || mentionsPrivateSystem(text)) fail('private-only system');
}

/** Validate a same-draw repricing: all old point estimates stay fixed except SubQ cost-dependent values. */
export function validateJevbenchV1620Bundle({ manifest, artifact, categories, proof, previous, previousManifestSha256, resultsSha256 }) {
  for (const value of [manifest, artifact, categories, proof]) { publicOnly(value); excluded(value); }
  if (manifest?.schema_version !== 1 || manifest.revision !== 'v1.6.20' || manifest.status !== 'published' || manifest.provisional !== false) fail('publication identity');
  if (manifest.review?.verdict !== 'PASS' || !hex(manifest.review.receipt_sha256) || !manifest.review.engine) fail('independent release review');
  if (!previous || previous.manifest?.revision !== 'v1.6.18' || previous.proof?.revision !== 'v1.6.18') fail('validated v1.6.18 predecessor required');
  same(manifest.predecessor, { revision: 'v1.6.18', publication_sha256: previousManifestSha256 }, 'predecessor binding');
  for (const k of ['historical_revision', 'historical_results_sha256', 'historical_carry_sha256']) same(manifest[k], previous.manifest[k], `historical binding ${k}`);
  for (const [key, path] of Object.entries(files)) if (manifest.files?.[key]?.path !== path || !hex(manifest.files[key].sha256)) fail(`file binding ${key}`);

  if (artifact?.revision !== 'v1.6.20' || artifact.run_kind !== 'regular-queue-price-addendum' || artifact.status !== 'published'
      || artifact.provisional !== false || artifact.noul_method?.applied !== 'O1S') fail('artifact identity');
  if (artifact.bootstrap?.B !== 1000 || artifact.bootstrap.bootstrap_seed !== 16 || artifact.bootstrap.g_med_fixed !== true) fail('bootstrap identity');
  if (artifact.G_med !== V1620_FIXED_G_MED || proof.G_med !== V1620_FIXED_G_MED || proof.draw_release !== V1620_DRAW_RELEASE) fail('same frozen draw');
  same(proof.raw_sha256, previous.proof.raw_sha256, 'frozen raw hash map');
  same(proof.a2_supplement, previous.proof.a2_supplement, 'A2 supplement proof carried unchanged');
  validateJevbenchV16Release({ ...artifact, revision: 'v1.6.1', run_kind: 'scheduled-refresh' }, 'v1.6.1');
  const allKeys = artifact.systems.map(s => s.key);
  const expected = [...V1620_CARRIED_KEYS, ...V1620_CARRIED_PRELIMINARY_KEYS];
  if (!sameSet(allKeys, expected) || artifact.roster_count !== artifact.systems.length) fail('exact carried roster');
  if (artifact.n_ranked !== artifact.systems.filter(s => s.ranked).length || artifact.n_ranked !== previous.artifact.n_ranked + 1) fail('ranked count');
  const by = new Map(artifact.systems.map(s => [s.key, s]));
  const prior = new Map(previous.artifact.systems.map(s => [s.key, s]));
  for (const key of V1620_CARRIED_KEYS) {
    const a = prior.get(key), b = by.get(key);
    if (!a || !b) fail(`missing carried row ${key}`);
    if (key === 'subq-snap-preview') continue;
    const expectedRow = structuredClone(a);
    if (a.ranked) { expectedRow.rank = b.rank; expectedRow.ranks = b.ranks; }
    same(b, expectedRow, `carried row changed outside placement ${key}`);
  }
  for (const key of V1620_CARRIED_PRELIMINARY_KEYS) {
    const a = prior.get(key), b = by.get(key);
    if (!a || !b) fail(`missing carried preliminary row ${key}`);
    same(b, a, `carried preliminary row changed ${key}`);
  }
  const subq = by.get('subq-snap-preview'), oldSubq = prior.get('subq-snap-preview');
  if (!subq || !oldSubq || subq.ranked !== true || subq.cost?.kind !== 'estimate') fail('SubQ ranked with estimate');
  if (subq.measured_in !== oldSubq.measured_in || subq.last_measured_on !== oldSubq.last_measured_on
      || subq.measurement_date_status !== oldSubq.measurement_date_status || subq.repriced_in !== 'v1.6.20') fail('SubQ measurement date / reprice marker');
  if (subq.cost.usd_per_1000 !== 0.06479016666666666 || subq.cost.usd_per_1000 <= V1620_COST_CAP) fail('SubQ cost');
  if (!subq.cost.basis.toLowerCase().includes('public preview') || !subq.cost.basis.toLowerCase().includes('waitlist')
      || !subq.cost.basis.includes('OVER THE OFFICIAL COST CAP')) fail('SubQ public basis / over-cap disclosure');
  if (subq.not_ranked_because || subq.ranked_false_reason) fail('ranked SubQ retains an unranked explanation');
  same(subqFrozenMeasurement(subq), subqFrozenMeasurement(oldSubq), 'SubQ frozen measurements or metadata changed');
  for (const field of ['endpoint_condition', 'repo', 'licence', 'model_pin']) {
    if (typeof subq[field] !== 'string' || !subq[field]) fail(`SubQ public metadata ${field}`);
  }

  const repriced = proof.repriced_rows?.['subq-snap-preview'];
  if (!repriced?.no_new_measurement || repriced.measured_in !== oldSubq.measured_in
      || repriced.last_measured_on !== oldSubq.last_measured_on
      || repriced.raw_sha256 !== previous.proof.raw_sha256?.['subq-snap-preview']) fail('SubQ reprice proof identity');
  if (repriced.input_tokens !== 1943705 || repriced.output_tokens !== 0
      || !isDeepStrictEqual(repriced.price_per_million, { input: 0.05, output: 0.0 })) fail('SubQ repriced tariff and usage');
  const recomputedUsd = (repriced.input_tokens * repriced.price_per_million.input
    + repriced.output_tokens * repriced.price_per_million.output) / 1_000_000 / 1500 * 1000;
  if (repriced.usd_per_1000 !== recomputedUsd || repriced.usd_per_1000 !== subq.cost.usd_per_1000
      || repriced.under_cost_cap !== false || repriced.treatment !== 'ranked_over_cap') fail('SubQ repriced cost binding');
  same(repriced.previous, { cost: oldSubq.cost, axes: oldSubq.axes, scores: oldSubq.scores, rank: oldSubq.rank, ranks: oldSubq.ranks }, 'SubQ previous proof state');
  same(repriced.current, { cost: subq.cost, axes: subq.axes, scores: subq.scores, rank: subq.rank, ranks: subq.ranks }, 'SubQ current proof state');
  const proofRows = new Map((proof.systems ?? []).map(row => [row.key, row]));
  if (proofRows.size !== (proof.systems ?? []).length || proofRows.size !== Object.keys(proof.raw_sha256 ?? {}).length) fail('proof row roster');
  for (const [key, summary] of proofRows) {
    const row = by.get(key);
    if (!row || summary.raw_sha256 !== proof.raw_sha256[key]) fail(`proof row raw identity ${key}`);
    same(summary.axes, row.axes, `proof row axes ${key}`);
    same(summary.capability, row.capability, `proof row Capability ${key}`);
    same(summary.composite_A, row.scores?.A ?? null, `proof row composite ${key}`);
    same(summary.usd_per_1000, row.cost?.usd_per_1000 ?? null, `proof row cost ${key}`);
    same(summary.cost_kind, row.cost?.kind ?? null, `proof row cost kind ${key}`);
    same(summary.display, row.display, `proof row display ${key}`);
    same(summary.model_pin, row.model_pin, `proof row model pin ${key}`);
    same(summary.rank, row.rank, `proof row rank ${key}`);
    same(summary.status, row.status?.status ?? null, `proof row status ${key}`);
    same(summary.rows, row.status?.rows ?? null, `proof row denominator ${key}`);
    same(summary.answered_ok, row.status?.answered_ok ?? null, `proof row answered ${key}`);
    same(summary.noul_decisive, row.noul_decisive, `proof row decisive ${key}`);
  }
  if (!proof.authority?.includes('#19174') || !proof.authority?.includes('#17513')) fail('authority for price basis and initial Florian GO');
  const freshId = proof.refreshed_preview_go_card;
  const approval = proof.refreshed_preview_approval;
  const expectedSelection = 'Publish (recommended)';
  const canonicalFreshId = typeof freshId === 'string' && /^\d+$/.test(freshId) && BigInt(freshId).toString() === freshId;
  if (!canonicalFreshId || BigInt(freshId) <= 17513n || BigInt(freshId) === 19174n
      || approval?.card_id !== freshId || approval.selection !== expectedSelection || !hex(approval.preview_png_sha256)) fail('fresh merged-board preview GO required');
  // How the approval actually arrived is part of the claim, not decoration: a release may not say Florian
  // pressed a button he did not press. `channel` and `button_tap` are therefore required, and the marker
  // that must appear in the authority string is built from them.
  const channels = ['telegram-button', 'direct-message'];
  if (!channels.includes(approval.channel) || typeof approval.button_tap !== 'boolean'
      || typeof approval.recorded_at !== 'string' || !approval.recorded_at
      || typeof approval.recorded_in !== 'string' || !approval.recorded_in
      || (approval.channel === 'telegram-button') !== approval.button_tap) fail('approval channel and provenance');
  const approvalMarker = approval.button_tap
    ? `Florian refreshed-preview approval: Telegram card #${freshId}; selected "${expectedSelection}" (${approval.recorded_at}); preview PNG SHA-256 ${approval.preview_png_sha256}.`
    : `Florian refreshed-preview approval: ${approval.channel} ${approval.recorded_at}, recorded as Telegram card #${freshId} = "${expectedSelection}" (${approval.recorded_in}; no button tap); preview PNG SHA-256 ${approval.preview_png_sha256}.`;
  if (!proof.authority.includes(approvalMarker)) fail('fresh merged-board preview GO authority binding');
  if (!artifact.measurement_notes.some(n => n.includes('#17513') && n.includes('PRICE-ONLY'))
      || artifact.measurement_notes.some(n => n.includes('PROVISIONAL-TOPFIVE'))) fail('approved preview / final top-five note');
  // critic-v1620-go-r2 P3-1: the guard above binds proof.authority, but the sentence the PUBLIC reads is the
  // PRICE-ONLY note. Check that note's provenance clause too, so a future build cannot ship a true authority
  // string next to a false public sentence.
  // critic r3 P3-1/P3-2: check EVERY PRICE-ONLY note, not the first one, and bind the card id and the PNG
  // hash in the public sentence as well - the authority marker binds proof.authority, not this text.
  const publicNotes = artifact.measurement_notes.filter(n => n.includes('PRICE-ONLY'));
  if (!publicNotes.length) fail('public note must describe how the approval arrived');
  for (const note of publicNotes) {
    const claimsTapInPublic = /selected "[^"]*" on Telegram card/.test(note);
    const saysNoTap = note.includes("The card's own button was not pressed.");
    if ((approval.button_tap ? (!claimsTapInPublic || saysNoTap) : (claimsTapInPublic || !saysNoTap))
        || !note.includes(`Telegram card #${freshId}`)
        || !note.includes(approval.preview_png_sha256)
        || note.includes('approval is pending')) fail('public note must describe how the approval arrived');
  }
  if (!sameSet(Object.keys(categories.systems), V1620_CARRIED_KEYS)) fail('category cohort');
  for (const key of V1620_CARRIED_KEYS) same(categories.systems[key], previous.categories.systems[key], `category cells changed ${key}`);
  if (categories.revision !== 'v1.6.20' || categories.provisional !== false || !hex(resultsSha256)
      || categories.results_sha256 !== resultsSha256
      || categories.source_results_sha256 !== artifact.source_sha256) fail('category hashes and identity');
  validateCategoryArtifact(categories, 'topics' in categories ? ['topics', 'families', 'usecases', 'languages'] : ['families', 'usecases', 'languages']);
  return { artifact, categories, proof, manifest };
}

async function load(path, root) {
  const bytes = await readFile(`${root}/${path}`);
  return { value: JSON.parse(bytes.toString('utf8')), bytes, sha256: sha(bytes) };
}

export async function readOptionalJevbenchV1620Release(root = process.cwd()) {
  let publication;
  try { publication = await load(V1620_MANIFEST, root); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  const previous = await readOptionalJevbenchV1618Release(root);
  if (!previous) fail('v1.6.20 needs the published v1.6.18 release it extends');
  const previousManifest = await load(`${V1620_ROOT}/jevbench-v1.6.18-publication.json`, root);
  const bundle = Object.fromEntries(await Promise.all(Object.entries(files).map(async ([k, path]) => [k, await load(path, root)])));
  for (const [key, value] of Object.entries(bundle)) if (publication.value.files?.[key]?.sha256 !== value.sha256) fail(`file hash ${key}`);
  if (bundle.history.sha256 !== previous.historical.sha256) fail('immutable history bytes');
  if (bundle['history-carry'].sha256 !== previous.historical.carrySha256) fail('immutable history-carry bytes');
  validateJevbenchV1620Bundle({ manifest: publication.value, artifact: bundle.results.value, categories: bundle.categories.value,
    proof: bundle.proof.value, previous, previousManifestSha256: previousManifest.sha256, resultsSha256: bundle.results.sha256 });
  return { artifact: bundle.results.value, bytes: bundle.results.bytes, sha256: bundle.results.sha256,
    categories: bundle.categories.value, categoriesSha256: bundle.categories.sha256, proof: bundle.proof.value,
    proofSha256: bundle.proof.sha256, manifest: publication.value, historical: previous.historical };
}

export async function hasPublishedJevbenchV1620Release(root = process.cwd(), log = console.error) {
  try { return Boolean(await readOptionalJevbenchV1620Release(root)); }
  catch { log('JevBench v1.6.20 navigation omitted: publication validation failed'); return false; }
}

export function v1620BoardInput(release) { return { artifact: release.artifact, categories: release.categories }; }
