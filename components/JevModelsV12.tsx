"use client";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { JevAxis, JevTier12, JevV12Row, JevV12View } from "../lib/jevbench-v12.mjs";
import { AXES, AXIS_LABEL, DEFAULT_PRESET, DEFAULT_WEIGHTS, PRESETS, SCORE_NAME, describe, isDefault, normalise, parseParams, percents, rerank, sameWeights, toParam, type JevWeights4 } from "../lib/jevbench-v12-weights.mjs";

// CR-92 (Florian 2026-09-19): JevBench v1.2 final. The JevBench Score = geometric mean of Intelligence, Calibration, Speed
// and Cost, 25 % each, is the hero; the earlier weightings stay as presets (recomputed the same way) with the unmissable
// "not the default" state, custom sliders and a shareable ?w= URL (CR-87). Every published value is the artifact's; other
// weightings are recomputed in the browser from the published axis scores. Speed is shown with its one-line honesty note
// wherever it appears, raw latency beside the adjusted one.
const TIER_ORDER: JevTier12[] = ["easy", "standard", "judge", "hard"];
const TIER_LABEL: Record<JevTier12, string> = { easy: "Easy", standard: "Standard", judge: "Judge", hard: "Hard" };
type Col = "main" | JevAxis | JevTier12 | "p50" | "usd";
type Row = JevV12Row & { score: number | null; official: number; rank: number | null; delta: number };
const HIGHER: Record<Col, boolean> = { main: true, intelligence: true, calibration: true, speed: true, cost: true, easy: true, standard: true, judge: true, hard: true, p50: false, usd: false };
const val = (r: Row, c: Col): number | null =>
  c === "main" ? r.score : c === "p50" ? r.p50 : c === "usd" ? r.usd : (AXES as string[]).includes(c) ? r.axes[c as JevAxis] : r.tiers[c as JevTier12];

const one = (v: number | null) => (v === null ? "—" : v.toFixed(1));
const pct = (v: number | null) => (v === null ? "—" : `${(v * 100).toFixed(1)}%`);
const sec = (v: number | null) => (v === null ? "—" : `${v.toFixed(2)} s`);
const short = (d: string) => d.split(" (")[0].split(", formerly")[0];
const TYPE: Record<string, { label: string; v: string }> = {
  jev: { label: "Jev (TypeSafe, closed)", v: "--jev-t-jev" },
  "jev-rebuild": { label: "Open Jev rebuild", v: "--jev-t-rebuild" },
  "llm-baseline": { label: "Instruction model, JSON schema", v: "--jev-t-llm" },
  "small-tool-model": { label: "Small tool-calling model", v: "--jev-t-tool" },
};
const typeVar = (cls: string) => ({ ["--jev-t" as string]: `var(${(TYPE[cls] ?? TYPE["llm-baseline"]).v})` });
const chartName = (r: JevV12Row) => r.key === "gpt-5.6-luna" ? "GPT-5.6 Luna (low)" : r.key.endsWith("-tools") ? "Needle 3, options as tools"
  : r.key === "openjev-razorback16" ? "OpenJev (razorback16)" : r.key === "open-alternative-jev" ? "open-alternative-jev (Qwen3.5-4B)" : r.key === "semif-qwen3.5-4b" ? "SemIf (Qwen3.5-4B)" : short(r.display);

/** $ per 1,000 decisions: four decimals below one cent so e.g. $0.0045 and $0.0092 stay distinguishable. */
export const usdText = (x: number) => `$${x.toFixed(x < 0.01 ? 4 : 3)}`;

export function CostValue({ r }: { r: JevV12Row }) {
  const v = usdText(r.usd);
  return r.costKind === "estimate"
    ? <span title={r.costBasis} data-bh-jev12-cost-kind="estimate">~{v} <span className="bh-thin-tag">est.</span></span>
    : <span title={r.costBasis} data-bh-jev12-cost-kind="measured">{v}</span>;
}

/** The one line every Speed display carries (Florian's honesty rule, CR-92). */
export function SpeedNote({ view, className = "" }: { view: JevV12View; className?: string }) {
  return <span className={`bh-muted block text-[12px] ${className}`} data-bh-jev12-speed-note>⏱ {view.speedNote}</span>;
}

