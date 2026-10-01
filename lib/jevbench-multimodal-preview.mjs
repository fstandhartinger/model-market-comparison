import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { OFFICIAL_WEIGHTS, weightedJevScore } from './jevbench-axis-weights.mjs';

const EXPECTED_V011_KEYS = new Set([
  'autojev_27b', 'bonsai_2_27b_pq2_0', 'cua_s1_4b', 'decider_2b_vision', 'djev_dev_bf16',
  'djev_distill_v4', 'djev_spark_nvfp4', 'djev_v10_step160_snowicarus', 'gemini31_flash_lite',
  'gemini38_flash', 'gevva_e2b_multimodal', 'gevva_e4b', 'glance_qwen3vl_4b', 'gpt56_luna',
  'gpt6_luna', 'imajev_2b', 'imajev_9b', 'jev_omni', 'jev_spatial',
  'jevany_27b_rlcr', 'jevany_27b_sft', 'jevify_gemma4_26b_a4b', 'jevify_gemma4_e4b',
  'jevify_qwen3vl_2b_t2', 'jevision', 'jpt_0p8b', 'jpt_4b', 'jpt_9b',
  'kushal_gemma4_31b_it_autoloops', 'neohorse_jev_4b', 'omnijev_0p8b', 'omnijev_2b',
  'omnijev_4b', 'omnijev_9b_v4_tzcfly', 'openjev_4b_nli', 'openjev_4b_v5', 'playjev_0p8b',
  'qevi_2b', 'reflex_4b', 'seanliu_jev_vision_8b', 'shisa_de_1', 'standard_one_3b',
  'standard_one_8b', 'surogate_rune_26b_v3', 'visual_jev_4b', 'visual_jev_generic_baseline',
  'vjev_vision', 'winnow_12b_q8',
]);
const V011_ROOT_FIELDS = [
  'benchmark', 'revision', 'status', 'built_utc', 'sealed_item_details_included', 'n_systems',
  'method_sha256', 'split_sha256', 'split', 'method', 'exposure', 'weights', 'gap_allowance_pp',
  'gap_slope_k', 'ranking', 'preview_tracks', 'candidate_coverage', 'scoring_code_sha256',
  'release_provenance',
];
const EXPECTED_V011_COVERAGE_BY_LABEL = new Map([
  ['CUA-S1-4B-0.2 multimodal adapter', 'cua_s1_4b'],
  ['Visual Jev 4B Answer-SFT', 'visual_jev_4b'],
  ['NeoHorse-Jev-4B', 'neohorse_jev_4b'],
  ['Jevify Qwen3-VL-2B Tier 2', 'jevify_qwen3vl_2b_t2'],
  ['Standard One 3B', 'standard_one_3b'],
  ['Standard One 8B', 'standard_one_8b'],
  ['djev-distill-v4', 'djev_distill_v4'],
  ['yah01/vjev-vision', 'vjev_vision'],
  ['Visual-Jev generic Qwen3.5-4B scorer', 'visual_jev_generic_baseline'],
  ['divyanshx11/JEVision', 'jevision'],
  ['SeanLiu/Jev-Vision 8B', 'seanliu_jev_vision_8b'],
  ['Fr0zencr4nE/jev-spatial', 'jev_spatial'],
  ['Jevify Gemma 4 E4B', 'jevify_gemma4_e4b'],
  ['Jevify Gemma 4 26B-A4B', 'jevify_gemma4_26b_a4b'],
  ['JevAny-27B-SFT', 'jevany_27b_sft'],
  ['JevAny-27B-RLCR', 'jevany_27b_rlcr'],
  ['Bonsai-Llama-Jev submission (measured as Bonsai-2-27B v2)', 'bonsai_2_27b_pq2_0'],
  ['AutoJev-27B', 'autojev_27b'],
  ['JPT-0.8B', 'jpt_0p8b'],
  ['JPT-4B', 'jpt_4b'],
  ['JPT-9B', 'jpt_9b'],
  ['Qevi-2B', 'qevi_2b'],
  ['OmniJev 0.8B', 'omnijev_0p8b'],
  ['OmniJev 2B', 'omnijev_2b'],
  ['OmniJev 4B', 'omnijev_4b'],
  ['Winnow-12B', 'winnow_12b_q8'],
  ['Glance frozen Qwen3-VL-4B', 'glance_qwen3vl_4b'],
  ['Jev-Omni', 'jev_omni'],
  ['imajev 2B', 'imajev_2b'],
  ['Mapika decider-2b-vision BF16', 'decider_2b_vision'],
  ['Reflex 4B (released stable configuration)', 'reflex_4b'],
  ['OmniJev-Qwen3.5-9B-v4 (tzcfly)', 'omnijev_9b_v4_tzcfly'],
  ['Surogate Rune 26B-A4B v3', 'surogate_rune_26b_v3'],
  ['shisa-de-1', 'shisa_de_1'],
  ['imajev 9B', 'imajev_9b'],
  ['djev-spark NVFP4', 'djev_spark_nvfp4'],
  ['diffusiongemma-26b djev v10 step160 (snowicarus)', 'djev_v10_step160_snowicarus'],
  ['Autoloops – Gemma 4 31B IT', 'kushal_gemma4_31b_it_autoloops'],
  ['djev-dev BF16', 'djev_dev_bf16'],
  ['Gevva E4B (text checkpoint, image input)', 'gevva_e4b'],
  ['Gevva E2B multimodal', 'gevva_e2b_multimodal'],
  ['GPT-6 Luna (low reasoning effort)', 'gpt6_luna'],
  ['GPT-5.6 Luna', 'gpt56_luna'],
  ['Gemini 3.1 Flash Lite', 'gemini31_flash_lite'],
  ['PlayJev 0.8B', 'playjev_0p8b'],
  ['Gemini 3.8 Flash', 'gemini38_flash'],
  ['OpenJev 4B NLI v2 (official image-premise path)', 'openjev_4b_nli'],
  ['OpenJev 4B NLI v5', 'openjev_4b_v5'],
]);
const EXPECTED_V012_KEYS = new Set([...EXPECTED_V011_KEYS, 'imajev_4b']);
const EXPECTED_V013_KEYS = new Set([...EXPECTED_V012_KEYS]);
const EXPECTED_V014_KEYS = new Set([...EXPECTED_V013_KEYS, 'wity_1']);
const EXPECTED_V015_KEYS = new Set([...EXPECTED_V014_KEYS]);
const V012_ROOT_FIELDS = V011_ROOT_FIELDS;
const V013_ROOT_FIELDS = V012_ROOT_FIELDS;
const V014_ROOT_FIELDS = V013_ROOT_FIELDS;
const V015_ROOT_FIELDS = [...V014_ROOT_FIELDS, 'capability_eligibility', 'revision_note'];
const EXPECTED_IMAGE_TOP_FIVE = ['jev_omni', 'neohorse_jev_4b', 'visual_jev_4b', 'jpt_4b', 'imajev_2b'];
const EXPECTED_IMAGE_TOP_FIVE_V013 = ['imajev_4b', 'jev_omni', 'neohorse_jev_4b', 'visual_jev_4b', 'jpt_4b'];
const EXPECTED_IMAGE_TOP_FIVE_V014 = ['imajev_4b', 'wity_1', 'jev_omni', 'neohorse_jev_4b', 'visual_jev_4b'];
const EXPECTED_IMAGE_TOP_FIVE_V015 = ['wity_1', 'imajev_4b', 'jev_omni', 'neohorse_jev_4b', 'visual_jev_4b'];
const EXPECTED_V012_COVERAGE_BY_LABEL = new Map([
  ...EXPECTED_V011_COVERAGE_BY_LABEL,
  ['Imajev-4B', 'imajev_4b'],
]);
const EXPECTED_V013_COVERAGE_BY_LABEL = new Map([...EXPECTED_V012_COVERAGE_BY_LABEL]);
const EXPECTED_V014_COVERAGE_BY_LABEL = new Map([...EXPECTED_V013_COVERAGE_BY_LABEL, ['Wity-1', 'wity_1']]);
const EXPECTED_V015_COVERAGE_BY_LABEL = new Map([...EXPECTED_V014_COVERAGE_BY_LABEL]);
const TRACK_NAMES = ['all', 'core', 'everyday_photo'];
const TRACK_FIELDS = [
  'public', 'sealed', 'intelligence_before_penalty', 'raw_overall_gap_pp', 'matched_gap_pp',
  'matched_gap_detail', 'penalty_points', 'penalty_multiplier', 'axes', 'speed', 'cost', 'composite',
];
const SUMMARY_FIELDS = [
  'n', 'correct', 'accuracy', 'chance', 'chance_corrected_intelligence', 'ece',
  'probability_coverage', 'valid_answer_count',
];
const TRACK_GAP_FAMILIES = {
  all: new Set(['Everyday photo', 'ScreenSpot']),
  core: new Set(['ScreenSpot']),
  everyday_photo: new Set(['Everyday photo']),
};
const TRACK_GAP_COUNTS = {
  all: { 'Everyday photo': [89, 95], ScreenSpot: [20, 29] },
  core: { ScreenSpot: [20, 29] },
  everyday_photo: { 'Everyday photo': [89, 95] },
};
const GAP_DETAIL_FIELDS = ['n_public', 'n_sealed', 'gap_pp', 'weight'];
const AXIS_FIELDS = ['intelligence', 'calibration', 'speed', 'cost'];
const SPEED_FIELDS = ['score', 'raw_p50_s', 'raw_p95_s', 'adjusted_p50_s', 'adjusted_p95_s', 'latency_coverage'];
const COST_NUMERIC_FIELDS = ['score', 'raw_score', 'usd_per_1000', 'total_usd', 'coverage'];
const COST_SOURCE_LABELS = new Set([
  'Autoloops published Gemma 4 31B token rates applied to returned usage receipts',
  'OpenRouter usage.cost receipts',
  'measured GPU seconds x $0.68/GPU-hour',
  'measured GPU seconds x $0.67/GPU-hour',
  'measured GPU seconds x $1.19/GPU-hour',
  'measured GPU seconds x $1.29/GPU-hour',
  'Estimated Qwen3.6-35B-A3B base-model market reference: USD 0.15/M input, USD 1.00/M output; measured Wity usage (zero output tokens)',
  'Wity stated API tariff: USD 0.042/M input; output, thinking, and images free; measured Wity usage (zero output tokens)',
]);
const EXPECTED_V011_COVERAGE_SHA256 = '700d8915010f87af9aca777a5bf2364df32649c69aec61e6d33111e8c39d4e1d';
const EXPECTED_V011_ROW_HASHES_SHA256 = 'e07afa705cdcd9ca3ee7c21311bf73a199cb860cfce7780d568090ca6321e6f6';
const EXPECTED_V011_SCORING_METADATA_SHA256 = '857d74e865221de942309820cddab1a67dd587ce4b2e5311e51d19b17e8125c5';
// Pin the complete approved release file so JSON.parse cannot conceal duplicate object keys.
const EXPECTED_V011_ARTIFACT_SHA256 = '749aae5c79b52e41eb691c50e4de2de65188bda8943e24afd8ad71434ac88140';
const EXPECTED_V012_ARTIFACT_SHA256 = '08ca91cada08c74656bffb9c648572e8ad148ff598d614ed62280906c2b9abd3';
const EXPECTED_V012_COVERAGE_SHA256 = '58134eab41764d9b4c88d07e53d46219919854ad6a5aa15b98df3137ed34243f';
const EXPECTED_V012_ROW_HASHES_SHA256 = '7aeff19ea53d2c19b4f167d2118bdddfcaa85f9464a55f95c3833cefc9cef0eb';
const EXPECTED_V013_ARTIFACT_SHA256 = '539b78d92a1fe4d1c7bb0719ceba3e7e5525cfa6017635d0898bf670cc04397a';
const EXPECTED_V013_COVERAGE_SHA256 = 'ab2e7cf3268f72bf5bda4a467266563d19dffccccafcee551fa0b2bd9b89f885';
const EXPECTED_V013_ROW_HASHES_SHA256 = '8324712e3c9fa166bbe57bc9965d9201380229a5d1d564cd06e734eee039abe0';
const EXPECTED_V014_ARTIFACT_SHA256 = '385aba04acb0649f73264f57b237fa6bcf481763641978d732f81b4e88ba2150';
const EXPECTED_V014_COVERAGE_SHA256 = '88b916c61e266ab9ba2f58575d00088ffa2febb3722e49b86173192cf5ccdec9';
const EXPECTED_V014_ROW_HASHES_SHA256 = '328f90a480cca138c1a490e0f9375c0f6b7efd8e8b3798d61c18e3425231bd58';
const EXPECTED_V015_ARTIFACT_SHA256 = '42f47c9bb172997089ed61b994b3cb8f2cb1b20cd73bef4e8b47271f0697f41c';
const EXPECTED_V015_COVERAGE_SHA256 = 'fb41ae82d841facc55698a1c9ae7570ed8f5dc11677d2d076b2eb41236621ccf';
const EXPECTED_V015_ROW_HASHES_SHA256 = '51206bdb25b4f193150e77a02c103b37dc0e60e1f9071bc6017b8ae7ca7f128c';
const EXPECTED_V014_SCORING_METADATA_SHA256 = 'bd5c1191e028c11364db0806fc5d45df6eb98d4b5dc9a46b89e010f58706e7af';
const EXPECTED_V015_SCORING_METADATA_SHA256 = '9c2b4d616053d3d62f68db13a104fc5289b5ac5a1a83767b94cd1673040d9614';
const GATE_FIELDS = ['intelligence', 'speed', 'cost'];
const COMPOSITE_FIELDS = ['harmonic_before_gates', 'gates', 'score'];
const EXPECTED_V011_SOURCE_SHA256 = {
  live_artifact: 'adc8c62ddab6ed0f269e6719b49c647bdcc41ad13478874687133d9487590731',
  'v0.1.1_draft': 'ecdd1c02c89dc48b78f252c4c6e2e297a547b418ae7b8325f392b624b8d8a046',
  winnow_result_rows: 'ec708ea0bc4550b0cd243e3c50711cac05a5c1f4d49f778b6dd8da40cbf09ef5',
};
const EXPECTED_V012_SOURCE_SHA256 = {
  live_v0_1_1_artifact: EXPECTED_V011_ARTIFACT_SHA256,
  imajev_result_rows: '51584c82047bf4392d5b05be1334775d6bfb51b2074cca682a87b1e7cdcaebf5',
};
const EXPECTED_V013_SOURCE_SHA256 = {
  live_v0_1_2_artifact: EXPECTED_V012_ARTIFACT_SHA256,
  imajev_result_aggregate: '152dc8bceeaf39ebdac5ebc800c301612b8d879d41569041263b7490fca8f57b',
};
const EXPECTED_V014_SOURCE_SHA256 = {
  live_v0_1_3_artifact: EXPECTED_V013_ARTIFACT_SHA256,
  wity_run_input: 'd2bab93055b5decf97f53f18e6db576018e5fc5ec4409518f38a1222a8f0be80',
  wity_result_rows: 'f22e64c70187b193820d1ac98976e86d2d3500702f42824a71164068eeade08c',
  wity_runner: '4596fdf83fb25cfcd1643b464921e81cfff87b8fa0438b8966550e730b818583',
  wity_input_receipt: '56530fc7ebc346998d9c8717aae929951f004e04b55d24ad3dd378d1e28a46a4',
  wity_score_adapter: '6d318b8f12f7837cc4b90c2785d220be8bf4f001029e1bc23f87cfc56aec294c',
  wity_preview_builder: 'de9b93b6a55916f72f7c93921501f88e7a6bdffbbf91c5619839eac761371ca1',
  wity_aggregate: 'b8f5fca4bfc190ff53ff6a34ebf30a4033f23f05894ee6efc868894e0404dae3',
  wity_pricing_page: 'cc2f0eb5f821ba0e2080b5b5b49e3c3bf043aa6bfb6b878eb7778a74ebd17b0c',
  wity_operator_candidate: '21922ecea7b539f0ea92a68dcf6534a509ce0e2d252503979bde4949986f1645',
  wity_base_price_roster: '369d916b4ba00e48e6bc4669c7d05feaa9614554887ec9a3c721c231ed734648',
  wity_price_addendum: 'e9e8294e402a6aee6a34839961b36842e16bb77e264183d2c645879213b0e8b3',
  wity_reprice_builder: 'f183fee9a8587fdb071344be41c673574491badfc065383b2720f2eca73b8c0c',
};
const EXPECTED_V015_SOURCE_SHA256 = {
  live_v0_1_4_artifact: EXPECTED_V014_ARTIFACT_SHA256,
  ...Object.fromEntries(Object.entries(EXPECTED_V014_SOURCE_SHA256).filter(([key]) => key !== 'live_v0_1_3_artifact')),
};
const V011_ROW_FIELDS = new Set([
  'key', 'name', 'kind', 'api_flag', 'prior_exposure', 'inference_setting',
  'tracks', 'rank', 'score', 'previous_rank', 'previous_score',
]);
const V014_ROW_FIELDS = new Set([...V011_ROW_FIELDS, 'measurement_source']);
const V015_ROW_FIELDS = new Set([...V014_ROW_FIELDS, 'pricing_alternative']);
const V015_TRACK_FIELDS = [...TRACK_FIELDS, 'rank'];
const V011_REQUIRED_ROW_FIELDS = ['key', 'name', 'api_flag', 'tracks', 'rank', 'score'];

