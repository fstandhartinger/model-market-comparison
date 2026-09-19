"use client";
import { useMemo, useState } from "react";
import type { JevTier, JevV11Row, JevV11View } from "../lib/jevbench-v11.mjs";

// CR-86 (Florian 2026-09-19): one JevBench Main Score = 0.6 × Capability + 0.2 × Speed + 0.2 × Cost, the sub-scores and
// tiers beside it, all sortable (nulls last both ways); partial runs below, greyed, unranked. Every value is the artifact's.
const TIER_ORDER: JevTier[] = ["easy", "standard", "judge"];
const TIER_LABEL: Record<JevTier, string> = { easy: "Easy", standard: "Standard", judge: "Judge" };
type Col = "main" | "capability" | "speed" | "cost" | JevTier | "p50" | "usd" | "brier";
const HIGHER: Record<Col, boolean> = { main: true, capability: true, speed: true, cost: true, easy: true, standard: true, judge: true, p50: false, usd: false, brier: false };
const val = (r: JevV11Row, c: Col): number | null =>
  c === "main" || c === "capability" || c === "speed" || c === "cost" ? r[c] : c === "p50" ? r.p50 : c === "usd" ? r.usd : c === "brier" ? r.brier : r.tiers[c];

const one = (v: number | null) => (v === null ? "—" : v.toFixed(1));
const pct = (v: number | null) => (v === null ? "—" : `${(v * 100).toFixed(1)}%`);
const sec = (v: number | null) => (v === null ? "—" : `${v.toFixed(2)} s`);
const short = (d: string) => d.split(" (")[0];
const SEG = { capability: "rgb(var(--accent))", speed: "rgb(var(--accent2))", cost: "rgb(var(--warn))" } as const;

export function CostValue({ r }: { r: JevV11Row }) {
  if (r.costKind === "unknown" || r.usd === null) return <span className="bh-muted" title={r.costBasis}>no tariff</span>;
  const v = `$${r.usd.toFixed(3)}`;
  return r.costKind === "estimate"
    ? <span title={r.costBasis} data-bh-jev11-cost-kind="estimate">~{v} <span className="bh-thin-tag">est.</span></span>
    : <span title={r.costBasis} data-bh-jev11-cost-kind="measured">{v}</span>;
}

function MainChart({ view }: { view: JevV11View }) {
  const w = view.weights;
  const rows = [...view.ranked, ...view.partial];
  return <figure className="bh-panel p-4" data-bh-jev11-main-chart>
    <figcaption className="font-semibold">JevBench Main Score</figcaption>
    <p className="bh-muted mt-1 text-xs">Each bar is the sum of its three weighted parts:{" "}
      <span className="whitespace-nowrap"><span aria-hidden="true" style={{ color: SEG.capability }}>■</span> Capability × {w.capability}</span> ·{" "}
      <span className="whitespace-nowrap"><span aria-hidden="true" style={{ color: SEG.speed }}>■</span> Speed × {w.speed}</span> ·{" "}
      <span className="whitespace-nowrap"><span aria-hidden="true" style={{ color: SEG.cost }}>■</span> Cost × {w.cost}</span></p>
    <ol className="mt-3 space-y-2.5">
      {rows.map((r) => {
        const parts = r.capability === null || r.speed === null || r.cost === null ? null
          : [["capability", w.capability * r.capability], ["speed", w.speed * r.speed], ["cost", w.cost * r.cost]] as const;
        const rank = r.ranked ? view.ranked.indexOf(r) + 1 : null;
        // Phones: the name sits above a full-width bar; from 640 px name and bar share one line.
        return <li key={r.key} className={`grid grid-cols-[1.4rem_1fr_2.6rem] items-center gap-2 text-sm sm:grid-cols-[1.6rem_1fr_3rem] ${r.ranked ? "" : "opacity-60"}`} data-bh-jev11-bar={r.key}>
          <span className="bh-muted tabular text-right text-xs">{rank ?? ""}</span>
          <span className="min-w-0 sm:grid sm:grid-cols-[13rem_1fr] sm:items-center sm:gap-2">
          <span className="block min-w-0 truncate" title={r.display}>{short(r.display)}{r.note && r.ranked && r.key.endsWith("-tools") ? "*" : ""}{!r.ranked && <span className="bh-muted"> · partial</span>}</span>
          <span className={`relative mt-1 flex h-3.5 overflow-hidden rounded-sm sm:mt-0 sm:h-4 bg-[rgb(var(--line)/.35)] ${r.ranked ? "" : "bh-jev11-hatched"}`}
            role="img" aria-label={parts ? `${r.display}: Main Score ${one(r.main)} = capability ${one(r.capability)} × ${w.capability} + speed ${one(r.speed)} × ${w.speed} + cost ${one(r.cost)} × ${w.cost}${r.ranked ? "" : " (partial run, not ranked)"}` : `${r.display}: not scored (partial run)`}>
            {parts?.map(([k, v]) => <span key={k} style={{ width: `${v}%`, background: SEG[k] }} className="h-full border-r border-[var(--surface)] last:border-r-0" title={`${k} ${one(v)}`} />)}
          </span></span>
          <b className="tabular text-right" data-bh-jev11-main={r.main ?? ""}>{r.main === null ? <span className="bh-muted text-xs font-normal">n/a</span> : one(r.main)}</b>
        </li>;
      })}
    </ol>
  </figure>;
}