function ProjectLink({ r, children, className = "" }: { r: JevV12Row; children: ReactNode; className?: string }) {
  return r.link
    ? <a href={r.link} target="_blank" rel="noopener noreferrer" className={`underline decoration-[rgb(var(--line))] underline-offset-2 hover:text-accent hover:decoration-current ${className}`} title={`${r.display} — ${r.author} · ${r.link.replace(/^https:\/\//, "")}`} data-bh-jev-link={r.key}>{children}</a>
    : <span className={className}>{children}</span>;
}

const Delta = ({ d }: { d: number }) => d === 0 ? null
  : <span className={`ml-1 text-[11px] font-semibold ${d > 0 ? "text-[rgb(var(--accent2))]" : "text-[rgb(var(--warn))]"}`} data-bh-jevc-delta={d}
      title={`${Math.abs(d)} place${Math.abs(d) === 1 ? "" : "s"} ${d > 0 ? "higher" : "lower"} than in the official ranking`}>
      {d > 0 ? "▲" : "▼"}{Math.abs(d)}<span className="sr-only"> vs. official rank</span></span>;

function Controls({ w, raw, setPreset, setRaw, reset }: { w: JevWeights4; raw: JevWeights4; setPreset: (p: JevWeights4) => void; setRaw: (r: JevWeights4) => void; reset: () => void }) {
  const d = describe(w);
  const eff = percents(w);
  const [copied, setCopied] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard blocked: the URL bar already holds the link */ } };
  return <section className="bh-panel p-4" aria-labelledby="jevc-weights" data-bh-jevc-controls data-bh-jevc-state={d.official ? "official" : "custom"}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 id="jevc-weights" className="text-base font-semibold">Weighting: Intelligence : Calibration : Speed : Cost</h2>
      {d.official
        ? <span className="bh-jevc-official" data-bh-jevc-badge="official">Official default</span>
        : <span className="flex flex-wrap items-center gap-2"><span className="bh-jevc-notdefault" role="status" data-bh-jevc-badge="not-default">⚠ Not the default — not the {SCORE_NAME}</span>
            <button type="button" className="bh-button min-h-9 text-sm font-semibold" onClick={reset} data-bh-jevc-reset>Reset to the {SCORE_NAME}</button></span>}
    </div>
    <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-6 lg:items-start" role="group" aria-label="Weighting presets">
      {PRESETS.map((p) => <button key={p.id} type="button" className="bh-jevc-preset" aria-pressed={sameWeights(p.w, w)} aria-label={p.title} onClick={() => setPreset(p.w)} data-bh-jevc-preset={p.id}>
        <span className="block text-[13px] font-semibold">{p.name}</span>
        <span className="bh-muted block text-[12px] tabular">{p.ratio}{p === DEFAULT_PRESET ? " · default" : ""}</span></button>)}
      <details className="bh-jevc-preset col-span-2 lg:col-span-1" open={d.preset === null ? true : undefined} data-bh-jevc-custom-panel>
        <summary className="cursor-pointer text-[13px] font-semibold">Custom{d.preset === null ? ` · ${d.ratio}` : ""}</summary>
        <div className="mt-2 space-y-2">
          {AXES.map((k) => <label key={k} className="block text-[12px]">
            <span className="flex justify-between"><span className="font-semibold">{AXIS_LABEL[k]}</span><span className="tabular bh-muted">{eff[k]} %</span></span>
            <input type="range" min={0} max={100} step={1} value={Math.round(raw[k])} className="bh-jevc-slider" data-bh-jevc-slider={k}
              aria-label={`${AXIS_LABEL[k]} weight`} aria-valuetext={`${eff[k]} percent`}
              onChange={(e) => { const next = { ...raw, [k]: Number(e.target.value) }; if (normalise(next)) setRaw(next); }} />
          </label>)}
        </div>
      </details>
    </div>
    <p className="bh-muted mt-3 text-[13px]" data-bh-jevc-note>
      The official <b className="text-gray-200">{SCORE_NAME}</b> weights the four axes <b className="text-gray-200">25 % each and takes their geometric mean</b>. The other buttons are the earlier views (Balanced 33:33:33 and the three &ldquo;Emphasis on&rdquo; weightings, which leave Calibration out), recomputed the same way.
      Any of them is your view, recomputed in your browser from the published axis scores — not the published score.{" "}
      {!d.official && <button type="button" className="text-accent underline" onClick={copy} data-bh-jevc-copy>{copied ? "Link copied" : "Copy a link to this weighting"}</button>}
    </p>
  </section>;
}

