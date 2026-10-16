// v1.6.22: four measured rows join the v1.6.21 field on the same frozen draw. messier-one-v0.4 and nev-2b are priced
// from their frozen base-model references and ranked; nemotron-deciffusion-8b-v2 and trio-spark-v1.3 have no price on
// the frozen path and are listed, measured and NOT ranked (the v1.6.18 Nimble treatment). Carried rows keep every
// point estimate (v1.6.18/v1.6.21 rules). The approval must say how it arrived (v1.6.20 rules): with no top-five
// change it is Florian's direct-message GO alone and no preview card may be claimed; with a top-five change a filled
// preview-card approval is required and a PLACEHOLDER build does not load.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { validateJevbenchV16Release, mentionsPrivateSystem, JEVBENCH_V16_EXCLUDED_KEYS } from './jevbench-v16-release.mjs';
import { validateCategoryArtifact } from './jevbench-categories.mjs';
import { V1610_KEYS } from './jevbench-v1610-release.mjs';
import { readOptionalJevbenchV1621Release, V1621_ROOT, V1621_CARRIED_KEYS, V1621_NEW_KEYS, V1621_UNRANKED_CARRIED_KEYS,
         V1621_CARRIED_PRELIMINARY_KEYS, V1621_ABOVE_COST_CAP_KEYS, V1621_PRICING_MODULE_SHA256 } from './jevbench-v1621-release.mjs';
import { JEV_PRELIMINARY_LISTING } from './jevbench-scope.mjs';

export const V1622_ROOT = V1621_ROOT;
export const V1622_MANIFEST = `${V1622_ROOT}/jevbench-v1.6.22-publication.json`;
export const V1622_FILE_KEYS = ['results', 'categories', 'proof', 'history', 'history-carry'];
const files = Object.fromEntries(V1622_FILE_KEYS.map(k => [k, `${V1622_ROOT}/jevbench-v1.6.22-${k}.json`]));
/** The four rows this release adds: two ranked, two listed but not ranked (unpriced). */
export const V1622_RANKED_NEW_KEYS = ['messier-one-v0.4', 'nev-2b'];
export const V1622_UNRANKED_NEW_KEYS = ['nemotron-deciffusion-8b-v2', 'trio-spark-v1.3'];
export const V1622_NEW_KEYS = [...V1622_RANKED_NEW_KEYS, ...V1622_UNRANKED_NEW_KEYS].sort();
export const V1622_CARRIED_KEYS = [...V1621_CARRIED_KEYS, ...V1621_NEW_KEYS];
export const V1622_CARRIED_PRELIMINARY_KEYS = [...V1621_CARRIED_PRELIMINARY_KEYS];
/** Carried listed-but-not-ranked rows: reflex (#18761), Sage 1.4, and the two Nimble rows (#19084). */
export const V1622_UNRANKED_CARRIED_KEYS = [...V1621_UNRANKED_CARRIED_KEYS];
export const V1622_ABOVE_COST_CAP_KEYS = [...V1621_ABOVE_COST_CAP_KEYS];
export const V1622_FIXED_G_MED = 9.839526770355711;
export const V1622_COST_CAP = 0.06459465517241379;
export const V1622_DRAW_RELEASE = 'v1.6-regular-20261012';
/** No pricing re-freeze in this release: the module in force since v1.6.21. */
export const V1622_PRICING_MODULE_SHA256 = V1621_PRICING_MODULE_SHA256;
export const V1622_GO_QUOTE = 'I really want all of the models we have evaluated to be online (even if they land in #5) on both JevBench and ImageJevBench';
export const V1622_GO = { channel: 'direct-message', where: 'laptop chat', date: '2026-10-16', recorded_at: '2026-10-16T12:50Z',
  recorded_in: 'DECISIONS.md 2026-10-16 12:50 UTC', quote: V1622_GO_QUOTE };
/** v1.6.21's top-five preview card; a v1.6.22 card, if one is ever needed, must be newer. */
const LAST_CARD = 17650n;
const NO_CARD_MARKER = `Florian publication approval: direct-message ${V1622_GO.recorded_at} (${V1622_GO.recorded_in}); no top-five preview card (no top-five list changes); no button tap.`;
const NO_CARD_TEXT = 'No top-five list changes (see the board-effect note), so no top-five preview card was sent and none is claimed; the GO arrived as a direct message and no Telegram button was pressed.';
const NO_CHANGE_BOARD = '0 of 21 top-five lists change';
const CORRECTION = 'CORRECTION to the v1.6.20 note: the refreshed-preview Telegram card #17515 on which Florian\'s v1.6.20 approval was recorded had been sent to him on 14 Oct 2026 at 14:59Z (CoS deputy #19679); the v1.6.20 note did not state that time.';
const cost = (tin, tout, pin, pout) => 1000 * (tin * pin + tout * pout) / 1e6 / 1500;   // score_v16.common_basis_usd

/** Each new row's identity, measurement and the SHA-256 of its published texts (cost basis, endpoint condition,
 *  not-ranked reason): the public reads exactly these, so they are pinned here. */
