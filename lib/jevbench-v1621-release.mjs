// v1.6.21: d1-ultra joins the v1.6.20 field on the same frozen draw, priced from Liquid's public list price and
// ranked. Carried rows keep every point estimate (v1.6.18 rules); the publication approval must state how it arrived
// (v1.6.20 rules), and a build whose approval is still a PLACEHOLDER does not load.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { validateJevbenchV16Release, mentionsPrivateSystem, JEVBENCH_V16_EXCLUDED_KEYS } from './jevbench-v16-release.mjs';
import { validateCategoryArtifact } from './jevbench-categories.mjs';
import { V1610_KEYS } from './jevbench-v1610-release.mjs';
import { readOptionalJevbenchV1620Release, V1620_ROOT, V1620_CARRIED_KEYS, V1620_UNRANKED_CARRIED_KEYS,
         V1620_CARRIED_PRELIMINARY_KEYS, V1620_ABOVE_COST_CAP_KEYS } from './jevbench-v1620-release.mjs';
import { JEV_PRELIMINARY_LISTING } from './jevbench-scope.mjs';

export const V1621_ROOT = V1620_ROOT;
export const V1621_MANIFEST = `${V1621_ROOT}/jevbench-v1.6.21-publication.json`;
export const V1621_FILE_KEYS = ['results', 'categories', 'proof', 'history', 'history-carry'];
const files = Object.fromEntries(V1621_FILE_KEYS.map(k => [k, `${V1621_ROOT}/jevbench-v1.6.21-${k}.json`]));
/** The one row this release adds. */
export const V1621_NEW_KEYS = ['liquid-d1-ultra'];
export const V1621_CARRIED_KEYS = [...V1620_CARRIED_KEYS];
export const V1621_CARRIED_PRELIMINARY_KEYS = [...V1620_CARRIED_PRELIMINARY_KEYS];
/** Carried listed-but-not-ranked rows: reflex (#18761), Sage 1.4, and the two Nimble rows (#19084). */
export const V1621_UNRANKED_CARRIED_KEYS = [...V1620_UNRANKED_CARRIED_KEYS, 'nimble-v4', 'nimble-v4-max'];
export const V1621_ABOVE_COST_CAP_KEYS = [...V1620_ABOVE_COST_CAP_KEYS];
export const V1621_FIXED_G_MED = 9.839526770355711;
export const V1621_COST_CAP = 0.06459465517241379;
export const V1621_DRAW_RELEASE = 'v1.6-regular-20261012';
/** The frozen pricing module after the one-key d1-ultra re-freeze, and the module it replaced. */
export const V1621_PRICING_MODULE_SHA256 = 'dcfcecb06525ce4a5ece37400ea261b97d2fe5d41155f3cd02b03cac86572835';
export const V1621_PREVIOUS_PRICING_MODULE_SHA256 = '32117d754104b3ead8bebdc9da5f8e0116a7550f4316cfc6874fbe6234c2d72b';
export const V1621_PRICE_EVIDENCE_SHA256 = '89fb8ef21f280ef5a011d2099aa80c1a0dec7cfeabd1bd57734bd88baf27b226';
export const V1621_GO_QUOTE = 'do we have released all the new JevBench and ImageJevBench pages? If not, please go for it';
const D1U = 'liquid-d1-ultra';
const D1U_INPUT_TOKENS = 638436;
const D1U_PRICE = { input: 0.042, output: 0.0 };
const D1U_USD = (D1U_INPUT_TOKENS * D1U_PRICE.input) / 1_000_000 / 1500 * 1000;
/** The registry text of the new row, verbatim: the public reads exactly this, so it is pinned here. */
const D1U_REGISTRY_TEXT = {
  display: 'd1-ultra (Liquid AI)',
  author: 'Liquid AI',
  repo: 'https://www.liquid.ai',
  licence: 'Proprietary hosted API (no weights release)',
  model_pin: 'hosted-api:api.liquid.ai/decisions/v1/systemone#d1-ultra',
  cost_basis: "Liquid AI public price list, USD 0.042/M input, output free (fetched 16 Oct 2026): the models table of Liquid's public pricing page lists d1-ultra at USD 0.042 per 1M input tokens and USD 0.00 per 1M output tokens (saved copy sha256 89fb8ef2...); the same rate Liquid's API billed on the measurement's smoke call (48 input tokens -> USD 0.000002016). Counted as the manufacturer's standard launch list price under interpretation I-1 (the reading that admitted kushal-gemma4-31b-it-autoloops and SubQ Snap), through a scoped re-freeze of the frozen pricing module that adds this one key and nothing else, with a zero-difference proof for every other registry entry. ESTIMATE in the scorer's sense: the tariff x this row's OWN provider-reported tokens (638,436 input tokens over the 1,485 answered items, 0 output tokens), divided by the full 1,500-row basis the scorer uses; the 15 items refused with HTTP 422 count as zero tokens and as wrong answers. Not a bill and not a quote.",
  endpoint_condition: 'Vendor-hosted api.liquid.ai/decisions/v1/systemone API, model `d1-ultra`, through the unchanged TypeSafe adapter; latency measured from Sandy (Germany) without API adjustment. Full S1200+P300 draw of v1.6-regular-20261012 through the unchanged run_api_full_v161.py; the full-set exposure gate logged all 1,200 sealed items to provider `liquid` before the first request (Florian GO 15 Oct 2026). Native probabilities on all three question types. 15 of 1,500 items exceed the model\'s 32,768-token input limit (HTTP 422) and are scored as failures.',
};
/** What the new row's own note must say. A deleted disclosure is not a style change. */
const D1U_NOTE_DISCLOSURES = ['1,485 of 1,500', 'HTTP 200: 1,485', '15 HTTP 422', 'input limit of 32768 tokens', 'scored as wrong',
  '`liquid` before dispatch', 'DECISIONS 15 Oct 2026 16:53Z', 'No paid order', '638,436 input tokens', 'USD 0.042/M input, output free',
  'without API adjustment', 'not independently inspected', 'f69bf80f48267017cd1fa506787850b81602ddfcea93a1451a45323b50ff045b'];
