import { jevArchFields, jevArchFor } from './jevbench-architecture.mjs';
import { readFileSync } from 'node:fs';

const TRACKS = ['all', 'core', 'everyday_photo'];
const TYPES = ['choice', 'noul', 'score'];
const TIERS = ['easy', 'standard', 'judge', 'hard'];
const V154_ARTIFACT = new URL('../data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.4-results.json', import.meta.url);

function imageRows(artifact) {
  if (!artifact || !Array.isArray(artifact.ranking)) throw new TypeError('ImageJev artifact must include a ranking array');
  return artifact.ranking;
}

function headlineTrack(artifact) {
  const track = artifact.headline_track ?? 'all';
  if (!TRACKS.includes(track)) throw new Error(`Unsupported ImageJev headline track: ${track}`);
  return track;
}

function trackFor(artifact, row) {
  const track = row.tracks?.[headlineTrack(artifact)];
  if (!track || !track.axes || !track.composite) throw new Error(`ImageJev row ${row.key} is missing headline aggregates`);
  return track;
}

function nullableNumber(value) {
  return Number.isFinite(value) ? value : null;
}

export function imageJevClassFor(row) {
  return jevArchFor('imagejevbench', row).arch;
}

function systemRow(artifact, row) {
  const track = trackFor(artifact, row);
  const api = row.api_flag === true || row.kind === 'api';
  const source = track.cost?.source ?? track.cost?.basis ?? row.cost?.basis ?? 'Cost basis not reported.';
  const costKind = track.cost?.kind ?? row.cost?.kind ?? (api
    ? (/estimate|reference/i.test(source) ? 'estimate' : 'announced')
    : 'measured');
  const rawP50 = nullableNumber(track.speed?.raw_p50_s ?? track.speed?.p50_s_raw);
  const adjustedP50 = nullableNumber(track.speed?.adjusted_p50_s ?? track.speed?.p50_s_adjusted);
  const rawP95 = nullableNumber(track.speed?.raw_p95_s ?? track.speed?.p95_s_raw);
  const adjustedP95 = nullableNumber(track.speed?.adjusted_p95_s ?? track.speed?.p95_s_adjusted);
  const speedAdjustment = track.speed?.adjustment ?? (rawP50 != null && adjustedP50 != null && rawP50 !== adjustedP50
    ? 'v1.4 local latency adjustment'
    : api ? 'none (hosted API, measured as is)' : 'none');
  const rank = Number.isInteger(track.rank) ? track.rank : Number.isInteger(row.rank) ? row.rank : null;
  const score = nullableNumber(track.composite.score ?? row.score);
  const listing = row.listing ?? (rank == null ? 'unranked' : 'ranked');
  const axes = Object.fromEntries(['intelligence', 'calibration', 'speed', 'cost'].map((axis) => [axis, nullableNumber(track.axes[axis])]));
  const alternative = row.pricing_alternative?.tracks?.[headlineTrack(artifact)];
  const alt = alternative ? {
    axes: { cost: nullableNumber(alternative.cost_score) },
    usd_per_1000: nullableNumber(alternative.usd_per_1000),
    label: 'Base-model price',
    note: row.pricing_alternative.basis,
  } : null;

  return {
    key: row.key,
    display: row.display ?? row.name ?? row.key,
    author: row.author ?? (api ? 'Hosted API provider' : 'Model author not reported'),
    repo: row.repo ?? null,
    class: row.class ?? '',
    ...jevArchFields('imagejevbench', row),
    licence: row.licence ?? (api ? 'proprietary API' : 'not reported'),
    underlying: row.underlying ?? null,
    open: row.open ?? (api ? 'no' : 'unknown'),
    ranked: row.ranked ?? rank != null,
    listing,
    rank,
    jevbench_score: score,
    axes,
    speed: {
      p50_s_raw: rawP50,
      p95_s_raw: rawP95,
      p50_s_adjusted: adjustedP50,
      p95_s_adjusted: adjustedP95,
      adjustment: speedAdjustment,
    },
    cost: { kind: costKind, usd_per_1000: nullableNumber(track.cost?.usd_per_1000), basis: source },
    public_accuracy: nullableNumber(track.public?.accuracy),
    sealed_accuracy: nullableNumber(track.sealed?.accuracy),
    public_minus_sealed_gap_pp: nullableNumber(track.raw_overall_gap_pp ?? track.public_minus_sealed_gap_pp),
    endpoint_kind: row.endpoint_kind ?? (api ? 'api' : 'self-hosted'),
    endpoint_condition: row.endpoint_condition ?? (api ? "the operator's hosted API" : 'local/GPU evaluation'),
    api_flag: api,
    api_exposure_note: row.api_exposure_note ?? (api ? 'Hosted API evaluation; see ImageJevBench method.' : null),
    not_ranked_because: row.not_ranked_because ?? null,
    priority_run: row.priority_run,
    openSource: row.open === 'yes' || row.open === true || row.open === 'weights',
    note: row.not_ranked_because ?? row.not_scored_reason ?? row.measurement_source ?? null,
    isNew: false,
    alt,
  };
}