export const V1622_ROW_SPEC = Object.freeze({
  'messier-one-v0.4': { ranked: true, lane: 'selfhosted', kind: 'gpu', display: 'Messier One v0.4 (Qwen3.5-4B fine-tune, self-hosted)',
    author: 'agentmessier-ai (agentmessier.ai@gmail.com)', repo: 'https://huggingface.co/agentmessier/messier-one',
    model_pin: 'agentmessier/messier-one@14c84de57b71bf48608e2d886d86ebc5c6f8897e', measured_on: '2026-10-14',
    licence: 'Weights CC BY-NC 4.0 (non-commercial: free for research and evaluation, commercial licence on request; listing a measured score is evaluation use); code Apache-2.0; base Qwen/Qwen3.5-4B Apache-2.0',
    ok: 1500, status_counts: { 200: 1500 }, input_tokens: 1105885, output_tokens: 0, price: { input: 0.030000000000000002, output: 0.15 },
    raw: 'c7a7841a102e676804cfbb9a12fca5b86c8a3845ff3990996f3d20a00ecf10cb', copy: 'd2a0c4f797b9e607aebf26b613920a0573844b537aa0ea4aa288d677295a80eb',
    custody: '#19335', texts: { cost_basis: '869dc7501c3207e6813032e372a05d26cbc63d904d15f6fc1b766aed43ab027a', endpoint_condition: '24942ff08d1f57d69170bb0d5cefd35cc91e09acc414937c74896da77c28db6e' },
    disclosures: ['CC BY-NC 4.0', 'non-commercial', '--noul-floor 0.801', 'ON BY DEFAULT', 'Floor-0 sensitivity', 'never this row\'s score',
      'TRUNCATES', 'As-refused sensitivity', 'RTX A6000 48 GB', 'not comparable to the live messier-one-v0.2 row', '#19335', '#19341', 'No paid order',
      'c7a7841a102e676804cfbb9a12fca5b86c8a3845ff3990996f3d20a00ecf10cb'] },
  'nev-2b': { ranked: true, lane: 'selfhosted', kind: 'cpu', display: 'Nev-2B (EryriLabs)', author: 'EryriLabs (queries@eryrilabs.com)',
    repo: 'https://huggingface.co/EryriLabs/Nev-2B-GGUF', model_pin: 'EryriLabs/Nev-2B-GGUF@65d329f676d75cc538346e2687bed71187ae76b2', measured_on: '2026-10-15',
    licence: 'Apache-2.0 (weights and shim); base Qwen/Qwen3.5-2B-Base Apache-2.0',
    ok: 1485, status_counts: { 200: 1485, 502: 15 }, input_tokens: 685652, output_tokens: 0, price: { input: 0.02, output: 0.1 },
    raw: '76b58967b5133653a5530966338efde6c8b32f854fd66da707040dc2195df4f3', copy: '3ca90aef11ed254956211d443887fb8cd0a3577f2bbf995f9667416dd5ccd22b',
    custody: '#19428', texts: { cost_basis: '52b4bc5790f1e72f367e19cf3cde9a47c97345c1761d8b28a4be1eb5a6416e83', endpoint_condition: 'd12e53092a0f04096545ecc7d6f63ecdc613f45811de9228eb8dd129d011fc54' },
    disclosures: ['1,485 of 1,500', '15 HTTP 502 context-overflow refusals', 'scored as wrong answers', 'cost excludes those refused long prompts',
      'ENGLISH-ONLY', 'SPEED is Sandy\'s loaded shared CPU, not the model', 'No-calibration sensitivity', '#19428', 'No paid order',
      '76b58967b5133653a5530966338efde6c8b32f854fd66da707040dc2195df4f3'] },
  'nemotron-deciffusion-8b-v2': { ranked: false, lane: 'selfhosted', kind: 'gpu', display: 'Nemotron Deciffusion 8B v2 (pst2154)',
    author: 'Alex Steiner / pst2154 (asteiner@nvidia.com)', repo: 'https://huggingface.co/nemotron-deciffusion/Nemotron-Deciffusion-8B-v2',
    model_pin: 'nemotron-deciffusion/Nemotron-Deciffusion-8B-v2@1dea38015e86e101eb978a33fa493818fc71e366', measured_on: '2026-10-15',
    licence: 'NVIDIA Nemotron Open Model License (https://www.nvidia.com/en-us/agreements/enterprise-software/nvidia-nemotron-open-model-license/); base nvidia/Nemotron-Labs-Diffusion-8B',
    ok: 1500, status_counts: { 200: 1500 }, input_tokens: 992887, output_tokens: 1500, price: null,
    raw: '1a0953d441ab462cbdfad12537ba10a7e858331414843d04e5e035d6878d2c0f', copy: 'b2d3d5047bb9fa49141d4ce9e724a93934508bf9f0760f1788c1345e242d2af7',
    custody: '#19428', reason: '#19427', texts: { cost_basis: '91e85ce4a13e1a11d5a7f8933e683467cceb91ad11e7670b0e10687edf8bd359', endpoint_condition: '5b8781c324462fad73e3fc302f61a32088cc8236aa9dd7ba92abf0cbd4ee9ffb', not_ranked_because: '2f3d720f533f1a3b3a5588c199e3475faca0f60d25d18060a4244456a4c78bb2' },
    disclosures: ['about 10% of their state', 'BM25', 'As-refused sensitivity', 'UNPRICED', '#19427', 'not reused', 'NVIDIA Nemotron Open Model License',
      'NOT RANKED', '#19428', 'No paid order', '1a0953d441ab462cbdfad12537ba10a7e858331414843d04e5e035d6878d2c0f'] },
  'trio-spark-v1.3': { ranked: false, lane: 'api', kind: 'api', display: 'Trio-Spark v1.3 (MachineFi)', author: 'MachineFi (raullen@machinefi.com)',
    repo: 'https://github.com/machinefi/trio-spark', model_pin: 'hosted-api:platform.machinefi.com/v1/systemone#trio-spark-v1.3', measured_on: '2026-10-15',
    licence: 'Proprietary hosted API (no weights or training code released; the repo\'s own client code is Apache-2.0)',
    ok: 1398, status_counts: { 200: 1398, 422: 102 }, input_tokens: 573254, output_tokens: 0, price: null,
    raw: '19cdb9cf78bac0f72b96e4f6af0ae3c76d392b5b959870b83b5ed132238244bf', copy: '23db012ec50f2876526d8f52225585c0b2b49fb2cbb6ebbc5c13ddfdfbe844c9',
    custody: '#19732', reason: 'no eligible', texts: { cost_basis: '1a3b93bddffd48f05ab7e8e196184d67e34270b83cb4feff4d480c76eae06bbf', endpoint_condition: 'f3888d785f58b163ff89457e12267bd53e3b482c44d7d2a8a6904efd747f9bd2', not_ranked_because: '97fcbc20fec50fc6dc75acf5dffe77c080f9fd5b0c5daa09355d813caa1be5e2' },
    disclosures: ['1,398 of 1,500', '102 HTTP 422 refusals', '58 because the question has 9 options', '43 over MachineFi\'s own documented 1,024-token input cap',
      'scored as wrong answers', '`machinefi` before dispatch', 'no API adjustment', 'UNPRICED', 'NOT RANKED', '#19732', '#19740', 'No paid order',
      'not independently inspected', '19cdb9cf78bac0f72b96e4f6af0ae3c76d392b5b959870b83b5ed132238244bf'] },
});
export const V1622_BASE_DIMS = ['families', 'usecases', 'languages'];
export function v1622Dims(categories) {
  return 'topics' in categories ? ['topics', ...V1622_BASE_DIMS] : [...V1622_BASE_DIMS];
}

