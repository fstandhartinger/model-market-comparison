// v1.6.19: ranked Ventus-2B CPU addendum; predecessor disclosures and points remain unchanged.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { validateJevbenchV16Release, mentionsPrivateSystem, JEVBENCH_V16_EXCLUDED_KEYS } from './jevbench-v16-release.mjs';
import { validateCategoryArtifact } from './jevbench-categories.mjs';
import { V1610_KEYS } from './jevbench-v1610-release.mjs';
import { readOptionalJevbenchV1618Release, V1618_ROOT, V1618_CARRIED_KEYS, V1618_CORE_NEW_KEYS, V1618_OPTIONAL_KEYS, V1618_UNRANKED_CARRIED_KEYS,
         V1618_CARRIED_PRELIMINARY_KEYS, V1618_ABOVE_COST_CAP_KEYS } from './jevbench-v1618-release.mjs';
import { JEV_PRELIMINARY_LISTING } from './jevbench-scope.mjs';

export const V1619_ROOT = V1618_ROOT;
export const V1619_MANIFEST = `${V1619_ROOT}/jevbench-v1.6.19-publication.json`;
export const V1619_FILE_KEYS = ['results', 'categories', 'proof', 'history', 'history-carry'];
const files = Object.fromEntries(V1619_FILE_KEYS.map(k => [k, `${V1619_ROOT}/jevbench-v1.6.19-${k}.json`]));
/** Always part of this release. */
export const V1619_CORE_NEW_KEYS = ['ventus-2b'];
/** Part of this release only once their final scoring lands; each may be present or absent. */
export const V1619_OPTIONAL_KEYS = [];
/** The paid public fast-lane rows (publish under the paid exception, disclosed as such). */
export const V1619_PAID_KEYS = [];
/** Carried listed-but-not-ranked rows (#18761) and the A2 alias. */
export const V1619_UNRANKED_CARRIED_KEYS = [...V1618_UNRANKED_CARRIED_KEYS, 'nimble-v4', 'nimble-v4-max'];
export const V1619_CARRIED_KEYS = [...V1618_CARRIED_KEYS, ...V1618_CORE_NEW_KEYS, ...V1618_OPTIONAL_KEYS];
export const V1619_CARRIED_PRELIMINARY_KEYS = [...V1618_CARRIED_PRELIMINARY_KEYS];
export const V1619_FIXED_G_MED = 9.839526770355711;
export const V1619_COST_CAP = 0.06459465517241379;
export const V1619_DRAW_RELEASE = 'v1.6-regular-20261012';
/** Rows allowed above the cost ceiling, each only with its disclosure. */
export const V1619_ABOVE_COST_CAP_KEYS = [...V1618_ABOVE_COST_CAP_KEYS];
const SELF_HOSTED_ADJ = 'x2 + 0.15 s (assumption, not measured)';
/** What each new row must be, and what its note must say. A deleted disclosure is not a style change. */
export const V1619_ROW_SPEC = Object.freeze({"ventus-2b": {"kind": "cpu", "ranked": true, "unpriced": false, "display": "Ventus-2B (Ethan Xie, single-pass letter-logit readout over Qwen3.5-2B-Base)", "disclosures": ["1,485 of 1,500", "15 HTTP 422", "678,427", "0 output tokens", "LOWER BOUND", "7.95", "36.16", "18.24", "Ventus-2B by Ethan Xie (https://github.com/XieShaocong33Ethan/Ventus-2B)", "ROW-VENTUS-R113.json"], "conditionFragments": ["2,048", "AUTHOR", "OUR", "float32", "SPLIT WINDOW"], "basisFragments": ["ESTIMATE", "DEEPINFRA_BASE_REFERENCES", "full 1,500-row"]}});
const VENTUS_REGISTRY_TEXT = {"_artifact_note": "This is the re-published artifact, not the one run 74 measured: that revision (fac8e853eaf0d509f68c7ce6fb5ab4a76e2aaca7) was withdrawn and no longer resolves on the Hub (HTTP 404 'Invalid rev id'), the weight file is now 3,763,687,248 B (about 1.9 B parameters) against the earlier 2.48 B, and the card publishes a different prompt contract. Run 74's raw output is NOT reused and stays unscored on the retired a2 draw. The HOLD recorded in CoS deputy decision #18760 ('until weights are publicly available again') is satisfied: the repository is public and not gated again, and the author re-submitted the system himself on 14 Oct 2026 07:01Z (bh-submit:9ab082e1-a010-4f50-808d-60999bdf656a). Admission for the measurement: #18209/#18211; stated before dispatch on board #19114.", "_self_reported_not_used": "The model card claims 75.76 % on the RETIRED 231-item public JevBench suite and a 'Rank #1 sub-3B' on the author's own 20,048-task suite. Neither is a board number, neither was used, and neither is shown anywhere on the page.", "author": "Ethan Xie (Xie Shaocong) / @shaocong_x9020 (benchmarkheaven.com/submit ref 2A93F77A)", "base_model": "Qwen/Qwen3.5-2B-Base", "cost_basis": "ESTIMATE (*est.) through the UNMODIFIED frozen pricing_v15 path (sha256 dae86740...): the artifact's own declared base Qwen/Qwen3.5-2B-Base is in DEEPINFRA_BASE_REFERENCES and resolves to deepinfra:Qwen/Qwen3.5-2B USD 0.02/M input, USD 0.1/M output, taken from the frozen 25 Sep 2026 DeepInfra snapshot, multiplied by this row's OWN measured input tokens and divided by the full 1,500-row basis the scorer uses. The output term is 0 because the system generates nothing: one forward pass with logits_to_keep=1 reads the option letters' logits, and the serving shim reports usage.output_tokens as a literal 0 on every answered row (the same shape as pjev-2b and decision-2b). No new release-lane pricing line is created, no frozen-table change of any kind, and the capitalisation is the one the author's own model card declares - the all-lowercase catalog spelling and 'Qwen/Qwen3.5-2B-base' both RAISE in the frozen path. Free weights are never cost 100 and never cost 0.", "cost_kind": "estimate", "display": "Ventus-2B (Ethan Xie, single-pass letter-logit readout over Qwen3.5-2B-Base)", "endpoint_condition": "Sandy, the evaluator's own shared CPU host (AMD Zen 2, 12 threads, AVX2, no AVX-512, no AMX), NOT a dedicated machine: the 1-minute load average was logged every 60 s into r113/logs/CONDITIONS-ventus-2b.jsonl and is reported with the row. The author ships NO server and NO JevBench interface - their repository publishes a quickstart snippet only - so the HTTP surface is the evaluator's (r113/src/ventus_shim_r113.py, sha256 ced491db5771fe26a7c21877bad2b26a1d8146f4876a65786dd5cd0ed1b02fa2; prompt contract r113/src/ventus_prompt_r113.py, sha256 15369e600f1d82239eced3c17250650106daa7f1d6e301de166a89ab929b958c) and NO file of the author's is edited or executed. The prompt is their published 'Canonical Prompt Contract' verbatim (Evidence:/Question:/Options:/'Answer: (' with options rendered 'A) ...') and the readout is their own softmax over the option letters' last-position logits. The noul and score mappings are OURS, pre-registered in r113/PREREG-R113.md section 3 before the run and carried over unchanged from run 74's PREREG-R96.md: noul = a two-option 'A) yes - <criteria.true>' / 'B) no - <criteria.false>' choice reported as p(A); score = the levels as A)..E) with score = sum(i*p_i). Any weak calibration on those two types is a result under OUR mapping. Stack: stock transformers 5.19.0 (the version the checkpoint declares), torch 2.14.1 CPU, float32 (a strict upcast of the stored bfloat16 - exactly representable, never lossy - chosen because bf16 is about 5x slower on this AVX2 host; it can only cost Speed), 6 threads, one request at a time under a lock, inside a loopback-only network namespace with an outbound probe that failed as required, offline (HF_HUB_OFFLINE=1, TRANSFORMERS_OFFLINE=1) and credential-free. transformers reports that causal_conv1d and chunk_gated_delta_rule fall back to their reference PyTorch implementations because the optimised kernels are not installed - correct but much slower, and a further reason this Speed is a lower bound. PROMPT CAP, DISCLOSED: 2,048 tokens, which is the AUTHOR'S OWN published max_length, not a limit of their model (its context is 262,144). Their quickstart would left-truncate at that length; this run REFUSES instead (HTTP 422), because truncating an item's state answers a different question. That is why 15 of the 1,500 items are honest refusals - the same 15 over-length items the uniphore-4b-decider, standard_one_3b_sh, attest-31b and purplemist-mini-1.0 rows of this draw also fail on, and exactly the 15 the offline pre-registration named before the run. Speed is a loaded-shared-CPU float32-on-AVX2 figure and a declared LOWER BOUND against the author's own claim of about 14 ms per decision on a GPU; the standard self-hosted x2 + 0.15 s adjustment is applied on top and the raw p50/p95 are kept. SPLIT WINDOW, DISCLOSED: this row was measured in two sittings - 2026-10-14 07:34:33Z to 08:05:23Z (261 answers) and from 08:33:26Z to the end. The first sitting was stopped by this job's own pressure guard on swap OCCUPANCY that belonged to another job on this shared host (63.0 % of swap in use, while 39.9 % of memory was free and psi_full_avg60 was 2.05); this row's scope runs with MemorySwapMax=0 and cannot use a single page of swap itself. No guard threshold was changed: the item custodian granted relief (#19143, after #19137) and the row resumed by task id under the unchanged guard, so no item was answered twice and no item was answered under a different configuration. Both sittings' per-minute 1-minute-load traces are in r113/logs/CONDITIONS-ventus-2b.jsonl and the guard decisions in r113/logs/PRESSURE-r113-ventus*.jsonl. Its Speed therefore carries the same kind of interference disclosure as pjev-2b and reflex-instinct-0.6b.", "endpoint_kind": "cpu", "lane": "selfhosted", "licence": "Ventus Community Research & Inference License 1.0, the repository's own LICENSE file (sha-verified git blob 49f899e843459a95e43a296133f020a6398dac9e). DISCLOSED CONTRADICTION: the model card's YAML front matter claims 'license: apache-2.0' and GitHub reports NOASSERTION, while the LICENSE file is this custom licence; the stricter file is what governs here and it is what was reviewed. Section 1(a) grants inference, academic evaluation and public benchmark reproduction, and section 3(a) expressly permits evaluating the model on public benchmarks 'including JevBench, Benchmark Heaven, Jev Decision Index' and publishing objective scoring and latency metrics. Section 2 bans training, fine-tuning and distillation, none of which this evaluation does. Section 4 requires the attribution line: 'Ventus-2B by Ethan Xie (https://github.com/XieShaocong33Ethan/Ventus-2B)'.", "price_in_per_m": 0.02, "price_kind": "estimate", "price_out_per_m": 0.1, "ranked": true, "repo": "https://huggingface.co/Ethan33X/Ventus-2B", "revision": "d9d4e599749433fcbe7273b23717f8427c36fed4", "support": {"choice": "native", "noul": "native", "score": "native"}};
export const V1619_BASE_DIMS = ['families', 'usecases', 'languages'];
export function v1619Dims(categories) {
  return 'topics' in categories ? ['topics', ...V1619_BASE_DIMS] : [...V1619_BASE_DIMS];
}
export const V1619_DIMS = V1619_BASE_DIMS;

