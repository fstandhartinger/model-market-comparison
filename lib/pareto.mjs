/**
 * Return the nondominated points for a chart that minimizes x (cost) and
 * maximizes y (capability). Exact ties are all retained: neither identical
 * point strictly dominates the other. The output order is deterministic and
 * follows increasing cost, which Recharts can connect on either a normal or a
 * reversed x-axis.
 *
 * CR-77.3 (Florian 2026-09-17): `grace` widens the line by a tolerance on the capability axis — a point stays on the
 * frontier unless some point at the same cost or cheaper beats it by at least `grace`. With grace = 0 this is the
 * strict Pareto rule; with grace > 0 a model that is only marginally behind the frontier at its price (Claude Fable
 * 5.1, 0.13 points behind GPT-6 Astra) joins the line instead of being dropped over a difference nobody can see.
 * The caller decides the tolerance (lib/value-map.mjs: frontierGrace).
 */
export function paretoFrontier(points, { grace = 0 } = {}) {
  const band = Number.isFinite(grace) && grace > 0 ? grace : 0;
  const dominates = band > 0
    ? (other, point) => other.x <= point.x && other.y - point.y >= band
    : (other, point) => other.x <= point.x && other.y >= point.y && (other.x < point.x || other.y > point.y);
  return points
    .filter((point, index) => !points.some((other, otherIndex) => otherIndex !== index && dominates(other, point)))
    .sort((a, b) => a.x - b.x || b.y - a.y || String(a.id ?? "").localeCompare(String(b.id ?? "")));
}
