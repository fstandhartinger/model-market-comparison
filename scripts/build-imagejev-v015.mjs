import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { costScore } from '../lib/jevbench-v12-score.mjs';

const directory = new URL('../data/raw/benchmarks/jevbench/multimodal-preview/', import.meta.url);
const livePath = new URL('preview.json', directory);
const frozenPath = new URL('preview-v0.1.4.json', directory);
const EXPECTED_V014_SHA256 = '96592b31c1b419f1d85c5128dd8de6646927f18605e345b1d3652c9a07c4e9d8';
let inputBytes;
try {
  inputBytes = await readFile(frozenPath);
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  inputBytes = await readFile(livePath);
  const firstInputSha256 = createHash('sha256').update(inputBytes).digest('hex');
  if (firstInputSha256 !== EXPECTED_V014_SHA256) throw new Error(`Expected frozen v0.1.4 input, got ${firstInputSha256}`);
  await copyFile(livePath, frozenPath);
}
const inputSha256 = createHash('sha256').update(inputBytes).digest('hex');
if (inputSha256 !== EXPECTED_V014_SHA256) throw new Error(`Expected frozen v0.1.4 input, got ${inputSha256}`);

const artifact = JSON.parse(inputBytes.toString('utf8'));
if (artifact.revision !== 'v0.1.4' || artifact.n_systems !== 50) throw new Error('Expected the 50-system v0.1.4 source artifact');
const jev154Path = new URL('../data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.4-results.json', import.meta.url);
const jev154 = JSON.parse(await readFile(jev154Path, 'utf8'));
const jevAnchor = jev154.systems?.find((row) => row.key === 'jev-1.13.0');
const anchorCost = jevAnchor?.cost?.usd_per_1000;
const anchorLatency = jevAnchor?.speed?.p50_s_adjusted;
if (anchorCost !== 0.032297327586206896 || anchorLatency !== 0.6164783202111721) {
  throw new Error('JevBench v1.5.4 Jev 1.13.0 anchor values differ from the frozen capability envelope source');
}
const capabilityFactor = 2;
const capabilityCostCap = anchorCost * capabilityFactor;
const capabilityLatencyCap = anchorLatency * capabilityFactor;
const oldByKey = new Map(artifact.ranking.map((row) => [row.key, structuredClone(row)]));
const wity = artifact.ranking.find((row) => row.key === 'wity_1');
if (!wity || wity.api_flag !== true || wity.kind !== 'api') throw new Error('The v0.1.4 Wity-1 row is missing or not a hosted API');
wity.pricing_alternative = { tracks: {} };

const API_INPUT_USD_PER_MILLION = 0.042;
const BASE_INPUT_USD_PER_MILLION = 0.15;
const API_TO_BASE_RATE = API_INPUT_USD_PER_MILLION / BASE_INPUT_USD_PER_MILLION;
const API_SOURCE = 'Wity stated API tariff: USD 0.042/M input; output, thinking, and images free; measured Wity usage (zero output tokens)';
const GATE_FLOOR = 50;
const tracks = ['all', 'core', 'everyday_photo'];
const expectedHeadline = {
  all: { usd: 0.007401701754386, costScore: 73.920, composite: 80.19853920531308 },
  core: { usd: 0.008129436, composite: null },
  everyday_photo: { composite: null },
};

function compositeScore(axes) {
  const values = ['intelligence', 'calibration', 'speed', 'cost'].map((axis) => axes[axis]);
  if (values.some((value) => !Number.isFinite(value) || value < 0)) throw new Error('Composite needs four finite non-negative axes');
  const harmonic = values.some((value) => value === 0) ? 0 : 4 / values.reduce((sum, value) => sum + 1 / value, 0);
  const gates = Object.fromEntries(['intelligence', 'speed', 'cost'].map((axis) => [
    axis, axes[axis] < GATE_FLOOR ? (axes[axis] / GATE_FLOOR) ** 2 : 1,
  ]));
  return { harmonic_before_gates: harmonic, gates, score: harmonic * gates.intelligence * gates.speed * gates.cost };
}

