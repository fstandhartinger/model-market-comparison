"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { SCORE_SHORT_LABELS, type ScoreKey } from "../lib/types";
import { rowBars, rowWinners, COMPOSITE_MIN_ROWS, scoreRowSubtitle as subtitleFor } from "../lib/benchmark-matrix.mjs";

/** What `categoryComposite` returns, as much of it as the header needs. */
export type CompositeSummary = { values: (number | null)[]; rows: { name: string }[]; judgedExcluded?: number; saturated?: { name: string }[]; kind?: "measured" | "judged" };

/** 2026-09-15: the product's own score, first row of every benchmark table. It shows exactly the
 *  score the settings select; only the Composite is called a composite. */
export function scoreRowSubtitle(score: ScoreKey): string {
  return subtitleFor(score, SCORE_SHORT_LABELS[score]);
}

/** CR-33.3 (Florian 2026-09-15): the first row is ALWAYS the Main Composite Score; when the settings select
 *  another score, that score follows as a second highlighted row (`role="selected"`). */
export function ScoreRow({ score, values, role = "main" }: { score: ScoreKey; values: (number | null)[]; role?: "main" | "selected" }) {
  const elo = score.startsWith("designarena");
  const bars = rowBars(values, true, elo ? "Elo" : "points"), win = rowWinners(values, true);
  return <tr className={`bh-matrix-hero${role === "selected" ? " bh-matrix-hero-selected" : ""}`} data-score={score} data-score-role={role}>
    <th scope="row" className="bh-matrix-stub">
      {role === "main"
        ? <><span className="bh-hero-label">Benchmark Heaven Score</span><span className="bh-hero-sub">Main Composite Score</span>
          <Link href="/about#score" className="bh-hero-source">How it’s calculated<span className="sr-only"> (Benchmark Heaven score methodology)</span></Link></>
        : <><span className="bh-hero-label">{SCORE_SHORT_LABELS[score]}</span><span className="bh-hero-sub">Selected score</span></>}
    </th>
    {values.map((v, j) => <td key={j} className={`bh-matrix-cell ${j === 0 ? "bh-matrix-lead" : ""}`}>
      {v == null
        ? <span className="bh-matrix-missing"><span aria-hidden="true">—</span><span className="sr-only">No score with benchmark evidence</span></span>
        : <span className="bh-matrix-link bh-hero-value">
          {bars[j] != null && <span aria-hidden="true" className={`bh-matrix-bar ${win[j] ? "is-best" : ""}`} style={{ width: `${Math.max(3, bars[j]! * 100)}%` }} />}
          <span className="relative tabular">{v.toFixed(elo ? 0 : 1)}</span>
          {win[j] && <span className="sr-only"> (best in row)</span>}
        </span>}
    </td>)}
  </tr>;
}

/** CR-33.3: the Main Composite row, plus the selected score's row when it is not the Composite. */
export function ScoreRowPair({ score, valuesFor }: { score: ScoreKey; valuesFor: (key: ScoreKey) => (number | null)[] }) {
  return <>
    <ScoreRow score="composite" values={valuesFor("composite")} />
    {score !== "composite" && <ScoreRow score={score} values={valuesFor(score)} role="selected" />}
  </>;
}

/** A category header that is also that category's composite (see `categoryComposite`).
 *  F-98: when the average had to leave judged rows out, or weighs a saturated row half, the header's
 *  own (i) text says so in one clause — no extra column, no new colour. */
export function CategoryHeader({ label, composite, columns, count }: { label: ReactNode; composite: CompositeSummary; columns: number; count?: number }) {
  const n = composite.rows.length;
  const clauses = [
    composite.saturated?.length ? `saturated benchmarks weigh half (${composite.saturated.map((r) => r.name).join(", ")})` : null,
    composite.judgedExcluded ? `${composite.judgedExcluded} preference or judge score${composite.judgedExcluded > 1 ? "s" : ""} left out — they never average with task accuracy` : null,
  ].filter(Boolean);
  const weighted = composite.saturated?.length ? "weighted mean" : "mean";
  const mean = composite.kind === "judged" ? `${weighted} of preference and judge scores` : weighted;
  const basis = n >= COMPOSITE_MIN_ROWS
    ? `Category composite: ${mean} of ${n} shared results on a 0–100 scale (${composite.rows.map((r) => r.name).join(", ")})${clauses.length ? `. ${clauses.join("; ")}` : ""}`
    : `No category composite: fewer than ${COMPOSITE_MIN_ROWS} shown results on a 0–100 scale that every compared model has${clauses.length ? `. ${clauses.join("; ")}` : ""}`;
  return <tr className="bh-matrix-group">
    <th scope="rowgroup" className="bh-matrix-stub" title={basis}>
      <span className="bh-cat-head">{label}</span>
      <span className="bh-cat-basis">{/* CR-63.16: say what the number counts ("7 benchmarks · 2 feed the group score"). F-110: below 640 px the count joins this line. */}{count != null && <span className="bh-cat-count-narrow">{count} benchmarks · </span>}{n >= COMPOSITE_MIN_ROWS ? `${n} feed the group score${composite.saturated?.length ? " (weighted)" : ""}` : "no group score"}<span className="sr-only">. {basis}</span></span>
    </th>
    {Array.from({ length: columns }, (_, j) => { const v = composite.values[j]; return <td key={j} className={`bh-cat-cell ${j === 0 ? "bh-matrix-lead" : ""}`}>
      {v == null ? <span className="sr-only">No category composite</span>
        : <span className="tabular">{v.toFixed(1)}<span className="sr-only"> category composite</span></span>}
    </td>; })}
  </tr>;
}