const hex = v => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const finite = v => typeof v === 'number' && Number.isFinite(v);
const textSha = v => typeof v === 'string' ? createHash('sha256').update(v, 'utf8').digest('hex') : null;
const fail = message => { throw new Error(`JevBench v1.6.22: ${message}`); };
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
const intervalOk = (ci, scores) => ['A', 'B', 'C'].every(o => {
  const pair = ci?.[o];
  return Array.isArray(pair) && pair.length === 2 && finite(pair[0]) && finite(pair[1]) && pair[0] <= pair[1]
    && scores[o] >= pair[0] - 1e-9 && scores[o] <= pair[1] + 1e-9;
});

/** How the publication approval arrived. Returns the marker the authority must carry. */
function approvalOf(proof, artifact, boardNote, provisional) {
  const pa = proof.publication_approval;
  same(pa?.go, V1622_GO, 'publication GO provenance');
  // A build made before a preview card was answered carries PLACEHOLDER fields; they are rejected wherever they appear.
  if (JSON.stringify(proof).includes('PLACEHOLDER') || JSON.stringify(artifact).includes('PLACEHOLDER')) fail('approval placeholder not filled');
  const notes = artifact.measurement_notes.filter(n => n.startsWith('Publication of v1.6.22:'));
  if (notes.length !== 1) fail('public note must describe how the approval arrived');
  const note = notes[0];
  if (!note.includes(V1622_GO_QUOTE) || !note.includes(V1622_GO.recorded_in)) fail('public note must describe how the approval arrived');
  const noChange = boardNote.includes(NO_CHANGE_BOARD);
  if (pa.top_five_effect === 'none') {
    // No top five changes: no preview card exists, and none may be claimed anywhere.
    if (!provisional && !noChange) fail('a no-card approval needs the generated no-change board note');
    if (pa.top_five_preview !== null || pa.button_tap !== false || Object.keys(pa).sort().join() !== 'button_tap,go,top_five_effect,top_five_preview') fail('no-card approval provenance');
    if (!note.includes(NO_CARD_TEXT) || /Telegram card #\d/.test(note) || /selected "[^"]*" on Telegram card/.test(note)) fail('public note must not claim a preview card');
    return NO_CARD_MARKER;
  }
  if (pa.top_five_effect !== 'changes' || noChange) fail('approval and top-five effect disagree');
  const a = pa.top_five_preview;
  const id = a?.card_id;
  const canonical = typeof id === 'string' && /^\d+$/.test(id) && BigInt(id).toString() === id;
  if (!canonical || BigInt(id) <= LAST_CARD || typeof a.selection !== 'string' || !a.selection.trim() || !hex(a.preview_png_sha256)) fail('top-five preview approval card');
  if (!['telegram-button', 'direct-message'].includes(a.channel) || typeof a.button_tap !== 'boolean' || pa.button_tap !== a.button_tap
      || typeof a.recorded_at !== 'string' || !a.recorded_at || typeof a.recorded_in !== 'string' || !a.recorded_in
      || (a.channel === 'telegram-button') !== a.button_tap) fail('approval channel and provenance');
  const claimsTap = /selected "[^"]*" on Telegram card/.test(note);
  const saysNoTap = note.includes("The card's own button was not pressed.");
  if ((a.button_tap ? (!claimsTap || saysNoTap) : (claimsTap || !saysNoTap)) || !note.includes(`Telegram card #${id}`)
      || !note.includes(a.preview_png_sha256)) fail('public note must describe how the approval arrived');
  return a.button_tap
    ? `Florian top-five preview approval: Telegram card #${id}; selected "${a.selection}" (${a.recorded_at}); preview PNG SHA-256 ${a.preview_png_sha256}.`
    : `Florian top-five preview approval: ${a.channel} ${a.recorded_at}, recorded as Telegram card #${id} = "${a.selection}" (${a.recorded_in}; no button tap); preview PNG SHA-256 ${a.preview_png_sha256}.`;
}

