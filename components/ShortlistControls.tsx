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

function Histogram({
  values, min, max, threshold, keep, log, format, label,
}: {
  values: number[]; min: number; max: number; threshold: number;
  keep: (v: number) => boolean; log?: boolean;
  format: (v: number) => string; label: string;
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
    <div className="mt-2" aria-hidden="true">
      <div className="flex h-12 items-end gap-[3px]">
        {bins.map((b, i) => (
          <div key={i} className="relative flex-1" style={{ height: "100%" }}>
            {/* An empty bin keeps a hairline, so the axis stays readable as an axis. */}
            <div className="absolute inset-x-0 bottom-0 h-px bg-line" />
            <div className="absolute inset-x-0 bottom-0 rounded-t-[2px] bg-gray-500/45"
                 style={{ height: `${(b.total / peak) * 100}%` }} />
            <div className="absolute inset-x-0 bottom-0 rounded-t-[2px] bg-accent"
                 style={{ height: `${(b.kept / peak) * 100}%` }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-gray-500">
        <span>{format(min)}</span>
        <span className="text-gray-600">{label}{log ? " · log scale" : ""}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}

function Row({
  title, hint, value, children,
}: { title: string; hint: string; value: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-gray-300">{title}</span>
        <span className="tabular text-sm font-semibold text-accent">{value}</span>
      </div>
      {children}
      <p className="mt-1 text-[11px] text-gray-500">{hint}</p>
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

  // The comparison Florian asked for, stated in words next to the slider: what does the
  // expensive end cost compared with the middle of the field, and with a model 10 % weaker?
  const spread = costStats.median > 0 ? costMax / costStats.median : null;
  const tenPctWorse = useMemo(() => {
    if (!scores.length) return null;
    const best = Math.max(...scores);
    const target = best * 0.9;
    return { target, best };
  }, [scores]);

  return (
    <div className="card mb-4 p-4">
      <div className="grid gap-5 sm:grid-cols-2">
        <Row
          title={`Minimum ${scoreName}`}
          value={minScore > 0 ? minScore.toFixed(0) : "any"}
          hint={tenPctWorse
            ? `Best model in view scores ${tenPctWorse.best.toFixed(1)}; 10 % below that is ${tenPctWorse.target.toFixed(1)}.`
            : "How good the model has to be."}
        >
          <input
            type="range" aria-label={`Minimum ${scoreName}`}
            min={scoreStats.min} max={scoreStats.max} step={1} value={Math.min(minScore, scoreStats.max)}
            onChange={(e) => setMinScore(Number(e.target.value))}
            className={slider}
            style={{ "--bh-range-fill": trackFill((Math.min(minScore, scoreStats.max) - scoreStats.min) / Math.max(1, scoreStats.max - scoreStats.min)) } as React.CSSProperties}
          />
          <Histogram values={scoreStats.sorted} min={scoreStats.min} max={scoreStats.max}
              threshold={minScore} keep={(v) => v >= minScore}
              format={(v) => v.toFixed(0)} label={`${scores.length} models`} />
        </Row>

        <Row
          title="Maximum cost per task"
          value={maxCost == null ? "no limit" : money(maxCost)}
          hint={spread && spread > 1.2
            ? `The priciest model in view costs ${spread.toFixed(0)}× the median (${money(costStats.median)} → ${money(costMax)}).`
            : "How much one task may cost you."}
        >
          <input
            type="range" aria-label="Maximum cost per task"
            min={0} max={1000} step={1} value={fromCost(maxCost)}
            onChange={(e) => setMaxCost(toCost(Number(e.target.value)))}
            className={slider}
            style={{ "--bh-range-fill": trackFill(fromCost(maxCost) / 1000) } as React.CSSProperties}
          />
          <Histogram values={costStats.sorted} min={costMin} max={costMax} log
              threshold={maxCost ?? costMax} keep={(v) => maxCost == null || v <= maxCost}
              format={money} label={`${costStats.sorted.length} models · ${costUnit}`} />
        </Row>
      </div>

      <p className="mt-4 border-t border-line/60 pt-3 text-xs text-gray-400">
        {matching === 0
          ? `No model out of ${pool} meets both limits — lower the score or raise the budget.`
          : <><b className="text-gray-200">{matching}</b> of {pool} recommended models meet your limits
            {matching > limit ? <>; the {limit} most expensive are listed</> : <>, all listed</>}.</>}
        {(minScore > 0 || maxCost != null) && (
          <button type="button" onClick={() => { setMinScore(0); setMaxCost(null); }}
            className="ml-3 rounded border border-line px-2 py-0.5 text-[11px] text-gray-400 hover:text-gray-200">
            clear both limits
          </button>
        )}
      </p>
    </div>
  );
}
