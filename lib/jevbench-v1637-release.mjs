// v1.6.37: cost restatement of h2o-lightning-4b and kahn1 (USD 0.04 -> 0.03 per 1M input, the frozen Qwen/Qwen3.5-4B reference); no new measurement, no row measured, no re-freeze; carried rows keep every point estimate and interval.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { validateJevbenchV16Release, mentionsPrivateSystem, JEVBENCH_V16_EXCLUDED_KEYS, readJevbenchV161Release } from './jevbench-v16-release.mjs';
import { validateCategoryArtifact } from './jevbench-categories.mjs';
import { V1610_KEYS } from './jevbench-v1610-release.mjs';
import { costScore } from './jevbench-v12-score.mjs';
import { readOptionalJevbenchV1636Release, V1636_ROOT, V1636_CARRIED_KEYS, V1636_NEW_KEYS, V1636_UNRANKED_CARRIED_KEYS,
         V1636_CARRIED_PRELIMINARY_KEYS, V1636_ABOVE_COST_CAP_KEYS, V1636_PRICING_MODULE_SHA256, v1636Dims } from './jevbench-v1636-release.mjs';
import { JEV_PRELIMINARY_LISTING } from './jevbench-scope.mjs';

export const V1637_ROOT = V1636_ROOT;
export const V1637_MANIFEST = `${V1637_ROOT}/jevbench-v1.6.37-publication.json`;
export const V1637_FILE_KEYS = ['results', 'categories', 'proof', 'history', 'history-carry'];
const files = Object.fromEntries(V1637_FILE_KEYS.map(k => [k, `${V1637_ROOT}/jevbench-v1.6.37-${k}.json`]));
export const V1637_H2O = 'h2o-lightning-4b', V1637_KAHN = 'kahn1';
/** The two v1.6.1 rows whose cost is restated here; they are the only rows first present in this release's artifact. */
export const V1637_REPRICED_KEYS = [V1637_H2O, V1637_KAHN].sort();
export const V1637_NEW_KEYS = [...V1637_REPRICED_KEYS];
export const V1637_RANKED_NEW_KEYS = [...V1637_NEW_KEYS];
export const V1637_UNRANKED_NEW_KEYS = [];
/** Every full-draw row of v1.6.36. */
export const V1637_CARRIED_KEYS = [...V1636_CARRIED_KEYS, ...V1636_NEW_KEYS];
export const V1637_CARRIED_PRELIMINARY_KEYS = [...V1636_CARRIED_PRELIMINARY_KEYS];
export const V1637_UNRANKED_CARRIED_KEYS = [...V1636_UNRANKED_CARRIED_KEYS];
export const V1637_ABOVE_COST_CAP_KEYS = [...V1636_ABOVE_COST_CAP_KEYS];
export const V1637_FIXED_G_MED = 9.839526770355711;
export const V1637_COST_CAP = 0.06459465517241379;
export const V1637_DRAW_RELEASE = 'v1.6-regular-20261012';
/** No re-freeze: the module in force since the 20 Oct additive re-freeze (1f4d1f7b) is the module of v1.6.36 and of this release. */
export const V1637_PRICING_MODULE_SHA256 = V1636_PRICING_MODULE_SHA256;
export const V1637_GO_QUOTE = 'I really want all of the models we have evaluated to be online (even if they land in #5) on both JevBench and ImageJevBench';
export const V1637_GO = { channel: 'direct-message', where: 'laptop chat', date: '2026-10-16', recorded_at: '2026-10-16T12:50Z',
  recorded_in: 'DECISIONS.md 2026-10-16 12:50 UTC', quote: V1637_GO_QUOTE };
export const V1637_ASKS = {"h2o-lightning-4b": {"admission": "v1.6.1 addendum a8", "handoff": "price check of 21 Oct 2026", "key": "h2o-lightning-4b", "relay": "Pricing correction reported by the model author"}, "kahn1": {"admission": "v1.6.1 addendum a8", "handoff": "price check of 21 Oct 2026", "key": "kahn1", "relay": "Same defect found in the price check of the model author's report"}};
export const V1637_PIN = 0.030000000000000002, V1637_POUT = 0.15, V1637_OLD_PIN = 0.04;
export const V1637_CORRECTION = "Corrected in v1.6.37, no new measurement: the earlier cost of this row used USD 0.04 per 1M input; the frozen reference for Qwen/Qwen3.5-4B is USD 0.03 per 1M input and USD 0.15 per 1M output (DeepInfra, 25 Sep 2026 snapshot).";
const scorerUsd = (tin, tout, pin, pout, n) => 1000 * (tin * pin + tout * pout) / 1e6 / n;   // score_v16.common_basis_usd form

