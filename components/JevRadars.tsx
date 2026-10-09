"use client";
import { JEV_TYPE_LABEL, jevRowArch, jevTypeVarName } from './jevTypes';
import { useState } from "react";
import { RadarHit, RadarTip, type RadarActive, type RadarSeries } from './TopicRadar';
import type { JevAxis, JevV12Row } from "../lib/jevbench-v12.mjs";
import type { JevTopicsView } from "../lib/jevbench-v12-topics.mjs";
import { radarShape, RADAR_MIN_N, radarValue, plottable, radarRadius, radarLabelMode, fullLabelLayout, numberedLayout, BADGE_R, BADGE_FONT } from "../lib/radar-shape.mjs";

// CR-94 (Florian 2026-09-19 ~17:30 UTC): compare two systems on radars — the four axes of the JevBench Score and accuracy by
// subject topic (completes CR-90.3). Every value is the table's (axes) or the published topic artifact's; nothing is recomputed.
// Colours follow the page's system types; if both picks share a type, B is dashed, darker/lighter and square-marked.
const AXES: JevAxis[] = ["intelligence", "calibration", "speed", "cost"];
const AXIS_LABEL: Record<JevAxis, string> = { intelligence: "Intelligence", calibration: "Calibration", speed: "Speed", cost: "Cost" };
// CR-292 (Florian 5 Oct 2026, architecture axis): same-class pairs keep their colour; dashes and squares distinguish B.
const colour = (cls: string) => `rgb(var(${jevTypeVarName(cls)}))`;
const one = (v: number | null) => (v === null ? "—" : v.toFixed(1));
const pct = (v: number | null) => (v === null ? "—" : `${(v * 100).toFixed(1)}%`);
const short = (d: string) => d.split(" (")[0].split(", formerly")[0];

export type Series = { name: string; stroke: string; dashed: boolean; square: boolean };

/** CR-290 radar correction: the one-line caption for every series the Radar draws as points only (see lib/radar-shape.mjs). */
export function sparseNote(spokes: Spoke[], series: Series[]): string | null {
  const sparse = series.flatMap((se, k) => {
    const present = spokes.map((sp) => plottable(sp.values[k], sp.thin[k]));
    return radarShape(present).kind === "points" ? [`${se.name} has values on ${present.filter(Boolean).length} of ${spokes.length} spokes only, so it is drawn as points, not a shape`] : [];
  });
  return sparse.length ? `${sparse.join("; ")}.` : null;
}
export type Spoke = { key: string; lines: string[]; values: (number | null)[]; texts: string[]; thin: boolean[]; tip?: string };