export const V1621_BASE_DIMS = ['families', 'usecases', 'languages'];
export function v1621Dims(categories) {
  return 'topics' in categories ? ['topics', ...V1621_BASE_DIMS] : [...V1621_BASE_DIMS];
}

const hex = v => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const finite = v => typeof v === 'number' && Number.isFinite(v);
const fail = message => { throw new Error(`JevBench v1.6.21: ${message}`); };
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

/** The top-five preview approval: real provenance, or nothing loads. Returns the marker the authority must carry. */
function approvalOf(proof, artifact) {
  const pa = proof.publication_approval;
  same(pa?.go, { channel: 'direct-message', where: 'laptop chat', date: '2026-10-16', quote: V1621_GO_QUOTE }, 'publication GO provenance');
  const a = pa?.top_five_preview;
  // A build made before the preview card was answered carries PLACEHOLDER fields. They are rejected wherever they
  // appear: an unfilled approval must never reach the public, not even as a sentence.
  if (JSON.stringify(proof).includes('PLACEHOLDER') || JSON.stringify(artifact).includes('PLACEHOLDER')) fail('approval placeholder not filled');
  const id = a?.card_id;
  const canonical = typeof id === 'string' && /^\d+$/.test(id) && BigInt(id).toString() === id;
  if (!canonical || BigInt(id) <= 17515n || typeof a.selection !== 'string' || !a.selection.trim() || !hex(a.preview_png_sha256)) fail('top-five preview approval card');
  const channels = ['telegram-button', 'direct-message'];
  if (!channels.includes(a.channel) || typeof a.button_tap !== 'boolean'
      || typeof a.recorded_at !== 'string' || !a.recorded_at || typeof a.recorded_in !== 'string' || !a.recorded_in
      || (a.channel === 'telegram-button') !== a.button_tap) fail('approval channel and provenance');
  const marker = a.button_tap
    ? `Florian top-five preview approval: Telegram card #${id}; selected "${a.selection}" (${a.recorded_at}); preview PNG SHA-256 ${a.preview_png_sha256}.`
    : `Florian top-five preview approval: ${a.channel} ${a.recorded_at}, recorded as Telegram card #${id} = "${a.selection}" (${a.recorded_in}; no button tap); preview PNG SHA-256 ${a.preview_png_sha256}.`;
  if (!proof.authority.includes(marker)) fail('top-five preview approval authority binding');
  // The sentence the public reads must match button_tap too (the v1.6.20 GO critic's P1 and its round-2/3 follow-ups).
  const notes = artifact.measurement_notes.filter(n => n.startsWith('Publication of v1.6.21:'));
  if (notes.length !== 1) fail('public note must describe how the approval arrived');
  for (const note of notes) {
    const claimsTap = /selected "[^"]*" on Telegram card/.test(note);
    const saysNoTap = note.includes("The card's own button was not pressed.");
    if ((a.button_tap ? (!claimsTap || saysNoTap) : (claimsTap || !saysNoTap)) || !note.includes(`Telegram card #${id}`)
        || !note.includes(a.preview_png_sha256) || !note.includes(V1621_GO_QUOTE)) fail('public note must describe how the approval arrived');
  }
  return marker;
}

