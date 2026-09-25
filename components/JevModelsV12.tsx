"use client";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { JevAxis, JevTier12, JevV12Row, JevV12View } from "../lib/jevbench-v12.mjs";
import type { JevTaskScope, JevTasksView } from "../lib/jevbench-v12-tasks.mjs";
import { AXES, AXIS_LABEL, DEFAULT_PRESET, DEFAULT_WEIGHTS, PRESETS, SCORE_NAME, describe, isDefault, normalise, parseParams, percents, rerank, sameWeights, toParam, type JevWeights4 } from "../lib/jevbench-v12-weights.mjs";
import { DEFAULT_TASK_SCOPE, TASK_SCOPES, parseTaskScope, publicTierSummary, scopeById, scopeDecisions, scopeRows, scopeTierWeights, tasksForScope, toTaskScopeParam } from "../lib/jevbench-v12-scope.mjs";
import { jevSystemPath } from '../lib/jev-system-slug.mjs';

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
const listAnd = (items: string[]) => items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
const TYPE: Record<string, { label: string; v: string }> = {
  jev: { label: "Jev (TypeSafe, closed)", v: "--jev-t-jev" },
  "jev-rebuild": { label: "Jev rebuild (open, or open source planned)", v: "--jev-t-rebuild" },
  "llm-baseline": { label: "Instruction model, JSON schema", v: "--jev-t-llm" },
  "small-tool-model": { label: "Small tool-calling model", v: "--jev-t-tool" },
  // CR-95 (v1.2.2): readers asked for these; neither is a Jev rebuild, so they get their own colour.
  "jev-service": { label: "Service built on Jev", v: "--jev-t-service" },
  classifier: { label: "Zero-shot classifier (not a Jev rebuild)", v: "--jev-t-classifier" },
  "decision-api": { label: "Closed decision model (API only, not Jev)", v: "--jev-t-api" },
};
const typeVar = (cls: string) => ({ ["--jev-t" as string]: `var(${(TYPE[cls] ?? TYPE["llm-baseline"]).v})` });
const chartName = (r: JevV12Row) => r.key === "gpt-5.6-luna" ? "GPT-5.6 Luna (low)" : r.key.endsWith("-tools") ? "Needle 3, options as tools"
  : r.key === "openjev-razorback16" ? "OpenJev (razorback16)" : r.key === "open-alternative-jev" ? "open-alternative-jev (Qwen3.5-4B)" : r.key === "semif-qwen3.5-4b" ? "SemIf (Qwen3.5-4B)" : r.key === "djev" ? "djev (Maisa, diffusion-gemma)"
  : r.key === "classifier-dev-fast" ? "classifier.dev (fast tier)" : r.key === "programasweights" ? "ProgramAsWeights" : short(r.display);

/** $ per 1,000 decisions: four decimals below one cent so e.g. $0.0045 and $0.0092 stay distinguishable. */
export const usdText = (x: number) => `$${x.toFixed(x < 0.01 ? 4 : 3)}`;

export function CostValue({ r }: { r: JevV12Row }) {
  const v = usdText(r.usd);
  if (r.costKind === "announced") return <span title={r.costBasis} data-bh-jev12-cost-kind="announced">{v} <span className="bh-thin-tag">announced</span></span>;
  return r.costKind === "estimate"
    ? <span title={r.costBasis} data-bh-jev12-cost-kind="estimate">~{v} <span className="bh-thin-tag">est.</span></span>
    : <span title={r.costBasis} data-bh-jev12-cost-kind="measured">{v}</span>;
}

/** The one line every Speed display carries (Florian's honesty rule, CR-92). */
export function SpeedNote({ view, className = "" }: { view: JevV12View; className?: string }) {
  return <span className={`bh-muted block text-[12px] ${className}`} data-bh-jev12-speed-note>⏱ {view.speedNote}</span>;
}

/** CR-96: the one line every price display carries — the unit is decisions, never tokens. */
export function CostUnitNote({ view, className = "", full = false }: { view: JevV12View; className?: string; full?: boolean }) {
  const notUnit = view.costUnit.not_unit.replace(/^\$\s*/, "");
  return <span className={`bh-muted block text-[12px] ${className}`} data-bh-jev12-cost-unit>
    {full
      ? <>💲 <b className="text-gray-200">{view.costUnit.unit}</b>, not {view.costUnit.not_unit}. {view.costUnit.worked_example}</>
      : <>💲 <b className="text-gray-200">{view.costUnit.unit}</b>, not {notUnit} — one decision ≈ {Math.round(view.costUnit.mean_input_tokens_per_decision_jev)} input tokens.</>}
  </span>;
}

