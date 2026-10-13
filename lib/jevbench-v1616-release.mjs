// JevBench v1.6.16: a same-draw addition of ONE self-hosted GPU row, vllm-sr-d3 ("vLLM-SR d3"), to the ten
// full-draw rows of v1.6.15, on the seeded rotation draw v1.6-regular-20261012, still scored with the FROZEN
// v1.6.10 field median (g_med_fixed), so every carried row keeps identical point scores. Ranks recompute over the
// new roster (d3 has the draw's highest Capability, so every ranked carried row moves down one Capability place,
// and two carried rows move down one composite place); the release must disclose every move.
//
// v1.6.14's PRELIMINARY, UNRANKED Microsoft A2 alias is carried through BYTE FOR BYTE, and reflex-instinct-0.6b
// stays LISTED BUT NOT RANKED (#18761) exactly as v1.6.15 published it.
//
// The new row is the first on this draw above the Jev-class cost ceiling (an estimate at the frozen
// Qwen3.8-27B reference) and the first timed on an RTX PRO 6000 rather than an H100. Both facts are required
// disclosures: the loader refuses a build that drops them.
//
// Source-only and fail-closed: without the six published v1.6.16 files the version reports as unavailable, and any
// published evidence that does not validate fails closed. It never creates data, a review verdict or a manifest,
// and no item text, id, gold or per-item result may appear.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { validateJevbenchV16Release, mentionsPrivateSystem, JEVBENCH_V16_EXCLUDED_KEYS } from './jevbench-v16-release.mjs';
import { validateCategoryArtifact } from './jevbench-categories.mjs';
import { V1610_KEYS } from './jevbench-v1610-release.mjs';
import { readOptionalJevbenchV1615Release, V1615_ROOT, V1615_REGULAR_KEYS, V1615_UNRANKED_NEW_KEYS,
         V1615_CARRIED_PRELIMINARY_KEYS } from './jevbench-v1615-release.mjs';
import { JEV_PRELIMINARY_LISTING } from './jevbench-scope.mjs';

export const V1616_ROOT = V1615_ROOT;
export const V1616_MANIFEST = `${V1616_ROOT}/jevbench-v1.6.16-publication.json`;
export const V1616_FILE_KEYS = ['results', 'categories', 'proof', 'history', 'history-carry'];
const files = Object.fromEntries(V1616_FILE_KEYS.map(k => [k, `${V1616_ROOT}/jevbench-v1.6.16-${k}.json`]));
/** The one self-hosted GPU row this revision adds. */
export const V1616_NEW_KEYS = ['vllm-sr-d3'];
/** Carried from v1.6.15 listed but NOT ranked (#18761, Speed non-official); must stay so. */
export const V1616_UNRANKED_KEYS = [...V1615_UNRANKED_NEW_KEYS];
/** The ten full-draw rows of v1.6.15, carried. */
export const V1616_CARRIED_KEYS = [...V1615_REGULAR_KEYS];
/** Every full-draw row of this release. */
export const V1616_REGULAR_KEYS = [...V1616_CARRIED_KEYS, ...V1616_NEW_KEYS];
/** The A2 alias carried from v1.6.14, scored elsewhere and not rescored here. */
export const V1616_CARRIED_PRELIMINARY_KEYS = [...V1615_CARRIED_PRELIMINARY_KEYS];
export const V1616_KEYS = [...V1616_REGULAR_KEYS, ...V1616_CARRIED_PRELIMINARY_KEYS];
export const V1616_FIXED_G_MED = 9.839526770355711;
export const V1616_COST_CAP = 0.06459465517241379;
/** Rows allowed above the cost ceiling, each only with its disclosure (estimate at the frozen 27B reference). */
export const V1616_ABOVE_COST_CAP_KEYS = ['vllm-sr-d3'];
export const V1616_DRAW_RELEASE = 'v1.6-regular-20261012';
/** The only carried row whose stored A-basis diagnostic (v16.raw_on_A) depends on the ranked field and moved. */
export const V1616_RAW_ON_A_MOVED_KEYS = ['standard_one_3b_sh'];
/** Disclosures that are part of what this release publishes about the new row, not optional prose. */
export const V1616_REQUIRED_DISCLOSURES = Object.freeze({
  'vllm-sr-d3': ['5ce995dfb7ff07da00fec4211eb7f0560f52eaf8', 'Qwen/Qwen3.8-27B', 'Apache-2.0', 'training data is not disclosed',
                 'RTX PRO 6000', 'H100', 'x2 + 0.15 s', 'assumption', 'ESTIMATE', 'cost cap', 'squared cost gate',
                 '1,500 answered', '0 errors', '50/50 bit-identical'],
});
export const V1616_BASE_DIMS = ['families', 'usecases', 'languages'];
export function v1616Dims(categories) {
  return 'topics' in categories ? ['topics', ...V1616_BASE_DIMS] : [...V1616_BASE_DIMS];
}
export const V1616_DIMS = V1616_BASE_DIMS;

