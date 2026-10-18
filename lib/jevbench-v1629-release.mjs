// v1.6.29: paid Torchcast v1.2 GPU + regular Vega-U CPU; carried estimates frozen; no pricing change.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { validateJevbenchV16Release, mentionsPrivateSystem, JEVBENCH_V16_EXCLUDED_KEYS } from './jevbench-v16-release.mjs';
import { validateCategoryArtifact } from './jevbench-categories.mjs';
import { V1610_KEYS } from './jevbench-v1610-release.mjs';
import { readOptionalJevbenchV1628Release, V1628_ROOT, V1628_CARRIED_KEYS, V1628_NEW_KEYS, V1628_UNRANKED_CARRIED_KEYS, V1628_UNRANKED_NEW_KEYS,
         V1628_CARRIED_PRELIMINARY_KEYS, V1628_ABOVE_COST_CAP_KEYS, V1628_PRICING_MODULE_SHA256 } from './jevbench-v1628-release.mjs';
import { JEV_PRELIMINARY_LISTING } from './jevbench-scope.mjs';

export const V1629_ROOT = V1628_ROOT;
export const V1629_MANIFEST = `${V1629_ROOT}/jevbench-v1.6.29-publication.json`;
export const V1629_FILE_KEYS = ['results', 'categories', 'proof', 'history', 'history-carry'];
const files = Object.fromEntries(V1629_FILE_KEYS.map(k => [k, `${V1629_ROOT}/jevbench-v1.6.29-${k}.json`]));
/** The two rows this release adds. */
export const V1629_TORCHCAST_KEY = 'torchcast-decision-4b-v1.2';
export const V1629_VEGA_KEY = 'vega-u-qwen3.5-0.8b';
export const V1629_RANKED_NEW_KEYS = ['torchcast-decision-4b-v1.2', 'vega-u-qwen3.5-0.8b'];
export const V1629_UNRANKED_NEW_KEYS = [];
export const V1629_NEW_KEYS = [...V1629_RANKED_NEW_KEYS, ...V1629_UNRANKED_NEW_KEYS].sort();
export const V1629_OVER_CAP_NEW_KEYS = [];
/** Every full-draw row of v1.6.28. */
export const V1629_CARRIED_KEYS = [...V1628_CARRIED_KEYS, ...V1628_NEW_KEYS];
export const V1629_CARRIED_PRELIMINARY_KEYS = [...V1628_CARRIED_PRELIMINARY_KEYS];
/** Carried listed-but-not-ranked rows: reflex (#18761), the unpriced v1.6.22 / v1.6.24 / v1.6.26 rows. */
export const V1629_UNRANKED_CARRIED_KEYS = [...V1628_UNRANKED_CARRIED_KEYS, ...V1628_UNRANKED_NEW_KEYS];
export const V1629_ABOVE_COST_CAP_KEYS = [...V1628_ABOVE_COST_CAP_KEYS, ...V1629_OVER_CAP_NEW_KEYS];
export const V1629_FIXED_G_MED = 9.839526770355711;
export const V1629_COST_CAP = 0.06459465517241379;
export const V1629_DRAW_RELEASE = 'v1.6-regular-20261012';
/** No re-freeze in this release: the v1.6.28 pricing module (6202ef78) stays in force, unchanged. */
export const V1629_PRICING_MODULE_SHA256 = V1628_PRICING_MODULE_SHA256;
export const V1629_GO_QUOTE = 'I really want all of the models we have evaluated to be online (even if they land in #5) on both JevBench and ImageJevBench';
export const V1629_GO = { channel: 'direct-message', where: 'laptop chat', date: '2026-10-16', recorded_at: '2026-10-16T12:50Z',
  recorded_in: 'DECISIONS.md 2026-10-16 12:50 UTC', quote: V1629_GO_QUOTE };
export const V1629_ASKS = {"torchcast-decision-4b-v1.2": {"key": "torchcast-decision-4b-v1.2", "relay": "public paid fast-lane order 39e2266a", "handoff": "board #21378", "admission": "#21356 (deputy #21361)"}, "vega-u-qwen3.5-0.8b": {"key": "vega-u-qwen3.5-0.8b", "relay": "Florian's own work order (board #21201)", "handoff": "board #21385", "admission": "#21213 key 3"}};
export const V1629_PAID_RULE = {"date": "2026-09-29", "orders": {"torchcast-decision-4b-v1.2": "39e2266a"}, "precedent": "v1.6.13 attest-31b-v1.0 (paid public fast-lane order 07d13315); v1.6.24 kettei-fat / kettei-chub; v1.6.25 celeris-1-decision", "quote": "fast lane runs fully autonomously end-to-end incl. publication, customer mail and an @airesearch12 post when the top 5 change; paid runs no longer need his top-5 preview", "recorded_at": "2026-09-29 ~00:25 Berlin", "recorded_in": "DECISIONS.md 29 Sep 2026 ~00:25 Berlin (Florian)", "rule": "paid fast-lane publication exception"};
export const V1629_PAID_KEYS = [V1629_TORCHCAST_KEY];
const cost = (tin, tout, pin, pout) => 1000 * (tin * pin + tout * pout) / 1e6 / 1500;   // score_v16.common_basis_usd