// F-169 (Fable pass 32): a reader who wants one system reaches it from its own row, so the board row's
// name is the internal link to `/jev-models/<key>` — the page that carries that system's number, its
// axes and the external project link. The row no longer carries the outbound link itself; it stays on
// the system page and, for a marked system, in the † notes disclosure below the table.
function SystemLink({ r, children, className = "" }: { r: JevV12Row; children: ReactNode; className?: string }) {
  return <Link href={jevSystemPath(r.key)} className={`underline decoration-[rgb(var(--line))] underline-offset-2 hover:text-accent hover:decoration-current ${className}`} title={r.display} data-bh-jev-system-row-link={r.key}>{children}</Link>;
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

function stateDescription(w: JevWeights4, scope: JevTaskScope) {
  const weights = describe(w);
  const scopeDefault = scope === DEFAULT_TASK_SCOPE;
  return {
    ...weights,
    official: weights.official && scopeDefault,
    scopeDefault,
    scopeLabel: scopeById(scope).label,
    title: scopeDefault ? weights.title : `${weights.official ? SCORE_NAME : weights.title} — ${scopeById(scope).label} tasks`,
  };
}

function Controls({ w, raw, scope, setPreset, setRaw, reset }: { w: JevWeights4; raw: JevWeights4; scope: JevTaskScope; setPreset: (p: JevWeights4) => void; setRaw: (r: JevWeights4) => void; reset: () => void }) {
  const d = stateDescription(w, scope);
  const eff = percents(w);
  const [copied, setCopied] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard blocked: the URL bar already holds the link */ } };
  return <section className="bh-panel p-4" aria-labelledby="jevc-weights" data-bh-jevc-controls data-bh-jevc-state={d.official ? "official" : "custom"}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 id="jevc-weights" className="text-base font-semibold">Weighting: Intelligence : Calibration : Speed : Cost</h2>
      {d.official
        ? <span className="bh-jevc-official" data-bh-jevc-badge="official">Official default</span>
        : <span className="flex flex-wrap items-center gap-2"><span className="bh-jevc-notdefault" role="status" data-bh-jevc-badge="not-default">⚠ Not the default — {d.scopeDefault ? `not the ${SCORE_NAME}` : `${d.scopeLabel} tasks${describe(w).official ? "" : ` · ${d.ratio}`}`}</span>
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
      {!d.official && <button type="button" className="text-accent underline" onClick={copy} data-bh-jevc-copy>{copied ? "Link copied" : "Copy a link to this view"}</button>}
    </p>
  </section>;
}

// CR-97 (2026-09-20): three ways to be listed. Only a ranked row has a rank; an honorable mention runs another
// entrant's model, a partial run missed a tier. Both unranked kinds keep every number and are drawn in grey.
const NOT_RANKED: Record<string, string> = { honorable_mention: "honorable mention", partial: "partial run" };