function exactFields(value, fields, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Invalid ${label} aggregate object`);
  const keys = Object.keys(value);
  if (keys.length !== fields.length || keys.some((key) => !fields.includes(key))) throw new Error(`Invalid ${label} aggregate schema`);
  return value;
}

function aggregateNumbers(value, fields, label, nullable = []) {
  exactFields(value, fields, label);
  if (fields.some((field) => !(nullable.includes(field) && value[field] === null) && !Number.isFinite(value[field]))) {
    throw new Error(`Invalid ${label} numeric aggregates`);
  }
  return value;
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Cannot digest non-finite scored aggregates');
    const bytes = new ArrayBuffer(8);
    new DataView(bytes).setFloat64(0, value, false);
    const number64 = [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    return `{"$number64":${JSON.stringify(number64)}}`;
  }
  return JSON.stringify(value);
}

function typedCanonicalJson(value) {
  function encode(item) {
    if (item === null) return ['null'];
    if (Array.isArray(item)) return ['array', item.map(encode)];
    if (item && typeof item === 'object') {
      return ['object', Object.keys(item).sort().map((key) => [key, encode(item[key])])];
    }
    if (typeof item === 'number') {
      if (!Number.isFinite(item)) throw new Error('Cannot digest non-finite scoring metadata');
      const bytes = new ArrayBuffer(8);
      new DataView(bytes).setFloat64(0, item, false);
      const number64 = [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
      return ['number64', number64];
    }
    if (typeof item === 'string') return ['string', item];
    if (typeof item === 'boolean') return ['boolean', item];
    throw new Error('Unsupported scoring metadata type');
  }
  return JSON.stringify(encode(value));
}

function validateFrozenScoringMetadata(artifact, revision) {
  if (typeof artifact.gap_slope_k !== 'number' || !Number.isFinite(artifact.gap_slope_k) || artifact.gap_slope_k !== 1) {
    throw new Error(`ImageJevBench ${revision} gap slope does not match the frozen scoring rule`);
  }
  const metadata = {
    method_sha256: artifact.method_sha256,
    split_sha256: artifact.split_sha256,
    scoring_code_sha256: artifact.scoring_code_sha256,
    method: artifact.method,
    split: artifact.split,
    weights: artifact.weights,
    gap_allowance_pp: artifact.gap_allowance_pp,
    gap_slope_k: artifact.gap_slope_k,
    exposure: artifact.exposure,
    preview_tracks: artifact.preview_tracks,
  };
  const digest = createHash('sha256').update(typedCanonicalJson(metadata), 'utf8').digest('hex');
  const expected = revision === 'v0.1.5' ? EXPECTED_V015_SCORING_METADATA_SHA256
    : revision === 'v0.1.4' ? EXPECTED_V014_SCORING_METADATA_SHA256 : EXPECTED_V011_SCORING_METADATA_SHA256;
  if (digest !== expected) {
    throw new Error(`ImageJevBench ${revision} scoring metadata does not match the frozen approval artifact`);
  }
}

function coverageSha256(coverage) {
  const frozenRows = coverage.candidates.map((row) => ({
    candidate: row.candidate,
    source_revision: row.source_revision,
    access: row.access,
    status: row.status,
    reason: row.reason,
    ranking_key: row.ranking_key ?? null,
  })).sort((a, b) => (a.candidate < b.candidate ? -1 : a.candidate > b.candidate ? 1 : 0));
  return createHash('sha256').update(JSON.stringify({ included_note: coverage.included_note, candidates: frozenRows })).digest('hex');
}

function validateAggregateTracks(tracks, systemKey, isRevision015 = false) {
  exactFields(tracks, TRACK_NAMES, `${systemKey}.tracks`);
  for (const name of TRACK_NAMES) {
    const label = `${systemKey}.${name}`;
    const track = exactFields(tracks[name], isRevision015 ? V015_TRACK_FIELDS : TRACK_FIELDS, label);
    if (isRevision015 && (!Number.isInteger(track.rank) || track.rank < 1 || track.rank > 50)) {
      throw new Error(`Invalid ${label}.rank`);
    }
    aggregateNumbers(track.public, SUMMARY_FIELDS, `${label}.public`, ['ece']);
    aggregateNumbers(track.sealed, SUMMARY_FIELDS, `${label}.sealed`, ['ece']);
    aggregateNumbers({
      intelligence_before_penalty: track.intelligence_before_penalty,
      raw_overall_gap_pp: track.raw_overall_gap_pp,
      matched_gap_pp: track.matched_gap_pp,
      penalty_points: track.penalty_points,
      penalty_multiplier: track.penalty_multiplier,
    }, ['intelligence_before_penalty', 'raw_overall_gap_pp', 'matched_gap_pp', 'penalty_points', 'penalty_multiplier'], label);
    if (!track.matched_gap_detail || typeof track.matched_gap_detail !== 'object' || Array.isArray(track.matched_gap_detail)
      || Object.keys(track.matched_gap_detail).length !== TRACK_GAP_FAMILIES[name].size
      || Object.keys(track.matched_gap_detail).some((family) => !TRACK_GAP_FAMILIES[name].has(family))) {
      throw new Error(`Missing or unexpected ${label}.matched_gap_detail families`);
    }
    for (const [family, detail] of Object.entries(track.matched_gap_detail)) {
      aggregateNumbers(detail, GAP_DETAIL_FIELDS, `${label}.matched_gap_detail.${family}`);
      const [publicCount, sealedCount] = TRACK_GAP_COUNTS[name][family];
      if (detail.n_public !== publicCount || detail.n_sealed !== sealedCount) {
        throw new Error(`Invalid ${label}.matched_gap_detail.${family} public/sealed counts`);
      }
    }
    aggregateNumbers(track.axes, AXIS_FIELDS, `${label}.axes`);
    aggregateNumbers(track.speed, SPEED_FIELDS, `${label}.speed`);
    const cost = exactFields(track.cost, [...COST_NUMERIC_FIELDS, 'source'], `${label}.cost`);
    aggregateNumbers(Object.fromEntries(COST_NUMERIC_FIELDS.map((field) => [field, cost[field]])), COST_NUMERIC_FIELDS, `${label}.cost`);
    if (!COST_SOURCE_LABELS.has(cost.source)) throw new Error(`Invalid ${label}.cost.source`);
    const composite = exactFields(track.composite, COMPOSITE_FIELDS, `${label}.composite`);
    aggregateNumbers({ harmonic_before_gates: composite.harmonic_before_gates, score: composite.score }, ['harmonic_before_gates', 'score'], `${label}.composite`);
    aggregateNumbers(composite.gates, GATE_FIELDS, `${label}.composite.gates`);
  }
}

function validateReleaseProvenance(provenance, revision) {
  const fields = ['parent_revision', 'method_sha256', 'split_sha256', 'scoring_code_sha256', 'source_sha256', 'aggregate_row_sha256'];
  exactFields(provenance, fields, 'release provenance');
  const isRevision015 = revision === 'v0.1.5';
  const isRevision014 = revision === 'v0.1.4';
  const isRevision012 = revision === 'v0.1.2';
  const isRevision013 = revision === 'v0.1.3';
  const expectedParent = isRevision015 ? 'v0.1.4' : isRevision014 ? 'v0.1.3' : isRevision013 ? 'v0.1.2' : isRevision012 ? 'v0.1.1' : 'v0.1-clean-split-20260925';
  if (provenance.parent_revision !== expectedParent
    || provenance.method_sha256 !== 'e7eaa2acffb7fd9655480311b96feafd528f112452fcebb170e48ceeacd555a3'
    || provenance.split_sha256 !== '4cb721cd36c4fbe4320ec1d5420f56bedd82e060c2c634b3fe7c420353d51224'
    || provenance.scoring_code_sha256 !== 'd63c9f3dca2b2419fcb9b62ecfcec624e598dfe625b0216c41dca3aa18582c34') {
    throw new Error(`ImageJevBench ${revision} release provenance does not match the frozen source method`);
  }
  const expectedSource = isRevision015 ? EXPECTED_V015_SOURCE_SHA256 : isRevision014 ? EXPECTED_V014_SOURCE_SHA256 : isRevision013 ? EXPECTED_V013_SOURCE_SHA256
    : isRevision012 ? EXPECTED_V012_SOURCE_SHA256 : EXPECTED_V011_SOURCE_SHA256;
  const sourceFields = Object.keys(expectedSource);
  exactFields(provenance.source_sha256, sourceFields, 'release source hashes');
  if (sourceFields.some((field) => !/^[a-f0-9]{64}$/.test(provenance.source_sha256[field]))) throw new Error('Invalid release source hash');
  if (Object.entries(expectedSource).some(([field, digest]) => provenance.source_sha256[field] !== digest)) {
    throw new Error(`ImageJevBench ${revision} release source hashes do not match the frozen inputs`);
  }
  const expectedKeys = isRevision015 ? EXPECTED_V015_KEYS : isRevision014 ? EXPECTED_V014_KEYS : isRevision013 ? EXPECTED_V013_KEYS
    : isRevision012 ? EXPECTED_V012_KEYS : EXPECTED_V011_KEYS;
  exactFields(provenance.aggregate_row_sha256, [...expectedKeys], 'release aggregate row hashes');
  if (Object.values(provenance.aggregate_row_sha256).some((digest) => !/^[a-f0-9]{64}$/.test(digest))) {
    throw new Error('Invalid release aggregate row hash');
  }
  const manifestSha256 = createHash('sha256').update(stableJson(provenance.aggregate_row_sha256), 'utf8').digest('hex');
  const expectedManifestSha256 = isRevision015 ? EXPECTED_V015_ROW_HASHES_SHA256 : isRevision014 ? EXPECTED_V014_ROW_HASHES_SHA256 : isRevision013 ? EXPECTED_V013_ROW_HASHES_SHA256
    : isRevision012 ? EXPECTED_V012_ROW_HASHES_SHA256 : EXPECTED_V011_ROW_HASHES_SHA256;
  if (manifestSha256 !== expectedManifestSha256) throw new Error(`ImageJevBench ${revision} row hash manifest differs from the frozen release artifact`);
}

function validateAggregateRowHashes(rows, provenance, revision) {
  const expected = provenance.aggregate_row_sha256;
  for (const row of rows) {
    const digest = createHash('sha256').update(stableJson(row), 'utf8').digest('hex');
    if (expected[row.key] !== digest) throw new Error(`ImageJevBench ${revision} aggregate row differs from its frozen hash: ${row.key}`);
  }
}

export function validatePreviewTracks(tracks) {
  const expected = {
    computer_use: { items_total: 400, public: 147, sealed: 253 },
    browser_use: { items_total: 400, public: 240, sealed: 160 },
  };
  if (!tracks || typeof tracks !== 'object' || Array.isArray(tracks)) throw new Error('Missing preview tracks');
  for (const [name, counts] of Object.entries(expected)) {
    const track = tracks[name];
    if (!track || typeof track !== 'object'
      || track.items_total !== counts.items_total
      || track.public !== counts.public
      || track.sealed !== counts.sealed
      || track.public + track.sealed !== track.items_total) {
      throw new Error(`Invalid ${name} preview track counts`);
    }
    for (const part of ['public', 'sealed']) {
      const types = track[`${part}_decision_types`];
      if (!Array.isArray(types) || types.length === 0 || types.some((type) => typeof type !== 'string' || !type.trim())) {
        throw new Error(`Invalid ${name} ${part} decision types`);
      }
    }
    if (typeof track.sealed_origin !== 'string' || !track.sealed_origin.trim()) throw new Error(`Missing ${name} sealed origin`);
  }
  if (tracks.browser_use.mind2web_public_only !== 133) throw new Error('Invalid Kev/Mind2Web public-only flag');
  if (typeof tracks.cross_track_rule !== 'string' || !tracks.cross_track_rule.trim()) throw new Error('Missing cross-track sealing rule');
  if (typeof tracks.kev_flag !== 'string' || !tracks.kev_flag.trim()) throw new Error('Missing Kev/Mind2Web flag');
  return tracks;
}

export function formatMatchedGapPp(value) {
  const rounded = Number(value.toFixed(1));
  const normalized = rounded === 0 ? 0 : rounded;
  return `${normalized > 0 ? '+' : ''}${normalized.toFixed(1)} pp`;
}

export async function readMultimodalPreview() {
  const file = path.join(process.cwd(), 'data/raw/benchmarks/jevbench/multimodal-preview/preview.json');
  const bytes = await readFile(file);
  const artifactSha256 = createHash('sha256').update(bytes).digest('hex');
  const a = JSON.parse(bytes.toString('utf8'));
  const isRevision015 = a.revision === 'v0.1.5';
  const isRevision014 = a.revision === 'v0.1.4';
  const isRevision011 = a.revision === 'v0.1.1';
  const isRevision012 = a.revision === 'v0.1.2';
  const isRevision013 = a.revision === 'v0.1.3';
  const isFrozenRelease = isRevision011 || isRevision012 || isRevision013 || isRevision014 || isRevision015;
  const revision = isRevision015 ? 'v0.1.5' : isRevision014 ? 'v0.1.4' : isRevision013 ? 'v0.1.3' : isRevision012 ? 'v0.1.2' : 'v0.1.1';
  const expectedArtifactSha256 = isRevision015 ? EXPECTED_V015_ARTIFACT_SHA256 : isRevision014 ? EXPECTED_V014_ARTIFACT_SHA256 : isRevision013 ? EXPECTED_V013_ARTIFACT_SHA256
    : isRevision012 ? EXPECTED_V012_ARTIFACT_SHA256 : EXPECTED_V011_ARTIFACT_SHA256;
  if (isFrozenRelease && artifactSha256 !== expectedArtifactSha256) {
    throw new Error(`ImageJevBench ${revision} artifact bytes differ from the frozen release artifact`);
  }
  if (isFrozenRelease) exactFields(a, isRevision015 ? V015_ROOT_FIELDS : isRevision014 ? V014_ROOT_FIELDS : isRevision013 ? V013_ROOT_FIELDS
    : isRevision012 ? V012_ROOT_FIELDS : V011_ROOT_FIELDS, `ImageJevBench ${revision} artifact`);
  const expectedBenchmark = isFrozenRelease ? `Image JevBench ${revision}` : 'Image JevBench v0.1 candidate';
  if (a.benchmark !== expectedBenchmark
    || a.status !== 'preview'
    || (!isFrozenRelease && a.revision !== 'v0.1-clean-split-20260925')) throw new Error('Invalid multimodal preview artifact');
  a.release_version = isFrozenRelease ? revision : 'v0.1';
  if (a.method_sha256 !== 'e7eaa2acffb7fd9655480311b96feafd528f112452fcebb170e48ceeacd555a3'
    || a.split_sha256 !== '4cb721cd36c4fbe4320ec1d5420f56bedd82e060c2c634b3fe7c420353d51224') throw new Error('ImageJevBench method or split does not match the frozen v0.1 release');
  if (isFrozenRelease && a.scoring_code_sha256 !== 'd63c9f3dca2b2419fcb9b62ecfcec624e598dfe625b0216c41dca3aa18582c34') throw new Error(`ImageJevBench ${revision} scorer does not match the live v0.1 scoring code`);
  if (isFrozenRelease) validateFrozenScoringMetadata(a, revision);
  if (typeof a.method?.difficulty_caveat !== 'string' || !/synthetic/.test(a.method.difficulty_caveat)) throw new Error('Missing fresh-item difficulty caveat');
  if (a.sealed_item_details_included !== false) throw new Error('Preview may contain aggregate sealed results only');
  validatePreviewTracks(a.preview_tracks);
  const split = a.split;
  if (!split || split.items_total !== 684 || split.items_public !== 228 || split.items_sealed !== 456 || split.items_retired !== 93) throw new Error('Invalid frozen split counts');
  if (split.kept_sealed !== 123 || split.fresh_sealed !== 333 || split.kept_sealed + split.fresh_sealed !== split.items_sealed) throw new Error('Invalid kept/fresh sealed counts');
  if (Math.abs(split.public_percent - 33.33) > 0.01 || Math.abs(split.sealed_percent - 66.67) > 0.01) throw new Error('Invalid split shares');
  if (split.disposition?.status !== 'compliant'
    || !split.disposition?.approved_target?.trim()
    || !split.disposition?.retired?.includes('93')
    || !split.disposition?.fresh_items?.includes('333')) throw new Error('Missing split disposition');
  if (split.core_total !== 500 || split.core_public !== 139 || split.core_sealed !== 361) throw new Error('Invalid core-track counts');
  if (split.licensed_core_total !== 201 || split.licensed_core_public !== 139 || split.licensed_core_sealed !== 62 || split.pool_core_sealed !== 299) throw new Error('Invalid licensed-core counts');
  if (split.everyday_photo_total !== 184 || split.everyday_photo_public !== 89 || split.everyday_photo_sealed !== 95 || split.everyday_photo_sealed_fresh !== 34 || split.everyday_photo_synthetic !== true) throw new Error('Invalid everyday-photo counts');
  if (split.synthetic_total !== 483 || Math.abs(split.synthetic_share_percent - 483 / 684 * 100) > 0.001) throw new Error('Invalid disclosed synthetic share');
  if (!split.family_counts || typeof split.family_counts !== 'object' || Array.isArray(split.family_counts)) throw new Error('Missing family counts');
  const familyRows = Object.entries(split.family_counts);
  if (familyRows.some(([, counts]) => ['public', 'sealed', 'retired'].some((part) => !Number.isSafeInteger(counts[part]) || counts[part] < 0))) throw new Error('Invalid family counts');
  const familyTotal = (rows, part) => rows.reduce((sum, [, counts]) => sum + counts[part], 0);
  if (familyTotal(familyRows, 'public') !== split.items_public || familyTotal(familyRows, 'sealed') !== split.items_sealed || familyTotal(familyRows, 'retired') !== split.items_retired) throw new Error('Family counts do not sum to the whole split');
  const coreFamilyRows = familyRows.filter(([family]) => family !== 'Everyday photo');
  if (familyTotal(coreFamilyRows, 'public') !== split.core_public || familyTotal(coreFamilyRows, 'sealed') !== split.core_sealed) throw new Error('Family counts do not sum to the core track');
  const poolFamilyRows = familyRows.filter(([family]) => family.startsWith('Pool: '));
  if (familyTotal(poolFamilyRows, 'public') !== 0 || familyTotal(poolFamilyRows, 'sealed') !== split.pool_core_sealed || familyTotal(poolFamilyRows, 'retired') !== 0) throw new Error('Family counts do not sum to the fresh pool core');
  if (split.family_counts['Everyday photo']?.public !== split.everyday_photo_public || split.family_counts['Everyday photo']?.sealed !== split.everyday_photo_sealed) throw new Error('Family counts do not sum to the photo track');
  if (a.weights?.public !== 0.35 || a.weights?.sealed !== 0.65 || a.gap_allowance_pp !== 15) throw new Error('Invalid frozen scoring weights or matched-gap allowance');
  const expectedRowCount = isRevision014 || isRevision015 ? 50 : isRevision012 || isRevision013 ? 49 : isRevision011 ? 48 : 12;
  if (!Array.isArray(a.ranking) || a.ranking.length !== expectedRowCount || a.n_systems !== a.ranking.length) throw new Error('Invalid multimodal system rows');
  for (const system of a.ranking) {
    if (!system || typeof system !== 'object' || Array.isArray(system)
      || !Number.isFinite(system.score)
      || !Number.isFinite(system.tracks?.all?.composite?.score)) {
      throw new Error('Multimodal ranking rows need finite full-track composite scores');
    }
  }
  const keys = a.ranking.map((s) => s.key);
  if (new Set(keys).size !== a.n_systems || a.ranking.some((s, i) => s.rank !== i + 1)) throw new Error('Duplicate or unsorted system rows');
  if (a.ranking.some((s, i) => i > 0 && a.ranking[i - 1].tracks.all.composite.score < s.tracks.all.composite.score)) throw new Error('System rows are not sorted by the frozen full-benchmark composite');
  if (isFrozenRelease) {
    const expectedKeys = isRevision015 ? EXPECTED_V015_KEYS : isRevision014 ? EXPECTED_V014_KEYS : isRevision013 ? EXPECTED_V013_KEYS
      : isRevision012 ? EXPECTED_V012_KEYS : EXPECTED_V011_KEYS;
    if (a.n_systems !== expectedKeys.size || keys.length !== expectedKeys.size
      || keys.some((key) => !expectedKeys.has(key)) || [...expectedKeys].some((key) => !keys.includes(key))) {
      throw new Error(`ImageJevBench ${revision} roster does not match the complete approved ${expectedKeys.size}-key set`);
    }
    if (keys.includes('laya_vision') || keys.includes('glance_speedlab_qwen3vl_2b') || (isRevision011 && keys.includes('imajev_4b'))) {
      throw new Error(`A held ImageJev candidate is present in the ${revision} ranking`);
    }
    if (isRevision012) {
      const imajev = a.ranking.find((system) => system.key === 'imajev_4b');
      if (!imajev || imajev.name !== 'Imajev-4B' || imajev.api_flag !== false || imajev.kind !== 'gpu'
        || imajev.rank !== 11 || Math.abs(imajev.score - 65.72451137285294) > 1e-10
        || Object.hasOwn(imajev, 'previous_rank') || Object.hasOwn(imajev, 'previous_score')) {
        throw new Error('ImageJevBench v0.1.2 Imajev-4B row does not match its reviewed aggregate and rank');
      }
      if (a.ranking.slice(0, 5).map((system) => system.key).some((key, index) => key !== EXPECTED_IMAGE_TOP_FIVE[index])) {
        throw new Error('ImageJevBench v0.1.2 changed the v0.1.1 top five');
      }
    }
    if (isRevision013) {
      const imajev = a.ranking.find((system) => system.key === 'imajev_4b');
      if (!imajev || imajev.name !== 'Imajev-4B' || imajev.api_flag !== false || imajev.kind !== 'gpu'
        || imajev.rank !== 1 || Math.abs(imajev.score - 76.38798675595419) > 1e-10
        || imajev.previous_rank !== 11 || Math.abs(imajev.previous_score - 65.72451137285294) > 1e-10
        || typeof imajev.inference_setting !== 'string' || !imajev.inference_setting.includes('--fast')
        || !imajev.inference_setting.includes('--merge-lora')) {
        throw new Error('ImageJevBench v0.1.3 Imajev-4B row does not match its reviewed fast-serving aggregate and rank');
      }
      if (a.ranking.slice(0, 5).map((system) => system.key).some((key, index) => key !== EXPECTED_IMAGE_TOP_FIVE_V013[index])) {
        throw new Error('ImageJevBench v0.1.3 top five do not match the reviewed fast-serving ranking');
      }
      const parent = await readArchivedMultimodalPreviewV012();
      const priorByKey = new Map(parent.artifact.ranking.map((row) => [row.key, row]));
      if (parent.artifact.n_systems !== 49 || a.ranking.length !== priorByKey.size) {
        throw new Error('ImageJevBench v0.1.3 does not preserve the full v0.1.2 roster');
      }
      for (const row of a.ranking) {
        const previous = priorByKey.get(row.key);
        if (!previous || row.previous_rank !== previous.rank || row.previous_score !== previous.score
          || (row.key !== 'imajev_4b' && (row.score !== previous.score
            || JSON.stringify(row.tracks) !== JSON.stringify(previous.tracks)))) {
          throw new Error(`ImageJevBench v0.1.3 changed an unrelated row: ${row.key}`);
        }
      }
    }
    if (isRevision014) {
      const wity = a.ranking.find((system) => system.key === 'wity_1');
      if (!wity || wity.name !== 'Wity-1' || wity.kind !== 'api' || wity.api_flag !== true
        || wity.rank !== 2 || Math.abs(wity.score - 74.36394536053653) > 1e-9
        || wity.inference_setting !== 'Wity SystemOne, reasoning=auto'
        || !wity.measurement_source?.includes('production-named Wity SystemOne endpoint')
        || wity.tracks?.all?.cost?.source !== 'Estimated Qwen3.6-35B-A3B base-model market reference: USD 0.15/M input, USD 1.00/M output; measured Wity usage (zero output tokens)'
        || Math.abs(wity.tracks?.all?.cost?.coverage - 1) > 1e-12) {
        throw new Error('ImageJevBench v0.1.4 Wity-1 row does not match its reviewed run and base-model price decision');
      }
      if (a.ranking.slice(0, 5).map((system) => system.key).join('\u0000') !== EXPECTED_IMAGE_TOP_FIVE_V014.join('\u0000')) {
        throw new Error('ImageJevBench v0.1.4 top five do not match its reviewed preview');
      }
      const parent = await readArchivedMultimodalPreviewV013();
      const priorByKey = new Map(parent.artifact.ranking.map((row) => [row.key, row]));
      if (priorByKey.size !== 49 || a.ranking.length !== 50) throw new Error('ImageJevBench v0.1.4 does not preserve the v0.1.3 roster');
      for (const row of a.ranking.filter((system) => system.key !== 'wity_1')) {
        const prior = priorByKey.get(row.key);
        if (!prior || row.previous_rank !== prior.rank || row.previous_score !== prior.score
          || row.score !== prior.score || JSON.stringify(row.tracks) !== JSON.stringify(prior.tracks)) {
          throw new Error(`ImageJevBench v0.1.4 changed an unrelated row: ${row.key}`);
        }
      }
    }
    if (isRevision015) {
      const wity = a.ranking.find((system) => system.key === 'wity_1');
      if (!wity || wity.name !== 'Wity-1' || wity.kind !== 'api' || wity.api_flag !== true
        || wity.rank !== 1 || Math.abs(wity.score - 80.19853920531308) > 1e-9
        || wity.tracks?.all?.cost?.source !== 'Wity stated API tariff: USD 0.042/M input; output, thinking, and images free; measured Wity usage (zero output tokens)'
        || Math.abs(wity.tracks?.all?.cost?.usd_per_1000 - 0.007401701754385967) > 1e-12
        || Math.abs(wity.tracks?.all?.cost?.score - 73.92005255304716) > 1e-9
        || wity.pricing_alternative?.basis !== 'Qwen3.6-35B-A3B base-model market reference (USD 0.15/M input, USD 1.00/M output)'
        || Math.abs(wity.pricing_alternative?.tracks?.all?.composite - 74.36394536053653) > 1e-9
        || wity.pricing_alternative?.would_rank !== 2) {
        throw new Error('ImageJevBench v0.1.5 Wity-1 row does not match the selected API tariff and base-model alternative');
      }
      if (a.ranking.slice(0, 5).map((system) => system.key).join('\u0000') !== EXPECTED_IMAGE_TOP_FIVE_V015.join('\u0000')) {
        throw new Error('ImageJevBench v0.1.5 top five do not match its reviewed preview');
      }
      const parent = await readArchivedMultimodalPreviewV014();
      const priorByKey = new Map(parent.artifact.ranking.map((row) => [row.key, row]));
      if (priorByKey.size !== 50 || a.ranking.length !== 50) throw new Error('ImageJevBench v0.1.5 does not preserve the v0.1.4 roster');
      for (const row of a.ranking.filter((system) => system.key !== 'wity_1')) {
        const prior = priorByKey.get(row.key);
        if (!prior || row.score !== prior.score || JSON.stringify(row.tracks, (_key, value) => value && typeof value === 'object' && !Array.isArray(value)
          ? Object.fromEntries(Object.entries(value).filter(([field]) => field !== 'rank')) : value) !== JSON.stringify(prior.tracks)) {
          throw new Error(`ImageJevBench v0.1.5 changed an unrelated aggregate: ${row.key}`);
        }
      }
      for (const trackName of TRACK_NAMES) {
        const ordered = [...a.ranking].sort((x, y) => y.tracks[trackName].composite.score - x.tracks[trackName].composite.score
          || x.name.localeCompare(y.name));
        if (ordered.some((row, index) => row.tracks[trackName].rank !== index + 1)) {
          throw new Error(`ImageJevBench v0.1.5 ${trackName} ranks do not follow the composite scores`);
        }
      }
      const eligibility = a.capability_eligibility;
      if (eligibility?.anchor !== 'jev-1.13.0' || eligibility.anchor_source !== 'JevBench v1.5.4' || eligibility.factor !== 2
        || Math.abs(eligibility.cost_usd_per_1000_cap - 0.06459465517241379) > 1e-12
        || Math.abs(eligibility.latency_p50_s_cap - 1.2329566404223442) > 1e-12
        || typeof eligibility.rationale !== 'string' || !eligibility.rationale.trim()
        || typeof a.revision_note !== 'string' || !a.revision_note.includes('supersedes the 30-day rule')) {
        throw new Error('ImageJevBench v0.1.5 capability or revision metadata is invalid');
      }
    }
    validateReleaseProvenance(a.release_provenance, revision);
    validateAggregateRowHashes(a.ranking, a.release_provenance, revision);
  }
  const jevOmni = a.ranking.find((system) => system.key === 'jev_omni');
  if (!jevOmni || jevOmni.api_flag !== false) throw new Error('Missing locally evaluated Jev-Omni row');
  const bonsai = a.ranking.find((system) => system.key === 'bonsai_2_27b_pq2_0');
  if (!bonsai || bonsai.api_flag !== false) throw new Error('Missing locally evaluated Bonsai row');
  if (a.ranking.filter((s) => s.api_flag).length !== (isRevision014 || isRevision015 ? 6 : 5)) throw new Error('Hosted API exposure flags do not match the roster');
  const gemma = a.ranking.find((s) => s.key === 'kushal_gemma4_31b_it_autoloops');
  if (!gemma || gemma.name !== 'Autoloops – Gemma 4 31B IT' || gemma.api_flag !== true || Math.abs(gemma.tracks?.all?.composite?.score - 47.14) > 0.005) throw new Error('Missing Gemma 4 31B row');
  const gpt6 = a.ranking.find((s) => s.key === 'gpt6_luna');
  if (!gpt6 || gpt6.api_flag !== true || gpt6.name !== 'GPT-6 Luna (low reasoning effort)' || gpt6.inference_setting !== 'OpenRouter reasoning.effort=low') throw new Error('Missing distinct GPT-6 Luna low setting');
  const coverage = a.candidate_coverage?.candidates;
  if (!Array.isArray(coverage) || coverage.length < 25 || new Set(coverage.map((x) => x.candidate)).size !== coverage.length) throw new Error('Missing or duplicate candidate coverage rows');
  if (isFrozenRelease) {
    exactFields(a.candidate_coverage, ['checked_utc', 'included_note', 'candidates'], `ImageJevBench ${revision} coverage`);
    const checkedUtc = a.candidate_coverage.checked_utc;
    if (typeof checkedUtc !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(checkedUtc)
      || Number.isNaN(Date.parse(checkedUtc)) || new Date(checkedUtc).toISOString().replace(/\.000Z$/, 'Z') !== checkedUtc
      || typeof a.candidate_coverage.included_note !== 'string' || !a.candidate_coverage.included_note.trim()) {
      throw new Error(`ImageJevBench ${revision} coverage timestamp or note is invalid`);
    }
    if (coverage.length !== (isRevision014 || isRevision015 ? 69 : 68)) throw new Error(`ImageJevBench ${revision} coverage roster has an unexpected size`);
    for (const [index, candidate] of coverage.entries()) {
      const fields = Object.hasOwn(candidate, 'ranking_key')
        ? ['candidate', 'source_revision', 'access', 'status', 'reason', 'ranking_key']
        : ['candidate', 'source_revision', 'access', 'status', 'reason'];
      exactFields(candidate, fields, `ImageJevBench ${revision} coverage[${index}]`);
      if (fields.some((field) => typeof candidate[field] !== 'string' || !candidate[field].trim())) {
        throw new Error(`ImageJevBench ${revision} coverage[${index}] has an invalid field`);
      }
    }
  }
  const expectedCoverageSha256 = isRevision015 ? EXPECTED_V015_COVERAGE_SHA256 : isRevision014 ? EXPECTED_V014_COVERAGE_SHA256 : isRevision013 ? EXPECTED_V013_COVERAGE_SHA256
    : isRevision012 ? EXPECTED_V012_COVERAGE_SHA256 : EXPECTED_V011_COVERAGE_SHA256;
  if (isFrozenRelease && coverageSha256(a.candidate_coverage) !== expectedCoverageSha256) throw new Error(`ImageJevBench ${revision} coverage details do not match the frozen release artifact`);
  const requested = coverage.filter((x) => x.status === 'requested, not yet evaluated');
  if (!requested.length || requested.some((x) => !x.reason?.trim() || !x.access?.trim())) throw new Error('Requested candidates need exact access and reason fields');
  const requiredCandidates = ['CUA-S1-4B-0.2 multimodal adapter', 'Visual Jev 4B Answer-SFT', 'NeoHorse-Jev-4B', 'Jevify Qwen3-VL-2B Tier 2', 'Standard One 3B', 'Standard One 8B', 'Sage1 / Levanto Sage'];
  for (const name of requiredCandidates) {
    const candidate = coverage.find((x) => x.candidate === name);
    if (!candidate || (!isFrozenRelease && candidate.status !== 'requested, not yet evaluated')) {
      throw new Error(`Missing candidate coverage in the expected status: ${name}`);
    }
  }
  if (isFrozenRelease) {
      const expectedCoverageMap = isRevision015 ? EXPECTED_V015_COVERAGE_BY_LABEL : isRevision014 ? EXPECTED_V014_COVERAGE_BY_LABEL : isRevision013 ? EXPECTED_V013_COVERAGE_BY_LABEL
      : isRevision012 ? EXPECTED_V012_COVERAGE_BY_LABEL : EXPECTED_V011_COVERAGE_BY_LABEL;
    const expectedCoverageCount = expectedCoverageMap.size;
    const includedStatus = new RegExp(`^included in ${revision} ranking \\(\\#\\d+ of ${expectedCoverageCount}\\)$`);
    const normalizedLabel = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '');
    const explicitCoverageAliases = Object.fromEntries(expectedCoverageMap);
    const systemsByKey = new Map(a.ranking.map((system) => [system.key, system]));
    if (expectedCoverageCount !== expectedRowCount
      || new Set(expectedCoverageMap.values()).size !== expectedCoverageCount
      || [...expectedCoverageMap.values()].some((key) => !systemsByKey.has(key))) {
      throw new Error(`Frozen ${revision} coverage manifest does not match its exact ranking roster`);
    }
    for (const [label, key] of expectedCoverageMap) {
      const matches = coverage.filter((candidate) => candidate.candidate === label);
      const system = systemsByKey.get(key);
      const expectedStatus = `included in ${revision} ranking (#${system?.rank} of ${expectedCoverageCount})`;
      if (matches.length !== 1 || !system || matches[0].ranking_key !== key
        || matches[0].status !== expectedStatus || !matches[0].reason?.trim() || !matches[0].access?.trim()) {
        throw new Error(`Frozen coverage entry is not bound to its exact ranked row: ${label}`);
      }
    }
    const resolveCoverageKey = (label) => {
      if (Object.hasOwn(explicitCoverageAliases, label)) return explicitCoverageAliases[label];
      const exactNameKeys = a.ranking
        .filter((system) => normalizedLabel(label) === normalizedLabel(system.name))
        .map((system) => system.key);
      if (exactNameKeys.length > 1) throw new Error(`Coverage label maps to multiple release rows: ${label}`);
      if (exactNameKeys.length === 1) return exactNameKeys[0];
      const imageRowMatch = /^ImageJ release row: (.+) \[([a-z0-9_]+)\]$/.exec(label);
      if (imageRowMatch) {
        const system = systemsByKey.get(imageRowMatch[2]);
        if (!system || system.name !== imageRowMatch[1]) throw new Error(`Invalid release-row coverage label: ${label}`);
        return imageRowMatch[2];
      }
      if (label.startsWith('ImageJ release row:')) throw new Error(`Malformed release-row coverage label: ${label}`);
      return null;
    };
    const includedByKey = new Map();
    for (const candidate of coverage) {
      if (typeof candidate.candidate !== 'string' || !candidate.candidate.trim() || typeof candidate.status !== 'string') {
        throw new Error('Coverage candidate is missing a valid label or status');
      }
      const hasRankingKey = typeof candidate.ranking_key === 'string' && candidate.ranking_key.length > 0;
      const looksIncluded = /included/i.test(candidate.status);
      const isIncluded = includedStatus.test(candidate.status);
      const mappedKey = resolveCoverageKey(candidate.candidate);
      if (looksIncluded && !isIncluded) throw new Error(`Coverage has a noncanonical included status: ${candidate.candidate}`);
      if (isIncluded !== hasRankingKey) throw new Error(`Coverage candidate has an unbound or mismatched included status: ${candidate.candidate}`);
      if (mappedKey !== null && (!isIncluded || candidate.ranking_key !== mappedKey)) {
        throw new Error(`Known release candidate is not bound to its ranked row: ${candidate.candidate}`);
      }
      if (!isIncluded) continue;
      const system = systemsByKey.get(candidate.ranking_key);
      if (!system) throw new Error(`Coverage points to a missing release row: ${candidate.ranking_key}`);
      if (mappedKey !== system.key) throw new Error(`Coverage candidate label does not map to its release row: ${candidate.candidate}`);
      const expectedStatus = `included in ${revision} ranking (#${system.rank} of ${expectedCoverageCount})`;
      if (candidate.status !== expectedStatus || !candidate.reason?.trim() || !candidate.access?.trim()) {
        throw new Error(`Coverage status or details do not match the row rank: ${candidate.candidate}`);
      }
      includedByKey.set(candidate.ranking_key, (includedByKey.get(candidate.ranking_key) ?? 0) + 1);
    }
    for (const system of a.ranking) {
      if (includedByKey.get(system.key) !== 1) throw new Error(`Coverage must identify ${system.key} exactly once`);
    }
    for (const name of ['JPT-0.8B', 'JPT-4B', 'JPT-9B', 'Qevi-2B']) {
      const key = ({ 'JPT-0.8B': 'jpt_0p8b', 'JPT-4B': 'jpt_4b', 'JPT-9B': 'jpt_9b', 'Qevi-2B': 'qevi_2b' })[name];
      if (!coverage.some((x) => x.candidate === name && includedStatus.test(x.status) && x.ranking_key === key)) throw new Error(`Missing included licensing-scope row: ${name}`);
    }
    if (!coverage.some((x) => x.candidate === 'Laya Vision' && x.status === "held at author's request" && !x.ranking_key && /author explores other options/i.test(x.reason ?? ''))) throw new Error('Missing Laya Vision publication hold');
    if (isRevision011 && !coverage.some((x) => x.candidate === 'Imajev-4B' && x.status === 'held pending author reply' && !x.ranking_key && /score and placement private/i.test(x.reason ?? ''))) throw new Error('Missing Imajev-4B publication hold');
    if (isRevision012 && !coverage.some((x) => x.candidate === 'Imajev-4B' && x.status === 'included in v0.1.2 ranking (#11 of 49)' && x.ranking_key === 'imajev_4b')) throw new Error('Missing Imajev-4B v0.1.2 ranking coverage');
    if (isRevision013 && !coverage.some((x) => x.candidate === 'Imajev-4B' && x.status === 'included in v0.1.3 ranking (#1 of 49)' && x.ranking_key === 'imajev_4b')) throw new Error('Missing Imajev-4B v0.1.3 ranking coverage');
    if (isRevision014 && !coverage.some((x) => x.candidate === 'Wity-1' && x.status === 'included in v0.1.4 ranking (#2 of 50)' && x.ranking_key === 'wity_1')) throw new Error('Missing Wity-1 v0.1.4 ranking coverage');
    if (isRevision015 && !coverage.some((x) => x.candidate === 'Wity-1' && x.status === 'included in v0.1.5 ranking (#1 of 50)' && x.ranking_key === 'wity_1')) throw new Error('Missing Wity-1 v0.1.5 ranking coverage');
    if (!coverage.some((x) => x.candidate === 'Glance speedlab Qwen3-VL-2B' && x.status === 'held pending author discussion' && !x.ranking_key)) throw new Error('Missing Glance speedlab publication hold');
  }
  if (typeof a.preview_tracks.scoring_status !== 'string' || !a.preview_tracks.scoring_status.trim()) throw new Error('Missing preview-track no-score status');
  for (const s of a.ranking) {
    if (isFrozenRelease) {
      if (!s || typeof s !== 'object' || Array.isArray(s)
        || Object.keys(s).some((field) => !(isRevision015 ? V015_ROW_FIELDS : isRevision014 ? V014_ROW_FIELDS : V011_ROW_FIELDS).has(field))
        || V011_REQUIRED_ROW_FIELDS.some((field) => !Object.hasOwn(s, field))) {
        throw new Error(`ImageJevBench ${revision} row has an unexpected or incomplete aggregate schema`);
      }
      if (typeof s.key !== 'string' || typeof s.name !== 'string' || typeof s.api_flag !== 'boolean'
        || !Number.isInteger(s.rank) || s.rank < 1 || !Number.isFinite(s.score)
        || (Object.hasOwn(s, 'prior_exposure') && typeof s.prior_exposure !== 'string')
        || (Object.hasOwn(s, 'kind') && typeof s.kind !== 'string')
        || (Object.hasOwn(s, 'inference_setting') && typeof s.inference_setting !== 'string')
        || (Object.hasOwn(s, 'previous_rank') && !Number.isInteger(s.previous_rank))
        || (Object.hasOwn(s, 'previous_score') && !Number.isFinite(s.previous_score))
        || Object.hasOwn(s, 'provenance')) {
        throw new Error(`ImageJevBench ${revision} row ${s.key ?? '(unknown)'} has an invalid aggregate field`);
      }
    }
    if (isFrozenRelease) validateAggregateTracks(s.tracks, s.key, isRevision015);
    if (s.score !== s.tracks.all.composite.score) throw new Error(`Displayed score does not match the full-track composite for ${s.key}`);
    if (s.tracks.all.public.n !== 228 || s.tracks.all.sealed.n !== 456) throw new Error(`Invalid whole-set counts for ${s.key}`);
    if (s.tracks.core.public.n !== 139 || s.tracks.core.sealed.n !== 361) throw new Error(`Invalid core counts for ${s.key}`);
    if (s.tracks.everyday_photo.public.n !== 89 || s.tracks.everyday_photo.sealed.n !== 95) throw new Error(`Invalid photo-track counts for ${s.key}`);
    for (const track of ['all', 'core', 'everyday_photo']) {
      if (!Number.isFinite(s.tracks[track].matched_gap_pp) || !Number.isFinite(s.tracks[track].penalty_multiplier)) throw new Error(`Missing matched-gap penalty data for ${s.key}/${track}`);
    }
  }
  const forbidden = new Set([
    'token', 'question', 'question_text', 'prompt', 'gold', 'golds', 'gold_key', 'gold_label',
    'answer_key', 'answer_keys', 'ground_truth', 'ground_truths', 'correct_answer', 'correct_choice',
    'answer', 'answers', 'answer_index', 'expected_answer', 'prediction', 'predictions', 'predicted',
    'predicted_answer', 'item_id', 'item_ids', 'item_text', 'item_results', 'per_item', 'per_item_scores',
    'raw_response', 'raw_output', 'raw_answer', 'image_url',
  ]);
  const normalizeField = (key) => key.toLowerCase().replace(/[^a-z0-9]/g, '');
  const forbiddenFields = new Set([...forbidden].map(normalizeField));
  const visit = (value) => {
    if (Array.isArray(value)) return value.some(visit);
    if (value && typeof value === 'object') return Object.entries(value).some(([key, child]) => forbiddenFields.has(normalizeField(key)) || visit(child));
    return false;
  };
  if (visit(a)) throw new Error('Preview contains a forbidden item-level field');
  return a;
}

