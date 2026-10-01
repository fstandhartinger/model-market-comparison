import type { JevV14System } from '../lib/jevbench-v14.mjs';
import { jevClassRows, medianLatencySpeed, type JevClassOptions, type JevClassResult } from '../lib/jevbench-jev-class.mjs';
import { shortName } from './JevCapabilityChart';
import type { JevBubblePoint } from './JevBubbleChart';

export function jevClassView(systems: JevV14System[], options?: JevClassOptions): JevClassResult & { points: JevBubblePoint[] } {
  const result = jevClassRows(systems, options);
  let n = 0;
  const classRank = new Map<string, number>();
  for (const r of result.rows) if (r.inClass && r.row.ranked) classRank.set(r.row.key, ++n);
  const points: JevBubblePoint[] = result.rows.map((r) => ({
    key: r.row.key, name: shortName(r.row.display), cls: r.row.class, rank: r.row.rank, ranked: !!r.row.ranked,
    capability: r.capability, intelligence: r.row.axes?.intelligence ?? null, calibration: r.row.axes?.calibration ?? null,
    cost: r.cost, costKind: r.row.cost?.kind ?? 'unknown', speed: r.row.axes?.speed ?? null, latency: r.latency, medianSpeed: medianLatencySpeed(r.row), score: r.row.jevbench_score ?? null,
    inClass: r.inClass, classRank: classRank.get(r.row.key) ?? null, isReference: r.isReference, outsideBecause: r.inClass ? null : r.reasons.join(', '),
  }));
  return { ...result, points };
}
