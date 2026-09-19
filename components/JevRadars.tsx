"use client";
import { useState } from "react";
import type { JevAxis, JevV12Row } from "../lib/jevbench-v12.mjs";
import type { JevTopicsView } from "../lib/jevbench-v12-topics.mjs";

// CR-94 (Florian 2026-09-19 ~17:30 UTC): compare two systems on radars — the four axes of the JevBench Score and accuracy by
// subject topic (completes CR-90.3). Every value is the table's (axes) or the published topic artifact's; nothing is recomputed.
// Colours follow the page's system types; if both picks share a type, B is dashed, darker/lighter and square-marked.
const AXES: JevAxis[] = ["intelligence", "calibration", "speed", "cost"];
const AXIS_LABEL: Record<JevAxis, string> = { intelligence: "Intelligence", calibration: "Calibration", speed: "Speed", cost: "Cost" };
const TYPE_VAR: Record<string, string> = { jev: "--jev-t-jev", "jev-rebuild": "--jev-t-rebuild", "llm-baseline": "--jev-t-llm", "small-tool-model": "--jev-t-tool", "jev-service": "--jev-t-service", classifier: "--jev-t-classifier" };
// Review gate 20260919T233002Z: "Service built on Jev" is a second blue, so a Jev/jev-service pair — the default one —
// drew two near-identical solid lines (rgb(42,122,213) vs rgb(84,150,214) in light). Pairs from the same colour family get
// the treatment the page already has for two rows of the same type: B dashed, mixed towards the text colour, square marks.
const TYPE_FAMILY: Record<string, string> = { jev: "blue", "jev-service": "blue", "jev-rebuild": "orange", "llm-baseline": "green", "small-tool-model": "violet", classifier: "magenta" };
const family = (cls: string) => TYPE_FAMILY[cls] ?? cls;
const TYPE_LABEL: Record<string, string> = { jev: "Jev", "jev-rebuild": "Jev rebuild", "llm-baseline": "instruction model", "small-tool-model": "small tool-calling model", "jev-service": "service built on Jev", classifier: "zero-shot classifier" };
const colour = (cls: string) => `rgb(var(${TYPE_VAR[cls] ?? TYPE_VAR["llm-baseline"]}))`;
const one = (v: number | null) => (v === null ? "—" : v.toFixed(1));
const pct = (v: number | null) => (v === null ? "—" : `${(v * 100).toFixed(1)}%`);
const short = (d: string) => d.split(" (")[0].split(", formerly")[0];

type Series = { name: string; stroke: string; dashed: boolean; square: boolean };
type Spoke = { key: string; lines: string[]; values: (number | null)[]; texts: string[]; thin: boolean[] };

