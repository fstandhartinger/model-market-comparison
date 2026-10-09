// CR-290 radar correction (Florian 5 Oct 2026 ~20:30, correction to CR-290 item 6): how a partly measured series may be drawn on a radar.
// A complete series is a filled polygon. A series with values on at least half the spokes and a run of at least three
// adjacent spokes draws lines only along such runs. Anything sparser is drawn as points only: a line through two or
// three scattered points (Jev 1.13.0 on the use-case radar) reads as a shape and as a weak system, which it is not.
export const MIN_RUN = 3;
/** Florian 5 Oct 2026 ~20:30: a category is a radar spoke only when it is well measured — at least 30 items in the pool
 *  and at least 30 answered by the system. Under 30 a category score moves by ±25 points with a handful of items. */
export const RADAR_MIN_N = 30;

/** Indices (in order) of maximal runs of adjacent present spokes, wrapping around the circle. */
export function presentRuns(present) {
  const n = present.length;
  if (!n) return [];
  if (present.every(Boolean)) return [present.map((_, i) => i)];
  const start = present.findIndex((p) => !p);
  const runs = [];
  let run = [];
  for (let j = 1; j <= n; j++) {
    const i = (start + j) % n;
    if (present[i]) run.push(i);
    else { if (run.length) runs.push(run); run = []; }
  }
  if (run.length) runs.push(run);
  return runs;
}

/** 'polygon' | 'runs' | 'points' | 'none', and the runs to draw as lines (each run is a list of spoke indices). */
export function radarShape(present) {
  const n = present.length, count = present.filter(Boolean).length;
  if (!count) return { kind: 'none', runs: [] };
  if (count === n && n >= 3) return { kind: 'polygon', runs: [] };
  const runs = presentRuns(present).filter((r) => r.length >= MIN_RUN);
  return count * 2 >= n && runs.length ? { kind: 'runs', runs } : { kind: 'points', runs: [] };
}

// Radar display fix (lead job jevbench-radar-full-areas-20261009, 9 Oct 2026): one value rule and one label geometry for every
// radar that reuses components/JevRadars.tsx (JevBench boards, comparison pages, ImageJevBench, historical supplement).

/** A plottable number, or null. `null`, `undefined`, NaN, ±Infinity and non-numbers are missing values, never 0
 *  (Math.max(0, Math.min(100, null)) is 0 — that is how a missing cell used to become a zero vertex). A measured 0 stays 0. */
export function radarValue(v) {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/** Whether a spoke value is drawn as a marker / vertex: a finite value on a cell that is not under the per-spoke minimum. */
export function plottable(v, thin) {
  return !thin && radarValue(v) !== null;
}

/** Value domains a radar can draw on. The default is the legacy 0–100 scale (score axes, accuracy radars). The signed
 *  domain is for chance-corrected category competence radars only (lead job jevbench-radar-full-areas-20261009): it is fixed,
 *  never derived from the selected systems' values, so −100 is the centre, 0 is half the radius and 100 is the rim. */
export const RADAR_DEFAULT_DOMAIN = Object.freeze([0, 100]);
export const RADAR_SIGNED_DOMAIN = Object.freeze([-100, 100]);

function checkDomain(domain) {
  const [lo, hi] = domain ?? [];
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || !(lo < hi)) throw new Error('radar domain: need two finite numbers lo < hi');
  return [lo, hi];
}

/** Radius share (0–100) of a finite value on a linear domain (default 0–100). A value outside the domain sits at the centre or
 *  rim and keeps its printed number; callers must check `plottable` first — this never turns a missing value into a radius. */
export function radarRadius(v, domain = RADAR_DEFAULT_DOMAIN) {
  const x = radarValue(v);
  if (x === null) throw new Error('radarRadius: not a finite value');
  const [lo, hi] = checkDomain(domain);
  return Math.max(0, Math.min(100, ((x - lo) / (hi - lo)) * 100));
}

/** Grid for a domain: ring values (the rim last), the value drawn as the prominent zero ring (signed only) and the ring labels.
 *  Default: rings 20–100, labels 50 and 100 (unchanged). Signed: rings −50, 0, 50, 100; labels −100 (centre), 0 and 100. */
export function radarScale(domain = RADAR_DEFAULT_DOMAIN) {
  const [lo, hi] = checkDomain(domain);
  if (lo < 0 && hi > 0) return { signed: true, rings: [lo / 2, 0, hi / 2, hi], zero: 0, labels: [lo, 0, hi] };
  const step = (hi - lo) / 5;
  return { signed: false, rings: [1, 2, 3, 4, 5].map((i) => lo + step * i), zero: null, labels: [lo + (hi - lo) / 2, hi] };
}

/** Where a ring label sits (F-136): at the half-step between spoke 0 and spoke 1, on the ring polygon's apothem, 3 units inside
 *  the ring (never past the centre). `geo` = { cx, cy, R, n } in SVG units. */