const V02_FILE = 'data/raw/benchmarks/jevbench/multimodal-preview/preview-v0.2.json';
// 1 Oct 2026 presentation (Capability Score headline, Wity-1 at its stated API tariff with a striped base-model
// reference): a derived artifact that may differ from the reviewed candidate only in the allowlisted fields below.
const V02_PRESENTATION_FILE = 'data/raw/benchmarks/jevbench/multimodal-preview/preview-v0.2-presentation-20261001.json';
const EXPECTED_V02_PRESENTATION_ARTIFACT_SHA256 = '1d84879104fb3dfd0ea79f8156bea54d482c0405b42d8d24043c3496864f36d5';
const V02_PRESENTATION_TOP_FIELDS = new Set(['presentation_revision', 'derived_from', 'pricing_convention', 'capability_eligibility', 'pricing_alternatives']);
const V02_REFERENCE_FIELDS = ['key', 'name', 'kind', 'reference_revision', 'reference_score', 'reason'];
const V02_ROW_FIELDS = new Set([...V014_ROW_FIELDS, 'pricing_alternative']);
const V02_UNRANKABLE_FIELDS = [
  'key', 'name', 'kind', 'api_flag', 'tracks', 'score', 'rank', 'reason',
  'inference_setting', 'prior_exposure', 'measurement_source',
];
const V02_TRACK_COUNTS = { core: [157, 261], 'computer-use': [19, 67], 'browser-use': [15, 54] };
const V02_METHOD_SHA256 = '31907144fdc8352a652d87dbc22af460ffcb0cff10c623aa47cd37fed546ae23';
const V02_SPLIT_SHA256 = 'b1e8aa8ea2cff94cc00b56ce2d0afb1f8046b6cea5ce431467d816b9f60d600c';
// Set this only to the exact reviewed bytes of the finished v0.2 preview artifact.
const EXPECTED_V02_PREVIEW_ARTIFACT_SHA256 = '39f12af559d052e45261f66f879fbeaf79b54bf1fa9c4142ff12703246845ba8';
const V02_FORBIDDEN_FIELDS = new Set([
  'token', 'question', 'question_text', 'prompt', 'gold', 'golds', 'gold_key', 'gold_label',
  'answer_key', 'answer_keys', 'ground_truth', 'ground_truths', 'correct_answer', 'correct_choice',
  'answer', 'answers', 'answer_index', 'expected_answer', 'prediction', 'predictions', 'predicted',
  'predicted_answer', 'item_id', 'item_ids', 'item_text', 'item_results', 'per_item', 'per_item_scores',
  'raw_response', 'raw_output', 'raw_answer', 'image_url',
].map((field) => field.toLowerCase().replace(/[^a-z0-9]/g, '')));

