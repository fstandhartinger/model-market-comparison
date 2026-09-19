"use client";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { JevTier, JevV11Row, JevV11View } from "../lib/jevbench-v11.mjs";
import { DEFAULT_WEIGHTS, PRESETS, SCORE_NAME, describe, isDefault, normalise, parseParams, percents, rerank, sameWeights, toParam, type JevWeights } from "../lib/jevbench-weights.mjs";

// CR-86 (Florian 2026-09-19): one JevBench Main Score = 0.6 × Capability + 0.2 × Speed + 0.2 × Cost, the sub-scores and
// tiers beside it, all sortable (nulls last both ways); partial runs below, greyed, unranked. Every value is the artifact's.
// CR-87 (Florian 2026-09-19): the Main Composite Score is the hero — the launch chart (bars coloured by system type) rendered
// natively, four named weight presets + custom sliders that re-score and re-rank live in the browser, an unmissable
// "not the default" state whenever the weights differ from the official 60:20:20, a shareable ?w= URL, and every
// project linked. The official numbers never change; other weights are recomputed from the published sub-scores.
const TIER_ORDER: JevTier[] = ["easy", "standard", "judge"];
const TIER_LABEL: Record<JevTier, string> = { easy: "Easy", standard: "Standard", judge: "Judge" };
type Col = "main" | "capability" | "speed" | "cost" | JevTier | "p50" | "usd" | "brier";
type Row = JevV11Row & { score: number | null; official: number | null; rank: number | null; delta: number };
const HIGHER: Record<Col, boolean> = { main: true, capability: true, speed: true, cost: true, easy: true, standard: true, judge: true, p50: false, usd: false, brier: false };
const val = (r: Row, c: Col): number | null =>
  c === "main" ? r.score : c === "capability" || c === "speed" || c === "cost" ? r[c] : c === "p50" ? r.p50 : c === "usd" ? r.usd : c === "brier" ? r.brier : r.tiers[c];

const one = (v: number | null) => (v === null ? "—" : v.toFixed(1));
const pct = (v: number | null) => (v === null ? "—" : `${(v * 100).toFixed(1)}%`);
const sec = (v: number | null) => (v === null ? "—" : `${v.toFixed(2)} s`);
const short = (d: string) => d.split(" (")[0];
const TYPE: Record<string, { label: string; v: string }> = {
  jev: { label: "Jev (TypeSafe, closed)", v: "--jev-t-jev" },
  "jev-rebuild": { label: "Open Jev rebuild", v: "--jev-t-rebuild" },
  "llm-baseline": { label: "Instruction model, JSON schema", v: "--jev-t-llm" },
  "small-tool-model": { label: "Small tool-calling model", v: "--jev-t-tool" },
};
const typeVar = (cls: string) => ({ ["--jev-t" as string]: `var(${(TYPE[cls] ?? TYPE["llm-baseline"]).v})` });
// Chart labels: the short name, plus the one qualifier the launch chart kept (the GPT effort level, the adapter mode).
const chartName = (r: JevV11Row) => r.key === "gpt-5.6-luna" ? "GPT-5.6 Luna (low)" : r.key.endsWith("-tools") ? "Needle 3, options as tools" : short(r.display);

export function CostValue({ r }: { r: JevV11Row }) {
  if (r.costKind === "unknown" || r.usd === null) return <span className="bh-muted" title={r.costBasis}>no tariff</span>;
  const v = `$${r.usd.toFixed(3)}`;
  return r.costKind === "estimate"
    ? <span title={r.costBasis} data-bh-jev11-cost-kind="estimate">~{v} <span className="bh-thin-tag">est.</span></span>
    : <span title={r.costBasis} data-bh-jev11-cost-kind="measured">{v}</span>;
}

function ProjectLink({ r, children, className = "" }: { r: JevV11Row; children: ReactNode; className?: string }) {
  return r.link
    ? <a href={r.link} target="_blank" rel="noopener noreferrer" className={`underline decoration-[rgb(var(--line))] underline-offset-2 hover:text-accent hover:decoration-current ${className}`} title={`${r.display} — ${r.author} · ${r.link.replace(/^https:\/\//, "")}`} data-bh-jev-link={r.key}>{children}</a>
    : <span className={className}>{children}</span>;
}

