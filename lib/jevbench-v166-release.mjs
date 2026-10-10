// JevBench v1.6.6: a same-draw addition to v1.6.5. Clef-omni joins the eight v1.6.5 rows on the seeded
// rotation draw v1.6-regular-20261010-a2, scored with the FROZEN v1.6.5 field median (g_med_fixed), so the
// eight earlier rows keep identical point scores; ranks and bootstrap intervals recompute for nine rows.
// Source-only, fail-closed loader: without the six published v1.6.6 files the release reports as
// unavailable, and any published evidence that does not validate fails closed. It never creates data,
// a review verdict or a manifest, and no item text, id, gold or per-item result may appear.
//
// The topic radar uses this draw's own labels (as v1.6.5); if it were ever absent the release must say so.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { validateJevbenchV16Release, mentionsPrivateSystem, validateJevbenchV16Carry, JEVBENCH_V16_EXCLUDED_KEYS } from './jevbench-v16-release.mjs';
import { readJevbenchV157Release } from './jevbench-v15-release.mjs';
import { validateCategoryArtifact } from './jevbench-categories.mjs';
import { V162_ROOT, V162_HISTORY_SHA256, V162_CARRY_SHA256 } from './jevbench-v162-release.mjs';
import { V165_KEYS, readOptionalJevbenchV165Release } from './jevbench-v165-release.mjs';

export const V166_ROOT = V162_ROOT;
export const V166_MANIFEST = `${V166_ROOT}/jevbench-v1.6.6-publication.json`;
export const V166_FILE_KEYS = ['results', 'categories', 'proof', 'history', 'history-carry'];
const files = Object.fromEntries(V166_FILE_KEYS.map(k => [k, `${V166_ROOT}/jevbench-v1.6.6-${k}.json`]));
/** The nine measured keys of this release: the eight v1.6.5 rows plus the row this revision adds. */
export const V166_NEW_KEYS = ['clef-omni'];
export const V166_KEYS = [...V165_KEYS, ...V166_NEW_KEYS];
/** The frozen v1.6.5 field median every row of this revision is scored against. */
export const V166_FIXED_G_MED = 10.073244581339713;
export const V166_BASE_DIMS = ['families', 'usecases', 'languages'];
/** Dimensions actually published by a given bundle: the topic radar joins them only once labelled. */
export function v166Dims(categories) {
  return 'topics' in categories ? ['topics', ...V166_BASE_DIMS] : [...V166_BASE_DIMS];
}
export const V166_DIMS = V166_BASE_DIMS;
export const V166_DRAW_RELEASE = 'v1.6-regular-20261010-a2';

const hex = v => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const finite = v => typeof v === 'number' && Number.isFinite(v);
const fail = message => { throw new Error(`JevBench v1.6.6: ${message}`); };
const sameSet = (a, b) => a.length === b.length && JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
function excluded(text) {
  if (JEVBENCH_V16_EXCLUDED_KEYS.some(key => text.includes(JSON.stringify(key))) || mentionsPrivateSystem(text)) fail('private-only system');
}
const forbidden = /^(?:item_ids?|item_text|question(?:_text)?|golds?|expected|predictions?|predicted|per_item|item_results|prompt|task_id|input_text|item_state|raw_response|raw_inputs|seed_value|secret|token|password)$/i;
function publicOnly(value) {
  if (Array.isArray(value)) return value.forEach(publicOnly);
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (forbidden.test(key)) fail(`private/item-level field ${key}`);
    publicOnly(child);
  }
}

