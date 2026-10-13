// JevBench v1.6.15: a same-draw addition of THREE self-hosted CPU rows to the seven official rows of
// v1.6.14, on the seeded rotation draw v1.6-regular-20261012, still scored with the FROZEN v1.6.10 field
// median (g_med_fixed), so every earlier row keeps identical point scores; ranks and bootstrap intervals
// recompute over the new roster. v1.6.14's PRELIMINARY, UNRANKED Microsoft A2 alias is carried through
// BYTE FOR BYTE: it was scored in a separate private invocation and is not rescored here, so its own
// guards stay where they are - in the validated v1.6.14 predecessor this loader requires.
//
// One of the three new rows, reflex-instinct-0.6b, is LISTED BUT NOT RANKED: CoS deputy decision #18761
// accepts its Intelligence, Calibration and Cost only and declares its Speed figure non-official, and the
// published composite weights Speed. The loader REQUIRES that row to be unranked with a stated reason, so
// a later build cannot quietly promote it.
//
// Source-only and fail-closed: without the six published v1.6.15 files the version reports as unavailable,
// and any published evidence that does not validate fails closed. It never creates data, a review verdict
// or a manifest, and no item text, id, gold or per-item result may appear.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { validateJevbenchV16Release, mentionsPrivateSystem, JEVBENCH_V16_EXCLUDED_KEYS } from './jevbench-v16-release.mjs';
import { validateCategoryArtifact } from './jevbench-categories.mjs';
import { V1610_KEYS } from './jevbench-v1610-release.mjs';
import { V1613_KEYS } from './jevbench-v1613-release.mjs';
import { readOptionalJevbenchV1614Release, V1614_ROOT, V1614_NEW_KEYS } from './jevbench-v1614-release.mjs';
import { JEV_PRELIMINARY_LISTING } from './jevbench-scope.mjs';

export const V1615_ROOT = V1614_ROOT;
export const V1615_MANIFEST = `${V1615_ROOT}/jevbench-v1.6.15-publication.json`;
export const V1615_FILE_KEYS = ['results', 'categories', 'proof', 'history', 'history-carry'];
const files = Object.fromEntries(V1615_FILE_KEYS.map(k => [k, `${V1615_ROOT}/jevbench-v1.6.15-${k}.json`]));
/** The three self-hosted CPU rows this revision adds. */
export const V1615_NEW_KEYS = ['julia-1', 'phocinae-largha-150m-v1', 'reflex-instinct-0.6b'];
/** Listed but deliberately NOT ranked, per CoS deputy decision #18761 (Speed non-official). */
export const V1615_UNRANKED_NEW_KEYS = ['reflex-instinct-0.6b'];
/** Every full-draw row of this release: the seven official v1.6.13/v1.6.14 rows plus the three new ones. */
export const V1615_REGULAR_KEYS = [...V1613_KEYS, ...V1615_NEW_KEYS];
/** The A2 alias carried from v1.6.14, scored elsewhere and not rescored here. */
export const V1615_CARRIED_PRELIMINARY_KEYS = [...V1614_NEW_KEYS];
export const V1615_KEYS = [...V1615_REGULAR_KEYS, ...V1615_CARRIED_PRELIMINARY_KEYS];
export const V1615_FIXED_G_MED = 9.839526770355711;
export const V1615_COST_CAP = 0.06459465517241379;
export const V1615_DRAW_RELEASE = 'v1.6-regular-20261012';
/** Disclosures that are part of what this release publishes about each new row, not optional prose.
 *  The v1.6.15 critic round showed a loader that accepts a row whose disclosure has been deleted is not
 *  checking the thing that actually matters about these three rows. */
