// JevBench v1.6.17: a same-draw addition of regular-queue rows to the eleven full-draw rows of v1.6.16, on the
// seeded rotation draw v1.6-regular-20261012, still scored with the FROZEN v1.6.10 field median (g_med_fixed), so
// every carried row keeps identical point scores. Ranks recompute over the new roster and, because new keys sort
// into the middle of the key-sorted roster, some carried bootstrap intervals move too; the release must disclose
// every move.
//
// New rows (the first four are always present; the last three only once their final scoring is part of the
// release, and each is validated against its own spec below):
//   pjev-2b                          self-hosted CPU, ranked, split-window Speed disclosure
//   metask_jev_rain_31b_trained_v3   PAID public fast-lane row on a distinct key, a disclosed re-submission of the
//                                    weights of order 147c5e18; the earlier metask row is carried unchanged
//   subq-snap-preview                hosted API, LISTED BUT NOT RANKED, cost unpriced (CoS deputy #18975)
//   amos-1-medium                    hosted API, ranked ABOVE the official cost ceiling, disclosed (the v1.6.16
//                                    vllm-sr-d3 mechanism)
//   purplemist-mini-1.0 | amos-1-large | sage-1.4.0   optional, see V1617_OPTIONAL_KEYS
//
// v1.6.14's PRELIMINARY, UNRANKED Microsoft A2 alias is carried through BYTE FOR BYTE, and reflex-instinct-0.6b
// stays LISTED BUT NOT RANKED (#18761) with its published wording.
//
// Source-only and fail-closed: without the six published v1.6.17 files the version reports as unavailable, and any
// published evidence that does not validate fails closed. It never creates data, a review verdict or a manifest,
// and no item text, id, gold or per-item result may appear.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { validateJevbenchV16Release, mentionsPrivateSystem, JEVBENCH_V16_EXCLUDED_KEYS } from './jevbench-v16-release.mjs';
import { validateCategoryArtifact } from './jevbench-categories.mjs';
import { V1610_KEYS } from './jevbench-v1610-release.mjs';
import { readOptionalJevbenchV1616Release, V1616_ROOT, V1616_REGULAR_KEYS, V1616_UNRANKED_KEYS,
         V1616_CARRIED_PRELIMINARY_KEYS, V1616_ABOVE_COST_CAP_KEYS } from './jevbench-v1616-release.mjs';
import { JEV_PRELIMINARY_LISTING } from './jevbench-scope.mjs';

export const V1617_ROOT = V1616_ROOT;
export const V1617_MANIFEST = `${V1617_ROOT}/jevbench-v1.6.17-publication.json`;
export const V1617_FILE_KEYS = ['results', 'categories', 'proof', 'history', 'history-carry'];
const files = Object.fromEntries(V1617_FILE_KEYS.map(k => [k, `${V1617_ROOT}/jevbench-v1.6.17-${k}.json`]));
/** Always part of this release. */
export const V1617_CORE_NEW_KEYS = ['amos-1-medium', 'metask_jev_rain_31b_trained_v3', 'pjev-2b', 'subq-snap-preview'];
/** Part of this release only once their final scoring lands; each may be present or absent. */
export const V1617_OPTIONAL_KEYS = ['amos-1-large', 'purplemist-mini-1.0', 'sage-1.4.0'];
/** The paid public fast-lane rows (publish under the paid exception, disclosed as such). */
export const V1617_PAID_KEYS = ['metask_jev_rain_31b_trained_v3'];
/** Carried listed-but-not-ranked rows (#18761) and the A2 alias. */
export const V1617_UNRANKED_CARRIED_KEYS = [...V1616_UNRANKED_KEYS];
export const V1617_CARRIED_KEYS = [...V1616_REGULAR_KEYS];
export const V1617_CARRIED_PRELIMINARY_KEYS = [...V1616_CARRIED_PRELIMINARY_KEYS];
export const V1617_FIXED_G_MED = 9.839526770355711;
export const V1617_COST_CAP = 0.06459465517241379;
export const V1617_DRAW_RELEASE = 'v1.6-regular-20261012';
/** Rows allowed above the cost ceiling, each only with its disclosure. */
export const V1617_ABOVE_COST_CAP_KEYS = [...V1616_ABOVE_COST_CAP_KEYS, 'amos-1-medium', 'amos-1-large', 'sage-1.4.0'];
const SELF_HOSTED_ADJ = 'x2 + 0.15 s (assumption, not measured)';
/** What each new row must be, and what its note must say. A deleted disclosure is not a style change. */
export const V1617_ROW_SPEC = Object.freeze({
  'pjev-2b': { kind: 'cpu', ranked: true, disclosures: ['HTTP 422', 'EXACTLY the same 15',
    'torchcast-decision-4b-v1.1', 'SPLIT WINDOW', 'four sittings', 'loaded-shared-CPU', 'x2 + 0.15 s', 'ESTIMATE', 'float32'] },
  'metask_jev_rain_31b_trained_v3': { kind: 'gpu', ranked: true, paid: true, display: 'metask-jev-rain-31B-trained service v3',
    disclosures: ['4d9fef10', 'RE-SUBMISSION', '147c5e18', '#18945', 'RTX PRO 6000', 'H100', 'paid exception', 'estimated'] },
  'subq-snap-preview': { kind: 'api', ranked: false, unpriced: true, reason: '#18975',
    disclosures: ['#18975', 'NOT RANKED', 'USD 0.05/M', 'unpriced', 'retains API inputs indefinitely', 'All data'] },
  'amos-1-medium': { kind: 'api', ranked: true, disclosures: ['api.amos.scira.ai', 'CUSTODY CONDITION', 'not a bill', 'ESTIMATE', 'scira'] },
  'amos-1-large': { kind: 'api', ranked: true, disclosures: ['api.amos.scira.ai', 'CUSTODY CONDITION', 'not a bill', 'ESTIMATE', 'scira'] },
  'purplemist-mini-1.0': { kind: 'cpu', ranked: true, disclosures: ['HTTP 422', 'OFFLINE COUNT', '#18974', 'loaded-shared-CPU', 'x2 + 0.15 s', 'ESTIMATE'] },
  // treatment pending the deputy's ruling (board #18983): priced and ranked, ranked above the cap, or listed unpriced
  'sage-1.4.0': { kind: 'api', ranked: null, unpriced: true, disclosures: ['levanto', 'Hosted API'] },
});
export const V1617_BASE_DIMS = ['families', 'usecases', 'languages'];
export function v1617Dims(categories) {
  return 'topics' in categories ? ['topics', ...V1617_BASE_DIMS] : [...V1617_BASE_DIMS];
}
export const V1617_DIMS = V1617_BASE_DIMS;