export function ringLabelPoint(v, geo, domain = RADAR_DEFAULT_DOMAIN) {
  const { cx, cy, R, n } = geo;
  const a = -Math.PI / 2 + Math.PI / n;
  const d = Math.max(0, (R * radarRadius(v, domain) / 100) * Math.cos(Math.PI / n) - 3);
  return { x: cx + d * Math.cos(a), y: cy + d * Math.sin(a) };
}

/** A ring label's text; negative numbers use a true minus sign. */
export const ringLabelText = (v) => (v < 0 ? `\u2212${-v}` : String(v));

/** A category cell [competence, n, completed_n?] for one system on one spoke. The per-spoke rule stays RADAR_MIN_N answered
 *  (completed) items: under it the published value is kept for the table but is `thin`, printed as n=…, and not drawn.
 *  No cell → value null ('—'); a cell without a finite competence → value null ('n/a'); an unknown n is thin. */
export function categoryCell(cell, radarMinN = RADAR_MIN_N) {
  if (!Array.isArray(cell)) return { value: null, thin: false, n: null, text: '—' };
  const value = radarValue(cell[0]);
  const n = radarValue(cell[2] ?? cell[1]);
  if (value === null) return { value: null, thin: false, n, text: 'n/a' };
  if (n === null || n < radarMinN) return { value, thin: true, n, text: n === null ? 'n unknown' : `n=${n}` };
  return { value, thin: false, n, text: value.toFixed(1) };
}

/** Above this many spokes a radar always uses numbered spokes and a key next to it: full labels on 20 use-case spokes
 *  overlapped (legal/support, guardrails/knowledge graphs, financial crime/feature extraction, forecasting/routing/gaming). */
export const DENSE_SPOKES = 8;
const LINE = 14, LABEL_FONT = 13.5, CHAR = 0.6; // CHAR: conservative advance per character (bold, em)
export const BADGE_R = 11, BADGE_FONT = 13;

const boxOverlap = (p, q, pad = 2) => p.x0 < q.x1 + pad && q.x0 < p.x1 + pad && p.y0 < q.y1 + pad && q.y0 < p.y1 + pad;
const inside = (b, w, h) => b.x0 >= 0 && b.y0 >= 0 && b.x1 <= w && b.y1 <= h;

/** Full-label geometry (≤ DENSE_SPOKES): the position Radar has always used, plus an estimated bounding box per label.
 *  `labels[i] = { lines: string[], value: string }` — the value line is printed under the name lines. */
export function fullLabelLayout(labels, size) {
  const n = labels.length, cx = size.w / 2, cy = size.h / 2 + 4, R = size.r;
  return labels.map((l, i) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / n, cos = Math.cos(a), sin = Math.sin(a);
    const x = cx + (R + 12) * cos, y0 = cy + (R + 12) * sin;
    const anchor = Math.abs(cos) < 0.2 ? 'middle' : cos > 0 ? 'start' : 'end';
    const rows = l.lines.length + 1;
    const y = sin < -0.2 ? y0 - (rows - 1) * LINE - 2 : sin > 0.2 ? y0 + 12 : y0 - ((rows - 1) * LINE) / 2 + 5;
    const width = Math.max(...l.lines.map((s) => s.length), l.value.length) * CHAR * LABEL_FONT;
    const x0 = anchor === 'start' ? x : anchor === 'end' ? x - width : x - width / 2;
    return { x, y, anchor, box: { x0, x1: x0 + width, y0: y - LABEL_FONT * 0.8, y1: y + (rows - 1) * LINE + LABEL_FONT * 0.25 } };
  });
}

/** Numbered-spoke geometry: a badge with the spoke number just outside the 100 ring, on a square canvas whose radius
 *  leaves room for the badges. Names and values go into the key beside the radar, so nothing has to shrink. */
export const NUMBERED_SIDE = 420;
export function numberedLayout(n, size) {
  const side = NUMBERED_SIDE; // the SVG scales to its column; a fixed canvas keeps badge spacing independent of the caller's size
  const R = side / 2 - BADGE_R - 22, cx = side / 2, cy = side / 2;
  return { w: side, h: side, r: R, cx, cy, badges: Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / n, d = R + BADGE_R + 6;
    const x = cx + d * Math.cos(a), y = cy + d * Math.sin(a);
    return { x, y, box: { x0: x - BADGE_R, x1: x + BADGE_R, y0: y - BADGE_R, y1: y + BADGE_R } };
  }) };
}

/** Pairs of label indices whose boxes overlap, and labels leaving the canvas. */
export function labelCollisions(items, w, h) {
  const overlaps = [], outside = [];
  items.forEach((p, i) => { if (!inside(p.box, w, h)) outside.push(i); items.slice(i + 1).forEach((q, j) => { if (boxOverlap(p.box, q.box)) overlaps.push([i, i + 1 + j]); }); });
  return { overlaps, outside };
}

/** 'full' when every name + value label fits without touching another or leaving the canvas, else 'numbered'. */
export function radarLabelMode(labels, size) {
  if (labels.length > DENSE_SPOKES) return 'numbered';
  const c = labelCollisions(fullLabelLayout(labels, size), size.w, size.h);
  return c.overlaps.length || c.outside.length ? 'numbered' : 'full';
}
