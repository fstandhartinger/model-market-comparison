import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const root = process.cwd();
const sourcePath = `${root}/data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.0-results.json`;
const outputPath = `${root}/data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.1-results.json`;
const sourceBytes = await readFile(sourcePath);
const source = JSON.parse(sourceBytes.toString('utf8'));
const sourceSha256 = createHash('sha256').update(sourceBytes).digest('hex');

const expectedAddenda = [
  'autojev-27b',
  'autojev-27b-rtxpro6000-a2',
  'decision-4b-v11',
  'decision-4b-v12',
  'eikos-27b',
  'imajev-4b-rtx5090-a2',
  'jevk5-v0.3-4b',
  'plumb-4b',
  'surogate-rune-26b-a4b-v3-rtxpro6000-a2',
].sort();

if (source.revision !== 'v1.5.0' || source.status !== 'released') throw new Error('Expected the released v1.5.0 source artifact');
if (source.systems.filter((row) => row.listing === 'ranked').length !== 89) throw new Error('Unexpected frozen v1.5.0 ranked count');

const actualAddenda = source.systems.filter((row) => row.listing === 'addendum');
const actualKeys = actualAddenda.map((row) => row.key).sort();
if (JSON.stringify(actualKeys) !== JSON.stringify(expectedAddenda)) throw new Error(`Unexpected addendum roster: ${actualKeys.join(', ')}`);

const artifact = structuredClone(source);
artifact.revision = 'v1.5.1';
artifact.parent_release = { revision: source.revision, sha256: sourceSha256 };
artifact.revision_note = 'All nine A1/A2 addendum systems with complete 1,624-row coverage receive official ranks. Scores, intervals, method, pricing rules, and the frozen v1.5.0 G_med are unchanged.';
artifact.paired_comparison_note = 'No new paired-bootstrap comparisons were computed for addendum systems. Tie markers are retained only for frozen base-system pairs that remain adjacent in the revised score order; missing markers do not imply a tie or a separation.';

for (const row of artifact.systems.filter((system) => system.listing === 'addendum')) {
  if (row.status?.status !== 'complete' || row.status.rows !== artifact.sample.total || row.status.missing !== 0 || row.full_coverage !== true) {
    throw new Error(`Addendum row is not full-coverage: ${row.key}`);
  }
  if (!row.cost?.usd_per_1000 || Object.values(row.axes ?? {}).some((value) => !Number.isFinite(value))) {
    throw new Error(`Addendum row is missing a priced score axis: ${row.key}`);
  }
  row.listing = 'ranked';
  row.ranked = true;
  row.not_ranked_because = null;
  delete row.would_place_A;
  delete row.would_place_B;
}

const byKey = new Map(artifact.systems.map((row) => [row.key, row]));
for (const option of ['A', 'B', 'C']) {
  const oldOrder = source.board[option].order;
  const oldPosition = new Map(oldOrder.map((key, index) => [key, index]));
  const order = artifact.systems
    .filter((row) => row.listing === 'ranked')
    .map((row) => row.key)
    .sort((a, b) => {
      const scoreDifference = byKey.get(b).scores[option] - byKey.get(a).scores[option];
      return scoreDifference || (oldPosition.get(a) ?? Number.MAX_SAFE_INTEGER) - (oldPosition.get(b) ?? Number.MAX_SAFE_INTEGER) || a.localeCompare(b);
    });
  const ranks = new Map(order.map((key, index) => [key, index + 1]));
  for (const row of artifact.systems.filter((system) => system.listing === 'ranked')) {
    row.ranks[option] = ranks.get(row.key);
    if (option === 'A') row.rank = ranks.get(row.key);
  }

  const adjacent = new Set(order.slice(1).map((key, index) => `${order[index]}\u0000${key}`));
  const priorMarkers = source.board[option].markers ?? [];
  artifact.board[option].order = order;
  artifact.board[option].markers = priorMarkers.filter((marker) => adjacent.has(`${marker.upper}\u0000${marker.lower}`));
}

artifact.n_ranked = artifact.systems.filter((row) => row.listing === 'ranked').length;
if (artifact.n_ranked !== 98) throw new Error(`Expected 98 ranked rows, got ${artifact.n_ranked}`);

const mica = artifact.not_measured.find((row) => row.key === 'mica-v01-4b');
if (!mica) throw new Error('Mica addendum row is missing from not_measured');
mica.status = 'partial run';
mica.rows = 1088;
mica.missing = 536;
mica.reason = 'The frozen refusal policy stopped the run after 1,088 of 1,624 rows: 27 documented refusals were mapped to HTTP 422, then three consecutive passthrough HTTP 400 refusals triggered exit 6. The remaining 536 rows have no scores, so this system is not eligible for an official rank.';

await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`);
const outputSha256 = createHash('sha256').update(await readFile(outputPath)).digest('hex');
process.stdout.write(JSON.stringify({
  outputPath,
  sourceSha256,
  outputSha256,
  nRanked: artifact.n_ranked,
  topFive: Object.fromEntries(['A', 'B', 'C'].map((option) => [option, artifact.board[option].order.slice(0, 5)])),
  mica: { status: mica.status, rows: mica.rows, missing: mica.missing, reason: mica.reason },
}, null, 2) + '\n');
