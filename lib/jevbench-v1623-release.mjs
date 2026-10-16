// v1.6.23: PRICE-ONLY addendum on the same frozen draw. Three rows that v1.6.22 listed, measured and not ranked get
// their vendors' public list prices and become ranked: sage-1.4.0 (Levanto, USD 0.05/M in, USD 10/M out), nimble-v4
// (Bespoke, USD 0.04/M in, output free) and nimble-v4-max (USD 0.09/M in, output free; over the official cost cap,
// disclosed). No model call, no new raw: every scoring copy is the v1.6.22 one. The prices count only through the scoped
// pricing re-freeze 533d80f0 (dcfcecb0 + these three keys). Repriced rows keep every measured value (the v1.6.20 SubQ
// rules); carried rows keep every point estimate AND interval (no key joins, so no bootstrap seed moves). The approval
// must say how it arrived (v1.6.20/v1.6.22 rules); a PLACEHOLDER build does not load.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { validateJevbenchV16Release, mentionsPrivateSystem, JEVBENCH_V16_EXCLUDED_KEYS } from './jevbench-v16-release.mjs';
import { validateCategoryArtifact } from './jevbench-categories.mjs';
import { V1610_KEYS } from './jevbench-v1610-release.mjs';
import { readOptionalJevbenchV1622Release, V1622_ROOT, V1622_CARRIED_KEYS, V1622_NEW_KEYS, V1622_UNRANKED_CARRIED_KEYS,
         V1622_UNRANKED_NEW_KEYS, V1622_CARRIED_PRELIMINARY_KEYS, V1622_ABOVE_COST_CAP_KEYS, V1622_PRICING_MODULE_SHA256 } from './jevbench-v1622-release.mjs';
import { JEV_PRELIMINARY_LISTING } from './jevbench-scope.mjs';

export const V1623_ROOT = V1622_ROOT;
export const V1623_MANIFEST = `${V1623_ROOT}/jevbench-v1.6.23-publication.json`;
export const V1623_FILE_KEYS = ['results', 'categories', 'proof', 'history', 'history-carry'];
const files = Object.fromEntries(V1623_FILE_KEYS.map(k => [k, `${V1623_ROOT}/jevbench-v1.6.23-${k}.json`]));
/** The three rows this release prices (no new measurement). */
export const V1623_REPRICED_KEYS = ['nimble-v4', 'nimble-v4-max', 'sage-1.4.0'];
/** Every full-draw row of v1.6.22; no key joins or leaves. */
export const V1623_FULL_KEYS = [...V1622_CARRIED_KEYS, ...V1622_NEW_KEYS];
export const V1623_CARRIED_KEYS = V1623_FULL_KEYS.filter(k => !V1623_REPRICED_KEYS.includes(k));
export const V1623_CARRIED_PRELIMINARY_KEYS = [...V1622_CARRIED_PRELIMINARY_KEYS];
/** Still listed but not ranked: reflex (#18761) and the two unpriced v1.6.22 rows. */
export const V1623_UNRANKED_CARRIED_KEYS = [...V1622_UNRANKED_CARRIED_KEYS, ...V1622_UNRANKED_NEW_KEYS].filter(k => !V1623_REPRICED_KEYS.includes(k));
export const V1623_ABOVE_COST_CAP_KEYS = [...V1622_ABOVE_COST_CAP_KEYS, 'nimble-v4-max'];
export const V1623_FIXED_G_MED = 9.839526770355711;
export const V1623_COST_CAP = 0.06459465517241379;
export const V1623_DRAW_RELEASE = 'v1.6-regular-20261012';
/** The pricing re-freeze of this release (dcfcecb0 + sage-1.4.0, nimble-v4, nimble-v4-max in LAUNCH_LIST_PRICE_API). */
export const V1623_PRICING_MODULE_SHA256 = '533d80f01a2d2e0d02515bec35e42208f5def86261a2857814730da244d960e5';
export const V1623_GO_QUOTE = 'I really want all of the models we have evaluated to be online (even if they land in #5) on both JevBench and ImageJevBench';
export const V1623_PRIORITY_QUOTE = "we'll queue it into the evaluation with high priority (and actually do it please)";
export const V1623_GO = { channel: 'direct-message', where: 'laptop chat', date: '2026-10-16', recorded_at: '2026-10-16T12:50Z',
  recorded_in: 'DECISIONS.md 2026-10-16 12:50 UTC', quote: V1623_GO_QUOTE };
