"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ClientData } from "../lib/client-model";
import { useSettings } from "./SettingsContext";
import { collapsedName, preferredVariantIds } from "../lib/variants";
import { formatValue, cellHref, rowBars, rowWinners, rowOutliers, scoreTypeText, categoryComposite, versionLine, countBoards, boardId, variantLabel, CAVEAT_TAGS, OUTLIER_MIN_VALUES, type BenchmarkMatrix as Matrix } from "../lib/benchmark-matrix.mjs";
import { InfoTip } from "./InfoTip";
import { hasScoreEvidence } from "../lib/client-model";
import { ScoreRowPair, CategoryHeader } from "./ScoreRows";
import { seriesColor, seriesLetter } from "./BenchmarkBars";
import { ShortlistColumns } from "./ShortlistColumns";
import { AaCredit } from "./AaCredit";
import { BEST_OF_NOTE } from "./BestOf";

const COLUMNS = 5;
const NOTE_KEY = "bh.simpleBenchmarksNote.v1";

/** CR-7.1 / CR-7.2: Simple mode's second section — the headline benchmarks for the top of the list above,
 *  clearly marked as the simple version, with the full comparison one click away. */
export function SimpleBenchmarks({ matrix: headline, data, ids: listIds }: { matrix: Matrix; data: ClientData; ids: string[] }) {
  const { score } = useSettings();
  const byId = useMemo(() => new Map(data.models.map((m) => [m.id, m])), [data]);
  // F-82: the same column names as the full comparison — the model, not its effort setting.
  const preferred = useMemo(() => preferredVariantIds(data.models, score), [data, score]);
  // CR-28.1: the headline rows render first (shipped with the page); the full list of every benchmark these
  // models have is fetched for exactly these models and replaces them.
  const [fullMatrix, setFullMatrix] = useState<{ key: string; matrix: Matrix & { catalogBoards?: number } } | null>(null);
  const candidateIds = useMemo(() => listIds.filter((id) => headline.values[id]?.length || fullMatrix?.matrix.values[id]?.length).slice(0, COLUMNS), [listIds, headline, fullMatrix]);
  const fetchKey = listIds.slice(0, COLUMNS).join(",");
  useEffect(() => {
    if (!fetchKey) return;
    let live = true;
    fetch(`/api/benchmark-matrix?models=${encodeURIComponent(fetchKey)}`).then((r) => r.ok ? r.json() : null)
      .then((j) => { if (live && j?.matrix) setFullMatrix({ key: fetchKey, matrix: j.matrix }); }).catch(() => { /* keep headline rows */ });
    return () => { live = false; };
  }, [fetchKey]);
  const loaded = !!(fullMatrix && fullMatrix.key === fetchKey);
  const matrix: Matrix & { catalogBoards?: number } = loaded ? fullMatrix!.matrix : headline;
  const ids = useMemo(() => candidateIds.filter((id) => matrix.values[id]?.length), [candidateIds, matrix]);
  const [note, setNote] = useState(false);
  // CR-7.2: on small screens say once that the full version is built for larger screens.
  useEffect(() => {
    try { if (window.matchMedia("(max-width: 767.98px)").matches && !localStorage.getItem(NOTE_KEY)) setNote(true); } catch { /* storage blocked */ }
  }, []);
  // CR-31.1: when the table first comes into view (header link or manual scroll), say briefly that this is a
  // simplified list, next to the full-comparison button — once per page visit.
  const [hint, setHint] = useState(false);
  const hinted = useRef(false);
  // Observed element: the section itself (its top holds the button), not the table — the column chart above the
  // table (CR-33.1) pushed the table below the observed band after the header link's scroll on phones.
  const [tableEl, setTableEl] = useState<HTMLElement | null>(null);
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
    .filter(({ vals }) => vals.some((v) => v != null)), [matrix, lookups]);
  const groups = matrix.groups.map((g) => ({ ...g, rows: visible.filter((v) => v.row.group === g.id) })).filter((g) => g.rows.length);
  const valuesFor = (key: typeof score) => ids.map((id) => { const m = byId.get(id); return m && hasScoreEvidence(m, key) ? m.scores[key] ?? null : null; });
  const full = `/benchmarks${ids.length ? `?${new URLSearchParams({ models: ids.join(",") })}` : ""}`;

  return <section ref={setTableEl} id="benchmarks" tabIndex={-1} aria-labelledby="bh-simple-bench-title" className="mt-10 scroll-mt-20 outline-none">
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <div>
        <p className="bh-eyebrow">Simple view</p>
        <h2 id="bh-simple-bench-title" className="text-2xl font-bold tracking-tight">Benchmarks for your shortlist</h2>
        <p className="bh-muted mt-1 max-w-2xl text-sm">
          {/* F-102: one counting rule — a benchmark is a board (family + version); harness cohorts and cost
              twins are rows of a board. Numerator and denominator therefore count the same thing as the hero. */}
          {ids.length ? (loaded && matrix.catalogBoards
            ? <>Every benchmark with a result for the top {ids.length} of your list above: <span className="tabular" data-bench-count>{countBoards(visible.map((v) => v.row))}</span> of the <span className="tabular" data-catalog-count>{matrix.catalogBoards}</span> benchmarks we track.</>
            : <>The headline benchmarks for the top {ids.length} of your list above: <span className="tabular">{countBoards(visible.map((v) => v.row))}</span> benchmarks side by side (loading the full list…).</>) : "Your list above is empty — widen the score or cost limits to compare benchmarks."}
        </p>
      </div>
      {/* F-99: below md the hint is a full-width line under the button (CSS order), so it never covers the intro. */}
      <span className="relative inline-flex max-md:w-full max-md:flex-col max-md:items-start max-md:gap-2">
        <span role="status" aria-live="polite" className="contents">{hint && <span className="bh-simplified-hint" data-simplified-hint>This is a simplified list</span>}</span>
        <Link href={full} className="bh-button text-sm font-semibold">Open the full comparison <span aria-hidden="true">→</span></Link>
      </span>
    </div>
    {note && <div role="note" className="mt-3 flex items-start gap-3 rounded-xl border border-line bg-panel px-3 py-2 text-sm">
      <p className="min-w-0 flex-1">This is the simple version. The full comparison — every benchmark, model and preset — works best on a larger screen.</p>
      <button type="button" className="bh-preset-icon" aria-label="Dismiss this note" onClick={dismiss}>×</button>
    </div>}

    {/* CR-33.1: every shortlisted model's score as columns, above the table. */}
    <ShortlistColumns data={data} ids={listIds} tableIds={ids} names={new Map(listIds.map((id) => { const m = byId.get(id); return [id, m ? collapsedName(m, true, preferred) : id]; }))} />
    {ids.length > 0 && visible.length > 0 && <div className="bh-matrix-wrap mt-4" role="region" aria-label="Headline benchmark results for your shortlist" tabIndex={0}>
      <table className="bh-matrix">
        <caption className="sr-only">Benchmark results for the top models of your shortlist. Bold marks the best result in each row.</caption>
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
            // F-102: the board a row belongs to, so the published count can be checked against the table itself.
            return <tr key={row.id} data-board={boardId(row)} data-boards={row.boards ? JSON.stringify(row.boards) : undefined} data-best-of={row.bestOf ? "1" : undefined}>
              <th scope="row" className="bh-matrix-stub"><span className="bh-matrix-bench bh-matrix-bench-inline">{row.name}{row.cohort && <span className="bh-matrix-cohort">{row.cohort}</span>}
                {/* F-98: the two caveat tags a reader needs to read the number right; the editorial tier tags stay in the full comparison. */}
                {row.tags.filter((t) => CAVEAT_TAGS.includes(t)).map((t) => matrix.tags[t] && <span key={t} className="bh-matrix-tag" data-tag={t} title={matrix.tags[t].tip}>{matrix.tags[t].label}<span className="sr-only">: {matrix.tags[t].tip}</span></span>)}
                <InfoTip title={row.name} label={`the ${row.name} benchmark`}>{row.description || "What this benchmark measures is not described by its publisher yet."}
                  <span className="mt-2 block">{scoreTypeText(row)}</span>
                  {row.bestOf && <span className="mt-2 block" data-best-of-note>{BEST_OF_NOTE}</span>}
                  {versionLine(row) && <span className="bh-muted mt-2 block">{versionLine(row)}</span>}
                  {row.freshness?.contamination && <span className="bh-muted mt-2 block">{row.freshness.contamination}</span>}
                  {row.tags.filter((t) => CAVEAT_TAGS.includes(t)).map((t) => matrix.tags[t] && <span key={t} className="mt-2 block"><b>{matrix.tags[t].label}:</b> {matrix.tags[t].tip}</span>)}
                </InfoTip></span></th>
              {vals.map((v, j) => <td key={ids[j]} className={`bh-matrix-cell ${j === 0 ? "bh-matrix-lead" : ""}`}>
                {v == null
                  ? <span className="bh-matrix-missing"><span aria-hidden="true">—</span><span className="sr-only">No result</span></span>
                  : <Link href={cellHref(row, ids[j], ids, true)} className="bh-matrix-link" title={row.bestOf ? `Best recorded result: ${variantLabel(row, ids[j])}` : undefined} data-variant={row.bestOf ? variantLabel(row, ids[j]) : undefined}>
                    {bars[j] != null && <span aria-hidden="true" className={`bh-matrix-bar ${win[j] ? "is-best" : ""}`} style={{ width: `${Math.max(3, bars[j]! * 100)}%` }} />}
                    <span className={`relative tabular ${win[j] ? "font-bold" : ""}`}>{formatValue(v, row.unit)}{basis[j] === 1 && <sup className="bh-muted" title="Self-reported by the developer">†</sup>}</span>
                    {win[j] && <span className="sr-only"> (best in row)</span>}
                    {row.bestOf && <span className="sr-only"> (best recorded result: {variantLabel(row, ids[j])})</span>}
                    {odd[j] && <span className="bh-outlier-tag" data-kind={odd[j]} title={odd[j] === "top" ? "Clearly ahead: its lead over the next model is at least twice the spread of the models in between" : "Clearly behind: its gap to the next model is at least twice the spread of the models in between"}>{odd[j]}<span className="sr-only">{odd[j] === "top" ? ": clearly ahead of the other models in this row" : ": clearly behind the other models in this row"}</span></span>}
                  </Link>}
              </td>)}
            </tr>;
          })}
        </tbody>)}
      </table>
    </div>}
    <p className="bh-muted mt-2 text-xs">Bold is best in row; a <b>top</b> or <b>low</b> tag marks a result whose gap to the next model is at least twice the spread of the models in between (rows with at least {OUTLIER_MIN_VALUES} results); † marks a developer&apos;s own report; a dash means no published result. A row marked <b>best of</b> holds each model&apos;s best recorded result across agents (Claude Code, Codex) and, for the AA Coding Agent Index, versions. A <b>Saturated</b> tag means the best models already sit near that benchmark&apos;s ceiling; a <b>Judged</b> tag means the number is a preference or judge score, not task accuracy. The first row is always the Benchmark Heaven Main Composite Score; a score you select in Options follows right below it. A category row averages that category&apos;s results shown here on a 0–100 scale (higher is better) that every model in the table has — at least two, otherwise a dash; a saturated benchmark weighs half, judged scores never average with task accuracy, and Elo, native index scales and costs are left out. <Link href={full} className="underline">The full comparison</Link> adds every other benchmark, a chart, and model and row presets. <AaCredit />.</p>
  </section>;
}
