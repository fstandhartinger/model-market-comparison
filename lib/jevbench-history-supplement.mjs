import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { readJevbenchV157Release } from './jevbench-v15-release.mjs';
export const HISTORICAL_SUPPLEMENT_PATH = 'data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5-supplement.json';
export async function readHistoricalJevbenchSupplement(root = process.cwd()) {
  const bytes = await readFile(`${root}/${HISTORICAL_SUPPLEMENT_PATH}`);
  const artifact = JSON.parse(bytes);
  const parent = await readJevbenchV157Release(root);
  if (artifact.parent.sha256 !== parent.sha256 || artifact.G_med !== parent.artifact.G_med) throw new Error('Historical JevBench supplement basis differs');
  for (const option of ['A', 'B', 'C']) {
    const old = parent.artifact.board[option].order.slice(0, 5);
    const order = [...parent.artifact.systems.filter(r => r.ranked), ...artifact.systems].sort((a, b) => b.scores[option] - a.scores[option] || a.key.localeCompare(b.key));
    if (JSON.stringify(order.slice(0, 5).map(r => r.key)) !== JSON.stringify(old)) throw new Error('Historical top-five change requires preview approval');
  }
  return { artifact, bytes, sha256: createHash('sha256').update(bytes).digest('hex') };
}