/** Each new row's identity, measurement and the SHA-256 of its published texts (cost basis, endpoint condition): the public
 *  reads exactly these, so they are pinned here. */
export const V1629_ROW_SPEC = Object.freeze({
  "torchcast-decision-4b-v1.2": {"ranked": true, "lane": "selfhosted", "kind": "gpu", "display": "Torchcast Decision 4B (v1.2)", "author": "Torchcast AI", "repo": "https://huggingface.co/torchcast-ai/torchcast-decision-4b", "model_pin": "torchcast-ai/torchcast-decision-4b@d54b248f2643df847979ca15638ee502ec79b788", "licence": "Apache-2.0 (weights, from v1.2); base Qwen/Qwen3.5-4B Apache-2.0; serving package Apache-2.0", "ok": 1500, "status_counts": {"200": 1500}, "input_tokens": 982889, "output_tokens": 0, "price": {"input": 0.030000000000000002, "output": 0.15}, "raw": "ce49d5cd99c5fdfbf960cd6fe3e6af8040779a65a80362072305f700036d14a7", "copy": "ce49d5cd99c5fdfbf960cd6fe3e6af8040779a65a80362072305f700036d14a7", "custody": "#21356 (deputy #21361)", "handoff": "board #21378", "review_verdict": "PASS", "texts": {"cost_basis": "f7320fd167dc3fce7a09e597025b9699d91e278fda523e4d75bcebefdd94da96", "endpoint_condition": "fa06a75411676a095fb77d77a08f0acb2ddcf518b2a015b98ebe237f504cfa28"}, "disclosures": ["measured 18 Oct 2026", "Source review PASS", "the raw is the scored copy", "Evaluated pin", "LICENCE", "--network none", "noncausal_full_attention", "0.801", "T 1.0", "0.9", "Python 3.11", "16,384", "head and the tail", "Apache-2.0", "CC BY-NC", "Verda FIN-01 A100 SXM4 80GB", "Speed is not strictly comparable", "no CUDA graphs", "ce49d5cd99c5fdfbf960cd6fe3e6af8040779a65a80362072305f700036d14a7", "the raw is the scored copy"]},
  "vega-u-qwen3.5-0.8b": {"ranked": true, "lane": "selfhosted", "kind": "cpu", "display": "Vega-U (Qwen3.5-0.8B reader)", "author": "Nandakishor M", "repo": "https://huggingface.co/nandakishorm/vega-U", "model_pin": "nandakishorm/vega-U@b3e7383e463ef3b78324408cd82f4ab0d8f2e75a", "licence": "vega-U checkpoint apache-2.0 (card and metadata agree); vegaml package apache-2.0; frozen reader Qwen/Qwen3.5-0.8B apache-2.0", "ok": 1500, "status_counts": {"200": 1500}, "input_tokens": 1837991, "output_tokens": 0, "price": {"input": 0.01, "output": 0.05}, "raw": "4ed9788a979c82d2ee377762efebf7fd9a5121da0f8ba90fa5ae07208db6ca83", "copy": "4ed9788a979c82d2ee377762efebf7fd9a5121da0f8ba90fa5ae07208db6ca83", "custody": "#21213 key 3", "handoff": "board #21385", "review_verdict": "PASS", "texts": {"cost_basis": "118888fe31e919c29d6c84527ac75417fb711fcbf5b7960b9d67bd25a3e40141", "endpoint_condition": "bcf15f694399ab8fa7aa2378d299026ecc70e13f2ff84cacae30eac93690e065"}, "disclosures": ["measured 18 Oct 2026", "Source review PASS", "the raw is the scored copy", "Evaluated pin", "LICENCE", "--network none", "15 of 1,500", "73,728", "right-truncated", "build_prompt", "CPU", "32 threads", "fp32", "Speed is not comparable", "vegaml-0.8b", "vegaml-4b", "A6000", "4ed9788a979c82d2ee377762efebf7fd9a5121da0f8ba90fa5ae07208db6ca83", "the raw is the scored copy"]},
});
export const V1629_BASE_DIMS = ['families', 'usecases', 'languages'];
export function v1629Dims(categories) {
  return 'topics' in categories ? ['topics', ...V1629_BASE_DIMS] : [...V1629_BASE_DIMS];
}

const hex = v => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const finite = v => typeof v === 'number' && Number.isFinite(v);
const textSha = v => typeof v === 'string' ? createHash('sha256').update(v, 'utf8').digest('hex') : null;
const fail = message => { throw new Error(`JevBench v1.6.29: ${message}`); };
const sameSet = (a, b) => a.length === b.length && JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
const same = (a, b, message) => { if (!isDeepStrictEqual(a, b)) fail(message); };
const INTERNAL = /[\w.+-]+@[\w-]+\.[a-z]{2,}|\/home\/|\bworkers\/|\br1\d\d\/|\bpod id\b|PREREG|batchA|batchBCD|\bR12\d\b|_wrap\.py|bh-submit|ff14417c/i;
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

