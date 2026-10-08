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
  const reference = parent.artifact.systems.find(row => row.key === 'jev-1.13.0');
  const caps = { cost_usd_per_1000: 2 * reference.cost.usd_per_1000, median_seconds: 2 * reference.speed.p50_s_adjusted, reference: 'jev-1.13.0' };
  const capabilityTopFive = rows => rows.filter(row => {
    const cost = row.cost_usd_per_1000 ?? row.cost?.usd_per_1000;
    const latency = row.latency?.p50_adj ?? row.speed?.p50_s_adjusted;
    return Number.isFinite(cost) && Number.isFinite(latency) && cost <= caps.cost_usd_per_1000 && latency <= caps.median_seconds;
  }).sort((a, b) => ((b.axes.intelligence + b.axes.calibration) - (a.axes.intelligence + a.axes.calibration)) / 2 || a.key.localeCompare(b.key)).slice(0, 5).map(row => row.key);
  const ranked = parent.artifact.systems.filter(row => row.ranked);
  const before = capabilityTopFive(ranked);
  const after = capabilityTopFive([...ranked, ...artifact.systems]);
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('Historical Capability top-five change requires preview approval');
  if (JSON.stringify(artifact.ranking_gate.capability) !== JSON.stringify({ before, after, caps })) throw new Error('Historical Capability gate receipt differs');
  if (artifact.systems.some(row => ['xor-26b-a4b-nvfp4', 'wald-q4b-v11'].includes(row.key))) throw new Error('Historical held row requires preview approval');
  return { artifact, bytes, sha256: createHash('sha256').update(bytes).digest('hex') };
}