/** Validate the release byte pin before parsing, independently testable with synthetic bytes. */
export function parsePinnedMultimodalPreviewV02Bytes(bytes, expectedSha256 = EXPECTED_V02_PREVIEW_ARTIFACT_SHA256) {
  if (typeof expectedSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(expectedSha256)) {
    throw new Error('ImageJevBench v0.2 preview artifact SHA256 is not pinned');
  }
  const payload = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  const sha256 = createHash('sha256').update(payload).digest('hex');
  if (sha256 !== expectedSha256) {
    throw new Error('ImageJevBench v0.2 preview artifact bytes differ from the pinned SHA256');
  }
  return { artifact: JSON.parse(payload.toString('utf8')), sha256 };
}

function validateV02AggregateOnly(value) {
  const visit = (item) => {
    if (Array.isArray(item)) return item.some(visit);
    if (!item || typeof item !== 'object') return false;
    return Object.entries(item).some(([key, child]) =>
      V02_FORBIDDEN_FIELDS.has(key.toLowerCase().replace(/[^a-z0-9]/g, '')) || visit(child));
  };
  if (visit(value)) throw new Error('ImageJevBench v0.2 artifact contains an item-level field');
}

function validateV02ReferenceRows(rows) {
  if (!Array.isArray(rows)) throw new Error('ImageJevBench v0.2 reference_rows must be an array');
  const keys = new Set();
  for (const [index, row] of rows.entries()) {
    exactFields(row, V02_REFERENCE_FIELDS, `ImageJevBench v0.2 reference_rows[${index}]`);
    if (V02_REFERENCE_FIELDS.some((field) => field === 'reference_score'
      ? !Number.isFinite(row[field]) || row[field] < 0 || row[field] > 100
      : typeof row[field] !== 'string' || !row[field].trim())) {
      throw new Error(`ImageJevBench v0.2 reference_rows[${index}] has an invalid field`);
    }
    if (row.reference_revision !== 'v0.1.4') {
      throw new Error(`ImageJevBench v0.2 reference_rows[${index}] is not a v0.1.4 reference`);
    }
    if (!EXPECTED_V014_KEYS.has(row.key)) {
      throw new Error(`ImageJevBench v0.2 reference_rows[${index}] is not in the v0.1.4 roster`);
    }
    if (keys.has(row.key)) throw new Error(`Duplicate ImageJevBench v0.2 reference row: ${row.key}`);
    keys.add(row.key);
  }
}

