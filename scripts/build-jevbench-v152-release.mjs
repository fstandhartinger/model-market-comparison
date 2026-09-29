import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const root = process.cwd();
const sourcePath = `${root}/data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.1-results.json`;
const addendumPath = `${root}/data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.2-a3-addendum.json`;
const outputPath = `${root}/data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.2-results.json`;
const EXPECTED_PARENT_SHA256 = '6f2fa547454b1108fad701ef302f48450742562393d532d45eccd048f736a9e2';
const EXPECTED_ADDENDUM_SHA256 = 'ddb1c8c84ec409a4146c05c772efa2ffbe1adcd8bbe92b5bb3006b34c3890d03';
const EXPECTED_ROWS = ['nemotron-diffusion-8b'];
const OPTIONS = ['A', 'B', 'C'];

const sourceBytes = await readFile(sourcePath);
const addendumBytes = await readFile(addendumPath);
const sourceSha256 = createHash('sha256').update(sourceBytes).digest('hex');
const addendumSha256 = createHash('sha256').update(addendumBytes).digest('hex');
if (sourceSha256 !== EXPECTED_PARENT_SHA256) throw new Error('v1.5.1 parent artifact hash mismatch');
if (addendumSha256 !== EXPECTED_ADDENDUM_SHA256) throw new Error('A3 sidecar hash mismatch');

const source = JSON.parse(sourceBytes.toString('utf8'));
const addendum = JSON.parse(addendumBytes.toString('utf8'));
if (source.revision !== 'v1.5.1' || source.status !== 'released') throw new Error('Expected released v1.5.1 parent');
if (source.n_ranked !== 98 || source.roster_count !== 103) throw new Error('Unexpected v1.5.1 parent counts');
if (addendum.schema !== 'jevbench-v15-addendum-rows-1') throw new Error('Unexpected A3 sidecar schema');
if (addendum.source_a3_aggregate_sha256 !== '424be19ec82f8f784fc264955ae0e4a76dbfb1b71486a21741b91c450c747c8c' ||
    addendum.source_a3_protocol_sha256 !== '369d916b4ba00e48e6bc4669c7d05feaa9614554887ec9a3c721c231ed734648' ||
    addendum.source_merged_aggregate_sha256 !== 'f4c0a2d74018d49f115eea6b2cee88b7a45dad6e4524e3a34de8565ca05692ff' ||
    addendum.source_v15_projection_sha256 !== 'b82e79de420380f23e15c13b98a2749bcbe8d3249ec35af5dd857468ab8d785e' ||
    addendum.independent_numeric_comparison_sha256 !== 'c87301cd91e27d796775f51b8c5f7947294c1812b31b4211d78e5a81472cc080') {
  throw new Error('A3 source provenance hash mismatch');
}

const rows = addendum.rows;
const actualKeys = Array.isArray(rows) ? rows.map((r) => r.key).sort() : [];
if (JSON.stringify(actualKeys) !== JSON.stringify(EXPECTED_ROWS)) throw new Error('Unexpected A3 row set');
const artifact = structuredClone(source);
artifact.revision = 'v1.5.2';
artifact.parent_release = { revision: source.revision, sha256: sourceSha256 };
artifact.addendum_sources_sha256 = {
  A3_aggregate: addendum.source_a3_aggregate_sha256,
  A3_protocol: addendum.source_a3_protocol_sha256,
  merged_aggregate: addendum.source_merged_aggregate_sha256,
  projected_rows: addendumSha256,
  independent_numeric_comparison: addendum.independent_numeric_comparison_sha256,
};
artifact.revision_note = 'Nemotron Diffusion 8B joins the official A/B/C rankings as a complete A3 roster-addendum system. Existing scores and intervals are unchanged; ranks are recalculated against v1.5.1. Wity-1 is held pending production-build identity confirmation and a clean rerun. The method and frozen v1.5.0 G_med are unchanged.';
artifact.paired_comparison_note = 'No new paired-bootstrap comparisons were computed for A3 addendum systems. Existing tie markers are retained only for previously marked adjacent pairs that remain adjacent in this revision; missing markers do not imply a tie or a separation.';

