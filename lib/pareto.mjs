/**
 * Return the nondominated points for a chart that minimizes x (cost) and
 * maximizes y (capability). Exact ties are all retained: neither identical
 * point strictly dominates the other. The output order is deterministic and
 * follows increasing cost, which Recharts can connect on either a normal or a
 * reversed x-axis.
 */
export function paretoFrontier(points) {
  return points
    .filter((point, index) => !points.some((other, otherIndex) =>
      otherIndex !== index
      && other.x <= point.x
      && other.y >= point.y
      && (other.x < point.x || other.y > point.y)))
    .sort((a, b) => a.x - b.x || b.y - a.y || String(a.id ?? "").localeCompare(String(b.id ?? "")));
}
