// 2026-09-15: shared rules for the cost–capability (Pareto) chart and the Simple shortlist.
// Pure functions, so the axis direction, the highlighted quadrant, the label cap and the
// candidate selection are testable without React or Recharts.

/** Up to this many models enter Simple's overview table and its value map. */
export const SIMPLE_LIMIT = 30;
/** At most this many models are named on the chart; the rest stay reachable by tooltip and table. */
export const LABEL_LIMIT = 15;

/** CR-77.3 (Florian 2026-09-17): the green line accepts a grace band on the capability axis, so a model that is only
 *  marginally behind the frontier at its price is part of the line instead of being dropped over a difference nobody
 *  can see on the chart. The band is half a percent of the capability scale: 0.5 points on the 0–100 scores (Main
 *  Composite, AA indices), and — because Elo boards have no fixed scale — 0.5 % of the plotted range there. Measured
 *  on the live homepage pool of 17 Sep 2026: the line gains exactly one model (Claude Fable 5.1, 0.13 points behind
 *  GPT-6 Astra at a higher price) at every band from 0.13 up to 2.0 points, so 0.5 keeps the line's shape while
 *  leaving room for the daily data to move. */
/** One wording for the tolerance, so the caption, the chart tooltip and /about can never describe it differently. */
export const FRONTIER_GRACE_NOTE = 'The green line joins the models no cheaper model is ahead of by half a point of capability or more (0.5 % of the score scale; on Elo boards, which have no fixed scale, 0.5 % of the plotted range), so a model only marginally behind the leader at its price stays on the line.';
export const FRONTIER_GRACE_RATIO = 0.005;
export const FRONTIER_GRACE_SCALE = 100;
export function frontierGrace(values, { elo = false } = {}) {
  if (!elo) return FRONTIER_GRACE_SCALE * FRONTIER_GRACE_RATIO;
  const ys = (values ?? []).filter(finite);
  if (ys.length < 2) return 0;
  const span = Math.max(...ys) - Math.min(...ys);
  return span > 0 ? span * FRONTIER_GRACE_RATIO : 0;
}

/** Capability rises upward; cost is plotted reversed, so cheaper sits to the right and the most
 *  attractive region (high capability, low cost) is the top-right quadrant. */
export const COST_AXIS = Object.freeze({ reversed: true, cheaper: 'right', capability: 'up' });

/** One caption for the cost axis, so a label can never point the other way than the axis. */
export function costAxisCaption(unit) {
  return `← more expensive  ·  cheaper →${unit ? ` (${unit})` : ''}`;
}

/** The top-right quarter of the plot area, in SVG pixels. */
export function attractiveQuadrant(offset) {
  if (!offset || !(offset.width > 0) || !(offset.height > 0)) return null;
  return { x: offset.left + offset.width / 2, y: offset.top, width: offset.width / 2, height: offset.height / 2 };
}

export const QUADRANT_NOTE = 'Most attractive quadrant';

/** Where the quadrant note sits: right-aligned in the top margin, just above the plot, so it never
 *  covers a point, the frontier line or the axes. Point labels treat this box as taken. */
export function annotationBox(offset, fontSize = 10) {
  if (!offset || !(offset.width > 0)) return null;
  const width = QUADRANT_NOTE.length * fontSize * 0.56, right = offset.left + offset.width - 2;
  const baseline = offset.top - 8;
  return { l: right - width, t: baseline - fontSize, r: right, b: baseline + 2, x: right, y: baseline };
}

/** Label priority: Pareto members first, then passing points by score; never more than `max`. */
export function labelCandidates(points, frontier, max = LABEL_LIMIT) {
  return [...points]
    .sort((a, b) => Number(frontier.has(b.id)) - Number(frontier.has(a.id)) || b.y - a.y || String(a.id).localeCompare(String(b.id)))
    .slice(0, Math.max(0, max));
}

/** F-17 greedy, collision-free point labels, capped at LABEL_LIMIT names. `labels` arrive in priority
 *  order with pixel positions (cx, cy). Each tries right of its dot, then above, below and left, then
 *  the four corner-aligned variants (F-67); a label that would leave the plot, overlap a placed label
 *  or the quadrant note, or cover another dot is dropped and the dot stays. `headroom` lets a label
 *  use the chart's top margin. On a narrow plot (phones) only frontier members are named. */
