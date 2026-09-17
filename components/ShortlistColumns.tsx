"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ClientData } from "../lib/client-model";
import { hasScoreEvidence } from "../lib/client-model";
import { SCORE_PICKER_LABELS, SCORE_SHORT_LABELS, type ScoreKey } from "../lib/types";
import { formatValue, shortlistColumns } from "../lib/benchmark-matrix.mjs";
import { seriesColor } from "./BenchmarkBars";
import { AaCredit } from "./AaCredit";
import { EpochCredit } from "./EpochCredit";
import { GearIcon } from "./GearIcon";

/** CR-33.2: the scores the chart can show. The Main Composite is the default; category composites join
 *  this list too (CR-25.6). */
const CHART_SCORES: ScoreKey[] = ["composite", "aa_intelligence_index", "aa_coding_index", "aa_coding_agent", "epoch_eci", "epoch_eci_software", "designarena_fullstack", "designarena_frontend", "cat_coding", "cat_agentic", "cat_science", "cat_long_context"];

/** CR-33.1 (Florian 2026-09-15): a column chart above the shortlist table — every shortlisted model's score,
 *  high → low, values on the columns. The table's five columns keep their colours here. */
export function ShortlistColumns({ data, ids, tableIds, names, onToggle, full = false }: { data: ClientData; ids: string[]; tableIds: string[]; names: Map<string, string>; onToggle?: (id: string) => void; full?: boolean }) {
  // F-106 (CR-49.1): the chart is the picker — each column's bar is a toggle for the comparison below. The hint shows
  // until the reader's first toggle (remembered in this browser).
  const [hintSeen, setHintSeen] = useState(true);
  useEffect(() => { try { setHintSeen(localStorage.getItem(HINT_KEY) === "1"); } catch { /* ignore */ } }, []);
  const toggle = (id: string, inTable: boolean) => {
    if (!onToggle || (!inTable && full)) return;
    onToggle(id);
    if (!hintSeen) { setHintSeen(true); try { localStorage.setItem(HINT_KEY, "1"); } catch { /* ignore */ } }
  };
  const toggleProps = (id: string, value: string) => {
    const j = tableIds.indexOf(id), inTable = j >= 0, blocked = !inTable && full, name = names.get(id) ?? id;
    return {
      type: "button" as const, "aria-pressed": inTable, "aria-disabled": blocked || undefined, "data-toggle": id,
      "aria-label": `${name}, ${value}, ${inTable ? `in your comparison as ${String.fromCharCode(65 + j)}` : "not in your comparison"}`,
      title: blocked ? `Your comparison is full (${tableIds.length}) — remove a model first` : inTable ? `Remove ${name} from the comparison below` : `Add ${name} to the comparison below`,
      onClick: () => toggle(id, inTable),
    };
  };
  const [score, setScore] = useState<ScoreKey>("composite");
  // Pass 17 (Fable): below md the chart is re-laid out as bar rows (name · bar · value) so every model is
  // visible without horizontal panning; the columns stay for wider screens.
  const [rows, setRows] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767.98px)");
    const apply = () => setRows(mq.matches);
    apply(); mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  // CR-40.3 (Florian 2026-09-16): a cogwheel with a zero-baseline option for readers who want columns from
  // zero; the default is the zoomed axis (CR-40.2). Persisted per browser.
  const [zeroBaseline, setZeroBaseline] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  useEffect(() => { try { const raw = localStorage.getItem(PREFS_KEY); if (raw) setZeroBaseline(JSON.parse(raw).zeroBaseline === true); } catch { /* ignore */ } }, []);
  const updateZero = (on: boolean) => { setZeroBaseline(on); try { localStorage.setItem(PREFS_KEY, JSON.stringify({ zeroBaseline: on })); } catch { /* ignore */ } };
  const byId = useMemo(() => new Map(data.models.map((m) => [m.id, m])), [data]);
  const elo = score.startsWith("designarena");
  const unit = elo ? "Elo" : "points";
  const { columns, kind, domain, ticks } = useMemo(() => shortlistColumns(ids.map((id) => {
    const m = byId.get(id);
    return { id, value: m && hasScoreEvidence(m, score) ? m.scores[score] ?? null : null };
  }), unit, { zeroBaseline }), [ids, byId, score, unit, zeroBaseline]);
  if (ids.length < 2) return null;
  const label = score === "composite" ? "Benchmark Heaven Score (Main Composite Score)" : SCORE_SHORT_LABELS[score];
  const measured = columns.filter((c) => !c.noData).length;
  const pct = (v: number) => domain ? `${((v - domain[0]) / (domain[1] - domain[0])) * 100}%` : "0%";
  // CR-40.2: the range the columns are drawn in is always said in words, next to the axis labels.
  const range = domain && kind === "zoomed"
    ? <>Axis {tick(domain[0])}–{tick(domain[1])}, zoomed in: columns start at {tick(domain[0])}, not at zero, so differences are easier to see.</>
    : domain && kind === "bar" ? <>Axis {tick(domain[0])}–{tick(domain[1])}: columns start at zero.</> : null;
  const rangeText = domain && (kind === "zoomed" || kind === "bar") ? `, axis from ${tick(domain[0])} to ${tick(domain[1])}${kind === "zoomed" ? ", not starting at zero" : ""}` : "";
  return <figure className="card mt-4 p-3 sm:p-4" aria-labelledby="bh-shortlist-cols-title" data-shortlist-columns>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <figcaption id="bh-shortlist-cols-title" className="text-sm font-semibold">{label}<span className="bh-muted ml-2 text-xs font-normal">{measured} of {columns.length} models{kind === "position" ? " · Elo, drawn between the lowest and highest rating" : ""} · <AaCredit /> · <EpochCredit bare /></span></figcaption>
      {/* CR-79 (found while verifying): the picker's widest option set its intrinsic width, so at the phone's
          larger-text setting this row was 372 px wide inside a 390 px viewport and pushed the whole page sideways.
          min-w-0 lets it shrink; the select keeps its own width but never wider than the card. */}
      <div className="relative flex min-w-0 max-w-full items-center gap-1">
        <label className="min-w-0 text-xs">
          <span className="sr-only">Score shown in the chart</span>
          <select className="bh-input max-w-full py-1 text-xs" value={score} onChange={(e) => setScore(e.target.value as ScoreKey)} data-shortlist-score>
            {CHART_SCORES.map((k) => <option key={k} value={k}>{k === "composite" ? "Benchmark Heaven Score" : SCORE_PICKER_LABELS[k]}</option>)}
          </select>
        </label>
        <button type="button" aria-label="Chart settings" aria-expanded={prefsOpen} aria-controls="bh-shortlist-chart-settings" data-shortlist-settings onClick={() => setPrefsOpen((o) => !o)}
          className="inline-flex h-7 min-h-0 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-accent/10 hover:text-accent">
          <GearIcon />
        </button>
        {prefsOpen && <div id="bh-shortlist-chart-settings" role="group" aria-label="Chart settings" tabIndex={-1}
          onKeyDown={(e) => { if (e.key === "Escape") setPrefsOpen(false); }}
          className="absolute right-0 top-full z-30 mt-1 w-64 space-y-2 rounded-lg border border-line bg-[var(--surface)] p-3 text-xs shadow-xl">
          <label className="flex items-center justify-between gap-2"><span>Start the axis at zero</span><input type="checkbox" checked={zeroBaseline} disabled={elo} onChange={(e) => updateZero(e.target.checked)} data-pref="zeroBaseline" /></label>
          <p className="bh-muted leading-snug">{elo ? "Elo ratings have no zero point, so they are always drawn between the lowest and highest rating." : "Off: the axis starts just below the lowest score, so close scores are easier to tell apart. On: columns start at zero."}</p>
          <button type="button" className="text-accent underline" onClick={() => setPrefsOpen(false)}>Done</button>
        </div>}
      </div>
    </div>
    {range && <p className="bh-muted mt-1 flex items-center gap-1.5 text-[11px]" data-axis-range={kind} aria-live="polite">{kind === "zoomed" && <AxisBreak />}{range}</p>}
    {onToggle && !hintSeen && <p className="bh-muted mt-1 text-[11px]" data-toggle-hint>{rows ? "Tap a bar" : "Click a column"} to add or remove a model from the table below.</p>}
    <p className="sr-only" data-chart-summary>{`${label}${rangeText}: ${columns.map((c) => `${names.get(c.id) ?? c.id} ${c.noData ? "no data" : formatValue(c.value as number, unit)}`).join(", ")}`}</p>
    <div className={rows ? "mt-3" : "mt-3 overflow-x-auto"} data-shortlist-plot>
      {rows
        ? <div className="space-y-1">
          {ticks.length > 0 && <div className="flex items-center gap-2 text-[9px] leading-none" aria-hidden="true" data-axis-ticks>
            <span className="w-[38%] shrink-0" />
            <span className="bh-muted relative h-3 flex-1">{ticks.map((t) => <span key={t} className="absolute top-0 -translate-x-1/2 tabular" style={{ left: pct(t) }}>{tick(t)}</span>)}</span>
            <span className="w-10 shrink-0" />
          </div>}
          {columns.map((c) => {
            const j = tableIds.indexOf(c.id);
            const valueText = c.noData ? "no data" : formatValue(c.value as number, unit);
            const bar = <>{c.noData
                  ? <span className="bh-muted text-[9px]">no data</span>
                  : <span className="block h-3.5 rounded-t rounded-r" style={{ width: `${Math.round((c.height ?? 0) * 100)}%`, background: j >= 0 ? seriesColor(j) : "rgb(var(--accent) / .45)" }} />}</>;
            return <div key={c.id} className="flex items-center gap-2 text-[11px] leading-tight" data-col={c.id} data-no-data={c.noData ? "1" : undefined}>
              <span className="order-3 w-10 shrink-0 text-right font-semibold tabular" aria-hidden="true">{c.noData ? "" : valueText}</span>
              <Link href={`/models/${encodeURIComponent(c.id)}`} tabIndex={-1} aria-hidden="true" className="order-1 w-[38%] shrink-0 hover:underline">{names.get(c.id)}</Link>
              {onToggle
                ? <button {...toggleProps(c.id, valueText)} className="bh-col-toggle order-2 flex h-6 min-h-0 flex-1 items-center rounded p-0">{bar}</button>
                : <span className="order-2 flex h-3.5 flex-1 items-center" aria-hidden="true">{bar}</span>}
            </div>;
          })}
        </div>
        : <div className="pl-6" style={{ width: `max(100%, ${columns.length * 2.6 + 4}rem)` }}>
          <div className="relative ml-8 h-44">
            <div className="absolute inset-x-0 bottom-0 top-4" data-plot>
              {ticks.map((t) => <div key={t} className="absolute inset-x-0 border-t border-line/70" style={{ bottom: pct(t) }} data-axis-tick={t} aria-hidden="true">
                <span className="bh-muted absolute right-full mr-1.5 -translate-y-1/2 text-[9.5px] tabular">{tick(t)}</span>
              </div>)}
              {kind === "zoomed" && <span className="absolute right-full top-full mr-1.5 mt-1 leading-none"><AxisBreak /></span>}
              <div className="absolute inset-0 flex items-end gap-1.5">
                {columns.map((c) => {
                  const j = tableIds.indexOf(c.id), h = `${Math.round((c.height ?? 0) * 1000) / 10}%`;
                  const inner = c.noData
                    ? <span className="bh-muted absolute inset-0 flex items-end justify-center rounded-t border border-dashed border-line pb-1 text-[9px]" aria-hidden="true">no data</span>
                    : <>
                      <span className="absolute inset-x-0 bottom-0 rounded-t" aria-hidden="true" style={{ height: h, background: j >= 0 ? seriesColor(j) : "rgb(var(--accent) / .45)" }} />
                      <span className="absolute inset-x-0 text-center text-[10px] font-semibold leading-none tabular" aria-hidden="true" style={{ bottom: `calc(${h} + 3px)` }}>{formatValue(c.value as number, unit)}</span>
                    </>;
                  return onToggle
                    ? <button key={c.id} {...toggleProps(c.id, c.noData ? "no data" : formatValue(c.value as number, unit))} className="bh-col-toggle relative block h-full min-h-0 min-w-[2.2rem] flex-1 rounded-t p-0" data-col={c.id} data-no-data={c.noData ? "1" : undefined}>{inner}</button>
                    : <div key={c.id} className="relative h-full min-w-[2.2rem] flex-1" data-col={c.id} data-no-data={c.noData ? "1" : undefined} aria-hidden="true">{inner}</div>;
                })}
              </div>
            </div>
          </div>
          {/* CR-40.1 (Florian 2026-09-16): names run diagonally, ending under their column, so they read without
              turning the head. */}
          <div className="ml-8 flex h-[5.75rem] gap-1.5" data-diagonal-names aria-hidden="true">
            {columns.map((c) => {
              const name = names.get(c.id) ?? c.id;
              return <div key={c.id} className="relative min-w-[2.2rem] flex-1">
                <Link href={`/models/${encodeURIComponent(c.id)}`} tabIndex={-1} title={name} className="absolute right-1/2 top-1 origin-top-right -rotate-45 whitespace-nowrap text-[9.5px] leading-none hover:underline" data-name-for={c.id}>{name.length > NAME_MAX ? `${name.slice(0, NAME_MAX - 1)}…` : name}</Link>
              </div>;
            })}
          </div>
        </div>}
    </div>
    {domain && kind === "position" && <p className="bh-muted mt-1 text-[11px]">Scale {Math.round(domain[0])}–{Math.round(domain[1])} Elo; column heights are positions, not multiples.</p>}
  </figure>;
}

const PREFS_KEY = "bh.shortlistChart.v1";
const HINT_KEY = "bh.simpleShortlistHint.v1";
const NAME_MAX = 22;
const tick = (v: number) => String(Math.round(v * 10) / 10);

/** The conventional axis-break mark: the axis does not start at zero. */
function AxisBreak() {
  return <svg aria-hidden="true" width="14" height="10" viewBox="0 0 14 10" className="shrink-0 text-gray-400" data-axis-break><path d="M0 7 L3.5 2 L7 7 L10.5 2 L14 7" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>;
}