export function Radar({ spokes, series, size, id, title, desc }: { spokes: Spoke[]; series: Series[]; size: { w: number; h: number; r: number }; id: string; title: string; desc: string }) {
  const [active, setActive] = useState<RadarActive>(null);
  // Radar display fix (9 Oct 2026): with more than DENSE_SPOKES spokes, or whenever a full name + value label would touch another
  // label or leave the canvas (lib/radar-shape.mjs), spokes carry a number and the names, values and definitions move into
  // the key under the radar — the text keeps its size instead of shrinking with a dense SVG on a phone.
  const shown = (s: Spoke, k: number) => radarValue(s.values[k]) !== null || series.some((_, m) => radarValue(s.values[m]) !== null);
  const valueText = (s: Spoke) => series.map((_, k) => (shown(s, k) ? (radarValue(s.values[k]) === null ? "n/a" : s.texts[k]) : "")).filter(Boolean).join(" · ");
  const mode = radarLabelMode(spokes.map((s) => ({ lines: s.lines, value: valueText(s) })), size);
  const num = mode === "numbered" ? numberedLayout(spokes.length, size) : null;
  const W = num ? num.w : size.w, H = num ? num.h : size.h;
  const cx = num ? num.cx : size.w / 2, cy = num ? num.cy : size.h / 2 + 4, R = num ? num.r : size.r;
  // D245: Math.sin/Math.cos may differ in the last ULP between the Node that server-renders and the
  // browser's V8 (spoke 10 of an 11-spoke radar: 172.17492934337636 vs 172.1749293433764), so every
  // ring polygon failed hydration as an attribute mismatch. Three decimals of an SVG user unit is far
  // below a device pixel here and is the precision `BenchmarkRadar` already uses for the same reason.
  const r3 = (n: number) => Number(n.toFixed(3));
  const at = (i: number, v: number) => { const a = -Math.PI / 2 + (2 * Math.PI * i) / spokes.length; const d = R * radarRadius(v) / 100; return [r3(cx + d * Math.cos(a)), r3(cy + d * Math.sin(a))]; };
  const tooltipSeries: RadarSeries[] = series.map((se, k) => ({ id: String(k), name: se.name, color: se.stroke,
    points: spokes.map((s) => ({ value: plottable(s.values[k], s.thin[k]) ? s.values[k] : null,
      label: radarValue(s.values[k]) === null ? 'No measured result' : s.thin[k] ? `${s.texts[k]} — too few completed items to plot` : s.texts[k] })) }));
  const tooltipAxes = spokes.map((s) => ({ id: s.key, name: s.lines.join(' '), version: '', category: '', description: s.tip }));
  const tooltipAt = (k: number, i: number) => at(i, plottable(spokes[i]?.values[k], spokes[i]?.thin[k]) ? spokes[i].values[k] as number : 100) as [number, number];
  const ring = (v: number) => spokes.map((_, i) => at(i, v).join(",")).join(" ");
  // One value slot per series: the coloured value, a muted n=… for an under-minimum cell, a muted "n/a" for no value.
  const slots = (s: Spoke) => series.map((se, k) => {
    const missing = radarValue(s.values[k]) === null;
    return !shown(s, k) ? null : <tspan key={k} fill={missing || s.thin[k] ? "var(--muted)" : se.stroke} fontWeight={missing ? 400 : 700} data-bh-jev12-radar-value={`${k === 0 ? "a" : "b"}:${s.key}`} data-bh-radar-na={missing ? "" : undefined}>{k > 0 && shown(s, k - 1) ? <tspan fill="var(--muted)" fontWeight={400}> · </tspan> : null}{missing ? "n/a" : s.texts[k]}</tspan>;
  });
  const svg = <svg viewBox={`0 0 ${W} ${H}`} className={num ? "mx-auto h-auto w-full max-w-[420px]" : "h-auto w-full"} role="img" aria-labelledby={`${id}-t ${id}-d`} data-bh-jev12-radar-svg data-bh-radar-label-mode={mode}>
    <title id={`${id}-t`}>{title}</title><desc id={`${id}-d`}>{desc}</desc>
    {[20, 40, 60, 80, 100].map((v) => <polygon key={v} points={ring(v)} fill="none" stroke="rgb(var(--line))" strokeOpacity={v === 100 ? 0.9 : 0.5} strokeWidth={1} />)}
    {/* F-136 (Fable pass 25, = F-113/F-117 for these radars): ring labels sit at the half-step between spoke 0 and spoke 1, inside their
        ring (on the polygon's apothem), with the F-70 halo, so the top spoke's own point never strikes them. */}
    {[50, 100].map((v) => { const a = -Math.PI / 2 + Math.PI / spokes.length; const d = (R * v / 100) * Math.cos(Math.PI / spokes.length) - 3; return <text key={v} x={r3(cx + d * Math.cos(a))} y={r3(cy + d * Math.sin(a))} textAnchor="start" dominantBaseline="hanging" fontSize={11} fill="currentColor" opacity={0.7} style={{ paintOrder: "stroke", stroke: "var(--surface)", strokeWidth: "3px", strokeLinejoin: "round" }} data-radar-ring>{v}</text>; })}
    {spokes.map((s, i) => { const [x, y] = at(i, 100); return <line key={s.key} x1={cx} y1={cy} x2={x} y2={y} stroke="rgb(var(--line))" strokeOpacity={0.6} />; })}
    {series.map((se, k) => {
      // CR-290 (Florian 5 Oct 2026): a spoke without a plotted value (unpublished, or under the minimum n) is a gap, never
      // a 0 and never bridged. CR-290 correction (Florian ~20:30): joining neighbouring points still drew a few dots tied by a line that
      // read as a shape (Jev 1.13.0, values on 3 of 8 use-case spokes). Only a complete series is a filled polygon; a series
      // with at least half the spokes draws lines only along runs of 3+ adjacent spokes; anything sparser is points only.
      // 9 Oct 2026: `plottable` also rejects null/NaN/Infinity that reach here, so no missing cell becomes a vertex at the centre.
      const byIndex = spokes.map((s, i) => (plottable(s.values[k], s.thin[k]) ? at(i, s.values[k] as number) : null));
      const pts = byIndex.filter((p): p is number[] => p !== null);
      const shape = radarShape(byIndex.map((p) => p !== null));
      return <g key={k} data-bh-jev12-radar-series={k === 0 ? "a" : "b"} data-bh-radar-shape={shape.kind} data-bh-radar-gaps={shape.kind === "polygon" ? undefined : spokes.length - pts.length}>
        {shape.kind === "polygon"
          ? <polygon points={pts.map((p) => p.join(",")).join(" ")} fill={se.stroke} fillOpacity={k === 0 ? 0.18 : 0.1} stroke={se.stroke} strokeWidth={2.2} strokeDasharray={se.dashed ? "6 4" : undefined} strokeLinejoin="round" />
          : shape.runs.map((run) => <polyline key={run[0]} points={run.map((i) => (byIndex[i] as number[]).join(",")).join(" ")} fill="none" stroke={se.stroke} strokeWidth={2.2} strokeDasharray={se.dashed ? "6 4" : undefined} strokeLinejoin="round" strokeLinecap="round" />)}
        {pts.map(([x, y], i) => se.square ? <rect key={i} x={x - 3.5} y={y - 3.5} width={7} height={7} fill={se.stroke} stroke="var(--surface)" strokeWidth={1} /> : <circle key={i} cx={x} cy={y} r={3.8} fill={se.stroke} stroke="var(--surface)" strokeWidth={1} />)}
      </g>;
    })}
    {num ? spokes.map((s, i) => {
      const b = num.badges[i];
      return <g key={s.key} data-bh-jev12-radar-spoke={s.key} data-bh-radar-spoke-number={i + 1} style={{ cursor: "help" }}>
        <title>{`${i + 1}. ${s.lines.join(" ")}: ${valueText(s) || "n/a"}${s.tip ? ` — ${s.tip}` : ""}`}</title>
        <circle cx={r3(b.x)} cy={r3(b.y)} r={BADGE_R} fill="var(--surface)" stroke="rgb(var(--line))" />
        <text x={r3(b.x)} y={r3(b.y)} textAnchor="middle" dominantBaseline="central" fontSize={BADGE_FONT} fontWeight={700} fill="var(--text)">{i + 1}</text>
      </g>;
    }) : fullLabelLayout(spokes.map((s) => ({ lines: s.lines, value: valueText(s) })), size).map(({ x: x0, y: y1, anchor }, i) => {
      const s = spokes[i], x = r3(x0), y = r3(y1);
      return <text key={s.key} x={x} y={y} textAnchor={anchor} fontSize={13.5} fill="var(--text)" data-bh-jev12-radar-spoke={s.key} style={s.tip ? { cursor: "help" } : undefined}>
        <title>{`${s.lines.join(' ')}: ${series.map((se, k) => `${se.name}: ${tooltipSeries[k].points[i].label}`).join('; ')}${s.tip ? ` — ${s.tip}` : ''}`}</title>
        {s.lines.map((l, j) => <tspan key={j} x={x} dy={j === 0 ? 0 : 14} fontWeight={600}>{l}</tspan>)}
        {/* F-216 (Fable pass 40), refined by CR-290: the separator sits between two printed slots; an unpublished value prints "n/a", never a bare "· 74%". */}
        {/* CR-290: when one system has a value and the other has none, the missing one prints a muted "n/a" in its slot, so a gap
            reads as "no value", not as a low score. A spoke neither system has keeps its label alone. */}
        <tspan x={x} dy={14} fontSize={13}>{slots(s)}</tspan>
      </text>;
    })}
    {series.map((se, k) => spokes.map((s, i) => {
      if (!plottable(s.values[k], s.thin[k])) return null;
      const [x, y] = at(i, s.values[k] as number);
      return <RadarHit key={`${k}-${s.key}`} cx={x} cy={y} s={k} i={i} active={active} setActive={setActive} label={`${se.name}, ${s.lines.join(' ')}: ${tooltipSeries[k].points[i].label}`} />;
    }))}
    {num && spokes.map((s, i) => <RadarHit key={`label-${s.key}`} cx={r3(num.badges[i].x)} cy={r3(num.badges[i].y)} s={0} i={i} active={active} setActive={setActive} label={`${s.lines.join(' ')}: ${tooltipSeries.map((se) => `${se.name}: ${se.points[i].label}`).join('; ')}`} />)}
  </svg>;
  const chart = <div className={num ? "relative mx-auto w-full max-w-[420px]" : "relative"} data-bh-jev-radar-interactive onPointerLeave={(e) => { if (e.pointerType === 'mouse') setActive(null); }} onClick={() => setActive(null)}>
    {svg}
    <RadarTip active={active} axes={tooltipAxes} series={tooltipSeries} at={tooltipAt} width={W} height={H} />
  </div>;
  if (!num) return chart;
  // The key: spoke number, full name (definition and item count on hover / long-press via title), and every series' value in
  // its colour — the same printed values the labels carried. Two columns from sm up, one on a phone; long names wrap.
  return <>
    {chart}
    <ol className="mt-1 grid gap-x-4 gap-y-0.5 text-[12.5px] leading-snug sm:grid-cols-2" aria-label={`Spoke key: ${title}`} data-bh-radar-key={id}>
      {spokes.map((s, i) => <li key={s.key} className="flex min-w-0 gap-1.5" title={s.tip} data-bh-radar-key-item={s.key}>
        <span className="tabular w-5 shrink-0 text-right font-bold" aria-hidden="true">{i + 1}</span>
        <span className="min-w-0 break-words"><span className="font-semibold">{s.lines.join(" ")}</span>{" "}
          <span className="whitespace-nowrap">{series.map((se, k) => { const missing = radarValue(s.values[k]) === null; if (!shown(s, k)) return null;
            return <span key={k} style={{ color: missing || s.thin[k] ? "var(--muted)" : se.stroke }} className={missing ? "" : "font-bold"} data-bh-radar-key-value={`${k === 0 ? "a" : "b"}:${s.key}`}>{k > 0 && shown(s, k - 1) ? <span className="bh-muted font-normal"> · </span> : null}{missing ? "n/a" : s.texts[k]}</span>; })}</span>
        </span>
      </li>)}
    </ol>
  </>;
}