const Delta = ({ d }: { d: number }) => d === 0 ? null
  : <span className={`ml-1 text-[11px] font-semibold ${d > 0 ? "text-[rgb(var(--accent2))]" : "text-[rgb(var(--warn))]"}`} data-bh-jevc-delta={d}
      title={`${Math.abs(d)} place${Math.abs(d) === 1 ? "" : "s"} ${d > 0 ? "higher" : "lower"} than in the official ranking`}>
      {d > 0 ? "▲" : "▼"}{Math.abs(d)}<span className="sr-only"> vs. official rank</span></span>;

function Controls({ w, raw, setPreset, setRaw, reset, view }: { w: JevWeights; raw: JevWeights; setPreset: (p: JevWeights) => void; setRaw: (r: JevWeights) => void; reset: () => void; view: JevV11View }) {
  const d = describe(w);
  const eff = percents(w);
  const [copied, setCopied] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard blocked: the URL bar already holds the link */ } };
  return <section className="bh-panel p-4" aria-labelledby="jevc-weights" data-bh-jevc-controls data-bh-jevc-state={d.official ? "official" : "custom"}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 id="jevc-weights" className="text-base font-semibold">Weighting: Capability : Speed : Cost</h2>
      {d.official
        ? <span className="bh-jevc-official" data-bh-jevc-badge="official">Official default</span>
        : <span className="flex flex-wrap items-center gap-2"><span className="bh-jevc-notdefault" role="status" data-bh-jevc-badge="not-default">⚠ Not the default weighting</span>
            <button type="button" className="bh-button min-h-9 text-sm font-semibold" onClick={reset} data-bh-jevc-reset>Reset to default (60:20:20)</button></span>}
    </div>
    <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-5" role="group" aria-label="Weighting presets">
      {PRESETS.map((p) => <button key={p.id} type="button" className="bh-jevc-preset" aria-pressed={sameWeights(p.w, w)} onClick={() => setPreset(p.w)} data-bh-jevc-preset={p.id}>
        <span className="block text-[13px] font-semibold">{p.name}</span>
        <span className="bh-muted block text-[12px] tabular">{p.ratio}{p === PRESETS[0] ? " · default, official" : ""}</span></button>)}
      <details className="bh-jevc-preset col-span-2 lg:col-span-1" open={d.preset === null ? true : undefined} data-bh-jevc-custom-panel>
        <summary className="cursor-pointer text-[13px] font-semibold">Custom{d.preset === null ? ` · ${d.ratio}` : ""}</summary>
        <div className="mt-2 space-y-2">
          {(["capability", "speed", "cost"] as const).map((k) => <label key={k} className="block text-[12px]">
            <span className="flex justify-between"><span className="font-semibold capitalize">{k}</span><span className="tabular bh-muted">{eff[k]} %</span></span>
            <input type="range" min={0} max={100} step={1} value={Math.round(raw[k])} className="bh-jevc-slider" data-bh-jevc-slider={k}
              aria-label={`${k} weight`} aria-valuetext={`${eff[k]} percent`}
              onChange={(e) => { const next = { ...raw, [k]: Number(e.target.value) }; if (normalise(next)) setRaw(next); }} />
          </label>)}
        </div>
      </details>
    </div>
    <p className="bh-muted mt-3 text-[13px]" data-bh-jevc-note>
      The official {SCORE_NAME} uses <b className="text-gray-200">{Math.round(view.weights.capability * 100)} % Capability, {Math.round(view.weights.speed * 100)} % Speed, {Math.round(view.weights.cost * 100)} % Cost</b> (Emphasis on Accuracy).
      Any other weighting is your view, recomputed in your browser from the published sub-scores — not the published score.{" "}
      {!d.official && <button type="button" className="text-accent underline" onClick={copy} data-bh-jevc-copy>{copied ? "Link copied" : "Copy a link to this weighting"}</button>}
    </p>
  </section>;
}

