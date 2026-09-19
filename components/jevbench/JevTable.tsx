"use client";
// CR-84.2: the five-axis JevBench table. Five axes, each sortable on its own, and deliberately no combined column
// (Florian 18 Sep 2026: "smart + cheap + fast + reliable + ideally open" — the trade-off is the point). A route
// without a per-token tariff reads "no per-token tariff" and sorts after every priced route in both directions.
import { Fragment, useMemo, useState } from "react";
import type { JevRow, JevView } from "./types";
import { cohortLabel, dec3, pct, secs, usd } from "./format";
import { OPEN_LABEL, CLASS_LABEL } from "../../lib/jevbench.mjs";

type Axis = "smart" | "cheap" | "fast" | "reliable" | "open";
type Col = { id: string; axis: Axis; label: string; title: string; get: (r: JevRow) => number | null; better: "high" | "low"; phone?: boolean };

const COLS: Col[] = [
  { id: "accuracy", axis: "smart", label: "Accuracy", title: "Argmax accuracy over the exact label set; a failed or invalid answer counts as wrong. The small line is the 95% interval (whole scenarios resampled).", get: (r) => r.accuracy, better: "high", phone: true },
  { id: "cost", axis: "cheap", label: "$ / 1k decisions", title: "Provider's published tariff (read 19 Sep 2026) × the token usage it reported. Routes without a billable account have no per-token tariff and are never sorted as cheapest.", get: (r) => r.cost, better: "low", phone: true },
  { id: "p50", axis: "fast", label: "p50 / p95", title: "End-to-end latency of successful requests, one at a time from a server in Germany, network included. Sorted by the median.", get: (r) => r.p50, better: "low", phone: true },
  { id: "ece", axis: "reliable", label: "ECE", title: "Expected calibration error: top-label confidence against observed accuracy in 10 equal bins. Lower is better.", get: (r) => r.ece, better: "low", phone: true },
  { id: "brier", axis: "reliable", label: "Brier", title: "Multi-class Brier score, summed over the exact label set. Lower is better.", get: (r) => r.brier, better: "low", phone: true },
  { id: "validity", axis: "reliable", label: "Valid", title: "Answers that parse under the schema with a distribution summing to 1 within 2% (renormalized). The exact-sum rate is in the row details.", get: (r) => r.validity, better: "high" },
  { id: "same", axis: "reliable", label: "Rephrase", title: "Same answer when the same scenario is asked in other words (36 pairs).", get: (r) => r.sameAnswer, better: "high" },
  { id: "open", axis: "open", label: "Open", title: "open = code and weights published; open weights = weights published, used here through an API; closed = neither.", get: (r) => r.openRank, better: "high", phone: true },
];
const AXES: { id: Axis; label: string }[] = [
  { id: "smart", label: "Smart" }, { id: "cheap", label: "Cheap" }, { id: "fast", label: "Fast" }, { id: "reliable", label: "Reliable" }, { id: "open", label: "Open" },
];

function cell(c: Col, r: JevRow) {
  switch (c.id) {
    case "accuracy": return <><span className="font-semibold">{pct(r.accuracy)}</span><span className="block text-[11px] text-gray-500">{pct(r.ciLo)}–{pct(r.ciHi)}</span></>;
    case "cost": return r.cost == null
      ? <span className="text-xs text-gray-400" title={r.costReason ?? undefined} data-bh-no-tariff>no per-token tariff</span>
      : <>{usd(r.cost)}{r.nCostKnown < r.nAttempted && <span className="block text-[11px] text-gray-500">{r.nCostKnown} of {r.nAttempted} priced</span>}</>;
    case "p50": return <>{secs(r.p50)}<span className="block text-[11px] text-gray-500">{secs(r.p95)}</span></>;
    case "ece": return dec3(r.ece);
    case "brier": return dec3(r.brier);
    case "validity": return pct(r.validity);
    case "same": return pct(r.sameAnswer);
    case "open": return <span className="text-xs">{OPEN_LABEL[r.open as keyof typeof OPEN_LABEL]}</span>;
  }
}

function sortRows(rows: JevRow[], col: Col, dir: 1 | -1) {
  // dir 1 = best first. Nulls (no tariff, no measurement) always last.
  return [...rows].sort((a, b) => {
    const x = col.get(a), y = col.get(b);
    if (x == null || y == null) return x == null && y == null ? (b.accuracy ?? 0) - (a.accuracy ?? 0) : x == null ? 1 : -1;
    const d = (col.better === "high" ? y - x : x - y) * dir;
    return d || (b.accuracy ?? 0) - (a.accuracy ?? 0) || a.display.localeCompare(b.display);
  });
}