function Table({ view }: { view: JevV11View }) {
  const [col, setCol] = useState<Col>("main");
  const [flip, setFlip] = useState(false);
  const sort = (rows: JevV11Row[]) => {
    const better = HIGHER[col] !== flip;
    return [...rows].sort((a, b) => {
      const x = val(a, col), y = val(b, col);
      if (x === null || y === null) return x === null && y === null ? 0 : x === null ? 1 : -1;
      return (better ? y - x : x - y) || (b.main ?? -1) - (a.main ?? -1);
    });
  };
  const ranked = useMemo(() => sort(view.ranked), [view.ranked, col, flip]); // eslint-disable-line react-hooks/exhaustive-deps
  const partial = useMemo(() => sort(view.partial), [view.partial, col, flip]); // eslint-disable-line react-hooks/exhaustive-deps
  const headRank = new Map(view.ranked.map((r, i) => [r.key, i + 1]));
  const pick = (c: Col) => { if (c === col) setFlip((f) => !f); else { setCol(c); setFlip(false); } };
  const aria = (c: Col) => (c !== col ? "none" : HIGHER[c] !== flip ? "descending" : "ascending");
  const H = ({ c, label, sub }: { c: Col; label: string; sub?: string }) => <th scope="col" aria-sort={aria(c)} className="whitespace-nowrap">
    <button type="button" data-bh-jev11-sort={c} onClick={() => pick(c)} className={`inline-flex min-h-9 items-center gap-1 rounded px-1 text-left ${col === c ? "text-accent" : ""}`}>
      <span><span className="block text-[13px] font-semibold">{label}</span>{sub && <span className="block font-normal">{sub}</span>}</span>
      <span aria-hidden="true">{col === c ? (aria(c) === "descending" ? "↓" : "↑") : ""}</span></button></th>;
  const notes = [...view.ranked, ...view.partial].filter((r) => r.note);
  const R = ({ r }: { r: JevV11Row }) => <tr data-bh-jev11-row={r.key} data-bh-jev11-ranked={r.ranked ? "1" : "0"} className={r.ranked ? "" : "bh-jev11-partial"}>
    <td className="bh-muted tabular">{r.ranked ? headRank.get(r.key) : ""}</td>
    <th scope="row" className="bh-jev-sticky text-left font-normal"><span className="bh-muted block text-[11px] leading-tight">{r.author}</span>
      <span className="block font-semibold leading-snug">{short(r.display)}{r.note ? <sup>{notes.indexOf(r) + 1}</sup> : null}</span>
      {r.display !== short(r.display) && r.display.slice(short(r.display).length + 2, -1) !== r.author && <span className="bh-muted block text-[11px] leading-tight">{r.display.slice(short(r.display).length + 2, -1)}</span>}
      {!r.ranked && <span className="bh-thin-tag mt-1 inline-block">partial · not ranked</span>}</th>
    <td className="tabular"><b>{one(r.main)}</b></td>
    <td className="tabular">{one(r.capability)}</td><td className="tabular">{one(r.speed)}</td><td className="tabular">{one(r.cost)}</td>
    {TIER_ORDER.map((t) => <td key={t} className="tabular">{pct(r.tiers[t])}{r.coverage[t] !== null && r.coverage[t]! < 1 && <span className="bh-muted block text-[11px]">{Math.round(r.coverage[t]! * 100)}% answered</span>}</td>)}
    <td className="tabular">{sec(r.p50)}<span className="bh-muted block text-[11px]">p95 {sec(r.p95)}</span></td>
    <td className="tabular"><CostValue r={r} /></td>
    <td className="tabular">{r.hasDistribution ? (r.brier === null ? "—" : r.brier.toFixed(3)) : <span className="bh-muted text-[12px]" title={r.calibrationNote ?? undefined} data-bh-jev11-no-dist>no calibrated distribution</span>}{r.hasDistribution && <span className="bh-muted block text-[11px]">{r.probability}</span>}</td>
  </tr>;
  return <section className="mt-8" aria-labelledby="jev11-table">
    <h2 id="jev11-table" className="text-xl font-semibold">Scores, tiers, latency and cost</h2>
    <p className="bh-muted mt-1 text-sm">Sort by any column; values the run could not produce always sort last. Hover a cost for how it was priced.</p>
    <div className="bh-table-wrap mt-3">
      <table className="bh-table bh-jev-table" data-bh-jev11-table>
        <thead><tr>
          <th scope="col"><span className="sr-only">Rank</span>#</th>
          <th scope="col" className="bh-jev-sticky">System</th>
          <H c="main" label="Main" sub="score" /><H c="capability" label="Capability" sub={`× ${view.weights.capability}`} /><H c="speed" label="Speed" sub={`× ${view.weights.speed}`} /><H c="cost" label="Cost" sub={`× ${view.weights.cost}`} />
          {TIER_ORDER.map((t) => <H key={t} c={t} label={TIER_LABEL[t]} sub={`${view.tierCounts[t]} decisions`} />)}
          <H c="p50" label="Latency" sub="p50 · p95" /><H c="usd" label="$ per 1,000" sub="decisions" /><H c="brier" label="Calibration" sub="Brier (not scored)" />
        </tr></thead>
        <tbody>
          {ranked.map((r) => <R key={r.key} r={r} />)}
          {partial.length > 0 && <tr><td colSpan={14} className="bh-muted text-[12px]"><span className="sticky left-3 inline-block max-w-[330px] whitespace-normal">Partial runs — shown, not ranked: {view.scoring.ranked}</span></td></tr>}
          {partial.map((r) => <R key={r.key} r={r} />)}
        </tbody>
      </table>
    </div>
    {notes.length > 0 && <ol className="bh-muted mt-2 list-decimal space-y-1 pl-5 text-xs" data-bh-jev11-notes>{notes.map((r) => <li key={r.key}><b className="text-gray-200">{short(r.display)}</b>: {r.note}</li>)}</ol>}
  </section>;
}

