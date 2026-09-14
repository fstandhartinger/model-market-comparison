"use client";
import { useMemo } from "react";
import { useSettings } from "./SettingsContext";
import { InfoTip } from "./InfoTip";
import { ADJUSTED_COST_TIP, scoreTip } from "./methodology";
import type { ScoreKey } from "../lib/types";

/** R5.3–R5.5 — Simple mode's two questions, as sliders.
 *
 *  Florian: "Der User sagt nur kurz, wie gut das modell sein soll, und was er maximal
 *  ausgeben will, und dann bekommt er die liste der empfehlenswertesten Modelle."
 *
 *  R5.5 asks for the distribution to appear when a slider is moved. It is shown
 *  permanently instead: the score limit is already active at 86 on first paint, so a
 *  histogram that only appeared on interaction would hide the very fact that the default
 *  is cutting the field — and the chart is the point ("viele Diagramme"). The cost
 *  histogram is binned on a log scale: adjusted task costs span three orders of magnitude,
 *  and linear bins would put every model in the first bar and answer nothing. */

const BINS = 24;

function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return NaN;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function Sparkline({ values, min, max, keep, log }: {
  values: number[]; min: number; max: number; keep: (v: number) => boolean; log?: boolean;
}) {
  const n = BINS;
  const bins = useMemo(() => {
    const out = Array.from({ length: n }, () => ({ total: 0, kept: 0 }));
    if (!(max > min)) return out;
    const toPos = (v: number) => (log
      ? (Math.log10(Math.max(v, min)) - Math.log10(min)) / (Math.log10(max) - Math.log10(min))
      : (v - min) / (max - min));
    for (const v of values) {
      const i = Math.min(n - 1, Math.max(0, Math.floor(toPos(v) * n)));
      out[i].total += 1;
      if (keep(v)) out[i].kept += 1;
    }
    return out;
  }, [values, min, max, log, keep, n]);
  const peak = Math.max(1, ...bins.map((b) => b.total));

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-[22px]" aria-hidden="true">
      <div className="flex h-full items-end gap-px px-0.5">
        {bins.map((b, i) => (
          <div key={i} className="relative flex-1" style={{ height: "100%" }}>
            <div className="bh-spark-total absolute inset-x-0 bottom-0 rounded-t-[2px]"
                 style={{ height: `${(b.total / peak) * 100}%` }} />
            <div className="absolute inset-x-0 bottom-0 rounded-t-[2px] bg-accent"
                 style={{ height: `${(b.kept / peak) * 100}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({ title, value, children }: { title: React.ReactNode; value: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 whitespace-nowrap text-sm text-gray-300">{title}</span>
        <span className="shrink-0 tabular text-sm font-semibold text-accent">{value}</span>
      </div>
      {children}
    </div>
  );
}

/** F-28: the two ends of a slider's range, 10 px muted under the track. */
function RangeEnds({ lo, hi }: { lo: string; hi: string }) {
  return (
    // The range input is taller than its 4 px rail (22 px, 36 px on phones), so the labels
    // sit in that empty space under the rail instead of adding a line to the card.
    <div className="-mt-3 flex justify-between text-[10px] leading-none tabular text-gray-500 sm:-mt-2" aria-hidden="true">
      <span>{lo}</span><span>{hi}</span>
    </div>
  );
}

const slider = "bh-range mt-1";

/** Chromium has no ::-moz-range-progress equivalent, so the filled part of the rail is a
 *  gradient stop on the track itself. */
const trackFill = (frac: number) => {
  const pct = `${Math.max(0, Math.min(1, frac)) * 100}%`;
  return `linear-gradient(to right, rgb(var(--accent)) 0 ${pct}, rgb(var(--line)) ${pct} 100%)`;
};

export function ShortlistControls({
  scores, costs, minScore, setMinScore, score, scoreName, maxCost, setMaxCost, costUnit, matching, limit, pool, map,
}: {
  scores: number[];               // scores of every model in the pool, before the two sliders
  costs: number[];                // adjusted costs of every model in the pool, before the sliders
  minScore: number;
  setMinScore: (n: number) => void;
  score: ScoreKey;
  scoreName: string;
  maxCost: number | null;         // null = no limit
  setMaxCost: (n: number | null) => void;
  costUnit: string;
  matching: number;               // rows matching the sliders, before the limit
  limit: number;
  pool: number;                   // rows the other filters allow, before the sliders
  map?: React.ReactNode;          // F-13: value-map node, rendered beside the sliders (lg) / between sliders and summary (below lg)
}) {
  const { openFilters } = useSettings();
  const scoreStats = useMemo(() => {
    const sorted = [...scores].sort((a, b) => a - b);
    return { sorted, min: Math.floor(sorted[0] ?? 0), max: Math.ceil(sorted[sorted.length - 1] ?? 100) };
  }, [scores]);
  const costStats = useMemo(() => {
    const sorted = costs.filter((c) => c > 0).sort((a, b) => a - b);
    return {
      sorted,
      min: sorted[0] ?? 0,
      max: sorted[sorted.length - 1] ?? 0,
      median: quantile(sorted, 0.5),
    };
  }, [costs]);

  const costMax = costStats.max || 1;
  const costMin = costStats.min || costMax / 1000;
  // The cost slider runs on the same log axis as its histogram, so the middle of the
  // track is the geometric middle of the market rather than a point past the long tail.
  const toCost = (pos: number) => {
    if (pos >= 1000) return null;
    const lo = Math.log10(costMin), hi = Math.log10(costMax);
    return Math.pow(10, lo + (hi - lo) * (pos / 1000));
  };
  const fromCost = (value: number | null) => {
    if (value == null) return 1000;
    const lo = Math.log10(costMin), hi = Math.log10(costMax);
    if (!(hi > lo)) return 1000;
    return Math.round(Math.min(1, Math.max(0, (Math.log10(value) - lo) / (hi - lo))) * 1000);
  };
  const money = (v: number) => (v >= 10 ? `$${v.toFixed(0)}` : v >= 1 ? `$${v.toFixed(2)}` : `$${v.toFixed(3)}`);

  return (
    <div className="card mb-4 p-3 lg:p-4">
      {/* F-13: one card. DOM order — sliders, map, summary — is what phones stack with.
          At lg the grid places the map in column 2 spanning both rows, so the left column
          reads: sliders stacked (score above cost), then the summary line. Below lg the two
          sliders sit side by side so the list starts on the first phone screen. */}
       <div className={map ? "grid items-start gap-3 lg:grid-cols-[2fr_3fr] lg:gap-6" : undefined}>
        <div className="grid grid-cols-1 gap-3 self-start sm:grid-cols-2 lg:grid-cols-1 lg:gap-2">
          <Row
            title={<><span className="sm:hidden">Min. capability score</span><span className="hidden sm:inline">Minimum Capability Score</span> <span className="bh-muted text-[11px]">({scoreName})</span><InfoTip title={`Minimum capability score — ${scoreName}`} label="the minimum capability score setting">{scoreTip(score)}<span className="mt-2 block text-xs text-gray-500">This setting follows the active score selector.</span></InfoTip></>}
            value={minScore > 0 ? minScore.toFixed(0) : "any"}
          >
            <div className="relative mt-1">
              <Sparkline values={scoreStats.sorted} min={scoreStats.min} max={scoreStats.max} keep={(v) => v >= minScore} />
              <input type="range" aria-label={`Minimum Capability Score (${scoreName})`}
                min={scoreStats.min} max={scoreStats.max} step={1} value={Math.min(minScore, scoreStats.max)}
                onChange={(e) => setMinScore(Number(e.target.value))} className={`${slider} relative z-10`}
                style={{ "--bh-range-fill": trackFill((Math.min(minScore, scoreStats.max) - scoreStats.min) / Math.max(1, scoreStats.max - scoreStats.min)) } as React.CSSProperties} />
            </div>
            <RangeEnds lo={String(scoreStats.min)} hi={String(scoreStats.max)} />
          </Row>

          <Row
            title={<><span className="sm:hidden">Max cost / task</span><span className="hidden sm:inline">{costUnit === "adjusted $/task" ? "Max adjusted cost / task" : "Max cost / task"}</span>{costUnit === "adjusted $/task" && <InfoTip title="Adjusted cost" label="the adjusted cost setting">{ADJUSTED_COST_TIP}</InfoTip>}</>}
            value={maxCost == null ? "no limit" : money(maxCost)}
          >
            <div className="relative mt-1">
              <Sparkline values={costStats.sorted} min={costMin} max={costMax} log keep={(v) => maxCost == null || v <= maxCost} />
              <input type="range" aria-label={`Maximum ${costUnit}`} min={0} max={1000} step={1} value={fromCost(maxCost)}
                onChange={(e) => setMaxCost(toCost(Number(e.target.value)))} className={`${slider} relative z-10`}
                style={{ "--bh-range-fill": trackFill(fromCost(maxCost) / 1000) } as React.CSSProperties} />
            </div>
            {costStats.sorted.length > 0 && <RangeEnds lo={money(costMin)} hi={money(costMax)} />}
          </Row>
        </div>

        {map && <div className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1">{map}</div>}

        <div className="border-t border-line/60 pt-1.5 text-xs text-gray-400 lg:pt-2">
          {matching === 0
            ? `No model out of ${pool} meets both limits — lower the score or raise the budget.`
            : <><b className="text-gray-200">{matching} models pass</b>{" "}
            {/* F-18: the pool is what the filters allow, so its count opens them. */}
            <button type="button" data-bh-filters-toggle onClick={openFilters} title="These models are what your filters allow — open the filters"
              className="min-h-0 text-accent underline decoration-dotted underline-offset-2">of {pool}</button>
            {" "}· {Math.max(0, pool - matching)} below your score line
              {matching > limit && <> · {limit} shown: the Pareto line first, then the highest scores</>}</>}
          {(minScore > 0 || maxCost != null) && (
            <button type="button" onClick={() => { setMinScore(0); setMaxCost(null); }} className="ml-2 text-accent underline underline-offset-2">
              show all {pool}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