function ScoreChart({ rows, honorable, partial, w, view, scope }: { rows: Row[]; honorable: Row[]; partial: Row[]; w: JevWeights4; view: JevV12View; scope: JevTaskScope }) {
  const d = stateDescription(w, scope);
  const all = [...rows, ...honorable, ...partial];
  const types = Object.keys(TYPE).filter((t) => all.some((r) => r.cls === t));
  const f0 = (v: number | null) => (v === null ? "–" : v.toFixed(0));
  return <figure className={`bh-panel p-4 sm:p-5 ${d.official ? "" : "bh-jevc-custom"}`} data-bh-jev12-main-chart data-bh-jevc-chart={d.official ? "official" : "custom"} aria-labelledby="jevc-title">
    <p className="bh-eyebrow">JevBench {view.revision} · {view.decisions} decisions per system{!d.scopeDefault && ` · ${d.scopeLabel}`}</p>
    <h2 id="jevc-title" className="mt-1 text-xl font-bold leading-snug sm:text-2xl" data-bh-jevc-title>{d.title}</h2>
    <p className="mt-1 flex flex-wrap items-center gap-2 text-sm" data-bh-jevc-subtitle>
      {d.official
        ? <><span className="bh-jevc-official">Official</span><span className="bh-muted" data-bh-jev12-oneliner>{view.oneLiner} <a href="#jevc-weights" className="text-accent underline">Change the weighting ↓</a></span></>
        : <><span className="bh-jevc-notdefault">⚠ Not the default — {d.scopeDefault ? `not the ${SCORE_NAME}` : `${d.scopeLabel} tasks${describe(w).official ? "" : ` · ${d.ratio}`}`}</span><span className="bh-muted">{d.scopeDefault ? `Ranks and scores below are recomputed with ${d.ratio} (Intelligence : Calibration : Speed : Cost, geometric mean);` : scope === "hard" ? `Ranks and scores below use only the 220 hard-tier decisions for Intelligence, Calibration, Speed and Cost; the official all-tasks score is the ${SCORE_NAME}.` : `Ranks and scores below are recomputed for the ${d.scopeLabel.toLowerCase()} decisions (Intelligence from that scope); the official all-tasks score is the ${SCORE_NAME}.`} ▲▼ = change vs. the official ranking. <a href="#jevc-weights" className="text-accent underline">Weighting ↓</a></span></>}
    </p>
    <div className="mt-4 hidden grid-cols-[1.6rem_14rem_1fr_3.2rem_19rem] gap-x-2 text-[11px] sm:grid" aria-hidden="true">
      <span /><span /><span /><span />
      <span className="bh-muted grid grid-cols-[1fr_1fr_1fr_1fr_2.1fr] text-right font-mono"><span>Intel.</span><span>Calib.</span><span>Speed</span><span>Cost</span><span>$/1k dec.</span></span>
    </div>
    <ol className="mt-2 space-y-2.5 sm:mt-1" data-bh-jevc-bars>
      {all.map((r) => {
        const s = r.score;
        const label = `${r.display}: ${one(s)}${r.rank ? `, rank ${r.rank}` : `, ${NOT_RANKED[r.listing]}, not ranked`}. Intelligence ${one(r.axes.intelligence)}, calibration ${r.axes.calibration === null ? "none" : one(r.axes.calibration)}, speed ${one(r.axes.speed)}, cost ${one(r.axes.cost)}${r.costKind === "estimate" ? " (estimated)" : r.costKind === "announced" ? " (announced price, not yet charged)" : ""}.`;
        return <li key={r.key} style={typeVar(r.cls)} className="grid grid-cols-[1.4rem_1fr_3.3rem] items-center gap-x-2 text-sm sm:grid-cols-[1.6rem_14rem_1fr_3.2rem_19rem]"
          data-bh-jev12-bar={r.key} data-bh-jevc-score={s === null ? "" : s.toFixed(3)} aria-label={label}>
          <span className="bh-muted tabular col-start-1 row-start-1 text-right text-xs" data-bh-jevc-rank={r.rank ?? ""}>{r.rank ?? ""}</span>
          <span className="col-start-2 row-start-1 min-w-0 md:truncate sm:col-start-2 sm:text-right" title={r.display}>
            <ProjectLink r={r}>{chartName(r)}</ProjectLink>{r.footnote ? <sup data-bh-jev12-dagger>†</sup> : null}{!r.ranked && <span className="bh-muted" title={r.notRankedBecause ?? undefined}> ({NOT_RANKED[r.listing]})</span>}{!d.official && r.rank !== null && <Delta d={r.delta} />}
          </span>
          <span className="bh-jevc-grid col-start-2 row-start-2 mt-1 flex h-4 sm:col-start-3 sm:row-start-1 sm:mt-0 sm:h-6" aria-hidden="true">
            {s !== null && <span className={`bh-jevc-bar ${r.ranked ? "" : "is-partial"}`} style={{ width: `${Math.max(0, Math.min(100, s)).toFixed(4)}%` }} />}
          </span>
          <b className="tabular col-start-3 row-span-2 row-start-1 self-center text-right text-base sm:col-start-4 sm:row-span-1 sm:text-lg" data-bh-jev12-main={s === null ? "" : s.toFixed(3)}>{one(s)}</b>
          <span className="bh-muted col-start-2 row-start-3 mt-0.5 min-w-0 font-mono text-[10.5px] sm:whitespace-nowrap sm:col-start-5 sm:row-start-1 sm:mt-0 sm:grid sm:grid-cols-[1fr_1fr_1fr_1fr_2.1fr] sm:text-right sm:text-[12px]" data-bh-jevc-subs>
            <span className="sm:hidden">I </span><span>{f0(r.axes.intelligence)}</span><span className="sm:hidden"> · C </span><span title={r.calibrationNote ?? undefined}>{f0(r.axes.calibration)}</span>
            <span className="sm:hidden"> · S </span><span>{f0(r.axes.speed)}</span><span className="sm:hidden"> · K </span><span>{f0(r.axes.cost)}</span>
            <span className="sm:hidden"> · </span><span title={r.costBasis} data-bh-jevc-usd>{`${r.costKind === "estimate" ? "~" : ""}${usdText(r.usd)}`}{r.costKind === "estimate" ? " est." : r.costKind === "announced" ? " ann." : ""}</span>
          </span>
        </li>;
      })}
    </ol>
    <div className="mt-2 hidden grid-cols-[1.6rem_14rem_1fr_3.2rem_19rem] gap-x-2 text-[11px] sm:grid" aria-hidden="true">
      <span /><span /><span className="bh-muted flex justify-between tabular"><span>0</span><span>20</span><span>40</span><span>60</span><span>80</span><span>100</span></span>
    </div>
    <p className="mt-3 text-center text-[13px] sm:text-sm" data-bh-jevc-formula>
      Score = Intelligence<sup>{w.intelligence.toFixed(2)}</sup> × Calibration<sup>{w.calibration.toFixed(2)}</sup> × Speed<sup>{w.speed.toFixed(2)}</sup> × Cost<sup>{w.cost.toFixed(2)}</sup> <span className="bh-muted">(each 0–100; geometric mean; below 50 Intelligence, × (I / 50)²)</span>
      {!d.official && <span className="bh-muted block text-[12px]">Official ({DEFAULT_PRESET.name}): the geometric mean of the four axes, 25 % each</span>}
    </p>
    <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[12px]" aria-label="Legend" data-bh-jevc-legend>
      {types.map((t) => <li key={t} style={typeVar(t)}><span className="bh-jevc-swatch mr-1.5" />{TYPE[t].label}</li>)}
      {(honorable.length > 0 || partial.length > 0) && <li><span className="bh-jevc-swatch is-partial mr-1.5" />Shown, not ranked — {[honorable.length > 0 ? "honorable mention (runs another entrant's model)" : "", partial.length > 0 ? "partial run" : ""].filter(Boolean).join(" · ")}</li>}
    </ul>
    <figcaption className="bh-muted mt-3 space-y-1 text-[11.5px] leading-snug" data-bh-jevc-footnotes>
      <SpeedNote view={view} className="text-[11.5px]" />
      {/* F-134 (iteration 123): two lines at 390 so the visible caption stays ≤ 6 with the 4-line speed note; the full est./ann. definitions are the legend's first lines. */}
      <span className="block" data-bh-jev12-legend-line>I, C, S, K = Intelligence, Calibration, Speed, Cost; est./ann. = <a href="#jev-costs" className="text-accent underline">estimated/announced cost</a>; † = see note.</span>
      <details className="mt-2" data-bh-jev12-legend>
        <summary className="cursor-pointer text-accent">Legend and notes</summary>
        <ul className="mt-2 space-y-1">
          <li data-bh-jev12-est-note>~ est. = no measured bill; priced like a large inference provider (<a href="#jev-costs" className="text-accent underline">how costs are estimated</a>).</li>
          <li data-bh-jev12-ann-note>ann. = the provider&rsquo;s announced price, not yet charged.</li>
          <li>Names link to each project.</li>
          <li data-bh-jev12-label-note>A label-only system has no calibration (–, counted as 0).</li>
          {all.filter((r) => r.footnote).map((r) => <li key={r.key} data-bh-jev12-footnote={r.key}>{chartName(r)}: {r.footnote}</li>)}
        </ul>
      </details>
    </figcaption>
  </figure>;
}

