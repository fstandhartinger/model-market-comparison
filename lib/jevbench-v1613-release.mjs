// JevBench v1.6.13: a same-draw addition. attest-31B-v1.0 (paid fast-lane order 07d13315) joins the six v1.6.12 rows
// on the seeded rotation draw v1.6-regular-20261012, still scored with the FROZEN v1.6.10 field median (g_med_fixed), so
// the six earlier rows keep identical point scores; ranks and bootstrap intervals recompute for seven rows.
// Source-only, fail-closed loader: without the six published v1.6.13 files the release reports as
// unavailable, and any published evidence that does not validate fails closed. It never creates data,
// a review verdict or a manifest, and no item text, id, gold or per-item result may appear.
//
// The topic radar is OPTIONAL in this revision. The shared topic labels of the earlier draws have zero id
// overlap with this draw's items, so a topic dimension may only appear once this draw's own items have been
// labelled by the same pipeline; when it is absent the release must say so in its measurement notes.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { validateJevbenchV16Release, mentionsPrivateSystem, validateJevbenchV16Carry, JEVBENCH_V16_EXCLUDED_KEYS } from './jevbench-v16-release.mjs';
import { readJevbenchV157Release } from './jevbench-v15-release.mjs';
import { validateCategoryArtifact } from './jevbench-categories.mjs';
import { V162_ROOT, V162_HISTORY_SHA256, V162_CARRY_SHA256 } from './jevbench-v162-release.mjs';
import { V1610_KEYS } from './jevbench-v1610-release.mjs';
import { V1612_KEYS, readOptionalJevbenchV1612Release } from './jevbench-v1612-release.mjs';

export const V1613_ROOT = V162_ROOT;
export const V1613_MANIFEST = `${V1613_ROOT}/jevbench-v1.6.13-publication.json`;
export const V1613_FILE_KEYS = ['results', 'categories', 'proof', 'history', 'history-carry'];
const files = Object.fromEntries(V1613_FILE_KEYS.map(k => [k, `${V1613_ROOT}/jevbench-v1.6.13-${k}.json`]));
/** The seven measured keys: the six v1.6.12 rows plus the one this revision adds. */
export const V1613_NEW_KEYS = ['attest-31b-v1.0'];
export const V1613_KEYS = [...V1612_KEYS, ...V1613_NEW_KEYS];
/** The median frozen at v1.6.10 that every row of this revision is scored against. */
export const V1613_FIXED_G_MED = 9.839526770355711;
/** The published v1.6 cost ceiling every row of this release was bound to before scoring (CoS #17903). */
export const V1613_COST_CAP = 0.06459465517241379;
export const V1613_BASE_DIMS = ['families', 'usecases', 'languages'];
/** Dimensions actually published by a given bundle: the topic radar joins them only once labelled. */
export function v1613Dims(categories) {
  return 'topics' in categories ? ['topics', ...V1613_BASE_DIMS] : [...V1613_BASE_DIMS];
}
export const V1613_DIMS = V1613_BASE_DIMS;
export const V1613_DRAW_RELEASE = 'v1.6-regular-20261012';

const hex = v => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const finite = v => typeof v === 'number' && Number.isFinite(v);
const fail = message => { throw new Error(`JevBench v1.6.13: ${message}`); };
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