function Sensitivity({ view }: { view: JevV11View }) {
  const [head, ...rest] = view.sensitivityOrder;
  const order = [head, ...rest];
  return <section className="mt-8" aria-labelledby="jev11-sens">
    <h2 id="jev11-sens" className="text-xl font-semibold">How the ranking moves with other weights</h2>
    <p className="bh-muted mt-1 text-sm">Rank and score under six weightings of Capability / Speed / Cost. <span className="font-semibold text-[rgb(var(--warn))]">Highlighted</span> = a different rank than the headline weighting. Ranked systems only.</p>
    <div className="bh-table-wrap mt-3">
      <table className="bh-table bh-jev-table" data-bh-jev11-sensitivity>
        <thead><tr><th scope="col" className="bh-jev-sticky">System</th>{order.map((k) => <th key={k} scope="col" className="whitespace-nowrap">{k === head ? <b>{k}</b> : k}</th>)}</tr></thead>
        <tbody>{view.ranked.map((r) => <tr key={r.key} data-bh-jev11-sens-row={r.key}>
          <th scope="row" className="bh-jev-sticky text-left font-semibold">{short(r.display)}</th>
          {order.map((k) => { const moved = r.rankUnder![k] !== r.rankUnder![head]; return <td key={k} className={`tabular whitespace-nowrap ${moved ? "font-semibold text-[rgb(var(--warn))]" : ""}`} data-bh-jev11-rank={r.rankUnder![k]} data-bh-jev11-moved={moved ? "1" : "0"}>
            #{r.rankUnder![k]} <span className={moved ? "" : "bh-muted"}>{Math.round(r.sensitivity![k])}</span>{moved && <span className="sr-only"> (rank differs from headline)</span>}</td>; })}
        </tr>)}</tbody>
      </table>
    </div>
  </section>;
}

export function JevModelsV11Board({ view }: { view: JevV11View }) {
  const s = view.scoring;
  return <>
    <div className="mt-6 grid gap-4 lg:grid-cols-[3fr_2fr]">
      <MainChart view={view} />
      <section className="bh-panel p-4 text-sm" aria-labelledby="jev11-how" data-bh-jev11-formula>
        <h2 id="jev11-how" className="font-semibold">How the Main Score works</h2>
        <p className="mt-2 text-base"><b>Main = {view.weights.capability} × Capability + {view.weights.speed} × Speed + {view.weights.cost} × Cost</b>, each on 0–100.</p>
        {/* PAGE-COPY-v1.1's one-line normalisations; the artifact's full scoring rules sit in the disclosure below. */}
        <ul className="bh-muted mt-3 space-y-1.5">
          <li><b className="text-gray-200">Capability</b> — accuracy in three tiers (easy {view.tierCounts.easy}, standard {view.tierCounts.standard}, judge {view.tierCounts.judge}), averaged so no tier dominates.</li>
          <li><b className="text-gray-200">Speed</b> — median and 95th-percentile latency, one request at a time: 0.1 s scores 100, 1 s scores 50, 10 s scores 0.</li>
          <li><b className="text-gray-200">Cost</b> — dollars per 1,000 decisions; self- and author-hosted models use a stated reference deployment, marked &ldquo;est.&rdquo;: $0.01 scores 100, $1 scores 33, $10 scores 0.</li>
          <li><b className="text-gray-200">Calibration</b> is shown, not scored — some systems return only a label.</li>
        </ul>
        <details className="mt-3"><summary className="cursor-pointer text-accent">Full scoring rules</summary>
          <dl className="bh-muted mt-2 space-y-2">
            <div><dt className="inline font-semibold text-gray-200">Capability. </dt><dd className="inline">{s.capability}</dd></div>
            <div><dt className="inline font-semibold text-gray-200">Speed. </dt><dd className="inline">{s.speed}</dd></div>
            <div><dt className="inline font-semibold text-gray-200">Cost. </dt><dd className="inline">{s.cost}</dd></div>
            <div><dt className="inline font-semibold text-gray-200">Calibration. </dt><dd className="inline">{s.calibration}</dd></div>
            <div><dt className="inline font-semibold text-gray-200">Ranked. </dt><dd className="inline">{s.ranked}</dd></div>
          </dl></details>
      </section>
    </div>
    <Table view={view} />
    <Sensitivity view={view} />
  </>;
}