function Radar({ spokes, series, size, id, title, desc }: { spokes: Spoke[]; series: Series[]; size: { w: number; h: number; r: number }; id: string; title: string; desc: string }) {
  const cx = size.w / 2, cy = size.h / 2 + 4, R = size.r;
  const at = (i: number, v: number) => { const a = -Math.PI / 2 + (2 * Math.PI * i) / spokes.length; return [cx + (R * v / 100) * Math.cos(a), cy + (R * v / 100) * Math.sin(a)]; };
  const ring = (v: number) => spokes.map((_, i) => at(i, v).join(",")).join(" ");
  return <svg viewBox={`0 0 ${size.w} ${size.h}`} className="h-auto w-full" role="img" aria-labelledby={`${id}-t ${id}-d`} data-bh-jev12-radar-svg>
    <title id={`${id}-t`}>{title}</title><desc id={`${id}-d`}>{desc}</desc>
    {[20, 40, 60, 80, 100].map((v) => <polygon key={v} points={ring(v)} fill="none" stroke="rgb(var(--line))" strokeOpacity={v === 100 ? 0.9 : 0.5} strokeWidth={1} />)}
    {[50, 100].map((v) => <text key={v} x={cx + 3} y={cy - (R * v) / 100 + 10} fontSize={9} fill="var(--muted)">{v}</text>)}
    {spokes.map((s, i) => { const [x, y] = at(i, 100); return <line key={s.key} x1={cx} y1={cy} x2={x} y2={y} stroke="rgb(var(--line))" strokeOpacity={0.6} />; })}
    {series.map((se, k) => {
      const pts = spokes.map((s, i) => (s.values[k] === null || s.thin[k] ? null : at(i, s.values[k] as number))).filter((p): p is number[] => p !== null);
      return <g key={k} data-bh-jev12-radar-series={k === 0 ? "a" : "b"}>
        <polygon points={pts.map((p) => p.join(",")).join(" ")} fill={se.stroke} fillOpacity={k === 0 ? 0.18 : 0.1} stroke={se.stroke} strokeWidth={2.2} strokeDasharray={se.dashed ? "6 4" : undefined} strokeLinejoin="round" />
        {pts.map(([x, y], i) => se.square ? <rect key={i} x={x - 3.5} y={y - 3.5} width={7} height={7} fill={se.stroke} stroke="var(--surface)" strokeWidth={1} /> : <circle key={i} cx={x} cy={y} r={3.8} fill={se.stroke} stroke="var(--surface)" strokeWidth={1} />)}
      </g>;
    })}
    {spokes.map((s, i) => {
      const a = -Math.PI / 2 + (2 * Math.PI * i) / spokes.length;
      const cos = Math.cos(a), sin = Math.sin(a);
      const x = cx + (R + 12) * cos, y0 = cy + (R + 12) * sin;
      const anchor = Math.abs(cos) < 0.2 ? "middle" : cos > 0 ? "start" : "end";
      const n = s.lines.length + 1;
      const y = sin < -0.2 ? y0 - (n - 1) * 14 - 2 : sin > 0.2 ? y0 + 12 : y0 - ((n - 1) * 14) / 2 + 5;
      return <text key={s.key} x={x} y={y} textAnchor={anchor} fontSize={13.5} fill="var(--text)" data-bh-jev12-radar-spoke={s.key}>
        {s.lines.map((l, j) => <tspan key={j} x={x} dy={j === 0 ? 0 : 14} fontWeight={600}>{l}</tspan>)}
        <tspan x={x} dy={14} fontSize={13}>{series.map((se, k) => <tspan key={k} fill={s.thin[k] ? "var(--muted)" : se.stroke} fontWeight={700} data-bh-jev12-radar-value={`${k === 0 ? "a" : "b"}:${s.key}`}>{k > 0 ? <tspan fill="var(--muted)" fontWeight={400}> · </tspan> : null}{s.texts[k]}</tspan>)}</tspan>
      </text>;
    })}
  </svg>;
}

