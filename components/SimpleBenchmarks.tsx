"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ClientData } from "../lib/client-model";
import { useSettings } from "./SettingsContext";
import { collapsedName, preferredVariantIds } from "../lib/variants";
import { formatValue, cellHref, rowBars, rowWinners, rowOutliers, scoreTypeText, categoryComposite, OUTLIER_MIN_VALUES, type BenchmarkMatrix as Matrix } from "../lib/benchmark-matrix.mjs";
import { InfoTip } from "./InfoTip";
import { hasScoreEvidence } from "../lib/client-model";
import { ScoreRowPair, CategoryHeader } from "./ScoreRows";
import { seriesColor, seriesLetter } from "./BenchmarkBars";

const COLUMNS = 5;
const NOTE_KEY = "bh.simpleBenchmarksNote.v1";

/** CR-7.1 / CR-7.2: Simple mode's second section — the headline benchmarks for the top of the list above,
 *  clearly marked as the simple version, with the full comparison one click away. */
export function SimpleBenchmarks({ matrix, data, ids: listIds }: { matrix: Matrix; data: ClientData; ids: string[] }) {
  const { score } = useSettings();
  const byId = useMemo(() => new Map(data.models.map((m) => [m.id, m])), [data]);
  // F-82: the same column names as the full comparison — the model, not its effort setting.
  const preferred = useMemo(() => preferredVariantIds(data.models, score), [data, score]);
  const ids = useMemo(() => listIds.filter((id) => matrix.values[id]?.length).slice(0, COLUMNS), [listIds, matrix]);
  const [note, setNote] = useState(false);
  // CR-7.2: on small screens say once that the full version is built for larger screens.
  useEffect(() => {
    try { if (window.matchMedia("(max-width: 767.98px)").matches && !localStorage.getItem(NOTE_KEY)) setNote(true); } catch { /* storage blocked */ }
  }, []);
  // CR-31.1: when the table first comes into view (header link or manual scroll), say briefly that this is a
  // simplified list, next to the full-comparison button — once per page visit.
  const [hint, setHint] = useState(false);
  const hinted = useRef(false);
  const [tableEl, setTableEl] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!tableEl || hinted.current || typeof IntersectionObserver === "undefined") return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const io = new IntersectionObserver((entries) => {
      if (hinted.current || !entries.some((e) => e.isIntersecting)) return;
      hinted.current = true; io.disconnect(); setHint(true);
      timer = setTimeout(() => setHint(false), 3800);
    }, { rootMargin: "0px 0px -35% 0px" });
    io.observe(tableEl);
    return () => { io.disconnect(); if (timer) clearTimeout(timer); };
  }, [tableEl]);
  const dismiss = () => { setNote(false); try { localStorage.setItem(NOTE_KEY, "1"); } catch { /* ignore */ } };

  const lookups = useMemo(() => ids.map((id) => new Map((matrix.values[id] ?? []).map(([i, v, b]) => [i, [v, b] as const]))), [ids, matrix]);
  const visible = useMemo(() => matrix.rows.map((row, i) => ({ row, vals: lookups.map((m) => m.get(i)?.[0] ?? null), basis: lookups.map((m) => m.get(i)?.[1] ?? null) }))
    .filter(({ vals }) => vals.filter((v) => v != null).length >= Math.min(2, ids.length)), [matrix, lookups, ids.length]);
  const groups = matrix.groups.map((g) => ({ ...g, rows: visible.filter((v) => v.row.group === g.id) })).filter((g) => g.rows.length);
  const valuesFor = (key: typeof score) => ids.map((id) => { const m = byId.get(id); return m && hasScoreEvidence(m, key) ? m.scores[key] ?? null : null; });
  const full = `/benchmarks${ids.length ? `?${new URLSearchParams({ models: ids.join(",") })}` : ""}`;

  return <section id="benchmarks" tabIndex={-1} aria-labelledby="bh-simple-bench-title" className="mt-10 scroll-mt-20 outline-none">
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <div>
        <p className="bh-eyebrow">Simple view</p>
        <h2 id="bh-simple-bench-title" className="text-2xl font-bold tracking-tight">Benchmarks for your shortlist</h2>
        <p className="bh-muted mt-1 max-w-2xl text-sm">
          {ids.length ? <>The headline benchmarks for the top {ids.length} of your list above: <span className="tabular">{visible.length}</span> results side by side.</> : "Your list above is empty — widen the score or cost limits to compare benchmarks."}
        </p>
      </div>
      <span className="relative inline-flex">
        <span role="status" aria-live="polite" className="contents">{hint && <span className="bh-simplified-hint" data-simplified-hint>This is a simplified list</span>}</span>
        <Link href={full} className="bh-button text-sm font-semibold">Open the full comparison <span aria-hidden="true">→</span></Link>
      </span>
    </div>
    {note && <div role="note" className="mt-3 flex items-start gap-3 rounded-xl border border-line bg-panel px-3 py-2 text-sm">
      <p className="min-w-0 flex-1">This is the simple version. The full comparison — every benchmark, model and preset — works best on a larger screen.</p>
      <button type="button" className="bh-preset-icon" aria-label="Dismiss this note" onClick={dismiss}>×</button>
    </div>}

    {ids.length > 0 && visible.length > 0 && <div ref={setTableEl} className="bh-matrix-wrap mt-4" role="region" aria-label="Headline benchmark results for your shortlist" tabIndex={0}>
      <table className="bh-matrix">
        <caption className="sr-only">Headline benchmark results for the top models of your shortlist. Bold marks the best result in each row.</caption>
        <thead><tr>
          <th scope="col" className="bh-matrix-stub">Benchmark</th>
          {ids.map((id, j) => { const m = byId.get(id); return <th key={id} scope="col" className={`bh-matrix-model !pt-3 ${j === 0 ? "bh-matrix-lead" : ""}`}>
            <span className="bh-matrix-accent" style={{ ["--swatch" as string]: seriesColor(j) }} aria-hidden="true">{seriesLetter(j)}</span>
            <span className="bh-matrix-org">{m?.org}</span>
            <span className="bh-matrix-name"><Link href={`/models/${encodeURIComponent(id)}`} title={m?.display_name} className="hover:underline">{m ? collapsedName(m, true, preferred) : id}</Link></span>
          </th>; })}
        </tr></thead>
        <tbody><ScoreRowPair score={score} valuesFor={valuesFor} /></tbody>
        {groups.map((g) => <tbody key={g.id}>
          <CategoryHeader label={<span className="inline-flex min-h-8 items-center">{g.label}</span>} composite={categoryComposite(g.rows, ids.length)} columns={ids.length} />
          {g.rows.map(({ row, vals, basis }) => {
            const bars = rowBars(vals, row.higherBetter, row.unit), win = rowWinners(vals, row.higherBetter), odd = rowOutliers(vals, row.higherBetter);
            return <tr key={row.id}>
              <th scope="row" className="bh-matrix-stub"><span className="bh-matrix-bench">{row.name}<InfoTip title={row.name} label={`the ${row.name} benchmark`}>{row.description || "What this benchmark measures is not described by its publisher yet."}<span className="mt-2 block">{scoreTypeText(row)}</span></InfoTip></span>{row.cohort && <span className="bh-matrix-sub">{row.cohort}</span>}</th>
              {vals.map((v, j) => <td key={ids[j]} className={`bh-matrix-cell ${j === 0 ? "bh-matrix-lead" : ""}`}>
                {v == null
                  ? <span className="bh-matrix-missing"><span aria-hidden="true">—</span><span className="sr-only">No result</span></span>
                  : <Link href={cellHref(row, ids[j], ids, true)} className="bh-matrix-link">
                    {bars[j] != null && <span aria-hidden="true" className={`bh-matrix-bar ${win[j] ? "is-best" : ""}`} style={{ width: `${Math.max(3, bars[j]! * 100)}%` }} />}
                    <span className={`relative tabular ${win[j] ? "font-bold" : ""}`}>{formatValue(v, row.unit)}{basis[j] === 1 && <sup className="bh-muted" title="Self-reported by the developer">†</sup>}</span>
                    {win[j] && <span className="sr-only"> (best in row)</span>}
                    {odd[j] && <span className="bh-outlier-tag" data-kind={odd[j]} title={odd[j] === "top" ? "Clearly ahead: its lead over the next model is at least twice the spread of the models in between" : "Clearly behind: its gap to the next model is at least twice the spread of the models in between"}>{odd[j]}<span className="sr-only">{odd[j] === "top" ? ": clearly ahead of the other models in this row" : ": clearly behind the other models in this row"}</span></span>}
                  </Link>}
              </td>)}
            </tr>;
          })}
        </tbody>)}
      </table>
    </div>}
    <p className="bh-muted mt-2 text-xs">Headline benchmarks with a result for at least two of these models. Bold is best in row; a <b>top</b> or <b>low</b> tag marks a result whose gap to the next model is at least twice the spread of the models in between (rows with at least {OUTLIER_MIN_VALUES} results); † marks a developer&apos;s own report; a dash means no published result. The first row is always the Benchmark Heaven Main Composite Score; a score you select in Options follows right below it. A category row averages that category&apos;s results shown here on a 0–100 scale (higher is better) that every model in the table has — at least two, otherwise a dash; Elo, native index scales and costs are left out. <Link href={full} className="underline">The full comparison</Link> adds every other benchmark, a chart, and model and row presets.</p>
  </section>;
}