// F-167 (Fable pass 32): the per-system page draws the same topic radar for a fixed pair, so the two
// derivations the hub does — the pair's colours and the topic spokes — are computed here once and used
// by both. `JevPairRadar` below is the hub's second figure with the selects removed.
function pairSeries(A: JevV12Row, B: JevV12Row): Series[] {
  const same = jevRowArch(A) === jevRowArch(B);
  return [{ name: short(A.display), stroke: colour(jevRowArch(A)), dashed: false, square: false },
    { name: short(B.display), stroke: colour(jevRowArch(B)), dashed: same, square: true }];
}

// CR-290 radar correction (Florian 5 Oct 2026 ~20:30): only topics with at least RADAR_MIN_N items are spokes, and a cell needs
// that many answered items to be drawn; smaller topics are listed under the radar as low-sample values.
const radarTopics = (topics: JevTopicsView) => topics.topics.filter((t) => t.n >= RADAR_MIN_N);
const lowTopics = (topics: JevTopicsView) => topics.topics.filter((t) => t.n < RADAR_MIN_N);
const thinAt = (topics: JevTopicsView) => Math.max(topics.minAttempted, RADAR_MIN_N);
function lowTopicLine(pair: JevV12Row[], topics: JevTopicsView): string | null {
  const low = lowTopics(topics);
  if (!low.length) return null;
  const v = (r: JevV12Row, key: string) => { const c = topics.systems[r.key]?.[key]; return c && c.attempted >= topics.minAttempted ? `${pct(c.accuracy)} (n=${c.attempted})` : "—"; };
  return `Low sample, n < ${RADAR_MIN_N} — indicative only, not drawn: ${low.map((t) => `${t.label} (${t.n} items): ${pair.map((r) => v(r, t.key)).join(" · ")}`).join("; ")}.`;
}