export function placeLabels({ labels, dots, offset: o, frontier, headroom = 0, max = LABEL_LIMIT }) {
  const narrow = o.width < 400;
  const LINE = 12, GLYPH = 6;
  const note = annotationBox(o);
  const placed = note ? [note] : [];
  const out = [];
  for (const p of labels) {
    if (out.length >= max) break;
    if (narrow && !frontier.has(p.id)) continue;
    const text = p.name.length > 22 ? `${p.name.slice(0, 21)}…` : p.name;
    if (!text) continue;
    const { cx, cy } = p, w = text.length * GLYPH;
    const slots = [
      { l: cx + 8, t: cy - LINE / 2 }, { l: cx - w / 2, t: cy - 8 - LINE }, { l: cx - w / 2, t: cy + 8 }, { l: cx - 8 - w, t: cy - LINE / 2 },
      { l: cx - w, t: cy - 8 - LINE }, { l: cx, t: cy - 8 - LINE }, { l: cx - w, t: cy + 8 }, { l: cx, t: cy + 8 },
    ];
    const top = o.top - headroom;
    const slot = slots.find(({ l, t }) => {
      const r = l + w, b = t + LINE;
      if (l < o.left || r > o.left + o.width || t < top || b > o.top + o.height) return false;
      if (placed.some((q) => l < q.r && q.l < r && t < q.b && q.t < b)) return false;
      return !dots.some((d) => !(Math.abs(d.cx - cx) < 0.5 && Math.abs(d.cy - cy) < 0.5) && d.cx > l - 4 && d.cx < r + 4 && d.cy > t - 4 && d.cy < b + 4);
    });
    if (!slot) continue;
    placed.push({ l: slot.l, t: slot.t, r: slot.l + w, b: slot.t + LINE });
    out.push({ key: p.id, x: slot.l, y: slot.t + LINE - 2, text });
  }
  return out;
}

const finite = (v) => typeof v === 'number' && Number.isFinite(v);

/** Which model families the Simple table and map consider, replacing the internal Featured
 *  shortlist there. Families are ranked the way Featured is derived: by the best AA Intelligence
 *  Index across their variants. Families without any AA Intelligence result follow, ranked by
 *  their best Epoch ECI — the two scales are never mixed into one number, and a family with
 *  neither index is not a candidate. The caller passes the pool its filters already allow, so
 *  a user's own choices (e.g. showing deprecated families) are respected, not re-applied here. */
export function expandedCandidateFamilies(models, n = SIMPLE_LIMIT) {
  const aa = new Map(), eci = new Map();
  for (const m of models) {
    const a = m.scores?.aa_intelligence_index, e = m.scores?.epoch_eci;
    if (finite(a) && !(aa.get(m.family_key) >= a)) aa.set(m.family_key, a);
    if (finite(e) && !(eci.get(m.family_key) >= e)) eci.set(m.family_key, e);
  }
  const byValue = (map) => [...map.entries()].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0])).map(([k]) => k);
  const ranked = [...byValue(aa), ...byValue(new Map([...eci].filter(([k]) => !aa.has(k))))];
  return ranked.slice(0, Math.max(0, n));
}

/** Simple's candidate step: out of `items` (already narrowed by every user filter), keep the rows of
 *  the top `n` families, best-ranked first, and never more than `n` rows. Nothing outside `items` can
 *  enter, so user-selected filters and scope settings are preserved by construction. */
export function topCandidates(items, modelOf, n = SIMPLE_LIMIT) {
  const rank = new Map(expandedCandidateFamilies(items.map(modelOf), n).map((k, i) => [k, i]));
  const aaOf = (item) => { const v = modelOf(item).scores?.aa_intelligence_index; return finite(v) ? v : -Infinity; };
  return items.filter((item) => rank.has(modelOf(item).family_key))
    .sort((a, b) => rank.get(modelOf(a).family_key) - rank.get(modelOf(b).family_key) || aaOf(b) - aaOf(a) || String(modelOf(a).id).localeCompare(String(modelOf(b).id)))
    .slice(0, Math.max(0, n));
}

/** CR-18 (Florian 2026-09-15): the floor Simple's minimum-score slider defaults to while untouched.
 *  Derived from the points Simple's value map plots BEFORE the score cut (so the pool never changes
 *  with the default): the cheapest point with a positive cost — the rightmost on the reversed axis;
 *  among equally cheap points the highest score — is kept on the green Pareto line by rounding its
 *  score down to the slider step. Never below `floor` (65 for the Composite, per Florian). Returns null
 *  when nothing is plottable or the score is an Elo board, so the caller keeps its fixed default. */