/** Each restated row: the published v1.6.1 row it replaces, its usage, its raw output and the SHA-256 of its corrected cost text. */
export const V1637_ROW_SPEC = Object.freeze({"h2o-lightning-4b": {"axes_cost": 64.04698652895101, "ci_seed": 44, "decisions": 1624, "measured_on": "2026-10-04", "old_usd": 0.021055837438423645, "raw": "4b19dbf4aa30baf2cf003b507340ecd863328c7185dd03cbe92bd71c3f95fd7f", "scores": {"A": 73.82224524014528, "B": 70.5813765538927, "C": 73.82224524014528}, "texts": {"cost_basis": "6f89572987f680bf0e278e887faad69b8eb2e0fcac3b4b49c18097f5dc2a1385", "previous_cost_basis": "3c0f8dee707d566206541beda87232640067dcdeea219a456b81a968a19ef8ac"}, "tokens": 854867, "usd": 0.015791878078817736}, "kahn1": {"axes_cost": 50.12545250055582, "ci_seed": 60, "decisions": 1624, "measured_on": "2026-10-07", "old_usd": 0.06129480295566502, "raw": "878114c9614fa446fdf4f0b19f3f376f1e2d56189cb88d917850cee9b490f54c", "scores": {"A": 37.0242246815327, "B": 33.799163379528274, "C": 25.711267139953264}, "texts": {"cost_basis": "4cee718964c9c2b3b98fc5b08449fe695942be41f9cd7d41982575e1571b065f", "previous_cost_basis": "33e7cff6477df64be6498640dc9b602b5476d191c5af6b798b0c63a4c94f07f3"}, "tokens": 2488569, "usd": 0.04597110221674877}});

const hex = v => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const finite = v => typeof v === 'number' && Number.isFinite(v);
const near = (a, b) => finite(a) && finite(b) && Math.abs(a - b) <= 1e-9;
const textSha = v => typeof v === 'string' ? createHash('sha256').update(v, 'utf8').digest('hex') : null;
const fail = message => { throw new Error(`JevBench v1.6.37: ${message}`); };
const sameSet = (a, b) => a.length === b.length && JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
const same = (a, b, message) => { if (!isDeepStrictEqual(a, b)) fail(message); };
const INTERNAL = /[\w.+-]+@[\w-]+\.[a-z]{2,}|\/home\/|\bworkers\/|\br1\d\d\/|\bpod id\b|PREREG|batchA|batchBCD|\bR12\d\b|_wrap\.py|bh-submit|ff14417c|UNLISTED/i;
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
// score_v15.composite and the sort-view weights, exactly as lib/jevbench-cohort-merge.mjs mirrors them.
const AXES = ['intelligence', 'calibration', 'speed', 'cost'];
const SORT_VIEWS = { 'Intelligence only': [1, 0, 0, 0], 'Emphasis on Accuracy 60:20:20': [0.6, 0, 0.2, 0.2], 'Emphasis on Speed 20:60:20': [0.2, 0, 0.6, 0.2],
  'Emphasis on Cost 20:20:60': [0.2, 0, 0.2, 0.6], 'Balanced 33:33:33': [1 / 3, 0, 1 / 3, 1 / 3] };
function composite(axes, weights, gate) {
  const sel = Object.entries(weights).filter(([, w]) => w > 0).map(([a, w]) => [axes[a], w]);
  if (!sel.length || sel.some(([v]) => v == null)) return null;
  let score = sel.some(([v]) => v <= 0) ? 0 : sel.reduce((t, [, w]) => t + w, 0) / sel.reduce((t, [v, w]) => t + w / v, 0);
  const i = axes.intelligence;
  if (i != null && i < gate) score *= (Math.max(0, i) / gate) ** 2;
  for (const a of ['speed', 'cost']) if (axes[a] != null && axes[a] < 50) score *= (Math.max(0, axes[a]) / 50) ** 2;
  return score;
}

/** The keys the generated board note names as the cause of its top-five changes. */
function boardCauses(boardNote) {
  const m = boardNote.match(/Top-five changes caused by: (.+?)(?: \(|\. )/);
  return m ? m[1].split(',').map(x => x.trim()).filter(Boolean) : [];
}

/** How the publication approval arrived (free rows: a changed top five needs the preview card). Returns the marker the authority must carry. */
const LAST_CARD = 17911n;
const NO_CHANGE_BOARD = '0 of 40 top-five lists change';
const NO_CARD_TEXT = 'no top-five preview card';
const NO_CARD_MARKER = 'Florian publication approval: standing GO, 16 Oct 2026 12:50Z; no preview card; no button tap.';
function approvalOf(proof, artifact, boardNote, provisional) {
  const pa = proof.publication_approval;
  same(pa?.go, V1637_GO, 'publication GO provenance');
  same(pa?.asks, V1637_ASKS, 'request provenance');
  if (provisional && process.env.JEVBENCH_V1637_BUILD_PASS1 === '1') return 'Florian top-five preview approval: PLACEHOLDER.';
  if (JSON.stringify(proof).includes('PLACEHOLDER') || JSON.stringify(artifact).includes('PLACEHOLDER')) fail('approval placeholder not filled');
  const notes = artifact.measurement_notes.filter(n => n.startsWith('Publication of v1.6.37:'));
  if (notes.length !== 1) fail('public note must describe how the approval arrived');
  const note = notes[0];
  if (!note.includes(V1637_GO.recorded_in)) fail('public note must describe how the approval arrived');
  const noChange = boardNote.includes(NO_CHANGE_BOARD);
  const causes = boardCauses(boardNote);
  const claimsCard = /Telegram card #\d/.test(note) || /selected "[^"]*" on Telegram card/.test(note);
  if (pa.top_five_effect === 'none') {
    if (!provisional && !noChange) fail('a no-card approval needs the generated no-change board note');
    if (pa.top_five_preview !== null || pa.button_tap !== false || Object.keys(pa).sort().join() !== 'asks,button_tap,go,top_five_effect,top_five_preview') fail('no-card approval provenance');
    if (!note.includes(NO_CARD_TEXT) || claimsCard) fail('public note must not claim a preview card');
    return NO_CARD_MARKER;
  }
  if (noChange || provisional || !causes.length || pa.top_five_effect !== 'changes') fail('approval and top-five effect disagree');
  same([...pa.top_five_changed_by ?? []].sort(), [...causes].sort(), 'the approval must name exactly the rows the board note says changed the top fives');
  if (!causes.every(k => V1637_REPRICED_KEYS.includes(k))) fail('only a restated row can change a top five in this release');
  const a = pa.top_five_preview;
  const id = a?.card_id;
  const canonical = typeof id === 'string' && /^\d+$/.test(id) && BigInt(id).toString() === id;
  if (!canonical || BigInt(id) <= LAST_CARD || typeof a.selection !== 'string' || !a.selection.trim() || !hex(a.preview_png_sha256)) fail('top-five preview approval card');
  if (!['telegram-button', 'direct-message'].includes(a.channel) || typeof a.button_tap !== 'boolean' || pa.button_tap !== a.button_tap
      || typeof a.recorded_at !== 'string' || !a.recorded_at || typeof a.recorded_in !== 'string' || !a.recorded_in
      || (a.channel === 'telegram-button') !== a.button_tap
      || Object.keys(pa).sort().join() !== 'asks,button_tap,go,top_five_changed_by,top_five_effect,top_five_preview') fail('approval channel and provenance');
  const claimsTap = /selected "[^"]*" on Telegram card/.test(note);
  const saysNoTap = note.includes("The card's own button was not pressed.");
  if ((a.button_tap ? (!claimsTap || saysNoTap) : (claimsTap || !saysNoTap)) || !note.includes(`Telegram card #${id}`)
      || !note.includes(a.preview_png_sha256)) fail('public note must describe how the approval arrived');
  return a.button_tap
    ? `Florian top-five preview approval: Telegram card #${id}; selected "${a.selection}" (${a.recorded_at}); preview PNG SHA-256 ${a.preview_png_sha256}.`
    : `Florian top-five preview approval: ${a.channel} ${a.recorded_at}, recorded as Telegram card #${id} = "${a.selection}" (${a.recorded_in}; no button tap); preview PNG SHA-256 ${a.preview_png_sha256}.`;
}

