/** CR-290: x-axis domain of the capability bubble charts. A "no cap" selection is an Infinity limit: it draws no
 * line and must never enter the domain (Infinity there made the tick array length invalid and crashed the page). */
export function bubbleXDomain(kind, xs, costLimit, latencyLimit) {
  const values = xs.filter(Number.isFinite);
  if (kind === 'cost') {
    if (costLimit > 0 && Number.isFinite(costLimit)) values.push(Math.log10(costLimit));
    if (!values.length) return [-3, 0];
    return [Math.floor((Math.min(...values) - 0.1) * 2) / 2, Math.ceil((Math.max(...values) + 0.1) * 2) / 2];
  }
  if (latencyLimit != null && Number.isFinite(latencyLimit)) values.push(latencyLimit);
  if (!values.length) return [0, 100];
  return [Math.max(0, Math.floor((Math.min(...values) - 5) / 10) * 10), 100];
}