/** The keys the generated board note names as the cause of its top-five changes. */
function boardCauses(boardNote) {
  const m = boardNote.match(/Top-five changes caused by: (.+?)(?: \(|\. )/);
  return m ? m[1].split(',').map(x => x.trim()).filter(Boolean) : [];
}

/** How the publication approval arrived. Returns the marker the authority must carry. */
function approvalOf(proof, artifact, boardNote, provisional) {
  const pa = proof.publication_approval;
  same(pa?.go, V1629_GO, 'publication GO provenance');
  same(pa?.asks, V1629_ASKS, 'request provenance');
  same(pa?.paid_fast_lane, V1629_PAID_RULE, 'paid fast-lane rule provenance');
  if (JSON.stringify(proof).includes('PLACEHOLDER') || JSON.stringify(artifact).includes('PLACEHOLDER')) fail('approval placeholder');
  if (pa.top_five_preview !== null || pa.button_tap !== false) fail('no card or button tap may be claimed');
  const notes = artifact.measurement_notes.filter(n => n.startsWith('Publication of v1.6.29:'));
  if (notes.length !== 1 || !notes[0].includes(V1629_GO_QUOTE) || !notes[0].includes(V1629_PAID_RULE.quote)
      || !notes[0].includes(V1629_PAID_RULE.recorded_in) || !notes[0].includes('no top-five preview card was sent and none is claimed')
      || /Telegram card #\d/.test(notes[0])) fail('publication approval disclosure');
  const causes = boardCauses(boardNote);
  if (pa.top_five_effect === 'changes-paid-only') {
    if (provisional || !causes.length || !causes.every(k => V1629_PAID_KEYS.includes(k)) || !boardNote.includes('(paid fast-lane rows only)')) fail('paid-only top-five exception');
    same(pa.top_five_changed_by, causes.sort(), 'top-five causes');
  } else if (pa.top_five_effect !== 'none' || (!provisional && !boardNote.includes('0 of 21 top-five lists change'))) fail('top-five effect');
  const expected = ['asks','button_tap','go','paid_fast_lane','top_five_effect','top_five_preview'];
  if (pa.top_five_effect==='changes-paid-only') expected.push('top_five_changed_by');
  same(Object.keys(pa).sort(), expected.sort(), 'approval fields');
  return 'Florian publication approval: paid_fast_lane, 29 Sep 2026 automatic paid publication rule; release-owner decision board #21391; no preview card; no button tap.';
}

export function validateJevbenchV1629Bundle({ manifest, artifact, categories, proof, previous, previousManifestSha256 }) {
  for (const value of [manifest, artifact, categories, proof]) {
    publicOnly(value);
    excluded(JSON.stringify(value));
  }
  // --- publication identity ------------------------------------------------------------------
  if (manifest?.schema_version !== 1 || manifest.revision !== 'v1.6.29' || manifest.status !== 'published' || manifest.provisional !== false) fail('publication status');
  if (manifest.review?.verdict !== 'PASS' || !manifest.review.engine || manifest.review.engine === 'PENDING' || !hex(manifest.review.receipt_sha256)) fail('independent release review');
  if (!previous || previous.manifest?.revision !== 'v1.6.28' || previous.proof?.revision !== 'v1.6.28') fail('validated v1.6.28 predecessor required');
  same(manifest.predecessor, { revision: 'v1.6.28', publication_sha256: previousManifestSha256 }, 'predecessor binding');
  for (const k of ['historical_revision', 'historical_results_sha256', 'historical_carry_sha256']) same(manifest[k], previous.manifest[k], `historical binding ${k}`);
  for (const [key, path] of Object.entries(files)) if (manifest.files?.[key]?.path !== path || !hex(manifest.files[key].sha256)) fail(`file binding ${key}`);

  // --- artifact identity and the cohort ------------------------------------------------------
  if (artifact?.revision !== 'v1.6.29' || artifact.run_kind !== 'regular-queue' || artifact.status !== 'published'
      || artifact.provisional !== false || artifact.noul_method?.applied !== 'O1S') fail('regular-queue identity');
  validateJevbenchV16Release({ ...artifact, revision: 'v1.6.1', run_kind: 'scheduled-refresh' }, 'v1.6.1');
  if (artifact.bootstrap?.B !== 1000 || artifact.bootstrap.bootstrap_seed !== 16 || artifact.bootstrap.g_med_fixed !== true) fail('artifact bootstrap');
  const allKeys = artifact.systems.map(s => s.key);
  const newKeys = allKeys.filter(k => !V1629_CARRIED_KEYS.includes(k) && !V1629_CARRIED_PRELIMINARY_KEYS.includes(k)).sort();
  if (!sameSet(newKeys, V1629_NEW_KEYS)) fail(`exactly the added rows: ${newKeys}`);
  if (!sameSet(allKeys, [...V1629_CARRIED_KEYS, ...V1629_NEW_KEYS, ...V1629_CARRIED_PRELIMINARY_KEYS])) fail('exact cohort');
  if (artifact.systems.length !== previous.artifact.systems.length + V1629_NEW_KEYS.length) fail('exactly the added rows');
  if (artifact.not_measured.length) fail('regular cohort has no not-measured rows');
  if (artifact.roster_count !== artifact.systems.length) fail('roster count');
  const by = new Map(artifact.systems.map(s => [s.key, s]));
  const prior = new Map(previous.artifact.systems.map(s => [s.key, s]));
  if (artifact.n_ranked !== artifact.systems.filter(s => s.ranked).length || artifact.n_ranked !== previous.artifact.n_ranked + V1629_RANKED_NEW_KEYS.length) fail('ranked row count');
  const regularKeys = [...V1629_CARRIED_KEYS, ...V1629_NEW_KEYS];
  const unrankedKeys = [...V1629_UNRANKED_CARRIED_KEYS, ...V1629_UNRANKED_NEW_KEYS];
  if (!sameSet(V1629_UNRANKED_CARRIED_KEYS, V1629_CARRIED_KEYS.filter(k => !prior.get(k)?.ranked))) fail('carried unranked set');

  // --- every full-draw row ----------------------------------------------------------------------
  for (const s of artifact.systems) {
    if (V1629_CARRIED_PRELIMINARY_KEYS.includes(s.key)) continue;   // validated by the predecessor chain
    const spec = V1629_ROW_SPEC[s.key];
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
    if (!finite(s.capability) || Math.abs(s.capability - (s.axes.intelligence + s.axes.calibration) / 2) > 1e-9) fail(`capability is the mean of intelligence and calibration: ${s.key}`);
    if (unrankedKeys.includes(s.key)) {
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
    if (!unpriced && s.cost.usd_per_1000 > V1629_COST_CAP && !V1629_ABOVE_COST_CAP_KEYS.includes(s.key)) fail(`cost above the published ceiling ${s.key}`);
    const d = s.noul_decisive;
    if (!d || d.supported !== true || !Number.isInteger(d.n) || d.n !== 375 || !finite(d.decisive_rate)
        || !(finite(d.acc_among_decisive) || (d.acc_among_decisive === null && d.decisive === 0 && d.decisive_rate === 0))) fail(`noul decisiveness ${s.key}`);
  }

  // --- the new rows ---------------------------------------------------------------------------
  const inherited = Object.keys(previous.proof.new_rows ?? {});
  if (!sameSet(Object.keys(proof.new_rows ?? {}), [...inherited, ...V1629_NEW_KEYS])) fail('new-row provenance coverage');
  for (const k of inherited) same(proof.new_rows[k], previous.proof.new_rows[k], `inherited new-row provenance ${k}`);
  for (const [key, spec] of Object.entries(V1629_ROW_SPEC)) {
    const s = by.get(key), n = proof.new_rows[key];
    for (const field of ['display', 'author', 'repo', 'licence', 'model_pin']) same(s[field], spec[field], `${key} registry ${field} verbatim`);
    if (textSha(s.cost?.basis) !== spec.texts.cost_basis) fail(`${key} registry cost_basis verbatim`);
    if (textSha(s.endpoint_condition) !== spec.texts.endpoint_condition) fail(`${key} registry endpoint_condition verbatim`);
    if (!spec.ranked && textSha(s.not_ranked_because) !== spec.texts.not_ranked_because) fail(`${key} registry ranking reason verbatim`);
    if (s.measured_in !== 'v1.6.29' || s.measurement_date_status !== 'measured' || s.last_measured_on !== '2026-10-18') fail(`${key} measurement stamp`);
    if (s.endpoint_kind !== spec.kind || s.api_flag !== false || s.v16.set !== 'S+P' || s.v16.lane !== 'selfhosted') fail(`${key} lane/endpoint kind`);
    if (s.speed?.adjustment !== 'x2 + 0.15 s (assumption, not measured)') fail(`${key} latency adjustment`);
    if ((s.paid_fast_lane === true) !== V1629_PAID_KEYS.includes(key)) fail(`${key} paid flag`);
    if (s.status.answered_ok !== spec.ok) fail(`${key} completeness`);
    if (spec.ranked) {
      const usd = cost(spec.input_tokens, spec.output_tokens, spec.price.input, spec.price.output);
      if (s.ranked !== true || s.listing !== 'ranked' || s.not_ranked_because || s.ranked_false_reason) fail(`${key} is ranked`);
      if (s.cost?.kind !== 'estimate' || s.cost.usd_per_1000 !== usd || usd > V1629_COST_CAP || s.cost.usage_estimated_rows !== 0) fail(`${key} cost: tariff x own tokens, inside the cap`);
      if (s.cost.basis.includes('OVER THE OFFICIAL COST CAP')) fail(`${key} over-cap disclosure`);
      if (!finite(s.axes.cost) || ['A', 'B', 'C'].some(o => !finite(s.scores?.[o]))) fail(`${key} cost axis and composites`);
      if (Object.values(s.views ?? {}).some(v => !finite(v))) fail(`${key}: a ranked row publishes its presets`);
      for (const ci of [s.composite_ci95, s.v16?.ci95?.composite]) if (!intervalOk(ci, s.scores)) fail(`new row interval does not contain its own point estimate: ${key}`);
    } else {
      if (s.cost?.kind !== 'unpriced' || s.cost.usd_per_1000 !== null || s.axes.cost !== null || ['A', 'B', 'C'].some(o => s.scores?.[o] !== null)) fail(`${key} is unpriced`);
      if (Object.values(s.views ?? {}).some(v => v !== null) || !Object.keys(s.views ?? {}).length) fail(`${key}: a listed-not-ranked row publishes null presets`);
    }
    const capCi = s.v16?.ci95?.capability;
    if (!Array.isArray(capCi) || !(capCi[0] <= s.capability + 1e-9 && s.capability <= capCi[1] + 1e-9)) fail(`new row capability interval does not contain its own point estimate: ${key}`);
    const rowNote = artifact.measurement_notes.find(x => x.startsWith(`${key}: `)) ?? '';
    if (rowNote.length < 600) fail(`row note of ${key} is too thin to be the disclosure it claims to be`);
    for (const fragment of spec.disclosures) if (!rowNote.includes(fragment)) fail(`required disclosure "${fragment}" missing from the note of ${key}`);
    for (const text of [s.author, s.endpoint_condition, s.cost?.basis, s.not_ranked_because, s.licence, rowNote])
      if (typeof text === 'string' && INTERNAL.test(text)) fail(`${key}: personal e-mail or internal path in public text`);
    // provenance receipt
    const copied = spec.raw !== spec.copy;
    if (!n || n.raw_sha256 !== proof.raw_sha256?.[key] || n.raw_sha256 !== spec.copy || n.original_raw_sha256 !== spec.raw
        || n.ar_scoring_copy_sha256 !== (copied ? spec.copy : null) || n.measured_in !== 'v1.6.29'
        || n.rows !== 1500 || n.answered_ok !== spec.ok || n.ranked !== spec.ranked || n.paid_fast_lane !== V1629_PAID_KEYS.includes(key) || n.endpoint_kind !== spec.kind
        || n.lane !== spec.lane || n.treatment !== (spec.ranked ? 'ranked' : 'listed_unpriced') || n.pricing_module_sha256 !== V1629_PRICING_MODULE_SHA256
        || n.custody !== spec.custody || n.handoff !== spec.handoff || n.measured_on !== '2026-10-18') fail(`${key} new-row provenance`);
    same(n.request, V1629_ASKS[key], `${key} request provenance`);
    if (!hex(n.pre_score_review_sha256) || n.review_verdict !== spec.review_verdict || n.refused_long_items !== 0 || n.refused_http_422 !== 0
        || n.post_score_review_sha256 !== null || (!copied) !== (n.scoring_copy_receipt_sha256 === undefined)) fail(`${key} measurement provenance`);
    if (n.input_tokens !== spec.input_tokens || n.output_tokens !== spec.output_tokens) fail(`${key} usage`);
    same(n.status_counts, spec.status_counts, `${key} HTTP status counts`);
    if (spec.ranked) {
      same(n.price_per_million, spec.price, `${key} tariff`);
      const recomputed = cost(n.input_tokens, n.output_tokens, n.price_per_million.input, n.price_per_million.output);
      if (n.usd_per_1000 !== recomputed || n.usd_per_1000 !== s.cost.usd_per_1000 || n.under_cost_cap !== true
          || Math.abs(n.cost_cap_ratio - n.usd_per_1000 / V1629_COST_CAP) > 1e-12) fail(`${key} cost binding`);
    } else if (n.price_per_million !== null || n.usd_per_1000 !== null || n.cost_cap_ratio !== null || n.under_cost_cap !== null) fail(`${key}: an unpriced row carries no price`);
    if (s.speed.p50_s_raw !== n.p50_s_raw || s.speed.p95_s_raw !== n.p95_s_raw) fail(`${key} receipt latency`);
  }
  {
    const n=proof.new_rows[V1629_TORCHCAST_KEY];
    if (n.attention_mode!=='noncausal_full_attention' || n.noul_floor!==0.801 || n.calibration_temperature!==1.0
        || n.network_mode!=='none' || n.cuda_graphs!==false || !hex(n.host_receipt_sha256) || !hex(n.cost_basis_attestation_sha256)
        || n.speed_strictly_comparable_to_v11!==false || n.host!=='Verda FIN-01 A100 SXM4 80GB') fail('torchcast runtime provenance');
    const v=proof.new_rows[V1629_VEGA_KEY];
    if(v.context_cap_tokens!==73728 || v.right_truncated_answered_items!==15 || v.threads!==32 || v.dtype!=='fp32'
       || v.network_mode!=='none' || v.speed_comparable_with_gpu_rows!==false) fail('Vega-U CPU provenance');
    const s=by.get(V1629_VEGA_KEY);
    if(s.scores.A!==0.21547146354638824 || s.capability!==36.52005519443276) fail('Vega-U handoff point estimates');
    for(const o of ['A','B','C','capability']) if(s.ranks[o]<=5) fail('STOP: Vega-U release top five');
  }

  // --- inherited re-price and vendor-status records ------------------------------------------------
  same(proof.repriced_rows, previous.proof.repriced_rows, 'inherited repriced rows unchanged');
  same(proof.vendor_status, previous.proof.vendor_status, 'inherited vendor status unchanged');

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
  for (const key of V1629_CARRIED_PRELIMINARY_KEYS) {
    const a = prior.get(key), b = by.get(key);
    if (!a || !b) fail(`carried preliminary row present ${key}`);
    same(b, a, `carried preliminary row unchanged ${key}`);
    if (b.listing !== JEV_PRELIMINARY_LISTING || b.ranked !== false || b.rank !== null) fail(`carried row stays unranked ${key}`);
    if (categories.systems?.[key]) fail(`the carried A2 measurement has no category cells: ${key}`);
  }

  // --- the carried rows keep every point estimate ----------------------------------------------
  // What may differ on a carried row, and nothing else: its placement (rank, ranks), its bootstrap intervals (composite_ci95,
  // v16.ci95 - new keys shift roster positions and with them the per-row bootstrap seeds) and, only when the API-basis
  // diagnostic moved, v16.raw_on_A. Every move must be named in the release note.
  const releaseNote = artifact.measurement_notes.find(x => x.startsWith('v1.6.29 ADDS ')) ?? '';
  const diagnosticMoved = artifact.G_med_api_basis_P_vs_A !== previous.artifact.G_med_api_basis_P_vs_A;
  const strip = (row, allowRawOnA) => {
    const copy = JSON.parse(JSON.stringify(row));
    delete copy.composite_ci95; delete copy.rank; delete copy.ranks;
    if (copy.v16) { delete copy.v16.ci95; if (allowRawOnA) delete copy.v16.raw_on_A; }
    return copy;
  };
  const clauseStart = releaseNote.indexOf('Carried rows whose intervals moved:');
  if (clauseStart < 0) fail('the release note must carry the "Carried rows whose intervals moved:" clause');
  const intervalNames = releaseNote.slice(clauseStart + 'Carried rows whose intervals moved:'.length).split('DIAGNOSTICS')[0]
    .split(/[,\s]+/).map(x => x.replace(/\.$/, ''));
  const rankClause = releaseNote.split('RANKS:')[1]?.split('CONFIDENCE INTERVALS:')[0] ?? '';
  for (const key of V1629_CARRIED_KEYS) {
    const a = prior.get(key), b = by.get(key);
    if (!a || !b) fail(`carried row present ${key}`);
    const rawOnAMoved = JSON.stringify(a.v16?.raw_on_A) !== JSON.stringify(b.v16?.raw_on_A);
    if (rawOnAMoved && !diagnosticMoved) fail(`raw_on_A moved while the API-basis diagnostic did not: ${key}`);
    if (rawOnAMoved && !releaseNote.includes(`${key}: intelligence`)) fail(`a moved raw_on_A must name its row in the notes: ${key}`);
    same(strip(b, rawOnAMoved), strip(a, rawOnAMoved), `carried row differs outside rank/ranks/composite_ci95/v16.ci95${rawOnAMoved ? '/v16.raw_on_A' : ''}: ${key}`);
    if (V1629_UNRANKED_CARRIED_KEYS.includes(key)) {
      same([b.rank, b.ranks, b.not_ranked_because, b.listing, b.ranked], [a.rank, a.ranks, a.not_ranked_because, a.listing, a.ranked], `the listed-not-ranked row keeps its placement and wording: ${key}`);
    }
    const intervalMoved = !isDeepStrictEqual([b.composite_ci95, b.v16?.ci95], [a.composite_ci95, a.v16?.ci95]);
    if (intervalMoved && !intervalNames.includes(key)) fail(`a moved carried interval must name its row in the release note: ${key}`);
    for (const ci of (b.cost.kind === 'unpriced' ? [] : [b.composite_ci95, b.v16?.ci95?.composite])) {
      if (!intervalOk(ci, b.scores)) fail(`carried row interval does not contain its own point estimate: ${key}`);
    }
    if (a.ranked) {
      for (const o of ['A', 'B', 'C', 'capability']) {
        const shift = V1629_RANKED_NEW_KEYS.filter(nk => (o === 'capability' ? by.get(nk).capability > b.capability
          : artifact.board[o].order.indexOf(nk) < artifact.board[o].order.indexOf(key))).length;
        if (b.ranks[o] !== a.ranks[o] + shift) fail(`carried rank ${o} moved by more than the rows that moved above it: ${key}`);
        if (b.ranks[o] !== a.ranks[o] && !rankClause.includes(`${key} `)) fail(`a moved carried rank must name its row in the release note: ${key}`);
      }
    }
  }
  same(artifact.measurement_notes?.slice(0, previous.artifact.measurement_notes.length), previous.artifact.measurement_notes, 'inherited measurement notes unchanged');
  if (!releaseNote.includes('RANKS') || !releaseNote.includes('CONFIDENCE INTERVALS') || !releaseNote.includes('DIAGNOSTICS')
      || !V1629_NEW_KEYS.every(k => releaseNote.includes(k))) fail('the release note must count rank, interval and diagnostic moves');
  if (!releaseNote.includes('NO pricing change') || !releaseNote.includes('6202ef78')) fail('the release note must say that the pricing module is unchanged');
  if (!artifact.measurement_notes.some(x => x.includes('#18761') && x.includes('LISTED BUT NOT RANKED'))) fail('the non-official Speed disclosure is mandatory');
  if (diagnosticMoved) {
    const values = [previous.artifact.G_med_api_basis_P_vs_A, artifact.G_med_api_basis_P_vs_A].map(String);
    if (!artifact.measurement_notes.some(x => x.includes('API-basis median diagnostic') && values.every(v => x.includes(v)))) fail('a moved API-basis diagnostic must be disclosed with both values');
  }
  const added = artifact.measurement_notes.slice(previous.artifact.measurement_notes.length);
  const boardNotes = added.filter(x => x.startsWith('Board effect'));
  const boardNote = boardNotes.length === 1 ? boardNotes[0] : '';
  const provisional = boardNote.includes('PROVISIONAL-TOPFIVE');
  if (provisional ? process.env.JEVBENCH_V1629_BUILD_PASS1 !== '1'
      : !(boardNote.includes('top-five') && V1629_NEW_KEYS.every(k => boardNote.includes(k)))) fail('board effect: generated top-five note required; provisional build note forbidden');
  if (artifact.G_med !== V1629_FIXED_G_MED || previous.artifact.G_med !== V1629_FIXED_G_MED) fail('frozen v1.6.10 G_med');

  // --- the draw and the proof -----------------------------------------------------------------
  for (const f of ['draw_release', 'freeze_manifest_sha256', 'seed_commitment', 'draw_digests', 'baseline_sha256', 'a2_supplement']) same(artifact.v16?.[f], previous.artifact.v16?.[f], `draw provenance ${f}`);
  if (artifact.v16.draw_release !== V1629_DRAW_RELEASE) fail('draw identity');
  if (proof?.schema_version !== 1 || proof.revision !== 'v1.6.29' || proof.method !== 'jevbench::v1.6'
      || proof.noul_method?.applied !== 'O1S' || proof.bootstrap?.B !== 1000 || proof.bootstrap.seed !== 16) fail('method proof');
  if (proof.draw_release !== artifact.v16.draw_release || proof.freeze_manifest_sha256 !== artifact.v16.freeze_manifest_sha256
      || proof.seed_commitment !== artifact.v16.seed_commitment || proof.baseline_sha256 !== artifact.v16.baseline_sha256
      || !hex(proof.cost_basis_sha256) || !hex(proof.registry_sha256)) fail('draw/cohort binding');
  same(artifact.v16.draw_digests, proof.draw_digests, 'draw digests bound to the proof');
  if (proof.pricing_module_sha256 !== V1629_PRICING_MODULE_SHA256 || proof.predecessor_pricing_module_sha256 !== V1628_PRICING_MODULE_SHA256
      || previous.proof.pricing_module_sha256 !== V1628_PRICING_MODULE_SHA256 || V1629_PRICING_MODULE_SHA256 !== V1628_PRICING_MODULE_SHA256) fail('pricing module stays in force (no re-freeze)');
  if (proof.abandoned_draw_note !== null) fail('abandoned-draw disclosure');
  // v1.6.28 is live and sealed: the binding must be a hash
  if (!hex(proof.predecessor_seal_sha256)) fail('predecessor seal binding');
  for (const k of ['refreshed_preview_go_card', 'refreshed_preview_approval', 'a2_supplement', 'scorer_sources_sha256']) same(proof[k], previous.proof[k], `inherited proof field ${k}`);
  if (typeof proof.authority !== 'string' || !proof.authority.startsWith(previous.proof.authority + ' NEW in v1.6.29:')) fail('inherited authority unchanged');
  const newAuthority = proof.authority.slice(previous.proof.authority.length);
  for (const fragment of [...V1629_NEW_KEYS, '#21378', '#21356', '#21201', '#21213', '#21385', 'RANKED', '6202ef78', 'NO pricing re-freeze', V1629_GO_QUOTE]) {
    if (!newAuthority.includes(fragment)) fail(`new publication authority: ${fragment}`);
  }
  const marker = approvalOf(proof, artifact, boardNote, provisional);
  if (!newAuthority.includes(marker)) fail('publication approval authority binding');
  if (!sameSet(Object.keys(proof.raw_sha256 ?? {}), regularKeys)) fail('raw-output coverage');
  same(Object.fromEntries(V1629_CARRIED_KEYS.map(k => [k, proof.raw_sha256[k]])), previous.proof.raw_sha256, 'inherited raw-output hashes unchanged');
  const proofRows = proof.systems;
  if (!Array.isArray(proofRows) || !sameSet(proofRows.map(x => x.key), regularKeys)) fail('system proof coverage');
  const priorProof = new Map(previous.proof.systems.map(r => [r.key, r]));
  for (const x of artifact.systems) {
    if (V1629_CARRIED_PRELIMINARY_KEYS.includes(x.key)) continue;
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
    if (V1629_ROW_SPEC[x.key] && p.source_review_sha256 !== proof.new_rows[x.key].pre_score_review_sha256) fail(`independent review binding ${x.key}`);
    if (typeof p.source_review_note !== 'string' || p.source_review_note.length < 20) fail(`source review note ${x.key}`);
    const q = priorProof.get(x.key);
    if (q) for (const f of ['measured_by', 'source_review_sha256', 'source_review_note', 'raw_sha256', 'answered_ok']) same(p[f], q[f], `proof row provenance unchanged ${x.key}.${f}`);
  }
  // --- the frozen median, recomputable from its four v1.6.10 members --------------------------
  const members = proof.field_median?.members;
  if (proof.field_median?.g_med_fixed !== true || proof.g_med_fixed_from?.revision !== 'v1.6.10'
      || proof.g_med_fixed_from.G_med !== V1629_FIXED_G_MED || proof.g_med_fixed_from.baseline_sha256 !== proof.baseline_sha256) fail('frozen field median provenance');
  if (!Array.isArray(members) || !sameSet(members.map(m => m.key), V1610_KEYS)
      || !members.every(m => finite(m.gap) && by.get(m.key)?.intelligence?.gap === m.gap)) fail('field median cohort');
  const gaps = members.map(m => m.gap).sort((a, b) => a - b);
  const median = gaps.length % 2 ? gaps[(gaps.length - 1) / 2] : (gaps[gaps.length / 2 - 1] + gaps[gaps.length / 2]) / 2;
  if (Math.abs(artifact.G_med - median) > 1e-9 || proof.field_median.G_med !== artifact.G_med) fail('cohort G_med');
  if (artifact.G_med_flag_gt10 !== (artifact.G_med > 10)) fail('G_med flag consistency');
  if (Math.abs(proof.gap_penalty_threshold - (artifact.G_med + 8)) > 1e-6) fail('gap penalty threshold');

  // --- categories ------------------------------------------------------------------------------
  if (categories?.revision !== 'v1.6.29' || categories.provisional !== false
      || categories.source_results_sha256 !== artifact.source_sha256
      || categories.draw_release !== artifact.v16.draw_release
      || categories.results_sha256 !== manifest.files.results.sha256) fail('category source binding');
  const dims = v1629Dims(categories);
  if (!('topics' in categories) && !artifact.measurement_notes.some(x => x.includes('topic'))) fail('a release without the topic radar must say so in its measurement notes');
  for (const field of ['live_category_cells', 'supplement', 'language_cells', 'unavailable']) if (field in categories) fail(`historical category overlay ${field}`);
  for (const field of ['lane_note', 'metric', 'labelling']) if (typeof categories[field] !== 'string' || !categories[field].trim()) fail(`category field ${field}`);
  if (!Array.isArray(categories.rules) || !categories.rules.length) fail('category rules');
  if (!categories.lanes || !sameSet(Object.keys(categories.lanes), regularKeys)) fail('category lanes');
  for (const key of regularKeys) if (categories.lanes[key] !== (V1629_ROW_SPEC[key]?.lane ?? previous.categories.lanes[key])) fail(`category lane ${key}`);
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
  for (const key of V1629_CARRIED_KEYS) same(categories.systems[key], previous.categories.systems[key], `inherited category cells ${key}`);
  return { artifact, categories, proof, manifest };
}

async function load(path, root) {
  const bytes = await readFile(`${root}/${path}`);
  const text = bytes.toString('utf8'); excluded(text);
  return { value: JSON.parse(text), bytes, sha256: createHash('sha256').update(bytes).digest('hex') };
}

/** Missing publication manifest means the version is unavailable; invalid published evidence fails closed. */
export async function readOptionalJevbenchV1629Release(root = process.cwd()) {
  let publication;
  try { publication = await load(V1629_MANIFEST, root); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  const previous = await readOptionalJevbenchV1628Release(root);
  if (!previous) fail('v1.6.29 needs the published v1.6.28 release it extends');
  const previousManifest = await load(`${V1629_ROOT}/jevbench-v1.6.28-publication.json`, root);
  const bundle = Object.fromEntries(await Promise.all(Object.entries(files).map(async ([k, path]) => [k, await load(path, root)])));
  for (const [key, value] of Object.entries(bundle)) if (publication.value.files?.[key]?.sha256 !== value.sha256) fail(`bytes hash ${key}`);
  if (bundle.history.sha256 !== previous.historical.sha256) fail('immutable history bytes');
  if (bundle['history-carry'].sha256 !== previous.historical.carrySha256) fail('immutable carry bytes');
  validateJevbenchV1629Bundle({ manifest: publication.value, artifact: bundle.results.value, categories: bundle.categories.value,
    proof: bundle.proof.value, previous, previousManifestSha256: previousManifest.sha256 });
  return { artifact: bundle.results.value, bytes: bundle.results.bytes, sha256: bundle.results.sha256,
           categories: bundle.categories.value, categoriesSha256: bundle.categories.sha256,
           proof: bundle.proof.value, proofSha256: bundle.proof.sha256, manifest: publication.value,
           historical: previous.historical };
}

/** Optional navigation must never make an older board depend on fresh publication health. */
export async function hasPublishedJevbenchV1629Release(root = process.cwd(), log = console.error) {
  try { return Boolean(await readOptionalJevbenchV1629Release(root)); }
  catch { log('JevBench v1.6.29 navigation omitted: publication validation failed'); return false; }
}

/** Board input: this release's own rows, with no historical overlay mixed in. */
export function v1629BoardInput(release) {
  return { artifact: release.artifact, categories: release.categories };
}