export function validateJevbenchV166Bundle({ manifest, artifact, categories, proof, historicalSha256, previous }) {
  for (const value of [manifest, artifact, categories, proof]) {
    publicOnly(value);
    excluded(JSON.stringify(value));
  }
  // --- publication identity -----------------------------------------------------------------
  if (manifest?.schema_version !== 1 || manifest.revision !== 'v1.6.6' || manifest.status !== 'published' || manifest.provisional !== false) fail('publication status');
  if (manifest.review?.verdict !== 'PASS' || manifest.review.engine !== 'claude' || !hex(manifest.review.receipt_sha256)) fail('independent release review');
  if (manifest.predecessor?.revision !== 'v1.6.5' || !hex(manifest.predecessor.publication_sha256)) fail('predecessor binding');
  if (manifest.historical_revision !== 'v1.6.1' || manifest.historical_results_sha256 !== historicalSha256
      || historicalSha256 !== V162_HISTORY_SHA256 || manifest.historical_carry_sha256 !== V162_CARRY_SHA256) fail('historical source binding');
  for (const [key, path] of Object.entries(files)) if (manifest.files?.[key]?.path !== path || !hex(manifest.files[key].sha256)) fail(`file binding ${key}`);

  // --- artifact identity and the regular-queue cohort ----------------------------------------
  if (artifact?.revision !== 'v1.6.6' || artifact.run_kind !== 'regular-queue' || artifact.noul_method?.applied !== 'O1S') fail('regular-queue identity');
  // Score reproduction stays the published v1.6.1 contract; only identity and run kind differ.
  validateJevbenchV16Release({ ...artifact, revision: 'v1.6.1', run_kind: 'scheduled-refresh' }, 'v1.6.1');
  if (artifact.bootstrap?.B !== 1000 || artifact.bootstrap.bootstrap_seed !== 16 || artifact.bootstrap.g_med_fixed !== true) fail('artifact bootstrap');
  if (!sameSet(artifact.systems.map(s => s.key), V166_KEYS)) fail('exact nine-system cohort');
  if (artifact.not_measured.length) fail('regular cohort has no not-measured rows');
  for (const s of artifact.systems) {
    if (s.v16?.lane !== 'selfhosted') fail(`lane ${s.key}`);
    if (s.status?.rows !== 1500 || s.status.status !== 'complete') fail(`complete 1500 rows ${s.key}`);
    if (s.measured_in !== (V166_NEW_KEYS.includes(s.key) ? 'v1.6.6' : 'v1.6.5') || s.measurement_date_status !== 'measured' || s.last_measured_on !== '2026-10-10') fail(`measurement stamp ${s.key}`);
    if (!s.ranked || s.listing !== 'ranked' || s.full_coverage !== true) fail(`every regular row is ranked and fully covered: ${s.key}`);
    if (!s.api_flag === false && s.api_flag !== false) fail(`no API lane in this release: ${s.key}`);
    if (typeof s.repo !== 'string' || !s.repo.startsWith('https://')) fail(`repo ${s.key}`);
    if (typeof s.model_pin !== 'string' || !/@[a-f0-9]{40}$/.test(s.model_pin)) fail(`pinned revision ${s.key}`);
    // Every price in this release is a labelled estimate; none is a tariff any of these systems issued.
    if (s.cost?.kind !== 'estimate' || !finite(s.cost.usd_per_1000) || s.cost.usd_per_1000 <= 0) fail(`labelled cost estimate ${s.key}`);
    if (typeof s.cost.basis !== 'string' || s.cost.basis.length < 80) fail(`documented cost basis ${s.key}`);
    const d = s.noul_decisive;
    if (!d || d.supported !== true || !Number.isInteger(d.n) || d.n !== 375 || !finite(d.decisive_rate) || !finite(d.acc_among_decisive)) fail(`noul decisiveness ${s.key}`);
  }
  if (artifact.sample?.open !== 300 || artifact.sample.sealed !== 1200 || artifact.sample.total !== 1500) fail('scoring denominator');
  if (artifact.v16?.counts?.S !== 1200 || artifact.v16.counts.P !== 300 || artifact.v16.counts.selfhosted_input !== 1500) fail('fresh input counts');
  const ranked = artifact.systems.filter(s => s.ranked).map(s => s.key).sort();
  for (const o of ['A', 'B', 'C']) if (!sameSet(artifact.board?.[o]?.order ?? [], ranked)) fail(`board membership ${o}`);

  // --- the draw this release is scored on ----------------------------------------------------
  if (artifact.v16.draw_release !== V166_DRAW_RELEASE || !/^v1\.6-[a-z0-9-]+$/.test(artifact.v16.draw_release)) fail('draw identity');
  if (!hex(artifact.v16.freeze_manifest_sha256) || !hex(artifact.v16.seed_commitment) || !hex(artifact.v16.baseline_sha256)) fail('draw provenance hashes');
  for (const set of ['S', 'A', 'P', 'core']) if (!hex(artifact.v16.draw_digests?.[set])) fail(`draw digest ${set}`);

  // --- proof --------------------------------------------------------------------------------
  if (proof?.schema_version !== 1 || proof.revision !== 'v1.6.6' || proof.method !== 'jevbench::v1.6'
      || proof.noul_method?.applied !== 'O1S' || proof.bootstrap?.B !== 1000 || proof.bootstrap.seed !== 16) fail('method proof');
  if (proof.draw_release !== artifact.v16.draw_release || proof.freeze_manifest_sha256 !== artifact.v16.freeze_manifest_sha256
      || proof.seed_commitment !== artifact.v16.seed_commitment || !hex(proof.baseline_sha256)
      || !hex(proof.cost_basis_sha256) || !hex(proof.registry_sha256)) fail('draw/cohort binding');
  if (typeof proof.abandoned_draw_note !== 'string' || !proof.abandoned_draw_note.includes('v1.6-regular-20261010')) fail('abandoned-draw disclosure');
  if (typeof proof.authority !== 'string' || !proof.authority.trim()) fail('publication authority');
  const rows = proof.systems;
  if (!Array.isArray(rows) || !sameSet(rows.map(s => s.key), V166_KEYS)) fail('system proof coverage');
  for (const s of artifact.systems) {
    const p = rows.find(r => r.key === s.key);
    if (!p || p.rows !== 1500 || p.status !== 'complete' || !hex(p.raw_sha256)) fail(`system proof ${s.key}`);
    if (p.model_pin !== s.model_pin || Math.abs(p.composite_A - s.scores.A) > 1e-12 || p.rank !== s.rank) fail(`proof agrees with the row ${s.key}`);
    if (typeof p.measured_by !== 'string' || !p.measured_by.trim()) fail(`measuring operator ${s.key}`);
    // A source review is either an asserted hash of a review this release holds, or an explicit note
    // naming whose review it was. It is never silently absent.
    if (p.source_review_sha256 !== null && !hex(p.source_review_sha256)) fail(`source review hash ${s.key}`);
    if (typeof p.source_review_note !== 'string' || p.source_review_note.length < 20) fail(`source review note ${s.key}`);
  }
  // --- the field median is the FROZEN v1.6.5 value, recomputable from its eight members ----------
  const members = proof.field_median?.members;
  if (proof.field_median?.g_med_fixed !== true || proof.g_med_fixed_from?.revision !== 'v1.6.5'
      || proof.g_med_fixed_from.G_med !== V166_FIXED_G_MED || !hex(proof.g_med_fixed_from.baseline_sha256)
      || proof.g_med_fixed_from.baseline_sha256 !== proof.baseline_sha256) fail('frozen field median provenance');
  if (artifact.G_med !== V166_FIXED_G_MED) fail('frozen v1.6.5 G_med');
  if (!Array.isArray(members) || !sameSet(members.map(m => m.key), V165_KEYS)
      || !members.every(m => finite(m.gap) && artifact.systems.find(s => s.key === m.key)?.intelligence?.gap === m.gap)) fail('field median cohort');
  const gaps = members.map(m => m.gap).sort((a, b) => a - b);
  const median = gaps.length % 2 ? gaps[(gaps.length - 1) / 2] : (gaps[gaps.length / 2 - 1] + gaps[gaps.length / 2]) / 2;
  if (!finite(artifact.G_med) || Math.abs(artifact.G_med - median) > 1e-9 || proof.field_median.G_med !== artifact.G_med) fail('cohort G_med');
  // This release's own median is above the flag threshold, and it must say so rather than hide it.
  if (artifact.G_med_flag_gt10 !== (artifact.G_med > 10)) fail('G_med flag consistency');
  if (artifact.G_med_flag_gt10 && !artifact.measurement_notes.some(n => n.includes('G_med_flag_gt10'))) fail('G_med flag must be disclosed in the measurement notes');
  if (Math.abs(proof.gap_penalty_threshold - (artifact.G_med + 8)) > 1e-6) fail('gap penalty threshold');

  // --- categories ----------------------------------------------------------------------------
  if (categories?.revision !== 'v1.6.6' || categories.provisional !== false
      || categories.source_results_sha256 !== artifact.source_sha256
      || categories.draw_release !== artifact.v16.draw_release
      || categories.results_sha256 !== manifest.files.results.sha256) fail('category source binding');
  // A topic radar is allowed only with its own labelling provenance for THIS draw; without it the
  // release must disclose that the dimension is missing rather than leaving the omission silent.
  const dims = v166Dims(categories);
  if ('topics' in categories) {
    if (!hex(categories.labels_sha256)) fail('a topic radar needs the labels digest it was built from');
    if (categories.labels_draw_release !== V166_DRAW_RELEASE) fail('topic labels must be for this draw');
  } else if (!artifact.measurement_notes.some(n => n.includes('topic'))) {
    fail('a release without the topic radar must say so in its measurement notes');
  }
  for (const field of ['live_category_cells', 'supplement', 'language_cells', 'unavailable']) if (field in categories) fail(`historical category overlay ${field}`);
  for (const field of ['lane_note', 'metric', 'labelling']) if (typeof categories[field] !== 'string' || !categories[field].trim()) fail(`category field ${field}`);
  if (!Array.isArray(categories.rules) || !categories.rules.length) fail('category rules');
  if (!categories.lanes || !sameSet(Object.keys(categories.lanes), V166_KEYS) || !Object.values(categories.lanes).every(l => l === 'selfhosted')) fail('category lanes');
  validateCategoryArtifact(categories, dims);
  if (!sameSet(Object.keys(categories.systems), V166_KEYS)) fail('category cohort');
  for (const dim of dims) {
    for (const c of categories[dim]) {
      if (!Number.isInteger(c.n) || c.n < 0 || !Number.isInteger(c.open) || c.open < 0 || c.open > 300
          || !Number.isInteger(c.sealed) || c.sealed < 0 || c.sealed > 1200 || c.n !== c.open + c.sealed
          || typeof c.low_n !== 'boolean' || c.low_n !== (c.n < 30)) fail(`category descriptor ${dim}.${c.key}`);
    }
  }
  if (categories.languages.reduce((n, c) => n + c.n, 0) !== 1500
      || categories.languages.reduce((n, c) => n + c.open, 0) !== 300
      || categories.languages.reduce((n, c) => n + c.sealed, 0) !== 1200) fail('category language denominator');
  // The artifact's own documented rule: a cell exists exactly for categories at or above min_n.
  // Smaller categories are omitted on purpose (on the authoring-metadata-only build, 3 use cases of this draw sat at 13-14 items), so
  // requiring a cell for every nonzero category would be requiring data the method withholds.
  for (const key of V166_KEYS) for (const dim of dims) {
    for (const c of categories[dim]) {
      const cell = categories.systems[key]?.[dim]?.[c.key];
      if (c.n >= categories.min_n && !cell) fail(`missing category ${key}.${dim}.${c.key}`);
      if (c.n < categories.min_n && cell) fail(`below-min_n category must be omitted: ${key}.${dim}.${c.key}`);
      if (cell && (!Number.isInteger(cell.n) || cell.n < categories.min_n || !finite(cell.competence))) fail(`category cell ${key}.${dim}.${c.key}`);
    }
  }
  // --- the eight earlier rows are exactly the published v1.6.5 rows ----------------------------
  if (previous) {
    if (previous.manifest?.revision !== 'v1.6.5') fail('predecessor bundle');
    for (const key of V165_KEYS) {
      const a = previous.artifact.systems.find(s => s.key === key), b = artifact.systems.find(s => s.key === key);
      if (!a || !b) fail(`earlier row present ${key}`);
      for (const o of ['A', 'B', 'C']) if (a.scores[o] !== b.scores[o]) fail(`earlier row point score ${key}.${o}`);
      for (const axis of ['intelligence', 'calibration', 'speed', 'cost']) if (a.axes[axis] !== b.axes[axis]) fail(`earlier row axis ${key}.${axis}`);
      if (a.capability !== b.capability || a.cost.usd_per_1000 !== b.cost.usd_per_1000) fail(`earlier row capability/cost ${key}`);
    }
    if (manifest.predecessor.publication_sha256 !== previous.manifestSha256) fail('predecessor publication hash');
  }
  return { artifact, categories, proof, manifest };
}