/** Bind every displayed old score to the immutable v0.1.4 row loaded by the reader. */
export function validateMultimodalPreviewV02ReferenceBindings(rows, priorRanking) {
  validateV02ReferenceRows(rows);
  if (!Array.isArray(priorRanking)) throw new Error('Pinned v0.1.4 ranking is unavailable for reference binding');
  const priorByKey = new Map(priorRanking.map((row) => [row.key, row]));
  if (priorByKey.size !== priorRanking.length) throw new Error('Pinned v0.1.4 ranking has duplicate keys');
  for (const row of rows) {
    const prior = priorByKey.get(row.key);
    const priorKind = prior?.kind ?? (prior?.api_flag ? 'api' : 'gpu');
    if (!prior || row.name !== prior.name || row.kind !== priorKind || row.reference_score !== prior.score) {
      throw new Error(`ImageJevBench v0.2 reference row does not match pinned v0.1.4 values: ${row.key}`);
    }
  }
  return true;
}

/** Require a real measurement receipt for the additional historical configuration. */
export function validateMultimodalPreviewV02HistoricalAdditionReceipt(status, releaseProvenance) {
  if (status !== 'preview') return true;
  const receipts = releaseProvenance?.['Configuration receipts'];
  const matches = Array.isArray(receipts)
    ? receipts.filter((receipt) => receipt?.key === 'imajev_4b_20260926') : [];
  if (matches.length !== 1 || !['measured', 'measured-unrankable'].includes(matches[0].status)) {
    throw new Error('ImageJevBench v0.2 historical Imajev addition needs a measured configuration receipt');
  }
  return true;
}

