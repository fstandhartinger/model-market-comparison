import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { readJevbenchV157Release } from './jevbench-v15-release.mjs';
export const HISTORICAL_SUPPLEMENT_PATH = 'data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5-supplement.json';
export const HISTORICAL_APPROVAL_PATH = 'docs/releases/CR-338-GO-16723.json';
export async function readHistoricalJevbenchSupplement(root = process.cwd()) {
  const [bytes, approvalBytes] = await Promise.all([
    readFile(`${root}/${HISTORICAL_SUPPLEMENT_PATH}`),
    readFile(`${root}/${HISTORICAL_APPROVAL_PATH}`),
  ]);
  const artifact = JSON.parse(bytes);
  const approval = JSON.parse(approvalBytes);
  const parent = await readJevbenchV157Release(root);
  if (artifact.parent.sha256 !== parent.sha256 || artifact.G_med !== parent.artifact.G_med) throw new Error('Historical JevBench supplement basis differs');
  if (approval.release !== 'CR-338' || approval.approval?.choice !== 'Ja, alle' || approval.approval?.card_id !== 16723
    || approval.approval?.received_at_utc !== '2026-10-08T08:12:31Z') throw new Error('Historical top-five change lacks the recorded GO');
  const approvedCurrent = ['bobcat-flash-1.2', 'decider-12b', 'decider-12b-v1', 'decisio-gemma-4-31b-v080', 'mercury-decide', 'rene-1-31b-fp8', 'spx-cd-flash', 'spx-cd-pro'];
  const approvedHistorical = ['xor-26b-a4b-nvfp4', 'wald-q4b-v11'];
  if (JSON.stringify([...approval.approved_rows.current_v1_6_1].sort()) !== JSON.stringify(approvedCurrent.sort())
    || JSON.stringify([...approval.approved_rows.historical_v1_5_supplement].sort()) !== JSON.stringify(approvedHistorical.sort())) {
    throw new Error('Recorded GO scope differs from CR-338');
  }
  const heldHistorical = artifact.systems.map((row) => row.key).filter((key) => approvedHistorical.includes(key)).sort();
  if (JSON.stringify(heldHistorical) !== JSON.stringify([...approvedHistorical].sort()) || artifact.held_keys?.length) {
    throw new Error('Historical supplement does not contain exactly the approved held rows');
  }
  const approvedOrders = approval.ranking_orders?.historical;
  if (approvedOrders?.parent_revision !== 'v1.5.7' || approvedOrders?.parent_sha256 !== parent.sha256) throw new Error('Historical approval preview uses a different parent release');
  const ranked = parent.artifact.systems.filter((row) => row.ranked);
  for (const option of ['A', 'B', 'C']) {
    const old = parent.artifact.board[option].order.slice(0, 5);
    const order = [...ranked, ...artifact.systems].sort((a, b) => b.scores[option] - a.scores[option] || a.key.localeCompare(b.key)).slice(0, 5).map((row) => row.key);
    if (JSON.stringify(approvedOrders.before?.[option]) !== JSON.stringify(old)
      || JSON.stringify(approvedOrders.after?.[option]) !== JSON.stringify(order)
      || JSON.stringify(artifact.ranking_gate[option]) !== JSON.stringify({ before: old, after: order })) {
      throw new Error(`Historical ${option} order differs from the explicit GO receipt`);
    }
  }
  const reference = parent.artifact.systems.find(row => row.key === 'jev-1.13.0');
  const caps = { cost_usd_per_1000: 2 * reference.cost.usd_per_1000, median_seconds: 2 * reference.speed.p50_s_adjusted, reference: 'jev-1.13.0' };
  const capabilityTopFive = rows => rows.filter(row => {
    const cost = row.cost_usd_per_1000 ?? row.cost?.usd_per_1000;
    const latency = row.latency?.p50_adj ?? row.speed?.p50_s_adjusted;
    return Number.isFinite(cost) && Number.isFinite(latency) && cost <= caps.cost_usd_per_1000 && latency <= caps.median_seconds;
  }).sort((a, b) => ((b.axes.intelligence + b.axes.calibration) - (a.axes.intelligence + a.axes.calibration)) / 2 || a.key.localeCompare(b.key)).slice(0, 5).map(row => row.key);
  const before = capabilityTopFive(ranked);
  const after = capabilityTopFive([...ranked, ...artifact.systems]);
  if (JSON.stringify(approvedOrders.before?.capability) !== JSON.stringify(before)
    || JSON.stringify(approvedOrders.after?.capability) !== JSON.stringify(after)) {
    throw new Error('Historical Capability order differs from the explicit GO receipt');
  }
  if (JSON.stringify(artifact.ranking_gate.capability) !== JSON.stringify({ before, after, caps })) throw new Error('Historical Capability gate receipt differs');
  return { artifact, bytes, sha256: createHash('sha256').update(bytes).digest('hex') };
}