const hex = v => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const finite = v => typeof v === 'number' && Number.isFinite(v);
const fail = message => { throw new Error(`JevBench v1.6.17: ${message}`); };
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

export function validateJevbenchV1617Bundle({ manifest, artifact, categories, proof, previous, previousManifestSha256 }) {
  for (const value of [manifest, artifact, categories, proof]) {
    publicOnly(value);
    excluded(JSON.stringify(value));
  }
  // --- publication identity ------------------------------------------------------------------
  if (manifest?.schema_version !== 1 || manifest.revision !== 'v1.6.17' || manifest.status !== 'published' || manifest.provisional !== false) fail('publication status');
  if (manifest.review?.verdict !== 'PASS' || manifest.review.engine !== 'claude' || !hex(manifest.review.receipt_sha256)) fail('independent release review');
  if (!previous || previous.manifest?.revision !== 'v1.6.16' || previous.proof?.revision !== 'v1.6.16') fail('validated v1.6.16 predecessor required');
  same(manifest.predecessor, { revision: 'v1.6.16', publication_sha256: previousManifestSha256 }, 'predecessor binding');
  for (const k of ['historical_revision', 'historical_results_sha256', 'historical_carry_sha256']) same(manifest[k], previous.manifest[k], `historical binding ${k}`);
  for (const [key, path] of Object.entries(files)) if (manifest.files?.[key]?.path !== path || !hex(manifest.files[key].sha256)) fail(`file binding ${key}`);

  // --- artifact identity and the cohort ------------------------------------------------------
  if (artifact?.revision !== 'v1.6.17' || artifact.run_kind !== 'regular-queue' || artifact.noul_method?.applied !== 'O1S') fail('regular-queue identity');
  validateJevbenchV16Release({ ...artifact, revision: 'v1.6.1', run_kind: 'scheduled-refresh' }, 'v1.6.1');
  if (artifact.bootstrap?.B !== 1000 || artifact.bootstrap.bootstrap_seed !== 16 || artifact.bootstrap.g_med_fixed !== true) fail('artifact bootstrap');
  const allKeys = artifact.systems.map(s => s.key);
  const newKeys = allKeys.filter(k => !V1617_CARRIED_KEYS.includes(k) && !V1617_CARRIED_PRELIMINARY_KEYS.includes(k)).sort();
  for (const k of V1617_CORE_NEW_KEYS) if (!newKeys.includes(k)) fail(`required new row missing: ${k}`);
  for (const k of newKeys) if (!V1617_CORE_NEW_KEYS.includes(k) && !V1617_OPTIONAL_KEYS.includes(k)) fail(`unknown new row ${k}`);
  if (!sameSet(allKeys, [...V1617_CARRIED_KEYS, ...newKeys, ...V1617_CARRIED_PRELIMINARY_KEYS])) fail('exact cohort');
  if (artifact.systems.length !== previous.artifact.systems.length + newKeys.length) fail('exactly the added rows');
  if (artifact.not_measured.length) fail('regular cohort has no not-measured rows');
  if (artifact.roster_count !== artifact.systems.length) fail('roster count');
  const newRanked = newKeys.filter(k => artifact.systems.find(s => s.key === k).ranked);
  const unrankedKeys = [...V1617_UNRANKED_CARRIED_KEYS, ...newKeys.filter(k => !newRanked.includes(k))];
  if (artifact.n_ranked !== artifact.systems.filter(s => s.ranked).length || artifact.n_ranked !== 10 + newRanked.length) fail('ranked row count');
  const regularKeys = [...V1617_CARRIED_KEYS, ...newKeys];

  // --- every full-draw row ----------------------------------------------------------------------
  for (const s of artifact.systems) {
    if (V1617_CARRIED_PRELIMINARY_KEYS.includes(s.key)) continue;   // validated by the predecessor chain
    const isNew = newKeys.includes(s.key);
    const spec = V1617_ROW_SPEC[s.key];
    const expectedLane = isNew ? (spec.kind === 'api' ? 'api' : 'selfhosted') : previous.artifact.systems.find(p => p.key === s.key).v16.lane;
    if (s.v16?.lane !== expectedLane) fail(`lane ${s.key}`);
    if (s.status?.rows !== 1500 || s.status.status !== 'complete') fail(`complete 1500 rows ${s.key}`);
    if (s.full_coverage !== true) fail(`full coverage ${s.key}`);
    const unpriced = s.cost?.kind === 'unpriced';
    if (unpriced && !(isNew && spec.unpriced)) fail(`only a row with a stated unpriced ruling may be unpriced: ${s.key}`);
    for (const axis of ['intelligence', 'calibration', 'speed', ...(unpriced ? [] : ['cost'])]) {
      if (!finite(s.axes?.[axis])) fail(`axis ${axis} ${s.key}`);
    }
    if (unpriced && s.ranked) fail(`an unpriced row has no composite and cannot be ranked: ${s.key}`);
    if (unpriced && (s.axes.cost !== null || s.cost.usd_per_1000 !== null || s.scores?.A !== null)) fail(`an unpriced row has no cost axis and no composite: ${s.key}`);
    if (!finite(s.capability) || Math.abs(s.capability - (s.axes.intelligence + s.axes.calibration) / 2) > 1e-9) {
      fail(`capability is the mean of intelligence and calibration: ${s.key}`);
    }
    if (unrankedKeys.includes(s.key)) {
      if (s.ranked !== false || s.rank !== null || s.listing !== 'listed') fail(`listed-not-ranked row ${s.key}`);
      same(s.ranks, { A: null, B: null, C: null, capability: null }, `null ranks ${s.key}`);
      if (typeof s.not_ranked_because !== 'string' || s.not_ranked_because.length < 60) fail(`stated reason for not ranking ${s.key}`);
      if (V1617_UNRANKED_CARRIED_KEYS.includes(s.key) && !s.not_ranked_because.includes('#18761')) fail(`stated reason for not ranking ${s.key}`);
      if (isNew && spec.reason && !s.not_ranked_because.includes(spec.reason)) fail(`the ruling behind the missing rank must be named: ${s.key}`);
    } else if (!s.ranked || s.listing !== 'ranked' || !Number.isInteger(s.rank)) {
      fail(`every other full-draw row is ranked: ${s.key}`);
    }
    if (typeof s.repo !== 'string' || !s.repo.startsWith('https://')) fail(`repo ${s.key}`);
    const apiPin = isNew && spec.kind === 'api';
    if (typeof s.model_pin !== 'string' || !(/@[a-f0-9]{40}$/.test(s.model_pin) || (apiPin && (/@[a-f0-9]{8,40}$/.test(s.model_pin) || /^hosted-api:/.test(s.model_pin))))) fail(`pinned revision ${s.key}`);
    if (!unpriced && (!finite(s.cost?.usd_per_1000) || s.cost.usd_per_1000 <= 0)) fail(`cost figure ${s.key}`);
    if (typeof s.cost.basis !== 'string' || s.cost.basis.length < 80) fail(`documented cost basis ${s.key}`);
    if (!unpriced && s.cost.usd_per_1000 > V1617_COST_CAP && !V1617_ABOVE_COST_CAP_KEYS.includes(s.key)) fail(`cost above the published ceiling ${s.key}`);
    const d = s.noul_decisive;
    if (!d || d.supported !== true || !Number.isInteger(d.n) || d.n !== 375 || !finite(d.decisive_rate)
        || !(finite(d.acc_among_decisive) || (d.acc_among_decisive === null && d.decisive === 0 && d.decisive_rate === 0))) fail(`noul decisiveness ${s.key}`);
  }

  // --- the new rows ---------------------------------------------------------------------------
  for (const key of newKeys) {
    const s = artifact.systems.find(x => x.key === key), spec = V1617_ROW_SPEC[key];
    if (s.measured_in !== 'v1.6.17' || s.measurement_date_status !== 'measured' || !['2026-10-13', '2026-10-14'].includes(s.last_measured_on)) fail(`measurement stamp ${key}`);
    if (spec.ranked !== null && s.ranked !== spec.ranked) fail(`treatment of ${key} is fixed by its ruling`);
    if (spec.display && s.display !== spec.display) fail(`display ${key}`);
    if (s.endpoint_kind !== spec.kind || s.api_flag !== (spec.kind === 'api') || s.v16.set !== 'S+P') fail(`lane/endpoint kind ${key}`);
    if (spec.kind === 'api') {
      if (s.v16.full_set_api !== true || s.v16.equated !== null || s.speed?.adjustment !== 'none (API)') fail(`full-set API row, not equated, no latency adjustment ${key}`);
    } else if (s.speed?.adjustment !== SELF_HOSTED_ADJ || !(s.speed.p50_s_adjusted > s.speed.p50_s_raw) || !(s.speed.p95_s_adjusted > s.speed.p95_s_raw)) {
      fail(`self-hosted latency adjustment ${key}`);
    }
    if (!s.cost || (s.cost.kind !== 'estimate' && s.cost.kind !== 'unpriced')) fail(`labelled cost estimate ${key}`);
    if (s.cost.kind === 'estimate' && !/ESTIMATE|estimated|estimate/.test(s.cost.basis)) fail(`labelled cost estimate ${key}`);
    if (typeof s.endpoint_condition !== 'string' || s.endpoint_condition.length < 200) fail(`endpoint condition ${key}`);
    if (spec.kind === 'cpu' && !/load/i.test(s.endpoint_condition)) fail(`shared-host disclosure ${key}`);
    if (key === 'metask_jev_rain_31b_trained_v3'
        && !(s.endpoint_condition.includes('RTX PRO 6000') && s.endpoint_condition.includes('RE-SUBMISSION') && s.endpoint_condition.includes('#18945'))) fail(`re-submission and hardware disclosure ${key}`);
    if (!unrankedKeys.includes(key)) {
      for (const ci of [s.composite_ci95, s.v16?.ci95?.composite]) if (!intervalOk(ci, s.scores)) fail(`new row interval does not contain its own point estimate: ${key}`);
    }
    const capCi = s.v16?.ci95?.capability;
    if (!Array.isArray(capCi) || !(capCi[0] <= s.capability + 1e-9 && s.capability <= capCi[1] + 1e-9)) fail(`new row capability interval does not contain its own point estimate: ${key}`);
    const note = artifact.measurement_notes.find(n => n.startsWith(`${key}: `)) ?? '';
    if (note.length < 600) fail(`row note is too thin to be the disclosure it claims to be: ${key}`);
    for (const fragment of spec.disclosures) {
      if (!note.includes(fragment)) fail(`required disclosure "${fragment}" missing from the note of ${key}`);
    }
    if (!s.cost.kind || s.cost.kind === 'unpriced') continue;
    if (s.cost.usd_per_1000 > V1617_COST_CAP) {
      if (!artifact.measurement_notes.some(n => n.includes(key) && n.includes('NOT true of') && n.includes('cost ceiling'))) {
        fail(`a row above the cost ceiling must correct the inherited "every row is under the ceiling" note: ${key}`);
      }
      if (!s.cost.basis.includes('OVER THE OFFICIAL COST CAP')) fail(`a row above the cost ceiling states it in its cost basis: ${key}`);
      if (!(s.axes.cost < 50)) fail(`a row above the ceiling with a cost axis at or above 50 does not add up: ${key}`);
      if (!s.ranked) fail(`a row above the ceiling is ranked and disclosed, not silently unranked: ${key}`);
    }
  }

  if (artifact.sample?.open !== 300 || artifact.sample.sealed !== 1200 || artifact.sample.total !== 1500) fail('scoring denominator');
  if (artifact.v16?.counts?.S !== 1200 || artifact.v16.counts.P !== 300 || artifact.v16.counts.selfhosted_input !== 1500) fail('fresh input counts');
  const ranked = artifact.systems.filter(s => s.ranked).map(s => s.key).sort();
  for (const o of ['A', 'B', 'C']) if (!sameSet(artifact.board?.[o]?.order ?? [], ranked)) fail(`board membership ${o}`);
  // A published rank must BE the row's board position (v1.6.15 delta finding D4).
  const capabilityOrder = artifact.systems.filter(s => s.ranked)
    .slice().sort((x, y) => y.capability - x.capability).map(s => s.key);
  for (const s of artifact.systems) {
    if (!s.ranked) continue;
    for (const o of ['A', 'B', 'C']) {
      const position = (artifact.board?.[o]?.order ?? []).indexOf(s.key) + 1;
      if (s.ranks?.[o] !== position) fail(`rank ${o} is not the board position: ${s.key}`);
    }
    if (s.ranks?.capability !== capabilityOrder.indexOf(s.key) + 1) fail(`capability rank is not the capability order: ${s.key}`);
    if (s.rank !== s.ranks.A) fail(`rank is not the headline rank: ${s.key}`);
  }
  for (const key of unrankedKeys) if (ranked.includes(key)) fail('a row without an official placement may not enter a ranked board');

  // --- the A2 alias is carried through unchanged ---------------------------------------------
  for (const key of V1617_CARRIED_PRELIMINARY_KEYS) {
    const a = previous.artifact.systems.find(s => s.key === key), b = artifact.systems.find(s => s.key === key);
    if (!a || !b) fail(`carried preliminary row present ${key}`);
    same(b, a, `carried preliminary row unchanged ${key}`);
    if (b.listing !== JEV_PRELIMINARY_LISTING || b.ranked !== false || b.rank !== null) fail(`carried row stays unranked ${key}`);
    if (categories.systems?.[key]) fail(`the carried A2 measurement has no category cells: ${key}`);
  }

  // --- the carried rows keep every point estimate ----------------------------------------------
  // What may differ on a carried row, and nothing else: its placement (rank, ranks - recomputed over the new
  // roster), its bootstrap intervals (composite_ci95, v16.ci95 - new keys change roster positions and with them
  // the per-row bootstrap seeds) and, only on a row whose A-basis diagnostic depends on the ranked field,
  // v16.raw_on_A. Every move must be named in the release note.
  const diagnosticMoved = artifact.G_med_api_basis_P_vs_A !== previous.artifact.G_med_api_basis_P_vs_A;
  const strip = (row, allowRawOnA) => {
    const copy = JSON.parse(JSON.stringify(row));
    delete copy.composite_ci95; delete copy.rank; delete copy.ranks;
    if (copy.v16) { delete copy.v16.ci95; if (allowRawOnA) delete copy.v16.raw_on_A; }
    return copy;
  };
  const releaseNote = artifact.measurement_notes.find(n => n.startsWith('v1.6.17 ADDS ')) ?? '';
  for (const key of V1617_CARRIED_KEYS) {
    const a = previous.artifact.systems.find(s => s.key === key), b = artifact.systems.find(s => s.key === key);
    if (!a || !b) fail(`carried row present ${key}`);
    const rawOnAMoved = JSON.stringify(a.v16?.raw_on_A) !== JSON.stringify(b.v16?.raw_on_A);
    if (rawOnAMoved && !diagnosticMoved) fail(`raw_on_A moved while the API-basis diagnostic did not: ${key}`);
    if (rawOnAMoved && !releaseNote.includes(`${key}: intelligence`)) fail(`a moved raw_on_A must name its row in the notes: ${key}`);
    same(strip(b, rawOnAMoved), strip(a, rawOnAMoved),
         `carried row differs outside rank/ranks/composite_ci95/v16.ci95${rawOnAMoved ? '/v16.raw_on_A' : ''}: ${key}`);
    if (V1617_UNRANKED_CARRIED_KEYS.includes(key)) {
      // the published wording and explicit null placement of a listed-not-ranked row stay byte for byte
      same([b.rank, b.ranks, b.not_ranked_because, b.listing, b.ranked], [a.rank, a.ranks, a.not_ranked_because, a.listing, a.ranked], `the listed-not-ranked row keeps its placement and wording: ${key}`);
    }
    const intervalMoved = !isDeepStrictEqual([b.composite_ci95, b.v16?.ci95], [a.composite_ci95, a.v16?.ci95]);
    if (intervalMoved && !releaseNote.includes(key)) fail(`a moved carried interval must name its row in the release note: ${key}`);
    for (const ci of [b.composite_ci95, b.v16?.ci95?.composite]) {
      if (!intervalOk(ci, b.scores)) fail(`carried row interval does not contain its own point estimate: ${key}`);
    }
    for (const o of ['A', 'B', 'C']) if (a.scores[o] !== b.scores[o]) fail(`earlier row point score ${key}.${o}`);
    for (const axis of ['intelligence', 'calibration', 'speed', 'cost']) if (a.axes[axis] !== b.axes[axis]) fail(`earlier row axis ${key}.${axis}`);
    if (a.capability !== b.capability) fail(`earlier row capability ${key}`);
    same(b.cost, a.cost, `earlier row cost object ${key}`);
    same(b.speed, a.speed, `earlier row speed object ${key}`);
    same(b.noul_decisive, a.noul_decisive, `earlier row noul decisiveness ${key}`);
    if (a.display !== b.display || a.model_pin !== b.model_pin || a.repo !== b.repo) fail(`earlier row identity ${key}`);
    // a carried rank may only move by the newly ranked rows that joined above it, and a move must be named
    if (a.ranked) {
      for (const o of ['A', 'B', 'C', 'capability']) {
        const above = newRanked.filter(k => {
          const n = artifact.systems.find(x => x.key === k);
          return o === 'capability' ? n.capability > b.capability : (artifact.board[o].order.indexOf(k) < artifact.board[o].order.indexOf(key));
        }).length;
        if (b.ranks[o] !== a.ranks[o] + above) fail(`carried rank ${o} moved by more than the rows that joined above it: ${key}`);
        if (b.ranks[o] !== a.ranks[o] && !releaseNote.includes(key)) fail(`a moved carried rank must name its row in the release note: ${key}`);
      }
    }
  }
  same(artifact.measurement_notes?.slice(0, previous.artifact.measurement_notes.length), previous.artifact.measurement_notes, 'inherited measurement notes unchanged');
  if (!releaseNote.includes('RANKS') || !releaseNote.includes('CONFIDENCE INTERVALS') || !releaseNote.includes('DIAGNOSTICS')) fail('the release note must count rank, interval and diagnostic moves');
  for (const key of newKeys) if (!releaseNote.includes(key)) fail(`the release note must name every added row: ${key}`);
  if (!artifact.measurement_notes.some(n => n.includes('#18761') && n.includes('LISTED BUT NOT RANKED'))) fail('the non-official Speed disclosure is mandatory');
  if (!artifact.measurement_notes.some(n => n.includes('"All data"') && n.includes('Noul table') && n.includes('non-official'))) {
    fail('the listed-not-ranked row needs its where-it-is-shown disclosure');
  }
  if (diagnosticMoved) {
    const values = [previous.artifact.G_med_api_basis_P_vs_A, artifact.G_med_api_basis_P_vs_A].map(String);
    if (!artifact.measurement_notes.some(n => n.includes('API-basis median diagnostic') && values.every(v => n.includes(v)))) {
      fail('a moved API-basis diagnostic must be disclosed with both values, not left to be found');
    }
  }
  // the paid-exception disclosure and the board effect are part of the release
  if (!artifact.measurement_notes.some(n => n.startsWith('Board effect') && n.includes('4d9fef10') && n.includes('paid fast-lane') && n.includes('top five'))) {
    fail('the board effect and the paid-exception basis must be disclosed');
  }
  if (artifact.G_med !== V1617_FIXED_G_MED || previous.artifact.G_med !== V1617_FIXED_G_MED) fail('frozen v1.6.10 G_med');

  // --- the draw and the proof -----------------------------------------------------------------
  if (artifact.v16.draw_release !== V1617_DRAW_RELEASE) fail('draw identity');
  if (!hex(artifact.v16.freeze_manifest_sha256) || !hex(artifact.v16.seed_commitment) || !hex(artifact.v16.baseline_sha256)) fail('draw provenance hashes');
  for (const set of ['S', 'A', 'P', 'core']) if (!hex(artifact.v16.draw_digests?.[set])) fail(`draw digest ${set}`);
  if (proof?.schema_version !== 1 || proof.revision !== 'v1.6.17' || proof.method !== 'jevbench::v1.6'
      || proof.noul_method?.applied !== 'O1S' || proof.bootstrap?.B !== 1000 || proof.bootstrap.seed !== 16) fail('method proof');
  if (proof.draw_release !== artifact.v16.draw_release || proof.freeze_manifest_sha256 !== artifact.v16.freeze_manifest_sha256
      || proof.seed_commitment !== artifact.v16.seed_commitment || !hex(proof.baseline_sha256)
      || !hex(proof.cost_basis_sha256) || !hex(proof.registry_sha256) || !hex(proof.pricing_module_sha256)) fail('draw/cohort binding');
  if (proof.abandoned_draw_note !== null) fail('abandoned-draw disclosure');
  if (typeof proof.authority !== 'string' || !['#18761', '#18209', 'card 17392', '#18975', '4d9fef10', '#18945'].every(x => proof.authority.includes(x))) fail('publication authority');
  if (!sameSet(Object.keys(proof.raw_sha256 ?? {}), regularKeys)) fail('raw-output coverage');
  same(Object.fromEntries(V1617_CARRIED_KEYS.map(k => [k, proof.raw_sha256[k]])), previous.proof.raw_sha256, 'inherited raw-output hashes unchanged');
  same(proof.a2_supplement, previous.proof.a2_supplement, 'carried A2 scorer binding unchanged');
  const rows = proof.systems;
  if (!Array.isArray(rows) || !sameSet(rows.map(s => s.key), regularKeys)) fail('system proof coverage');
  for (const s of artifact.systems) {
    if (V1617_CARRIED_PRELIMINARY_KEYS.includes(s.key)) continue;
    const p = rows.find(r => r.key === s.key);
    if (!p || p.rows !== 1500 || p.status !== 'complete' || !hex(p.raw_sha256) || p.raw_sha256 !== proof.raw_sha256[s.key]) fail(`system proof ${s.key}`);
    if (p.model_pin !== s.model_pin || p.rank !== s.rank) fail(`proof agrees with the row ${s.key}`);
    if ((p.composite_A ?? null) !== (s.scores?.A ?? null) && Math.abs(p.composite_A - s.scores.A) > 1e-12) fail(`proof agrees with the row ${s.key}`);
    if (typeof p.measured_by !== 'string' || !p.measured_by.trim()) fail(`measuring operator ${s.key}`);
    if (p.source_review_sha256 !== null && !hex(p.source_review_sha256)) fail(`source review hash ${s.key}`);
    if (typeof p.source_review_note !== 'string' || p.source_review_note.length < 20) fail(`source review note ${s.key}`);
  }
  if (!sameSet(Object.keys(proof.new_rows ?? {}), newKeys)) fail('new-row provenance coverage');
  for (const key of newKeys) {
    const n = proof.new_rows[key];
    const row = artifact.systems.find(s => s.key === key);
    const usd = row.cost.usd_per_1000;
    if (!n || n.raw_sha256 !== proof.raw_sha256[key] || n.rows !== 1500 || n.answered_ok !== row.status.answered_ok
        || n.ranked !== row.ranked || n.paid_fast_lane !== V1617_PAID_KEYS.includes(key)
        || n.endpoint_kind !== row.endpoint_kind || !hex(n.original_raw_sha256)) fail(`new-row provenance ${key}`);
    if (usd === null) {
      if (n.usd_per_1000 !== null || n.under_cost_cap !== null) fail(`new-row provenance agrees with the row ${key}`);
    } else if (!finite(n.usd_per_1000) || Math.abs(n.usd_per_1000 - usd) > 1e-12 || n.under_cost_cap !== (usd <= V1617_COST_CAP)) {
      fail(`new-row provenance agrees with the row ${key}`);
    }
  }
  // --- the frozen median, recomputable from its four v1.6.10 members --------------------------
  const members = proof.field_median?.members;
  if (proof.field_median?.g_med_fixed !== true || proof.g_med_fixed_from?.revision !== 'v1.6.10'
      || proof.g_med_fixed_from.G_med !== V1617_FIXED_G_MED || proof.g_med_fixed_from.baseline_sha256 !== proof.baseline_sha256) fail('frozen field median provenance');
  if (!Array.isArray(members) || !sameSet(members.map(m => m.key), V1610_KEYS)
      || !members.every(m => finite(m.gap) && artifact.systems.find(s => s.key === m.key)?.intelligence?.gap === m.gap)) fail('field median cohort');
  const gaps = members.map(m => m.gap).sort((a, b) => a - b);
  const median = gaps.length % 2 ? gaps[(gaps.length - 1) / 2] : (gaps[gaps.length / 2 - 1] + gaps[gaps.length / 2]) / 2;
  if (Math.abs(artifact.G_med - median) > 1e-9 || proof.field_median.G_med !== artifact.G_med) fail('cohort G_med');
  if (artifact.G_med_flag_gt10 !== (artifact.G_med > 10)) fail('G_med flag consistency');
  if (Math.abs(proof.gap_penalty_threshold - (artifact.G_med + 8)) > 1e-6) fail('gap penalty threshold');

  // --- categories ------------------------------------------------------------------------------
  if (categories?.revision !== 'v1.6.17' || categories.provisional !== false
      || categories.source_results_sha256 !== artifact.source_sha256
      || categories.draw_release !== artifact.v16.draw_release
      || categories.results_sha256 !== manifest.files.results.sha256) fail('category source binding');
  const dims = v1617Dims(categories);
  if ('topics' in categories) {
    if (!hex(categories.labels_sha256)) fail('a topic radar needs the labels digest it was built from');
    if (categories.labels_draw_release !== V1617_DRAW_RELEASE) fail('topic labels must be for this draw');
  } else if (!artifact.measurement_notes.some(n => n.includes('topic'))) {
    fail('a release without the topic radar must say so in its measurement notes');
  }
  for (const field of ['live_category_cells', 'supplement', 'language_cells', 'unavailable']) if (field in categories) fail(`historical category overlay ${field}`);
  for (const field of ['lane_note', 'metric', 'labelling']) if (typeof categories[field] !== 'string' || !categories[field].trim()) fail(`category field ${field}`);
  if (!Array.isArray(categories.rules) || !categories.rules.length) fail('category rules');
  if (!categories.lanes || !sameSet(Object.keys(categories.lanes), regularKeys)) fail('category lanes');
  for (const key of regularKeys) {
    const expected = newKeys.includes(key) ? (V1617_ROW_SPEC[key].kind === 'api' ? 'api' : 'selfhosted') : previous.categories.lanes[key];
    if (categories.lanes[key] !== expected) fail(`category lane ${key}`);
  }
  validateCategoryArtifact(categories, dims);
  if (!sameSet(Object.keys(categories.systems), regularKeys)) fail('category cohort');
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
  for (const key of regularKeys) for (const dim of dims) {
    for (const c of categories[dim]) {
      const cell = categories.systems[key]?.[dim]?.[c.key];
      if (c.n >= categories.min_n && !cell) fail(`missing category ${key}.${dim}.${c.key}`);
      if (c.n < categories.min_n && cell) fail(`below-min_n category must be omitted: ${key}.${dim}.${c.key}`);
      if (cell && (!Number.isInteger(cell.n) || cell.n < categories.min_n || !finite(cell.competence))) fail(`category cell ${key}.${dim}.${c.key}`);
    }
  }
  // Carried category cells are the published v1.6.16 cells, cell by cell.
  for (const key of V1617_CARRIED_KEYS) same(categories.systems[key], previous.categories.systems[key], `inherited category cells ${key}`);
  return { artifact, categories, proof, manifest };
}