/** The page's visible roster includes ranked, reference-only, and fresh unrankable systems. */
export function multimodalPreviewV02VisibleKeys(artifact) {
  const rows = [
    ...(artifact?.ranking ?? []),
    ...(artifact?.reference_rows ?? []),
    ...(artifact?.measured_unrankable_rows ?? []),
  ];
  return new Set(rows.map((row) => row.key));
}

function validateV02Tracks(tracks, key) {
  exactFields(tracks, Object.keys(V02_TRACK_COUNTS), `${key}.v0.2.tracks`);
  for (const [name, counts] of Object.entries(V02_TRACK_COUNTS)) {
    const t = tracks[name];
    exactFields(t, [...TRACK_FIELDS, 'failures', 'gap_unavailable'], `${key}.${name}`);
    for (const [index, part] of ['public', 'sealed'].entries()) {
      const s = aggregateNumbers(t[part], SUMMARY_FIELDS, `${key}.${name}.${part}`, ['ece']);
      if (s.n !== counts[index] || !Number.isInteger(s.correct) || s.correct < 0 || s.correct > s.n
        || !Number.isInteger(s.valid_answer_count) || s.valid_answer_count < s.correct || s.valid_answer_count > s.n
        || ['accuracy', 'chance', 'probability_coverage'].some((f) => s[f] < 0 || s[f] > 1)
        || Math.abs(s.accuracy - s.correct / s.n) > 1e-10
        || (s.ece !== null && (s.ece < 0 || s.ece > 1))) throw new Error(`Invalid ${key}.${name}.${part} counts`);
    }
    aggregateNumbers(t.axes, AXIS_FIELDS, `${key}.${name}.axes`, ['speed', 'cost']);
    if (Object.values(t.axes).some((v) => v !== null && (v < 0 || v > 100))) throw new Error(`Invalid ${key}.${name} axis range`);
    if (!Number.isInteger(t.failures) || t.failures !== counts[0] + counts[1] - t.public.valid_answer_count - t.sealed.valid_answer_count
      || typeof t.gap_unavailable !== 'boolean'
      || (t.gap_unavailable ? t.matched_gap_pp !== null : !Number.isFinite(t.matched_gap_pp))) throw new Error(`Invalid ${key}.${name} coverage`);
    if (t.speed !== null) {
      aggregateNumbers(t.speed, SPEED_FIELDS, `${key}.${name}.speed`);
      if (t.speed.raw_p50_s <= 0 || t.speed.raw_p95_s < t.speed.raw_p50_s
        || t.speed.latency_coverage <= 0 || t.speed.latency_coverage > 1
        || t.speed.score !== t.axes.speed) throw new Error(`Invalid ${key}.${name} speed`);
    } else if (t.axes.speed !== null) throw new Error(`Missing ${key}.${name} speed receipt`);
    if (t.cost !== null) {
      exactFields(t.cost, [...COST_NUMERIC_FIELDS, 'source'], `${key}.${name}.cost`);
      aggregateNumbers(Object.fromEntries(COST_NUMERIC_FIELDS.map((f) => [f, t.cost[f]])), COST_NUMERIC_FIELDS, `${key}.${name}.cost`);
      if (t.cost.usd_per_1000 <= 0 || t.cost.total_usd <= 0 || t.cost.coverage <= 0 || t.cost.coverage > 1
        || typeof t.cost.source !== 'string' || !t.cost.source.trim()
        || t.cost.score !== t.axes.cost) throw new Error(`Invalid ${key}.${name} cost receipt`);
    } else if (t.axes.cost !== null) throw new Error(`Missing ${key}.${name} cost receipt`);
    const reproduced = weightedJevScore(t.axes, OFFICIAL_WEIGHTS);
    if (reproduced === null) {
      if (t.composite !== null) throw new Error(`Unmeasured ${key}.${name} composite`);
    } else {
      exactFields(t.composite, COMPOSITE_FIELDS, `${key}.${name}.composite`);
      aggregateNumbers(t.composite.gates, GATE_FIELDS, `${key}.${name}.gates`);
      if (!Number.isFinite(t.composite.score) || Math.abs(t.composite.score - reproduced) > 1e-9) throw new Error(`Nonreproducible ${key}.${name} composite`);
    }
  }
}