function Table({ view, rows, honorableRows, partialRows, w, scope }: { view: JevV12View; rows: Row[]; honorableRows: Row[]; partialRows: Row[]; w: JevWeights4; scope: JevTaskScope }) {
  const [col, setCol] = useState<Col>("main");
  const [flip, setFlip] = useState(false);
  const d = stateDescription(w, scope);
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
  const honorable = useMemo(() => sort(honorableRows), [honorableRows, col, flip]); // eslint-disable-line react-hooks/exhaustive-deps
  const pick = (c: Col) => { if (c === col) setFlip((f) => !f); else { setCol(c); setFlip(false); } };
  const aria = (c: Col) => (c !== col ? "none" : HIGHER[c] !== flip ? "descending" : "ascending");
  const eff = percents(w);
  const H = ({ c, label, sub, hero }: { c: Col; label: string; sub?: string; hero?: boolean }) => <th scope="col" aria-sort={aria(c)} className={hero ? "min-w-[10.5rem]" : "whitespace-nowrap"}>
    <button type="button" data-bh-jev12-sort={c} onClick={() => pick(c)} className={`inline-flex min-h-9 items-center gap-1 rounded px-1 text-left ${col === c ? "text-accent" : ""}`}>
      <span><span className={`block font-semibold ${hero ? "text-[14px]" : "text-[12px]"}`}>{label}</span>{sub && <span className="block text-[11px] font-normal">{sub}</span>}</span>
      <span aria-hidden="true">{col === c ? (aria(c) === "descending" ? "↓" : "↑") : ""}</span></button></th>;
  const R = ({ r }: { r: Row }) => <tr data-bh-jev12-row={r.key} data-bh-jev12-ranked={r.ranked ? "1" : "0"} className={r.ranked ? "" : "bh-jev11-partial"}>
    <td className="bh-muted tabular">{r.rank ?? ""}{!d.official && r.rank !== null && <Delta d={r.delta} />}</td>
    <th scope="row" className="bh-jev-sticky text-left font-normal"><span className="bh-muted block text-[11px] leading-tight">by {r.author}</span>
      <span className="block font-semibold leading-snug"><SystemLink r={r}>{short(r.display)}</SystemLink>{r.footnote ? <sup><a href={`#jev12-note-${r.key}`} className="no-underline" title={firstSentence(r.footnote)} aria-label={`Note on ${short(r.display)}`} onClick={openNotes}>†</a></sup> : null}</span>
      {(() => { const cfg = r.display.slice(short(r.display).length).replace(/^[ ,]*\(?|\)$/g, ""); return cfg && cfg !== r.author ? <span className="bh-muted block text-[11px] leading-tight">{cfg}</span> : null; })()}
      {!r.ranked && <span className="bh-thin-tag mt-1 inline-block" title={r.notRankedBecause ?? (r.footnote ? firstSentence(r.footnote) : undefined)}>{NOT_RANKED[r.listing]} · not ranked</span>}</th>
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
  const notes = [...view.ranked, ...view.honorable, ...view.partial].filter((r) => r.footnote);
  return <section className="mt-8" aria-labelledby="jev12-table">
    <h2 id="jev12-table" className="text-xl font-semibold">Axes, tiers, latency and cost</h2>
    <p className="bh-muted mt-1 text-sm">Sort by any column; values the run could not produce always sort last. Hover a cost for how it was priced, a latency for the endpoint. Names link to each project.</p>
    <SpeedNote view={view} className="mt-1" />
    <CostUnitNote view={view} className="mt-1" />
    <div className="bh-table-wrap mt-3">
      <table className="bh-table bh-jev-table" data-bh-jev12-table>
        <thead><tr>
          <th scope="col"><span className="sr-only">Rank</span>#</th>
          <th scope="col" className="bh-jev-sticky">System</th>
          {d.official
            ? <H c="main" label={SCORE_NAME} sub="official" hero />
            : <H c="main" label={d.preset ? d.short : `Custom ${d.ratio}`} sub={`${d.scopeDefault ? `${d.ratio} · not the official score` : `${d.scopeLabel} · not the official score`}`} hero />}
          {AXES.map((k) => <H key={k} c={k} label={AXIS_LABEL[k]} sub={`${eff[k]} %`} />)}
          <H c="usd" label="$ / 1,000 decisions" sub="not tokens" />
          {TIER_ORDER.map((t) => <H key={t} c={t} label={TIER_LABEL[t]} sub={view.tierWeights[t] > 0 ? `${view.tierCounts[t]} dec. · ${Math.round(view.tierWeights[t] * 100)} %` : `${view.tierCounts[t]} dec. · outside this scope`} />)}
          <H c="p50" label="Latency" sub="p50 · p95, raw → adjusted" />
          <th scope="col" className="whitespace-nowrap text-[12px]">Endpoint</th>
        </tr></thead>
        <tbody>
          {ranked.map((r) => <R key={r.key} r={r} />)}
          {honorable.length > 0 && <tr data-bh-jev12-honorable-head><td colSpan={15} className="bh-muted text-[12px]"><span className="sticky left-3 inline-block max-w-[330px] whitespace-normal"><a href="#jev12-honorable" className="text-accent underline">{view.honorableMentions?.heading ?? "Honorable mentions"}</a> — shown, not ranked: {firstSentence(view.honorableMentions?.rule ?? '')}</span></td></tr>}
          {honorable.map((r) => <R key={r.key} r={r} />)}
          {partial.length > 0 && <tr><td colSpan={15} className="bh-muted text-[12px]"><span className="sticky left-3 inline-block max-w-[330px] whitespace-normal">Partial runs — shown, not ranked: a tier attempted for fewer than 95 % of its decisions.</span></td></tr>}
          {partial.map((r) => <R key={r.key} r={r} />)}
        </tbody>
      </table>
    </div>
    {/* F-152 (Fable pass 28): the † notes are a closed disclosure — a row's † opens it and lands on its entry; the first sentence is the †'s title. */}
    {notes.length > 0 && <details id="jev12-notes" className="mt-2 text-xs" data-bh-jev12-notes>
      <summary className="cursor-pointer text-accent">† Notes on {notes.length} marked systems — how each was run</summary>
      <ul className="bh-muted mt-2 space-y-1">{notes.map((r) => <li key={r.key} id={`jev12-note-${r.key}`}>† <b className="text-gray-200"><ProjectLink r={r}>{short(r.display)}</ProjectLink></b>: {r.footnote}</li>)}</ul>
    </details>}
  </section>;
}