export function validateJevbenchV1621Bundle({ manifest, artifact, categories, proof, previous, previousManifestSha256 }) {
  for (const value of [manifest, artifact, categories, proof]) {
    publicOnly(value);
    excluded(JSON.stringify(value));
  }
  // --- publication identity ------------------------------------------------------------------
  if (manifest?.schema_version !== 1 || manifest.revision !== 'v1.6.21' || manifest.status !== 'published' || manifest.provisional !== false) fail('publication status');
  if (manifest.review?.verdict !== 'PASS' || !manifest.review.engine || manifest.review.engine === 'PENDING' || !hex(manifest.review.receipt_sha256)) fail('independent release review');
  if (!previous || previous.manifest?.revision !== 'v1.6.20' || previous.proof?.revision !== 'v1.6.20') fail('validated v1.6.20 predecessor required');
  same(manifest.predecessor, { revision: 'v1.6.20', publication_sha256: previousManifestSha256 }, 'predecessor binding');
  for (const k of ['historical_revision', 'historical_results_sha256', 'historical_carry_sha256']) same(manifest[k], previous.manifest[k], `historical binding ${k}`);
  for (const [key, path] of Object.entries(files)) if (manifest.files?.[key]?.path !== path || !hex(manifest.files[key].sha256)) fail(`file binding ${key}`);

  // --- artifact identity and the cohort ------------------------------------------------------
  if (artifact?.revision !== 'v1.6.21' || artifact.run_kind !== 'regular-queue' || artifact.status !== 'published'
      || artifact.provisional !== false || artifact.noul_method?.applied !== 'O1S') fail('regular-queue identity');
  validateJevbenchV16Release({ ...artifact, revision: 'v1.6.1', run_kind: 'scheduled-refresh' }, 'v1.6.1');
  if (artifact.bootstrap?.B !== 1000 || artifact.bootstrap.bootstrap_seed !== 16 || artifact.bootstrap.g_med_fixed !== true) fail('artifact bootstrap');
  const allKeys = artifact.systems.map(s => s.key);
  const newKeys = allKeys.filter(k => !V1621_CARRIED_KEYS.includes(k) && !V1621_CARRIED_PRELIMINARY_KEYS.includes(k)).sort();
  if (!sameSet(newKeys, V1621_NEW_KEYS)) fail(`exactly the added row: ${newKeys}`);
  if (!sameSet(allKeys, [...V1621_CARRIED_KEYS, ...V1621_NEW_KEYS, ...V1621_CARRIED_PRELIMINARY_KEYS])) fail('exact cohort');
  if (artifact.systems.length !== previous.artifact.systems.length + 1) fail('exactly the added rows');
  if (artifact.not_measured.length) fail('regular cohort has no not-measured rows');
  if (artifact.roster_count !== artifact.systems.length) fail('roster count');
  const by = new Map(artifact.systems.map(s => [s.key, s]));
  const prior = new Map(previous.artifact.systems.map(s => [s.key, s]));
  if (artifact.n_ranked !== artifact.systems.filter(s => s.ranked).length || artifact.n_ranked !== previous.artifact.n_ranked + 1) fail('ranked row count');
  const regularKeys = [...V1621_CARRIED_KEYS, ...V1621_NEW_KEYS];
  if (!sameSet(V1621_UNRANKED_CARRIED_KEYS, V1621_CARRIED_KEYS.filter(k => !prior.get(k)?.ranked))) fail('carried unranked set');

  // --- every full-draw row ----------------------------------------------------------------------
  for (const s of artifact.systems) {
    if (V1621_CARRIED_PRELIMINARY_KEYS.includes(s.key)) continue;   // validated by the predecessor chain
    const isNew = s.key === D1U;
    const expectedLane = isNew ? 'api' : prior.get(s.key).v16.lane;
    if (s.v16?.lane !== expectedLane) fail(`lane ${s.key}`);
    if (s.status?.rows !== 1500 || s.status.status !== 'complete') fail(`complete 1500 rows ${s.key}`);
    if (s.full_coverage !== true) fail(`full coverage ${s.key}`);
    const unpriced = s.cost?.kind === 'unpriced';
    if (unpriced && (isNew || prior.get(s.key).cost.kind !== 'unpriced')) fail(`only a row with a stated unpriced ruling may be unpriced: ${s.key}`);
    for (const axis of ['intelligence', 'calibration', 'speed', ...(unpriced ? [] : ['cost'])]) {
      if (!finite(s.axes?.[axis])) fail(`axis ${axis} ${s.key}`);
    }
    if (unpriced && s.ranked) fail(`an unpriced row has no composite and cannot be ranked: ${s.key}`);
    if (!finite(s.capability) || Math.abs(s.capability - (s.axes.intelligence + s.axes.calibration) / 2) > 1e-9) fail(`capability is the mean of intelligence and calibration: ${s.key}`);
    if (V1621_UNRANKED_CARRIED_KEYS.includes(s.key)) {
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
    if (!unpriced && s.cost.usd_per_1000 > V1621_COST_CAP && !V1621_ABOVE_COST_CAP_KEYS.includes(s.key)) fail(`cost above the published ceiling ${s.key}`);
    const d = s.noul_decisive;
    if (!d || d.supported !== true || !Number.isInteger(d.n) || d.n !== 375 || !finite(d.decisive_rate)
        || !(finite(d.acc_among_decisive) || (d.acc_among_decisive === null && d.decisive === 0 && d.decisive_rate === 0))) fail(`noul decisiveness ${s.key}`);
  }

  // --- the new row ----------------------------------------------------------------------------
  const s = by.get(D1U);
  for (const [field, value] of Object.entries(D1U_REGISTRY_TEXT)) {
    const got = field === 'cost_basis' ? s.cost?.basis : s[field];
    same(got, value, `d1-ultra registry ${field} verbatim`);
  }
  if (s.measured_in !== 'v1.6.21' || s.measurement_date_status !== 'measured' || s.last_measured_on !== '2026-10-15') fail('d1-ultra measurement stamp');
  if (s.ranked !== true || s.listing !== 'ranked' || s.not_ranked_because || s.ranked_false_reason) fail('d1-ultra is ranked');
  if (s.endpoint_kind !== 'api' || s.api_flag !== true || s.v16.set !== 'S+P') fail('d1-ultra lane/endpoint kind');
  if (s.v16.full_set_api !== true || s.v16.equated !== null || s.speed?.adjustment !== 'none (API)') fail('full-set API row, not equated, no latency adjustment');
  if (s.cost?.kind !== 'estimate' || s.cost.usd_per_1000 !== D1U_USD || !(s.cost.usd_per_1000 <= V1621_COST_CAP)) fail('d1-ultra cost: list tariff x own tokens, under the cap');
  if (!finite(s.axes.cost) || ['A', 'B', 'C'].some(o => !finite(s.scores?.[o]))) fail('d1-ultra cost axis and composites');
  if (s.status.answered_ok !== 1485) fail('d1-ultra completeness');
  for (const ci of [s.composite_ci95, s.v16?.ci95?.composite]) if (!intervalOk(ci, s.scores)) fail('new row interval does not contain its own point estimate');
  const capCi = s.v16?.ci95?.capability;
  if (!Array.isArray(capCi) || !(capCi[0] <= s.capability + 1e-9 && s.capability <= capCi[1] + 1e-9)) fail('new row capability interval does not contain its own point estimate');
  const rowNote = artifact.measurement_notes.find(n => n.startsWith(`${D1U}: `)) ?? '';
  if (rowNote.length < 600) fail('row note is too thin to be the disclosure it claims to be');
  for (const fragment of D1U_NOTE_DISCLOSURES) if (!rowNote.includes(fragment)) fail(`required disclosure "${fragment}" missing from the note of ${D1U}`);
  const n = proof.new_rows?.[D1U];
  if (!sameSet(Object.keys(proof.new_rows ?? {}), V1621_NEW_KEYS)) fail('new-row provenance coverage');
  if (!n || n.raw_sha256 !== proof.raw_sha256?.[D1U] || n.original_raw_sha256 !== n.raw_sha256 || n.rows !== 1500 || n.answered_ok !== 1485
      || n.ranked !== true || n.paid_fast_lane !== false || n.endpoint_kind !== 'api' || n.treatment !== 'ranked') fail('new-row provenance');
  if (n.input_tokens !== D1U_INPUT_TOKENS || n.output_tokens !== 0 || n.refused_http_422 !== 15) fail('d1-ultra usage');
  same(n.status_counts, { 200: 1485, 422: 15 }, 'd1-ultra HTTP status counts');
  same(n.price_per_million, D1U_PRICE, 'd1-ultra tariff');
  const recomputed = (n.input_tokens * n.price_per_million.input + n.output_tokens * n.price_per_million.output) / 1_000_000 / 1500 * 1000;
  if (n.usd_per_1000 !== recomputed || n.usd_per_1000 !== s.cost.usd_per_1000 || n.under_cost_cap !== true
      || Math.abs(n.cost_cap_ratio - n.usd_per_1000 / V1621_COST_CAP) > 1e-12) fail('d1-ultra cost binding');
  if (n.price_evidence_sha256 !== V1621_PRICE_EVIDENCE_SHA256 || n.pricing_module_sha256 !== V1621_PRICING_MODULE_SHA256) fail('d1-ultra price evidence');
  if (s.speed.p50_s_raw !== n.p50_s_raw || s.speed.p95_s_raw !== n.p95_s_raw) fail('receipt latency');

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
  for (const key of V1621_UNRANKED_CARRIED_KEYS) if (ranked.includes(key)) fail('a row without an official placement may not enter a ranked board');

  // --- the A2 alias is carried through unchanged ---------------------------------------------
  for (const key of V1621_CARRIED_PRELIMINARY_KEYS) {
    const a = prior.get(key), b = by.get(key);
    if (!a || !b) fail(`carried preliminary row present ${key}`);
    same(b, a, `carried preliminary row unchanged ${key}`);
    if (b.listing !== JEV_PRELIMINARY_LISTING || b.ranked !== false || b.rank !== null) fail(`carried row stays unranked ${key}`);
    if (categories.systems?.[key]) fail(`the carried A2 measurement has no category cells: ${key}`);
  }

  // --- the carried rows keep every point estimate ----------------------------------------------
  // What may differ on a carried row, and nothing else: its placement (rank, ranks), its bootstrap intervals
  // (composite_ci95, v16.ci95 - the new key shifts roster positions and with them the per-row bootstrap seeds) and,
  // only when the API-basis diagnostic moved, v16.raw_on_A. Every move must be named in the release note.
  const diagnosticMoved = artifact.G_med_api_basis_P_vs_A !== previous.artifact.G_med_api_basis_P_vs_A;
  const strip = (row, allowRawOnA) => {
    const copy = JSON.parse(JSON.stringify(row));
    delete copy.composite_ci95; delete copy.rank; delete copy.ranks;
    if (copy.v16) { delete copy.v16.ci95; if (allowRawOnA) delete copy.v16.raw_on_A; }
    return copy;
  };
  const releaseNote = artifact.measurement_notes.find(x => x.startsWith('v1.6.21 ADDS ')) ?? '';
  const clauseStart = releaseNote.indexOf('Carried rows whose intervals moved:');
  if (clauseStart < 0) fail('the release note must carry the "Carried rows whose intervals moved:" clause');
  const intervalNames = releaseNote.slice(clauseStart + 'Carried rows whose intervals moved:'.length).split('DIAGNOSTICS')[0]
    .split(/[,\s]+/).map(x => x.replace(/\.$/, ''));
  const rankClause = releaseNote.split('RANKS:')[1]?.split('CONFIDENCE INTERVALS:')[0] ?? '';
  for (const key of V1621_CARRIED_KEYS) {
    const a = prior.get(key), b = by.get(key);
    if (!a || !b) fail(`carried row present ${key}`);
    const rawOnAMoved = JSON.stringify(a.v16?.raw_on_A) !== JSON.stringify(b.v16?.raw_on_A);
    if (rawOnAMoved && !diagnosticMoved) fail(`raw_on_A moved while the API-basis diagnostic did not: ${key}`);
    if (rawOnAMoved && !releaseNote.includes(`${key}: intelligence`)) fail(`a moved raw_on_A must name its row in the notes: ${key}`);
    same(strip(b, rawOnAMoved), strip(a, rawOnAMoved), `carried row differs outside rank/ranks/composite_ci95/v16.ci95${rawOnAMoved ? '/v16.raw_on_A' : ''}: ${key}`);
    if (V1621_UNRANKED_CARRIED_KEYS.includes(key)) {
      same([b.rank, b.ranks, b.not_ranked_because, b.listing, b.ranked], [a.rank, a.ranks, a.not_ranked_because, a.listing, a.ranked], `the listed-not-ranked row keeps its placement and wording: ${key}`);
    }
    const intervalMoved = !isDeepStrictEqual([b.composite_ci95, b.v16?.ci95], [a.composite_ci95, a.v16?.ci95]);
    if (intervalMoved && !intervalNames.includes(key)) fail(`a moved carried interval must name its row in the release note: ${key}`);
    for (const ci of (b.cost.kind === 'unpriced' ? [] : [b.composite_ci95, b.v16?.ci95?.composite])) {
      if (!intervalOk(ci, b.scores)) fail(`carried row interval does not contain its own point estimate: ${key}`);
    }
    if (a.ranked) {
      const nRow = by.get(D1U);
      for (const o of ['A', 'B', 'C', 'capability']) {
        const above = (o === 'capability' ? nRow.capability > b.capability : artifact.board[o].order.indexOf(D1U) < artifact.board[o].order.indexOf(key)) ? 1 : 0;
        if (b.ranks[o] !== a.ranks[o] + above) fail(`carried rank ${o} moved by more than the rows that joined above it: ${key}`);
        if (b.ranks[o] !== a.ranks[o] && !rankClause.includes(`${key} `)) fail(`a moved carried rank must name its row in the release note: ${key}`);
      }
    }
  }
  same(artifact.measurement_notes?.slice(0, previous.artifact.measurement_notes.length), previous.artifact.measurement_notes, 'inherited measurement notes unchanged');
  if (!releaseNote.includes('RANKS') || !releaseNote.includes('CONFIDENCE INTERVALS') || !releaseNote.includes('DIAGNOSTICS') || !releaseNote.includes(D1U)) fail('the release note must count rank, interval and diagnostic moves');
  if (!artifact.measurement_notes.some(x => x.includes('#18761') && x.includes('LISTED BUT NOT RANKED'))) fail('the non-official Speed disclosure is mandatory');
  if (diagnosticMoved) {
    const values = [previous.artifact.G_med_api_basis_P_vs_A, artifact.G_med_api_basis_P_vs_A].map(String);
    if (!artifact.measurement_notes.some(x => x.includes('API-basis median diagnostic') && values.every(v => x.includes(v)))) fail('a moved API-basis diagnostic must be disclosed with both values');
  }
  const added = artifact.measurement_notes.slice(previous.artifact.measurement_notes.length);
  const boardNote = added.find(x => x.startsWith('Board effect')) ?? '';
  const provisional = boardNote.includes('PROVISIONAL-TOPFIVE');
  if (provisional ? process.env.JEVBENCH_V1621_BUILD_PASS1 !== '1' : !(boardNote.includes('d1-ultra (Liquid AI)') && boardNote.includes('top-five'))) fail('board effect: generated top-five note required; provisional build note forbidden');
  if (artifact.G_med !== V1621_FIXED_G_MED || previous.artifact.G_med !== V1621_FIXED_G_MED) fail('frozen v1.6.10 G_med');

  // --- the draw and the proof -----------------------------------------------------------------
  if (artifact.v16.draw_release !== V1621_DRAW_RELEASE) fail('draw identity');
  if (!hex(artifact.v16.freeze_manifest_sha256) || !hex(artifact.v16.seed_commitment) || !hex(artifact.v16.baseline_sha256)) fail('draw provenance hashes');
  for (const set of ['S', 'A', 'P', 'core']) if (!hex(artifact.v16.draw_digests?.[set])) fail(`draw digest ${set}`);
  if (proof?.schema_version !== 1 || proof.revision !== 'v1.6.21' || proof.method !== 'jevbench::v1.6'
      || proof.noul_method?.applied !== 'O1S' || proof.bootstrap?.B !== 1000 || proof.bootstrap.seed !== 16) fail('method proof');
  if (proof.draw_release !== artifact.v16.draw_release || proof.freeze_manifest_sha256 !== artifact.v16.freeze_manifest_sha256
      || proof.seed_commitment !== artifact.v16.seed_commitment || proof.baseline_sha256 !== artifact.v16.baseline_sha256
      || !hex(proof.cost_basis_sha256) || !hex(proof.registry_sha256)) fail('draw/cohort binding');
  same(artifact.v16.draw_digests, proof.draw_digests, 'draw digests bound to the proof');
  if (proof.pricing_module_sha256 !== V1621_PRICING_MODULE_SHA256 || proof.predecessor_pricing_module_sha256 !== V1621_PREVIOUS_PRICING_MODULE_SHA256
      || previous.proof.pricing_module_sha256 !== V1621_PREVIOUS_PRICING_MODULE_SHA256) fail('frozen pricing module hash');
  if (proof.abandoned_draw_note !== null) fail('abandoned-draw disclosure');
  for (const k of ['repriced_rows', 'refreshed_preview_go_card', 'refreshed_preview_approval', 'a2_supplement', 'scorer_sources_sha256']) same(proof[k], previous.proof[k], `inherited proof field ${k}`);
  if (typeof proof.authority !== 'string' || !proof.authority.startsWith(previous.proof.authority + ' NEW in v1.6.21:')) fail('inherited authority unchanged');
  const newAuthority = proof.authority.slice(previous.proof.authority.length);
  for (const fragment of ['d1-ultra (Liquid AI, liquid-d1-ultra)', D1U, 'DECISIONS 15 Oct 2026 16:53Z', '`liquid` before dispatch', '1,485/1,500', '15 HTTP 422',
    'USD 0.042/M input, output free', V1621_PRICE_EVIDENCE_SHA256, 'zero-difference', '638,436', V1621_GO_QUOTE, 'top-five preview']) {
    if (!newAuthority.includes(fragment)) fail(`new publication authority: ${fragment}`);
  }
  approvalOf(proof, artifact);
  if (!sameSet(Object.keys(proof.raw_sha256 ?? {}), regularKeys)) fail('raw-output coverage');
  same(Object.fromEntries(V1621_CARRIED_KEYS.map(k => [k, proof.raw_sha256[k]])), previous.proof.raw_sha256, 'inherited raw-output hashes unchanged');
  const proofRows = proof.systems;
  if (!Array.isArray(proofRows) || !sameSet(proofRows.map(x => x.key), regularKeys)) fail('system proof coverage');
  for (const x of artifact.systems) {
    if (V1621_CARRIED_PRELIMINARY_KEYS.includes(x.key)) continue;
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
    if (typeof p.source_review_note !== 'string' || p.source_review_note.length < 20) fail(`source review note ${x.key}`);
  }
  // --- the frozen median, recomputable from its four v1.6.10 members --------------------------
  const members = proof.field_median?.members;
  if (proof.field_median?.g_med_fixed !== true || proof.g_med_fixed_from?.revision !== 'v1.6.10'
      || proof.g_med_fixed_from.G_med !== V1621_FIXED_G_MED || proof.g_med_fixed_from.baseline_sha256 !== proof.baseline_sha256) fail('frozen field median provenance');
  if (!Array.isArray(members) || !sameSet(members.map(m => m.key), V1610_KEYS)
      || !members.every(m => finite(m.gap) && by.get(m.key)?.intelligence?.gap === m.gap)) fail('field median cohort');
  const gaps = members.map(m => m.gap).sort((a, b) => a - b);
  const median = gaps.length % 2 ? gaps[(gaps.length - 1) / 2] : (gaps[gaps.length / 2 - 1] + gaps[gaps.length / 2]) / 2;
  if (Math.abs(artifact.G_med - median) > 1e-9 || proof.field_median.G_med !== artifact.G_med) fail('cohort G_med');
  if (artifact.G_med_flag_gt10 !== (artifact.G_med > 10)) fail('G_med flag consistency');
  if (Math.abs(proof.gap_penalty_threshold - (artifact.G_med + 8)) > 1e-6) fail('gap penalty threshold');

  // --- categories ------------------------------------------------------------------------------
  if (categories?.revision !== 'v1.6.21' || categories.provisional !== false
      || categories.source_results_sha256 !== artifact.source_sha256
      || categories.draw_release !== artifact.v16.draw_release
      || categories.results_sha256 !== manifest.files.results.sha256) fail('category source binding');
  const dims = v1621Dims(categories);
  if (!('topics' in categories) && !artifact.measurement_notes.some(x => x.includes('topic'))) fail('a release without the topic radar must say so in its measurement notes');
  for (const field of ['live_category_cells', 'supplement', 'language_cells', 'unavailable']) if (field in categories) fail(`historical category overlay ${field}`);
  for (const field of ['lane_note', 'metric', 'labelling']) if (typeof categories[field] !== 'string' || !categories[field].trim()) fail(`category field ${field}`);
  if (!Array.isArray(categories.rules) || !categories.rules.length) fail('category rules');
  if (!categories.lanes || !sameSet(Object.keys(categories.lanes), regularKeys)) fail('category lanes');
  for (const key of regularKeys) if (categories.lanes[key] !== (key === D1U ? 'api' : previous.categories.lanes[key])) fail(`category lane ${key}`);
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
  for (const key of V1621_CARRIED_KEYS) same(categories.systems[key], previous.categories.systems[key], `inherited category cells ${key}`);
  return { artifact, categories, proof, manifest };
}

async function load(path, root) {
  const bytes = await readFile(`${root}/${path}`);
  const text = bytes.toString('utf8'); excluded(text);
  return { value: JSON.parse(text), bytes, sha256: createHash('sha256').update(bytes).digest('hex') };
}

/** Missing publication manifest means the version is unavailable; invalid published evidence fails closed. */
export async function readOptionalJevbenchV1621Release(root = process.cwd()) {
  let publication;
  try { publication = await load(V1621_MANIFEST, root); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  const previous = await readOptionalJevbenchV1620Release(root);
  if (!previous) fail('v1.6.21 needs the published v1.6.20 release it extends');
  const previousManifest = await load(`${V1621_ROOT}/jevbench-v1.6.20-publication.json`, root);
  const bundle = Object.fromEntries(await Promise.all(Object.entries(files).map(async ([k, path]) => [k, await load(path, root)])));
  for (const [key, value] of Object.entries(bundle)) if (publication.value.files?.[key]?.sha256 !== value.sha256) fail(`bytes hash ${key}`);
  if (bundle.history.sha256 !== previous.historical.sha256) fail('immutable history bytes');
  if (bundle['history-carry'].sha256 !== previous.historical.carrySha256) fail('immutable carry bytes');
  validateJevbenchV1621Bundle({ manifest: publication.value, artifact: bundle.results.value, categories: bundle.categories.value,
    proof: bundle.proof.value, previous, previousManifestSha256: previousManifest.sha256 });
  return { artifact: bundle.results.value, bytes: bundle.results.bytes, sha256: bundle.results.sha256,
           categories: bundle.categories.value, categoriesSha256: bundle.categories.sha256,
           proof: bundle.proof.value, proofSha256: bundle.proof.sha256, manifest: publication.value,
           historical: previous.historical };
}

/** Optional navigation must never make an older board depend on fresh publication health. */
export async function hasPublishedJevbenchV1621Release(root = process.cwd(), log = console.error) {
  try { return Boolean(await readOptionalJevbenchV1621Release(root)); }
  catch { log('JevBench v1.6.21 navigation omitted: publication validation failed'); return false; }
}

/** Board input: this release's own rows, with no historical overlay mixed in. */
export function v1621BoardInput(release) {
  return { artifact: release.artifact, categories: release.categories };
}
