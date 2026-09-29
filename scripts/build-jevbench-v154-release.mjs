import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const dir = 'data/raw/benchmarks/jevbench/v1.5';
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const sourceBytes = await readFile(`${dir}/jevbench-v1.5.3-results.json`);
const addendumBytes = await readFile(`${dir}/jevbench-v1.5.4-a5-addendum.json`);
const parentHash = hash(sourceBytes);
if (parentHash !== '5c3d97440ebb1463133ce1049df78cf3fd829c5f735c053c92cf707e7b3f7b24') throw new Error('Frozen v1.5.3 parent hash mismatch');
if (hash(addendumBytes) !== '39c321ac95fcb226eae96e9df48383df0bd5ecad334a1f4c794a2d1cd2f6b4b3') throw new Error('A5 sidecar hash mismatch');
const source = JSON.parse(sourceBytes);
const side = JSON.parse(addendumBytes);
if (side.schema !== 'jevbench-v15-addendum-rows-1' || side.rows.length !== 1 ||
    side.independent_recompute_sha256 !== 'c3cf1fadaed043126363f7710bdf5dcfd2cb282dd4bd0624e2991ab94bb0565d' ||
    side.source_aggregate_sha256.P80 !== '8e200f0fae137913333458b51cb5f2ba9ea6bcfc98b1fba9f6ecfa79c9c72030') throw new Error('A5 source/review mismatch');
const candidate = side.rows[0];
const options = ['A', 'B', 'C'];
if (candidate.key !== 'manchego-v21-v15' || source.systems.some(r => r.key === candidate.key) ||
    candidate.addendum?.id !== 'A5' || candidate.status.status !== 'complete' || candidate.status.rows !== 1624 ||
    candidate.status.answered_ok !== 1624 || candidate.status.missing !== 0 || !candidate.full_coverage ||
    !candidate.ranked || candidate.listing !== 'ranked' || candidate.api_flag !== false ||
    options.some(o => !Number.isFinite(candidate.scores[o]))) throw new Error('A5 identity/coverage mismatch');
const artifact = structuredClone(source);
artifact.revision = 'v1.5.4';
artifact.parent_release = { revision: source.revision, sha256: parentHash };
artifact.addendum_sources_sha256 = { ...source.addendum_sources_sha256,
  A5_P80: side.source_aggregate_sha256.P80, A5_projected_rows: hash(addendumBytes),
  A5_independent_recompute: side.independent_recompute_sha256 };
artifact.revision_note = 'Manchego v2.1 joins the official A/B/C rankings after a complete 1,624-decision run and independent recomputation. Its development exposure, exact serving/model pins, evaluator-owned GPU conditions and estimated cost are disclosed. Existing scores, intervals, method and frozen v1.5.0 G_med are unchanged; all A/B/C top-five orders are unchanged. Eval Engine Decision-4B remains partial and unranked; Wity-1 remains held.';
artifact.paired_comparison_note = 'No new paired-bootstrap comparisons were computed for A5. Existing markers are retained only for previously marked pairs that remain adjacent; missing markers do not imply a tie or separation.';
artifact.systems.push(candidate);
const byKey = new Map(artifact.systems.map(row => [row.key, row]));
for (const option of options) {
  const oldOrder = source.board[option].order;
  const oldPosition = new Map(oldOrder.map((key, i) => [key, i]));
  const order = artifact.systems.filter(row => row.listing === 'ranked').map(row => row.key).sort((a, b) =>
    byKey.get(b).scores[option] - byKey.get(a).scores[option] ||
    (oldPosition.get(a) ?? Number.MAX_SAFE_INTEGER) - (oldPosition.get(b) ?? Number.MAX_SAFE_INTEGER) || a.localeCompare(b));
  if (JSON.stringify(order.slice(0, 5)) !== JSON.stringify(oldOrder.slice(0, 5))) throw new Error(`Top-five change in ${option} needs preview`);
  order.forEach((key, i) => { byKey.get(key).ranks[option] = i + 1; if (option === 'A') byKey.get(key).rank = i + 1; });
  const adjacent = new Set(order.slice(1).map((key, i) => `${order[i]}\u0000${key}`));
  artifact.board[option].order = order;
  artifact.board[option].markers = source.board[option].markers.filter(m => adjacent.has(`${m.upper}\u0000${m.lower}`));
}
artifact.n_ranked = artifact.systems.filter(row => row.listing === 'ranked').length;
artifact.roster_count = artifact.systems.length + artifact.not_measured.length;
if (artifact.n_ranked !== 106 || artifact.roster_count !== 112 || artifact.systems.length !== 109) throw new Error('Unexpected v1.5.4 counts');
const output = `${JSON.stringify(artifact, null, 2)}\n`;
await writeFile(`${dir}/jevbench-v1.5.4-results.json`, output);
console.log(JSON.stringify({ sha256: hash(output), parentHash, addendumHash: hash(addendumBytes), ranks: candidate.ranks,
  nRanked: artifact.n_ranked, rosterCount: artifact.roster_count,
  topFive: Object.fromEntries(options.map(o => [o, artifact.board[o].order.slice(0, 5)])) }, null, 2));
