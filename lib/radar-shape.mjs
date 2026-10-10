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
 *  domain is for chance-corrected competence radars (lead job jevbench-radar-full-areas-20261009): it is fixed,
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

/** Layout A (Florian, Telegram #16968, 10 Oct 2026: "labels at the spoke ends, horizontal"): every spoke keeps its full name
 *  and values as horizontal text at its own spoke end. Labels on each side are stacked without overlap (least-squares drift
 *  from their spoke end, keeping spoke order); a label moved off its spoke end gets a thin leader line. The canvas grows to
 *  fit the labels, so nothing clips; the caller's SVG scales to its column. Two profiles: desktop, and phone (< 600 px)
 *  with wrapped names, a smaller plot and a font sized for a ~340 px wide column. */
export const ENDS_PROFILES = {
  desktop: { r: 170, gap: 10, font: 12.5, line: 15, wrap: 22, pad: 3, margin: 6, leaderAt: 3 },
  phone: { r: 100, gap: 7, font: 11.5, line: 13, wrap: 12, pad: 2, margin: 4, leaderAt: 3 },
};
export function wrapLabel(name, max) {
  return name.split(' ').reduce((ls, w) => (ls.length && (ls[ls.length - 1] + ' ' + w).length <= max ? [...ls.slice(0, -1), `${ls[ls.length - 1]} ${w}`] : [...ls, w]), []);
}
/** `labels[i] = { name, value }`. Returns { w, h, cx, cy, r, items[i] = { x, y (first baseline), anchor, lines, box, ex, ey, leader } }. */
export function endsLayout(labels, profile = ENDS_PROFILES.desktop) {
  const { r: R, gap, font, line, wrap, pad, margin, leaderAt } = profile;
  const n = labels.length, charW = CHAR * font * 1.05; // 5 % safety on the per-character estimate
  let cx = 0, cy = 0;
  const items = labels.map((l, i) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / n, cos = Math.cos(a), sin = Math.sin(a);
    const lines = wrapLabel(l.name, wrap);
    const rows = lines.length + (l.value ? 1 : 0), h = rows * line;
    const width = Math.max(...lines.map((s) => s.length), l.value.length) * charW;
    const side = Math.abs(cos) < Math.min(0.12, 0.99 * Math.sin(Math.PI / n)) ? 0 : cos > 0 ? 1 : -1; // at most one middle label at top and bottom
    const ex = cx + (R + gap) * cos, ey = cy + (R + gap) * sin;
    const top = side !== 0 ? ey - h / 2 : sin < 0 ? ey - h : ey; // middle labels sit fully above / below their spoke end
    return { i, side, sin, lines, h, width, ex, ey, ideal: top, top, anchor: side === 0 ? 'middle' : side > 0 ? 'start' : 'end', x: ex };
  });
  const xRange = (it) => (it.anchor === 'start' ? [it.x, it.x + it.width] : it.anchor === 'end' ? [it.x - it.width, it.x] : [it.x - it.width / 2, it.x + it.width / 2]);
  const xOverlap = (p, q) => { const [a0, a1] = xRange(p), [b0, b1] = xRange(q); return a0 < b1 + pad && b0 < a1 + pad; };
  const mids = items.filter((it) => it.side === 0);
  const topMids = mids.filter((m) => m.sin < 0), bottomMids = mids.filter((m) => m.sin > 0);
  for (const s of [1, -1]) {
    const col = items.filter((it) => it.side === s).sort((p, q) => p.ey - q.ey);
    // Pool adjacent violators: blocks of touching labels sit at the mean of their members' ideal tops (least-squares drift).
    const blocks = [];
    for (const it of col) {
      blocks.push({ items: [it], h: it.h, sum: it.ideal, top: it.ideal });
      while (blocks.length > 1) {
        const b = blocks[blocks.length - 1], p = blocks[blocks.length - 2];
        if (p.top + p.h + pad <= b.top) break;
        const off = p.h + pad; // members of b move down by p's height inside the merged block
        const merged = { items: [...p.items, ...b.items], h: p.h + pad + b.h, sum: p.sum + b.sum - off * b.items.length };
        merged.top = merged.sum / merged.items.length;
        blocks.splice(-2, 2, merged);
      }
    }
    for (const b of blocks) { let y = b.top; for (const it of b.items) { it.top = y; y += it.h + pad; } }
    // A top middle label above the plot is an obstacle: push the first side labels below it where they share columns.
    let floor = -Infinity;
    for (const it of col) {
      for (const m of topMids) if (xOverlap(it, m)) floor = Math.max(floor, m.top + m.h + pad);
      if (it.top < floor) it.top = floor;
      floor = it.top + it.h + pad;
    }
  }
  // A moved side label keeps clear of the plot: its edge sits just outside the circle at the label row nearest the equator.
  for (const it of items) if (it.side !== 0) {
    const dy = it.top > 0 ? it.top : it.top + it.h < 0 ? -(it.top + it.h) : 0, reach = R + gap;
    it.x = it.side * Math.max(gap, dy < reach ? Math.sqrt(reach * reach - dy * dy) : 0);
  }
  // A bottom middle label goes below any side label that shares its columns.
  for (const m of bottomMids) for (const it of items) if (it.side !== 0 && xOverlap(it, m)) m.top = Math.max(m.top, it.top + it.h + pad);
  // Fit the canvas: shift everything so the plot and every label box lie inside a margin.
  const boxes = items.map((it) => { const [x0, x1] = xRange(it); return { x0, x1, y0: it.top, y1: it.top + it.h }; });
  const minX = Math.min(-R, ...boxes.map((b) => b.x0)) - margin, maxX = Math.max(R, ...boxes.map((b) => b.x1)) + margin;
  const minY = Math.min(-R, ...boxes.map((b) => b.y0)) - margin, maxY = Math.max(R, ...boxes.map((b) => b.y1)) + margin;
  cx = -minX; cy = -minY;
  return {
    w: maxX - minX, h: maxY - minY, cx, cy, r: R,
    items: items.map((it, k) => {
      const b = boxes[k], drift = Math.abs(it.top - it.ideal);
      return { x: it.x + cx, y: it.top + cy + font * 0.85, anchor: it.anchor, lines: it.lines, rows: it.lines.length, line, font,
        box: { x0: b.x0 + cx, x1: b.x1 + cx, y0: b.y0 + cy, y1: b.y1 + cy },
        ex: it.ex + cx, ey: it.ey + cy, leader: drift > leaderAt, ly: it.side === 0 ? (it.sin < 0 ? b.y1 + cy : b.y0 + cy) : it.top + cy + it.h / 2 };
    }),
  };
}

/** Pairs of label indices whose boxes overlap, and labels leaving the canvas. */
export function labelCollisions(items, w, h) {
  const overlaps = [], outside = [];
  items.forEach((p, i) => { if (!inside(p.box, w, h)) outside.push(i); items.slice(i + 1).forEach((q, j) => { if (boxOverlap(p.box, q.box)) overlaps.push([i, i + 1 + j]); }); });
  return { overlaps, outside };
}

/** 'full' when every name + value label fits the caller's canvas without touching another or leaving it, else 'ends'
 *  (layout A on its own fitted canvas; the numbered-badge layout is no longer used by Radar). */
export function radarLabelMode(labels, size) {
  if (labels.length > DENSE_SPOKES) return 'ends';
  const c = labelCollisions(fullLabelLayout(labels, size), size.w, size.h);
  return c.overlaps.length || c.outside.length ? 'ends' : 'full';
}