// CR-97 (Florian 2026-09-20): classifier.dev was #1 on a model that is not its own. It stays on the page with every
// number it earned, under the ranking, with the rule and the reason in plain English — and without a rank.
const firstSentence = (text: string) => text.trim().split(/(?<=[.!?])\s+/)[0] ?? text.trim();
const openNotes = () => { const d = document.getElementById("jev12-notes"); if (d instanceof HTMLDetailsElement) d.open = true; };
const lastSentence = (text: string) => {
  const sentence = text.trim().split(/(?<=[.!?])\s+/).at(-1) ?? text.trim();
  return sentence.endsWith(".") || sentence.endsWith("!") || sentence.endsWith("?") ? sentence : `${sentence}.`;
};
const sentence = (text: string) => {
  const trimmed = text.trim();
  return trimmed.endsWith(".") || trimmed.endsWith("!") || trimmed.endsWith("?") ? trimmed : `${trimmed}.`;
};

function HonorableMentions({ view, rows }: { view: JevV12View; rows: Row[] }) {
  const hm = view.honorableMentions;
  if (!hm || rows.length === 0) return null;
  const jev = (key: string) => view.ranked.find((r) => r.key === key) ?? null;
  return <section className="mt-8 max-w-4xl scroll-mt-6" id="jev12-honorable" aria-labelledby="jev12-honorable-head" data-bh-jev12-honorable>
    <h2 id="jev12-honorable-head" className="text-xl font-semibold">{hm.heading}</h2>
    <p className="bh-muted mt-1 text-sm" data-bh-jev12-honorable-rule>{firstSentence(hm.rule)}</p>
    {rows.map((r) => {
      const d = hm.systems[r.key];
      const base = d ? jev(d.runs_on_key) : null;
      return <article key={r.key} className="bh-panel mt-3 p-4" data-bh-jev12-honorable-row={r.key}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 className="text-lg font-semibold"><SystemLink r={r}>{short(r.display)}</SystemLink>
            <span className="bh-thin-tag ml-2 align-middle" data-bh-jev12-honorable-tag>no rank</span></h3>
          <p className="tabular text-sm"><b className="text-lg" data-bh-jev12-honorable-score={r.main.toFixed(3)}>{one(r.main)}</b> {SCORE_NAME}
            {base && <span className="bh-muted"> · {short(base.display)} (#{base.rank}) scores {one(base.main)}</span>}</p>
        </div>
        {d && <p className="mt-1 text-sm font-semibold" data-bh-jev12-honorable-runs-on>Runs on {d.runs_on}.</p>}
        <ul className="bh-muted mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[13px] sm:grid-cols-5" data-bh-jev12-honorable-axes>
          {AXES.map((k) => <li key={k}><span className="block font-semibold text-gray-200">{AXIS_LABEL[k]}</span><span className="tabular">{one(r.axes[k])}</span></li>)}
          <li><span className="block font-semibold text-gray-200">$ per 1,000 decisions</span><CostValue r={r} /></li>
        </ul>
        {d && <div className="mt-3 space-y-2 text-sm">
          <p className="text-sm" data-bh-jev12-honorable-reason>{sentence(d.short_reason.charAt(0).toUpperCase() + d.short_reason.slice(1))} {lastSentence(d.why_not_ranked)}</p>
          <details className="bh-muted" data-bh-jev12-honorable-details>
            <summary className="cursor-pointer text-accent">Why it is not ranked, what its price assumes, and what we found</summary>
            <div className="mt-2 space-y-2">
              <p data-bh-jev12-honorable-why>{d.why_not_ranked}</p>
              <p><b className="text-gray-200">Only the fast tier was measured.</b> {d.tier_measured.replace(/^Only the fast tier was measured\.\s*/, "")}</p>
              <p data-bh-jev12-honorable-price><b className="text-gray-200">Price.</b> {d.price_note}</p>
              <p data-bh-jev12-honorable-finding><b className="text-gray-200">Not a pass-through.</b> {d.not_pass_through}</p>
              <p>{d.credit} Read {d.sources_read}: {d.sources.map((u, i) => <span key={u}>{i > 0 ? " · " : ""}<a className="text-accent underline" href={u} target="_blank" rel="noopener noreferrer">{u.replace(/^https:\/\//, "")}</a></span>)}</p>
            </div>
          </details>
        </div>}
      </article>;
    })}
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

// Review gate 20260920T043003Z: F-140 moved the task's topic and type into a native `title`, which never opens on
// touch — on a phone the 231 rows were bare ids. The topic is in every id already (hard-opus-a-long_policy-01);
// the question type is not, so it is shown beside the id. Definitions are TypeSafe's own primitive definitions
// (docs.typesafe.ai/primitives/{choice,noul,score}); the published code is shown, never renamed.
const TASK_TYPE: Record<string, string> = {
  choice: "Choice — the system picks one of a defined set of options.",
  noul: "Noul — whether a stated condition holds; the answer is the probability of yes.",
  score: "Score — a degree along a described dimension, over ordered levels.",
};

function PhoneTaskId({ id }: { id: string }) {
  const compact = id.replace(/^(?:easy|standard|judge|hard)-/, "");
  return <>{compact.split(/([_-])/).map((part, i) => <span key={`${part}-${i}`}>{part}{/^[_-]$/.test(part) && <wbr />}</span>)}</>;
}

const TASK_STATUS: Record<string, { symbol: string; label: string; className: string }> = {
  c: { symbol: "✓", label: "correct", className: "text-[rgb(var(--accent2))]" },
  w: { symbol: "×", label: "wrong", className: "text-[rgb(var(--warn))]" },
  f: { symbol: "!", label: "failed (scored wrong)", className: "text-[rgb(var(--warn))]" },
  n: { symbol: "·", label: "not attempted", className: "bh-muted" },
};

function TaskGrid({ view, tasks, scope }: { view: JevV12View; tasks: JevTasksView; scope: JevTaskScope }) {
  const visibleTasks = tasksForScope(tasks.tasks, scope);
  const systems = [...view.ranked, ...view.honorable, ...view.partial];
  // Review gate 20260919T233002Z: name whichever systems the pinned capture is missing instead of one hard-coded key,
  // so a later row added to the score artifact can never be silently blank here.
  const uncovered = systems.filter((r) => !tasks.systems[r.key]).map((r) => short(r.display));
  const groups = ["easy", "standard", "judge", "hard"] as const;
  const groupLabel = { easy: "Easy", standard: "Medium (standard)", judge: "Judge", hard: "Hard" };
  return <section className="mt-8" aria-labelledby="jev12-tasks">
    <h2 id="jev12-tasks" className="text-xl font-semibold">Which public tasks did each system get right?</h2>
    <p className="bh-muted mt-1 max-w-4xl text-sm">This view shows public task outcomes only: {visibleTasks.length} of {tasks.tasks.length} public tasks in the selected scope. Held-out and imported task text is not shipped.{uncovered.length > 0 && <span data-bh-jev12-task-uncovered> The pinned artifact has no public-task outcomes for {uncovered.join(', ')} yet, so {uncovered.length === 1 ? 'its cells remain' : 'their cells remain'} unavailable.</span>}</p>
    <details className="bh-panel mt-3 p-4" data-bh-jev12-task-grid>
      <summary className="cursor-pointer font-semibold">Show {visibleTasks.length} public task outcomes across {systems.length} systems</summary>
      <div className="bh-table-wrap mt-3 max-h-[38rem] overflow-auto">
        <table className="bh-table min-w-[54rem] text-[12px]" data-bh-jev12-task-table>
          <thead><tr>
            <th scope="col" className="bh-jev-sticky w-[13rem] min-w-[13rem] max-w-[13rem] text-left">Task</th>
            {systems.map((r) => <th key={r.key} scope="col" className="bh-jev-task-system h-[7.5rem] w-8 min-w-[2rem] max-w-[2rem] whitespace-nowrap px-0 text-center align-bottom text-[12px]" title={r.display} aria-label={r.display}><span className="bh-jev-task-rotated inline-block">{short(r.display)}</span></th>)}
          </tr></thead>
          <tbody>
            {groups.flatMap((tier) => {
              const tierTasks = visibleTasks.filter((task) => task.tier === tier);
              if (!tierTasks.length) return [];
              return [
                <tr key={'group-' + tier} className="bg-[rgb(var(--surface-2))]" data-bh-jev12-task-group={tier}><th scope="rowgroup" className="bh-jev-sticky text-left font-semibold"><span className="hidden sm:inline">{groupLabel[tier]} · {tierTasks.length} of {view.tierCounts[tier]} decisions public</span><span className="sm:hidden">{groupLabel[tier]} · {tierTasks.length} of {view.tierCounts[tier]} public</span></th>{systems.map((r) => {
                  // Review gate 20260920T043003Z: these cells used the artifact's whole-tier aggregate (72/72) under a
                  // header that counts public tasks (48). They count the public rows this group lists; the whole-tier
                  // figure stays available in the cell title and in the tier columns of the table above.
                  const system = tasks.systems[r.key];
                  const summary = publicTierSummary(system, tierTasks);
                  const whole = system?.byTier[tier];
                  const title = summary
                    ? `${r.display}: ${summary.correct}/${summary.attempted} correct/attempted on the ${tierTasks.length} public ${groupLabel[tier].toLowerCase()} tasks${whole?.attempted ? ` · whole tier ${whole.correct}/${whole.attempted}` : ""}`
                    : `${r.display}: no public outcomes`;
                  return <td key={r.key} className="bh-jev-task-cell w-8 min-w-[2rem] px-0 text-center text-[11px] font-semibold tabular-nums" title={title}>{summary ? `${summary.correct}/${summary.attempted}` : "—"}</td>;
                })}</tr>,
                ...tierTasks.map((task) => <tr key={task.id} className="bh-jev-task-row" data-bh-jev12-task={task.id}>
                  <th scope="row" className="bh-jev-sticky w-[13rem] min-w-[13rem] max-w-[13rem] text-left font-normal" title={`${task.id} · ${task.type} — ${TASK_TYPE[task.type] ?? "published question type"}`} aria-label={`${task.id} · ${task.type} — ${TASK_TYPE[task.type] ?? "published question type"}`}>
                    <span className="hidden font-semibold whitespace-nowrap sm:inline">{task.id}</span>
                    <span className="bh-jev-task-phone-id font-semibold" aria-hidden="true"><PhoneTaskId id={task.id} /></span>
                    <span className="bh-muted ml-2 hidden whitespace-nowrap text-[11px] sm:inline" data-bh-jev12-task-type={task.type}>{task.type}</span>
                  </th>
                  {systems.map((r) => {
                    const outcome = tasks.systems[r.key]?.outcomes[task.id];
                    if (!outcome) return <td key={r.key} className="bh-jev-task-cell bh-muted w-8 min-w-[2rem] max-w-[2rem] px-0 py-0.5 text-center" title={r.key + ': no public outcome in the pinned artifact'} aria-label={r.key + ': no public outcome'}>—</td>;
                    const meta = TASK_STATUS[outcome.status];
                    const latency = outcome.latency === null ? 'latency unavailable' : outcome.latency.toFixed(3) + ' s';
                    return <td key={r.key} className={'bh-jev-task-cell w-8 min-w-[2rem] max-w-[2rem] px-0 py-0.5 text-center font-semibold ' + meta.className} title={task.id + ' · ' + task.tier + ' · ' + task.topic + ' · ' + meta.label + ' · ' + latency} aria-label={r.display + ', ' + task.id + ': ' + meta.label}>{meta.symbol}</td>;
                  })}
                </tr>),
              ];
            })}
          </tbody>
        </table>
      </div>
      <p className="bh-muted mt-2 text-xs" data-bh-jev12-task-legend>✓ correct · × wrong · ! failed (scored wrong) · · not attempted · — no public outcome in the pinned artifact. A group row counts the public tasks it lists; the tier columns of the table above use all decisions of the tier. Every task id carries its topic (<span className="font-mono">hard-opus-a-long_policy-01</span> is a long_policy task), and the tag after the id is the published question type: <b className="text-gray-200">choice</b> — pick one of a defined set of options · <b className="text-gray-200">noul</b> — whether a stated condition holds · <b className="text-gray-200">score</b> — a degree along a described dimension. <span className="sm:hidden">Task ids are shown without their tier prefix; the tier is the group row.</span> Task descriptions are intentionally not included; the task id, tier, topic and type are the published public metadata.</p>
    </details>
  </section>;
}

const presetRaw = (w: JevWeights4): JevWeights4 => ({ intelligence: w.intelligence * 100, calibration: w.calibration * 100, speed: w.speed * 100, cost: w.cost * 100 });

export function JevModelsV12Board({ view, tasks, children }: { view: JevV12View; tasks?: JevTasksView; children?: ReactNode }) {
  const s = view.scoring;
  const [scope, setScope] = useState<JevTaskScope>(DEFAULT_TASK_SCOPE);
  const [urlReady, setUrlReady] = useState(false);
  const [raw, setRawState] = useState<JevWeights4>(presetRaw(DEFAULT_WEIGHTS));
  const w = useMemo(() => { const n = normalise(raw) ?? DEFAULT_WEIGHTS; return PRESETS.find((p) => sameWeights(p.w, n))?.w ?? n; }, [raw]);
  useEffect(() => {
    const fromUrl = parseParams(window.location.search);
    if (!isDefault(fromUrl)) setRawState(presetRaw(fromUrl));
    setScope(parseTaskScope(window.location.search) as JevTaskScope);
    setUrlReady(true);
  }, []);
  useEffect(() => {
    if (!urlReady) return;
    const u = new URL(window.location.href); const p = toParam(w);
    if (p) u.searchParams.set("w", p); else u.searchParams.delete("w");
    const scopeParam = toTaskScopeParam(scope);
    if (scopeParam) u.searchParams.set("scope", scopeParam); else u.searchParams.delete("scope");
    u.searchParams.delete("preset");
    if (u.href !== window.location.href) window.history.replaceState(window.history.state, "", u.href);
  }, [w, scope, urlReady]);
  const scopedView = useMemo(() => {
    if (!tasks) return view;
    const rankedRows = scopeRows(view.ranked, tasks.systems, scope, DEFAULT_WEIGHTS);
    const honorableRows = scopeRows(view.honorable, tasks.systems, scope, DEFAULT_WEIGHTS);
    const partialRows = scopeRows(view.partial, tasks.systems, scope, DEFAULT_WEIGHTS);
    // CR-99: a default-ranked system without a complete hard-tier run moves to the partial list in
    // this view. Honorable mentions remain honorable, and no unranked row can acquire a rank.
    const combined = [...rankedRows, ...honorableRows, ...partialRows];
    const ranked = scope === "hard" ? combined.filter((r) => r.listing === "ranked" && !r.hardScopeMissing) : rankedRows;
    const honorable = scope === "hard" ? combined.filter((r) => r.listing === "honorable_mention") : honorableRows;
    const partial = scope === "hard" ? combined.filter((r) => r.listing === "partial" || r.hardScopeMissing) : partialRows;
    // Review gate 20260920T043003Z: the hero counts the decisions the shown score is computed from —
    // the artifact's tier aggregates for this scope (534 / 168 / 72), not the public-task slice the grid
    // ships (231 / 120 / 48). Counting public tasks here made the official view claim 231.
    // The tier weights move with the scope too: under Easy + Medium the score re-normalises to easy 33 % /
    // standard 67 % and drops Judge and Hard, so the columns and the method list may not keep 14/28/28/30 %.
    return { ...view, ranked, honorable, partial, decisions: scopeDecisions(view.tierCounts, scope), tierWeights: scopeTierWeights(scope) };
  }, [view, tasks, scope]);
  // rerank() ranks the first list and only re-scores the second; both unranked kinds go in the second, then split again.
  const { ranked, partial: unranked } = useMemo(() => rerank(scopedView.ranked, [...scopedView.honorable, ...scopedView.partial], w), [scopedView, w]);
  const honorable = useMemo(() => unranked.filter((r) => r.listing === "honorable_mention"), [unranked]);
  const partial = useMemo(() => unranked.filter((r) => r.listing === "partial"), [unranked]);
  const scopeInfo = scopeById(scope);
  // Review gate 20260920T043003Z: the method list stated the official 14/28/28/30 % under every scope while the
  // score above it had already re-normalised. Both lists come from the scoped weights now.
  const tierTextOrder: JevTier12[] = ["hard", "easy", "standard", "judge"];
  const scoredTiers = tierTextOrder.filter((t) => scopedView.tierWeights[t] > 0);
  const unscoredTiers = tierTextOrder.filter((t) => scopedView.tierWeights[t] === 0);
  return <>
    <div className="mt-6 space-y-4" data-bh-jevc-hero>
      <ScoreChart rows={ranked} honorable={honorable} partial={partial} w={w} view={scopedView} scope={scope} />
      <Controls w={w} raw={raw} scope={scope} setPreset={(p) => setRawState(presetRaw(p))} setRaw={setRawState} reset={() => { setRawState(presetRaw(DEFAULT_WEIGHTS)); setScope(DEFAULT_TASK_SCOPE); }} />
    </div>
    {tasks && <section className="bh-panel mt-8 max-w-4xl p-4" aria-labelledby="jev12-difficulty" data-bh-jev12-difficulty data-bh-jev12-scope={scope}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="jev12-difficulty" className="text-xl font-semibold">Explore by task difficulty</h2>
          <p className="bh-muted mt-1 max-w-2xl text-sm">All tasks is the published default. Choose a scope to see how the ranking changes by difficulty. Hard only uses all {view.tierCounts.hard} hard-tier decisions and their measured Intelligence, Calibration, Speed and Cost.</p>
        </div>
        {scope !== DEFAULT_TASK_SCOPE && <button type="button" className="bh-button text-sm font-semibold" onClick={() => setScope(DEFAULT_TASK_SCOPE)} data-bh-jev12-scope-reset>Reset to all tasks</button>}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap" role="group" aria-label="Task difficulty scope">
        {TASK_SCOPES.map((item) => <button key={item.id} type="button" className="bh-button min-h-10 w-full text-sm font-semibold sm:w-auto" aria-pressed={scope === item.id} onClick={() => setScope(item.id)} data-bh-jev12-scope-option={item.id}>{item.label}</button>)}
      </div>
      {scope !== DEFAULT_TASK_SCOPE && <p className="mt-3 text-sm font-semibold text-[rgb(var(--warn))]" role="status" data-bh-jev12-scope-warning>⚠ Not the default JevBench setting — {scopeInfo.label} tasks; the chart, table and ranking above are recomputed.</p>}
      <p className="bh-muted mt-2 text-xs">Tier mapping: Easy = easy; Medium = standard. Easy scopes change Intelligence only. Hard only measures all four axes on the same hard-tier subset; systems without a hard-tier run are shown as partial and are not ranked.</p>
    </section>}
    {children}
    <Table view={scopedView} rows={ranked} honorableRows={honorable} partialRows={partial} w={w} scope={scope} />
    <HonorableMentions view={scopedView} rows={honorable} />
    {tasks && <TaskGrid view={scopedView} tasks={tasks} scope={scope} />}
    <section className="bh-panel mt-8 max-w-4xl p-4 text-sm" aria-labelledby="jev12-how" data-bh-jev12-formula>
      <h2 id="jev12-how" className="font-semibold">How the {SCORE_NAME} works</h2>
      <p className="mt-2 text-base"><b>{SCORE_NAME} = (Intelligence × Calibration × Speed × Cost)<sup>1/4</sup></b>, each axis on 0–100 — the geometric mean. A weak axis pulls the score down hard: a strong axis cannot buy it back. <span data-bh-jev12-penalty>Below 50 Intelligence the score is also multiplied by (Intelligence ÷ 50)², so a system barely better than guessing cannot rank on speed and price.</span></p>
      <ul className="bh-muted mt-3 space-y-1.5">
        <li data-bh-jev12-intel-weights={scope}><b className="text-gray-200">Intelligence</b> — accuracy above chance: per tier, how much of the gap between guessing and all-correct a system closes (0 = guessing, 100 = all correct), weighted{scope === DEFAULT_TASK_SCOPE ? "" : ` for the ${scopeInfo.label} scope`}: {scoredTiers.map((t, i) => <span key={t}>{i > 0 ? ", " : ""}{TIER_LABEL[t].toLowerCase()} {Math.round(scopedView.tierWeights[t] * 100)} %</span>)} ({scoredTiers.map((t) => view.tierCounts[t]).join(" / ")} decisions).{unscoredTiers.length > 0 && ` ${listAnd(unscoredTiers.map((t) => TIER_LABEL[t]))} ${unscoredTiers.length === 1 ? "is" : "are"} outside this scope, so ${unscoredTiers.length === 1 ? "it does" : "they do"} not enter the score.`}</li>
        <li><b className="text-gray-200">Calibration</b> — on the hard tier: does &ldquo;80 % sure&rdquo; come true 80 % of the time, and does the returned distribution match the exact gold distribution on the probability items.</li>
        <li><b className="text-gray-200">Speed</b> — median and 95th-percentile latency, one request at a time: 0.1 s scores 100, each 10× slower costs 20 points (1 s = 80, 10 s = 60). <SpeedNote view={view} className="mt-0.5 inline" /></li>
        <li><b className="text-gray-200">Cost</b> — dollars per 1,000 <b className="text-gray-200">decisions</b>, never per 1,000 tokens: $0.001 scores 100, each 10× more expensive costs 30 points ($0.01 = 70, $0.10 = 40, $1 = 10). Models without a tariff are priced at hosted-provider prices, marked &ldquo;est.&rdquo; (<a href="#jev-costs" className="text-accent underline">how</a>). <CostUnitNote view={view} className="mt-0.5" full /></li>
      </ul>
      <details className="mt-3"><summary className="cursor-pointer text-accent">Full scoring rules</summary>
        <dl className="bh-muted mt-2 space-y-2">
          {(["jevbench_score", "intelligence", "calibration", "speed", "cost", "ranked", "presets"] as const).map((k) => s[k] && <div key={k}><dt className="inline font-semibold text-gray-200">{k === "jevbench_score" ? SCORE_NAME : k[0].toUpperCase() + k.slice(1)}. </dt><dd className="inline">{s[k]}</dd></div>)}
        </dl></details>
    </section>
    {scope === DEFAULT_TASK_SCOPE ? <Views view={scopedView} /> : <p className="bh-muted mt-8 max-w-4xl text-sm">The weighting comparison table is tied to the published All tasks scope. Reset to All tasks to compare alternate weightings without mixing scopes.</p>}
  </>;
}