function ScoreChart({ rows, partial, w, view }: { rows: Row[]; partial: Row[]; w: JevWeights; view: JevV11View }) {
  const d = describe(w);
  const eff = percents(w);
  const all = [...rows, ...partial];
  const star = (r: Row) => (r.note && r.ranked && r.key.endsWith("-tools") ? "*" : "");
  const types = Object.keys(TYPE).filter((t) => all.some((r) => r.cls === t));
  return <figure className={`bh-panel p-4 sm:p-5 ${d.official ? "" : "bh-jevc-custom"}`} data-bh-jev11-main-chart data-bh-jevc-chart={d.official ? "official" : "custom"} aria-labelledby="jevc-title">
    <p className="bh-eyebrow">JevBench v1.1 · {view.decisions} decisions per system</p>
    <h2 id="jevc-title" className="mt-1 text-xl font-bold leading-snug sm:text-2xl" data-bh-jevc-title>{d.title}</h2>
    <p className="mt-1 flex flex-wrap items-center gap-2 text-sm" data-bh-jevc-subtitle>
      {d.official
        ? <><span className="bh-jevc-official">Official</span><span className="bh-muted">The published ranking. <a href="#jevc-weights" className="text-accent underline">Change the weighting ↓</a></span></>
        : <><span className="bh-jevc-notdefault">⚠ Not the default weighting</span><span className="bh-muted">Ranks and scores below are recomputed with {d.ratio}; ▲▼ = change vs. the official ranking. <a href="#jevc-weights" className="text-accent underline">Weighting ↓</a></span></>}
    </p>
    <div className="mt-4 hidden grid-cols-[1.6rem_13.5rem_1fr_3.2rem_13.5rem] gap-x-2 text-[11px] sm:grid" aria-hidden="true">
      <span /><span /><span /><span />
      <span className="bh-muted grid grid-cols-[1fr_1fr_1.7fr] text-right font-mono"><span>Capab.</span><span>Speed</span><span className="pr-[2.4em]">Cost</span></span>
    </div>
    <ol className="mt-2 space-y-2.5 sm:mt-1" data-bh-jevc-bars>
      {all.map((r) => {
        const s = r.score;
        const label = s === null ? `${r.display}: not scored (partial run)` : `${r.display}: ${one(s)}${r.rank ? `, rank ${r.rank}` : ", partial run, not ranked"}. Capability ${one(r.capability)}, speed ${one(r.speed)}, cost ${one(r.cost)}${r.costKind === "estimate" ? " (estimated)" : ""}.`;
        return <li key={r.key} style={typeVar(r.cls)} className="grid grid-cols-[1.4rem_1fr_2.9rem] items-center gap-x-2 text-sm sm:grid-cols-[1.6rem_13.5rem_1fr_3.2rem_13.5rem]"
          data-bh-jev11-bar={r.key} data-bh-jevc-score={s === null ? "" : s.toFixed(3)} aria-label={label}>
          <span className="bh-muted tabular col-start-1 row-start-1 text-right text-xs" data-bh-jevc-rank={r.rank ?? ""}>{r.rank ?? ""}</span>
          <span className="col-start-2 row-start-1 min-w-0 truncate sm:col-start-2 sm:text-right" title={r.display}>
            <ProjectLink r={r}>{chartName(r)}{star(r)}</ProjectLink>{!r.ranked && <span className="bh-muted"> (partial run)</span>}{!d.official && r.rank !== null && <Delta d={r.delta} />}
          </span>
          <span className="bh-jevc-grid col-start-2 row-start-2 mt-1 flex h-4 sm:col-start-3 sm:row-start-1 sm:mt-0 sm:h-6" aria-hidden="true">
            {s !== null && <span className={`bh-jevc-bar ${r.ranked ? "" : "is-partial"}`} style={{ width: `${Math.max(0, Math.min(100, s))}%` }} />}
          </span>
          <b className="tabular col-start-3 row-span-2 row-start-1 self-center text-right text-base sm:col-start-4 sm:row-span-1 sm:text-lg" data-bh-jev11-main={s === null ? "" : s.toFixed(3)}>{s === null ? <span className="bh-muted text-xs font-normal">n/a</span> : one(s)}</b>
          <span className="bh-muted col-start-2 row-start-3 mt-0.5 whitespace-nowrap font-mono text-[10.5px] sm:col-start-5 sm:row-start-1 sm:mt-0 sm:grid sm:grid-cols-[1fr_1fr_1.7fr] sm:text-right sm:text-[12px]" data-bh-jevc-subs>
            <span className="sm:hidden">Cap </span><span>{one(r.capability)}</span><span className="sm:hidden"> · Speed </span><span>{one(r.speed)}</span><span className="sm:hidden"> · Cost </span>
            <span>{one(r.cost)}<span className="inline-block sm:w-[2.4em] sm:text-left" title={r.costBasis}>{r.costKind === "estimate" ? "\u00a0est." : ""}</span></span>
          </span>
        </li>;
      })}
    </ol>
    <div className="mt-2 hidden grid-cols-[1.6rem_13.5rem_1fr_3.2rem_13.5rem] gap-x-2 text-[11px] sm:grid" aria-hidden="true">
      <span /><span /><span className="bh-muted flex justify-between tabular"><span>0</span><span>20</span><span>40</span><span>60</span><span>80</span><span>100</span></span>
    </div>
    <p className="mt-3 text-center text-[13px] sm:text-sm" data-bh-jevc-formula>
      Score = <b>{(eff.capability / 100).toFixed(2)}</b> × Capability + <b>{(eff.speed / 100).toFixed(2)}</b> × Speed + <b>{(eff.cost / 100).toFixed(2)}</b> × Cost <span className="bh-muted">(each 0–100)</span>
      {!d.official && <span className="bh-muted block text-[12px]">Official: {view.weights.capability} × Capability + {view.weights.speed} × Speed + {view.weights.cost} × Cost</span>}
    </p>
    <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[12px]" aria-label="Legend" data-bh-jevc-legend>
      {types.map((t) => <li key={t} style={typeVar(t)}><span className="bh-jevc-swatch mr-1.5" />{TYPE[t].label}</li>)}
      {partial.length > 0 && <li><span className="bh-jevc-swatch is-partial mr-1.5" />Partial run — shown, not ranked</li>}
    </ul>
    <figcaption className="bh-muted mt-3 space-y-1 text-[11.5px] leading-snug" data-bh-jevc-footnotes>
      <span className="block">{view.decisions} typed decisions per system ({view.tierCounts.easy} easy / {view.tierCounts.standard} standard / {view.tierCounts.judge} judge). est. = cost estimated from a stated reference deployment (no tariff for us). Names link to each project.</span>
      {all.filter((r) => star(r)).map((r) => <span key={r.key} className="block">* {chartName(r)}: {r.note}</span>)}
    </figcaption>
  </figure>;
}