const byKey = new Map(artifact.systems.map((row) => [row.key, row]));
for (const candidate of rows) {
  if (byKey.has(candidate.key)) throw new Error(`A3 key already exists in v1.5.1: ${candidate.key}`);
  if (candidate.listing !== 'addendum' || candidate.addendum?.id !== 'A3' || candidate.addendum?.release !== 'v1.5') {
    throw new Error(`Expected a projected A3 addendum row: ${candidate.key}`);
  }
  if (candidate.status?.status !== 'complete' || candidate.status.rows !== artifact.sample.total ||
      candidate.status.missing !== 0 || candidate.status.answered_ok !== artifact.sample.total || candidate.full_coverage !== true) {
    throw new Error(`A3 row is not complete: ${candidate.key}`);
  }
  const apiExpected = candidate.key === 'wity-1';
  if (candidate.api_flag !== apiExpected || (apiExpected && candidate.api_exposure_note !== "API measurement: the operator's endpoint received sealed item text, without answers.") ||
      (!apiExpected && candidate.api_exposure_note != null)) throw new Error(`A3 API exposure disclosure mismatch: ${candidate.key}`);
  if (!(candidate.cost?.usd_per_1000 > 0) || OPTIONS.some((o) => !Number.isFinite(candidate.scores?.[o])) ||
      Object.values(candidate.axes ?? {}).some((v) => !Number.isFinite(v))) {
    throw new Error(`A3 row is missing a price or score axis: ${candidate.key}`);
  }
  if (candidate.addendum.id !== 'A3' || candidate.jevbench_score !== candidate.scores.A) throw new Error(`A3 row headline mismatch: ${candidate.key}`);
  candidate.listing = 'ranked';
  candidate.ranked = true;
  candidate.not_ranked_because = null;
  delete candidate.would_place_A;
  delete candidate.would_place_B;
  candidate.ranks = { A: null, B: null, C: null };
  candidate.rank = null;
  artifact.systems.push(candidate);
  byKey.set(candidate.key, candidate);
}

for (const option of OPTIONS) {
  const oldOrder = source.board[option].order;
  const oldPosition = new Map(oldOrder.map((key, index) => [key, index]));
  const order = artifact.systems.filter((row) => row.listing === 'ranked').map((row) => row.key).sort((a, b) => {
    const scoreDifference = byKey.get(b).scores[option] - byKey.get(a).scores[option];
    return scoreDifference || (oldPosition.get(a) ?? Number.MAX_SAFE_INTEGER) - (oldPosition.get(b) ?? Number.MAX_SAFE_INTEGER) || a.localeCompare(b);
  });
  const ranks = new Map(order.map((key, index) => [key, index + 1]));
  for (const row of artifact.systems.filter((system) => system.listing === 'ranked')) {
    row.ranks[option] = ranks.get(row.key);
    if (option === 'A') row.rank = ranks.get(row.key);
  }
  const adjacent = new Set(order.slice(1).map((key, index) => `${order[index]}\u0000${key}`));
  artifact.board[option].order = order;
  artifact.board[option].markers = (source.board[option].markers ?? [])
    .filter((marker) => adjacent.has(`${marker.upper}\u0000${marker.lower}`));
}

artifact.n_ranked = artifact.systems.filter((row) => row.listing === 'ranked').length;
artifact.roster_count = artifact.systems.length + artifact.not_measured.length;
if (artifact.n_ranked !== 99 || artifact.roster_count !== 104 || artifact.systems.length !== 101) {
  throw new Error(`Unexpected v1.5.2 counts: ranked=${artifact.n_ranked}, systems=${artifact.systems.length}, roster=${artifact.roster_count}`);
}
for (const option of OPTIONS) {
  const order = artifact.board[option].order;
  const top = source.board[option].order.slice(0, 5);
  if (JSON.stringify(order.slice(0, 5)) !== JSON.stringify(top)) throw new Error(`Top-five change under ${option} requires preview review`);
}

await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`);
const outputSha256 = createHash('sha256').update(await readFile(outputPath)).digest('hex');
process.stdout.write(JSON.stringify({
  outputPath, outputSha256, parentSha256: sourceSha256, addendumSha256,
  nRanked: artifact.n_ranked, rosterCount: artifact.roster_count,
  topFive: Object.fromEntries(OPTIONS.map((option) => [option, artifact.board[option].order.slice(0, 5)])),
  addedRanks: Object.fromEntries(EXPECTED_ROWS.map((key) => [key, byKey.get(key).ranks])),
}, null, 2) + '\n');