export const DERIVED_MIN_SCORE_FLOOR = 65;
export function derivedMinScore(points, { score = 'composite', step = 1, floor } = {}) {
  if (String(score).startsWith('designarena')) return null;
  let best = null;
  for (const p of points ?? []) {
    if (!finite(p?.x) || !finite(p?.y) || p.x <= 0) continue;
    if (!best || p.x < best.x || (p.x === best.x && p.y > best.y)) best = p;
  }
  if (!best) return null;
  const s = step > 0 ? step : 1;
  return Math.max(floor ?? (score === 'composite' ? DERIVED_MIN_SCORE_FLOOR : 0), Math.floor(best.y / s + 1e-9) * s);
}

/** CR-29.1: the slider's two-line label names exactly the score the Benchmark Heaven Score row shows. */
export function minScoreLabel(score, shortLabel) {
  return { title: 'Minimum Capability Score', sub: score === 'composite' ? 'Benchmark Heaven Main Composite Score' : shortLabel };
}

/** CR-32.4 (Florian 2026-09-15): the value map's Y axis fits the plotted scores instead of always running to
 *  100. 0–100 scores: bottom = floor(min − 3) to the step, top = 100 only when the best score is >= 90, else
 *  the best score + 3 rounded up to the step. Elo-style boards (values far above 100) use 50/100-point steps
 *  and never touch 100. `full` forces the old 0–100 style top (cogwheel setting, CR-32.5). */
export function valueMapYDomain(values, { elo = false, full = false } = {}) {
  const ys = (values ?? []).filter(finite);
  if (!ys.length) return elo ? { domain: [1000, 1400], ticks: [1000, 1100, 1200, 1300, 1400] } : { domain: [80, 100], ticks: [80, 85, 90, 95, 100] };
  const min = Math.min(...ys), max = Math.max(...ys);
  if (elo) {
    const step = max - min > 300 ? 100 : 50;
    const lo = Math.floor((min - 10) / step) * step, hi = Math.ceil((max + 10) / step) * step;
    const ticks = []; for (let v = lo; v <= hi; v += step) ticks.push(v);
    return { domain: [lo, hi], ticks };
  }
  const bottom0 = Math.max(0, Math.min(min - 3, full ? 80 : min - 3));
  const topRaw = full || max >= 90 ? 100 : Math.min(100, max + 3);
  const step = topRaw - bottom0 > 25 ? 10 : 5;
  const lo = Math.floor(bottom0 / step) * step, hi = Math.min(100, Math.ceil(topRaw / step) * step);
  const ticks = []; for (let v = lo; v <= hi + 1e-9; v += step) ticks.push(v);
  return { domain: [lo, hi], ticks };
}

/** CR-32.1: the scores Simple's slider label can switch to (category composites join with CR-25.6). */
export const SIMPLE_SCORE_CHOICES = Object.freeze(['composite', 'aa_intelligence_index', 'aa_coding_index', 'aa_coding_agent', 'epoch_eci', 'epoch_eci_software', 'designarena_fullstack', 'designarena_frontend', 'cat_coding', 'cat_agentic', 'cat_science', 'cat_long_context']);

/** CR-32.2: the cost measures Simple's cost label can switch to, as settings patches over the existing price
 *  modes — so the cap slider, the table's cost column and the value map's X axis all follow one setting. */
export function costMeasureChoices(blends, currentWeight) {
  const values = new Set((blends ?? []).map((b) => b.value));
  const inputOnly = Math.max(...values);
  const blended = values.has(currentWeight) && currentWeight !== 0 && currentWeight !== inputOnly ? currentWeight : 20;
  return [
    { id: 'adjusted', label: 'Adjusted cost / task', unit: '$/task', patch: { priceMode: 'adjusted' } },
    { id: 'blended', label: `Blended price / 1M tokens (${blended}:1)`, unit: '$/1M', patch: { priceMode: 'raw', inputWeight: blended } },
    { id: 'input', label: 'Input price / 1M tokens', unit: '$/1M', patch: { priceMode: 'raw', inputWeight: inputOnly } },
    { id: 'output', label: 'Output price / 1M tokens', unit: '$/1M', patch: { priceMode: 'raw', inputWeight: 0 } },
  ];
}
export function activeCostMeasure(choices, priceMode, inputWeight) {
  if (priceMode === 'adjusted') return 'adjusted';
  const hit = choices.find((c) => c.patch.priceMode === 'raw' && c.patch.inputWeight === inputWeight && c.id !== 'blended');
  return hit ? hit.id : 'blended';
}
