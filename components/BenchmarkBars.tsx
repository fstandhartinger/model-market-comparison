"use client";
import { useState } from "react";
import { chartScale, formatValue, rowWinners, type MatrixRow } from "../lib/benchmark-matrix.mjs";

/** CR-1.9: fixed categorical slots, shared with the comparison table's column accents. Up to eight
 *  models get a hue; a 9th and 10th column get the neutral mark and are named by their letter. */
export const seriesColor = (j: number) => j < 8 ? `var(--series-${j + 1})` : "var(--series-other)";
export const seriesLetter = (j: number) => String.fromCharCode(65 + j);
const INITIAL = 12;

const tick = (v: number, unit: string, kind: string) => kind === "position" ? Math.round(v).toLocaleString("en-US")
  : kind === "bar" && unit === "fraction" ? `${Math.round(v * 100)}%`
  : kind === "bar" && unit === "percent" ? `${Math.round(v)}%`
  : kind === "bar" && unit !== "USD" ? Number(v.toPrecision(3)).toLocaleString("en-US")
  : formatValue(v, unit);
const caption = (kind: string, unit: string, higherBetter: boolean | null) => [
  kind === "log" ? "log scale" : kind === "position" ? `${/elo/i.test(unit) ? "Elo" : "score"} · position between lowest and highest` : null,
  higherBetter === false ? "lower is better" : null,
].filter(Boolean).join(" · ");

/** CR-1.9: one small multiple per headline benchmark — a bar (or a log/scale position dot) per compared model. */
export function BenchmarkBars({ rows, ids, names }: { rows: { row: MatrixRow; vals: (number | null)[] }[]; ids: string[]; names: string[] }) {
  const [all, setAll] = useState(false);
  if (rows.length === 0 || ids.length < 2) return null;
  const shown = all ? rows : rows.slice(0, INITIAL);
  return <section aria-labelledby="bh-bars-title" className="card p-4 sm:p-6">
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <h2 id="bh-bars-title" className="text-lg font-semibold">Headline benchmarks at a glance</h2>
      <p className="bh-muted text-xs">{rows.length} headline benchmarks with results for at least two compared models</p>
    </div>
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm" aria-label="Chart legend">
      {ids.map((id, j) => <li key={id} className="flex min-w-0 items-center gap-1.5">
        <span aria-hidden="true" className="bh-bars-key" style={{ background: seriesColor(j) }} />
        <span className="bh-muted text-xs font-bold">{seriesLetter(j)}</span><span className="truncate">{names[j]}</span>
      </li>)}
    </ul>
    <div className="mt-5 grid gap-x-8 gap-y-6 md:grid-cols-2 xl:grid-cols-3">
      {shown.map(({ row, vals }) => {
        const s = chartScale(vals, row.unit);
        if (!s) return null;
        const win = rowWinners(vals, row.higherBetter), note = caption(s.kind, row.unit, row.higherBetter);
        return <figure key={row.id} className="min-w-0" data-kind={s.kind}>
          <figcaption>
            <span className="block truncate text-sm font-semibold" title={row.name}>{row.name}</span>
            <span className="bh-muted block text-xs">{row.cohort ? `${row.cohort} · ` : ""}{tick(s.domain[0], row.unit, s.kind)} – {tick(s.domain[1], row.unit, s.kind)}{note ? ` · ${note}` : ""}</span>
          </figcaption>
          <ol className="mt-2 grid gap-1">
            {vals.map((v, j) => <li key={ids[j]} className="bh-bars-row" title={`${names[j]} — ${row.name}: ${formatValue(v, row.unit)}`}>
              <span aria-hidden="true" className="bh-muted text-[10px] font-bold">{seriesLetter(j)}</span>
              <span className="sr-only">{names[j]}: </span>
              <span aria-hidden="true" className="bh-bars-track">
                {s.positions[j] != null && (s.kind === "bar"
                  ? <span className="bh-bars-bar" style={{ width: `${Math.max(0.5, s.positions[j]! * 100)}%`, background: seriesColor(j) }} />
                  : <span className="bh-bars-dot" style={{ left: `${s.positions[j]! * 100}%`, background: seriesColor(j) }} />)}
              </span>
              <span className={`tabular text-right text-xs ${v == null ? "bh-muted" : win[j] ? "font-bold" : ""}`}>{formatValue(v, row.unit)}{win[j] && <span className="sr-only"> (best)</span>}</span>
            </li>)}
          </ol>
        </figure>;
      })}
    </div>
    {rows.length > INITIAL && <button type="button" className="bh-button mt-5" aria-expanded={all} onClick={() => setAll(!all)}>{all ? "Show fewer" : `Show all ${rows.length}`}</button>}
  </section>;
}