export function validateJevbenchV1637Bundle({ manifest, artifact, categories, proof, previous, previousManifestSha256, base161 }) {
  for (const value of [manifest, artifact, categories, proof]) {
    publicOnly(value);
    excluded(JSON.stringify(value));
  }
  // --- publication identity ------------------------------------------------------------------
  if (manifest?.schema_version !== 1 || manifest.revision !== 'v1.6.37' || manifest.status !== 'published' || manifest.provisional !== false) fail('publication status');
  if (manifest.review?.verdict !== 'PASS' || !manifest.review.engine || manifest.review.engine === 'PENDING' || !hex(manifest.review.receipt_sha256)) fail('independent release review');
  if (!previous || previous.manifest?.revision !== 'v1.6.36' || previous.proof?.revision !== 'v1.6.36') fail('validated v1.6.36 predecessor required');
  same(manifest.predecessor, { revision: 'v1.6.36', publication_sha256: previousManifestSha256 }, 'predecessor binding');
  for (const k of ['historical_revision', 'historical_results_sha256', 'historical_carry_sha256']) same(manifest[k], previous.manifest[k], `historical binding ${k}`);
  for (const [key, path] of Object.entries(files)) if (manifest.files?.[key]?.path !== path || !hex(manifest.files[key].sha256)) fail(`file binding ${key}`);
  if (base161?.revision !== 'v1.6.1') fail('the frozen v1.6.1 base artifact is required');
  const baseRows = new Map(base161.systems.map(s => [s.key, s]));

  // --- artifact identity and the cohort ------------------------------------------------------
  if (artifact?.revision !== 'v1.6.37' || artifact.run_kind !== 'regular-queue' || artifact.status !== 'published'
      || artifact.provisional !== false || artifact.noul_method?.applied !== 'O1S') fail('regular-queue identity');
  validateJevbenchV16Release({ ...artifact, revision: 'v1.6.1', run_kind: 'scheduled-refresh' }, 'v1.6.1');
  if (artifact.bootstrap?.B !== 1000 || artifact.bootstrap.bootstrap_seed !== 16 || artifact.bootstrap.g_med_fixed !== true) fail('artifact bootstrap');
  const allKeys = artifact.systems.map(s => s.key);
  const newKeys = allKeys.filter(k => !V1637_CARRIED_KEYS.includes(k) && !V1637_CARRIED_PRELIMINARY_KEYS.includes(k)).sort();
  if (!sameSet(newKeys, V1637_NEW_KEYS)) fail(`exactly the restated rows: ${newKeys}`);
  if (!sameSet(allKeys, [...V1637_CARRIED_KEYS, ...V1637_NEW_KEYS, ...V1637_CARRIED_PRELIMINARY_KEYS])) fail('exact cohort');
  if (artifact.systems.length !== previous.artifact.systems.length + V1637_NEW_KEYS.length) fail('exactly the restated rows');
  if (artifact.not_measured.length) fail('regular cohort has no not-measured rows');
  if (artifact.roster_count !== artifact.systems.length) fail('roster count');
  const by = new Map(artifact.systems.map(s => [s.key, s]));
  const prior = new Map(previous.artifact.systems.map(s => [s.key, s]));
  if (artifact.n_ranked !== artifact.systems.filter(s => s.ranked).length || artifact.n_ranked !== previous.artifact.n_ranked + V1637_RANKED_NEW_KEYS.length) fail('ranked row count');
  const regularKeys = [...V1637_CARRIED_KEYS];
  const proofKeys = [...regularKeys, ...V1637_NEW_KEYS];
  const unrankedKeys = [...V1637_UNRANKED_CARRIED_KEYS, ...V1637_UNRANKED_NEW_KEYS];
  if (!sameSet(V1637_UNRANKED_CARRIED_KEYS, V1637_CARRIED_KEYS.filter(k => !prior.get(k)?.ranked))) fail('carried unranked set');

  // --- every full-draw row ----------------------------------------------------------------------
  for (const s of artifact.systems) {
    if (V1637_CARRIED_PRELIMINARY_KEYS.includes(s.key)) continue;   // validated by the predecessor chain
    const isNew = V1637_NEW_KEYS.includes(s.key);
    const expectedLane = isNew ? baseRows.get(s.key)?.v16?.lane : prior.get(s.key).v16.lane;
    if (s.v16?.lane !== expectedLane) fail(`lane ${s.key}`);
    if (s.status?.rows !== 1500 || s.status.status !== 'complete') fail(`complete 1500 rows ${s.key}`);
    if (s.full_coverage !== true) fail(`full coverage ${s.key}`);
    const unpriced = s.cost?.kind === 'unpriced';
    if (unpriced && !(isNew ? false : prior.get(s.key).cost.kind === 'unpriced')) fail(`only a row with a stated unpriced ruling may be unpriced: ${s.key}`);
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
    if (!unpriced && s.cost.usd_per_1000 > V1637_COST_CAP && !V1637_ABOVE_COST_CAP_KEYS.includes(s.key)) fail(`cost above the published ceiling ${s.key}`);
    const d = s.noul_decisive;
    // The two restated v1.6.1 rows carry the published v1.6.1 figures (supported, rate, accuracy, valid; no count n), which the equality with the base row pins.
    if (isNew ? (!d || d.supported !== true || !Number.isInteger(d.valid) || !finite(d.decisive_rate) || !finite(d.acc_among_decisive))
        : (!d || d.supported !== true || !Number.isInteger(d.n) || d.n !== 375 || !finite(d.decisive_rate)
        || !(finite(d.acc_among_decisive) || (d.acc_among_decisive === null && d.decisive === 0 && d.decisive_rate === 0)))) fail(`noul decisiveness ${s.key}`);
  }

  // --- the restated rows: the published v1.6.1 row with its cost chain replaced and nothing else ---------------
  if (Object.keys(proof.new_rows ?? {}).length !== Object.keys(previous.proof.new_rows ?? {}).length) fail('new-row provenance coverage');
  same(proof.new_rows, previous.proof.new_rows, 'no row is newly measured: inherited new-row provenance unchanged');
  const rr = proof.repriced_rows ?? {};
  const inheritedRepriced = Object.keys(previous.proof.repriced_rows ?? {});
  if (!sameSet(Object.keys(rr), [...inheritedRepriced, ...V1637_REPRICED_KEYS])) fail('repriced-row provenance coverage');
  for (const k of inheritedRepriced) same(rr[k], previous.proof.repriced_rows[k], `inherited repriced row ${k}`);
  for (const [key, spec] of Object.entries(V1637_ROW_SPEC)) {
    const s = by.get(key), b = baseRows.get(key), n = rr[key];
    if (!b || !b.ranked || b.listing !== 'ranked') fail(`${key}: the v1.6.1 base row must be a ranked row`);
    if (s.supersedes_base_row !== 'v1.6.1' || s.repriced_in !== 'v1.6.37' || s.measured_in !== 'v1.6.1') fail(`${key} supersession and re-price markers`);
    if (s.last_measured_on !== spec.measured_on || s.measurement_date_status !== b.measurement_date_status) fail(`${key} measurement stamp is the original one`);
    const strip = (row) => {
      const c = JSON.parse(JSON.stringify(row));
      for (const f of ['cost', 'scores', 'views', 'jevbench_score', 'composite_ci95', 'rank', 'ranks', 'supersedes_base_row', 'repriced_in']) delete c[f];
      delete c.axes?.cost; delete c.v16?.ci95?.composite;
      return c;
    };
    same(strip(s), strip(b), `${key}: everything except cost, Cost axis, composites, intervals and placement equals the published v1.6.1 row`);
    if (s.cost?.kind !== 'estimate' || s.cost.common_basis !== null || s.cost.usage_estimated_rows !== 0) fail(`${key} cost object`);
    const recomputed = scorerUsd(spec.tokens, 0, V1637_PIN, V1637_POUT, spec.decisions);
    if (s.cost.usd_per_1000 !== spec.usd || spec.usd !== recomputed || s.cost.usd_per_1000 > V1637_COST_CAP) fail(`${key} cost: input tokens x the frozen Qwen/Qwen3.5-4B tariff / decisions`);
    if (textSha(s.cost.basis) !== spec.texts.cost_basis || !s.cost.basis.includes(V1637_CORRECTION)) fail(`${key} registry cost_basis verbatim, with the correction sentence`);
    if (textSha(b.cost.basis) !== spec.texts.previous_cost_basis || b.cost.usd_per_1000 !== spec.old_usd) fail(`${key} the published v1.6.1 cost is the one being corrected`);
    if (!near(s.axes.cost, costScore(s.cost.usd_per_1000))) fail(`${key} Cost axis does not follow from the price`);
    for (const [o, { weights, intelligence_floor }] of Object.entries(artifact.options)) {
      if (!near(composite(s.axes, Object.fromEntries(AXES.map(a => [a, weights[a] / 100])), intelligence_floor), s.scores[o])) fail(`${key} score ${o} does not follow from the axes`);
    }
    if (s.jevbench_score !== s.scores.A) fail(`${key} headline score`);
    for (const [name, w] of Object.entries(SORT_VIEWS)) if (!near(composite(s.axes, Object.fromEntries(AXES.map((a, i) => [a, w[i]])), 50), s.views[name])) fail(`${key} view ${name}`);
    same(s.scores, spec.scores, `${key} corrected point estimates`);
    if (s.axes.cost !== spec.axes_cost) fail(`${key} corrected Cost axis`);
    for (const ci of [s.composite_ci95, s.v16?.ci95?.composite]) if (!intervalOk(ci, s.scores)) fail(`restated row interval does not contain its own point estimate: ${key}`);
    same(s.composite_ci95, s.v16.ci95.composite, `${key} interval fields agree`);
    if (s.v16.ci95.seed !== spec.ci_seed || s.v16.ci95.B !== 1000) fail(`${key} interval seed`);
    const capCi = s.v16?.ci95?.capability;
    if (!Array.isArray(capCi) || !(capCi[0] <= s.capability + 1e-9 && s.capability <= capCi[1] + 1e-9)) fail(`restated row capability interval does not contain its own point estimate: ${key}`);
    const rowNote = artifact.measurement_notes.find(x => x.startsWith(`${key}: `)) ?? '';
    if (rowNote.length < 600) fail(`row note of ${key} is too thin to be the disclosure it claims to be`);
    for (const fragment of ['REPRICED row, no new measurement', 'COST CORRECTION', V1637_CORRECTION, spec.raw]) if (!rowNote.includes(fragment)) fail(`required disclosure "${fragment}" missing from the note of ${key}`);
    for (const text of [s.author, s.endpoint_condition, s.cost?.basis, s.licence, rowNote]) if (typeof text === 'string' && INTERNAL.test(text)) fail(`${key}: personal e-mail or internal path in public text`);
    // provenance receipt
    if (!n || n.no_new_measurement !== true || n.repriced_in !== 'v1.6.37' || n.supersedes_base_row !== 'v1.6.1' || n.measured_in !== 'v1.6.1' || n.last_measured_on !== spec.measured_on
        || n.raw_sha256 !== spec.raw || n.raw_sha256 !== proof.raw_sha256?.[key]) fail(`${key} re-price provenance`);
    if (n.input_tokens !== spec.tokens || n.output_tokens !== 0 || n.decisions !== spec.decisions) fail(`${key} usage`);
    same(n.price_per_million, { input: V1637_PIN, output: V1637_POUT }, `${key} tariff`);
    same(n.previous_price_per_million, { input: V1637_OLD_PIN, output: 0 }, `${key} previous tariff`);
    if (n.usd_per_1000 !== s.cost.usd_per_1000 || n.previous_usd_per_1000 !== b.cost.usd_per_1000 || n.under_cost_cap !== true || n.treatment !== 'ranked'
        || Math.abs(n.cost_cap_ratio - n.usd_per_1000 / V1637_COST_CAP) > 1e-12 || Math.abs(n.previous_cost_cap_ratio - n.previous_usd_per_1000 / V1637_COST_CAP) > 1e-12) fail(`${key} cost binding`);
    if (n.reference?.key !== 'deepinfra:Qwen/Qwen3.5-4B' || n.reference.pricing_module_sha256 !== V1637_PRICING_MODULE_SHA256 || n.scorer_sha256 !== '02132271117653e6302c509232a581d0094f0e78eac8b1bfc67596fd5d5097e9'
        || typeof n.ci_method !== 'string' || !n.ci_method.startsWith('exact:')) fail(`${key} reference, scorer and interval method`);
    same(n.previous, { cost: b.cost, axes: b.axes, scores: b.scores, composite_ci95: b.composite_ci95, views: b.views, jevbench_score: b.jevbench_score, rank: b.rank, ranks: b.ranks, composite_basis_text_sha256: spec.texts.previous_cost_basis }, `${key} previous proof state`);
    same(n.current, { cost: s.cost, axes: s.axes, scores: s.scores, composite_ci95: s.composite_ci95, views: s.views, jevbench_score: s.jevbench_score, rank: s.rank, ranks: s.ranks, cost_basis_text_sha256: spec.texts.cost_basis }, `${key} current proof state`);
  }

  for (const row of artifact.systems) {
    if (row.key === 'seb-9b') {
      if (row.supersedes_base_row !== 'v1.6.1') fail('Seb must supersede exactly v1.6.1');
    } else if (V1637_REPRICED_KEYS.includes(row.key)) {
      if (row.supersedes_base_row !== 'v1.6.1') fail('a restated row must supersede exactly v1.6.1');
    } else if ('supersedes_base_row' in row) fail('only Seb and the two restated rows may supersede a base row');
    if (!V1637_REPRICED_KEYS.includes(row.key) && row.repriced_in === 'v1.6.37') fail('only the two restated rows are re-priced in this release');
  }
  same(proof.vendor_status, previous.proof.vendor_status, 'inherited vendor status unchanged');

  if (artifact.sample?.open !== 300 || artifact.sample.sealed !== 1200 || artifact.sample.total !== 1500) fail('scoring denominator');
  if (artifact.v16?.counts?.S !== 1200 || artifact.v16.counts.P !== 300 || artifact.v16.counts.selfhosted_input !== 1500) fail('fresh input counts');
  const ranked = artifact.systems.filter(x => x.ranked).map(x => x.key).sort();
  for (const o of ['A', 'B', 'C', 'capability']) if (!sameSet(artifact.board?.[o]?.order ?? [], ranked)) fail(`board membership ${o}`);
  for (const o of ['A', 'B', 'C']) {
    const sc = (artifact.board[o].order).map(k => by.get(k).scores[o]);
    if (sc.some((v, i) => i && v > sc[i - 1])) fail(`board order ${o} is sorted by score`);
  }
  const capabilityOrder = artifact.systems.filter(x => x.ranked).slice().sort((x, y) => y.capability - x.capability).map(x => x.key);
  for (const x of artifact.systems) {
    if (!x.ranked) continue;
    for (const o of ['A', 'B', 'C']) if (x.ranks?.[o] !== (artifact.board?.[o]?.order ?? []).indexOf(x.key) + 1) fail(`rank ${o} is not the board position: ${x.key}`);
    if (x.ranks?.capability !== capabilityOrder.indexOf(x.key) + 1) fail(`capability rank is not the capability order: ${x.key}`);
    if (x.rank !== x.ranks.A) fail(`rank is not the headline rank: ${x.key}`);
  }
  for (const key of unrankedKeys) if (ranked.includes(key)) fail('a row without an official placement may not enter a ranked board');

  // --- the A2 alias is carried through unchanged ---------------------------------------------
  for (const key of V1637_CARRIED_PRELIMINARY_KEYS) {
    const a = prior.get(key), b = by.get(key);
    if (!a || !b) fail(`carried preliminary row present ${key}`);
    same(b, a, `carried preliminary row unchanged ${key}`);
    if (b.listing !== JEV_PRELIMINARY_LISTING || b.ranked !== false || b.rank !== null) fail(`carried row stays unranked ${key}`);
    if (categories.systems?.[key]) fail(`the carried A2 measurement has no category cells: ${key}`);
  }

  // --- the carried rows keep every stored value; only their placement may move -----------------------
  const releaseNote = artifact.measurement_notes.find(x => x.startsWith('v1.6.37 RESTATES ')) ?? '';
  const strip = row => { const c = JSON.parse(JSON.stringify(row)); delete c.rank; delete c.ranks; return c; };
  const rankClause = releaseNote.split('RANKS:')[1]?.split('CONFIDENCE INTERVALS:')[0] ?? '';
  for (const key of V1637_CARRIED_KEYS) {
    const a = prior.get(key), b = by.get(key);
    if (!a || !b) fail(`carried row present ${key}`);
    same(strip(b), strip(a), `carried row differs outside rank/ranks: ${key}`);
    if (V1637_UNRANKED_CARRIED_KEYS.includes(key)) {
      same([b.rank, b.ranks, b.not_ranked_because, b.listing, b.ranked], [a.rank, a.ranks, a.not_ranked_because, a.listing, a.ranked], `the listed-not-ranked row keeps its placement and wording: ${key}`);
    }
    if (a.ranked) {
      for (const o of ['A', 'B', 'C', 'capability']) {
        const shift = V1637_RANKED_NEW_KEYS.filter(nk => (o === 'capability' ? by.get(nk).capability > b.capability
          : artifact.board[o].order.indexOf(nk) < artifact.board[o].order.indexOf(key))).length;
        if (b.ranks[o] !== a.ranks[o] + shift) fail(`carried rank ${o} moved by more than the rows that moved above it: ${key}`);
        if (b.ranks[o] !== a.ranks[o] && !rankClause.includes(`${key} `)) fail(`a moved carried rank must name its row in the release note: ${key}`);
      }
    }
  }
  same(artifact.measurement_notes?.slice(0, previous.artifact.measurement_notes.length), previous.artifact.measurement_notes, 'inherited measurement notes unchanged');
  if (!releaseNote.includes('RANKS') || !releaseNote.includes('CONFIDENCE INTERVALS: no carried interval moved') || !releaseNote.includes('DIAGNOSTICS')
      || !V1637_REPRICED_KEYS.every(k => releaseNote.includes(k))) fail('the release note must count rank, interval and diagnostic moves and name both rows');
  if (!releaseNote.includes('NO new measurement') || !releaseNote.includes('used USD 0.04 per 1M input') || !releaseNote.includes('USD 0.03 per 1M input and USD 0.15 per 1M output (DeepInfra, 25 Sep 2026 snapshot)')
      || !releaseNote.includes('corrected in v1.6.37')) fail('the release note must state the correction in the agreed words');
  if (!releaseNote.includes('NO re-freeze in this release') || !releaseNote.includes('1f4d1f7b')) fail('the release note must say that nothing was re-frozen and name the pricing module');
  if (!artifact.measurement_notes.some(x => x.includes('#18761') && x.includes('LISTED BUT NOT RANKED'))) fail('the non-official Speed disclosure is mandatory');
  if (artifact.G_med_api_basis_P_vs_A !== previous.artifact.G_med_api_basis_P_vs_A) fail('the API-basis diagnostic did not move');
  const added = artifact.measurement_notes.slice(previous.artifact.measurement_notes.length);
  const boardNotes = added.filter(x => x.startsWith('Board effect'));
  const boardNote = boardNotes.length === 1 ? boardNotes[0] : '';
  const provisional = boardNote.includes('PROVISIONAL-TOPFIVE');
  if (provisional ? process.env.JEVBENCH_V1637_BUILD_PASS1 !== '1'
      : !(boardNote.includes('top-five') && V1637_REPRICED_KEYS.every(k => boardNote.includes(k)))) fail('board effect: generated top-five note required; provisional build note forbidden');
  if (artifact.G_med !== V1637_FIXED_G_MED || previous.artifact.G_med !== V1637_FIXED_G_MED) fail('frozen v1.6.10 G_med');

  // --- the draw and the proof -----------------------------------------------------------------
  for (const f of ['draw_release', 'freeze_manifest_sha256', 'seed_commitment', 'draw_digests', 'baseline_sha256', 'a2_supplement', 'equating', 'equating_A2', 'cost_basis', 'scorer_sources_sha256']) same(artifact.v16?.[f], previous.artifact.v16?.[f], `draw provenance ${f}`);
  if (artifact.v16.draw_release !== V1637_DRAW_RELEASE) fail('draw identity');
  same(artifact.source_sha256, previous.artifact.source_sha256, 'the carried scorer output is unchanged');
  if (proof?.schema_version !== 1 || proof.revision !== 'v1.6.37' || proof.method !== 'jevbench::v1.6'
      || proof.noul_method?.applied !== 'O1S' || proof.bootstrap?.B !== 1000 || proof.bootstrap.seed !== 16) fail('method proof');
  if (proof.draw_release !== artifact.v16.draw_release || proof.freeze_manifest_sha256 !== artifact.v16.freeze_manifest_sha256
      || proof.seed_commitment !== artifact.v16.seed_commitment || proof.baseline_sha256 !== artifact.v16.baseline_sha256
      || !hex(proof.cost_basis_sha256) || !hex(proof.registry_sha256)) fail('draw/cohort binding');
  same(artifact.v16.draw_digests, proof.draw_digests, 'draw digests bound to the proof');
  if (proof.pricing_module_sha256 !== V1637_PRICING_MODULE_SHA256 || proof.predecessor_pricing_module_sha256 !== V1637_PRICING_MODULE_SHA256
      || previous.proof.pricing_module_sha256 !== V1636_PRICING_MODULE_SHA256) fail('pricing module pins (1f4d1f7b, no re-freeze)');
  if (proof.abandoned_draw_note !== null) fail('abandoned-draw disclosure');
  if (!hex(proof.predecessor_seal_sha256)) fail('predecessor seal binding: the sealed v1.6.36 is required before publication');
  same(proof.cost_basis_sha256, previous.proof.cost_basis_sha256, 'unchanged common cost basis');
  same(proof.registry_sha256, previous.proof.registry_sha256, 'the carried registry is unchanged');
  same(artifact.v16.cost_basis, previous.artifact.v16.cost_basis, 'unchanged common cost rule');
  for (const k of ['refreshed_preview_go_card', 'refreshed_preview_approval', 'a2_supplement', 'scorer_sources_sha256', 'recosted_rows', 'superseded_cost_basis_sha256']) same(proof[k], previous.proof[k], `inherited proof field ${k}`);
  if (typeof proof.authority !== 'string' || !proof.authority.startsWith(previous.proof.authority + ' NEW in v1.6.37:')) fail('inherited authority unchanged');
  const newAuthority = proof.authority.slice(previous.proof.authority.length);
  for (const fragment of [...V1637_REPRICED_KEYS, 'RANKED', '1f4d1f7b', 'NO pricing re-freeze', V1637_GO_QUOTE]) {
    if (!newAuthority.includes(fragment)) fail(`new publication authority: ${fragment}`);
  }
  const marker = approvalOf(proof, artifact, boardNote, provisional);
  if (!newAuthority.includes(marker)) fail('publication approval authority binding');
  if (!sameSet(Object.keys(proof.raw_sha256 ?? {}), proofKeys)) fail('raw-output coverage');
  same(Object.fromEntries(V1637_CARRIED_KEYS.map(k => [k, proof.raw_sha256[k]])), previous.proof.raw_sha256, 'inherited raw-output hashes unchanged');
  const proofRows = proof.systems;
  if (!Array.isArray(proofRows) || !sameSet(proofRows.map(x => x.key), proofKeys)) fail('system proof coverage');
  const priorProof = new Map(previous.proof.systems.map(r => [r.key, r]));
  for (const x of artifact.systems) {
    if (V1637_CARRIED_PRELIMINARY_KEYS.includes(x.key)) continue;
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
    const q = priorProof.get(x.key);
    if (q) for (const f of ['measured_by', 'source_review_sha256', 'source_review_note', 'raw_sha256', 'answered_ok']) same(p[f], q[f], `proof row provenance unchanged ${x.key}.${f}`);
  }
  // --- the frozen median, recomputable from its four v1.6.10 members --------------------------
  const members = proof.field_median?.members;
  if (proof.field_median?.g_med_fixed !== true || proof.g_med_fixed_from?.revision !== 'v1.6.10'
      || proof.g_med_fixed_from.G_med !== V1637_FIXED_G_MED || proof.g_med_fixed_from.baseline_sha256 !== proof.baseline_sha256) fail('frozen field median provenance');
  if (!Array.isArray(members) || !sameSet(members.map(m => m.key), V1610_KEYS)
      || !members.every(m => finite(m.gap) && by.get(m.key)?.intelligence?.gap === m.gap)) fail('field median cohort');
  const gaps = members.map(m => m.gap).sort((a, b) => a - b);
  const median = gaps.length % 2 ? gaps[(gaps.length - 1) / 2] : (gaps[gaps.length / 2 - 1] + gaps[gaps.length / 2]) / 2;
  if (Math.abs(artifact.G_med - median) > 1e-9 || proof.field_median.G_med !== artifact.G_med) fail('cohort G_med');
  if (artifact.G_med_flag_gt10 !== (artifact.G_med > 10)) fail('G_med flag consistency');
  if (Math.abs(proof.gap_penalty_threshold - (artifact.G_med + 8)) > 1e-6) fail('gap penalty threshold');

  // --- categories: carried cells unchanged; the restated rows keep their v1.6.1 cells on the live boards --------
  if (categories?.revision !== 'v1.6.37' || categories.provisional !== false
      || categories.source_results_sha256 !== artifact.source_sha256
      || categories.draw_release !== artifact.v16.draw_release
      || categories.results_sha256 !== manifest.files.results.sha256) fail('category source binding');
  const dims = v1636Dims(categories);
  if (!('topics' in categories) && !artifact.measurement_notes.some(x => x.includes('topic'))) fail('a release without the topic radar must say so in its measurement notes');
  for (const field of ['live_category_cells', 'supplement', 'language_cells', 'unavailable']) if (field in categories) fail(`historical category overlay ${field}`);
  for (const field of ['lane_note', 'metric', 'labelling']) if (typeof categories[field] !== 'string' || !categories[field].trim()) fail(`category field ${field}`);
  if (!Array.isArray(categories.rules) || !categories.rules.length) fail('category rules');
  if (!categories.lanes || !sameSet(Object.keys(categories.lanes), regularKeys)) fail('category lanes');
  for (const key of regularKeys) if (categories.lanes[key] !== previous.categories.lanes[key]) fail(`category lane ${key}`);
  validateCategoryArtifact(categories, dims);
  if (!sameSet(Object.keys(categories.systems), regularKeys)) fail('category cohort: no cells for the two rows measured on the v1.6.0 draw');
  for (const key of V1637_REPRICED_KEYS) if (categories.systems[key] || categories.lanes[key]) fail(`restated row has no cells on this draw: ${key}`);
  for (const key of regularKeys) for (const dim of dims) {
    for (const c of categories[dim]) {
      const cell = categories.systems[key]?.[dim]?.[c.key];
      if (c.n >= categories.min_n && !cell) fail(`missing category ${key}.${dim}.${c.key}`);
      if (c.n < categories.min_n && cell) fail(`below-min_n category must be omitted: ${key}.${dim}.${c.key}`);
      if (cell && (!Number.isInteger(cell.n) || cell.n < categories.min_n || !finite(cell.competence))) fail(`category cell ${key}.${dim}.${c.key}`);
    }
  }
  for (const key of V1637_CARRIED_KEYS) same(categories.systems[key], previous.categories.systems[key], `inherited category cells ${key}`);
  return { artifact, categories, proof, manifest };
}