async function load(path, root) {
  const bytes = await readFile(`${root}/${path}`);
  const text = bytes.toString('utf8'); excluded(text);
  return { value: JSON.parse(text), bytes, sha256: createHash('sha256').update(bytes).digest('hex') };
}

/** Missing publication manifest means the version is unavailable; invalid published evidence fails closed. */
export async function readOptionalJevbenchV166Release(root = process.cwd()) {
  let publication;
  try { publication = await load(V166_MANIFEST, root); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  const [results, categories, proof, history, carry, previous] = await Promise.all([
    load(files.results, root), load(files.categories, root), load(files.proof, root),
    load(files.history, root), load(files['history-carry'], root), readJevbenchV157Release(root)]);
  const v165 = await readOptionalJevbenchV165Release(root);
  if (!v165) fail('v1.6.6 needs the published v1.6.5 release it extends');
  const v165Manifest = await load(`${V166_ROOT}/jevbench-v1.6.5-publication.json`, root);
  publicOnly(history.value);
  if (mentionsPrivateSystem(JSON.stringify(history.value))) fail('private historical system');
  validateJevbenchV16Release(history.value, 'v1.6.1');
  if (history.sha256 !== V162_HISTORY_SHA256 || carry.sha256 !== V162_CARRY_SHA256) fail('immutable historical source hash');
  if (history.value.systems.some(s => s.measured_in === 'v1.6.5' || s.measured_in === 'v1.6.6')) fail('fresh row in history');
  const measured = new Set(history.value.systems.map(s => s.key));
  const checkedCarry = validateJevbenchV16Carry(carry.value, measured, previous.artifact, previous.sha256);
  const historical = { artifact: history.value, bytes: history.bytes, sha256: history.sha256, carry: checkedCarry, carrySha256: carry.sha256 };
  for (const [key, value] of Object.entries({ results, categories, proof, history, 'history-carry': carry })) {
    if (publication.value.files?.[key]?.sha256 !== value.sha256) fail(`bytes hash ${key}`);
  }
  validateJevbenchV166Bundle({ manifest: publication.value, artifact: results.value, categories: categories.value, proof: proof.value, historicalSha256: historical.sha256,
    previous: { manifest: v165.manifest, artifact: v165.artifact, manifestSha256: v165Manifest.sha256 } });
  return { artifact: results.value, bytes: results.bytes, sha256: results.sha256,
           categories: categories.value, categoriesSha256: categories.sha256,
           proof: proof.value, proofSha256: proof.sha256, manifest: publication.value, historical };
}

/** Optional navigation must never make an older board depend on fresh publication health. */
export async function hasPublishedJevbenchV166Release(root = process.cwd(), log = console.error) {
  try { return Boolean(await readOptionalJevbenchV166Release(root)); }
  catch { log('JevBench v1.6.6 navigation omitted: publication validation failed'); return false; }
}

/** Board input: this release's own nine rows, with no historical overlay mixed in. */
export function v166BoardInput(release) {
  return { artifact: release.artifact, categories: release.categories };
}
