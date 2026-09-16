// CR-15.1 (Florian 2026-09-15): mark models in the overview table that are notably cheap or expensive
// for their capability. Transparent and filter-aware: computed only over the rows the table shows.
//
// Method: fit log(cost) = a + b × score with a robust Theil–Sen line (b = median of all pairwise
// slopes, a = median of log(cost) − b × score) over the shown rows with a finite score and a positive
// cost, so one extreme model cannot tilt the line and flag its neighbours. A model is flagged when its
// cost is at least VALUE_RATIO times below
// (cheap) or above (pricey) the fitted cost for its score AND its residual is beyond VALUE_SPREADS
// robust standard deviations (1.4826 × MAD) of all residuals, so a table where every model is
// scattered widely does not flag a quarter of it. Fewer than VALUE_MIN_ROWS rows or no score
// spread: no flags.
//
// CR-42.1 (Florian 2026-09-16): two intensity levels. 'strong' is the rule above; 'weak' marks a model
// at least VALUE_WEAK_RATIO off the fitted cost and beyond VALUE_WEAK_SPREADS robust standard deviations,
// so the tags show a little more often without flagging the ordinary scatter.
// CR-46.1 (2026-09-16): the caller fits over a stable reference population (the table's models before the
// score floor, the cost cap and search narrow it), not over the rows left on screen — a narrowed table
// of a handful of models made the fit flag nothing.

export const VALUE_MIN_ROWS = 8;
export const VALUE_RATIO = 2;
export const VALUE_SPREADS = 1.5;
export const VALUE_WEAK_RATIO = 1.75;
export const VALUE_WEAK_SPREADS = 1;

const finite = (n) => typeof n === 'number' && Number.isFinite(n);
const median = (xs) => { const s = [...xs].sort((a, b) => a - b), m = s.length / 2; return s.length % 2 ? s[Math.floor(m)] : (s[m - 1] + s[m]) / 2; };

/** `rows`: { id, score, cost }[]. Returns Map id → { kind: 'cheap' | 'pricey', level: 'strong' | 'weak', ratio, expected, n }. */
export function valueSignals(rows) {
  const pts = rows.filter((r) => finite(r.score) && finite(r.cost) && r.cost > 0).map((r) => ({ id: r.id, x: r.score, y: Math.log(r.cost) }));
  const out = new Map();
  if (pts.length < VALUE_MIN_ROWS) return out;
  const slopes = [];
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
    if (pts[j].x !== pts[i].x) slopes.push((pts[j].y - pts[i].y) / (pts[j].x - pts[i].x));
  }
  if (!slopes.length) return out;
  const b = median(slopes), a = median(pts.map((p) => p.y - b * p.x));
  const residuals = pts.map((p) => p.y - (a + b * p.x));
  const spread = 1.4826 * median(residuals.map((r) => Math.abs(r - median(residuals))));
  const strong = Math.max(Math.log(VALUE_RATIO), VALUE_SPREADS * spread);
  const weak = Math.max(Math.log(VALUE_WEAK_RATIO), VALUE_WEAK_SPREADS * spread);
  pts.forEach((p, k) => {
    const r = residuals[k];
    if (Math.abs(r) < weak) return;
    out.set(p.id, { kind: r < 0 ? 'cheap' : 'pricey', level: Math.abs(r) >= strong ? 'strong' : 'weak', ratio: Math.exp(Math.abs(r)), expected: Math.exp(a + b * p.x), n: pts.length });
  });
  return out;
}