for (const trackName of tracks) {
  const track = wity.tracks[trackName];
  const count = track.public.n + track.sealed.n;
  const cost = track.cost;
  if (cost.coverage !== 1 || !Number.isFinite(cost.total_usd) || !Number.isFinite(cost.usd_per_1000)) {
    throw new Error(`Wity ${trackName} track has incomplete old price evidence`);
  }
  const baseUsdPer1000 = cost.usd_per_1000;
  const baseTotalUsd = cost.total_usd;
  const baseCostScore = cost.score;
  const apiTotalUsd = baseTotalUsd * API_TO_BASE_RATE;
  const apiUsdPer1000 = baseUsdPer1000 * API_TO_BASE_RATE;
  const apiCostScore = costScore(apiUsdPer1000);

  const alternativeAxes = { ...track.axes, cost: baseCostScore };
  const alternativeComposite = compositeScore(alternativeAxes).score;
  cost.total_usd = apiTotalUsd;
  cost.usd_per_1000 = apiUsdPer1000;
  cost.raw_score = apiCostScore;
  cost.score = apiCostScore * cost.coverage;
  cost.source = API_SOURCE;
  track.axes.cost = cost.score;
  track.composite = compositeScore(track.axes);
  track.rank = null;

  if (Math.abs(apiTotalUsd * 1000 / count - apiUsdPer1000) > 1e-15) throw new Error(`${trackName}: tariff arithmetic mismatch`);
  if (Math.abs(cost.score - costScore(cost.usd_per_1000)) > 1e-12) throw new Error(`${trackName}: cost score does not match lib/jevbench-v12-score.mjs`);
  wity.pricing_alternative.tracks[trackName] = {
    usd_per_1000: baseUsdPer1000,
    cost_score: baseCostScore,
    composite: alternativeComposite,
  };
}

// Independently exercise the published cost scoring implementation on multiple rows and known old data.
for (const [trackName, expected] of Object.entries(expectedHeadline)) {
  const row = wity.tracks[trackName];
  if (Math.abs(row.cost.usd_per_1000 - expected.usd) > 1e-10
    || (expected.costScore != null && Math.abs(row.cost.score - expected.costScore) > 0.02)
    || (expected.composite != null && Math.abs(row.composite.score - expected.composite) > 1e-8)) {
    throw new Error(`${trackName}: API price result differs from the reviewed arithmetic`);
  }
}

const perTrackRanks = {};
for (const trackName of tracks) {
  const ordered = [...artifact.ranking].sort((a, b) => b.tracks[trackName].composite.score - a.tracks[trackName].composite.score
    || a.name.localeCompare(b.name));
  ordered.forEach((row, index) => { row.tracks[trackName].rank = index + 1; });
  perTrackRanks[trackName] = ordered.map((row) => row.key);
}
artifact.ranking = [...artifact.ranking].sort((a, b) => b.tracks.all.composite.score - a.tracks.all.composite.score
  || a.name.localeCompare(b.name));
artifact.ranking.forEach((row, index) => {
  row.rank = row.tracks.all.rank;
  row.score = row.tracks.all.composite.score;
  if (row.rank !== index + 1) throw new Error('Headline order and full-track ranks diverged');
});

const headlineRank = (score) => 1 + artifact.ranking.filter((row) => row.key !== 'wity_1' && row.tracks.all.composite.score > score).length;
wity.pricing_alternative = {
  basis: 'Base-model market reference (base model undisclosed at the author\'s request)',
  tracks: wity.pricing_alternative.tracks,
  would_rank: headlineRank(wity.pricing_alternative.tracks.all.composite),
};

artifact.revision = 'v0.1.5';
artifact.benchmark = 'Image JevBench v0.1.5';
artifact.built_utc = '2026-10-01';
artifact.method.cost = 'Hosted cost uses returned usage receipts for four OpenRouter endpoints and published Gemma 4 rates for Autoloops. Wity-1 uses its stated API tariff (USD 0.042/M input; output, thinking, and images free) applied to measured usage, by Florian’s 1 Oct price decision. The tariff is younger than 30 days; the owner decision supersedes the 30-day rule for this case. The base-model market reference (base undisclosed at the author\'s request) remains visible as a pricing alternative. Introductory credit is not scored as a zero tariff. Missing receipts are not zero-filled; Cost is scaled by receipt coverage. Local cost uses measured GPU seconds at recorded GPU-hour rates. See PRICING-v0.1.5.md.';
artifact.capability_eligibility = {
  anchor: 'jev-1.13.0',
  anchor_source: 'JevBench v1.5.4',
  factor: capabilityFactor,
  cost_usd_per_1000_cap: capabilityCostCap,
  latency_p50_s_cap: capabilityLatencyCap,
  anchor_cost_usd_per_1000: anchorCost,
  anchor_latency_p50_s: anchorLatency,
  rationale: 'ImageJevBench has no Jev reference row because Jev does not accept images. Capability eligibility therefore uses the same absolute envelope as JevBench: twice Jev 1.13.0’s v1.5.4 cost and adjusted median latency. These anchor values are frozen here so later JevBench releases do not move the ImageJevBench cap.',
};
artifact.revision_note = 'Florian’s 1 Oct 2026 decision applies Wity-1’s stated API tariff to the measured Wity usage. This tariff is younger than 30 days, and the owner decision supersedes the 30-day rule for this case. The base-model market reference (base undisclosed at the author\'s request) remains available as Wity-1’s pricing alternative.';