function Table({ view, rows, partialRows, w }: { view: JevV11View; rows: Row[]; partialRows: Row[]; w: JevWeights }) {
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
    <button type="button" data-bh-jev11-sort={c} onClick={() => pick(c)} className={`inline-flex min-h-9 items-center gap-1 rounded px-1 text-left ${col === c ? "text-accent" : ""}`}>
      <span><span className={`block font-semibold ${hero ? "text-[14px]" : "text-[12px]"}`}>{label}</span>{sub && <span className="block text-[11px] font-normal">{sub}</span>}</span>
      <span aria-hidden="true">{col === c ? (aria(c) === "descending" ? "↓" : "↑") : ""}</span></button></th>;
  const notes = [...view.ranked, ...view.partial].filter((r) => r.note);
  const R = ({ r }: { r: Row }) => <tr data-bh-jev11-row={r.key} data-bh-jev11-ranked={r.ranked ? "1" : "0"} className={r.ranked ? "" : "bh-jev11-partial"}>
    <td className="bh-muted tabular">{r.rank ?? ""}{!d.official && r.rank !== null && <Delta d={r.delta} />}</td>
    <th scope="row" className="bh-jev-sticky text-left font-normal"><span className="bh-muted block text-[11px] leading-tight">by {r.author}</span>
      <span className="block font-semibold leading-snug"><ProjectLink r={r}>{short(r.display)}</ProjectLink>{r.note ? <sup>{notes.indexOf(r) + 1}</sup> : null}</span>
      {r.display !== short(r.display) && r.display.slice(short(r.display).length + 2, -1) !== r.author && <span className="bh-muted block text-[11px] leading-tight">{r.display.slice(short(r.display).length + 2, -1)}</span>}
      {!r.ranked && <span className="bh-thin-tag mt-1 inline-block">partial · not ranked</span>}</th>
    <td className="tabular"><b className="text-lg" data-bh-jevc-cell-score>{one(r.score)}</b>{!d.official && <span className="bh-muted block text-[11px]" data-bh-jevc-cell-official>official {one(r.official)}</span>}</td>
    <td className="tabular text-[13px]">{one(r.capability)}</td><td className="tabular text-[13px]">{one(r.speed)}</td><td className="tabular text-[13px]">{one(r.cost)}</td>
    {TIER_ORDER.map((t) => <td key={t} className="tabular">{pct(r.tiers[t])}{r.coverage[t] !== null && r.coverage[t]! < 1 && <span className="bh-muted block text-[11px]">{Math.round(r.coverage[t]! * 100)}% answered</span>}</td>)}
    <td className="tabular">{sec(r.p50)}<span className="bh-muted block text-[11px]">p95 {sec(r.p95)}</span></td>
    <td className="tabular"><CostValue r={r} /></td>
    <td className="tabular">{r.hasDistribution ? (r.brier === null ? "—" : r.brier.toFixed(3)) : <span className="bh-muted text-[12px]" title={r.calibrationNote ?? undefined} data-bh-jev11-no-dist>no calibrated distribution</span>}{r.hasDistribution && <span className="bh-muted block text-[11px]">{r.probability}</span>}</td>
  </tr>;
  return <section className="mt-8" aria-labelledby="jev11-table">
    <h2 id="jev11-table" className="text-xl font-semibold">Scores, tiers, latency and cost</h2>
    <p className="bh-muted mt-1 text-sm">Sort by any column; values the run could not produce always sort last. Hover a cost for how it was priced. Names link to each project.</p>
    <div className="bh-table-wrap mt-3">
      <table className="bh-table bh-jev-table" data-bh-jev11-table>
        <thead><tr>
          <th scope="col"><span className="sr-only">Rank</span>#</th>
          <th scope="col" className="bh-jev-sticky">System</th>
          {d.official
            ? <H c="main" label="Main Composite Score" sub="official · 60:20:20" hero />
            : <H c="main" label={d.preset ? d.short : `Custom ${d.ratio}`} sub={d.preset ? `${d.ratio} · not the official score` : "not the official score"} hero />}
          <H c="capability" label="Capability" sub={`× ${(eff.capability / 100).toFixed(2)}`} /><H c="speed" label="Speed" sub={`× ${(eff.speed / 100).toFixed(2)}`} /><H c="cost" label="Cost" sub={`× ${(eff.cost / 100).toFixed(2)}`} />
          {TIER_ORDER.map((t) => <H key={t} c={t} label={TIER_LABEL[t]} sub={`${view.tierCounts[t]} decisions`} />)}
          <H c="p50" label="Latency" sub="p50 · p95" /><H c="usd" label="$ per 1,000" sub="decisions" /><H c="brier" label="Calibration" sub="Brier (not scored)" />
        </tr></thead>
        <tbody>
          {ranked.map((r) => <R key={r.key} r={r} />)}
          {partial.length > 0 && <tr><td colSpan={14} className="bh-muted text-[12px]"><span className="sticky left-3 inline-block max-w-[330px] whitespace-normal">Partial runs — shown, not ranked: {view.scoring.ranked}</span></td></tr>}
          {partial.map((r) => <R key={r.key} r={r} />)}
        </tbody>
      </table>
    </div>
    {notes.length > 0 && <ol className="bh-muted mt-2 list-decimal space-y-1 pl-5 text-xs" data-bh-jev11-notes>{notes.map((r) => <li key={r.key}><b className="text-gray-200">{short(r.display)}</b>: {r.note}</li>)}</ol>}
  </section>;
}