export const V1615_REQUIRED_DISCLOSURES = Object.freeze({
  'phocinae-largha-150m-v1': ['evaluator', 'shim', '512'],
  'reflex-instinct-0.6b': ['truncat', 'max_len', '#18761'],
  'julia-1': ['strict_encoding', 'refus'],
});
export const V1615_BASE_DIMS = ['families', 'usecases', 'languages'];
export function v1615Dims(categories) {
  return 'topics' in categories ? ['topics', ...V1615_BASE_DIMS] : [...V1615_BASE_DIMS];
}
export const V1615_DIMS = V1615_BASE_DIMS;

const hex = v => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const finite = v => typeof v === 'number' && Number.isFinite(v);
const fail = message => { throw new Error(`JevBench v1.6.15: ${message}`); };
const sameSet = (a, b) => a.length === b.length && JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
const same = (a, b, message) => { if (!isDeepStrictEqual(a, b)) fail(message); };
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

export function validateJevbenchV1615Bundle({ manifest, artifact, categories, proof, previous, previousManifestSha256 }) {
  for (const value of [manifest, artifact, categories, proof]) {
    publicOnly(value);
    excluded(JSON.stringify(value));
  }
  // --- publication identity ------------------------------------------------------------------
  if (manifest?.schema_version !== 1 || manifest.revision !== 'v1.6.15' || manifest.status !== 'published' || manifest.provisional !== false) fail('publication status');
  if (manifest.review?.verdict !== 'PASS' || manifest.review.engine !== 'claude' || !hex(manifest.review.receipt_sha256)) fail('independent release review');
  if (!previous || previous.manifest?.revision !== 'v1.6.14' || previous.proof?.revision !== 'v1.6.14') fail('validated v1.6.14 predecessor required');
  same(manifest.predecessor, { revision: 'v1.6.14', publication_sha256: previousManifestSha256 }, 'predecessor binding');
  for (const k of ['historical_revision', 'historical_results_sha256', 'historical_carry_sha256']) same(manifest[k], previous.manifest[k], `historical binding ${k}`);
  for (const [key, path] of Object.entries(files)) if (manifest.files?.[key]?.path !== path || !hex(manifest.files[key].sha256)) fail(`file binding ${key}`);

  // --- artifact identity and the cohort ------------------------------------------------------
  if (artifact?.revision !== 'v1.6.15' || artifact.run_kind !== 'regular-queue' || artifact.noul_method?.applied !== 'O1S') fail('regular-queue identity');
  validateJevbenchV16Release({ ...artifact, revision: 'v1.6.1', run_kind: 'scheduled-refresh' }, 'v1.6.1');
  if (artifact.bootstrap?.B !== 1000 || artifact.bootstrap.bootstrap_seed !== 16 || artifact.bootstrap.g_med_fixed !== true) fail('artifact bootstrap');
  if (!sameSet(artifact.systems.map(s => s.key), V1615_KEYS)) fail('exact eleven-system cohort');
  if (artifact.systems.length !== previous.artifact.systems.length + V1615_NEW_KEYS.length) fail('exactly three added rows');
  if (artifact.not_measured.length) fail('regular cohort has no not-measured rows');
  if (artifact.roster_count !== artifact.systems.length) fail('roster count');
  if (artifact.n_ranked !== artifact.systems.filter(s => s.ranked).length || artifact.n_ranked !== 9) fail('nine ranked rows');

  // --- the three new rows, and the one that must stay unranked --------------------------------
  for (const s of artifact.systems) {
    if (V1615_CARRIED_PRELIMINARY_KEYS.includes(s.key)) continue;   // validated by the predecessor
    if (s.v16?.lane !== (V1613_KEYS.includes(s.key) ? previous.artifact.systems.find(p => p.key === s.key).v16.lane : 'selfhosted')) fail(`lane ${s.key}`);
    if (s.status?.rows !== 1500 || s.status.status !== 'complete') fail(`complete 1500 rows ${s.key}`);
    if (s.full_coverage !== true) fail(`full coverage ${s.key}`);
    if (V1615_NEW_KEYS.includes(s.key)) {
      if (s.measured_in !== 'v1.6.15' || s.measurement_date_status !== 'measured' || s.last_measured_on !== '2026-10-13') fail(`measurement stamp ${s.key}`);
      if (s.endpoint_kind !== 'cpu' || s.api_flag !== false || s.v16.set !== 'S+P') fail(`self-hosted CPU lane ${s.key}`);
      if (s.speed?.adjustment !== 'x2 + 0.15 s (assumption, not measured)'
          || !(s.speed.p50_s_adjusted > s.speed.p50_s_raw) || !(s.speed.p95_s_adjusted > s.speed.p95_s_raw)) fail(`self-hosted latency adjustment ${s.key}`);
      if (s.cost?.kind !== 'estimate') fail(`labelled cost estimate ${s.key}`);
      // Honest measurement conditions are part of the row, not an optional extra.
      if (typeof s.endpoint_condition !== 'string' || !/load/i.test(s.endpoint_condition)) fail(`shared-host disclosure ${s.key}`);
      if (!artifact.measurement_notes.some(n => n.startsWith(`${s.key}: `))) fail(`row note ${s.key}`);
    } else {
      const p = previous.artifact.systems.find(q => q.key === s.key);
      if (s.measured_in !== p.measured_in || s.measurement_date_status !== 'measured' || s.last_measured_on !== p.last_measured_on) fail(`inherited measurement stamp ${s.key}`);
    }
    // every full-draw row: all four axes present and finite, and Capability IS the mean of Intelligence
    // and Calibration - so a row cannot carry an invented Capability or a deleted axis.
    for (const axis of ['intelligence', 'calibration', 'speed', 'cost']) {
      if (!finite(s.axes?.[axis])) fail(`axis ${axis} ${s.key}`);
    }
    if (!finite(s.capability) || Math.abs(s.capability - (s.axes.intelligence + s.axes.calibration) / 2) > 1e-9) {
      fail(`capability is the mean of intelligence and calibration: ${s.key}`);
    }
    if (V1615_NEW_KEYS.includes(s.key)) {
      const note = artifact.measurement_notes.find(n => n.startsWith(`${s.key}: `)) ?? '';
      if (note.length < 400) fail(`row note is too thin to be the disclosure it claims to be: ${s.key}`);
      for (const fragment of V1615_REQUIRED_DISCLOSURES[s.key] ?? []) {
        if (!note.includes(fragment) && !String(s.endpoint_condition).includes(fragment)) {
          fail(`required disclosure "${fragment}" missing from ${s.key}`);
        }
      }
    }
    if (V1615_UNRANKED_NEW_KEYS.includes(s.key)) {
      if (s.ranked !== false || s.rank !== null || s.listing !== 'listed') fail(`listed-not-ranked row ${s.key}`);
      same(s.ranks, { A: null, B: null, C: null, capability: null }, `null ranks ${s.key}`);
      if (typeof s.not_ranked_because !== 'string' || !s.not_ranked_because.includes('#18761')
          || !/speed/i.test(s.not_ranked_because) || s.not_ranked_because.length < 120) fail(`stated reason for not ranking ${s.key}`);
      if (!finite(s.capability) || !finite(s.axes?.intelligence) || !finite(s.axes.calibration)) fail(`accepted axes ${s.key}`);
    } else if (!s.ranked || s.listing !== 'ranked' || !Number.isInteger(s.rank)) {
      fail(`every other full-draw row is ranked: ${s.key}`);
    }
    if (typeof s.repo !== 'string' || !s.repo.startsWith('https://')) fail(`repo ${s.key}`);
    if (typeof s.model_pin !== 'string' || !/@[a-f0-9]{40}$/.test(s.model_pin)) fail(`pinned revision ${s.key}`);
    if (!finite(s.cost?.usd_per_1000) || s.cost.usd_per_1000 <= 0) fail(`cost figure ${s.key}`);
    if (typeof s.cost.basis !== 'string' || s.cost.basis.length < 80) fail(`documented cost basis ${s.key}`);
    if (s.cost.usd_per_1000 > V1615_COST_CAP) fail(`cost above the published ceiling ${s.key}`);
    const d = s.noul_decisive;
    if (!d || d.supported !== true || !Number.isInteger(d.n) || d.n !== 375 || !finite(d.decisive_rate)
        || !(finite(d.acc_among_decisive) || (d.acc_among_decisive === null && d.decisive === 0 && d.decisive_rate === 0))) fail(`noul decisiveness ${s.key}`);
  }
  if (artifact.sample?.open !== 300 || artifact.sample.sealed !== 1200 || artifact.sample.total !== 1500) fail('scoring denominator');
  if (artifact.v16?.counts?.S !== 1200 || artifact.v16.counts.P !== 300 || artifact.v16.counts.selfhosted_input !== 1500) fail('fresh input counts');
  const ranked = artifact.systems.filter(s => s.ranked).map(s => s.key).sort();
  for (const o of ['A', 'B', 'C']) if (!sameSet(artifact.board?.[o]?.order ?? [], ranked)) fail(`board membership ${o}`);
  if (ranked.includes('reflex-instinct-0.6b')) fail('a non-official Speed axis may not enter a ranked board');

  // --- the A2 alias is carried through unchanged ---------------------------------------------
  for (const key of V1615_CARRIED_PRELIMINARY_KEYS) {
    const a = previous.artifact.systems.find(s => s.key === key), b = artifact.systems.find(s => s.key === key);
    if (!a || !b) fail(`carried preliminary row present ${key}`);
    same(b, a, `carried preliminary row unchanged ${key}`);
    if (b.listing !== JEV_PRELIMINARY_LISTING || b.ranked !== false || b.rank !== null) fail(`carried row stays unranked ${key}`);
    if (categories.systems?.[key]) fail(`the carried A2 measurement has no category cells: ${key}`);
  }

  // --- the seven earlier rows keep every point estimate --------------------------------------
  // Ranks and bootstrap intervals recompute over the new roster (one shared paired resample), which the
  // measurement notes must disclose; no point estimate, axis, capability or cost object may move.
  // Exactly three things may differ on a carried row, and nothing else: its bootstrap intervals
  // (composite_ci95, v16.ci95 - one shared paired resample over a changed field) and, on the single row
  // whose A-basis diagnostic depends on the ranked field, v16.raw_on_A. Everything else is deep-equal.
  const CARRIED_ALLOWED_DIFFS = ['composite_ci95', 'v16.ci95', 'v16.raw_on_A'];
  const strip = (row) => {
    const copy = JSON.parse(JSON.stringify(row));
    delete copy.composite_ci95;
    if (copy.v16) { delete copy.v16.ci95; delete copy.v16.raw_on_A; }
    return copy;
  };
  for (const key of V1613_KEYS) {
    const a = previous.artifact.systems.find(s => s.key === key), b = artifact.systems.find(s => s.key === key);
    if (!a || !b) fail(`earlier row present ${key}`);
    same(strip(b), strip(a), `carried row differs outside ${CARRIED_ALLOWED_DIFFS.join('/')}: ${key}`);
    for (const o of ['A', 'B', 'C']) if (a.scores[o] !== b.scores[o]) fail(`earlier row point score ${key}.${o}`);
    for (const axis of ['intelligence', 'calibration', 'speed', 'cost']) if (a.axes[axis] !== b.axes[axis]) fail(`earlier row axis ${key}.${axis}`);
    if (a.capability !== b.capability) fail(`earlier row capability ${key}`);
    same(b.cost, a.cost, `earlier row cost object ${key}`);
    same(b.noul_decisive, a.noul_decisive, `earlier row noul decisiveness ${key}`);
    if (a.rank !== b.rank) fail(`earlier row rank ${key}`);
    if (a.display !== b.display || a.model_pin !== b.model_pin || a.repo !== b.repo) fail(`earlier row identity ${key}`);
  }
  same(artifact.measurement_notes?.slice(0, previous.artifact.measurement_notes.length), previous.artifact.measurement_notes, 'inherited measurement notes unchanged');
  if (!artifact.measurement_notes.some(n => n.includes('confidence interval') && n.includes('paired resample'))) fail('the shared-resample disclosure is mandatory');
  if (!artifact.measurement_notes.some(n => n.includes('#18761') && n.includes('LISTED BUT NOT RANKED'))) fail('the non-official Speed disclosure is mandatory');
  // A row that is shown without a rank must say where it is shown and what the figures there do NOT mean,
  // or a reader meets its composite in the full data table with no warning attached (critic finding F6).
  if (!artifact.measurement_notes.some(n => n.includes('full data table') && n.includes('non-official'))) {
    fail('the listed-not-ranked row needs its where-it-is-shown disclosure');
  }
  if (artifact.G_med_api_basis_P_vs_A !== previous.artifact.G_med_api_basis_P_vs_A
      && !artifact.measurement_notes.some(n => n.includes('API-basis median diagnostic'))) {
    fail('a moved API-basis diagnostic must be disclosed, not left to be found');
  }
  if (artifact.G_med !== V1615_FIXED_G_MED || previous.artifact.G_med !== V1615_FIXED_G_MED) fail('frozen v1.6.10 G_med');

  // --- the draw and the proof -----------------------------------------------------------------
  if (artifact.v16.draw_release !== V1615_DRAW_RELEASE) fail('draw identity');
  if (!hex(artifact.v16.freeze_manifest_sha256) || !hex(artifact.v16.seed_commitment) || !hex(artifact.v16.baseline_sha256)) fail('draw provenance hashes');
  for (const set of ['S', 'A', 'P', 'core']) if (!hex(artifact.v16.draw_digests?.[set])) fail(`draw digest ${set}`);
  if (proof?.schema_version !== 1 || proof.revision !== 'v1.6.15' || proof.method !== 'jevbench::v1.6'
      || proof.noul_method?.applied !== 'O1S' || proof.bootstrap?.B !== 1000 || proof.bootstrap.seed !== 16) fail('method proof');
  if (proof.draw_release !== artifact.v16.draw_release || proof.freeze_manifest_sha256 !== artifact.v16.freeze_manifest_sha256
      || proof.seed_commitment !== artifact.v16.seed_commitment || !hex(proof.baseline_sha256)
      || !hex(proof.cost_basis_sha256) || !hex(proof.registry_sha256) || !hex(proof.pricing_module_sha256)) fail('draw/cohort binding');
  if (proof.abandoned_draw_note !== null) fail('abandoned-draw disclosure');
  if (typeof proof.authority !== 'string' || !proof.authority.includes('#18761') || !proof.authority.includes('#18209')) fail('publication authority');
  if (!sameSet(Object.keys(proof.raw_sha256 ?? {}), V1615_REGULAR_KEYS)) fail('raw-output coverage');
  same({ ...proof.raw_sha256, ...Object.fromEntries(V1615_NEW_KEYS.map(k => [k, previous.proof.raw_sha256[k]])) },
       { ...previous.proof.raw_sha256, ...Object.fromEntries(V1615_NEW_KEYS.map(k => [k, previous.proof.raw_sha256[k]])) },
       'inherited raw-output hashes unchanged');
  same(proof.a2_supplement, previous.proof.a2_supplement, 'carried A2 scorer binding unchanged');
  const rows = proof.systems;
  if (!Array.isArray(rows) || !sameSet(rows.map(s => s.key), V1615_REGULAR_KEYS)) fail('system proof coverage');
  for (const s of artifact.systems) {
    if (V1615_CARRIED_PRELIMINARY_KEYS.includes(s.key)) continue;
    const p = rows.find(r => r.key === s.key);
    if (!p || p.rows !== 1500 || p.status !== 'complete' || !hex(p.raw_sha256)) fail(`system proof ${s.key}`);
    if (p.model_pin !== s.model_pin || Math.abs(p.composite_A - s.scores.A) > 1e-12 || p.rank !== s.rank) fail(`proof agrees with the row ${s.key}`);
    if (typeof p.measured_by !== 'string' || !p.measured_by.trim()) fail(`measuring operator ${s.key}`);
    if (p.source_review_sha256 !== null && !hex(p.source_review_sha256)) fail(`source review hash ${s.key}`);
    if (typeof p.source_review_note !== 'string' || p.source_review_note.length < 20) fail(`source review note ${s.key}`);
  }
  for (const key of V1615_NEW_KEYS) {
    const n = proof.new_rows?.[key];
    if (!n || n.raw_sha256 !== proof.raw_sha256[key] || !Number.isInteger(n.answered_ok) || n.rows !== 1500
        || !finite(n.usd_per_1000) || n.usd_per_1000 > V1615_COST_CAP
        || n.ranked !== !V1615_UNRANKED_NEW_KEYS.includes(key)) fail(`new-row provenance ${key}`);
    const row = artifact.systems.find(s => s.key === key);
    if (n.answered_ok !== row.status.answered_ok || Math.abs(n.usd_per_1000 - row.cost.usd_per_1000) > 1e-12) fail(`new-row provenance agrees with the row ${key}`);
  }
  // --- the frozen median, recomputable from its four v1.6.10 members --------------------------
  const members = proof.field_median?.members;
  if (proof.field_median?.g_med_fixed !== true || proof.g_med_fixed_from?.revision !== 'v1.6.10'
      || proof.g_med_fixed_from.G_med !== V1615_FIXED_G_MED || proof.g_med_fixed_from.baseline_sha256 !== proof.baseline_sha256) fail('frozen field median provenance');
  if (!Array.isArray(members) || !sameSet(members.map(m => m.key), V1610_KEYS)
      || !members.every(m => finite(m.gap) && artifact.systems.find(s => s.key === m.key)?.intelligence?.gap === m.gap)) fail('field median cohort');
  const gaps = members.map(m => m.gap).sort((a, b) => a - b);
  const median = gaps.length % 2 ? gaps[(gaps.length - 1) / 2] : (gaps[gaps.length / 2 - 1] + gaps[gaps.length / 2]) / 2;
  if (Math.abs(artifact.G_med - median) > 1e-9 || proof.field_median.G_med !== artifact.G_med) fail('cohort G_med');
  if (artifact.G_med_flag_gt10 !== (artifact.G_med > 10)) fail('G_med flag consistency');
  if (Math.abs(proof.gap_penalty_threshold - (artifact.G_med + 8)) > 1e-6) fail('gap penalty threshold');

  // --- categories ------------------------------------------------------------------------------
  if (categories?.revision !== 'v1.6.15' || categories.provisional !== false
      || categories.source_results_sha256 !== artifact.source_sha256
      || categories.draw_release !== artifact.v16.draw_release
      || categories.results_sha256 !== manifest.files.results.sha256) fail('category source binding');
  const dims = v1615Dims(categories);
  if ('topics' in categories) {
    if (!hex(categories.labels_sha256)) fail('a topic radar needs the labels digest it was built from');
    if (categories.labels_draw_release !== V1615_DRAW_RELEASE) fail('topic labels must be for this draw');
  } else if (!artifact.measurement_notes.some(n => n.includes('topic'))) {
    fail('a release without the topic radar must say so in its measurement notes');
  }
  for (const field of ['live_category_cells', 'supplement', 'language_cells', 'unavailable']) if (field in categories) fail(`historical category overlay ${field}`);
  for (const field of ['lane_note', 'metric', 'labelling']) if (typeof categories[field] !== 'string' || !categories[field].trim()) fail(`category field ${field}`);
  if (!Array.isArray(categories.rules) || !categories.rules.length) fail('category rules');
  if (!categories.lanes || !sameSet(Object.keys(categories.lanes), V1615_REGULAR_KEYS)) fail('category lanes');
  for (const key of V1615_REGULAR_KEYS) {
    const expected = V1615_NEW_KEYS.includes(key) ? 'selfhosted' : previous.categories.lanes[key];
    if (categories.lanes[key] !== expected) fail(`category lane ${key}`);
  }
  validateCategoryArtifact(categories, dims);
  if (!sameSet(Object.keys(categories.systems), V1615_REGULAR_KEYS)) fail('category cohort');
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
  for (const key of V1615_REGULAR_KEYS) for (const dim of dims) {
    for (const c of categories[dim]) {
      const cell = categories.systems[key]?.[dim]?.[c.key];
      if (c.n >= categories.min_n && !cell) fail(`missing category ${key}.${dim}.${c.key}`);
      if (c.n < categories.min_n && cell) fail(`below-min_n category must be omitted: ${key}.${dim}.${c.key}`);
      if (cell && (!Number.isInteger(cell.n) || cell.n < categories.min_n || !finite(cell.competence))) fail(`category cell ${key}.${dim}.${c.key}`);
    }
  }
  // Inherited category cells are the published v1.6.14 cells, cell by cell.
  for (const key of V1613_KEYS) same(categories.systems[key], previous.categories.systems[key], `inherited category cells ${key}`);
  return { artifact, categories, proof, manifest };
}

