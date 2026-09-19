"use client";
import { Fragment, useEffect, useMemo, useState } from "react";
import type { JevRow, JevView } from "../lib/jevbench.mjs";

// CR-84.2: five independent axes, each sortable, no combined winner. Complete runs are the ranking; a run that stopped
// early is listed below it with its denominator and never interleaved. Unknown values sort last in both directions.
type Axis = "smart" | "cheap" | "fast" | "reliable" | "open";
const AXES: { id: Axis; label: string; hint: string }[] = [
  { id: "smart", label: "Smart", hint: "accuracy" },
  { id: "cheap", label: "Cheap", hint: "$ per 1,000" },
  { id: "fast", label: "Fast", hint: "median latency" },
  { id: "reliable", label: "Reliable", hint: "calibration (ECE)" },
  { id: "open", label: "Open", hint: "code & weights" },
];
const OPEN_RANK = { yes: 0, weights: 1, no: 2 } as const;
const OPEN_LABEL = { yes: "Open", weights: "Open weights", no: "Closed" } as const;
const metric = (r: JevRow, a: Axis): number | null =>
  a === "smart" ? r.accuracy : a === "cheap" ? r.cost : a === "fast" ? r.p50 : a === "reliable" ? r.ece : OPEN_RANK[r.open];
// Natural direction per axis: higher accuracy is better; lower cost, latency, ECE and openness rank are better.
const HIGHER_BETTER: Record<Axis, boolean> = { smart: true, cheap: false, fast: false, reliable: false, open: false };

const pct = (v: number | null, d = 1) => (v === null ? "—" : `${(v * 100).toFixed(d)}%`);
const sec = (v: number | null) => (v === null ? "—" : `${v.toFixed(2)} s`);
const usd = (v: number | null) => (v === null ? null : `$${v.toFixed(3)}`);
const short = (display: string) => display.split(" (")[0];
const FAMILY_LABEL: Record<string, string> = { adequacy: "Answer adequacy", extraction: "Extraction", intent: "Intent", ordinal: "Ordinal rating", policy: "Policy", routing: "Routing" };

function sortRows(rows: JevRow[], axis: Axis, flip: boolean) {
  const better = HIGHER_BETTER[axis] !== flip;
  return [...rows].sort((a, b) => {
    const x = metric(a, axis), y = metric(b, axis);
    if (x === null || y === null) return x === null && y === null ? a.display.localeCompare(b.display) : x === null ? 1 : -1;
    return (better ? y - x : x - y) || (b.accuracy ?? 0) - (a.accuracy ?? 0) || a.display.localeCompare(b.display);
  });
}

