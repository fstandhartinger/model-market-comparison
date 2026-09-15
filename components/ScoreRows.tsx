"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { SCORE_SHORT_LABELS, type ScoreKey } from "../lib/types";
import { rowBars, rowWinners, COMPOSITE_MIN_ROWS, scoreRowSubtitle as subtitleFor } from "../lib/benchmark-matrix.mjs";

/** 2026-09-15: the product's own score, first row of every benchmark table. It shows exactly the
 *  score the settings select; only the Composite is called a composite. */
export function scoreRowSubtitle(score: ScoreKey): string {
  return subtitleFor(score, SCORE_SHORT_LABELS[score]);
}

export function ScoreRow({ score, values }: { score: ScoreKey; values: (number | null)[] }) {
  const elo = score.startsWith("designarena");
  const bars = rowBars(values, true, elo ? "Elo" : "points"), win = rowWinners(values, true);
  return <tr className="bh-matrix-hero" data-score={score}>
    <th scope="row" className="bh-matrix-stub">
      <span className="bh-hero-label">Benchmark Heaven Score</span>
      <span className="bh-hero-sub">{scoreRowSubtitle(score)}</span>
      <Link href="/about#score" className="bh-hero-source">How it’s calculated<span className="sr-only"> (Benchmark Heaven score methodology)</span></Link>
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

/** A category header that is also that category's composite (see `categoryComposite`). */
export function CategoryHeader({ label, composite, columns }: { label: ReactNode; composite: { values: (number | null)[]; rows: { name: string }[] }; columns: number }) {
  const n = composite.rows.length;
  const basis = n >= COMPOSITE_MIN_ROWS ? `Category composite: mean of ${n} shared results on a 0–100 scale (${composite.rows.map((r) => r.name).join(", ")})` : `No category composite: fewer than ${COMPOSITE_MIN_ROWS} shown results on a 0–100 scale that every compared model has`;
  return <tr className="bh-matrix-group">
    <th scope="rowgroup" className="bh-matrix-stub" title={basis}>
      <span className="bh-cat-head">{label}</span>
      <span className="bh-cat-basis">{n >= COMPOSITE_MIN_ROWS ? `composite of ${n}` : "no composite"}<span className="sr-only">. {basis}</span></span>
    </th>
    {Array.from({ length: columns }, (_, j) => { const v = composite.values[j]; return <td key={j} className={`bh-cat-cell ${j === 0 ? "bh-matrix-lead" : ""}`}>
      {v == null ? <span className="bh-matrix-missing"><span aria-hidden="true">—</span><span className="sr-only">No category composite</span></span>
        : <span className="tabular">{v.toFixed(1)}<span className="sr-only"> category composite</span></span>}
    </td>; })}
  </tr>;
}