function Sensitivity({ view }: { view: JevV11View }) {
  const [head, ...rest] = view.sensitivityOrder;
  const order = [head, ...rest];
  return <section className="mt-8" aria-labelledby="jev11-sens">
    <h2 id="jev11-sens" className="text-xl font-semibold">How the ranking moves with other weights</h2>
    <p className="bh-muted mt-1 text-sm">The published rank and score under six weightings of Capability / Speed / Cost. <span className="font-semibold text-[rgb(var(--warn))]">Highlighted</span> = a different rank than the headline weighting. Ranked systems only.</p>
    <div className="bh-table-wrap mt-3">
      <table className="bh-table bh-jev-table" data-bh-jev11-sensitivity>
        <thead><tr><th scope="col" className="bh-jev-sticky">System</th>{order.map((k) => <th key={k} scope="col" className="whitespace-nowrap">{k === head ? <b>{k}</b> : k}</th>)}</tr></thead>
        <tbody>{view.ranked.map((r) => <tr key={r.key} data-bh-jev11-sens-row={r.key}>
          <th scope="row" className="bh-jev-sticky text-left font-semibold">{short(r.display)}</th>
          {order.map((k) => { const moved = r.rankUnder![k] !== r.rankUnder![head]; return <td key={k} className={`tabular whitespace-nowrap ${moved ? "font-semibold text-[rgb(var(--warn))]" : ""}`} data-bh-jev11-rank={r.rankUnder![k]} data-bh-jev11-moved={moved ? "1" : "0"}>
            #{r.rankUnder![k]} <span className={moved ? "" : "bh-muted"}>{Math.round(r.sensitivity![k])}</span>{moved && <span className="sr-only"> (rank differs from headline)</span>}</td>; })}
        </tr>)}</tbody>
      </table>
    </div>
  </section>;
}

const presetRaw = (w: JevWeights): JevWeights => ({ capability: w.capability * 100, speed: w.speed * 100, cost: w.cost * 100 });

export function JevModelsV11Board({ view, children }: { view: JevV11View; children?: ReactNode }) {
  const s = view.scoring;
  // Slider positions (raw) and the normalised weights they mean; presets set both. Server render = the official view.
  const [raw, setRawState] = useState<JevWeights>(presetRaw(DEFAULT_WEIGHTS));
  const w = useMemo(() => { const n = normalise(raw) ?? DEFAULT_WEIGHTS; return PRESETS.find((p) => sameWeights(p.w, n))?.w ?? n; }, [raw]);
  useEffect(() => { const fromUrl = parseParams(window.location.search); if (!isDefault(fromUrl)) setRawState(presetRaw(fromUrl)); }, []);
  useEffect(() => {
    const u = new URL(window.location.href); const p = toParam(w);
    if (p) u.searchParams.set("w", p); else u.searchParams.delete("w");
    u.searchParams.delete("preset");
    if (u.href !== window.location.href) window.history.replaceState(window.history.state, "", u.href);
  }, [w]);
  const { ranked, partial } = useMemo(() => rerank(view.ranked, view.partial, w), [view, w]);
  return <>
    <div className="mt-6 space-y-4" data-bh-jevc-hero>
      <ScoreChart rows={ranked} partial={partial} w={w} view={view} />
      <Controls w={w} raw={raw} setPreset={(p) => setRawState(presetRaw(p))} setRaw={setRawState} reset={() => setRawState(presetRaw(DEFAULT_WEIGHTS))} view={view} />
    </div>
    {children}
    <Table view={view} rows={ranked} partialRows={partial} w={w} />
    <section className="bh-panel mt-8 max-w-4xl p-4 text-sm" aria-labelledby="jev11-how" data-bh-jev11-formula>
      <h2 id="jev11-how" className="font-semibold">How the Main Composite Score works</h2>
      <p className="mt-2 text-base"><b>Main = {view.weights.capability} × Capability + {view.weights.speed} × Speed + {view.weights.cost} × Cost</b>, each on 0–100 (the official default, &ldquo;Emphasis on Accuracy&rdquo;).</p>
      {/* PAGE-COPY-v1.1's one-line normalisations; the artifact's full scoring rules sit in the disclosure below. */}
      <ul className="bh-muted mt-3 space-y-1.5">
        <li><b className="text-gray-200">Capability</b> — accuracy in three tiers (easy {view.tierCounts.easy}, standard {view.tierCounts.standard}, judge {view.tierCounts.judge}), averaged so no tier dominates.</li>
        <li><b className="text-gray-200">Speed</b> — median and 95th-percentile latency, one request at a time: 0.1 s scores 100, 1 s scores 50, 10 s scores 0.</li>
        <li><b className="text-gray-200">Cost</b> — dollars per 1,000 decisions; self- and author-hosted models use a stated reference deployment, marked &ldquo;est.&rdquo;: $0.01 scores 100, $1 scores 33, $10 scores 0.</li>
        <li><b className="text-gray-200">Calibration</b> is shown, not scored — some systems return only a label.</li>
      </ul>
      <details className="mt-3"><summary className="cursor-pointer text-accent">Full scoring rules</summary>
        <dl className="bh-muted mt-2 space-y-2">
          <div><dt className="inline font-semibold text-gray-200">Capability. </dt><dd className="inline">{s.capability}</dd></div>
          <div><dt className="inline font-semibold text-gray-200">Speed. </dt><dd className="inline">{s.speed}</dd></div>
          <div><dt className="inline font-semibold text-gray-200">Cost. </dt><dd className="inline">{s.cost}</dd></div>
          <div><dt className="inline font-semibold text-gray-200">Calibration. </dt><dd className="inline">{s.calibration}</dd></div>
          <div><dt className="inline font-semibold text-gray-200">Ranked. </dt><dd className="inline">{s.ranked}</dd></div>
        </dl></details>
    </section>
    <Sensitivity view={view} />
  </>;
}