function ScoreChart({ rows, partial, w, view }: { rows: Row[]; partial: Row[]; w: JevWeights4; view: JevV12View }) {
  const d = describe(w);
  const all = [...rows, ...partial];
  const types = Object.keys(TYPE).filter((t) => all.some((r) => r.cls === t));
  const f0 = (v: number | null) => (v === null ? "–" : v.toFixed(0));
  return <figure className={`bh-panel p-4 sm:p-5 ${d.official ? "" : "bh-jevc-custom"}`} data-bh-jev12-main-chart data-bh-jevc-chart={d.official ? "official" : "custom"} aria-labelledby="jevc-title">
    <p className="bh-eyebrow">JevBench v1.2 · {view.decisions} decisions per system</p>
    <h2 id="jevc-title" className="mt-1 text-xl font-bold leading-snug sm:text-2xl" data-bh-jevc-title>{d.title}</h2>
    <p className="mt-1 flex flex-wrap items-center gap-2 text-sm" data-bh-jevc-subtitle>
      {d.official
        ? <><span className="bh-jevc-official">Official</span><span className="bh-muted" data-bh-jev12-oneliner>{view.oneLiner} <a href="#jevc-weights" className="text-accent underline">Change the weighting ↓</a></span></>
        : <><span className="bh-jevc-notdefault">⚠ Not the default — not the {SCORE_NAME}</span><span className="bh-muted">Ranks and scores below are recomputed with {d.ratio} (Intelligence : Calibration : Speed : Cost, geometric mean); ▲▼ = change vs. the official ranking. <a href="#jevc-weights" className="text-accent underline">Weighting ↓</a></span></>}
    </p>
    <div className="mt-4 hidden grid-cols-[1.6rem_14rem_1fr_3.2rem_19rem] gap-x-2 text-[11px] sm:grid" aria-hidden="true">
      <span /><span /><span /><span />
      <span className="bh-muted grid grid-cols-[1fr_1fr_1fr_1fr_2.1fr] text-right font-mono"><span>Intel.</span><span>Calib.</span><span>Speed</span><span>Cost</span><span>$/1k dec.</span></span>
    </div>
    <ol className="mt-2 space-y-2.5 sm:mt-1" data-bh-jevc-bars>
      {all.map((r) => {
        const s = r.score;
        const label = `${r.display}: ${one(s)}${r.rank ? `, rank ${r.rank}` : ", partial run, not ranked"}. Intelligence ${one(r.axes.intelligence)}, calibration ${r.axes.calibration === null ? "none" : one(r.axes.calibration)}, speed ${one(r.axes.speed)}, cost ${one(r.axes.cost)}${r.costKind === "estimate" ? " (estimated)" : ""}.`;
        return <li key={r.key} style={typeVar(r.cls)} className="grid grid-cols-[1.4rem_1fr_3.3rem] items-center gap-x-2 text-sm sm:grid-cols-[1.6rem_14rem_1fr_3.2rem_19rem]"
          data-bh-jev12-bar={r.key} data-bh-jevc-score={s === null ? "" : s.toFixed(3)} aria-label={label}>
          <span className="bh-muted tabular col-start-1 row-start-1 text-right text-xs" data-bh-jevc-rank={r.rank ?? ""}>{r.rank ?? ""}</span>
          <span className="col-start-2 row-start-1 min-w-0 md:truncate sm:col-start-2 sm:text-right" title={r.display}>
            <ProjectLink r={r}>{chartName(r)}</ProjectLink>{!r.ranked && <span className="bh-muted"> (partial run)</span>}{!d.official && r.rank !== null && <Delta d={r.delta} />}
          </span>
          <span className="bh-jevc-grid col-start-2 row-start-2 mt-1 flex h-4 sm:col-start-3 sm:row-start-1 sm:mt-0 sm:h-6" aria-hidden="true">
            {s !== null && <span className={`bh-jevc-bar ${r.ranked ? "" : "is-partial"}`} style={{ width: `${Math.max(0, Math.min(100, s))}%` }} />}
          </span>
          <b className="tabular col-start-3 row-span-2 row-start-1 self-center text-right text-base sm:col-start-4 sm:row-span-1 sm:text-lg" data-bh-jev12-main={s === null ? "" : s.toFixed(3)}>{one(s)}</b>
          <span className="bh-muted col-start-2 row-start-3 mt-0.5 min-w-0 font-mono text-[10.5px] sm:whitespace-nowrap sm:col-start-5 sm:row-start-1 sm:mt-0 sm:grid sm:grid-cols-[1fr_1fr_1fr_1fr_2.1fr] sm:text-right sm:text-[12px]" data-bh-jevc-subs>
            <span className="sm:hidden">I </span><span>{f0(r.axes.intelligence)}</span><span className="sm:hidden"> · C </span><span title={r.calibrationNote ?? undefined}>{f0(r.axes.calibration)}</span>
            <span className="sm:hidden"> · S </span><span>{f0(r.axes.speed)}</span><span className="sm:hidden"> · K </span><span>{f0(r.axes.cost)}</span>
            <span className="sm:hidden"> · </span><span title={r.costBasis} data-bh-jevc-usd>{`${r.costKind === "estimate" ? "~" : ""}${usdText(r.usd)}`}{r.costKind === "estimate" ? " est." : ""}</span>
          </span>
        </li>;
      })}
    </ol>
    <div className="mt-2 hidden grid-cols-[1.6rem_14rem_1fr_3.2rem_19rem] gap-x-2 text-[11px] sm:grid" aria-hidden="true">
      <span /><span /><span className="bh-muted flex justify-between tabular"><span>0</span><span>20</span><span>40</span><span>60</span><span>80</span><span>100</span></span>
    </div>
    <p className="mt-3 text-center text-[13px] sm:text-sm" data-bh-jevc-formula>
      Score = Intelligence<sup>{w.intelligence.toFixed(2)}</sup> × Calibration<sup>{w.calibration.toFixed(2)}</sup> × Speed<sup>{w.speed.toFixed(2)}</sup> × Cost<sup>{w.cost.toFixed(2)}</sup> <span className="bh-muted">(each 0–100; geometric mean)</span>
      {!d.official && <span className="bh-muted block text-[12px]">Official ({DEFAULT_PRESET.name}): the geometric mean of the four axes, 25 % each</span>}
    </p>
    <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[12px]" aria-label="Legend" data-bh-jevc-legend>
      {types.map((t) => <li key={t} style={typeVar(t)}><span className="bh-jevc-swatch mr-1.5" />{TYPE[t].label}</li>)}
      {partial.length > 0 && <li><span className="bh-jevc-swatch is-partial mr-1.5" />Partial run — shown, not ranked</li>}
    </ul>
    <figcaption className="bh-muted mt-3 space-y-1 text-[11.5px] leading-snug" data-bh-jevc-footnotes>
      <SpeedNote view={view} className="text-[11.5px]" />
      <span className="block" data-bh-jev12-oneliner>I, C, S, K = Intelligence, Calibration, Speed, Cost; ~ est. = priced like a large inference provider (<a href="#jev-costs" className="text-accent underline">how costs are estimated</a>); † = see note.</span>
      <details className="mt-2" data-bh-jev12-notes>
        <summary className="cursor-pointer text-accent">Legend and notes</summary>
        <ul className="mt-2 space-y-1">
          <li>Names link to each project.</li>
          <li data-bh-jev12-label-note>A label-only system has no calibration (–, counted as 0).</li>
          {all.filter((r) => r.footnote).map((r) => <li key={r.key} data-bh-jev12-footnote={r.key}>{chartName(r)}: {r.footnote}</li>)}
        </ul>
      </details>
    </figcaption>
  </figure>;
}