export const V1623_GO_PRIORITY = { channel: 'direct-message', where: 'laptop chat, relayed by the chief of staff', date: '2026-10-16',
  recorded_at: '2026-10-16T15:56Z', recorded_in: 'agent board #20217 (CoS decision)', quote: V1623_PRIORITY_QUOTE };
/** The last top-five preview card before this release; a v1.6.23 card must be newer. */
const LAST_CARD = 17683n;
const NO_CARD_MARKER = `Florian publication approval: direct-message ${V1623_GO.recorded_at} (${V1623_GO.recorded_in}) and ${V1623_GO_PRIORITY.recorded_at} (${V1623_GO_PRIORITY.recorded_in}); no top-five preview card (no top-five list changes); no button tap.`;
const NO_CARD_TEXT = 'No top-five list changes (see the board-effect note), so no top-five preview card was sent and none is claimed; the GO arrived as a direct message and no Telegram button was pressed.';
const NO_CHANGE_BOARD = '0 of 21 top-five lists change';
const cost = (tin, tout, pin, pout) => 1000 * (tin * pin + tout * pout) / 1e6 / 1500;   // score_v16.common_basis_usd

/** Each repriced row's tariff, measured tokens, evidence and the SHA-256 of its public cost basis. */
export const V1623_REPRICE_SPEC = Object.freeze({
  'sage-1.4.0': { price: { input: 0.05, output: 10.0 }, input_tokens: 665989, output_tokens: 0, ok: 1483, over_cap: false,
    evidence: '1e98749c9601710ceae68bca591707535b4dde0987da82309055f73352860eb0', page: 'levanto.ai/pricing', authority: 'board #18983',
    cost_basis: 'cf63273144103fcd52202a592dbae8a44d1975ea262e7c4cf7c0323a8e0d01c5',
    disclosures: ['USD 0.05/M input, USD 10/M output', '0 output', 'above the official latency cap', '15 HTTP 400 and 2 HTTP 504', 'sage-1.3.0', '1e98749c9601710ceae68bca591707535b4dde0987da82309055f73352860eb0'] },
  'nimble-v4': { price: { input: 0.04, output: 0.0 }, input_tokens: 1935351, output_tokens: 3000, ok: 1500, over_cap: false,
    evidence: '03b0626140b8fb0a80f48754742bd4d553d5632ff78ce5790770a12e2bd58562', page: 'docs.bespokelabs.ai/nimble/pricing', authority: 'CoS deputy #19084',
    cost_basis: 'acf608c690567d201f82355b204073db8ecd776825f821155f7a14646783ee92',
    disclosures: ['USD 0.04/M input, USD 0/M output', 'output tokens are free', 'inside the official cost cap', '03b0626140b8fb0a80f48754742bd4d553d5632ff78ce5790770a12e2bd58562'] },
  'nimble-v4-max': { price: { input: 0.09, output: 0.0 }, input_tokens: 1935351, output_tokens: 3000, ok: 1500, over_cap: true,
    evidence: '03b0626140b8fb0a80f48754742bd4d553d5632ff78ce5790770a12e2bd58562', page: 'docs.bespokelabs.ai/nimble/pricing', authority: 'CoS deputy #19084',
    cost_basis: 'a385ed998faeb461f5dc6bc9a7e81b984e8144f5ed16193c0a1d7daff1845609',
    disclosures: ['USD 0.09/M input, USD 0/M output', 'output tokens are free', 'OVER THE OFFICIAL COST CAP', 'OVER the official cap', '03b0626140b8fb0a80f48754742bd4d553d5632ff78ce5790770a12e2bd58562'] },
});
export const V1623_BASE_DIMS = ['families', 'usecases', 'languages'];
export function v1623Dims(categories) {
  return 'topics' in categories ? ['topics', ...V1623_BASE_DIMS] : [...V1623_BASE_DIMS];
}

const hex = v => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const finite = v => typeof v === 'number' && Number.isFinite(v);
const textSha = v => typeof v === 'string' ? createHash('sha256').update(v, 'utf8').digest('hex') : null;
const fail = message => { throw new Error(`JevBench v1.6.23: ${message}`); };
const sameSet = (a, b) => a.length === b.length && JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
const same = (a, b, message) => { if (!isDeepStrictEqual(a, b)) fail(message); };
const clone = v => JSON.parse(JSON.stringify(v));
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
/** A repriced row's measurement: everything except the cost and what follows from it (the v1.6.20 SubQ rule). */
function frozenMeasurement(row) {
  const copy = clone(row);
  for (const key of ['cost', 'scores', 'composite_ci95', 'jevbench_score', 'listing', 'rank', 'ranked', 'ranks',
    'views', 'repriced_in', 'not_ranked_because', 'ranked_false_reason']) delete copy[key];
  if (copy.axes) delete copy.axes.cost;
  if (copy.v16?.ci95) delete copy.v16.ci95.composite;
  return copy;
}