async function load(path, root) {
  const bytes = await readFile(`${root}/${path}`);
  const text = bytes.toString('utf8'); excluded(text);
  return { value: JSON.parse(text), bytes, sha256: createHash('sha256').update(bytes).digest('hex') };
}

/** Missing publication manifest means the version is unavailable; invalid published evidence fails closed. */
export async function readOptionalJevbenchV1615Release(root = process.cwd()) {
  let publication;
  try { publication = await load(V1615_MANIFEST, root); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  const previous = await readOptionalJevbenchV1614Release(root);
  if (!previous) fail('v1.6.15 needs the published v1.6.14 release it extends');
  const previousManifest = await load(`${V1615_ROOT}/jevbench-v1.6.14-publication.json`, root);
  const bundle = Object.fromEntries(await Promise.all(Object.entries(files).map(async ([k, path]) => [k, await load(path, root)])));
  for (const [key, value] of Object.entries(bundle)) if (publication.value.files?.[key]?.sha256 !== value.sha256) fail(`bytes hash ${key}`);
  if (bundle.history.sha256 !== previous.historical.sha256) fail('immutable history bytes');
  if (bundle['history-carry'].sha256 !== previous.historical.carrySha256) fail('immutable carry bytes');
  validateJevbenchV1615Bundle({ manifest: publication.value, artifact: bundle.results.value, categories: bundle.categories.value,
    proof: bundle.proof.value, previous, previousManifestSha256: previousManifest.sha256 });
  return { artifact: bundle.results.value, bytes: bundle.results.bytes, sha256: bundle.results.sha256,
           categories: bundle.categories.value, categoriesSha256: bundle.categories.sha256,
           proof: bundle.proof.value, proofSha256: bundle.proof.sha256, manifest: publication.value,
           historical: previous.historical };
}

/** Optional navigation must never make an older board depend on fresh publication health. */
export async function hasPublishedJevbenchV1615Release(root = process.cwd(), log = console.error) {
  try { return Boolean(await readOptionalJevbenchV1615Release(root)); }
  catch { log('JevBench v1.6.15 navigation omitted: publication validation failed'); return false; }
}

/** Board input: this release's own eleven rows, with no historical overlay mixed in. */
export function v1615BoardInput(release) {
  return { artifact: release.artifact, categories: release.categories };
}