const hex = v => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const finite = v => typeof v === 'number' && Number.isFinite(v);
const fail = message => { throw new Error(`JevBench v1.6.19: ${message}`); };
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

export function validateJevbenchV1619Bundle({ manifest, artifact, categories, proof, previous, previousManifestSha256 }) {
  for (const value of [manifest, artifact, categories, proof]) {
    publicOnly(value);
    excluded(JSON.stringify(value));
  }
  // --- publication identity ------------------------------------------------------------------
  if (manifest?.schema_version !== 1 || manifest.revision !== 'v1.6.19' || manifest.status !== 'published' || manifest.provisional !== false) fail('publication status');
  if (manifest.review?.verdict !== 'PASS' || manifest.review.engine !== 'claude' || !hex(manifest.review.receipt_sha256)) fail('independent release review');
  if (!previous || previous.manifest?.revision !== 'v1.6.18' || previous.proof?.revision !== 'v1.6.18') fail('validated v1.6.18 predecessor required');
  same(manifest.predecessor, { revision: 'v1.6.18', publication_sha256: previousManifestSha256 }, 'predecessor binding');
  for (const k of ['historical_revision', 'historical_results_sha256', 'historical_carry_sha256']) same(manifest[k], previous.manifest[k], `historical binding ${k}`);
  for (const [key, path] of Object.entries(files)) if (manifest.files?.[key]?.path !== path || !hex(manifest.files[key].sha256)) fail(`file binding ${key}`);

  // --- artifact identity and the cohort ------------------------------------------------------
  if (artifact?.revision !== 'v1.6.19' || artifact.run_kind !== 'regular-queue' || artifact.noul_method?.applied !== 'O1S') fail('regular-queue identity');
  validateJevbenchV16Release({ ...artifact, revision: 'v1.6.1', run_kind: 'scheduled-refresh' }, 'v1.6.1');
  if (artifact.bootstrap?.B !== 1000 || artifact.bootstrap.bootstrap_seed !== 16 || artifact.bootstrap.g_med_fixed !== true) fail('artifact bootstrap');
  const allKeys = artifact.systems.map(s => s.key);
  const newKeys = allKeys.filter(k => !V1619_CARRIED_KEYS.includes(k) && !V1619_CARRIED_PRELIMINARY_KEYS.includes(k)).sort();
  for (const k of V1619_CORE_NEW_KEYS) if (!newKeys.includes(k)) fail(`required new row missing: ${k}`);
  for (const k of newKeys) if (!V1619_CORE_NEW_KEYS.includes(k) && !V1619_OPTIONAL_KEYS.includes(k)) fail(`unknown new row ${k}`);
  if (!sameSet(allKeys, [...V1619_CARRIED_KEYS, ...newKeys, ...V1619_CARRIED_PRELIMINARY_KEYS])) fail('exact cohort');
  if (artifact.systems.length !== previous.artifact.systems.length + newKeys.length) fail('exactly the added rows');
  if (artifact.not_measured.length) fail('regular cohort has no not-measured rows');
  if (artifact.roster_count !== artifact.systems.length) fail('roster count');
  const newRanked = newKeys.filter(k => artifact.systems.find(s => s.key === k).ranked);
  const unrankedKeys = [...V1619_UNRANKED_CARRIED_KEYS, ...newKeys.filter(k => !newRanked.includes(k))];
  if (artifact.n_ranked !== artifact.systems.filter(s => s.ranked).length || artifact.n_ranked !== previous.artifact.n_ranked + newRanked.length) fail('ranked row count');
  const regularKeys = [...V1619_CARRIED_KEYS, ...newKeys];

  // --- every full-draw row ----------------------------------------------------------------------
  for (const s of artifact.systems) {
    if (V1619_CARRIED_PRELIMINARY_KEYS.includes(s.key)) continue;   // validated by the predecessor chain
    const isNew = newKeys.includes(s.key);
    const spec = V1619_ROW_SPEC[s.key];
    const expectedLane = isNew ? (spec.kind === 'api' ? 'api' : 'selfhosted') : previous.artifact.systems.find(p => p.key === s.key).v16.lane;
    if (s.v16?.lane !== expectedLane) fail(`lane ${s.key}`);
    if (s.status?.rows !== 1500 || s.status.status !== 'complete') fail(`complete 1500 rows ${s.key}`);
    if (s.full_coverage !== true) fail(`full coverage ${s.key}`);
    const unpriced = s.cost?.kind === 'unpriced';
    if (unpriced && !(isNew ? spec.unpriced : previous.artifact.systems.find(p => p.key === s.key).cost.kind === 'unpriced')) fail(`only a row with a stated unpriced ruling may be unpriced: ${s.key}`);
    for (const axis of ['intelligence', 'calibration', 'speed', ...(unpriced ? [] : ['cost'])]) {
      if (!finite(s.axes?.[axis])) fail(`axis ${axis} ${s.key}`);
    }
    if (unpriced && s.ranked) fail(`an unpriced row has no composite and cannot be ranked: ${s.key}`);
    if (unpriced && (s.axes.cost !== null || s.cost.usd_per_1000 !== null || ['A', 'B', 'C'].some(o => s.scores?.[o] !== null))) fail(`an unpriced row has no cost axis and no composite: ${s.key}`);
    if (!finite(s.capability) || Math.abs(s.capability - (s.axes.intelligence + s.axes.calibration) / 2) > 1e-9) {
      fail(`capability is the mean of intelligence and calibration: ${s.key}`);
    }
    if (unrankedKeys.includes(s.key)) {
      if (s.ranked !== false || s.rank !== null || s.listing !== 'listed') fail(`listed-not-ranked row ${s.key}`);
      same(s.ranks, { A: null, B: null, C: null, capability: null }, `null ranks ${s.key}`);
      if (typeof s.not_ranked_because !== 'string' || s.not_ranked_because.length < 60) fail(`stated reason for not ranking ${s.key}`);
      if (s.key === 'reflex-instinct-0.6b' && !s.not_ranked_because.includes('#18761')) fail(`stated reason for not ranking ${s.key}`);
      if (isNew && spec.reason && !s.not_ranked_because.includes(spec.reason)) fail(`the ruling behind the missing rank must be named: ${s.key}`);
    } else if (!s.ranked || s.listing !== 'ranked' || !Number.isInteger(s.rank)) {
      fail(`every other full-draw row is ranked: ${s.key}`);
    }
    if (typeof s.repo !== 'string' || !s.repo.startsWith('https://')) fail(`repo ${s.key}`);
    const apiPin = s.endpoint_kind === 'api';
    if (typeof s.model_pin !== 'string' || !(/@[a-f0-9]{40}$/.test(s.model_pin) || (apiPin && (/@[a-f0-9]{8,40}$/.test(s.model_pin) || /^hosted-api:/.test(s.model_pin))))) fail(`pinned revision ${s.key}`);
    if (!unpriced && (!finite(s.cost?.usd_per_1000) || s.cost.usd_per_1000 <= 0)) fail(`cost figure ${s.key}`);
    if (typeof s.cost.basis !== 'string' || s.cost.basis.length < 80) fail(`documented cost basis ${s.key}`);
    if (!unpriced && s.cost.usd_per_1000 > V1619_COST_CAP && !V1619_ABOVE_COST_CAP_KEYS.includes(s.key)) fail(`cost above the published ceiling ${s.key}`);
    const d = s.noul_decisive;
    if (!d || d.supported !== true || !Number.isInteger(d.n) || d.n !== 375 || !finite(d.decisive_rate)
        || !(finite(d.acc_among_decisive) || (d.acc_among_decisive === null && d.decisive === 0 && d.decisive_rate === 0))) fail(`noul decisiveness ${s.key}`);
  }

  // --- the new rows ---------------------------------------------------------------------------
  for (const key of newKeys) {
    const s = artifact.systems.find(x => x.key === key), spec = V1619_ROW_SPEC[key];
    for (const [field, regField] of [['endpoint_condition','endpoint_condition'],['licence','licence'],['repo','repo'],['_artifact_note','_artifact_note']]) same(s[field], VENTUS_REGISTRY_TEXT[regField], `Ventus registry ${field} verbatim`);
    same(s.cost.basis, VENTUS_REGISTRY_TEXT.cost_basis, 'Ventus registry cost basis verbatim');
    if (s.model_pin !== 'Ethan33X/Ventus-2B@' + VENTUS_REGISTRY_TEXT.revision) fail('Ventus pinned revision');
    if (s.cost.usd_per_1000 !== 0.009045693333333334) fail('Ventus measured frozen cost');
    if (s.measured_in !== 'v1.6.19' || s.measurement_date_status !== 'measured' || !['2026-10-14'].includes(s.last_measured_on)) fail(`measurement stamp ${key}`);
    if (spec.ranked !== null && s.ranked !== spec.ranked) fail(`treatment of ${key} is fixed by its ruling`);
    if (spec.display && s.display !== spec.display) fail(`display ${key}`);
    if (s.endpoint_kind !== spec.kind || s.api_flag !== (spec.kind === 'api') || s.v16.set !== 'S+P') fail(`lane/endpoint kind ${key}`);
    if (spec.kind === 'api') {
      if (s.v16.full_set_api !== true || s.v16.equated !== null || s.speed?.adjustment !== 'none (API)') fail(`full-set API row, not equated, no latency adjustment ${key}`);
    } else if (s.speed?.adjustment !== SELF_HOSTED_ADJ || !(s.speed.p50_s_adjusted > s.speed.p50_s_raw) || !(s.speed.p95_s_adjusted > s.speed.p95_s_raw)) {
      fail(`self-hosted latency adjustment ${key}`);
    }
    const latency = proof.new_rows?.[key];
    if (s.speed.p50_s_raw !== latency?.p50_s_raw || s.speed.p95_s_raw !== latency?.p95_s_raw) fail(`receipt latency ${key}`);
    if (spec.kind !== 'api' && (Math.abs(s.speed.p50_s_adjusted - (2*s.speed.p50_s_raw + 0.15)) > 1e-12 || Math.abs(s.speed.p95_s_adjusted - (2*s.speed.p95_s_raw + 0.15)) > 1e-12)) fail(`self-hosted latency arithmetic ${key}`);
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
    for (const fragment of spec.conditionFragments ?? []) {
      if (!s.endpoint_condition.includes(fragment)) fail(`required condition disclosure "${fragment}" missing from the endpoint condition of ${key}`);
    }
    for (const fragment of spec.basisFragments ?? []) {
      if (!s.cost.basis?.includes(fragment)) fail(`required cost-basis statement "${fragment}" missing from the cost basis of ${key}`);
    }
    if (spec.offlineTokens !== undefined) {
      const quoted = /([\d,]+) input tokens over the/.exec(s.cost.basis ?? '');
      if (!quoted || Number(quoted[1].replaceAll(',', '')) !== spec.offlineTokens) fail(`offline token count quoted in the cost basis of ${key}`);
      if (proof.new_rows?.[key]?.input_tokens !== spec.offlineTokens || Number(quoted[1].replaceAll(',', '')) !== proof.new_rows[key].input_tokens) {
        fail(`offline token count in the proof must equal the number in the cost basis: ${key}`);
      }
    }
    if (s.status.answered_ok !== 1485 || proof.new_rows?.[key]?.input_tokens !== 678427 || proof.new_rows?.[key]?.output_tokens !== 0) fail('Ventus pre-registered completeness and usage');
    same(proof.new_rows?.[key]?.status_counts, {'200':1485,'422':15}, 'Ventus pre-registered HTTP counts');
    if (!s.cost.kind || s.cost.kind === 'unpriced') continue;
    if (s.cost.usd_per_1000 > V1619_COST_CAP) {
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
  for (const o of ['A', 'B', 'C', 'capability']) if (!sameSet(artifact.board?.[o]?.order ?? [], ranked)) fail(`board membership ${o}`);
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
  for (const key of V1619_CARRIED_PRELIMINARY_KEYS) {
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
  const releaseNote = artifact.measurement_notes.find(n => n.startsWith('v1.6.19 ADDS ')) ?? '';
  // the moved-interval rows must be named in their own clause, not merely somewhere in a note that names every key
  const clauseStart = releaseNote.indexOf('Carried rows whose intervals moved:');
  const intervalClause = clauseStart < 0 ? '' : releaseNote.slice(clauseStart + 'Carried rows whose intervals moved:'.length).split('DIAGNOSTICS')[0];
  const rankClause = releaseNote.split('RANKS:')[1]?.split('CONFIDENCE INTERVALS:')[0] ?? '';
  const intervalNames = intervalClause.split(/[,\s]+/).map(x => x.replace(/\.$/, ''));
  if (clauseStart < 0) fail('the release note must carry the "Carried rows whose intervals moved:" clause');
  for (const key of V1619_CARRIED_KEYS) {
    const a = previous.artifact.systems.find(s => s.key === key), b = artifact.systems.find(s => s.key === key);
    if (!a || !b) fail(`carried row present ${key}`);
    const rawOnAMoved = JSON.stringify(a.v16?.raw_on_A) !== JSON.stringify(b.v16?.raw_on_A);
    if (rawOnAMoved && !diagnosticMoved) fail(`raw_on_A moved while the API-basis diagnostic did not: ${key}`);
    if (rawOnAMoved && !releaseNote.includes(`${key}: intelligence`)) fail(`a moved raw_on_A must name its row in the notes: ${key}`);
    same(strip(b, rawOnAMoved), strip(a, rawOnAMoved),
         `carried row differs outside rank/ranks/composite_ci95/v16.ci95${rawOnAMoved ? '/v16.raw_on_A' : ''}: ${key}`);
    if (V1619_UNRANKED_CARRIED_KEYS.includes(key)) {
      // the published wording and explicit null placement of a listed-not-ranked row stay byte for byte
      same([b.rank, b.ranks, b.not_ranked_because, b.listing, b.ranked], [a.rank, a.ranks, a.not_ranked_because, a.listing, a.ranked], `the listed-not-ranked row keeps its placement and wording: ${key}`);
    }
    const intervalMoved = !isDeepStrictEqual([b.composite_ci95, b.v16?.ci95], [a.composite_ci95, a.v16?.ci95]);
    if (intervalMoved && !intervalNames.includes(key)) fail(`a moved carried interval must name its row in the release note: ${key}`);
    for (const ci of (b.cost.kind === 'unpriced' ? [] : [b.composite_ci95, b.v16?.ci95?.composite])) {
      if (!intervalOk(ci, b.scores)) fail(`carried row interval does not contain its own point estimate: ${key}`);
    }
    for (const o of ['A', 'B', 'C']) if (a.scores?.[o] !== b.scores?.[o]) fail(`earlier row point score ${key}.${o}`);
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
        if (b.ranks[o] !== a.ranks[o] && !rankClause.includes(`${key} `)) fail(`a moved carried rank must name its row in the release note: ${key}`);
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
  const boardNote = artifact.measurement_notes.slice(previous.artifact.measurement_notes.length).find(n => n.startsWith('Board effect')) ?? '';
  const provisional = boardNote.includes('PROVISIONAL-TOPFIVE');
  if (provisional ? process.env.JEVBENCH_V1619_BUILD_PASS1 !== '1' : !boardNote.includes('No top five changes in any view')) fail('board effect: no top five changes; provisional build note forbidden');
  if (artifact.G_med !== V1619_FIXED_G_MED || previous.artifact.G_med !== V1619_FIXED_G_MED) fail('frozen v1.6.10 G_med');

  // --- the draw and the proof -----------------------------------------------------------------
  if (artifact.v16.draw_release !== V1619_DRAW_RELEASE) fail('draw identity');
  if (!hex(artifact.v16.freeze_manifest_sha256) || !hex(artifact.v16.seed_commitment) || !hex(artifact.v16.baseline_sha256)) fail('draw provenance hashes');
  for (const set of ['S', 'A', 'P', 'core']) if (!hex(artifact.v16.draw_digests?.[set])) fail(`draw digest ${set}`);
  if (proof?.schema_version !== 1 || proof.revision !== 'v1.6.19' || proof.method !== 'jevbench::v1.6'
      || proof.noul_method?.applied !== 'O1S' || proof.bootstrap?.B !== 1000 || proof.bootstrap.seed !== 16) fail('method proof');
  if (proof.draw_release !== artifact.v16.draw_release || proof.freeze_manifest_sha256 !== artifact.v16.freeze_manifest_sha256
      || proof.seed_commitment !== artifact.v16.seed_commitment || !hex(proof.baseline_sha256)
      || !hex(proof.cost_basis_sha256) || !hex(proof.registry_sha256) || !hex(proof.pricing_module_sha256)) fail('draw/cohort binding');
  if (proof.pricing_module_sha256 !== 'dae867403e278492cf861cb6b8a3c19cb50bdccf9333821e0bf00ddda99690fe') fail('frozen pricing module hash');
  if (proof.abandoned_draw_note !== null) fail('abandoned-draw disclosure');
  if (typeof proof.authority !== 'string' || !['#18761', '#18209', 'card 17392', '#18975', '4d9fef10', '#18945', '#18984'].every(x => proof.authority.includes(x))) fail('publication authority');
  if (!proof.authority.startsWith(previous.proof.authority + ' NEW in v1.6.19:')) fail('inherited authority unchanged');
  const newAuthority = proof.authority.slice(previous.proof.authority.length);
  for (const fragment of ['ventus-2b', '#18209/#18211', '1,485/1,500', '15 HTTP 422', '678,427', 'LOWER BOUND', 'No top five changes', 'No SubQ re-price']) {
    if (!newAuthority.includes(fragment)) fail(`Ventus authority gate: ${fragment}`);
  }
  if (!sameSet(Object.keys(proof.raw_sha256 ?? {}), regularKeys)) fail('raw-output coverage');
  same(Object.fromEntries(V1619_CARRIED_KEYS.map(k => [k, proof.raw_sha256[k]])), previous.proof.raw_sha256, 'inherited raw-output hashes unchanged');
  same(proof.a2_supplement, previous.proof.a2_supplement, 'carried A2 scorer binding unchanged');
  const rows = proof.systems;
  if (!Array.isArray(rows) || !sameSet(rows.map(s => s.key), regularKeys)) fail('system proof coverage');
  for (const s of artifact.systems) {
    if (V1619_CARRIED_PRELIMINARY_KEYS.includes(s.key)) continue;
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
        || n.ranked !== row.ranked || n.paid_fast_lane !== V1619_PAID_KEYS.includes(key)
        || n.endpoint_kind !== row.endpoint_kind || !hex(n.original_raw_sha256)) fail(`new-row provenance ${key}`);
    if (usd !== null && !(Math.abs(n.cost_cap_ratio - usd / V1619_COST_CAP) <= 1e-9)) fail(`cost_cap_ratio must equal usd/cap ${key}`);
    if (usd === null) {
      if (n.usd_per_1000 !== null || n.under_cost_cap !== null || n.cost_cap_ratio !== null) fail(`new-row provenance agrees with the row ${key}`);
    } else if (!finite(n.usd_per_1000) || Math.abs(n.usd_per_1000 - usd) > 1e-12 || n.under_cost_cap !== (usd <= V1619_COST_CAP)) {
      fail(`new-row provenance agrees with the row ${key}`);
    }
  }
  // --- the frozen median, recomputable from its four v1.6.10 members --------------------------
  const members = proof.field_median?.members;
  if (proof.field_median?.g_med_fixed !== true || proof.g_med_fixed_from?.revision !== 'v1.6.10'
      || proof.g_med_fixed_from.G_med !== V1619_FIXED_G_MED || proof.g_med_fixed_from.baseline_sha256 !== proof.baseline_sha256) fail('frozen field median provenance');
  if (!Array.isArray(members) || !sameSet(members.map(m => m.key), V1610_KEYS)
      || !members.every(m => finite(m.gap) && artifact.systems.find(s => s.key === m.key)?.intelligence?.gap === m.gap)) fail('field median cohort');
  const gaps = members.map(m => m.gap).sort((a, b) => a - b);
  const median = gaps.length % 2 ? gaps[(gaps.length - 1) / 2] : (gaps[gaps.length / 2 - 1] + gaps[gaps.length / 2]) / 2;
  if (Math.abs(artifact.G_med - median) > 1e-9 || proof.field_median.G_med !== artifact.G_med) fail('cohort G_med');
  if (artifact.G_med_flag_gt10 !== (artifact.G_med > 10)) fail('G_med flag consistency');
  if (Math.abs(proof.gap_penalty_threshold - (artifact.G_med + 8)) > 1e-6) fail('gap penalty threshold');

  // --- categories ------------------------------------------------------------------------------
  if (categories?.revision !== 'v1.6.19' || categories.provisional !== false
      || categories.source_results_sha256 !== artifact.source_sha256
      || categories.draw_release !== artifact.v16.draw_release
      || categories.results_sha256 !== manifest.files.results.sha256) fail('category source binding');
  const dims = v1619Dims(categories);
  if ('topics' in categories) {
    if (!hex(categories.labels_sha256)) fail('a topic radar needs the labels digest it was built from');
    if (categories.labels_draw_release !== V1619_DRAW_RELEASE) fail('topic labels must be for this draw');
  } else if (!artifact.measurement_notes.some(n => n.includes('topic'))) {
    fail('a release without the topic radar must say so in its measurement notes');
  }
  for (const field of ['live_category_cells', 'supplement', 'language_cells', 'unavailable']) if (field in categories) fail(`historical category overlay ${field}`);
  for (const field of ['lane_note', 'metric', 'labelling']) if (typeof categories[field] !== 'string' || !categories[field].trim()) fail(`category field ${field}`);
  if (!Array.isArray(categories.rules) || !categories.rules.length) fail('category rules');
  if (!categories.lanes || !sameSet(Object.keys(categories.lanes), regularKeys)) fail('category lanes');
  for (const key of regularKeys) {
    const expected = newKeys.includes(key) ? (V1619_ROW_SPEC[key].kind === 'api' ? 'api' : 'selfhosted') : previous.categories.lanes[key];
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
  // Carried category cells are the published v1.6.18 cells, cell by cell.
  for (const key of V1619_CARRIED_KEYS) same(categories.systems[key], previous.categories.systems[key], `inherited category cells ${key}`);
  return { artifact, categories, proof, manifest };
}

async function load(path, root) {
  const bytes = await readFile(`${root}/${path}`);
  const text = bytes.toString('utf8'); excluded(text);
  return { value: JSON.parse(text), bytes, sha256: createHash('sha256').update(bytes).digest('hex') };
}

/** Missing publication manifest means the version is unavailable; invalid published evidence fails closed. */
export async function readOptionalJevbenchV1619Release(root = process.cwd()) {
  let publication;
  try { publication = await load(V1619_MANIFEST, root); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  const previous = await readOptionalJevbenchV1618Release(root);
  if (!previous) fail('v1.6.19 needs the published v1.6.18 release it extends');
  const previousManifest = await load(`${V1619_ROOT}/jevbench-v1.6.18-publication.json`, root);
  const bundle = Object.fromEntries(await Promise.all(Object.entries(files).map(async ([k, path]) => [k, await load(path, root)])));
  for (const [key, value] of Object.entries(bundle)) if (publication.value.files?.[key]?.sha256 !== value.sha256) fail(`bytes hash ${key}`);
  if (bundle.history.sha256 !== previous.historical.sha256) fail('immutable history bytes');
  if (bundle['history-carry'].sha256 !== previous.historical.carrySha256) fail('immutable carry bytes');
  validateJevbenchV1619Bundle({ manifest: publication.value, artifact: bundle.results.value, categories: bundle.categories.value,
    proof: bundle.proof.value, previous, previousManifestSha256: previousManifest.sha256 });
  return { artifact: bundle.results.value, bytes: bundle.results.bytes, sha256: bundle.results.sha256,
           categories: bundle.categories.value, categoriesSha256: bundle.categories.sha256,
           proof: bundle.proof.value, proofSha256: bundle.proof.sha256, manifest: publication.value,
           historical: previous.historical };
}

/** Optional navigation must never make an older board depend on fresh publication health. */
export async function hasPublishedJevbenchV1619Release(root = process.cwd(), log = console.error) {
  try { return Boolean(await readOptionalJevbenchV1619Release(root)); }
  catch { log('JevBench v1.6.19 navigation omitted: publication validation failed'); return false; }
}

/** Board input: this release's own rows, with no historical overlay mixed in. */
export function v1619BoardInput(release) {
  return { artifact: release.artifact, categories: release.categories };
}
