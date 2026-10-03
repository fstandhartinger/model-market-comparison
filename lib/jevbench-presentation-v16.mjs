/** Presentation of ALREADY projected public aggregates, never artifact admission.
 * No loader, IO, score reconstruction, price substitution or Speed fallback.
 * Parent authenticates all projection sources before giving it to a release. */
const need = ok => { if (!ok) throw new Error('v1.6 presentation requires an admitted projection contract.'); };
const finite = x => typeof x === 'number' && Number.isFinite(x);
const known = x => finite(x) && x >= 0;
const hash = x => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x);
const factor = x => x === Infinity || finite(x) && x >= 1 && x <= 10;
export function v16CapView(projection, caps = { costFactor: 2, latencyFactor: 2 }, { allowFixture = false } = {}) {
  need(projection?.revision === 'v1.6.0' && typeof projection.fixture === 'boolean' && (!projection.fixture || allowFixture));
  need(Array.isArray(projection.rows) && projection.rows.length === 116 && projection.catalogue_count === 116);
  need(factor(caps.costFactor) && factor(caps.latencyFactor));
  const ref = projection.reference;
  need(ref && known(ref.usd_per_1000) && ref.usd_per_1000 > 0 && known(ref.p50_s_adjusted) && ref.p50_s_adjusted > 0 && ref.cost_factor === 2 && ref.latency_factor === 2);
  need(known(ref.usd_per_1000 * 10) && known(ref.p50_s_adjusted * 10));
  const costLimit = caps.costFactor === Infinity ? Infinity : ref.usd_per_1000 * caps.costFactor;
  const latencyLimit = caps.latencyFactor === Infinity ? Infinity : ref.p50_s_adjusted * caps.latencyFactor;
  const keys = new Set();
  const rows = projection.rows.map(row => {
    need(row && typeof row.key === 'string' && !keys.has(row.key) && typeof row.display === 'string'); keys.add(row.key);
    need(typeof row.ranked === 'boolean' && row.cost && typeof row.cost.cost_rank_eligible === 'boolean');
    const cost = known(row.cost.usd_per_1000) ? row.cost.usd_per_1000 : null;
    const median = known(row.speed?.p50_s_adjusted) && Number.isSafeInteger(row.speed?.n) && row.speed.n > 0 ? row.speed.p50_s_adjusted : null;
    const capable = finite(row.capability);
    const admission = row.cost.cost_rank_eligible && row.cost.kind !== 'unpriced' && hash(row.cost.admission_sha256);
    const reasons = [];
    if (!row.ranked) reasons.push('Not ranked in the bound final measurement.');
    if (!capable) reasons.push('Capability unavailable.');
    if (!admission) reasons.push('Cost is not admitted for capped rankings.');
    if (cost === null) reasons.push('Current cost unavailable.'); else if (cost > costLimit) reasons.push('Outside the selected cost cap.');
    if (median === null) reasons.push('Measured adjusted median unavailable.'); else if (median > latencyLimit) reasons.push('Outside the selected median latency cap.');
    return { row, cost, median, costRatio: cost === null ? null : cost / ref.usd_per_1000,
      latencyRatio: median === null ? null : median / ref.p50_s_adjusted, eligible: reasons.length === 0, reasons };
  });
  const order = (a,b) => (b.row.capability ?? -Infinity) - (a.row.capability ?? -Infinity) || a.row.key.localeCompare(b.row.key);
  const eligible = rows.filter(r => r.eligible).sort(order), outside = rows.filter(r => !r.eligible).sort(order);
  return { official: caps.costFactor === 2 && caps.latencyFactor === 2, caps: { ...caps }, reference: ref,
    limits: { cost: costLimit, latency: latencyLimit }, eligible, outside, rows };
}
export const v16TrafficZone = (ratio, cap) => !known(ratio) ? 'unknown' : ratio <= 1 ? 'green' : ratio <= cap ? 'amber' : 'red';
export function v16MeasuredLabel(row) {
  const m = row.measurement;
  if (!m) return 'No current bound measurement';
  const day = m.measured_on === null ? 'date unknown' : m.measured_on;
  return `${m.status === 'carry' ? 'Carried' : 'Measured'} ${day} · ${m.measurement_revision} · method ${m.method_version}`;
}