export function JevRadars({ ranked, partial, topics }: { ranked: JevV12Row[]; partial: JevV12Row[]; topics: JevTopicsView }) {
  const all = [...ranked, ...partial];
  const first = ranked.find((r) => r.key === "jev-1.13.0") ?? ranked[0];
  const [a, setA] = useState(first.key);
  const [b, setB] = useState((ranked.find((r) => r.key !== first.key) ?? ranked[1]).key);
  const A = all.find((r) => r.key === a) ?? first, B = all.find((r) => r.key === b) ?? ranked[1];
  const same = family(A.cls) === family(B.cls);
  const series: Series[] = [{ name: short(A.display), stroke: colour(A.cls), dashed: false, square: false }, { name: short(B.display), stroke: same ? `color-mix(in srgb, ${colour(B.cls)} 55%, var(--text))` : colour(B.cls), dashed: same, square: true }];
  const pair = [A, B];
  const min = topics.minAttempted;
  const axisSpokes: Spoke[] = AXES.map((k) => ({
    key: k, lines: [AXIS_LABEL[k]], thin: [false, false],
    values: pair.map((r) => r.axes[k] ?? 0), // label-only systems have no calibration: counted as 0, as in the score
    texts: pair.map((r) => (r.axes[k] === null ? "none (0)" : one(r.axes[k]))),
  }));
  const cells = pair.map((r) => topics.systems[r.key]);
  const topicSpokes: Spoke[] = topics.topics.map((t) => ({
    key: t.key, lines: t.short.split(" ").reduce<string[]>((ls, w) => (ls.length && (ls[ls.length - 1] + " " + w).length <= 13 ? [...ls.slice(0, -1), `${ls[ls.length - 1]} ${w}`] : [...ls, w]), []),
    thin: cells.map((c) => c[t.key].attempted < min),
    values: cells.map((c) => (c[t.key].accuracy === null ? null : c[t.key].accuracy! * 100)),
    texts: cells.map((c) => (c[t.key].attempted < min ? `n=${c[t.key].attempted}` : pct(c[t.key].accuracy))),
  }));
  const option = (r: JevV12Row) => <option key={r.key} value={r.key}>{r.rank ? `${r.rank}. ` : ""}{short(r.display)}{r.ranked ? "" : " (partial)"}</option>;
  // A plain render function, not a component: a component defined here would remount on every change and drop the focus.
  const pick = (id: string, label: string, value: string, set: (k: string) => void, other: string) => <label className="block min-w-0 flex-1 text-[13px]" htmlFor={id}>
    <span className="bh-muted mb-1 block font-semibold">{label}</span>
    <select id={id} className="bh-input w-full" value={value} onChange={(e) => set(e.target.value)} data-bh-jev12-radar-pick={id.endsWith("a") ? "a" : "b"}>
      <optgroup label="Ranked">{ranked.filter((r) => r.key !== other).map(option)}</optgroup>
      <optgroup label="Partial runs (not ranked)">{partial.filter((r) => r.key !== other).map(option)}</optgroup>
    </select></label>;
  const Swatch = ({ s }: { s: Series }) => <svg width="30" height="12" aria-hidden="true" className="mr-1.5 inline-block align-middle"><line x1="1" y1="6" x2="29" y2="6" stroke={s.stroke} strokeWidth="2.4" strokeDasharray={s.dashed ? "6 4" : undefined} />{s.square ? <rect x="11.5" y="2.5" width="7" height="7" fill={s.stroke} /> : <circle cx="15" cy="6" r="3.8" fill={s.stroke} />}</svg>;
  const scoreText = (r: JevV12Row) => `JevBench Score ${one(r.main)}${r.rank ? ` (#${r.rank})` : " (partial run, not ranked)"}`;
  const axisDesc = `${series[0].name} vs ${series[1].name}. ` + AXES.map((k, i) => `${AXIS_LABEL[k]}: ${axisSpokes[i].texts[0]} vs ${axisSpokes[i].texts[1]}`).join("; ") + ".";
  const topicDesc = `Accuracy by subject topic, ${series[0].name} vs ${series[1].name}. ` + topics.topics.map((t, i) => `${t.label} (${t.n} items): ${topicSpokes[i].texts[0]} vs ${topicSpokes[i].texts[1]}`).join("; ") + ".";
  const anyThin = topicSpokes.some((s) => s.thin.some(Boolean));
  return <section className="mt-8" aria-labelledby="jev12-compare" data-bh-jev12-compare data-bh-jev12-compare-a={A.key} data-bh-jev12-compare-b={B.key}>
    <h2 id="jev12-compare" className="text-xl font-semibold">Compare two systems</h2>
    <p className="bh-muted mt-1 max-w-3xl text-sm">Pick any two. The first radar shows the four axes of the JevBench Score (0–100, the values in the table above); the second shows accuracy by subject topic, over all tiers. Further out is better on every spoke.</p>
    <div className="bh-panel mt-3 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        {pick("jev12-radar-a", "System A", A.key, setA, B.key)}
        <button type="button" className="bh-button shrink-0 text-sm font-semibold" onClick={() => { setA(B.key); setB(A.key); }} aria-label="Swap system A and system B" data-bh-jev12-radar-swap>⇄ Swap</button>
        {pick("jev12-radar-b", "System B", B.key, setB, A.key)}
      </div>
      <ul className="mt-3 space-y-1 text-[13px]" aria-label="Legend" data-bh-jev12-radar-legend>
        {pair.map((r, k) => <li key={k} data-bh-jev12-radar-legend-item={k === 0 ? "a" : "b"}><Swatch s={series[k]} /><b>{k === 0 ? "A" : "B"}: {short(r.display)}</b> <span className="bh-muted">— {TYPE_LABEL[r.cls] ?? r.cls} · </span><span data-bh-jev12-radar-score={r.main.toFixed(3)}>{scoreText(r)}</span></li>)}
      </ul>
      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        <figure className="min-w-0" data-bh-jev12-radar="axes">
          <h3 className="text-base font-semibold">The four score axes</h3>
          <Radar spokes={axisSpokes} series={series} size={{ w: 420, h: 320, r: 96 }} id="jev12-radar-axes" title="Radar: the four JevBench Score axes, two systems" desc={axisDesc} />
          <figcaption className="bh-muted text-[12px]">Speed includes the latency adjustment for self-hosted and demo endpoints — an assumption, see <a href="#limits" className="text-accent underline">Limits</a>. A label-only system has no calibration (counted as 0).</figcaption>
          <details className="mt-2 text-[13px]"><summary className="cursor-pointer text-accent">Values as a table</summary>
            <table className="bh-table mt-2" data-bh-jev12-radar-table="axes"><thead><tr><th scope="col">Axis</th><th scope="col">A: {series[0].name}</th><th scope="col">B: {series[1].name}</th></tr></thead>
              <tbody>{axisSpokes.map((s) => <tr key={s.key}><th scope="row">{s.lines[0]}</th><td className="tabular">{s.texts[0]}</td><td className="tabular">{s.texts[1]}</td></tr>)}
                <tr><th scope="row">JevBench Score</th><td className="tabular">{one(A.main)}</td><td className="tabular">{one(B.main)}</td></tr></tbody></table>
          </details>
        </figure>
        <figure className="min-w-0" data-bh-jev12-radar="topics">
          <h3 className="text-base font-semibold">Accuracy by subject topic</h3>
          <Radar spokes={topicSpokes} series={series} size={{ w: 460, h: 370, r: 100 }} id="jev12-radar-topics" title="Radar: accuracy by subject topic, two systems" desc={topicDesc} />
          <figcaption className="bh-muted space-y-1 text-[12px]">
            <span className="block">Share of a topic&apos;s decisions answered correctly, easy to hard together (items per topic in the table). Topics mix tiers differently — Everyday language is mostly easy items, Rules &amp; law and Finance mostly hard ones — so compare the two systems within a topic, not topics with each other. Not part of the JevBench Score.</span>
            {anyThin && <span className="block" data-bh-jev12-radar-thin>Grey “n=…”: a partial run answered fewer than {min} items of that topic — too few to plot.</span>}
            <span className="block">Topics: one per item, drafted by a model and checked by hand — <a className="text-accent underline" href="https://github.com/fstandhartinger/jevbench/blob/main/datasets/TOPICS.md">method</a>. Held-out items count in the totals; their texts stay private.</span>
          </figcaption>
          <details className="mt-2 text-[13px]"><summary className="cursor-pointer text-accent">Values as a table</summary>
            <div className="bh-table-wrap"><table className="bh-table mt-2" data-bh-jev12-radar-table="topics"><thead><tr><th scope="col">Topic (items)</th><th scope="col">A: {series[0].name}</th><th scope="col">B: {series[1].name}</th></tr></thead>
              <tbody>{topics.topics.map((t, i) => <tr key={t.key} title={t.covers}><th scope="row" className="text-left font-normal"><b>{t.label}</b> <span className="bh-muted">({t.n})</span><span className="bh-muted block text-[11px]">{t.covers}</span></th>
                {cells.map((c, k) => <td key={k} className={`tabular ${topicSpokes[i].thin[k] ? "bh-muted" : ""}`}>{pct(c[t.key].accuracy)} <span className="bh-muted block text-[11px]">{c[t.key].correct} of {c[t.key].attempted}{c[t.key].attempted < c[t.key].n ? ` answered (of ${c[t.key].n})` : ""}{topicSpokes[i].thin[k] ? " — too few" : ""}</span></td>)}</tr>)}</tbody></table></div>
          </details>
        </figure>
      </div>
    </div>
  </section>;
}