function Details({ r, view }: { r: JevRow; view: JevView }) {
  return <div className="grid gap-4 p-3 text-xs text-gray-400 sm:grid-cols-2 lg:grid-cols-3">
    <div>
      <p className="font-semibold text-gray-300">By family <span className="font-normal">(commonest-label floor)</span></p>
      <table className="mt-1 w-full tabular-nums"><tbody>{view.familyNames.map((f) => <tr key={f}><td className="py-0.5 pr-2">{f} <span className="text-gray-500">({r.families[f]?.n ?? 0})</span></td><td className="text-right text-gray-300">{pct(r.families[f]?.accuracy)}</td><td className="pl-2 text-right">{pct(r.families[f]?.majority)}</td></tr>)}</tbody></table>
      <p className="mt-2 font-semibold text-gray-300">By cohort</p>
      <table className="mt-1 w-full tabular-nums"><tbody>{view.cohortNames.map((c) => <tr key={c}><td className="py-0.5 pr-2">{cohortLabel(c)} <span className="text-gray-500">({r.cohorts[c]?.n ?? 0})</span></td><td className="text-right text-gray-300">{pct(r.cohorts[c]?.accuracy)}</td><td className="pl-2 text-right">{pct(r.cohorts[c]?.majority)}</td></tr>)}</tbody></table>
    </div>
    <div className="space-y-1">
      <p className="font-semibold text-gray-300">Reliability</p>
      <p>Valid answers {pct(r.validity)} · exact-sum {pct(r.validityStrict)}{r.renormalized > 0 && <> · {r.renormalized} renormalized within 2%</>}</p>
      <p>Requests that succeeded {pct(r.success)}{r.failedN > 0 && <> · {r.failedN} failed</>}</p>
      <p>Rephrasings: same answer {pct(r.sameAnswer)}, both correct {pct(r.bothCorrect)} ({r.pairsValid} of {r.pairs} pairs valid)</p>
      <p>Probabilities: <b className="text-gray-300">{r.probability}</b>{r.probability === "native" ? " (the model's own distribution)" : " (written out by the model under a JSON schema)"}</p>
      {r.ordinalMae != null && <p>Ordinal expected-value MAE {dec3(r.ordinalMae)}</p>}
      {r.truncated > 0 && <p>State cut to the model&apos;s context window in {r.truncated} of {r.nAttempted} decisions</p>}
      <p className="pt-1 font-semibold text-gray-300">Speed</p>
      <p>p50 {secs(r.p50)} · p95 {secs(r.p95)} over {r.latencyN} successful requests · first request {secs(r.firstRequest)} (reported apart: a cold start)</p>
    </div>
    <div className="space-y-1">
      <p className="font-semibold text-gray-300">Route and cost</p>
      <p>Interface <code>{r.adapter}</code> · resolved as {r.identities.join(", ")}</p>
      {r.underlying && r.underlying !== "closed" && <p>Underlying model {r.underlying}</p>}
      {r.cost == null ? <p>No per-token tariff: {r.costReason}. The compute is still real; this is not $0.</p>
        : <p>{usd(r.cost)} per 1,000 decisions = ${r.priceIn}/M input, ${r.priceOut}/M output × measured usage ({r.tokensIn ?? "–"} in / {r.tokensOut ?? "–"} out tokens per decision). Tariff: {r.priceSource?.startsWith("https://") ? <a className="text-accent underline" href={r.priceSource.split(" ")[0]} target="_blank" rel="noopener">{r.priceSource}</a> : r.priceSource}</p>}
      <p>Run {r.started?.slice(0, 16).replace("T", " ")}–{r.finished?.slice(11, 16)} UTC · {r.nAttempted} of {r.nPlanned} decisions</p>
      {r.stopReason && <p>Stopped: {r.stopReason}</p>}
      <p>Licence: {r.licence}{r.repo && <> · <a className="text-accent underline" href={r.repo} target="_blank" rel="noopener">source</a></>}</p>
    </div>
  </div>;
}