function topicSpokesFor(pair: JevV12Row[], topics: JevTopicsView): Spoke[] {
  const cells = pair.map((r) => topics.systems[r.key]);
  return radarTopics(topics).map((t) => ({
    key: t.key, lines: t.short.split(" ").reduce<string[]>((ls, w) => (ls.length && (ls[ls.length - 1] + " " + w).length <= 13 ? [...ls.slice(0, -1), `${ls[ls.length - 1]} ${w}`] : [...ls, w]), []),
    thin: cells.map((c) => Boolean(c && c[t.key].attempted < thinAt(topics))),
    values: cells.map((c) => (c?.[t.key]?.accuracy == null ? null : c[t.key].accuracy! * 100)),
    texts: cells.map((c) => !c?.[t.key] ? "not published" : c[t.key].attempted < thinAt(topics) ? `n=${c[t.key].attempted}` : pct(c[t.key].accuracy)),
  }));
}

export const Swatch = ({ s }: { s: Series }) => <svg width="30" height="12" aria-hidden="true" className="mr-1.5 inline-block align-middle"><line x1="1" y1="6" x2="29" y2="6" stroke={s.stroke} strokeWidth="2.4" strokeDasharray={s.dashed ? "6 4" : undefined} />{s.square ? <rect x="11.5" y="2.5" width="7" height="7" fill={s.stroke} /> : <circle cx="15" cy="6" r="3.8" fill={s.stroke} />}</svg>;