function Table({ view, rows, partialRows, w }: { view: JevV12View; rows: Row[]; partialRows: Row[]; w: JevWeights4 }) {
  const [col, setCol] = useState<Col>("main");
  const [flip, setFlip] = useState(false);
  const d = describe(w);
  const sort = (list: Row[]) => {
    const better = HIGHER[col] !== flip;
    return [...list].sort((a, b) => {
      const x = val(a, col), y = val(b, col);
      if (x === null || y === null) return x === null && y === null ? 0 : x === null ? 1 : -1;
      return (better ? y - x : x - y) || (b.score ?? -1) - (a.score ?? -1);
    });
  };
  const ranked = useMemo(() => sort(rows), [rows, col, flip]); // eslint-disable-line react-hooks/exhaustive-deps
  const partial = useMemo(() => sort(partialRows), [partialRows, col, flip]); // eslint-disable-line react-hooks/exhaustive-deps
  const pick = (c: Col) => { if (c === col) setFlip((f) => !f); else { setCol(c); setFlip(false); } };
  const aria = (c: Col) => (c !== col ? "none" : HIGHER[c] !== flip ? "descending" : "ascending");
  const eff = percents(w);
  const H = ({ c, label, sub, hero }: { c: Col; label: string; sub?: string; hero?: boolean }) => <th scope="col" aria-sort={aria(c)} className={hero ? "min-w-[7.5rem]" : "whitespace-nowrap"}>
    <button type="button" data-bh-jev12-sort={c} onClick={() => pick(c)} className={`inline-flex min-h-9 items-center gap-1 rounded px-1 text-left ${col === c ? "text-accent" : ""}`}>
      <span><span className={`block font-semibold ${hero ? "text-[14px]" : "text-[12px]"}`}>{label}</span>{sub && <span className="block text-[11px] font-normal">{sub}</span>}</span>
      <span aria-hidden="true">{col === c ? (aria(c) === "descending" ? "↓" : "↑") : ""}</span></button></th>;
  const R = ({ r }: { r: Row }) => <tr data-bh-jev12-row={r.key} data-bh-jev12-ranked={r.ranked ? "1" : "0"} className={r.ranked ? "" : "bh-jev11-partial"}>
    <td className="bh-muted tabular">{r.rank ?? ""}{!d.official && r.rank !== null && <Delta d={r.delta} />}</td>
    <th scope="row" className="bh-jev-sticky text-left font-normal"><span className="bh-muted block text-[11px] leading-tight">by {r.author}</span>
      <span className="block font-semibold leading-snug"><ProjectLink r={r}>{short(r.display)}</ProjectLink>{r.footnote ? <sup>†</sup> : null}</span>
      {(() => { const cfg = r.display.slice(short(r.display).length).replace(/^[ ,]*\(?|\)$/g, ""); return cfg && cfg !== r.author ? <span className="bh-muted block text-[11px] leading-tight">{cfg}</span> : null; })()}
      {!r.ranked && <span className="bh-thin-tag mt-1 inline-block">partial run · not ranked</span>}</th>
    <td className="tabular"><b className="text-lg" data-bh-jevc-cell-score>{one(r.score)}</b>{!d.official && <span className="bh-muted block text-[11px]" data-bh-jevc-cell-official>official {one(r.official)}</span>}</td>
    <td className="tabular text-[13px]">{one(r.axes.intelligence)}</td>
    <td className="tabular text-[13px]">{r.axes.calibration === null ? <span className="bh-muted text-[12px]" title={r.calibrationNote ?? undefined} data-bh-jev12-no-dist>none (label only)</span> : one(r.axes.calibration)}</td>
    <td className="tabular text-[13px]">{one(r.axes.speed)}</td><td className="tabular text-[13px]">{one(r.axes.cost)}</td>
    <td className="tabular"><CostValue r={r} /></td>
    {TIER_ORDER.map((t) => <td key={t} className="tabular">{pct(r.tiers[t])}</td>)}
    <td className="tabular" title={`${r.endpoint}. Adjustment: ${r.adjustment}.`} data-bh-jev12-latency>
      {sec(r.p50)} <span className="bh-muted">raw</span>{r.p50Adj !== r.p50 && <span className="bh-muted block text-[11px]">→ {sec(r.p50Adj)} adjusted</span>}
      <span className="bh-muted block text-[11px]">p95 {sec(r.p95)} raw{r.p95Adj !== r.p95 ? ` → ${sec(r.p95Adj)}` : ""}</span></td>
    <td className="text-[12px]" title={r.endpoint}>{r.endpointKind === "api" ? "production API" : r.endpointKind === "gpu" ? "our RunPod GPU" : r.endpointKind === "demo" ? "author's demo server" : "our CPU"}</td>
  </tr>;
  const notes = [...view.ranked, ...view.partial].filter((r) => r.footnote);
  return <section className="mt-8" aria-labelledby="jev12-table">
    <h2 id="jev12-table" className="text-xl font-semibold">Axes, tiers, latency and cost</h2>
    <p className="bh-muted mt-1 text-sm">Sort by any column; values the run could not produce always sort last. Hover a cost for how it was priced, a latency for the endpoint. Names link to each project.</p>
    <SpeedNote view={view} className="mt-1" />
    <div className="bh-table-wrap mt-3">
      <table className="bh-table bh-jev-table" data-bh-jev12-table>
        <thead><tr>
          <th scope="col"><span className="sr-only">Rank</span>#</th>
          <th scope="col" className="bh-jev-sticky">System</th>
          {d.official
            ? <H c="main" label={SCORE_NAME} sub="official" hero />
            : <H c="main" label={d.preset ? d.short : `Custom ${d.ratio}`} sub={`${d.ratio} · not the official score`} hero />}
          {AXES.map((k) => <H key={k} c={k} label={AXIS_LABEL[k]} sub={`${eff[k]} %`} />)}
          <H c="usd" label="$ per 1,000" sub="decisions" />
          {TIER_ORDER.map((t) => <H key={t} c={t} label={TIER_LABEL[t]} sub={`${view.tierCounts[t]} dec. · ${Math.round(view.tierWeights[t] * 100)} %`} />)}
          <H c="p50" label="Latency" sub="p50 · p95, raw → adjusted" />
          <th scope="col" className="whitespace-nowrap text-[12px]">Endpoint</th>
        </tr></thead>
        <tbody>
          {ranked.map((r) => <R key={r.key} r={r} />)}
          {partial.length > 0 && <tr><td colSpan={15} className="bh-muted text-[12px]"><span className="sticky left-3 inline-block max-w-[330px] whitespace-normal">Partial runs — shown, not ranked: {view.scoring.ranked.replace(/^Ranked: /, "ranked = ")}</span></td></tr>}
          {partial.map((r) => <R key={r.key} r={r} />)}
        </tbody>
      </table>
    </div>
    {notes.length > 0 && <ul className="bh-muted mt-2 space-y-1 text-xs" data-bh-jev12-notes>{notes.map((r) => <li key={r.key}>† <b className="text-gray-200">{short(r.display)}</b>: {r.footnote}</li>)}</ul>}
  </section>;
}

