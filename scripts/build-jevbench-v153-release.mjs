import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const root = process.cwd();
const sourcePath = `${root}/data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.2-results.json`;
const addendumPath = `${root}/data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.3-a4-addendum.json`;
const outputPath = `${root}/data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.3-results.json`;
const EXPECTED_PARENT_SHA256 = '01e1f0019ca3bd3b1183f5b701f069ba0c7bf52462d1103f88a03e01339c968b';
const EXPECTED_ADDENDUM_SHA256 = '8fdf3fee1644e0d1c0cee77dad7cebd2b834ecc88aa9dfc7be537e80c83b4de5';
const EXPECTED_ROWS = ['bev-bonsai-27b', 'bosun-v31-0.6b', 'deem-0.8-v1', 'evalengine-decision-4b', 'instinct-dual-4b', 'laya-multilingual', 'laya-typed-decisions'];
const OPTIONS = ['A', 'B', 'C'];

const sourceBytes = await readFile(sourcePath);
const addendumBytes = await readFile(addendumPath);
const sourceSha256 = createHash('sha256').update(sourceBytes).digest('hex');
const addendumSha256 = createHash('sha256').update(addendumBytes).digest('hex');
if (sourceSha256 !== EXPECTED_PARENT_SHA256) throw new Error('v1.5.2 parent artifact hash mismatch');
if (addendumSha256 !== EXPECTED_ADDENDUM_SHA256) throw new Error('A4 sidecar hash mismatch');

const source = JSON.parse(sourceBytes.toString('utf8'));
const addendum = JSON.parse(addendumBytes.toString('utf8'));
if (source.revision !== 'v1.5.2' || source.status !== 'released') throw new Error('Expected released v1.5.2 parent');
if (source.n_ranked !== 99 || source.roster_count !== 104) throw new Error('Unexpected v1.5.2 parent counts');
if (addendum.schema !== 'jevbench-v15-addendum-rows-1') throw new Error('Unexpected A4 sidecar schema');
if (addendum.independent_recompute_sha256 !== '0c3bde7cb7d457c074d9cf6b5c924f0dd2c2efb6f9067d0ba403c6f72848060e' || addendum.release_base_listing_adoption.absolute_delta !== 0) throw new Error('A4 release-side recomputation/adoption mismatch');

const rows = addendum.rows;
const actualKeys = Array.isArray(rows) ? rows.map((r) => r.key).sort() : [];
if (JSON.stringify(actualKeys) !== JSON.stringify(EXPECTED_ROWS)) throw new Error('Unexpected A4 row set');
const artifact = structuredClone(source);
artifact.revision = 'v1.5.3';
artifact.parent_release = { revision: source.revision, sha256: sourceSha256 };
artifact.addendum_sources_sha256 = { ...source.addendum_sources_sha256,
  A4_r27: addendum.source_aggregate_sha256.r27, A4_r30: addendum.source_aggregate_sha256.r30,
  A4_projected_rows: addendumSha256, A4_independent_recompute: addendum.independent_recompute_sha256 };
artifact.release_base_listing_adoption = addendum.release_base_listing_adoption;
artifact.revision_note = 'Six complete measured systems join the official A/B/C rankings; Eval Engine Decision-4B is PARTIAL / UNRANKED with no score or rank. Existing scores and intervals, method and frozen v1.5.0 G_med are unchanged. Shared-CPU and demo conditions and estimated prices are disclosed. Wity-1 remains held.';

artifact.paired_comparison_note = 'No new paired-bootstrap comparisons were computed for A4 addendum systems. Existing tie markers are retained only for previously marked adjacent pairs that remain adjacent in this revision; missing markers do not imply a tie or a separation.';

const byKey = new Map(artifact.systems.map((row) => [row.key, row]));
for (const candidate of rows) {
  if (byKey.has(candidate.key)) throw new Error(`A4 key already exists in v1.5.2: ${candidate.key}`);
  const complete = candidate.key !== 'evalengine-decision-4b';
  if (candidate.addendum?.id !== 'A4' || candidate.addendum?.release !== 'v1.5') throw new Error('Expected A4 row');
  if (candidate.status.rows !== artifact.sample.total || candidate.status.missing !== 0 ||
      candidate.status.answered_ok !== (complete ? 1624 : 1550) || candidate.full_coverage !== complete ||
      candidate.ranked !== complete || candidate.listing !== (complete ? 'ranked' : 'unranked')) throw new Error(`Coverage mismatch ${candidate.key}`);
  if (complete && (candidate.status.status !== 'complete' || OPTIONS.some((o) => !Number.isFinite(candidate.scores[o])))) throw new Error(`Incomplete ranked row ${candidate.key}`);
  if (!complete && (candidate.status.status !== 'partial' || candidate.jevbench_score !== null || Object.values(candidate.axes).some(v => v !== null) || OPTIONS.some(o => candidate.scores[o] !== null))) throw new Error('Partial must have no score or axes');
  if (candidate.api_flag !== (candidate.key === 'instinct-dual-4b')) throw new Error('API flag mismatch');

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
if (artifact.n_ranked !== 105 || artifact.roster_count !== 111 || artifact.systems.length !== 108) {
  throw new Error(`Unexpected v1.5.3 counts: ranked=${artifact.n_ranked}, systems=${artifact.systems.length}, roster=${artifact.roster_count}`);
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