const byKey = new Map(artifact.ranking.map((row) => [row.key, row]));
artifact.candidate_coverage.included_note = 'Wity-1 completed a full 684-decision API run. Its Cost axis uses Wity’s stated API tariff by Florian’s 1 Oct price decision; the exact deployed server build remains under author review.';
for (const candidate of artifact.candidate_coverage.candidates) {
  if (candidate.ranking_key) candidate.status = `included in v0.1.5 ranking (#${byKey.get(candidate.ranking_key).rank} of 50)`;
  if (candidate.ranking_key === 'wity_1') {
    candidate.source_revision = 'Wity production-named endpoint; deployed build ID unavailable on 29 Sep 2026';
    candidate.access = 'Hosted Wity SystemOne API; Cost uses the stated Wity tariff';
    candidate.reason = 'Full 684-decision run with valid probabilities and complete input/output usage; the stated API tariff was selected by the owner on 1 Oct. Server build remains under author review.';
  }
}

const stableJson = (value) => {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('non-finite aggregate');
    const bytes = new ArrayBuffer(8);
    new DataView(bytes).setFloat64(0, value, false);
    const number64 = [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    return `{"$number64":${JSON.stringify(number64)}}`;
  }
  return JSON.stringify(value);
};
const sha = (value) => createHash('sha256').update(value).digest('hex');
artifact.release_provenance.parent_revision = 'v0.1.4';
const v014SourceHashes = { ...artifact.release_provenance.source_sha256 };
delete v014SourceHashes.live_v0_1_3_artifact;
artifact.release_provenance.source_sha256 = {
  live_v0_1_4_artifact: EXPECTED_V014_SHA256,
  ...v014SourceHashes,
};
artifact.release_provenance.aggregate_row_sha256 = Object.fromEntries(artifact.ranking
  .map((row) => [row.key, sha(stableJson(row))]).sort(([a], [b]) => a.localeCompare(b)));

function assertNonWityNumbersUnchanged(oldValue, newValue, path = '') {
  if (typeof oldValue === 'number' || typeof newValue === 'number') {
    if (path.split('.').at(-1) === 'rank') return;
    if (oldValue !== newValue) throw new Error(`Non-Wity numeric field changed: ${path} (${oldValue} -> ${newValue})`);
    return;
  }
  if (Array.isArray(oldValue) && Array.isArray(newValue)) {
    if (oldValue.length !== newValue.length) throw new Error(`Non-Wity array changed: ${path}`);
    oldValue.forEach((value, index) => assertNonWityNumbersUnchanged(value, newValue[index], `${path}.${index}`));
    return;
  }
  if (oldValue && newValue && typeof oldValue === 'object' && typeof newValue === 'object') {
    for (const key of new Set([...Object.keys(oldValue), ...Object.keys(newValue)])) {
      assertNonWityNumbersUnchanged(oldValue[key], newValue[key], path ? `${path}.${key}` : key);
    }
  }
}
for (const [key, original] of oldByKey) {
  if (key === 'wity_1') continue;
  const current = byKey.get(key);
  if (!current) throw new Error(`System disappeared: ${key}`);
  assertNonWityNumbersUnchanged(original, current, key);
}

for (const trackName of tracks) {
  const ranks = artifact.ranking.map((row) => row.tracks[trackName].rank).sort((a, b) => a - b);
  if (ranks.some((rank, index) => rank !== index + 1)) throw new Error(`${trackName} track has a rank gap`);
  const ordered = [...artifact.ranking].sort((a, b) => b.tracks[trackName].composite.score - a.tracks[trackName].composite.score
    || a.name.localeCompare(b.name));
  if (ordered.some((row, index) => row.tracks[trackName].rank !== index + 1)) throw new Error(`${trackName} ranks do not follow composite scores`);
}
if (wity.rank !== 1 || byKey.get('imajev_4b').rank !== 2 || wity.pricing_alternative.would_rank !== 2) {
  throw new Error('Expected Wity-1 #1 and the base-model price alternative #2');
}

await writeFile(livePath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(JSON.stringify({
  output: 'data/raw/benchmarks/jevbench/multimodal-preview/preview.json',
  frozen: 'data/raw/benchmarks/jevbench/multimodal-preview/preview-v0.1.4.json',
  revision: artifact.revision,
  top_five: artifact.ranking.slice(0, 5).map(({ key, name, score }) => ({ key, name, score })),
  wity_api: Object.fromEntries(tracks.map((name) => [name, {
    usd_per_1000: wity.tracks[name].cost.usd_per_1000,
    cost_score: wity.tracks[name].cost.score,
    composite: wity.tracks[name].composite.score,
  }])),
  alternative: wity.pricing_alternative,
  per_track_ranks: Object.fromEntries(tracks.map((name) => [name, perTrackRanks[name].slice(0, 5)])),
}, null, 2));