export function validateJevbenchV1622Bundle({ manifest, artifact, categories, proof, previous, previousManifestSha256 }) {
  for (const value of [manifest, artifact, categories, proof]) {
    publicOnly(value);
    excluded(JSON.stringify(value));
  }
  // --- publication identity ------------------------------------------------------------------
  if (manifest?.schema_version !== 1 || manifest.revision !== 'v1.6.22' || manifest.status !== 'published' || manifest.provisional !== false) fail('publication status');
  if (manifest.review?.verdict !== 'PASS' || !manifest.review.engine || manifest.review.engine === 'PENDING' || !hex(manifest.review.receipt_sha256)) fail('independent release review');
  if (!previous || previous.manifest?.revision !== 'v1.6.21' || previous.proof?.revision !== 'v1.6.21') fail('validated v1.6.21 predecessor required');
  same(manifest.predecessor, { revision: 'v1.6.21', publication_sha256: previousManifestSha256 }, 'predecessor binding');
  for (const k of ['historical_revision', 'historical_results_sha256', 'historical_carry_sha256']) same(manifest[k], previous.manifest[k], `historical binding ${k}`);
  for (const [key, path] of Object.entries(files)) if (manifest.files?.[key]?.path !== path || !hex(manifest.files[key].sha256)) fail(`file binding ${key}`);

  // --- artifact identity and the cohort ------------------------------------------------------
  if (artifact?.revision !== 'v1.6.22' || artifact.run_kind !== 'regular-queue' || artifact.status !== 'published'
      || artifact.provisional !== false || artifact.noul_method?.applied !== 'O1S') fail('regular-queue identity');
  validateJevbenchV16Release({ ...artifact, revision: 'v1.6.1', run_kind: 'scheduled-refresh' }, 'v1.6.1');
  if (artifact.bootstrap?.B !== 1000 || artifact.bootstrap.bootstrap_seed !== 16 || artifact.bootstrap.g_med_fixed !== true) fail('artifact bootstrap');
  const allKeys = artifact.systems.map(s => s.key);
  const newKeys = allKeys.filter(k => !V1622_CARRIED_KEYS.includes(k) && !V1622_CARRIED_PRELIMINARY_KEYS.includes(k)).sort();
  if (!sameSet(newKeys, V1622_NEW_KEYS)) fail(`exactly the added rows: ${newKeys}`);
  if (!sameSet(allKeys, [...V1622_CARRIED_KEYS, ...V1622_NEW_KEYS, ...V1622_CARRIED_PRELIMINARY_KEYS])) fail('exact cohort');
  if (artifact.systems.length !== previous.artifact.systems.length + V1622_NEW_KEYS.length) fail('exactly the added rows');
  if (artifact.not_measured.length) fail('regular cohort has no not-measured rows');
  if (artifact.roster_count !== artifact.systems.length) fail('roster count');
  const by = new Map(artifact.systems.map(s => [s.key, s]));
  const prior = new Map(previous.artifact.systems.map(s => [s.key, s]));
  if (artifact.n_ranked !== artifact.systems.filter(s => s.ranked).length || artifact.n_ranked !== previous.artifact.n_ranked + V1622_RANKED_NEW_KEYS.length) fail('ranked row count');
  const regularKeys = [...V1622_CARRIED_KEYS, ...V1622_NEW_KEYS];
  const unrankedKeys = [...V1622_UNRANKED_CARRIED_KEYS, ...V1622_UNRANKED_NEW_KEYS];
  if (!sameSet(V1622_UNRANKED_CARRIED_KEYS, V1622_CARRIED_KEYS.filter(k => !prior.get(k)?.ranked))) fail('carried unranked set');

  // --- every full-draw row ----------------------------------------------------------------------
  for (const s of artifact.systems) {
    if (V1622_CARRIED_PRELIMINARY_KEYS.includes(s.key)) continue;   // validated by the predecessor chain
    const spec = V1622_ROW_SPEC[s.key];
    const isNew = Boolean(spec);
    const expectedLane = isNew ? spec.lane : prior.get(s.key).v16.lane;
    if (s.v16?.lane !== expectedLane) fail(`lane ${s.key}`);
    if (s.status?.rows !== 1500 || s.status.status !== 'complete') fail(`complete 1500 rows ${s.key}`);
    if (s.full_coverage !== true) fail(`full coverage ${s.key}`);
    const unpriced = s.cost?.kind === 'unpriced';
    if (unpriced && !(isNew ? !spec.ranked : prior.get(s.key).cost.kind === 'unpriced')) fail(`only a row with a stated unpriced ruling may be unpriced: ${s.key}`);
    for (const axis of ['intelligence', 'calibration', 'speed', ...(unpriced ? [] : ['cost'])]) {
      if (!finite(s.axes?.[axis])) fail(`axis ${axis} ${s.key}`);
    }
    if (unpriced && s.ranked) fail(`an unpriced row has no composite and cannot be ranked: ${s.key}`);
    if (unpriced && isNew && (s.axes.cost !== null || s.cost.usd_per_1000 !== null || ['A', 'B', 'C'].some(o => s.scores?.[o] !== null))) fail(`an unpriced row has no cost axis and no composite: ${s.key}`);
    if (!finite(s.capability) || Math.abs(s.capability - (s.axes.intelligence + s.axes.calibration) / 2) > 1e-9) fail(`capability is the mean of intelligence and calibration: ${s.key}`);
    if (unrankedKeys.includes(s.key)) {
      if (s.ranked !== false || s.rank !== null || s.listing !== 'listed') fail(`listed-not-ranked row ${s.key}`);
      same(s.ranks, { A: null, B: null, C: null, capability: null }, `null ranks ${s.key}`);
      if (typeof s.not_ranked_because !== 'string' || s.not_ranked_because.length < 60) fail(`stated reason for not ranking ${s.key}`);
      if (isNew && !s.not_ranked_because.includes(spec.reason)) fail(`the ruling behind the missing rank must be named: ${s.key}`);
    } else if (!s.ranked || s.listing !== 'ranked' || !Number.isInteger(s.rank)) {
      fail(`every other full-draw row is ranked: ${s.key}`);
    }
    if (typeof s.repo !== 'string' || !s.repo.startsWith('https://')) fail(`repo ${s.key}`);
    const apiPin = s.endpoint_kind === 'api';
    if (typeof s.model_pin !== 'string' || !(/@[a-f0-9]{40}$/.test(s.model_pin) || (apiPin && (/@[a-f0-9]{8,40}$/.test(s.model_pin) || /^hosted-api:/.test(s.model_pin))))) fail(`pinned revision ${s.key}`);
    if (!unpriced && (!finite(s.cost?.usd_per_1000) || s.cost.usd_per_1000 <= 0)) fail(`cost figure ${s.key}`);
    if (typeof s.cost?.basis !== 'string' || s.cost.basis.length < 80) fail(`documented cost basis ${s.key}`);
    if (!unpriced && s.cost.usd_per_1000 > V1622_COST_CAP && !V1622_ABOVE_COST_CAP_KEYS.includes(s.key)) fail(`cost above the published ceiling ${s.key}`);
    const d = s.noul_decisive;
    if (!d || d.supported !== true || !Number.isInteger(d.n) || d.n !== 375 || !finite(d.decisive_rate)
        || !(finite(d.acc_among_decisive) || (d.acc_among_decisive === null && d.decisive === 0 && d.decisive_rate === 0))) fail(`noul decisiveness ${s.key}`);
  }

  // --- the new rows ---------------------------------------------------------------------------
  if (!sameSet(Object.keys(proof.new_rows ?? {}), V1622_NEW_KEYS)) fail('new-row provenance coverage');
  for (const [key, spec] of Object.entries(V1622_ROW_SPEC)) {
    const s = by.get(key), n = proof.new_rows[key];
    for (const field of ['display', 'author', 'repo', 'licence', 'model_pin']) same(s[field], spec[field], `${key} registry ${field} verbatim`);
    if (textSha(s.cost?.basis) !== spec.texts.cost_basis) fail(`${key} registry cost_basis verbatim`);
    if (textSha(s.endpoint_condition) !== spec.texts.endpoint_condition) fail(`${key} registry endpoint_condition verbatim`);
    if (!spec.ranked && textSha(s.not_ranked_because) !== spec.texts.not_ranked_because) fail(`${key} registry ranking reason verbatim`);
    if (s.measured_in !== 'v1.6.22' || s.measurement_date_status !== 'measured' || s.last_measured_on !== spec.measured_on) fail(`${key} measurement stamp`);
    if (s.endpoint_kind !== spec.kind || s.api_flag !== (spec.kind === 'api') || s.v16.set !== 'S+P') fail(`${key} lane/endpoint kind`);
    if (spec.kind === 'api' ? (s.v16.full_set_api !== true || s.v16.equated !== null || s.speed?.adjustment !== 'none (API)')
                            : s.speed?.adjustment !== 'x2 + 0.15 s (assumption, not measured)') fail(`${key} latency adjustment`);
    if (s.status.answered_ok !== spec.ok) fail(`${key} completeness`);
    if (spec.ranked) {
      const usd = cost(spec.input_tokens, spec.output_tokens, spec.price.input, spec.price.output);
      if (s.ranked !== true || s.listing !== 'ranked' || s.not_ranked_because || s.ranked_false_reason) fail(`${key} is ranked`);
      if (s.cost?.kind !== 'estimate' || s.cost.usd_per_1000 !== usd || !(usd <= V1622_COST_CAP)) fail(`${key} cost: frozen reference x own tokens, under the cap`);
      if (!finite(s.axes.cost) || ['A', 'B', 'C'].some(o => !finite(s.scores?.[o]))) fail(`${key} cost axis and composites`);
      for (const ci of [s.composite_ci95, s.v16?.ci95?.composite]) if (!intervalOk(ci, s.scores)) fail(`new row interval does not contain its own point estimate: ${key}`);
    } else {
      if (s.cost?.kind !== 'unpriced' || s.cost.usd_per_1000 !== null) fail(`${key} is unpriced`);
      if (Object.values(s.views ?? {}).some(v => v !== null) || !Object.keys(s.views ?? {}).length) fail(`${key}: a listed-not-ranked row publishes null presets`);
    }
    const capCi = s.v16?.ci95?.capability;
    if (!Array.isArray(capCi) || !(capCi[0] <= s.capability + 1e-9 && s.capability <= capCi[1] + 1e-9)) fail(`new row capability interval does not contain its own point estimate: ${key}`);
    const rowNote = artifact.measurement_notes.find(x => x.startsWith(`${key}: `)) ?? '';
    if (rowNote.length < 600) fail(`row note of ${key} is too thin to be the disclosure it claims to be`);
    for (const fragment of spec.disclosures) if (!rowNote.includes(fragment)) fail(`required disclosure "${fragment}" missing from the note of ${key}`);
    // provenance receipt
    if (!n || n.raw_sha256 !== proof.raw_sha256?.[key] || n.raw_sha256 !== spec.copy || n.ar_scoring_copy_sha256 !== spec.copy || n.original_raw_sha256 !== spec.raw
        || n.rows !== 1500 || n.answered_ok !== spec.ok || n.ranked !== spec.ranked || n.paid_fast_lane !== false || n.endpoint_kind !== spec.kind
        || n.treatment !== (spec.ranked ? 'ranked' : 'listed_unpriced') || n.pricing_module_sha256 !== V1622_PRICING_MODULE_SHA256
        || !String(n.custody).includes(spec.custody) || n.measured_on !== spec.measured_on || !hex(n.pre_score_review_sha256)) fail(`${key} new-row provenance`);
    if (n.input_tokens !== spec.input_tokens || n.output_tokens !== spec.output_tokens) fail(`${key} usage`);
    same(n.status_counts, spec.status_counts, `${key} HTTP status counts`);
    if (spec.ranked) {
      same(n.price_per_million, spec.price, `${key} tariff`);
      const recomputed = cost(n.input_tokens, n.output_tokens, n.price_per_million.input, n.price_per_million.output);
      if (n.usd_per_1000 !== recomputed || n.usd_per_1000 !== s.cost.usd_per_1000 || n.under_cost_cap !== true
          || Math.abs(n.cost_cap_ratio - n.usd_per_1000 / V1622_COST_CAP) > 1e-12) fail(`${key} cost binding`);
    } else if (n.price_per_million !== null || n.usd_per_1000 !== null || n.cost_cap_ratio !== null) fail(`${key}: an unpriced row carries no price`);
    if (s.speed.p50_s_raw !== n.p50_s_raw || s.speed.p95_s_raw !== n.p95_s_raw) fail(`${key} receipt latency`);
  }

  if (artifact.sample?.open !== 300 || artifact.sample.sealed !== 1200 || artifact.sample.total !== 1500) fail('scoring denominator');
  if (artifact.v16?.counts?.S !== 1200 || artifact.v16.counts.P !== 300 || artifact.v16.counts.selfhosted_input !== 1500) fail('fresh input counts');
  const ranked = artifact.systems.filter(x => x.ranked).map(x => x.key).sort();
  for (const o of ['A', 'B', 'C', 'capability']) if (!sameSet(artifact.board?.[o]?.order ?? [], ranked)) fail(`board membership ${o}`);
  const capabilityOrder = artifact.systems.filter(x => x.ranked).slice().sort((x, y) => y.capability - x.capability).map(x => x.key);
  for (const x of artifact.systems) {
    if (!x.ranked) continue;
    for (const o of ['A', 'B', 'C']) if (x.ranks?.[o] !== (artifact.board?.[o]?.order ?? []).indexOf(x.key) + 1) fail(`rank ${o} is not the board position: ${x.key}`);
    if (x.ranks?.capability !== capabilityOrder.indexOf(x.key) + 1) fail(`capability rank is not the capability order: ${x.key}`);
    if (x.rank !== x.ranks.A) fail(`rank is not the headline rank: ${x.key}`);
  }
  for (const key of unrankedKeys) if (ranked.includes(key)) fail('a row without an official placement may not enter a ranked board');

  // --- the A2 alias is carried through unchanged ---------------------------------------------
  for (const key of V1622_CARRIED_PRELIMINARY_KEYS) {
    const a = prior.get(key), b = by.get(key);
    if (!a || !b) fail(`carried preliminary row present ${key}`);
    same(b, a, `carried preliminary row unchanged ${key}`);
    if (b.listing !== JEV_PRELIMINARY_LISTING || b.ranked !== false || b.rank !== null) fail(`carried row stays unranked ${key}`);
    if (categories.systems?.[key]) fail(`the carried A2 measurement has no category cells: ${key}`);
  }

  // --- the carried rows keep every point estimate ----------------------------------------------
  // What may differ on a carried row, and nothing else: its placement (rank, ranks), its bootstrap intervals
  // (composite_ci95, v16.ci95 - new keys shift roster positions and with them the per-row bootstrap seeds) and, only
  // when the API-basis diagnostic moved, v16.raw_on_A. Every move must be named in the release note.
  const diagnosticMoved = artifact.G_med_api_basis_P_vs_A !== previous.artifact.G_med_api_basis_P_vs_A;
  const strip = (row, allowRawOnA) => {
    const copy = JSON.parse(JSON.stringify(row));
    delete copy.composite_ci95; delete copy.rank; delete copy.ranks;
    if (copy.v16) { delete copy.v16.ci95; if (allowRawOnA) delete copy.v16.raw_on_A; }
    return copy;
  };
  const releaseNote = artifact.measurement_notes.find(x => x.startsWith('v1.6.22 ADDS ')) ?? '';
  const clauseStart = releaseNote.indexOf('Carried rows whose intervals moved:');
  if (clauseStart < 0) fail('the release note must carry the "Carried rows whose intervals moved:" clause');
  const intervalNames = releaseNote.slice(clauseStart + 'Carried rows whose intervals moved:'.length).split('DIAGNOSTICS')[0]
    .split(/[,\s]+/).map(x => x.replace(/\.$/, ''));
  const rankClause = releaseNote.split('RANKS:')[1]?.split('CONFIDENCE INTERVALS:')[0] ?? '';
  for (const key of V1622_CARRIED_KEYS) {
    const a = prior.get(key), b = by.get(key);
    if (!a || !b) fail(`carried row present ${key}`);
    const rawOnAMoved = JSON.stringify(a.v16?.raw_on_A) !== JSON.stringify(b.v16?.raw_on_A);
    if (rawOnAMoved && !diagnosticMoved) fail(`raw_on_A moved while the API-basis diagnostic did not: ${key}`);
    if (rawOnAMoved && !releaseNote.includes(`${key}: intelligence`)) fail(`a moved raw_on_A must name its row in the notes: ${key}`);
    same(strip(b, rawOnAMoved), strip(a, rawOnAMoved), `carried row differs outside rank/ranks/composite_ci95/v16.ci95${rawOnAMoved ? '/v16.raw_on_A' : ''}: ${key}`);
    if (V1622_UNRANKED_CARRIED_KEYS.includes(key)) {
      same([b.rank, b.ranks, b.not_ranked_because, b.listing, b.ranked], [a.rank, a.ranks, a.not_ranked_because, a.listing, a.ranked], `the listed-not-ranked row keeps its placement and wording: ${key}`);
    }
    const intervalMoved = !isDeepStrictEqual([b.composite_ci95, b.v16?.ci95], [a.composite_ci95, a.v16?.ci95]);
    if (intervalMoved && !intervalNames.includes(key)) fail(`a moved carried interval must name its row in the release note: ${key}`);
    for (const ci of (b.cost.kind === 'unpriced' ? [] : [b.composite_ci95, b.v16?.ci95?.composite])) {
      if (!intervalOk(ci, b.scores)) fail(`carried row interval does not contain its own point estimate: ${key}`);
    }
    if (a.ranked) {
      for (const o of ['A', 'B', 'C', 'capability']) {
        const above = V1622_RANKED_NEW_KEYS.filter(nk => (o === 'capability' ? by.get(nk).capability > b.capability
          : artifact.board[o].order.indexOf(nk) < artifact.board[o].order.indexOf(key))).length;
        if (b.ranks[o] !== a.ranks[o] + above) fail(`carried rank ${o} moved by more than the rows that joined above it: ${key}`);
        if (b.ranks[o] !== a.ranks[o] && !rankClause.includes(`${key} `)) fail(`a moved carried rank must name its row in the release note: ${key}`);
      }
    }
  }
  same(artifact.measurement_notes?.slice(0, previous.artifact.measurement_notes.length), previous.artifact.measurement_notes, 'inherited measurement notes unchanged');
  if (!releaseNote.includes('RANKS') || !releaseNote.includes('CONFIDENCE INTERVALS') || !releaseNote.includes('DIAGNOSTICS')
      || !V1622_NEW_KEYS.every(k => releaseNote.includes(k))) fail('the release note must count rank, interval and diagnostic moves');
  if (!releaseNote.includes(CORRECTION)) fail('the promised v1.6.20 card-time correction must be in the release note');
  if (!artifact.measurement_notes.some(x => x.includes('#18761') && x.includes('LISTED BUT NOT RANKED'))) fail('the non-official Speed disclosure is mandatory');
  if (diagnosticMoved) {
    const values = [previous.artifact.G_med_api_basis_P_vs_A, artifact.G_med_api_basis_P_vs_A].map(String);
    if (!artifact.measurement_notes.some(x => x.includes('API-basis median diagnostic') && values.every(v => x.includes(v)))) fail('a moved API-basis diagnostic must be disclosed with both values');
  }
  const added = artifact.measurement_notes.slice(previous.artifact.measurement_notes.length);
  const boardNotes = added.filter(x => x.startsWith('Board effect'));
  const boardNote = boardNotes.length === 1 ? boardNotes[0] : '';
  const provisional = boardNote.includes('PROVISIONAL-TOPFIVE');
  if (provisional ? process.env.JEVBENCH_V1622_BUILD_PASS1 !== '1'
      : !(boardNote.includes('top-five') && V1622_RANKED_NEW_KEYS.every(k => boardNote.includes(k)))) fail('board effect: generated top-five note required; provisional build note forbidden');
  if (artifact.G_med !== V1622_FIXED_G_MED || previous.artifact.G_med !== V1622_FIXED_G_MED) fail('frozen v1.6.10 G_med');

  // --- the draw and the proof -----------------------------------------------------------------
  if (artifact.v16.draw_release !== V1622_DRAW_RELEASE) fail('draw identity');
  if (!hex(artifact.v16.freeze_manifest_sha256) || !hex(artifact.v16.seed_commitment) || !hex(artifact.v16.baseline_sha256)) fail('draw provenance hashes');
  for (const set of ['S', 'A', 'P', 'core']) if (!hex(artifact.v16.draw_digests?.[set])) fail(`draw digest ${set}`);
  if (proof?.schema_version !== 1 || proof.revision !== 'v1.6.22' || proof.method !== 'jevbench::v1.6'
      || proof.noul_method?.applied !== 'O1S' || proof.bootstrap?.B !== 1000 || proof.bootstrap.seed !== 16) fail('method proof');
  if (proof.draw_release !== artifact.v16.draw_release || proof.freeze_manifest_sha256 !== artifact.v16.freeze_manifest_sha256
      || proof.seed_commitment !== artifact.v16.seed_commitment || proof.baseline_sha256 !== artifact.v16.baseline_sha256
      || !hex(proof.cost_basis_sha256) || !hex(proof.registry_sha256)) fail('draw/cohort binding');
  same(artifact.v16.draw_digests, proof.draw_digests, 'draw digests bound to the proof');
  if (proof.pricing_module_sha256 !== V1622_PRICING_MODULE_SHA256 || proof.predecessor_pricing_module_sha256 !== V1622_PRICING_MODULE_SHA256
      || previous.proof.pricing_module_sha256 !== V1622_PRICING_MODULE_SHA256) fail('frozen pricing module hash');
  if (proof.abandoned_draw_note !== null) fail('abandoned-draw disclosure');
  for (const k of ['repriced_rows', 'refreshed_preview_go_card', 'refreshed_preview_approval', 'a2_supplement', 'scorer_sources_sha256']) same(proof[k], previous.proof[k], `inherited proof field ${k}`);
  if (typeof proof.authority !== 'string' || !proof.authority.startsWith(previous.proof.authority + ' NEW in v1.6.22:')) fail('inherited authority unchanged');
  const newAuthority = proof.authority.slice(previous.proof.authority.length);
  for (const fragment of [...V1622_NEW_KEYS, '#19335', '#19341', '#19428', '#19732', '#19740', '#19427', 'RANKED', 'NOT ranked', '`machinefi` before dispatch',
    'pre-score review', 'no paid order', V1622_GO_QUOTE, '2026-10-16 12:50 UTC', CORRECTION]) {
    if (!newAuthority.includes(fragment)) fail(`new publication authority: ${fragment}`);
  }
  const marker = approvalOf(proof, artifact, boardNote, provisional);
  if (!newAuthority.includes(marker)) fail('publication approval authority binding');
  if (!sameSet(Object.keys(proof.raw_sha256 ?? {}), regularKeys)) fail('raw-output coverage');
  same(Object.fromEntries(V1622_CARRIED_KEYS.map(k => [k, proof.raw_sha256[k]])), previous.proof.raw_sha256, 'inherited raw-output hashes unchanged');
  const proofRows = proof.systems;
  if (!Array.isArray(proofRows) || !sameSet(proofRows.map(x => x.key), regularKeys)) fail('system proof coverage');
  for (const x of artifact.systems) {
    if (V1622_CARRIED_PRELIMINARY_KEYS.includes(x.key)) continue;
    const p = proofRows.find(r => r.key === x.key);
    if (!p || p.rows !== 1500 || p.status !== 'complete' || !hex(p.raw_sha256) || p.raw_sha256 !== proof.raw_sha256[x.key]) fail(`system proof ${x.key}`);
    if (p.model_pin !== x.model_pin || p.rank !== x.rank || p.display !== x.display) fail(`proof agrees with the row ${x.key}`);
    same(p.composite_A ?? null, x.scores?.A ?? null, `proof agrees with the row ${x.key}`);
    same(p.axes, x.axes, `proof row axes ${x.key}`);
    same(p.capability, x.capability, `proof row Capability ${x.key}`);
    same(p.usd_per_1000, x.cost?.usd_per_1000 ?? null, `proof row cost ${x.key}`);
    same(p.noul_decisive, x.noul_decisive, `proof row decisive ${x.key}`);
    if (typeof p.measured_by !== 'string' || !p.measured_by.trim()) fail(`measuring operator ${x.key}`);
    if (p.source_review_sha256 !== null && !hex(p.source_review_sha256)) fail(`source review hash ${x.key}`);
    if (V1622_ROW_SPEC[x.key] && p.source_review_sha256 !== proof.new_rows[x.key].pre_score_review_sha256) fail(`independent pre-score review binding ${x.key}`);
    if (typeof p.source_review_note !== 'string' || p.source_review_note.length < 20) fail(`source review note ${x.key}`);
  }
  // --- the frozen median, recomputable from its four v1.6.10 members --------------------------
  const members = proof.field_median?.members;
  if (proof.field_median?.g_med_fixed !== true || proof.g_med_fixed_from?.revision !== 'v1.6.10'
      || proof.g_med_fixed_from.G_med !== V1622_FIXED_G_MED || proof.g_med_fixed_from.baseline_sha256 !== proof.baseline_sha256) fail('frozen field median provenance');
  if (!Array.isArray(members) || !sameSet(members.map(m => m.key), V1610_KEYS)
      || !members.every(m => finite(m.gap) && by.get(m.key)?.intelligence?.gap === m.gap)) fail('field median cohort');
  const gaps = members.map(m => m.gap).sort((a, b) => a - b);
  const median = gaps.length % 2 ? gaps[(gaps.length - 1) / 2] : (gaps[gaps.length / 2 - 1] + gaps[gaps.length / 2]) / 2;
  if (Math.abs(artifact.G_med - median) > 1e-9 || proof.field_median.G_med !== artifact.G_med) fail('cohort G_med');
  if (artifact.G_med_flag_gt10 !== (artifact.G_med > 10)) fail('G_med flag consistency');
  if (Math.abs(proof.gap_penalty_threshold - (artifact.G_med + 8)) > 1e-6) fail('gap penalty threshold');

  // --- categories ------------------------------------------------------------------------------
  if (categories?.revision !== 'v1.6.22' || categories.provisional !== false
      || categories.source_results_sha256 !== artifact.source_sha256
      || categories.draw_release !== artifact.v16.draw_release
      || categories.results_sha256 !== manifest.files.results.sha256) fail('category source binding');
  const dims = v1622Dims(categories);
  if (!('topics' in categories) && !artifact.measurement_notes.some(x => x.includes('topic'))) fail('a release without the topic radar must say so in its measurement notes');
  for (const field of ['live_category_cells', 'supplement', 'language_cells', 'unavailable']) if (field in categories) fail(`historical category overlay ${field}`);
  for (const field of ['lane_note', 'metric', 'labelling']) if (typeof categories[field] !== 'string' || !categories[field].trim()) fail(`category field ${field}`);
  if (!Array.isArray(categories.rules) || !categories.rules.length) fail('category rules');
  if (!categories.lanes || !sameSet(Object.keys(categories.lanes), regularKeys)) fail('category lanes');
  for (const key of regularKeys) if (categories.lanes[key] !== (V1622_ROW_SPEC[key]?.lane ?? previous.categories.lanes[key])) fail(`category lane ${key}`);
  validateCategoryArtifact(categories, dims);
  if (!sameSet(Object.keys(categories.systems), regularKeys)) fail('category cohort');
  for (const key of regularKeys) for (const dim of dims) {
    for (const c of categories[dim]) {
      const cell = categories.systems[key]?.[dim]?.[c.key];
      if (c.n >= categories.min_n && !cell) fail(`missing category ${key}.${dim}.${c.key}`);
      if (c.n < categories.min_n && cell) fail(`below-min_n category must be omitted: ${key}.${dim}.${c.key}`);
      if (cell && (!Number.isInteger(cell.n) || cell.n < categories.min_n || !finite(cell.competence))) fail(`category cell ${key}.${dim}.${c.key}`);
    }
  }
  for (const key of V1622_CARRIED_KEYS) same(categories.systems[key], previous.categories.systems[key], `inherited category cells ${key}`);
  return { artifact, categories, proof, manifest };
}

