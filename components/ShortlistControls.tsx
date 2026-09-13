"use client";
import { useMemo } from "react";

/** R5.3–R5.5 — Simple mode's two questions, as sliders.
 *
 *  Florian: "Der User sagt nur kurz, wie gut das modell sein soll, und was er maximal
 *  ausgeben will, und dann bekommt er die liste der empfehlenswertesten Modelle."
 *
 *  R5.5 asks for the distribution to appear when a slider is moved. It is shown
 *  permanently instead: the score limit is already active at 85 on first paint, so a
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
            <div className="absolute inset-x-0 bottom-0 rounded-t-[2px] bg-gray-500/25"
                 style={{ height: `${(b.total / peak) * 100}%` }} />
            <div className="absolute inset-x-0 bottom-0 rounded-t-[2px] bg-accent/70"
                 style={{ height: `${(b.kept / peak) * 100}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({ title, value, children }: { title: string; value: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-gray-300">{title}</span>
        <span className="tabular text-sm font-semibold text-accent">{value}</span>
      </div>
      {children}
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
  scores, costs, minScore, setMinScore, scoreName, maxCost, setMaxCost, costUnit, matching, limit, pool,
}: {
  scores: number[];               // scores of every model in the pool, before the two sliders
  costs: number[];                // adjusted costs of every model in the pool, before the sliders
  minScore: number;
  setMinScore: (n: number) => void;
  scoreName: string;
  maxCost: number | null;         // null = no limit
  setMaxCost: (n: number | null) => void;
  costUnit: string;
  matching: number;               // rows matching the sliders, before the limit
  limit: number;
  pool: number;                   // rows the other filters allow, before the sliders
}) {
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
    <div className="card mb-4 p-3">
      <div className="grid grid-cols-2 gap-2">
        <Row
          title={`Minimum ${scoreName}`}
          value={minScore > 0 ? minScore.toFixed(0) : "any"}
        >
          <div className="relative mt-1">
            <Sparkline values={scoreStats.sorted} min={scoreStats.min} max={scoreStats.max} keep={(v) => v >= minScore} />
            <input type="range" aria-label={`Minimum ${scoreName}`}
              min={scoreStats.min} max={scoreStats.max} step={1} value={Math.min(minScore, scoreStats.max)}
              onChange={(e) => setMinScore(Number(e.target.value))} className={`${slider} relative z-10`}
              style={{ "--bh-range-fill": trackFill((Math.min(minScore, scoreStats.max) - scoreStats.min) / Math.max(1, scoreStats.max - scoreStats.min)) } as React.CSSProperties} />
          </div>
        </Row>

        <Row
          title="Max cost / task"
          value={maxCost == null ? "no limit" : money(maxCost)}
        >
          <div className="relative mt-1">
            <Sparkline values={costStats.sorted} min={costMin} max={costMax} log keep={(v) => maxCost == null || v <= maxCost} />
            <input type="range" aria-label="Maximum cost per task" min={0} max={1000} step={1} value={fromCost(maxCost)}
              onChange={(e) => setMaxCost(toCost(Number(e.target.value)))} className={`${slider} relative z-10`}
              style={{ "--bh-range-fill": trackFill(fromCost(maxCost) / 1000) } as React.CSSProperties} />
          </div>
        </Row>
      </div>

      <div className="mt-2 border-t border-line/60 pt-2 text-xs text-gray-400">
        {matching === 0
          ? `No model out of ${pool} meets both limits — lower the score or raise the budget.`
          : <><b className="text-gray-200">{matching} models pass</b> · {Math.max(0, pool - matching)} below your score line
            {matching > limit && <> · the {limit} most expensive are listed</>}</>}
        {(minScore > 0 || maxCost != null) && (
          <button type="button" onClick={() => { setMinScore(0); setMaxCost(null); }} className="ml-2 text-accent underline underline-offset-2">
            show all {pool}
          </button>
        )}
      </div>
    </div>
  );
}