/** F-167: the hub's topic radar for one fixed pair — the system's own page, where there is nothing to pick.
 *  Same `Radar`, same thin-spoke rule and the hub's one caption sentence; `topics.systems` must hold both keys. */
export function JevPairRadar({ a, b, topics }: { a: JevV12Row; b: JevV12Row; topics: JevTopicsView }) {
  const missing = [a, b].filter((r) => !topics.systems[r.key]);
  if (missing.length) return <p className="bh-muted text-sm" data-bh-jev12-topic-unavailable>
    Per-topic comparison is unavailable for {missing.map((r) => short(r.display)).join(" and ")}; the official topic artifact does not publish aggregate rows for those systems.
  </p>;
  const pair = [a, b], series = pairSeries(a, b), spokes = topicSpokesFor(pair, topics);
  const desc = `Accuracy by subject topic, ${series[0].name} vs ${series[1].name}. ` + radarTopics(topics).map((t, i) => `${t.label} (${t.n} items): ${spokes[i].texts[0]} vs ${spokes[i].texts[1]}`).join("; ") + ".";
  const anyThin = spokes.some((sp) => sp.thin.some(Boolean));
  const lowLine = lowTopicLine(pair, topics), sparse = sparseNote(spokes, series);
  return <figure className="min-w-0" data-bh-jev-system-radar={a.key}>
    <ul className="mb-1 space-y-1 text-[13px]" aria-label="Legend" data-bh-jev-system-radar-legend>
      {pair.map((r, k) => <li key={r.key}><Swatch s={series[k]} /><b>{short(r.display)}</b></li>)}
    </ul>
    <Radar spokes={spokes} series={series} size={{ w: 460, h: 370, r: 100 }} id={`jev-system-radar-${a.key}`} title="Radar: accuracy by subject topic, this system and the reference" desc={desc} />
    <figcaption className="bh-muted space-y-1 text-[12px]">
      <span className="block">Share of each topic&apos;s decisions answered correctly, all tiers together — compare the two systems within a topic, not topics with each other.</span>
      {anyThin && <span className="block" data-bh-jev-system-radar-thin>Grey “n=…”: fewer than {thinAt(topics)} items of that topic were answered — too few to plot.</span>}
      {sparse && <span className="block" data-bh-radar-gap-note="points">{sparse}</span>}
      {lowLine && <span className="block" data-bh-jev12-low-sample>{lowLine}</span>}
    </figcaption>
  </figure>;
}