async function load(path, root) {
  const bytes = await readFile(`${root}/${path}`);
  const text = bytes.toString('utf8'); excluded(text);
  return { value: JSON.parse(text), bytes, sha256: createHash('sha256').update(bytes).digest('hex') };
}

/** Missing publication manifest means the version is unavailable; invalid published evidence fails closed. */
export async function readOptionalJevbenchV1617Release(root = process.cwd()) {
  let publication;
  try { publication = await load(V1617_MANIFEST, root); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  const previous = await readOptionalJevbenchV1616Release(root);
  if (!previous) fail('v1.6.17 needs the published v1.6.16 release it extends');
  const previousManifest = await load(`${V1617_ROOT}/jevbench-v1.6.16-publication.json`, root);
  const bundle = Object.fromEntries(await Promise.all(Object.entries(files).map(async ([k, path]) => [k, await load(path, root)])));
  for (const [key, value] of Object.entries(bundle)) if (publication.value.files?.[key]?.sha256 !== value.sha256) fail(`bytes hash ${key}`);
  if (bundle.history.sha256 !== previous.historical.sha256) fail('immutable history bytes');
  if (bundle['history-carry'].sha256 !== previous.historical.carrySha256) fail('immutable carry bytes');
  validateJevbenchV1617Bundle({ manifest: publication.value, artifact: bundle.results.value, categories: bundle.categories.value,
    proof: bundle.proof.value, previous, previousManifestSha256: previousManifest.sha256 });
  return { artifact: bundle.results.value, bytes: bundle.results.bytes, sha256: bundle.results.sha256,
           categories: bundle.categories.value, categoriesSha256: bundle.categories.sha256,
           proof: bundle.proof.value, proofSha256: bundle.proof.sha256, manifest: publication.value,
           historical: previous.historical };
}

/** Optional navigation must never make an older board depend on fresh publication health. */
export async function hasPublishedJevbenchV1617Release(root = process.cwd(), log = console.error) {
  try { return Boolean(await readOptionalJevbenchV1617Release(root)); }
  catch { log('JevBench v1.6.17 navigation omitted: publication validation failed'); return false; }
}

/** Board input: this release's own rows, with no historical overlay mixed in. */
export function v1617BoardInput(release) {
  return { artifact: release.artifact, categories: release.categories };
}