export function validateJevbenchV1613Bundle({ manifest, artifact, categories, proof, historicalSha256, previous }) {
  for (const value of [manifest, artifact, categories, proof]) {
    publicOnly(value);
    excluded(JSON.stringify(value));
  }
  // --- publication identity -----------------------------------------------------------------
  if (manifest?.schema_version !== 1 || manifest.revision !== 'v1.6.13' || manifest.status !== 'published' || manifest.provisional !== false) fail('publication status');
  if (manifest.review?.verdict !== 'PASS' || manifest.review.engine !== 'claude' || !hex(manifest.review.receipt_sha256)) fail('independent release review');
  if (manifest.predecessor?.revision !== 'v1.6.12' || !hex(manifest.predecessor.publication_sha256)) fail('predecessor binding');
  if (manifest.historical_revision !== 'v1.6.1' || manifest.historical_results_sha256 !== historicalSha256
      || historicalSha256 !== V162_HISTORY_SHA256 || manifest.historical_carry_sha256 !== V162_CARRY_SHA256) fail('historical source binding');
  for (const [key, path] of Object.entries(files)) if (manifest.files?.[key]?.path !== path || !hex(manifest.files[key].sha256)) fail(`file binding ${key}`);

  // --- artifact identity and the regular-queue cohort ----------------------------------------
  if (artifact?.revision !== 'v1.6.13' || artifact.run_kind !== 'regular-queue' || artifact.noul_method?.applied !== 'O1S') fail('regular-queue identity');
  // Score reproduction stays the published v1.6.1 contract; only identity and run kind differ.
  validateJevbenchV16Release({ ...artifact, revision: 'v1.6.1', run_kind: 'scheduled-refresh' }, 'v1.6.1');
  if (artifact.bootstrap?.B !== 1000 || artifact.bootstrap.bootstrap_seed !== 16 || artifact.bootstrap.g_med_fixed !== true) fail('artifact bootstrap');
  if (!sameSet(artifact.systems.map(s => s.key), V1613_KEYS)) fail('exact seven-system cohort');
  if (artifact.not_measured.length) fail('regular cohort has no not-measured rows');
  if (!previous || previous.manifest?.revision !== 'v1.6.12' || previous.proof?.revision !== 'v1.6.12') fail('predecessor bundle');
  for (const s of artifact.systems) {
    if (s.v16?.lane !== (V1613_NEW_KEYS.includes(s.key) ? 'api' : 'selfhosted')) fail(`lane ${s.key}`);
    if (V1613_NEW_KEYS.includes(s.key) && (s.endpoint_kind !== 'api' || s.api_subset !== false || s.v16.full_set_api !== true || s.v16.set !== 'S+P' || s.v16.equating_offset !== null)) fail(`full-set API lane ${s.key}`);
    if (s.status?.rows !== 1500 || s.status.status !== 'complete') fail(`complete 1500 rows ${s.key}`);
    if (s.measured_in !== (V1613_NEW_KEYS.includes(s.key) ? 'v1.6.13' : previous?.artifact?.systems.find(p => p.key === s.key)?.measured_in) || s.measurement_date_status !== 'measured' || s.last_measured_on !== '2026-10-12') fail(`measurement stamp ${s.key}`);
    if (!s.ranked || s.listing !== 'ranked' || s.full_coverage !== true) fail(`every regular row is ranked and fully covered: ${s.key}`);
    if (s.api_flag !== V1613_NEW_KEYS.includes(s.key)) fail(`API flag ${s.key}`);
    if (typeof s.repo !== 'string' || !s.repo.startsWith('https://')) fail(`repo ${s.key}`);
    if (typeof s.model_pin !== 'string' || !/@[a-f0-9]{40}$/.test(s.model_pin)) fail(`pinned revision ${s.key}`);
    // Every price in this release is a labelled estimate; none is a tariff any of these systems issued.
    if (s.cost?.kind !== 'estimate' || !finite(s.cost.usd_per_1000) || s.cost.usd_per_1000 <= 0) fail(`labelled cost estimate ${s.key}`);
    if (typeof s.cost.basis !== 'string' || s.cost.basis.length < 80) fail(`documented cost basis ${s.key}`);
    if (s.cost.usd_per_1000 > V1613_COST_CAP) fail(`cost above the published ceiling ${s.key}`);
    if (V1613_NEW_KEYS.includes(s.key) && (s.speed?.adjustment !== 'none (API)' || s.speed.p50_s_raw !== s.speed.p50_s_adjusted || s.speed.p95_s_raw !== s.speed.p95_s_adjusted)) fail(`API latency ${s.key}`);
    const d = s.noul_decisive;
    if (!d || d.supported !== true || !Number.isInteger(d.n) || d.n !== 375 || !finite(d.decisive_rate)
        || !(finite(d.acc_among_decisive) || (d.acc_among_decisive === null && d.decisive === 0 && d.decisive_rate === 0))) fail(`noul decisiveness ${s.key}`);
  }
  if (artifact.sample?.open !== 300 || artifact.sample.sealed !== 1200 || artifact.sample.total !== 1500) fail('scoring denominator');
  if (artifact.v16?.counts?.S !== 1200 || artifact.v16.counts.P !== 300 || artifact.v16.counts.selfhosted_input !== 1500) fail('fresh input counts');
  const ranked = artifact.systems.filter(s => s.ranked).map(s => s.key).sort();
  for (const o of ['A', 'B', 'C']) if (!sameSet(artifact.board?.[o]?.order ?? [], ranked)) fail(`board membership ${o}`);

  // --- the draw this release is scored on ----------------------------------------------------
  if (artifact.v16.draw_release !== V1613_DRAW_RELEASE || !/^v1\.6-[a-z0-9-]+$/.test(artifact.v16.draw_release)) fail('draw identity');
  if (!hex(artifact.v16.freeze_manifest_sha256) || !hex(artifact.v16.seed_commitment) || !hex(artifact.v16.baseline_sha256)) fail('draw provenance hashes');
  for (const set of ['S', 'A', 'P', 'core']) if (!hex(artifact.v16.draw_digests?.[set])) fail(`draw digest ${set}`);

  // --- proof --------------------------------------------------------------------------------
  if (proof?.schema_version !== 1 || proof.revision !== 'v1.6.13' || proof.method !== 'jevbench::v1.6'
      || proof.noul_method?.applied !== 'O1S' || proof.bootstrap?.B !== 1000 || proof.bootstrap.seed !== 16) fail('method proof');
  if (proof.draw_release !== artifact.v16.draw_release || proof.freeze_manifest_sha256 !== artifact.v16.freeze_manifest_sha256
      || proof.seed_commitment !== artifact.v16.seed_commitment || !hex(proof.baseline_sha256)
      || !hex(proof.cost_basis_sha256) || !hex(proof.registry_sha256)) fail('draw/cohort binding');
  // No draw was abandoned before this one; a note claiming otherwise would be a false disclosure.
  if (proof.abandoned_draw_note !== null) fail('abandoned-draw disclosure');
  if (typeof proof.authority !== 'string' || !proof.authority.trim()) fail('publication authority');
  const rows = proof.systems;
  if (!Array.isArray(rows) || !sameSet(rows.map(s => s.key), V1613_KEYS)) fail('system proof coverage');
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
  // --- the field median is the FROZEN v1.6.10 value, recomputable from its four members --------
  const members = proof.field_median?.members;
  if (proof.field_median?.g_med_fixed !== true || proof.g_med_fixed_from?.revision !== 'v1.6.10'
      || proof.g_med_fixed_from.G_med !== V1613_FIXED_G_MED || !hex(proof.g_med_fixed_from.baseline_sha256)
      || proof.g_med_fixed_from.baseline_sha256 !== proof.baseline_sha256) fail('frozen field median provenance');
  if (artifact.G_med !== V1613_FIXED_G_MED) fail('frozen v1.6.10 G_med');
  if (!Array.isArray(members) || !sameSet(members.map(m => m.key), V1610_KEYS)
      || !members.every(m => finite(m.gap) && artifact.systems.find(s => s.key === m.key)?.intelligence?.gap === m.gap)) fail('field median cohort');
  const gaps = members.map(m => m.gap).sort((a, b) => a - b);
  const median = gaps.length % 2 ? gaps[(gaps.length - 1) / 2] : (gaps[gaps.length / 2 - 1] + gaps[gaps.length / 2]) / 2;
  if (!finite(artifact.G_med) || Math.abs(artifact.G_med - median) > 1e-9 || proof.field_median.G_med !== artifact.G_med) fail('cohort G_med');
  // A median above ten must be disclosed rather than hidden (this one is below it).
  if (artifact.G_med_flag_gt10 !== (artifact.G_med > 10)) fail('G_med flag consistency');
  if (artifact.G_med_flag_gt10 && !artifact.measurement_notes.some(n => n.includes('G_med_flag_gt10'))) fail('G_med flag must be disclosed in the measurement notes');
  if (Math.abs(proof.gap_penalty_threshold - (artifact.G_med + 8)) > 1e-6) fail('gap penalty threshold');

  // --- categories ----------------------------------------------------------------------------
  if (categories?.revision !== 'v1.6.13' || categories.provisional !== false
      || categories.source_results_sha256 !== artifact.source_sha256
      || categories.draw_release !== artifact.v16.draw_release
      || categories.results_sha256 !== manifest.files.results.sha256) fail('category source binding');
  // A topic radar is allowed only with its own labelling provenance for THIS draw; without it the
  // release must disclose that the dimension is missing rather than leaving the omission silent.
  const dims = v1613Dims(categories);
  if ('topics' in categories) {
    if (!hex(categories.labels_sha256)) fail('a topic radar needs the labels digest it was built from');
    if (categories.labels_draw_release !== V1613_DRAW_RELEASE) fail('topic labels must be for this draw');
  } else if (!artifact.measurement_notes.some(n => n.includes('topic'))) {
    fail('a release without the topic radar must say so in its measurement notes');
  }
  for (const field of ['live_category_cells', 'supplement', 'language_cells', 'unavailable']) if (field in categories) fail(`historical category overlay ${field}`);
  for (const field of ['lane_note', 'metric', 'labelling']) if (typeof categories[field] !== 'string' || !categories[field].trim()) fail(`category field ${field}`);
  if (!Array.isArray(categories.rules) || !categories.rules.length) fail('category rules');
  if (!categories.lanes || !sameSet(Object.keys(categories.lanes), V1613_KEYS) || !V1613_KEYS.every(k => categories.lanes[k] === (V1613_NEW_KEYS.includes(k) ? 'api' : 'selfhosted'))) fail('category lanes');
  validateCategoryArtifact(categories, dims);
  if (!sameSet(Object.keys(categories.systems), V1613_KEYS)) fail('category cohort');
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
  // Smaller categories are omitted on purpose, so requiring a cell for every nonzero category would be
  // requiring data the method withholds.
  for (const key of V1613_KEYS) for (const dim of dims) {
    for (const c of categories[dim]) {
      const cell = categories.systems[key]?.[dim]?.[c.key];
      if (c.n >= categories.min_n && !cell) fail(`missing category ${key}.${dim}.${c.key}`);
      if (c.n < categories.min_n && cell) fail(`below-min_n category must be omitted: ${key}.${dim}.${c.key}`);
      if (cell && (!Number.isInteger(cell.n) || cell.n < categories.min_n || !finite(cell.competence))) fail(`category cell ${key}.${dim}.${c.key}`);
    }
  }
  // --- the six earlier rows are exactly the published v1.6.12 rows -------------------------
  // Mandatory: an addition is only valid against the release it extends.
  {
    if (!previous || previous.manifest?.revision !== 'v1.6.12' || previous.proof?.revision !== 'v1.6.12') fail('predecessor bundle');
    if (proof.g_med_fixed_from.baseline_sha256 !== previous.proof.baseline_sha256 || previous.artifact.G_med !== V1613_FIXED_G_MED) fail('frozen median is not the predecessor median');
    for (const key of V1612_KEYS) {
      const a = previous.artifact.systems.find(s => s.key === key), b = artifact.systems.find(s => s.key === key);
      if (!a || !b) fail(`earlier row present ${key}`);
      for (const o of ['A', 'B', 'C']) if (a.scores[o] !== b.scores[o]) fail(`earlier row point score ${key}.${o}`);
      for (const axis of ['intelligence', 'calibration', 'speed', 'cost']) if (a.axes[axis] !== b.axes[axis]) fail(`earlier row axis ${key}.${axis}`);
      if (a.capability !== b.capability || JSON.stringify(a.cost) !== JSON.stringify(b.cost)) fail(`earlier row capability/cost ${key}`);
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
export async function readOptionalJevbenchV1613Release(root = process.cwd()) {
  let publication;
  try { publication = await load(V1613_MANIFEST, root); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  const [results, categories, proof, history, carry, previous] = await Promise.all([
    load(files.results, root), load(files.categories, root), load(files.proof, root),
    load(files.history, root), load(files['history-carry'], root), readJevbenchV157Release(root)]);
  const v1612 = await readOptionalJevbenchV1612Release(root);
  if (!v1612) fail('v1.6.13 needs the published v1.6.12 release it extends');
  const v1612Manifest = await load(`${V1613_ROOT}/jevbench-v1.6.12-publication.json`, root);
  publicOnly(history.value);
  if (mentionsPrivateSystem(JSON.stringify(history.value))) fail('private historical system');
  validateJevbenchV16Release(history.value, 'v1.6.1');
  if (history.sha256 !== V162_HISTORY_SHA256 || carry.sha256 !== V162_CARRY_SHA256) fail('immutable historical source hash');
  if (history.value.systems.some(s => ['v1.6.10', 'v1.6.11', 'v1.6.12', 'v1.6.13'].includes(s.measured_in))) fail('fresh row in history');
  const measured = new Set(history.value.systems.map(s => s.key));
  const checkedCarry = validateJevbenchV16Carry(carry.value, measured, previous.artifact, previous.sha256);
  const historical = { artifact: history.value, bytes: history.bytes, sha256: history.sha256, carry: checkedCarry, carrySha256: carry.sha256 };
  for (const [key, value] of Object.entries({ results, categories, proof, history, 'history-carry': carry })) {
    if (publication.value.files?.[key]?.sha256 !== value.sha256) fail(`bytes hash ${key}`);
  }
  validateJevbenchV1613Bundle({ manifest: publication.value, artifact: results.value, categories: categories.value, proof: proof.value, historicalSha256: historical.sha256,
    previous: { manifest: v1612.manifest, artifact: v1612.artifact, proof: v1612.proof, manifestSha256: v1612Manifest.sha256 } });
  return { artifact: results.value, bytes: results.bytes, sha256: results.sha256,
           categories: categories.value, categoriesSha256: categories.sha256,
           proof: proof.value, proofSha256: proof.sha256, manifest: publication.value, historical };
}

/** Optional navigation must never make an older board depend on fresh publication health. */
export async function hasPublishedJevbenchV1613Release(root = process.cwd(), log = console.error) {
  try { return Boolean(await readOptionalJevbenchV1613Release(root)); }
  catch { log('JevBench v1.6.13 navigation omitted: publication validation failed'); return false; }
}

/** Board input: this release's own seven rows, with no historical overlay mixed in. */
export function v1613BoardInput(release) {
  return { artifact: release.artifact, categories: release.categories };
}