async function load(path, root) {
  const bytes = await readFile(`${root}/${path}`);
  const text = bytes.toString('utf8'); excluded(text);
  return { value: JSON.parse(text), bytes, sha256: createHash('sha256').update(bytes).digest('hex') };
}

/** Missing publication manifest means the version is unavailable; invalid published evidence fails closed. */
export async function readOptionalJevbenchV1622Release(root = process.cwd()) {
  let publication;
  try { publication = await load(V1622_MANIFEST, root); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  const previous = await readOptionalJevbenchV1621Release(root);
  if (!previous) fail('v1.6.22 needs the published v1.6.21 release it extends');
  const previousManifest = await load(`${V1622_ROOT}/jevbench-v1.6.21-publication.json`, root);
  const bundle = Object.fromEntries(await Promise.all(Object.entries(files).map(async ([k, path]) => [k, await load(path, root)])));
  for (const [key, value] of Object.entries(bundle)) if (publication.value.files?.[key]?.sha256 !== value.sha256) fail(`bytes hash ${key}`);
  if (bundle.history.sha256 !== previous.historical.sha256) fail('immutable history bytes');
  if (bundle['history-carry'].sha256 !== previous.historical.carrySha256) fail('immutable carry bytes');
  validateJevbenchV1622Bundle({ manifest: publication.value, artifact: bundle.results.value, categories: bundle.categories.value,
    proof: bundle.proof.value, previous, previousManifestSha256: previousManifest.sha256 });
  return { artifact: bundle.results.value, bytes: bundle.results.bytes, sha256: bundle.results.sha256,
           categories: bundle.categories.value, categoriesSha256: bundle.categories.sha256,
           proof: bundle.proof.value, proofSha256: bundle.proof.sha256, manifest: publication.value,
           historical: previous.historical };
}

/** Optional navigation must never make an older board depend on fresh publication health. */
export async function hasPublishedJevbenchV1622Release(root = process.cwd(), log = console.error) {
  try { return Boolean(await readOptionalJevbenchV1622Release(root)); }
  catch { log('JevBench v1.6.22 navigation omitted: publication validation failed'); return false; }
}

/** Board input: this release's own rows, with no historical overlay mixed in. */
export function v1622BoardInput(release) {
  return { artifact: release.artifact, categories: release.categories };
}