export function JevRadars({ ranked, honorable, partial, topics }: { ranked: JevV12Row[]; honorable: JevV12Row[]; partial: JevV12Row[]; topics: JevTopicsView }) {
  const all = [...ranked, ...honorable, ...partial];
  const first = ranked.find((r) => r.key === "jev-1.13.0") ?? ranked[0];
  const [a, setA] = useState(first.key);
  const [b, setB] = useState((ranked.find((r) => r.key !== first.key) ?? ranked[1]).key);
  const A = all.find((r) => r.key === a) ?? first, B = all.find((r) => r.key === b) ?? ranked[1];
  const series = pairSeries(A, B);
  const pair = [A, B];
  const min = thinAt(topics);
  const axisSpokes: Spoke[] = AXES.map((k) => ({
    key: k, lines: [AXIS_LABEL[k]], thin: [false, false],
    values: pair.map((r) => r.axes[k]), // label-only systems have no calibration: 0 in the score, a gap on the radar (9 Oct 2026)
    texts: pair.map((r) => (r.axes[k] === null ? "none (0 in score)" : one(r.axes[k]))),
  }));
  const cells = pair.map((r) => topics.systems[r.key]);
  const missingTopicRows = pair.filter((r) => !topics.systems[r.key]);
  const topicSpokes = topicSpokesFor(pair, topics);
  // CR-97: an honorable mention keeps every number, so it stays selectable here — it is simply never labelled with a rank.
  const notRanked = (r: JevV12Row) => (r.ranked ? "" : r.listing === "honorable_mention" ? " (honorable mention)" : " (partial)");
  const option = (r: JevV12Row) => <option key={r.key} value={r.key}>{r.rank ? `${r.rank}. ` : ""}{short(r.display)}{notRanked(r)}</option>;
  // A plain render function, not a component: a component defined here would remount on every change and drop the focus.
  const pick = (id: string, label: string, value: string, set: (k: string) => void, other: string) => <label className="block min-w-0 flex-1 text-[13px]" htmlFor={id}>
    <span className="bh-muted mb-1 block font-semibold">{label}</span>
    <select id={id} className="bh-input w-full" value={value} onChange={(e) => set(e.target.value)} data-bh-jev12-radar-pick={id.endsWith("a") ? "a" : "b"}>
      <optgroup label="Ranked">{ranked.filter((r) => r.key !== other).map(option)}</optgroup>
      {honorable.length > 0 && <optgroup label="Honorable mentions (not ranked)">{honorable.filter((r) => r.key !== other).map(option)}</optgroup>}
      <optgroup label="Partial runs (not ranked)">{partial.filter((r) => r.key !== other).map(option)}</optgroup>
    </select></label>;
  const scoreText = (r: JevV12Row) => `JevBench Score ${one(r.main)}${r.rank ? ` (#${r.rank})` : r.listing === "honorable_mention" ? " (honorable mention, not ranked)" : " (partial run, not ranked)"}`;
  const axisDesc = `${series[0].name} vs ${series[1].name}. ` + AXES.map((k, i) => `${AXIS_LABEL[k]}: ${axisSpokes[i].texts[0]} vs ${axisSpokes[i].texts[1]}`).join("; ") + ".";
  const topicDesc = `Accuracy by subject topic, ${series[0].name} vs ${series[1].name}. ` + radarTopics(topics).map((t, i) => `${t.label} (${t.n} items): ${topicSpokes[i].texts[0]} vs ${topicSpokes[i].texts[1]}`).join("; ") + ".";
  const lowLine = lowTopicLine(pair, topics), topicSparse = sparseNote(topicSpokes, series);
  const anyThin = topicSpokes.some((s) => s.thin.some(Boolean));
  return <section className="mt-8" aria-labelledby="jev12-compare" data-bh-jev12-compare data-bh-jev12-compare-a={A.key} data-bh-jev12-compare-b={B.key}>
    <h2 id="jev12-compare" className="text-xl font-semibold">Compare two systems</h2>
    <p className="bh-muted mt-1 max-w-3xl text-sm">Pick any two. The first radar shows the four axes of the JevBench Score (0–100, the values in the table above); the second shows accuracy by subject topic, over all tiers. Further out is better on every spoke.</p>
    <div className="bh-panel mt-3 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        {pick("jev12-radar-a", "System A", A.key, setA, B.key)}
        <button type="button" className="bh-button shrink-0 self-end text-sm font-semibold sm:self-auto" onClick={() => { setA(B.key); setB(A.key); }} aria-label="Swap system A and system B" data-bh-jev12-radar-swap>⇄ Swap</button>
        {pick("jev12-radar-b", "System B", B.key, setB, A.key)}
      </div>
      <ul className="mt-3 space-y-1 text-[13px]" aria-label="Legend" data-bh-jev12-radar-legend>
        {pair.map((r, k) => <li key={k} data-bh-jev12-radar-legend-item={k === 0 ? "a" : "b"}><Swatch s={series[k]} /><b>{k === 0 ? "A" : "B"}: {short(r.display)}</b> <span className="bh-muted">— {JEV_TYPE_LABEL[jevRowArch(r)] ?? r.cls} · </span><span data-bh-jev12-radar-score={r.main.toFixed(3)}>{scoreText(r)}</span></li>)}
      </ul>
      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        <figure className="min-w-0" data-bh-jev12-radar="axes">
          <h3 className="text-base font-semibold">The four score axes</h3>
          <Radar spokes={axisSpokes} series={series} size={{ w: 420, h: 320, r: 96 }} id="jev12-radar-axes" title="Radar: the four JevBench Score axes, two systems" desc={axisDesc} />
          <figcaption className="bh-muted text-[12px]">Speed includes the latency adjustment for self-hosted and demo endpoints — an assumption, see <a href="#limits" className="text-accent underline">Limits</a>. A label-only system has no calibration: it counts as 0 in the score and is left as a gap on the radar.</figcaption>
          <details className="mt-2 text-[13px]"><summary className="cursor-pointer text-accent">Values as a table</summary>
            <table className="bh-table mt-2" data-bh-jev12-radar-table="axes"><thead><tr><th scope="col">Axis</th><th scope="col">A: {series[0].name}</th><th scope="col">B: {series[1].name}</th></tr></thead>
              <tbody>{axisSpokes.map((s) => <tr key={s.key}><th scope="row">{s.lines[0]}</th><td className="tabular">{s.texts[0]}</td><td className="tabular">{s.texts[1]}</td></tr>)}
                <tr><th scope="row">JevBench Score</th><td className="tabular">{one(A.main)}</td><td className="tabular">{one(B.main)}</td></tr></tbody></table>
          </details>
        </figure>
        <figure className="min-w-0" data-bh-jev12-radar="topics">
          <h3 className="text-base font-semibold">Accuracy by subject topic <span className="bh-muted text-[12px] font-normal">— not part of the score</span></h3>
          <Radar spokes={topicSpokes} series={series} size={{ w: 460, h: 370, r: 100 }} id="jev12-radar-topics" title="Radar: accuracy by subject topic, two systems" desc={topicDesc} />
          {/* F-137 (Fable pass 25): two visible sentences at most (pass-20 rule); the tier mix, the topic method and the held-out note are the
              first lines of the disclosure below, above the table. */}
          <figcaption className="bh-muted space-y-1 text-[12px]">
            <span className="block">Share of each topic&apos;s decisions answered correctly, all tiers together — compare the two systems within a topic, not topics with each other.</span>
            {anyThin && <span className="block" data-bh-jev12-radar-thin>Grey “n=…”: fewer than {min} items of that topic were answered — too few to plot.</span>}
            {topicSparse && <span className="block" data-bh-radar-gap-note="points">{topicSparse}</span>}
            {lowLine && <span className="block" data-bh-jev12-low-sample>{lowLine}</span>}
            {missingTopicRows.length > 0 && <span className="block" data-bh-jev12-topic-unavailable>Per-topic aggregates unavailable for {missingTopicRows.map((r) => short(r.display)).join(" and ")}; those values are left blank (official artifact covers 47 systems)</span>}
          </figcaption>
          <details className="mt-2 text-[13px]" data-bh-jev12-radar-notes><summary className="cursor-pointer text-accent">Values and notes</summary>
            <ul className="bh-muted mt-2 list-disc space-y-1 pl-4 text-[12px]">
              <li>Topics mix tiers differently — Everyday language is mostly easy items, Rules &amp; law and Finance mostly hard ones — which is why topics are not compared with each other.</li>
              <li>Topics: one per item, drafted by a model and checked by hand — <a className="text-accent underline" href="https://github.com/fstandhartinger/jevbench/blob/main/datasets/TOPICS.md">method</a>. Held-out items count in the totals; their texts stay private.</li>
            </ul>
            <div className="bh-table-wrap"><table className="bh-table mt-2" data-bh-jev12-radar-table="topics"><thead><tr><th scope="col">Topic (items)</th><th scope="col">A: {series[0].name}</th><th scope="col">B: {series[1].name}</th></tr></thead>
              <tbody>{topics.topics.map((t) => <tr key={t.key} title={t.covers}><th scope="row" className="text-left font-normal"><b>{t.label}</b> <span className="bh-muted">({t.n})</span><span className="bh-muted block text-[11px]">{t.covers}</span></th>
                {cells.map((c, k) => {
                  const cell = c?.[t.key];
                  const thin = Boolean(cell && (t.n < RADAR_MIN_N || cell.attempted < min));
                  return <td key={k} className={`tabular ${thin ? "bh-muted" : ""}`}>
                    {cell ? <>{pct(cell.accuracy)} <span className="bh-muted block text-[11px]">{cell.correct} of {cell.attempted}{cell.attempted < cell.n ? ` answered (of ${cell.n})` : ""}{thin ? (t.n < RADAR_MIN_N ? " — low sample, not drawn" : " — too few") : ""}</span></> : <span data-bh-jev12-topic-cell-unavailable>Not published</span>}
                  </td>;
                })}</tr>)}</tbody></table></div>
          </details>
        </figure>
      </div>
    </div>
  </section>;
}