/** Map ImageJev rows to the shared Jev V1.4 class/capability/bubble chart contract. */
/** Official order: ranked rows by rank ascending, then unranked rows by composite descending (stable). */
export function imageJevOfficialOrder(rows) {
  const scoreOf = (row) => (Number.isFinite(row.jevbench_score) ? row.jevbench_score : -Infinity);
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const ra = Number.isInteger(a.row.rank) ? a.row.rank : Infinity;
      const rb = Number.isInteger(b.row.rank) ? b.row.rank : Infinity;
      if (ra !== rb) return ra - rb;
      const sa = scoreOf(a.row);
      const sb = scoreOf(b.row);
      if (sa !== sb) return sb - sa;
      return a.index - b.index;
    })
    .map(({ row }) => row);
}

export function imageJevBoardSystems(artifact) {
  return imageJevOfficialOrder(imageRows(artifact).map((row) => systemRow(artifact, row)));
}

/** Map ImageJev rows to the shared composite chart, retaining Wity's striped-bar alternative payload. */
export function imageJevBoardRows(artifact) {
  return imageJevBoardSystems(artifact).map((row) => {
    const { alt, ...boardRow } = row;
    return alt ? { ...boardRow, alt } : boardRow;
  });
}

/** Map ImageJev rows to the shared two-system comparison shape. */
export function imageJevCompareRows(artifact) {
  return imageJevBoardSystems(artifact).map((row) => {
    const typeCc = Object.fromEntries(TYPES.map((type) => [type, { open: null, sealed: null }]));
    const tierCc = Object.fromEntries(['open', 'sealed'].map((part) => [part, Object.fromEntries(TIERS.map((tier) => [tier, null]))]));
    const compareRow = {
      key: row.key,
      name: row.display.split(' (')[0].split(', formerly')[0],
      cls: row.class, arch: row.arch, archBadges: row.archBadges,
      rank: row.rank,
      listing: row.listing,
      score: row.jevbench_score,
      repo: row.repo,
      axes: row.axes,
      typeCc,
      tierCc,
      hosted: row.api_flag === true,
    };
    return row.alt ? { ...compareRow, alt: row.alt } : compareRow;
  });
}

/**
 * Return the frozen absolute Jev-class limits. v0.1.5 carries these values in the artifact;
 * v0.2 predates that field, so its fallback derives them from the pinned JevBench v1.5.4 row.
 */
export function imageJevCapabilityLimits(artifact) {
  const eligibility = artifact?.capability_eligibility;
  if (eligibility) {
    if (!Number.isFinite(eligibility.cost_usd_per_1000_cap) || !Number.isFinite(eligibility.latency_p50_s_cap)
      || !Number.isFinite(eligibility.factor)) throw new Error('Invalid ImageJev capability_eligibility limits');
    return {
      cost: eligibility.cost_usd_per_1000_cap,
      latency: eligibility.latency_p50_s_cap,
      factor: eligibility.factor,
      referenceLabel: 'Jev 1.13.0 (JevBench)',
    };
  }
  const jevBench = JSON.parse(readFileSync(V154_ARTIFACT, 'utf8'));
  const anchor = jevBench.systems?.find((row) => row.key === 'jev-1.13.0');
  const cost = anchor?.cost?.usd_per_1000;
  const latency = anchor?.speed?.p50_s_adjusted;
  const factor = 2;
  if (!Number.isFinite(cost) || !Number.isFinite(latency)) throw new Error('Pinned JevBench v1.5.4 anchor is missing cost or adjusted p50');
  return { cost: cost * factor, latency: latency * factor, factor, referenceLabel: 'Jev 1.13.0 (JevBench)' };
}

/** Equal weights are official; other presets give useful accuracy, speed, cost and capability views. */
export function imageJevSliderPresets(_artifact) {
  return [
    { name: 'Official 25:25:25:25', weights: { intelligence: 25, calibration: 25, speed: 25, cost: 25 } },
    { name: 'Capability only', weights: { intelligence: 50, calibration: 50, speed: 0, cost: 0 } },
    { name: 'Accuracy emphasis', weights: { intelligence: 50, calibration: 25, speed: 15, cost: 10 } },
    { name: 'Speed emphasis', weights: { intelligence: 20, calibration: 20, speed: 50, cost: 10 } },
    { name: 'Cost emphasis', weights: { intelligence: 20, calibration: 20, speed: 10, cost: 50 } },
  ];
}