function Views({ view }: { view: JevV12View }) {
  const keys = PRESETS.map((p) => p.artifactKey);
  const head = keys[0];
  return <section className="mt-8" aria-labelledby="jev12-views">
    <h2 id="jev12-views" className="text-xl font-semibold">How the ranking moves with other weights</h2>
    <p className="bh-muted mt-1 text-sm">Rank and score under the {SCORE_NAME} and the earlier views, all combined as a geometric mean (Intelligence : Calibration : Speed : Cost). <span className="font-semibold text-[rgb(var(--warn))]">Highlighted</span> = a different rank than the {SCORE_NAME}. Ranked systems only.</p>
    <div className="bh-table-wrap mt-3">
      <table className="bh-table bh-jev-table" data-bh-jev12-views>
        <thead><tr><th scope="col" className="bh-jev-sticky">System</th>{PRESETS.map((p) => <th key={p.id} scope="col" className="whitespace-nowrap">{p.id === "score" ? <b>{p.name}</b> : p.name}<span className="bh-muted block text-[11px] font-normal">{p.ratio}{p.id === "score" ? " · official" : " · not the default"}</span></th>)}</tr></thead>
        <tbody>{view.ranked.map((r) => <tr key={r.key} data-bh-jev12-view-row={r.key}>
          <th scope="row" className="bh-jev-sticky text-left font-semibold">{short(r.display)}</th>
          {keys.map((k) => { const moved = r.rankUnder![k] !== r.rankUnder![head]; return <td key={k} className={`tabular whitespace-nowrap ${moved ? "font-semibold text-[rgb(var(--warn))]" : ""}`} data-bh-jev12-rank={r.rankUnder![k]}>
            #{r.rankUnder![k]} <span className={moved ? "" : "bh-muted"}>{r.presets[k].toFixed(1)}</span>{moved && <span className="sr-only"> (rank differs from the {SCORE_NAME})</span>}</td>; })}
        </tr>)}</tbody>
      </table>
    </div>
  </section>;
}

const presetRaw = (w: JevWeights4): JevWeights4 => ({ intelligence: w.intelligence * 100, calibration: w.calibration * 100, speed: w.speed * 100, cost: w.cost * 100 });

export function JevModelsV12Board({ view, children }: { view: JevV12View; children?: ReactNode }) {
  const s = view.scoring;
  const [raw, setRawState] = useState<JevWeights4>(presetRaw(DEFAULT_WEIGHTS));
  const w = useMemo(() => { const n = normalise(raw) ?? DEFAULT_WEIGHTS; return PRESETS.find((p) => sameWeights(p.w, n))?.w ?? n; }, [raw]);
  useEffect(() => { const fromUrl = parseParams(window.location.search); if (!isDefault(fromUrl)) setRawState(presetRaw(fromUrl)); }, []);
  useEffect(() => {
    const u = new URL(window.location.href); const p = toParam(w);
    if (p) u.searchParams.set("w", p); else u.searchParams.delete("w");
    u.searchParams.delete("preset");
    if (u.href !== window.location.href) window.history.replaceState(window.history.state, "", u.href);
  }, [w]);
  const { ranked, partial } = useMemo(() => rerank(view.ranked, view.partial, w), [view, w]);
  const tw = view.tierWeights;
  return <>
    <div className="mt-6 space-y-4" data-bh-jevc-hero>
      <ScoreChart rows={ranked} partial={partial} w={w} view={view} />
      <Controls w={w} raw={raw} setPreset={(p) => setRawState(presetRaw(p))} setRaw={setRawState} reset={() => setRawState(presetRaw(DEFAULT_WEIGHTS))} />
    </div>
    {children}
    <Table view={view} rows={ranked} partialRows={partial} w={w} />
    <section className="bh-panel mt-8 max-w-4xl p-4 text-sm" aria-labelledby="jev12-how" data-bh-jev12-formula>
      <h2 id="jev12-how" className="font-semibold">How the {SCORE_NAME} works</h2>
      <p className="mt-2 text-base"><b>{SCORE_NAME} = (Intelligence × Calibration × Speed × Cost)<sup>1/4</sup></b>, each axis on 0–100 — the geometric mean. A weak axis pulls the score down hard: a strong axis cannot buy it back.</p>
      <ul className="bh-muted mt-3 space-y-1.5">
        <li><b className="text-gray-200">Intelligence</b> — weighted accuracy: hard {Math.round(tw.hard * 100)} %, easy {Math.round(tw.easy * 100)} %, standard {Math.round(tw.standard * 100)} %, judge {Math.round(tw.judge * 100)} % ({view.tierCounts.hard} / {view.tierCounts.easy} / {view.tierCounts.standard} / {view.tierCounts.judge} decisions).</li>
        <li><b className="text-gray-200">Calibration</b> — on the hard tier: does &ldquo;80 % sure&rdquo; come true 80 % of the time, and does the returned distribution match the exact gold distribution on the probability items.</li>
        <li><b className="text-gray-200">Speed</b> — median and 95th-percentile latency, one request at a time: 0.1 s scores 100, each 10× slower costs 20 points (1 s = 80, 10 s = 60). <SpeedNote view={view} className="mt-0.5 inline" /></li>
        <li><b className="text-gray-200">Cost</b> — dollars per 1,000 decisions: $0.001 scores 100, each 10× more expensive costs 30 points ($0.01 = 70, $0.10 = 40, $1 = 10). Models without a tariff are priced at hosted-provider prices, marked &ldquo;est.&rdquo; (<a href="#jev-costs" className="text-accent underline">how</a>).</li>
      </ul>
      <details className="mt-3"><summary className="cursor-pointer text-accent">Full scoring rules</summary>
        <dl className="bh-muted mt-2 space-y-2">
          {(["jevbench_score", "intelligence", "calibration", "speed", "cost", "ranked", "presets"] as const).map((k) => s[k] && <div key={k}><dt className="inline font-semibold text-gray-200">{k === "jevbench_score" ? SCORE_NAME : k[0].toUpperCase() + k.slice(1)}. </dt><dd className="inline">{s[k]}</dd></div>)}
        </dl></details>
    </section>
    <Views view={view} />
  </>;
}