export function JevTable({ view }: { view: JevView }) {
  const [sort, setSort] = useState<{ id: string; dir: 1 | -1 }>({ id: "accuracy", dir: 1 });
  const [axis, setAxis] = useState<Axis>("smart");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const col = COLS.find((c) => c.id === sort.id)!;
  const ranked = useMemo(() => sortRows(view.ranked, col, sort.dir), [view.ranked, col, sort.dir]);
  const partial = useMemo(() => sortRows(view.partial, col, sort.dir), [view.partial, col, sort.dir]);
  // Phones show the name plus one axis; the axis picker also sorts by that axis's first column.
  const vis = (c: Col) => (c.axis === axis && c.phone ? "" : "hidden md:table-cell");
  const pick = (a: Axis) => { setAxis(a); const first = COLS.find((c) => c.axis === a)!; setSort({ id: first.id, dir: 1 }); };
  const n = COLS.length + 1;
  const row = (r: JevRow) => <Fragment key={r.key}>
    <tr data-bh-jev-row={r.key}>
      <td className="px-3 py-2 align-top">
        <button type="button" className="text-left" aria-expanded={!!open[r.key]} aria-controls={`jev-details-${r.key}`} onClick={() => setOpen((o) => ({ ...o, [r.key]: !o[r.key] }))}>
          <span className="font-medium text-gray-100">{r.display}</span> <span aria-hidden className="text-gray-500">{open[r.key] ? "▾" : "▸"}</span>
          <span className="block text-[11px] text-gray-500">{r.author} · {CLASS_LABEL[r.cls as keyof typeof CLASS_LABEL]}</span>
        </button>
      </td>
      {COLS.map((c) => <td key={c.id} className={`px-3 py-2 text-right align-top tabular-nums ${vis(c)}`} data-col={c.id}>{cell(c, r)}</td>)}
    </tr>
    {open[r.key] && <tr id={`jev-details-${r.key}`}><td colSpan={n} className="bg-[rgb(var(--accent)/.03)]"><Details r={r} view={view} /></td></tr>}
  </Fragment>;
  return <div>
    <div className="mb-2 flex flex-wrap items-center gap-1.5 md:hidden" role="group" aria-label="Axis shown on this screen">
      {AXES.map((a) => <button key={a.id} type="button" aria-pressed={axis === a.id} onClick={() => pick(a.id)} className={`min-h-10 rounded-md border px-3 text-sm ${axis === a.id ? "border-[rgb(var(--accent))] text-accent" : "border-line text-gray-300"}`}>{a.label}</button>)}
    </div>
    <div className="card overflow-x-auto">
      <table className="dtable w-full text-sm" data-bh-jev-table>
        <thead>
          <tr className="hidden md:table-row">
            <th className="px-3 pt-2 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500"></th>
            {AXES.map((a) => { const span = COLS.filter((c) => c.axis === a.id).length; return <th key={a.id} colSpan={span} scope="colgroup" className="border-l border-line px-3 pt-2 text-center text-[11px] font-bold uppercase tracking-wider text-gray-400">{a.label}</th>; })}
          </tr>
          <tr>
            <th scope="col" className="px-3 py-2 text-left text-xs text-gray-400">System <span className="font-normal">(tap for details)</span></th>
            {COLS.map((c) => <th key={c.id} scope="col" className={`px-3 py-2 text-right text-xs text-gray-400 ${vis(c)}`} aria-sort={sort.id === c.id ? (sort.dir === 1) === (c.better === "high") ? "descending" : "ascending" : "none"}>
              <button type="button" title={c.title} onClick={() => setSort((s) => ({ id: c.id, dir: s.id === c.id ? (s.dir === 1 ? -1 : 1) : 1 }))} className="inline-flex min-h-8 items-center gap-1 hover:text-accent">
                {c.label}<span aria-hidden className={sort.id === c.id ? "text-accent" : "opacity-40"}>{sort.id === c.id ? (sort.dir === 1 ? "↓" : "↑") : "↕"}</span>
              </button>
            </th>)}
          </tr>
        </thead>
        <tbody>
          {ranked.map(row)}
          {partial.length > 0 && <tr className="bh-matrix-group"><td colSpan={n} className="px-3 py-2 text-xs text-gray-400">Stopped early — a different set of decisions, so shown but not ranked against the complete runs above</td></tr>}
          {partial.map(row)}
        </tbody>
      </table>
    </div>
    <p className="mt-2 text-xs text-gray-500">Sort any column; first click puts the best first. The best value is best on that axis only — there is no overall winner.</p>
  </div>;
}