const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Bind the presentation artifact to the reviewed candidate: every difference must be an allowlisted pricing,
 * eligibility or provenance field, rows keep their measured fields, and the striped reference reproduces the
 * candidate's own cost block and composite exactly. Rank may change only by re-sorting.
 */
export function validateMultimodalPreviewV02PresentationDerivation(original, derived, originalSha256 = EXPECTED_V02_PREVIEW_ARTIFACT_SHA256) {
  if (derived?.derived_from?.sha256 !== originalSha256) throw new Error('ImageJevBench v0.2 presentation is not derived from the pinned candidate');
  const topKeys = new Set([...Object.keys(original), ...Object.keys(derived)]);
  for (const key of topKeys) {
    if (key === 'ranking' || key === 'method' || V02_PRESENTATION_TOP_FIELDS.has(key)) continue;
    if (!sameJson(original[key], derived[key])) throw new Error(`ImageJevBench v0.2 presentation changed a frozen field: ${key}`);
  }
  const methodKeys = new Set([...Object.keys(original.method ?? {}), ...Object.keys(derived.method ?? {})]);
  for (const key of methodKeys) if (key !== 'Wity price basis' && !sameJson(original.method[key], derived.method[key])) throw new Error(`ImageJevBench v0.2 presentation changed method note: ${key}`);
  const eligibility = derived.capability_eligibility;
  if (!eligibility || eligibility.factor !== 2 || !(eligibility.cost_usd_per_1000_cap > 0) || !(eligibility.latency_p50_s_cap > 0)
    || Math.abs(eligibility.cost_usd_per_1000_cap - 2 * eligibility.anchor_cost_usd_per_1000) > 1e-15
    || Math.abs(eligibility.latency_p50_s_cap - 2 * eligibility.anchor_latency_p50_s_adjusted) > 1e-15) {
    throw new Error('ImageJevBench v0.2 presentation needs frozen 2x capability eligibility limits');
  }
  const byKey = new Map(original.ranking.map((row) => [row.key, row]));
  if (derived.ranking.length !== original.ranking.length || derived.ranking.some((row) => !byKey.has(row.key))) {
    throw new Error('ImageJevBench v0.2 presentation changed the ranked roster');
  }
  const repriced = new Set();
  for (const row of derived.ranking) {
    const before = byKey.get(row.key);
    if (!Object.hasOwn(row, 'pricing_alternative')) {
      if (!sameJson({ ...before, rank: 0 }, { ...row, rank: 0 })) throw new Error(`ImageJevBench v0.2 presentation changed ${row.key}`);
      continue;
    }
    repriced.add(row.key);
    if (!row.api_flag) throw new Error(`ImageJevBench v0.2 price alternative is only for API rows: ${row.key}`);
    const alt = row.pricing_alternative;
    for (const [field, value] of Object.entries(before)) {
      if (['tracks', 'score', 'rank'].includes(field)) continue;
      if (!sameJson(value, row[field])) throw new Error(`ImageJevBench v0.2 presentation changed ${row.key}.${field}`);
    }
    exactFields(alt?.tracks, Object.keys(before.tracks), `${row.key}.pricing_alternative.tracks`);
    for (const [name, track] of Object.entries(row.tracks)) {
      const prior = before.tracks[name];
      for (const field of Object.keys(prior)) {
        if (field === 'cost' || field === 'composite' || field === 'axes') continue;
        if (!sameJson(prior[field], track[field])) throw new Error(`ImageJevBench v0.2 presentation changed measured ${row.key}.${name}.${field}`);
      }
      if (['intelligence', 'calibration', 'speed'].some((axis) => prior.axes[axis] !== track.axes[axis])) throw new Error(`ImageJevBench v0.2 presentation changed ${row.key}.${name} axes`);
      const reference = alt.tracks[name];
      if (!sameJson(reference.cost, prior.cost) || !sameJson(reference.composite, prior.composite) || reference.cost_score !== prior.axes.cost) {
        throw new Error(`ImageJevBench v0.2 striped reference does not reproduce the candidate: ${row.key}.${name}`);
      }
      if (track.cost.source === prior.cost.source) throw new Error(`ImageJevBench v0.2 repriced ${row.key}.${name} must name its primary price basis`);
    }
    if (row.score !== row.tracks.core.composite.score) throw new Error(`ImageJevBench v0.2 ${row.key} score must be its primary CORE composite`);
    const wouldBe = 1 + derived.ranking.filter((other) => other.key !== row.key && other.score > alt.tracks.core.composite.score).length;
    if (alt.rank_if_applied !== wouldBe) throw new Error(`ImageJevBench v0.2 ${row.key} striped rank is not reproducible`);
  }
  const listed = new Set((derived.pricing_alternatives ?? []).map((item) => item.key));
  if (listed.size !== repriced.size || [...repriced].some((key) => !listed.has(key))) throw new Error('ImageJevBench v0.2 pricing_alternatives must list every repriced row');
  return repriced;
}

/** Validate fresh axes that have no rankable CORE composite, retaining strict roster and reference bindings. */
export function validateMultimodalPreviewV02MeasuredUnrankableRows(rows, {
  ranking = [], referenceRows = [], status = 'measurements-in-progress', releaseProvenance = {},
} = {}) {
  if (!Array.isArray(rows)) throw new Error('ImageJevBench v0.2 measured_unrankable_rows must be an array');
  const referenceByKey = new Map(referenceRows.map((row) => [row.key, row]));
  const rankedKeys = new Set(ranking.map((row) => row.key));
  const unrankableKeys = new Set();
  for (const [index, row] of rows.entries()) {
    exactFields(row, V02_UNRANKABLE_FIELDS, `ImageJevBench v0.2 measured_unrankable_rows[${index}]`);
    if (typeof row.key !== 'string' || !row.key.trim() || typeof row.name !== 'string' || !row.name.trim()
      || !['gpu', 'api'].includes(row.kind) || typeof row.api_flag !== 'boolean' || row.api_flag !== (row.kind === 'api')
      || row.score !== null || row.rank !== null || typeof row.reason !== 'string' || !row.reason.trim()
      || typeof row.inference_setting !== 'string' || !row.inference_setting.trim()
      || typeof row.prior_exposure !== 'string'
      || typeof row.measurement_source !== 'string' || !row.measurement_source.trim()
      || (!EXPECTED_V014_KEYS.has(row.key) && row.key !== 'imajev_4b_20260926')) {
      throw new Error(`ImageJevBench v0.2 measured_unrankable_rows[${index}] has invalid identity or score values`);
    }
    if (unrankableKeys.has(row.key) || rankedKeys.has(row.key)) {
      throw new Error(`ImageJevBench v0.2 row appears more than once as measured: ${row.key}`);
    }
    unrankableKeys.add(row.key);
    validateV02Tracks(row.tracks, row.key);
    const core = row.tracks?.core;
    if (!core || !Number.isFinite(core.axes?.intelligence) || !Number.isFinite(core.axes?.calibration)
      || !Number.isFinite(core.axes?.speed) || core.axes?.cost !== null || core.composite !== null) {
      throw new Error(`ImageJevBench v0.2 ${row.key} must retain measured CORE axes without a cost-backed composite`);
    }
    const reference = referenceByKey.get(row.key);
    if (EXPECTED_V014_KEYS.has(row.key) && (!reference || reference.name !== row.name || reference.kind !== row.kind || reference.reference_revision !== 'v0.1.4'
      || reference.reason !== `Fresh v0.2 run complete, but unrankable: ${row.reason}; v0.1.4 reference only.`)) {
      throw new Error(`ImageJevBench v0.2 ${row.key} needs a matching v0.1.4 reference reason`);
    }
    if (!EXPECTED_V014_KEYS.has(row.key) && reference) {
      throw new Error(`ImageJevBench v0.2 ${row.key} has no v0.1.4 reference configuration`);
    }
  }
  if (status === 'preview') {
    const receipts = releaseProvenance?.['Configuration receipts'];
    if (!Array.isArray(receipts)) throw new Error('ImageJevBench v0.2 preview needs configuration receipts');
    const receiptStatus = new Map();
    for (const receipt of receipts) {
      if (!receipt || typeof receipt.key !== 'string' || typeof receipt.status !== 'string' || receiptStatus.has(receipt.key)) {
        throw new Error('ImageJevBench v0.2 preview has invalid or duplicate configuration receipts');
      }
      receiptStatus.set(receipt.key, receipt.status);
    }
    for (const key of unrankableKeys) {
      if (receiptStatus.get(key) !== 'measured-unrankable') {
        throw new Error(`ImageJevBench v0.2 ${key} lacks a measured-unrankable configuration receipt`);
      }
    }
  } else if (rows.length > 0) {
    throw new Error('ImageJevBench v0.2 staging artifact must not contain measured rows');
  }
  return unrankableKeys;
}