/** How the publication approval arrived. Returns the marker the authority must carry. */
function approvalOf(proof, artifact, boardNote, provisional) {
  const pa = proof.publication_approval;
  same(pa?.go, V1623_GO, 'publication GO provenance');
  same(pa?.go_priority, V1623_GO_PRIORITY, 'priority GO provenance');
  // A build made before a preview card was answered carries PLACEHOLDER fields; they are rejected wherever they appear.
  if (JSON.stringify(proof).includes('PLACEHOLDER') || JSON.stringify(artifact).includes('PLACEHOLDER')) fail('approval placeholder not filled');
  const notes = artifact.measurement_notes.filter(n => n.startsWith('Publication of v1.6.23:'));
  if (notes.length !== 1) fail('public note must describe how the approval arrived');
  const note = notes[0];
  if (!note.includes(V1623_GO_QUOTE) || !note.includes(V1623_GO.recorded_in) || !note.includes(V1623_PRIORITY_QUOTE)
      || !note.includes(V1623_GO_PRIORITY.recorded_in)) fail('public note must describe how the approval arrived');
  const noChange = boardNote.includes(NO_CHANGE_BOARD);
  if (pa.top_five_effect === 'none') {
    if (!provisional && !noChange) fail('a no-card approval needs the generated no-change board note');
    if (pa.top_five_preview !== null || pa.button_tap !== false || Object.keys(pa).sort().join() !== 'button_tap,go,go_priority,top_five_effect,top_five_preview') fail('no-card approval provenance');
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

export function validateJevbenchV1623Bundle({ manifest, artifact, categories, proof, previous, previousManifestSha256 }) {
  for (const value of [manifest, artifact, categories, proof]) {
    publicOnly(value);
    excluded(JSON.stringify(value));
  }
  // --- publication identity ------------------------------------------------------------------
  if (manifest?.schema_version !== 1 || manifest.revision !== 'v1.6.23' || manifest.status !== 'published' || manifest.provisional !== false) fail('publication status');
  if (manifest.review?.verdict !== 'PASS' || !manifest.review.engine || manifest.review.engine === 'PENDING' || !hex(manifest.review.receipt_sha256)) fail('independent release review');
  if (!previous || previous.manifest?.revision !== 'v1.6.22' || previous.proof?.revision !== 'v1.6.22') fail('validated v1.6.22 predecessor required');
  same(manifest.predecessor, { revision: 'v1.6.22', publication_sha256: previousManifestSha256 }, 'predecessor binding');
  for (const k of ['historical_revision', 'historical_results_sha256', 'historical_carry_sha256']) same(manifest[k], previous.manifest[k], `historical binding ${k}`);
  for (const [key, path] of Object.entries(files)) if (manifest.files?.[key]?.path !== path || !hex(manifest.files[key].sha256)) fail(`file binding ${key}`);

  // --- artifact identity and the cohort ------------------------------------------------------
  if (artifact?.revision !== 'v1.6.23' || artifact.run_kind !== 'regular-queue-price-addendum' || artifact.status !== 'published'
      || artifact.provisional !== false || artifact.noul_method?.applied !== 'O1S') fail('price-addendum identity');
  validateJevbenchV16Release({ ...artifact, revision: 'v1.6.1', run_kind: 'scheduled-refresh' }, 'v1.6.1');
  if (artifact.bootstrap?.B !== 1000 || artifact.bootstrap.bootstrap_seed !== 16 || artifact.bootstrap.g_med_fixed !== true) fail('artifact bootstrap');
  const allKeys = artifact.systems.map(s => s.key);
  if (!sameSet(allKeys, [...V1623_FULL_KEYS, ...V1623_CARRIED_PRELIMINARY_KEYS])) fail('exact cohort: no row joins or leaves');
  if (artifact.systems.length !== previous.artifact.systems.length) fail('exact cohort: no row joins or leaves');
  if (artifact.not_measured.length) fail('regular cohort has no not-measured rows');
  if (artifact.roster_count !== artifact.systems.length) fail('roster count');
  const by = new Map(artifact.systems.map(s => [s.key, s]));
  const prior = new Map(previous.artifact.systems.map(s => [s.key, s]));
  if (artifact.n_ranked !== artifact.systems.filter(s => s.ranked).length || artifact.n_ranked !== previous.artifact.n_ranked + V1623_REPRICED_KEYS.length) fail('ranked row count');
  if (!sameSet(V1623_UNRANKED_CARRIED_KEYS, V1623_CARRIED_KEYS.filter(k => !prior.get(k)?.ranked))) fail('carried unranked set');
  for (const key of V1623_REPRICED_KEYS) if (prior.get(key)?.ranked !== false || prior.get(key)?.cost?.kind !== 'unpriced') fail(`a repriced row was unpriced in v1.6.22: ${key}`);

  // --- every full-draw row ----------------------------------------------------------------------
  for (const s of artifact.systems) {
    if (V1623_CARRIED_PRELIMINARY_KEYS.includes(s.key)) continue;   // validated by the predecessor chain
    if (s.v16?.lane !== prior.get(s.key).v16.lane) fail(`lane ${s.key}`);
    if (s.status?.rows !== 1500 || s.status.status !== 'complete') fail(`complete 1500 rows ${s.key}`);
    if (s.full_coverage !== true) fail(`full coverage ${s.key}`);
    const unpriced = s.cost?.kind === 'unpriced';
    if (unpriced && (V1623_REPRICED_KEYS.includes(s.key) || prior.get(s.key).cost.kind !== 'unpriced')) fail(`only a row with a stated unpriced ruling may be unpriced: ${s.key}`);
    for (const axis of ['intelligence', 'calibration', 'speed', ...(unpriced ? [] : ['cost'])]) {
      if (!finite(s.axes?.[axis])) fail(`axis ${axis} ${s.key}`);
    }
    if (unpriced && s.ranked) fail(`an unpriced row has no composite and cannot be ranked: ${s.key}`);
    if (!finite(s.capability) || Math.abs(s.capability - (s.axes.intelligence + s.axes.calibration) / 2) > 1e-9) fail(`capability is the mean of intelligence and calibration: ${s.key}`);
    if (V1623_UNRANKED_CARRIED_KEYS.includes(s.key)) {
      if (s.ranked !== false || s.rank !== null || s.listing !== 'listed') fail(`listed-not-ranked row ${s.key}`);
      same(s.ranks, { A: null, B: null, C: null, capability: null }, `null ranks ${s.key}`);
      if (typeof s.not_ranked_because !== 'string' || s.not_ranked_because.length < 60) fail(`stated reason for not ranking ${s.key}`);
    } else if (!s.ranked || s.listing !== 'ranked' || !Number.isInteger(s.rank)) {
      fail(`every other full-draw row is ranked: ${s.key}`);
    }
    if (typeof s.repo !== 'string' || !s.repo.startsWith('https://')) fail(`repo ${s.key}`);
    const apiPin = s.endpoint_kind === 'api';
    if (typeof s.model_pin !== 'string' || !(/@[a-f0-9]{40}$/.test(s.model_pin) || (apiPin && (/@[a-f0-9]{8,40}$/.test(s.model_pin) || /^hosted-api:/.test(s.model_pin))))) fail(`pinned revision ${s.key}`);
    if (!unpriced && (!finite(s.cost?.usd_per_1000) || s.cost.usd_per_1000 <= 0)) fail(`cost figure ${s.key}`);
    if (typeof s.cost?.basis !== 'string' || s.cost.basis.length < 80) fail(`documented cost basis ${s.key}`);
    if (!unpriced && s.cost.usd_per_1000 > V1623_COST_CAP && !V1623_ABOVE_COST_CAP_KEYS.includes(s.key)) fail(`cost above the published ceiling ${s.key}`);
    const d = s.noul_decisive;
    if (!d || d.supported !== true || !Number.isInteger(d.n) || d.n !== 375 || !finite(d.decisive_rate)
        || !(finite(d.acc_among_decisive) || (d.acc_among_decisive === null && d.decisive === 0 && d.decisive_rate === 0))) fail(`noul decisiveness ${s.key}`);
  }

  // --- the repriced rows ------------------------------------------------------------------------
  const releaseNote = artifact.measurement_notes.find(x => x.startsWith('v1.6.23 PRICES 3 ROWS')) ?? '';
  const repriced = proof.repriced_rows ?? {};
  if (!sameSet(Object.keys(repriced), [...Object.keys(previous.proof.repriced_rows ?? {}), ...V1623_REPRICED_KEYS])) fail('repriced-row provenance coverage');
  for (const k of Object.keys(previous.proof.repriced_rows ?? {})) same(repriced[k], previous.proof.repriced_rows[k], `inherited repriced row ${k}`);
  for (const [key, spec] of Object.entries(V1623_REPRICE_SPEC)) {
    const s = by.get(key), a = prior.get(key), n = repriced[key];
    const usd = cost(spec.input_tokens, spec.output_tokens, spec.price.input, spec.price.output);
    if (s.ranked !== true || s.listing !== 'ranked' || s.not_ranked_because || s.ranked_false_reason) fail(`${key} is ranked`);
    if (s.repriced_in !== 'v1.6.23' || s.measured_in !== a.measured_in || s.last_measured_on !== a.last_measured_on
        || s.measurement_date_status !== a.measurement_date_status) fail(`${key} measurement date / reprice marker`);
    same(frozenMeasurement(s), frozenMeasurement(a), `${key}: a measured value or identity field changed in a price-only release`);
    if (s.cost?.kind !== 'estimate' || s.cost.usd_per_1000 !== usd || (usd > V1623_COST_CAP) !== spec.over_cap) fail(`${key} cost: public tariff x own tokens`);
    if (s.status.answered_ok !== spec.ok) fail(`${key} completeness`);
    if (textSha(s.cost.basis) !== spec.cost_basis) fail(`${key} cost basis verbatim`);
    if (s.cost.basis.includes('OVER THE OFFICIAL COST CAP') !== spec.over_cap) fail(`${key} over-cap disclosure`);
    if (!s.cost.basis.includes(spec.evidence.slice(0, 8)) || !s.cost.basis.includes('I-1')) fail(`${key} cost basis names its evidence and interpretation`);
    if (!finite(s.axes.cost) || ['A', 'B', 'C'].some(o => !finite(s.scores?.[o]))) fail(`${key} cost axis and composites`);
    if (Object.values(s.views ?? {}).some(v => !finite(v))) fail(`${key}: a ranked row publishes its presets`);
    for (const ci of [s.composite_ci95, s.v16?.ci95?.composite]) if (!intervalOk(ci, s.scores)) fail(`repriced row interval does not contain its own point estimate: ${key}`);
    for (const text of [s.cost.basis]) if (/[\w.+-]+@[\w-]+\.[a-z]{2,}|\/home\/|\bworkers\/|\br1\d\d\/|\bv16\d\d\//i.test(text)) fail(`${key}: personal e-mail or internal path in public text`);
    const rowNote = artifact.measurement_notes.find(x => x.startsWith(`${key} PRICED in v1.6.23: `)) ?? '';
    if (rowNote.length < 400) fail(`price note of ${key} is too thin to be the disclosure it claims to be`);
    for (const fragment of spec.disclosures) if (!rowNote.includes(fragment)) fail(`required disclosure "${fragment}" missing from the price note of ${key}`);
    if (/[\w.+-]+@[\w-]+\.[a-z]{2,}|\/home\/|\bworkers\/|\br1\d\d\//i.test(rowNote)) fail(`${key}: personal e-mail or internal path in public text`);
    if (!releaseNote.includes(key)) fail(`the release note must name ${key}`);
    // provenance receipt
    if (!n || n.no_new_measurement !== true || n.repriced_in !== 'v1.6.23' || n.raw_sha256 !== previous.proof.raw_sha256?.[key]
        || n.raw_sha256 !== proof.raw_sha256?.[key] || n.measured_in !== a.measured_in || n.last_measured_on !== a.last_measured_on
        || n.pricing_module_sha256 !== V1623_PRICING_MODULE_SHA256 || n.price_source?.saved_copy_sha256 !== spec.evidence
        || n.price_source?.page !== spec.page || !n.authority?.some(x => x.includes(spec.authority))) fail(`${key} reprice provenance`);
    if (n.input_tokens !== spec.input_tokens || n.output_tokens !== spec.output_tokens) fail(`${key} usage`);
    same(n.price_per_million, spec.price, `${key} tariff`);
    const recomputed = cost(n.input_tokens, n.output_tokens, n.price_per_million.input, n.price_per_million.output);
    if (n.usd_per_1000 !== recomputed || n.usd_per_1000 !== s.cost.usd_per_1000 || n.under_cost_cap !== !spec.over_cap
        || n.treatment !== (spec.over_cap ? 'ranked_over_cap' : 'ranked') || Math.abs(n.cost_cap_ratio - n.usd_per_1000 / V1623_COST_CAP) > 1e-12) fail(`${key} cost binding`);
    same(n.previous, { cost: a.cost, axes: a.axes, scores: a.scores, rank: a.rank, ranks: a.ranks }, `${key} previous proof state`);
    same(n.current, { cost: s.cost, axes: s.axes, scores: s.scores, rank: s.rank, ranks: s.ranks }, `${key} current proof state`);
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
  for (const key of V1623_UNRANKED_CARRIED_KEYS) if (ranked.includes(key)) fail('a row without an official placement may not enter a ranked board');

  // --- the A2 alias is carried through unchanged ---------------------------------------------
  for (const key of V1623_CARRIED_PRELIMINARY_KEYS) {
    const a = prior.get(key), b = by.get(key);
    if (!a || !b) fail(`carried preliminary row present ${key}`);
    same(b, a, `carried preliminary row unchanged ${key}`);
    if (b.listing !== JEV_PRELIMINARY_LISTING || b.ranked !== false || b.rank !== null) fail(`carried row stays unranked ${key}`);
    if (categories.systems?.[key]) fail(`the carried A2 measurement has no category cells: ${key}`);
  }

  // --- the carried rows keep every point estimate and every interval ---------------------------
  // No key joins or leaves, so no roster position and no bootstrap seed moves: a carried row may differ ONLY in its
  // placement (rank, ranks), and every moved placement must be named in the release note.
  if (artifact.G_med_api_basis_P_vs_A !== previous.artifact.G_med_api_basis_P_vs_A) fail('a price-only release moves no diagnostic');
  same(artifact.v16?.equating, previous.artifact.v16?.equating, 'a price-only release moves no equating diagnostic');
  const strip = row => { const copy = clone(row); delete copy.rank; delete copy.ranks; return copy; };
  const rankClause = releaseNote.split('RANKS:')[1]?.split('CONFIDENCE INTERVALS:')[0] ?? '';
  if (!releaseNote.includes('Carried rows whose intervals moved: none.')) fail('the release note must state that no carried interval moved');
  for (const key of V1623_CARRIED_KEYS) {
    const a = prior.get(key), b = by.get(key);
    if (!a || !b) fail(`carried row present ${key}`);
    same(strip(b), strip(a), `carried row differs outside rank/ranks: ${key}`);
    if (V1623_UNRANKED_CARRIED_KEYS.includes(key)) {
      same([b.rank, b.ranks], [a.rank, a.ranks], `the listed-not-ranked row keeps its placement: ${key}`);
      continue;
    }
    for (const o of ['A', 'B', 'C', 'capability']) {
      const above = V1623_REPRICED_KEYS.filter(nk => (o === 'capability' ? by.get(nk).capability > b.capability
        : artifact.board[o].order.indexOf(nk) < artifact.board[o].order.indexOf(key))).length;
      if (b.ranks[o] !== a.ranks[o] + above) fail(`carried rank ${o} moved by more than the rows that became ranked above it: ${key}`);
      if (b.ranks[o] !== a.ranks[o] && !rankClause.includes(`${key} `)) fail(`a moved carried rank must name its row in the release note: ${key}`);
    }
  }
  same(artifact.measurement_notes?.slice(0, previous.artifact.measurement_notes.length), previous.artifact.measurement_notes, 'inherited measurement notes unchanged');
  if (!releaseNote.includes('RANKS') || !releaseNote.includes('CONFIDENCE INTERVALS') || !releaseNote.includes('DIAGNOSTICS')) fail('the release note must count rank, interval and diagnostic moves');
  if (!artifact.measurement_notes.some(x => x.includes('#18761') && x.includes('LISTED BUT NOT RANKED'))) fail('the non-official Speed disclosure is mandatory');
  const added = artifact.measurement_notes.slice(previous.artifact.measurement_notes.length);
  const boardNotes = added.filter(x => x.startsWith('Board effect'));
  const boardNote = boardNotes.length === 1 ? boardNotes[0] : '';
  const provisional = boardNote.includes('PROVISIONAL-TOPFIVE');
  if (provisional ? process.env.JEVBENCH_V1623_BUILD_PASS1 !== '1'
      : !(boardNote.includes('top-five') && V1623_REPRICED_KEYS.every(k => boardNote.includes(k)))) fail('board effect: generated top-five note required; provisional build note forbidden');
  if (artifact.G_med !== V1623_FIXED_G_MED || previous.artifact.G_med !== V1623_FIXED_G_MED) fail('frozen v1.6.10 G_med');

  // --- the draw and the proof -----------------------------------------------------------------
  for (const f of ['draw_release', 'freeze_manifest_sha256', 'seed_commitment', 'draw_digests', 'baseline_sha256', 'a2_supplement']) same(artifact.v16?.[f], previous.artifact.v16?.[f], `draw provenance ${f}`);
  if (artifact.v16.draw_release !== V1623_DRAW_RELEASE) fail('draw identity');
  if (proof?.schema_version !== 1 || proof.revision !== 'v1.6.23' || proof.method !== 'jevbench::v1.6'
      || proof.noul_method?.applied !== 'O1S' || proof.bootstrap?.B !== 1000 || proof.bootstrap.seed !== 16) fail('method proof');
  if (proof.draw_release !== artifact.v16.draw_release || proof.freeze_manifest_sha256 !== artifact.v16.freeze_manifest_sha256
      || proof.seed_commitment !== artifact.v16.seed_commitment || proof.baseline_sha256 !== artifact.v16.baseline_sha256
      || !hex(proof.cost_basis_sha256) || !hex(proof.registry_sha256)) fail('draw/cohort binding');
  same(artifact.v16.draw_digests, proof.draw_digests, 'draw digests bound to the proof');
  if (proof.pricing_module_sha256 !== V1623_PRICING_MODULE_SHA256 || proof.predecessor_pricing_module_sha256 !== V1622_PRICING_MODULE_SHA256
      || previous.proof.pricing_module_sha256 !== V1622_PRICING_MODULE_SHA256) fail('pricing re-freeze binding');
  if (proof.abandoned_draw_note !== null) fail('abandoned-draw disclosure');
  for (const k of ['new_rows', 'refreshed_preview_go_card', 'refreshed_preview_approval', 'a2_supplement', 'scorer_sources_sha256', 'raw_sha256'])
    same(proof[k], previous.proof[k], `inherited proof field ${k}`);
  if (typeof proof.authority !== 'string' || !proof.authority.startsWith(previous.proof.authority + ' NEW in v1.6.23:')) fail('inherited authority unchanged');
  const newAuthority = proof.authority.slice(previous.proof.authority.length);
  for (const fragment of [...V1623_REPRICED_KEYS, '#18983', '#19084', 'PRICE-ONLY', 'no model calls', 'RANKED', '533d80f0', 'over the official cap',
    V1623_GO_QUOTE, V1623_PRIORITY_QUOTE, '2026-10-16 12:50 UTC', '#20217']) {
    if (!newAuthority.includes(fragment)) fail(`new publication authority: ${fragment}`);
  }
  const marker = approvalOf(proof, artifact, boardNote, provisional);
  if (!newAuthority.includes(marker)) fail('publication approval authority binding');
  const proofRows = proof.systems;
  if (!Array.isArray(proofRows) || !sameSet(proofRows.map(x => x.key), V1623_FULL_KEYS)) fail('system proof coverage');
  const priorProof = new Map(previous.proof.systems.map(r => [r.key, r]));
  for (const x of artifact.systems) {
    if (V1623_CARRIED_PRELIMINARY_KEYS.includes(x.key)) continue;
    const p = proofRows.find(r => r.key === x.key);
    if (!p || p.rows !== 1500 || p.status !== 'complete' || !hex(p.raw_sha256) || p.raw_sha256 !== proof.raw_sha256[x.key]) fail(`system proof ${x.key}`);
    if (p.model_pin !== x.model_pin || p.rank !== x.rank || p.display !== x.display) fail(`proof agrees with the row ${x.key}`);
    same(p.composite_A ?? null, x.scores?.A ?? null, `proof agrees with the row ${x.key}`);
    same(p.axes, x.axes, `proof row axes ${x.key}`);
    same(p.capability, x.capability, `proof row Capability ${x.key}`);
    same(p.usd_per_1000, x.cost?.usd_per_1000 ?? null, `proof row cost ${x.key}`);
    same(p.cost_kind, x.cost?.kind ?? null, `proof row cost kind ${x.key}`);
    same(p.noul_decisive, x.noul_decisive, `proof row decisive ${x.key}`);
    const q = priorProof.get(x.key);
    for (const f of ['measured_by', 'source_review_sha256', 'source_review_note', 'raw_sha256', 'answered_ok']) same(p[f], q[f], `proof row provenance unchanged ${x.key}.${f}`);
  }
  // --- the frozen median, recomputable from its four v1.6.10 members --------------------------
  const members = proof.field_median?.members;
  if (proof.field_median?.g_med_fixed !== true || proof.g_med_fixed_from?.revision !== 'v1.6.10'
      || proof.g_med_fixed_from.G_med !== V1623_FIXED_G_MED || proof.g_med_fixed_from.baseline_sha256 !== proof.baseline_sha256) fail('frozen field median provenance');
  if (!Array.isArray(members) || !sameSet(members.map(m => m.key), V1610_KEYS)
      || !members.every(m => finite(m.gap) && by.get(m.key)?.intelligence?.gap === m.gap)) fail('field median cohort');
  const gaps = members.map(m => m.gap).sort((a, b) => a - b);
  const median = gaps.length % 2 ? gaps[(gaps.length - 1) / 2] : (gaps[gaps.length / 2 - 1] + gaps[gaps.length / 2]) / 2;
  if (Math.abs(artifact.G_med - median) > 1e-9 || proof.field_median.G_med !== artifact.G_med) fail('cohort G_med');
  if (artifact.G_med_flag_gt10 !== (artifact.G_med > 10)) fail('G_med flag consistency');
  if (Math.abs(proof.gap_penalty_threshold - (artifact.G_med + 8)) > 1e-6) fail('gap penalty threshold');

  // --- categories: byte-identical cells, re-bound to this release -------------------------------
  if (categories?.revision !== 'v1.6.23' || categories.provisional !== false
      || categories.source_results_sha256 !== artifact.source_sha256
      || categories.draw_release !== artifact.v16.draw_release
      || categories.results_sha256 !== manifest.files.results.sha256) fail('category source binding');
  const dims = v1623Dims(categories);
  for (const field of ['live_category_cells', 'supplement', 'language_cells', 'unavailable']) if (field in categories) fail(`historical category overlay ${field}`);
  const strippedCats = c => { const x = clone(c); for (const f of ['revision', 'results_sha256', 'source_results_sha256']) delete x[f]; return x; };
  same(strippedCats(categories), strippedCats(previous.categories), 'a price-only release changes no category cell');
  validateCategoryArtifact(categories, dims);
  return { artifact, categories, proof, manifest };
}

async function load(path, root) {
  const bytes = await readFile(`${root}/${path}`);
  const text = bytes.toString('utf8'); excluded(text);
  return { value: JSON.parse(text), bytes, sha256: createHash('sha256').update(bytes).digest('hex') };
}

/** Missing publication manifest means the version is unavailable; invalid published evidence fails closed. */
export async function readOptionalJevbenchV1623Release(root = process.cwd()) {
  let publication;
  try { publication = await load(V1623_MANIFEST, root); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  const previous = await readOptionalJevbenchV1622Release(root);
  if (!previous) fail('v1.6.23 needs the published v1.6.22 release it extends');
  const previousManifest = await load(`${V1623_ROOT}/jevbench-v1.6.22-publication.json`, root);
  const bundle = Object.fromEntries(await Promise.all(Object.entries(files).map(async ([k, path]) => [k, await load(path, root)])));
  for (const [key, value] of Object.entries(bundle)) if (publication.value.files?.[key]?.sha256 !== value.sha256) fail(`bytes hash ${key}`);
  if (bundle.history.sha256 !== previous.historical.sha256) fail('immutable history bytes');
  if (bundle['history-carry'].sha256 !== previous.historical.carrySha256) fail('immutable carry bytes');
  validateJevbenchV1623Bundle({ manifest: publication.value, artifact: bundle.results.value, categories: bundle.categories.value,
    proof: bundle.proof.value, previous, previousManifestSha256: previousManifest.sha256 });
  return { artifact: bundle.results.value, bytes: bundle.results.bytes, sha256: bundle.results.sha256,
           categories: bundle.categories.value, categoriesSha256: bundle.categories.sha256,
           proof: bundle.proof.value, proofSha256: bundle.proof.sha256, manifest: publication.value,
           historical: previous.historical };
}

/** Optional navigation must never make an older board depend on fresh publication health. */
export async function hasPublishedJevbenchV1623Release(root = process.cwd(), log = console.error) {
  try { return Boolean(await readOptionalJevbenchV1623Release(root)); }
  catch { log('JevBench v1.6.23 navigation omitted: publication validation failed'); return false; }
}

/** Board input: this release's own rows, with no historical overlay mixed in. */
export function v1623BoardInput(release) {
  return { artifact: release.artifact, categories: release.categories };
}
