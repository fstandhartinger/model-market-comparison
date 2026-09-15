"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { ClientData } from "../lib/client-model";
import { hasScoreEvidence } from "../lib/client-model";
import { SCORE_SHORT_LABELS, type ScoreKey } from "../lib/types";
import { formatValue, shortlistColumns } from "../lib/benchmark-matrix.mjs";
import { seriesColor } from "./BenchmarkBars";
import { AaCredit } from "./AaCredit";
import { EpochCredit } from "./EpochCredit";

/** CR-33.2: the scores the chart can show. The Main Composite is the default; category composites join
 *  this list once they exist as catalog-wide scores (CR-25.6). */
const CHART_SCORES: ScoreKey[] = ["composite", "aa_intelligence_index", "aa_coding_index", "aa_coding_agent", "epoch_eci", "epoch_eci_software", "designarena_fullstack", "designarena_frontend"];

/** CR-33.1 (Florian 2026-09-15): a column chart above the shortlist table — every shortlisted model's score,
 *  high → low, values on the columns. The table's five columns keep their colours here. */
export function ShortlistColumns({ data, ids, tableIds, names }: { data: ClientData; ids: string[]; tableIds: string[]; names: Map<string, string> }) {
  const [score, setScore] = useState<ScoreKey>("composite");
  const byId = useMemo(() => new Map(data.models.map((m) => [m.id, m])), [data]);
  const elo = score.startsWith("designarena");
  const unit = elo ? "Elo" : "points";
  const { columns, kind, domain } = useMemo(() => shortlistColumns(ids.map((id) => {
    const m = byId.get(id);
    return { id, value: m && hasScoreEvidence(m, score) ? m.scores[score] ?? null : null };
  }), unit), [ids, byId, score, unit]);
  if (ids.length < 2) return null;
  const label = score === "composite" ? "Benchmark Heaven Score (Main Composite Score)" : SCORE_SHORT_LABELS[score];
  const measured = columns.filter((c) => !c.noData).length;
  return <figure className="card mt-4 p-3 sm:p-4" aria-labelledby="bh-shortlist-cols-title" data-shortlist-columns>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <figcaption id="bh-shortlist-cols-title" className="text-sm font-semibold">{label}<span className="bh-muted ml-2 text-xs font-normal">{measured} of {columns.length} models{kind === "position" ? " · Elo, drawn between the lowest and highest rating" : ""} · <AaCredit /> · <EpochCredit /></span></figcaption>
      <label className="text-xs">
        <span className="sr-only">Score shown in the chart</span>
        <select className="bh-input py-1 text-xs" value={score} onChange={(e) => setScore(e.target.value as ScoreKey)} data-shortlist-score>
          {CHART_SCORES.map((k) => <option key={k} value={k}>{k === "composite" ? "Main Composite Score" : SCORE_SHORT_LABELS[k]}</option>)}
        </select>
      </label>
    </div>
    <div className="mt-3 overflow-x-auto" role="img" aria-label={`${label}: ${columns.map((c) => `${names.get(c.id) ?? c.id} ${c.noData ? "no data" : formatValue(c.value as number, unit)}`).join(", ")}`}>
      <div className="flex h-44 min-w-full items-end gap-1.5" style={{ width: `max(100%, ${columns.length * 2.6}rem)` }} aria-hidden="true">
        {columns.map((c) => {
          const j = tableIds.indexOf(c.id);
          return <div key={c.id} className="flex h-full min-w-[2.2rem] flex-1 flex-col items-center justify-end" data-col={c.id} data-no-data={c.noData ? "1" : undefined}>
            <span className="mb-0.5 text-[10px] font-semibold tabular">{c.noData ? "" : formatValue(c.value as number, unit)}</span>
            {c.noData
              ? <span className="bh-muted flex h-full w-full items-end justify-center rounded-t border border-dashed border-line pb-1 text-[9px]">no data</span>
              : <span className="w-full rounded-t" style={{ height: `${Math.round((c.height ?? 0) * 100)}%`, background: j >= 0 ? seriesColor(j) : "rgb(var(--accent) / .45)" }} />}
          </div>;
        })}
      </div>
      <div className="mt-1 flex min-w-full gap-1.5" style={{ width: `max(100%, ${columns.length * 2.6}rem)` }} aria-hidden="true">
        {columns.map((c) => <Link key={c.id} href={`/models/${encodeURIComponent(c.id)}`} tabIndex={-1} className="min-w-[2.2rem] flex-1 truncate text-center text-[9.5px] leading-tight hover:underline" title={names.get(c.id)} style={{ writingMode: columns.length > 12 ? "vertical-rl" : undefined, maxHeight: "6.5rem" }}>{names.get(c.id)}</Link>)}
      </div>
    </div>
    {domain && kind === "position" && <p className="bh-muted mt-1 text-[11px]">Scale {Math.round(domain[0])}–{Math.round(domain[1])} Elo; column heights are positions, not multiples.</p>}
  </figure>;
}