async function load(path, root) {
  const bytes = await readFile(`${root}/${path}`);
  const text = bytes.toString('utf8'); excluded(text);
  return { value: JSON.parse(text), bytes, sha256: createHash('sha256').update(bytes).digest('hex') };
}

/** Missing publication manifest means the version is unavailable; invalid published evidence fails closed. */
export async function readOptionalJevbenchV1637Release(root = process.cwd()) {
  let publication;
  try { publication = await load(V1637_MANIFEST, root); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  const previous = await readOptionalJevbenchV1636Release(root);
  if (!previous) fail('v1.6.37 needs the published v1.6.36 release it extends');
  const previousManifest = await load(`${V1637_ROOT}/jevbench-v1.6.36-publication.json`, root);
  const bundle = Object.fromEntries(await Promise.all(Object.entries(files).map(async ([k, path]) => [k, await load(path, root)])));
  for (const [key, value] of Object.entries(bundle)) if (publication.value.files?.[key]?.sha256 !== value.sha256) fail(`bytes hash ${key}`);
  if (bundle.history.sha256 !== previous.historical.sha256) fail('immutable history bytes');
  if (bundle['history-carry'].sha256 !== previous.historical.carrySha256) fail('immutable carry bytes');
  const base = await readJevbenchV161Release(root);
  validateJevbenchV1637Bundle({ manifest: publication.value, artifact: bundle.results.value, categories: bundle.categories.value,
    proof: bundle.proof.value, previous, previousManifestSha256: previousManifest.sha256, base161: base.artifact });
  return { artifact: bundle.results.value, bytes: bundle.results.bytes, sha256: bundle.results.sha256,
           categories: bundle.categories.value, categoriesSha256: bundle.categories.sha256,
           proof: bundle.proof.value, proofSha256: bundle.proof.sha256, manifest: publication.value,
           historical: previous.historical };
}

/** Optional navigation must never make an older board depend on fresh publication health. */
export async function hasPublishedJevbenchV1637Release(root = process.cwd(), log = console.error) {
  try { return Boolean(await readOptionalJevbenchV1637Release(root)); }
  catch { log('JevBench v1.6.37 navigation omitted: publication validation failed'); return false; }
}

/** Board input: this release's own rows, with no historical overlay mixed in. */
export function v1637BoardInput(release) {
  return { artifact: release.artifact, categories: release.categories };
}