const hex = v => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const finite = v => typeof v === 'number' && Number.isFinite(v);
const fail = message => { throw new Error(`JevBench v1.6.16: ${message}`); };
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

export function validateJevbenchV1616Bundle({ manifest, artifact, categories, proof, previous, previousManifestSha256 }) {
  for (const value of [manifest, artifact, categories, proof]) {
    publicOnly(value);
    excluded(JSON.stringify(value));
  }
  // --- publication identity ------------------------------------------------------------------
  if (manifest?.schema_version !== 1 || manifest.revision !== 'v1.6.16' || manifest.status !== 'published' || manifest.provisional !== false) fail('publication status');
  if (manifest.review?.verdict !== 'PASS' || manifest.review.engine !== 'claude' || !hex(manifest.review.receipt_sha256)) fail('independent release review');
  if (!previous || previous.manifest?.revision !== 'v1.6.15' || previous.proof?.revision !== 'v1.6.15') fail('validated v1.6.15 predecessor required');
  same(manifest.predecessor, { revision: 'v1.6.15', publication_sha256: previousManifestSha256 }, 'predecessor binding');
  for (const k of ['historical_revision', 'historical_results_sha256', 'historical_carry_sha256']) same(manifest[k], previous.manifest[k], `historical binding ${k}`);
  for (const [key, path] of Object.entries(files)) if (manifest.files?.[key]?.path !== path || !hex(manifest.files[key].sha256)) fail(`file binding ${key}`);

  // --- artifact identity and the cohort ------------------------------------------------------
  if (artifact?.revision !== 'v1.6.16' || artifact.run_kind !== 'regular-queue' || artifact.noul_method?.applied !== 'O1S') fail('regular-queue identity');
  validateJevbenchV16Release({ ...artifact, revision: 'v1.6.1', run_kind: 'scheduled-refresh' }, 'v1.6.1');
  if (artifact.bootstrap?.B !== 1000 || artifact.bootstrap.bootstrap_seed !== 16 || artifact.bootstrap.g_med_fixed !== true) fail('artifact bootstrap');
  if (!sameSet(artifact.systems.map(s => s.key), V1616_KEYS)) fail('exact twelve-system cohort');
  if (artifact.systems.length !== previous.artifact.systems.length + V1616_NEW_KEYS.length) fail('exactly one added row');
  if (artifact.not_measured.length) fail('regular cohort has no not-measured rows');
  if (artifact.roster_count !== artifact.systems.length) fail('roster count');
  if (artifact.n_ranked !== artifact.systems.filter(s => s.ranked).length || artifact.n_ranked !== 10) fail('ten ranked rows');

  // --- every full-draw row ----------------------------------------------------------------------
  for (const s of artifact.systems) {
    if (V1616_CARRIED_PRELIMINARY_KEYS.includes(s.key)) continue;   // validated by the predecessor chain
    const isNew = V1616_NEW_KEYS.includes(s.key);
    if (s.v16?.lane !== (isNew ? 'selfhosted' : previous.artifact.systems.find(p => p.key === s.key).v16.lane)) fail(`lane ${s.key}`);
    if (s.status?.rows !== 1500 || s.status.status !== 'complete') fail(`complete 1500 rows ${s.key}`);
    if (s.full_coverage !== true) fail(`full coverage ${s.key}`);
    for (const axis of ['intelligence', 'calibration', 'speed', 'cost']) {
      if (!finite(s.axes?.[axis])) fail(`axis ${axis} ${s.key}`);
    }
    if (!finite(s.capability) || Math.abs(s.capability - (s.axes.intelligence + s.axes.calibration) / 2) > 1e-9) {
      fail(`capability is the mean of intelligence and calibration: ${s.key}`);
    }
    if (V1616_UNRANKED_KEYS.includes(s.key)) {
      if (s.ranked !== false || s.rank !== null || s.listing !== 'listed') fail(`listed-not-ranked row ${s.key}`);
      same(s.ranks, { A: null, B: null, C: null, capability: null }, `null ranks ${s.key}`);
      if (typeof s.not_ranked_because !== 'string' || !s.not_ranked_because.includes('#18761')) fail(`stated reason for not ranking ${s.key}`);
    } else if (!s.ranked || s.listing !== 'ranked' || !Number.isInteger(s.rank)) {
      fail(`every other full-draw row is ranked: ${s.key}`);
    }
    if (typeof s.repo !== 'string' || !s.repo.startsWith('https://')) fail(`repo ${s.key}`);
    if (typeof s.model_pin !== 'string' || !/@[a-f0-9]{40}$/.test(s.model_pin)) fail(`pinned revision ${s.key}`);
    if (!finite(s.cost?.usd_per_1000) || s.cost.usd_per_1000 <= 0) fail(`cost figure ${s.key}`);
    if (typeof s.cost.basis !== 'string' || s.cost.basis.length < 80) fail(`documented cost basis ${s.key}`);
    if (s.cost.usd_per_1000 > V1616_COST_CAP && !V1616_ABOVE_COST_CAP_KEYS.includes(s.key)) fail(`cost above the published ceiling ${s.key}`);
    const d = s.noul_decisive;
    if (!d || d.supported !== true || !Number.isInteger(d.n) || d.n !== 375 || !finite(d.decisive_rate)
        || !(finite(d.acc_among_decisive) || (d.acc_among_decisive === null && d.decisive === 0 && d.decisive_rate === 0))) fail(`noul decisiveness ${s.key}`);
  }

  // --- the new row ----------------------------------------------------------------------------
  for (const key of V1616_NEW_KEYS) {
    const s = artifact.systems.find(x => x.key === key);
    if (s.measured_in !== 'v1.6.16' || s.measurement_date_status !== 'measured' || s.last_measured_on !== '2026-10-12') fail(`measurement stamp ${key}`);
    if (s.endpoint_kind !== 'gpu' || s.api_flag !== false || s.v16.set !== 'S+P') fail(`self-hosted GPU lane ${key}`);
    if (s.status.answered_ok !== 1500) fail(`answered count ${key}`);
    if (s.speed?.adjustment !== 'x2 + 0.15 s (assumption, not measured)'
        || !(s.speed.p50_s_adjusted > s.speed.p50_s_raw) || !(s.speed.p95_s_adjusted > s.speed.p95_s_raw)) fail(`self-hosted latency adjustment ${key}`);
    if (s.cost?.kind !== 'estimate' || !/ESTIMATE/.test(s.cost.basis) || !/Qwen\/Qwen3\.8-27B/.test(s.cost.basis)) fail(`labelled cost estimate ${key}`);
    // the hardware difference is part of the row, not an optional extra
    if (typeof s.endpoint_condition !== 'string' || !s.endpoint_condition.includes('RTX PRO 6000') || !s.endpoint_condition.includes('H100')) fail(`hardware disclosure ${key}`);
    for (const ci of [s.composite_ci95, s.v16?.ci95?.composite]) {
      for (const o of ['A', 'B', 'C']) {
        const pair = ci?.[o];
        if (!Array.isArray(pair) || pair.length !== 2 || !finite(pair[0]) || !finite(pair[1]) || pair[0] > pair[1]
            || s.scores[o] < pair[0] - 1e-9 || s.scores[o] > pair[1] + 1e-9) fail(`new row interval ${o} does not contain its own point estimate: ${key}`);
      }
    }
    const capCi = s.v16?.ci95?.capability;
    if (!Array.isArray(capCi) || !(capCi[0] <= s.capability + 1e-9 && s.capability <= capCi[1] + 1e-9)) fail(`new row capability interval does not contain its own point estimate: ${key}`);
    const note = artifact.measurement_notes.find(n => n.startsWith(`${key}: `)) ?? '';
    if (note.length < 600) fail(`row note is too thin to be the disclosure it claims to be: ${key}`);
    for (const fragment of V1616_REQUIRED_DISCLOSURES[key] ?? []) {
      if (!note.includes(fragment)) fail(`required disclosure "${fragment}" missing from the note of ${key}`);
    }
    if (s.cost.usd_per_1000 > V1616_COST_CAP) {
      if (!artifact.measurement_notes.some(n => n.includes(key) && n.includes('NOT true of') && n.includes('cost ceiling'))) {
        fail(`a row above the cost ceiling must correct the inherited "every row is under the ceiling" note: ${key}`);
      }
      if (!(s.axes.cost < 50)) fail(`a row above the ceiling with a cost axis at or above 50 does not add up: ${key}`);
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
  for (const key of V1616_UNRANKED_KEYS) if (ranked.includes(key)) fail('a non-official Speed axis may not enter a ranked board');

  // --- the A2 alias is carried through unchanged ---------------------------------------------
  for (const key of V1616_CARRIED_PRELIMINARY_KEYS) {
    const a = previous.artifact.systems.find(s => s.key === key), b = artifact.systems.find(s => s.key === key);
    if (!a || !b) fail(`carried preliminary row present ${key}`);
    same(b, a, `carried preliminary row unchanged ${key}`);
    if (b.listing !== JEV_PRELIMINARY_LISTING || b.ranked !== false || b.rank !== null) fail(`carried row stays unranked ${key}`);
    if (categories.systems?.[key]) fail(`the carried A2 measurement has no category cells: ${key}`);
  }

  // --- the ten carried rows keep every point estimate ------------------------------------------
  // What may differ on a carried row, and nothing else: its placement (rank, ranks - recomputed over the new
  // roster), its bootstrap intervals (composite_ci95, v16.ci95) and, only on a row whose A-basis diagnostic
  // depends on the ranked field, v16.raw_on_A. Every move must be disclosed in the notes.
  const diagnosticMoved = artifact.G_med_api_basis_P_vs_A !== previous.artifact.G_med_api_basis_P_vs_A;
  const strip = (row, allowRawOnA) => {
    const copy = JSON.parse(JSON.stringify(row));
    delete copy.composite_ci95; delete copy.rank; delete copy.ranks;
    if (copy.v16) { delete copy.v16.ci95; if (allowRawOnA) delete copy.v16.raw_on_A; }
    return copy;
  };
  const releaseNote = artifact.measurement_notes.find(n => n.startsWith('v1.6.16 ADDS ONE')) ?? '';
  for (const key of V1616_CARRIED_KEYS) {
    const a = previous.artifact.systems.find(s => s.key === key), b = artifact.systems.find(s => s.key === key);
    if (!a || !b) fail(`carried row present ${key}`);
    const rawOnAMoved = JSON.stringify(a.v16?.raw_on_A) !== JSON.stringify(b.v16?.raw_on_A);
    if (rawOnAMoved && !diagnosticMoved) fail(`raw_on_A moved while the API-basis diagnostic did not: ${key}`);
    if (rawOnAMoved && !V1616_RAW_ON_A_MOVED_KEYS.includes(key)) fail(`raw_on_A may only move on the disclosed row: ${key}`);
    if (rawOnAMoved && !releaseNote.includes(`${key}: intelligence`)) fail(`a moved raw_on_A must name its row in the notes: ${key}`);
    same(strip(b, rawOnAMoved), strip(a, rawOnAMoved),
         `carried row differs outside rank/ranks/composite_ci95/v16.ci95${rawOnAMoved ? '/v16.raw_on_A' : ''}: ${key}`);
    if (V1616_UNRANKED_KEYS.includes(key)) same(b, a, `the listed-not-ranked row is carried unchanged: ${key}`);
    // The scorer seeds each row's bootstrap with seed + its position in the key-sorted roster; vllm-sr-d3 sorts
    // last, so no carried row's position changed and the release note states that no carried interval moved.
    // Hold it to that: a moved carried interval here is a build error, not a disclosure.
    same([b.composite_ci95, b.v16?.ci95], [a.composite_ci95, a.v16?.ci95], `carried interval moved although the release says none did: ${key}`);
    for (const ci of [b.composite_ci95, b.v16?.ci95?.composite]) {
      for (const o of ['A', 'B', 'C']) {
        const pair = ci?.[o];
        if (!Array.isArray(pair) || pair.length !== 2 || !finite(pair[0]) || !finite(pair[1])
            || pair[0] > pair[1] || b.scores[o] < pair[0] - 1e-9 || b.scores[o] > pair[1] + 1e-9) {
          fail(`carried row interval ${o} does not contain its own point estimate: ${key}`);
        }
      }
    }
    for (const o of ['A', 'B', 'C']) if (a.scores[o] !== b.scores[o]) fail(`earlier row point score ${key}.${o}`);
    for (const axis of ['intelligence', 'calibration', 'speed', 'cost']) if (a.axes[axis] !== b.axes[axis]) fail(`earlier row axis ${key}.${axis}`);
    if (a.capability !== b.capability) fail(`earlier row capability ${key}`);
    same(b.cost, a.cost, `earlier row cost object ${key}`);
    same(b.speed, a.speed, `earlier row speed object ${key}`);
    same(b.noul_decisive, a.noul_decisive, `earlier row noul decisiveness ${key}`);
    if (a.display !== b.display || a.model_pin !== b.model_pin || a.repo !== b.repo) fail(`earlier row identity ${key}`);
    // a carried rank may only move by the rows that joined above it, and a move must be named in the release note
    if (a.ranked) {
      for (const o of ['A', 'B', 'C', 'capability']) {
        const above = V1616_NEW_KEYS.filter(k => {
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
  if (!artifact.measurement_notes.some(n => n.includes('#18761') && n.includes('LISTED BUT NOT RANKED'))) fail('the non-official Speed disclosure is mandatory');
  if (!artifact.measurement_notes.some(n => n.includes('"All data"') && n.includes('Noul table') && n.includes('non-official'))) {
    fail('the listed-not-ranked row needs its where-it-is-shown disclosure');
  }
  if (diagnosticMoved) {
    const values = [previous.artifact.G_med_api_basis_P_vs_A, artifact.G_med_api_basis_P_vs_A].map(String);
    if (!artifact.measurement_notes.some(n => n.includes('API-basis median diagnostic'))) fail('a moved API-basis diagnostic must be disclosed, not left to be found');
    if (!artifact.measurement_notes.some(n => n.includes('API-basis median diagnostic') && values.every(v => n.includes(v)))) {
      fail('the diagnostic disclosure must state both values');
    }
  }
  // the public top-five change this row causes, and the GO it needed, are part of the release
  if (!artifact.measurement_notes.some(n => n.includes('card 17392') && n.includes('#1 on Capability') && n.includes('Perplexity Decider'))) {
    fail('the top-five change and the GO behind it must be disclosed');
  }
  if (artifact.G_med !== V1616_FIXED_G_MED || previous.artifact.G_med !== V1616_FIXED_G_MED) fail('frozen v1.6.10 G_med');

  // --- the draw and the proof -----------------------------------------------------------------
  if (artifact.v16.draw_release !== V1616_DRAW_RELEASE) fail('draw identity');
  if (!hex(artifact.v16.freeze_manifest_sha256) || !hex(artifact.v16.seed_commitment) || !hex(artifact.v16.baseline_sha256)) fail('draw provenance hashes');
  for (const set of ['S', 'A', 'P', 'core']) if (!hex(artifact.v16.draw_digests?.[set])) fail(`draw digest ${set}`);
  if (proof?.schema_version !== 1 || proof.revision !== 'v1.6.16' || proof.method !== 'jevbench::v1.6'
      || proof.noul_method?.applied !== 'O1S' || proof.bootstrap?.B !== 1000 || proof.bootstrap.seed !== 16) fail('method proof');
  if (proof.draw_release !== artifact.v16.draw_release || proof.freeze_manifest_sha256 !== artifact.v16.freeze_manifest_sha256
      || proof.seed_commitment !== artifact.v16.seed_commitment || !hex(proof.baseline_sha256)
      || !hex(proof.cost_basis_sha256) || !hex(proof.registry_sha256) || !hex(proof.pricing_module_sha256)) fail('draw/cohort binding');
  if (proof.abandoned_draw_note !== null) fail('abandoned-draw disclosure');
  if (typeof proof.authority !== 'string' || !proof.authority.includes('#18761') || !proof.authority.includes('#18209')
      || !proof.authority.includes('card 17392')) fail('publication authority');
  if (!sameSet(Object.keys(proof.raw_sha256 ?? {}), V1616_REGULAR_KEYS)) fail('raw-output coverage');
  same(Object.fromEntries(V1616_CARRIED_KEYS.map(k => [k, proof.raw_sha256[k]])), previous.proof.raw_sha256, 'inherited raw-output hashes unchanged');
  same(proof.a2_supplement, previous.proof.a2_supplement, 'carried A2 scorer binding unchanged');
  const rows = proof.systems;
  if (!Array.isArray(rows) || !sameSet(rows.map(s => s.key), V1616_REGULAR_KEYS)) fail('system proof coverage');
  for (const s of artifact.systems) {
    if (V1616_CARRIED_PRELIMINARY_KEYS.includes(s.key)) continue;
    const p = rows.find(r => r.key === s.key);
    if (!p || p.rows !== 1500 || p.status !== 'complete' || !hex(p.raw_sha256) || p.raw_sha256 !== proof.raw_sha256[s.key]) fail(`system proof ${s.key}`);
    if (p.model_pin !== s.model_pin || Math.abs(p.composite_A - s.scores.A) > 1e-12 || p.rank !== s.rank) fail(`proof agrees with the row ${s.key}`);
    if (typeof p.measured_by !== 'string' || !p.measured_by.trim()) fail(`measuring operator ${s.key}`);
    if (p.source_review_sha256 !== null && !hex(p.source_review_sha256)) fail(`source review hash ${s.key}`);
    if (typeof p.source_review_note !== 'string' || p.source_review_note.length < 20) fail(`source review note ${s.key}`);
  }
  if (!sameSet(Object.keys(proof.new_rows ?? {}), V1616_NEW_KEYS)) fail('new-row provenance coverage');
  for (const key of V1616_NEW_KEYS) {
    const n = proof.new_rows[key];
    const row = artifact.systems.find(s => s.key === key);
    if (!n || n.raw_sha256 !== proof.raw_sha256[key] || n.answered_ok !== 1500 || n.rows !== 1500
        || !finite(n.usd_per_1000) || n.ranked !== true
        || n.under_cost_cap !== (n.usd_per_1000 <= V1616_COST_CAP)) fail(`new-row provenance ${key}`);
    if (n.answered_ok !== row.status.answered_ok || Math.abs(n.usd_per_1000 - row.cost.usd_per_1000) > 1e-12) fail(`new-row provenance agrees with the row ${key}`);
    if (n.determinism?.n !== 50 || n.determinism.bit_identical !== 50 || n.determinism.argmax_flips !== 0) fail(`determinism receipt ${key}`);
    if (!hex(n.pod_driver_sha256) || !hex(n.private_result_sha256) || typeof n.hardware !== 'string') fail(`measurement provenance ${key}`);
  }
  // --- the frozen median, recomputable from its four v1.6.10 members --------------------------
  const members = proof.field_median?.members;
  if (proof.field_median?.g_med_fixed !== true || proof.g_med_fixed_from?.revision !== 'v1.6.10'
      || proof.g_med_fixed_from.G_med !== V1616_FIXED_G_MED || proof.g_med_fixed_from.baseline_sha256 !== proof.baseline_sha256) fail('frozen field median provenance');
  if (!Array.isArray(members) || !sameSet(members.map(m => m.key), V1610_KEYS)
      || !members.every(m => finite(m.gap) && artifact.systems.find(s => s.key === m.key)?.intelligence?.gap === m.gap)) fail('field median cohort');
  const gaps = members.map(m => m.gap).sort((a, b) => a - b);
  const median = gaps.length % 2 ? gaps[(gaps.length - 1) / 2] : (gaps[gaps.length / 2 - 1] + gaps[gaps.length / 2]) / 2;
  if (Math.abs(artifact.G_med - median) > 1e-9 || proof.field_median.G_med !== artifact.G_med) fail('cohort G_med');
  if (artifact.G_med_flag_gt10 !== (artifact.G_med > 10)) fail('G_med flag consistency');
  if (Math.abs(proof.gap_penalty_threshold - (artifact.G_med + 8)) > 1e-6) fail('gap penalty threshold');

  // --- categories ------------------------------------------------------------------------------
  if (categories?.revision !== 'v1.6.16' || categories.provisional !== false
      || categories.source_results_sha256 !== artifact.source_sha256
      || categories.draw_release !== artifact.v16.draw_release
      || categories.results_sha256 !== manifest.files.results.sha256) fail('category source binding');
  const dims = v1616Dims(categories);
  if ('topics' in categories) {
    if (!hex(categories.labels_sha256)) fail('a topic radar needs the labels digest it was built from');
    if (categories.labels_draw_release !== V1616_DRAW_RELEASE) fail('topic labels must be for this draw');
  } else if (!artifact.measurement_notes.some(n => n.includes('topic'))) {
    fail('a release without the topic radar must say so in its measurement notes');
  }
  for (const field of ['live_category_cells', 'supplement', 'language_cells', 'unavailable']) if (field in categories) fail(`historical category overlay ${field}`);
  for (const field of ['lane_note', 'metric', 'labelling']) if (typeof categories[field] !== 'string' || !categories[field].trim()) fail(`category field ${field}`);
  if (!Array.isArray(categories.rules) || !categories.rules.length) fail('category rules');
  if (!categories.lanes || !sameSet(Object.keys(categories.lanes), V1616_REGULAR_KEYS)) fail('category lanes');
  for (const key of V1616_REGULAR_KEYS) {
    const expected = V1616_NEW_KEYS.includes(key) ? 'selfhosted' : previous.categories.lanes[key];
    if (categories.lanes[key] !== expected) fail(`category lane ${key}`);
  }
  validateCategoryArtifact(categories, dims);
  if (!sameSet(Object.keys(categories.systems), V1616_REGULAR_KEYS)) fail('category cohort');
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
  for (const key of V1616_REGULAR_KEYS) for (const dim of dims) {
    for (const c of categories[dim]) {
      const cell = categories.systems[key]?.[dim]?.[c.key];
      if (c.n >= categories.min_n && !cell) fail(`missing category ${key}.${dim}.${c.key}`);
      if (c.n < categories.min_n && cell) fail(`below-min_n category must be omitted: ${key}.${dim}.${c.key}`);
      if (cell && (!Number.isInteger(cell.n) || cell.n < categories.min_n || !finite(cell.competence))) fail(`category cell ${key}.${dim}.${c.key}`);
    }
  }
  // Carried category cells are the published v1.6.15 cells, cell by cell.
  for (const key of V1616_CARRIED_KEYS) same(categories.systems[key], previous.categories.systems[key], `inherited category cells ${key}`);
  return { artifact, categories, proof, manifest };
}

async function load(path, root) {
  const bytes = await readFile(`${root}/${path}`);
  const text = bytes.toString('utf8'); excluded(text);
  return { value: JSON.parse(text), bytes, sha256: createHash('sha256').update(bytes).digest('hex') };
}

/** Missing publication manifest means the version is unavailable; invalid published evidence fails closed. */
export async function readOptionalJevbenchV1616Release(root = process.cwd()) {
  let publication;
  try { publication = await load(V1616_MANIFEST, root); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  const previous = await readOptionalJevbenchV1615Release(root);
  if (!previous) fail('v1.6.16 needs the published v1.6.15 release it extends');
  const previousManifest = await load(`${V1616_ROOT}/jevbench-v1.6.15-publication.json`, root);
  const bundle = Object.fromEntries(await Promise.all(Object.entries(files).map(async ([k, path]) => [k, await load(path, root)])));
  for (const [key, value] of Object.entries(bundle)) if (publication.value.files?.[key]?.sha256 !== value.sha256) fail(`bytes hash ${key}`);
  if (bundle.history.sha256 !== previous.historical.sha256) fail('immutable history bytes');
  if (bundle['history-carry'].sha256 !== previous.historical.carrySha256) fail('immutable carry bytes');
  validateJevbenchV1616Bundle({ manifest: publication.value, artifact: bundle.results.value, categories: bundle.categories.value,
    proof: bundle.proof.value, previous, previousManifestSha256: previousManifest.sha256 });
  return { artifact: bundle.results.value, bytes: bundle.results.bytes, sha256: bundle.results.sha256,
           categories: bundle.categories.value, categoriesSha256: bundle.categories.sha256,
           proof: bundle.proof.value, proofSha256: bundle.proof.sha256, manifest: publication.value,
           historical: previous.historical };
}

/** Optional navigation must never make an older board depend on fresh publication health. */
export async function hasPublishedJevbenchV1616Release(root = process.cwd(), log = console.error) {
  try { return Boolean(await readOptionalJevbenchV1616Release(root)); }
  catch { log('JevBench v1.6.16 navigation omitted: publication validation failed'); return false; }
}

/** Board input: this release's own twelve rows, with no historical overlay mixed in. */
export function v1616BoardInput(release) {
  return { artifact: release.artifact, categories: release.categories };
}