/**
 * Read the measured-only v0.2 aggregate artifact. Its headline is `tracks.core`; computer-use and browser-use
 * remain independent tracks, and references carry no v0.2 score fields.
 */
export async function readMultimodalPreviewV02({ allowMissing = false } = {}) {
  const file = path.join(process.cwd(), V02_FILE);
  let bytes;
  try {
    bytes = await readFile(file);
  } catch (error) {
    if (allowMissing && error?.code === 'ENOENT') return null;
    throw error;
  }
  // Keep v0.2 fail-closed until the reviewed terminal release bytes have an explicit pin.
  const { artifact: candidate } = parsePinnedMultimodalPreviewV02Bytes(bytes);
  // The page reads the derived 1 Oct presentation, bound field-by-field to the immutable candidate above.
  const { artifact, sha256 } = parsePinnedMultimodalPreviewV02Bytes(
    await readFile(path.join(process.cwd(), V02_PRESENTATION_FILE)), EXPECTED_V02_PRESENTATION_ARTIFACT_SHA256);
  validateMultimodalPreviewV02PresentationDerivation(candidate, artifact);
  if (!artifact || artifact.version !== 'v0.2.0'
    || !['measurements-in-progress', 'preview'].includes(artifact.status)
    || artifact.sealed_item_details_included !== false
    || artifact.headline_track !== 'core'
    || !artifact.split || artifact.split.items_total !== 573
    || artifact.split.items_public !== 191 || artifact.split.items_sealed !== 382) {
    throw new Error('Invalid ImageJevBench v0.2 aggregate artifact metadata');
  }
  if (!Array.isArray(artifact.ranking)) throw new Error('ImageJevBench v0.2 ranking must be an array');
  if (artifact.status === 'preview' && (artifact.method_sha256 !== V02_METHOD_SHA256
    || artifact.split_sha256 !== V02_SPLIT_SHA256 || artifact.weights?.public !== 0.35 || artifact.weights?.sealed !== 0.65)) {
    throw new Error('ImageJevBench v0.2 method differs from the frozen scoring protocol');
  }
  if (!Object.hasOwn(artifact, 'measured_unrankable_rows')) {
    if (artifact.status === 'preview') throw new Error('ImageJevBench v0.2 preview must include measured_unrankable_rows');
    artifact.measured_unrankable_rows = [];
  }
  if (!Array.isArray(artifact.measured_unrankable_rows)) {
    throw new Error('ImageJevBench v0.2 measured_unrankable_rows must be an array');
  }
  // v0.2 reference rows are bound to the archived v0.1.4 release (385aba04…), not to the live v0.1.x artifact.
  const { artifact: prior } = await readArchivedMultimodalPreviewV014();
  validateMultimodalPreviewV02ReferenceBindings(artifact.reference_rows, prior.ranking);
  const referenceKeys = new Set(artifact.reference_rows.map((row) => row.key));
  const measuredKeys = new Set();
  for (const [index, row] of artifact.ranking.entries()) {
    if (!row || typeof row !== 'object' || Array.isArray(row)
      || Object.keys(row).some((field) => !V02_ROW_FIELDS.has(field))
      || ['key', 'name', 'kind', 'api_flag', 'tracks', 'score', 'rank'].some((field) => !Object.hasOwn(row, field))) {
      throw new Error(`ImageJevBench v0.2 ranking[${index}] has an unexpected or incomplete row shape`);
    }
    if (typeof row.key !== 'string' || !row.key.trim() || typeof row.name !== 'string' || !row.name.trim()
      || typeof row.kind !== 'string' || typeof row.api_flag !== 'boolean'
      || !Number.isInteger(row.rank) || row.rank < 1 || !Number.isFinite(row.score)) {
      throw new Error(`ImageJevBench v0.2 ranking[${index}] has invalid identity or rank values`);
    }
    if (measuredKeys.has(row.key) || referenceKeys.has(row.key)) throw new Error(`ImageJevBench v0.2 row appears as both measured and reference: ${row.key}`);
    measuredKeys.add(row.key);
    validateV02Tracks(row.tracks, row.key);
    const core = row.tracks?.core;
    if (!core || !Number.isFinite(core.axes?.intelligence) || !Number.isFinite(core.axes?.calibration)
      || !Number.isFinite(core.axes?.speed) || !Number.isFinite(core.axes?.cost)
      || [core.axes.intelligence, core.axes.calibration, core.axes.speed, core.axes.cost, core.composite?.score, row.score]
        .some((value) => !Number.isFinite(value) || value < 0 || value > 100)
      || core.composite.score !== row.score) {
      throw new Error(`ImageJevBench v0.2 ${row.key} has no valid measured core aggregate`);
    }
    if (row.rank !== index + 1) throw new Error('ImageJevBench v0.2 measured rows must be consecutively ranked by core score');
    if (index > 0 && artifact.ranking[index - 1].score < row.score) throw new Error('ImageJevBench v0.2 rows are not ordered by core score');
  }
  const unrankableKeys = validateMultimodalPreviewV02MeasuredUnrankableRows(artifact.measured_unrankable_rows, {
    ranking: artifact.ranking,
    referenceRows: artifact.reference_rows,
    status: artifact.status,
    releaseProvenance: artifact.release_provenance,
  });
  validateMultimodalPreviewV02HistoricalAdditionReceipt(artifact.status, artifact.release_provenance);
  if (artifact.status === 'measurements-in-progress' && artifact.ranking.length !== 0) {
    throw new Error('ImageJevBench v0.2 staging artifact must not contain scores');
  }
  if (artifact.status === 'preview' && artifact.ranking.length === 0) {
    throw new Error('ImageJevBench v0.2 preview needs measured rows');
  }
  const visibleKeys = new Set([...measuredKeys, ...referenceKeys, ...unrankableKeys]);
  if ([...EXPECTED_V014_KEYS].some((key) => !visibleKeys.has(key))) throw new Error('ImageJevBench v0.2 omits prior roster systems');
  if (artifact.status === 'preview' && (visibleKeys.size !== 51
    || !visibleKeys.has('imajev_4b_20260926')
    || [...visibleKeys].some((key) => !EXPECTED_V014_KEYS.has(key) && key !== 'imajev_4b_20260926'))) {
    throw new Error('ImageJevBench v0.2 must represent the exact 51-configuration release roster');
  }
  validateV02AggregateOnly(artifact);
  return { artifact, sha256 };
}

/** Keep the public-reader default at the live v0.1.5 release until a real v0.2 preview artifact exists. */
export async function defaultMultimodalPreviewVersion() {
  try {
    const current = await readMultimodalPreviewV02({ allowMissing: true });
    return current?.artifact.status === 'preview' && current.artifact.ranking.length > 0 ? 'v0.2.0' : 'v0.1.5';
  } catch {
    // An incomplete or malformed new artifact must not take the existing v0.1.5 page offline.
    return 'v0.1.5';
  }
}

/** A page-only zero-score staging view so the tab and reference table can be reviewed before v0.2 completes. */
export async function readMultimodalPreviewV02PageData() {
  const current = await readMultimodalPreviewV02({ allowMissing: true });
  const { artifact: prior } = await readArchivedMultimodalPreviewV014();
  if (current) {
    const visibleKeys = multimodalPreviewV02VisibleKeys(current.artifact);
    const missingPrior = prior.ranking.map((row) => row.key).filter((key) => !visibleKeys.has(key));
    if (missingPrior.length) throw new Error(`ImageJevBench v0.2 page omits ${missingPrior.length} prior v0.1.4 systems: ${missingPrior.join(', ')}`);
    return { ...current, prior, staging: current.artifact.status === 'measurements-in-progress' };
  }
  const artifact = {
    version: 'v0.2.0',
    status: 'measurements-in-progress',
    headline_track: 'core',
    sealed_item_details_included: false,
    split: {
      items_total: 573,
      items_public: 191,
      items_sealed: 382,
      core: { items_total: 418, items_public: 157, items_sealed: 261 },
      'computer-use': { items_total: 86 },
      'browser-use': { items_total: 69 },
    },
    method: { summary: 'Frozen v0.2 method; measurements are in progress.' },
    ranking: [],
    measured_unrankable_rows: [],
    reference_rows: prior.ranking.map((row) => ({
      key: row.key,
      name: row.name,
      kind: row.kind ?? (row.api_flag ? 'api' : 'gpu'),
      reference_revision: 'v0.1.4',
      reference_score: row.score,
      reason: 'Not yet remeasured on the v0.2 pool; shown as a v0.1.4 reference only.',
    })),
  };
  return { artifact, sha256: null, prior, staging: true };
}

export async function readArchivedMultimodalPreviewV011() {
  const file = path.join(process.cwd(), 'data/raw/benchmarks/jevbench/multimodal-preview/preview-v0.1.1.json');
  const bytes = await readFile(file);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (sha256 !== EXPECTED_V011_ARTIFACT_SHA256) throw new Error('Archived ImageJevBench v0.1.1 artifact bytes differ from the published release');
  const artifact = JSON.parse(bytes.toString('utf8'));
  if (artifact.benchmark !== 'Image JevBench v0.1.1' || artifact.revision !== 'v0.1.1' || artifact.n_systems !== 48) {
    throw new Error('Archived ImageJevBench v0.1.1 artifact metadata is invalid');
  }
  return { artifact, bytes, sha256 };
}

export async function readArchivedMultimodalPreviewV012() {
  const file = path.join(process.cwd(), 'data/raw/benchmarks/jevbench/multimodal-preview/preview-v0.1.2.json');
  const bytes = await readFile(file);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (sha256 !== EXPECTED_V012_ARTIFACT_SHA256) throw new Error('Archived ImageJevBench v0.1.2 artifact bytes differ from the published release');
  const artifact = JSON.parse(bytes.toString('utf8'));
  if (artifact.benchmark !== 'Image JevBench v0.1.2' || artifact.revision !== 'v0.1.2' || artifact.n_systems !== 49) {
    throw new Error('Archived ImageJevBench v0.1.2 artifact metadata is invalid');
  }
  return { artifact, bytes, sha256 };
}

export async function readArchivedMultimodalPreviewV013() {
  const file = path.join(process.cwd(), 'data/raw/benchmarks/jevbench/multimodal-preview/preview-v0.1.3.json');
  const bytes = await readFile(file);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (sha256 !== EXPECTED_V013_ARTIFACT_SHA256) throw new Error('Archived ImageJevBench v0.1.3 artifact bytes differ from the published release');
  const artifact = JSON.parse(bytes.toString('utf8'));
  if (artifact.benchmark !== 'Image JevBench v0.1.3' || artifact.revision !== 'v0.1.3' || artifact.n_systems !== 49) {
    throw new Error('Archived ImageJevBench v0.1.3 artifact metadata is invalid');
  }
  return { artifact, bytes, sha256 };
}

export async function readArchivedMultimodalPreviewV014() {
  const file = path.join(process.cwd(), 'data/raw/benchmarks/jevbench/multimodal-preview/preview-v0.1.4.json');
  const bytes = await readFile(file);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (sha256 !== EXPECTED_V014_ARTIFACT_SHA256) throw new Error('Archived ImageJevBench v0.1.4 artifact bytes differ from the published release');
  const artifact = JSON.parse(bytes.toString('utf8'));
  if (artifact.benchmark !== 'Image JevBench v0.1.4' || artifact.revision !== 'v0.1.4' || artifact.n_systems !== 50) {
    throw new Error('Archived ImageJevBench v0.1.4 artifact metadata is invalid');
  }
  return { artifact, bytes, sha256 };
}
