// Florian 25 Sep 2026: weight sliders on the composite chart. The official JevBench score is the equal-weight case of
// this function; other weights give an unofficial reading of the same measured axes. No Node imports: the client uses it.

export const JEV_AXES = ['intelligence', 'calibration', 'speed', 'cost'];
export const OFFICIAL_WEIGHTS = { intelligence: 25, calibration: 25, speed: 25, cost: 25 };
// Axes whose value below 50 multiplies the score by (axis / 50)^2 (v1.4 gates). A gate applies only while its axis has weight.
const GATED = ['intelligence', 'speed', 'cost'];

export const isOfficialWeights = (w) => {
  const total = JEV_AXES.reduce((sum, axis) => sum + (w[axis] ?? 0), 0);
  return total > 0 && JEV_AXES.every((axis) => Math.abs((w[axis] ?? 0) / total - 0.25) < 1e-9);
};

/** Weighted harmonic mean (power mean p = -1) of the weighted axes, with the v1.4 low-axis gates. */
export function weightedJevScore(axes, weights) {
  const used = JEV_AXES.filter((axis) => (weights[axis] ?? 0) > 0);
  if (!used.length) return null;
  const values = used.map((axis) => axes?.[axis]);
  if (values.some((value) => !Number.isFinite(value))) return null;
  if (values.some((value) => value <= 0)) return 0;
  const total = used.reduce((sum, axis) => sum + weights[axis], 0);
  let score = total / used.reduce((sum, axis, i) => sum + weights[axis] / values[i], 0);
  for (const axis of GATED) if (used.includes(axis) && axes[axis] < 50) score *= (axes[axis] / 50) ** 2;
  return score;
}

/** CR-256 (Florian 1 Oct 2026: "why is the custom-weight order not the Intelligence order?"): the low-axis gates are
 *  a factor outside the sliders, so the board names them. Returns every gate that fires for these axes and weights —
 *  `gatesAlways` mirrors the v1.5 scorer, whose gates apply even to an axis at weight 0 — plus their product and the
 *  score before the gates (the weighted harmonic mean of the weighted axes alone). */
export function jevGatePenalties(axes, weights, { gatesAlways = false } = {}) {
  const used = JEV_AXES.filter((axis) => (weights?.[axis] ?? 0) > 0);
  const gates = [];
  for (const axis of GATED) {
    const value = axes?.[axis];
    if (!Number.isFinite(value) || value >= 50 || (!gatesAlways && !used.includes(axis))) continue;
    gates.push({ axis, value, factor: (Math.max(0, value) / 50) ** 2, weighted: used.includes(axis) });
  }
  const values = used.map((axis) => axes?.[axis]);
  const total = used.reduce((sum, axis) => sum + weights[axis], 0);
  const ungated = !used.length || values.some((v) => !Number.isFinite(v)) ? null
    : values.some((v) => v <= 0) ? 0 : total / used.reduce((sum, axis, i) => sum + weights[axis] / values[i], 0);
  return { gates, factor: gates.reduce((p, g) => p * g.factor, 1), ungated };
}