function Linkish({ text }: { text: string }) {
  const m = /^(https:\/\/\S+)(.*)$/.exec(text);
  return m ? <><a className="text-accent underline" href={m[1]}>{m[1].replace(/^https:\/\//, "")}</a>{m[2]}</> : <>{text}</>;
}

function CostCell({ r }: { r: JevRow }) {
  if (r.cost === null) return <span className="bh-muted" title="This route has no per-token bill to us (public demo, flat-rate subscription or our own CPU). Not zero: the compute is real.">no tariff</span>;
  return <span>{usd(r.cost)}{r.costKnown < r.nAttempted && <span className="bh-muted block text-[11px]">over {r.costKnown}/{r.nAttempted} metered</span>}</span>;
}

function Detail({ r, view }: { r: JevRow; view: JevView }) {
  const fams = Object.keys(view.familyFloors);
  const cohorts = Object.keys(view.cohortFloors);
  const kv = (k: string, v: React.ReactNode) => <div className="flex gap-2"><dt className="bh-muted shrink-0">{k}</dt><dd className="min-w-0 break-words">{v}</dd></div>;
  return <div className="grid gap-5 text-[13px] md:grid-cols-3" data-bh-jev-detail={r.key}>
    <div>
      <p className="mb-1.5 font-semibold">By family</p>
      <table className="w-full tabular"><thead><tr className="bh-muted text-left text-[11px]"><th className="font-normal">Family (n)</th><th className="font-normal">Accuracy</th><th className="font-normal">Floor</th></tr></thead>
        <tbody>{fams.map((f) => <tr key={f}><td>{FAMILY_LABEL[f] ?? f} ({view.familyFloors[f].n})</td><td data-bh-jev-family={f}>{pct(r.byFamily[f]?.accuracy ?? null)}{r.byFamily[f] && r.byFamily[f].n < r.byFamily[f].planned && <span className="bh-muted"> · {r.byFamily[f].n}/{r.byFamily[f].planned}</span>}</td><td className="bh-muted">{pct(view.familyFloors[f].floor)}</td></tr>)}</tbody></table>
      <p className="mb-1.5 mt-3 font-semibold">By cohort</p>
      <table className="w-full tabular"><tbody>{cohorts.map((c) => <tr key={c}><td>{c} ({view.cohortFloors[c].n})</td><td>{pct(r.byCohort[c]?.accuracy ?? null)}</td><td className="bh-muted">floor {pct(view.cohortFloors[c].floor)}</td></tr>)}</tbody></table>
      <p className="bh-muted mt-1 text-[11px]">Floor = always answering with the commonest label.</p>
    </div>
    <div>
      <p className="mb-1.5 font-semibold">How it was reached</p>
      <dl className="space-y-1">
      {kv("Interface", <code>{r.adapter}</code>)}
      {kv("Probabilities", r.probability)}
      {kv("Resolved as", <code>{r.identity}</code>)}
      {r.reasoningEffort && kv("Reasoning effort", r.reasoningEffort)}
      {kv("First request", sec(r.firstRequest))}
      {r.meanIn !== null && kv("Mean tokens in / out", `${Math.round(r.meanIn)} / ${Math.round(r.meanOut ?? 0)}`)}
      {kv("Failed requests", r.failedN ? `${r.failedN} (median ${sec(r.failedP50)})` : "0")}
      {r.truncated > 0 && kv("Input cut", `${r.truncated} of ${r.nAttempted} decisions did not fit the model's window`)}
      {r.runStarted && kv("Run (UTC)", `${r.runStarted.slice(0, 16).replace("T", " ")} → ${(r.runFinished ?? "").slice(11, 16)}`)}
      {r.stopReason && kv("Stopped", r.stopReason)}
    </dl></div>
    <div>
      <p className="mb-1.5 font-semibold">Reliability, price, licence</p>
      <dl className="space-y-1">
      {kv("Brier (sum)", r.brier === null ? "—" : r.brier.toFixed(3))}
      {kv("Operational success", pct(r.opSuccess))}
      {kv("Exact-sum answers", `${pct(r.validityStrict)} (renormalized ${r.renormalized})`)}
      {kv("Rephrasing, both correct", `${pct(r.bothCorrect)} of ${r.pairs} pairs`)}
      {kv("Price basis", r.cost === null ? "no per-token tariff on this route" : `${r.costBasis.join(", ")} · $${r.priceIn}/M in, $${r.priceOut}/M out`)}
      {kv("Price source", <Linkish text={r.priceSource} />)}
      {kv("Licence", r.licence)}
      {r.repo && kv("Project", <a className="text-accent underline" href={r.repo}>{r.repo.replace(/^https:\/\//, "")}</a>)}
    </dl></div>
  </div>;
}

function Row({ r, view, open, toggle, partial }: { r: JevRow; view: JevView; open: boolean; toggle: () => void; partial?: boolean }) {
  const id = `jev-detail-${r.key}`;
  return <Fragment>
    <tr data-bh-jev-row={r.key} data-bh-jev-accuracy={r.accuracy ?? ""} data-bh-jev-cost={r.cost ?? ""} data-bh-jev-p50={r.p50 ?? ""} data-bh-jev-ece={r.ece ?? ""}>
      <th scope="row" className="bh-jev-sticky text-left font-normal">
        <button type="button" className="flex min-h-11 w-full items-start gap-2 text-left" aria-expanded={open} aria-controls={id} onClick={toggle}>
          <span aria-hidden="true" className={`bh-row-chevron mt-1 inline-block transition-transform ${open ? "rotate-90" : ""}`}>›</span>
          <span className="min-w-0"><span className="bh-muted block text-[11px] leading-tight">{r.author}</span><span className="block font-semibold leading-snug">{short(r.display)}</span>
            {r.display !== short(r.display) && r.display.slice(short(r.display).length + 2, -1) !== r.author && <span className="bh-muted block text-[11px] leading-tight">{r.display.slice(short(r.display).length + 2, -1)}</span>}
            {partial && <span className="bh-thin-tag mt-1 inline-block">stopped early · {r.nAttempted}/{r.nPlanned}</span>}</span>
        </button>
      </th>
      <td className="tabular"><b>{pct(r.accuracy)}</b>{r.ciLo !== null && <span className="bh-muted block text-[11px]">{pct(r.ciLo)}–{pct(r.ciHi)}</span>}</td>
      <td className="tabular"><CostCell r={r} /></td>
      <td className="tabular">{sec(r.p50)}<span className="bh-muted block text-[11px]">p95 {sec(r.p95)}</span></td>
      <td className="tabular">{r.ece === null ? "—" : r.ece.toFixed(3)}<span className="bh-muted block text-[11px]">{r.probability}</span></td>
      <td className="tabular">{pct(r.validity)}</td>
      <td className="tabular">{pct(r.sameAnswer)}<span className="bh-muted block text-[11px]">{r.pairs} pairs</span></td>
      <td>{OPEN_LABEL[r.open]}</td>
    </tr>
    {open && <tr id={id}><td colSpan={8} className="bg-[rgb(var(--ink))]"><Detail r={r} view={view} /></td></tr>}
  </Fragment>;
}

function Table({ view }: { view: JevView }) {
  const [axis, setAxis] = useState<Axis>("smart");
  const [flip, setFlip] = useState(false);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const rows = useMemo(() => sortRows(view.ranked, axis, flip), [view.ranked, axis, flip]);
  const toggle = (k: string) => setOpen((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const pick = (a: Axis) => { if (a === axis) setFlip((f) => !f); else { setAxis(a); setFlip(false); } };
  const col = (a: Axis) => AXES.findIndex((x) => x.id === a);
  // Higher-is-better first reads as descending; lower-first (cost, latency, ECE, openness rank) as ascending.
  const sortState = (a: Axis): "ascending" | "descending" | undefined => (a !== axis ? undefined : HIGHER_BETTER[a] !== flip ? "descending" : "ascending");
  const head = (a: Axis, extra?: string) => <th scope="col" aria-sort={sortState(a) ?? "none"} className="whitespace-nowrap">
    <button type="button" className={`inline-flex min-h-9 items-center gap-1 rounded px-1 text-left ${axis === a ? "text-accent" : ""}`} onClick={() => pick(a)} data-bh-jev-sort={a}>
      <span><span className="block text-[13px] font-semibold">{AXES[col(a)].label}</span><span className="block font-normal">{extra ?? AXES[col(a)].hint}</span></span>
      <span aria-hidden="true">{axis === a ? (sortState(a) === "descending" ? "↓" : "↑") : ""}</span>
    </button></th>;
  return <section className="mt-6" aria-labelledby="jev-table-title">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2 id="jev-table-title" className="text-xl font-semibold">All five axes</h2>
      <div role="group" aria-label="Sort by axis" className="flex flex-wrap gap-1 text-sm">
        {AXES.map((a) => <button key={a.id} type="button" aria-pressed={axis === a.id} onClick={() => pick(a.id)} className={`min-h-9 rounded-full border px-3 ${axis === a.id ? "border-accent bg-accent/10 text-accent" : "border-line"}`}>{a.label}</button>)}
      </div>
    </div>
    <p className="bh-muted mt-1 text-sm">Sort by any axis; nothing is combined. Unknown values always sort last. Open a row for per-family accuracy, settings, price receipts and licence.</p>
    <div className="bh-table-wrap mt-3">
      <table className="bh-table bh-jev-table" data-bh-jev-table>
        <thead><tr>
          <th scope="col" className="bh-jev-sticky">System</th>
          {head("smart", "accuracy · 95% CI")}{head("cheap", "$ per 1,000 decisions")}{head("fast", "p50 · p95")}{head("reliable", "ECE · probabilities")}
          <th scope="col" className="whitespace-nowrap">Valid<span className="block font-normal">answers</span></th>
          <th scope="col" className="whitespace-nowrap">Same answer<span className="block font-normal">on a rephrasing</span></th>
          {head("open", "code & weights")}
        </tr></thead>
        <tbody>
          {rows.map((r) => <Row key={r.key} r={r} view={view} open={open.has(r.key)} toggle={() => toggle(r.key)} />)}
          {view.partial.length > 0 && <tr><td colSpan={8} className="bh-muted text-[12px]"><span className="sticky left-3 inline-block max-w-[330px] whitespace-normal">Stopped early — shown with its own denominator, not ranked against complete runs:</span></td></tr>}
          {view.partial.map((r) => <Row key={r.key} r={r} view={view} open={open.has(r.key)} toggle={() => toggle(r.key)} partial />)}
        </tbody>
      </table>
    </div>
  </section>;
}

// ---- Charts ----------------------------------------------------------------------------------------------------------
const M = { l: 44, r: 12, t: 14, b: 44 };
/** Phones get a narrower drawing so 11 px chart text stays about 11 px on screen instead of scaling down to ~6 px. */
function useNarrow() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => { const q = window.matchMedia("(max-width: 639px)"); const on = () => setNarrow(q.matches); on(); q.addEventListener("change", on); return () => q.removeEventListener("change", on); }, []);
  return narrow;
}
type Pt = { r: JevRow; x: number; y: number };

/** Greedy label placement: right of the point, else left, else nudged up/down, with a leader line when moved. */
function placeLabels(pts: Pt[], sx: (v: number) => number, sy: (v: number) => number, W: number) {
  // The dots themselves are obstacles too, so no label is written across another point.
  const boxes: { x: number; y: number; w: number; h: number }[] = pts.map((p) => ({ x: sx(p.x) - 6, y: sy(p.y) - 6, w: 12, h: 12 }));
  const hit = (b: { x: number; y: number; w: number; h: number }) => boxes.some((o) => b.x < o.x + o.w && o.x < b.x + b.w && b.y < o.y + o.h && o.y < b.y + b.h) || b.x < M.l || b.x + b.w > W - 2;
  return [...pts].sort((a, b) => b.y - a.y).map((p) => {
    const px = sx(p.x), py = sy(p.y), w = short(p.r.display).length * 6.6 + 6, h = 14;
    const tries = [[8, -h / 2], [-w - 8, -h / 2], [8, -h - 6], [8, 6], [-w - 8, -h - 6], [-w - 8, 6], [8, -2 * h - 6], [8, h + 6], [-w - 8, h + 6]];
    let best = { x: px + 8, y: py - h / 2, moved: false };
    for (const [dx, dy] of tries) { const b = { x: px + dx, y: py + dy, w, h }; if (!hit(b)) { best = { x: b.x, y: b.y, moved: Math.abs(dy + h / 2) > 1 }; break; } }
    boxes.push({ ...best, w, h });
    return { p, px, py, lx: best.x, ly: best.y, w, moved: best.moved };
  });
}

function Scatter({ view }: { view: JevView }) {
  const [xAxis, setXAxis] = useState<"cost" | "p50">("cost");
  const [active, setActive] = useState<string | null>(null);
  const narrow = useNarrow();
  const W = narrow ? 360 : 640, H = narrow ? 320 : 360;
  // Only complete runs are peers; a stopped run evaluated a different subset (CR-84 SPEC: common split only).
  const all = view.ranked;
  const pts: Pt[] = all.filter((r) => r.accuracy !== null && (xAxis === "cost" ? r.cost !== null : r.p50 !== null)).map((r) => ({ r, x: (xAxis === "cost" ? r.cost : r.p50) as number, y: r.accuracy as number }));
  const omitted = all.filter((r) => !pts.some((p) => p.r.key === r.key));
  const xMax = Math.max(...pts.map((p) => p.x)) * 1.12;
  const yMin = Math.floor(Math.min(...pts.map((p) => p.y)) * 20) / 20 - 0.02, yMax = 1;
  const sx = (v: number) => M.l + (v / xMax) * (W - M.l - M.r);
  const sy = (v: number) => M.t + ((yMax - v) / (yMax - yMin)) * (H - M.t - M.b);
  const xticks = Array.from({ length: 5 }, (_, i) => (xMax / 5) * i);
  const span = yMax - yMin, step = span <= 0.12 ? 0.02 : span <= 0.3 ? 0.05 : 0.1;
  const yticks: number[] = []; for (let v = Math.ceil(yMin / step - 1e-9) * step; v <= yMax + 1e-9; v += step) yticks.push(Math.round(v * 100) / 100);
  const labels = placeLabels(pts, sx, sy, W);
  const fmtX = (v: number) => (v === 0 ? "0" : xAxis === "cost" ? `$${v.toFixed(v < 0.1 ? 3 : 2)}` : `${v.toFixed(1)} s`);
  const color = (r: JevRow) => (r.probability === "native" ? "rgb(var(--accent))" : "rgb(var(--accent2))");
  return <figure className="bh-panel p-4" data-bh-jev-scatter={xAxis}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <figcaption className="font-semibold">Accuracy vs {xAxis === "cost" ? "cost" : "speed"}</figcaption>
      <div role="group" aria-label="Horizontal axis" className="flex gap-1 text-sm">
        {(["cost", "p50"] as const).map((k) => <button key={k} type="button" aria-pressed={xAxis === k} onClick={() => setXAxis(k)} className={`min-h-9 rounded-full border px-3 ${xAxis === k ? "border-accent bg-accent/10 text-accent" : "border-line"}`}>{k === "cost" ? "$ per 1,000" : "Median latency"}</button>)}
      </div>
    </div>
    <p className="bh-muted mt-1 text-xs">Up is more accurate, left is {xAxis === "cost" ? "cheaper" : "faster"}. <span style={{ color: "rgb(var(--accent))" }}>●</span> native probabilities · <span style={{ color: "rgb(var(--accent2))" }}>●</span> verbalized. Complete runs only.</p>
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 h-auto w-full" role="group" aria-label={`Accuracy against ${xAxis === "cost" ? "dollars per 1,000 decisions" : "median latency"}, one point per system`}>
      {yticks.map((t) => <g key={`y${t}`}><line x1={M.l} x2={W - M.r} y1={sy(t)} y2={sy(t)} stroke="rgb(var(--line))" strokeWidth="1" /><text x={M.l - 6} y={sy(t) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">{Math.round(t * 100)}%</text></g>)}
      {xticks.map((t) => <text key={`x${t}`} x={sx(t)} y={H - M.b + 16} textAnchor="middle" fontSize="11" fill="var(--muted)">{fmtX(t)}</text>)}
      <text x={(M.l + W - M.r) / 2} y={H - 6} textAnchor="middle" fontSize="11" fill="var(--muted)">{xAxis === "cost" ? "USD per 1,000 decisions (provider tariff × measured usage)" : "Median end-to-end latency, seconds (serial, from Germany)"}</text>
      {labels.map(({ p, px, py, lx, ly, w, moved }) => {
        const on = active === p.r.key;
        const ci = p.r.ciLo !== null && p.r.ciHi !== null;
        return <g key={p.r.key} tabIndex={0} role="img" data-bh-jev-point={p.r.key}
          aria-label={`${p.r.display}: ${pct(p.r.accuracy)} accuracy${ci ? ` (95% CI ${pct(p.r.ciLo)}–${pct(p.r.ciHi)})` : ""}, ${xAxis === "cost" ? `${usd(p.r.cost)} per 1,000 decisions` : `median ${sec(p.r.p50)}`}, ${p.r.probability} probabilities`}
          onFocus={() => setActive(p.r.key)} onBlur={() => setActive(null)} onMouseEnter={() => setActive(p.r.key)} onMouseLeave={() => setActive(null)} className="outline-none">
          {ci && <line x1={px} x2={px} y1={sy(Math.min(1, p.r.ciHi as number))} y2={sy(Math.max(yMin, p.r.ciLo as number))} stroke={color(p.r)} strokeOpacity=".45" strokeWidth="2" />}
          {moved && <line x1={px} y1={py} x2={lx < px ? lx + w : lx} y2={ly + 7} stroke="var(--muted)" strokeOpacity=".5" strokeWidth="1" />}
          <circle cx={px} cy={py} r={on ? 7 : 5.5} fill={color(p.r)} stroke="var(--surface)" strokeWidth="1.5" />
          {on && <circle cx={px} cy={py} r="11" fill="none" stroke="rgb(var(--accent))" strokeWidth="2" />}
          <text x={lx + 3} y={ly + 11} fontSize="11.5" fontWeight={on ? 700 : 500} fill="var(--text)">{short(p.r.display)}</text>
        </g>;
      })}
    </svg>
    {active && (() => { const r = all.find((x) => x.key === active)!; return <p className="mt-1 text-sm" aria-live="polite" data-bh-jev-point-readout><b>{r.display}</b> — {pct(r.accuracy)} ({pct(r.ciLo)}–{pct(r.ciHi)}) · {r.cost === null ? "no tariff" : `${usd(r.cost)}/1k`} · median {sec(r.p50)}</p>; })()}
    {omitted.length > 0 && <p className="bh-muted mt-2 text-xs" data-bh-jev-omitted>Not plotted: {omitted.map((r) => short(r.display)).join(", ")} — {xAxis === "cost" ? "no per-token tariff on the measured route, so there is no cost to place — never drawn as free" : "no latency measured"}. {view.partial.length > 0 && <>Runs that stopped early ({view.partial.map((r) => short(r.display)).join(", ")}) answered a different subset and are left out of both charts.</>}</p>}
  </figure>;
}

function Calibration({ view }: { view: JevView }) {
  const rows = view.ranked.filter((r) => r.ece !== null);
  const [key, setKey] = useState(rows[0]?.key ?? "");
  const r = rows.find((x) => x.key === key) ?? rows[0];
  if (!r) return null;
  const S = 300, P = 40;
  const sc = (v: number) => P + v * (S - P - 10);
  const sy = (v: number) => S - P + 10 - v * (S - P - 10) - 10;
  const filled = r.bins.filter((b) => b.n > 0);
  const maxN = Math.max(...filled.map((b) => b.n));
  const color = r.probability === "native" ? "rgb(var(--accent))" : "rgb(var(--accent2))";
  return <figure className="bh-panel p-4" data-bh-jev-calibration={r.key}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <figcaption className="font-semibold">Calibration</figcaption>
      <label className="text-sm"><span className="sr-only">System</span>
        <select value={r.key} onChange={(e) => setKey(e.target.value)} className="min-h-9 max-w-[16rem] rounded-md border border-line bg-[var(--surface)] px-2">
          {rows.map((x) => <option key={x.key} value={x.key}>{short(x.display)} ({x.probability})</option>)}
        </select></label>
    </div>
    <p className="bh-muted mt-1 text-xs">Stated confidence against how often the top answer was right, ten fixed bins; on the diagonal is perfectly calibrated. Dot size = decisions in the bin; empty bins are left out, never interpolated. ECE <b className="text-gray-200">{r.ece?.toFixed(3)}</b> · <span style={{ color }}>{r.probability}</span> probabilities.</p>
    <svg viewBox={`0 0 ${S} ${S}`} className="mx-auto mt-2 h-auto w-full max-w-[340px]" role="img" aria-label={`Calibration of ${r.display}: ${filled.length} non-empty bins; exact values in the table below`}>
      {[0, 0.5, 1].map((t) => <g key={t}><text x={P - 6} y={sy(t) + 4} textAnchor="end" fontSize="10" fill="var(--muted)">{t * 100}%</text><text x={sc(t)} y={S - 12} textAnchor="middle" fontSize="10" fill="var(--muted)">{t * 100}%</text></g>)}
      <rect x={sc(0)} y={sy(1)} width={sc(1) - sc(0)} height={sy(0) - sy(1)} fill="none" stroke="rgb(var(--line))" />
      <line x1={sc(0)} y1={sy(0)} x2={sc(1)} y2={sy(1)} stroke="var(--muted)" strokeDasharray="4 4" />
      {filled.map((b) => <circle key={b.lo} cx={sc(b.confidence as number)} cy={sy(b.accuracy as number)} r={3 + 9 * Math.sqrt(b.n / maxN)} fill={color} fillOpacity=".7" stroke="var(--surface)" />)}
      <text x={(sc(0) + sc(1)) / 2} y={S} textAnchor="middle" fontSize="10" fill="var(--muted)">stated confidence</text>
    </svg>
    <details className="mt-2 text-xs"><summary className="cursor-pointer">Bin table</summary>
      <table className="mt-2 w-full tabular" data-bh-jev-bins><thead><tr className="bh-muted text-left"><th className="font-normal">Bin</th><th className="font-normal">n</th><th className="font-normal">Mean confidence</th><th className="font-normal">Accuracy</th></tr></thead>
        <tbody>{r.bins.map((b) => <tr key={b.lo}><td>{b.lo.toFixed(1)}–{b.hi.toFixed(1)}</td><td>{b.n}</td><td>{b.confidence === null ? "—" : pct(b.confidence)}</td><td>{b.accuracy === null ? "—" : pct(b.accuracy)}</td></tr>)}</tbody></table>
    </details>
  </figure>;
}

export function JevModelsBoard({ view }: { view: JevView }) {
  return <>
    <section className="mt-6 max-w-4xl" aria-labelledby="jev-findings">
      <h2 id="jev-findings" className="text-xl font-semibold">What the run says</h2>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[15px]" data-bh-jev-findings>{view.findings.map((f) => <li key={f.id}>{f.text}</li>)}</ul>
    </section>
    <div className="mt-6 grid gap-4 lg:grid-cols-[3fr_2fr]">
      <Scatter view={view} />
      <Calibration view={view} />
    </div>
    <Table view={view} />
  </>;
}
