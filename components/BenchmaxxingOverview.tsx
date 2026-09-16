"use client";

import { Fragment, useEffect, useState } from "react";
import { InfoTip } from "./InfoTip";
import { SignalValue } from "./SignalValue";
import { TopicRadar } from "./TopicRadar";
import type { BenchmaxxingReportData } from "./BenchmaxxingReport";
import { interpretBenchmaxxing } from "../lib/benchmaxxing-interpretation.mjs";

import { BENCHMAXXING_PRESETS, presetRows, type BenchmaxxingOverviewRow, type BenchmaxxingPreset } from "../lib/benchmaxxing-presets";

/** CR-15.2: the table's model list is a named, changeable preset (lib/benchmaxxing-presets). Featured
 *  (current top models by Composite) is the default; strongest signals and every scored model stay one click away. */

// F-24: the Signal keeps its 4 px magnitude bar in the Benchmaxxing orange; CR-15.3 turns values above
// the warning threshold into a pill. CR-15.4: a row is the master — selecting it drives the report below.
// CR-43.3: reports fetched for expanded rows, shared across rows and re-expansions (one request per model).
const reportCache = new Map<string, Promise<BenchmaxxingReportData | null>>();
const loadReport = (id: string) => {
  if (!reportCache.has(id)) reportCache.set(id, fetch(`/api/benchmaxxing?report=${encodeURIComponent(id)}`).then((r) => r.ok ? r.json() : null).then((x) => x?.report ?? null).catch(() => { reportCache.delete(id); return null; }));
  return reportCache.get(id)!;
};

/** CR-43.3 (Florian 2026-09-16): the quick look inside an expanded row — a compact radar of the measured axes,
 *  the signal, a plain-language reading, and a link to the full report section below (model selected, focus moved). */
function QuickLook({ row, onOpenReport }: { row: BenchmaxxingOverviewRow; onOpenReport: (id: string) => void }) {
  const [report, setReport] = useState<BenchmaxxingReportData | null | undefined>(undefined);
  useEffect(() => { let live = true; loadReport(row.id).then((r) => { if (live) setReport(r); }); return () => { live = false; }; }, [row.id]);
  const reading = interpretBenchmaxxing(report ?? { status: "scored", score: row.score, topicSpread: [] }, row.level);
  const axes = (report?.profile.axes ?? []).filter((a) => !a.missing && a.value != null);
  return <div className="grid gap-4 md:grid-cols-[minmax(0,400px)_1fr] md:items-center">
    <div className="min-h-[120px]">
      {report === undefined ? <p className="bh-muted text-sm">Loading radar…</p>
        : !report || !axes.length ? <p className="bh-muted text-sm">Radar unavailable.</p>
        : <TopicRadar compact axes={axes} series={[{ id: row.id, name: row.name, color: "#35a7ff", points: axes.map((a) => ({ value: a.value, label: `percentile ${Math.round(a.value!)}` })) }]}
            label={`Compact radar of ${row.name}'s ${axes.length} measured benchmarks, grouped by topic; the full interactive radar is in the report below.`} />}
    </div>
    <div className="space-y-3 text-sm">
      <p className="bh-muted text-xs font-semibold uppercase tracking-wide">Benchmaxxing signal</p>
      <p className="text-3xl leading-none"><SignalValue score={row.score} level={row.level} /></p>
      <p className="font-medium" data-quick-reading>{reading.headline}</p>
      {reading.detail && <p className="bh-muted" data-quick-detail>{reading.detail}</p>}
      <p className="bh-muted text-xs">{reading.caveat} Jumps between neighbouring benchmarks of one topic are what the signal measures.</p>
      <a href={`?model=${encodeURIComponent(row.id)}#radar`} className="bh-button inline-flex min-h-9 items-center px-3" data-quick-report
        onClick={(e) => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; e.preventDefault(); onOpenReport(row.id); }}>
        Open the full report for {row.name} ↓
      </a>
    </div>
  </div>;
}

/** CR-63.5: "Claude Fable 5.1 (Adaptive Reasoning, Max Effort, Default Fallback)" → base "Claude Fable 5.1", variant "Adaptive Reasoning · Max Effort · Default Fallback". */
function baseName(name: string) { const i = name.indexOf(" ("); return i > 0 && name.endsWith(")") ? name.slice(0, i) : name; }
function variantOf(name: string) { const i = name.indexOf(" ("); return i > 0 && name.endsWith(")") ? name.slice(i + 2, -1).split(", ").join(" · ") : ""; }

function Rows({ rows, maxScore, selected, onSelect, expanded, onExpand, onOpenReport }: { rows: BenchmaxxingOverviewRow[]; maxScore: number; selected: string[]; onSelect: (id: string) => void; expanded: string | null; onExpand: (id: string | null) => void; onOpenReport: (id: string) => void }) {
  return <>
    {rows.map((row) => {
      const slot = selected.indexOf(row.id);
      const open = expanded === row.id;
      const panelId = `bmx-quick-${row.id.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
      return <Fragment key={row.id}><tr className={`cursor-pointer ${slot >= 0 ? "bg-accent/10" : "hover:bg-accent/5"}`} onClick={() => onSelect(row.id)} data-row-id={row.id}>
        <th scope="row" className="!py-2 text-left align-middle font-medium">
          <span className="flex items-start gap-1">
          <button type="button" className="bh-bmx-expand -ml-1 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded text-gray-400 hover:text-accent" aria-expanded={open} aria-controls={panelId}
            aria-label={`${open ? "Hide" : "Show"} quick look for ${row.name}`} title={open ? "Hide quick look" : "Quick look: compact radar and reading"}
            onClick={(e) => { e.stopPropagation(); onExpand(open ? null : row.id); }}>
            <span aria-hidden="true" className={`inline-block transition-transform ${open ? "rotate-90" : ""}`}>▸</span>
          </button>
          <button type="button" className="block min-w-0 flex-1 text-left" aria-pressed={slot >= 0} onClick={(e) => { e.stopPropagation(); onSelect(row.id); }}>
            {/* F-67: phones wrap the name (two Qwen rows differed only in the truncated part); md:truncate keeps the desktop single line. */}
            <span className="block leading-5 md:truncate">{selected.length > 1 && slot >= 0 && <span className="mr-1 text-[10px] font-bold text-accent" title={`Model ${String.fromCharCode(65 + slot)} of the side-by-side report`}>{String.fromCharCode(65 + slot)}</span>}{baseName(row.name)}</span>
            {/* CR-63.5: base name first; the reasoning configuration in muted small text instead of a six-line name. */}
            <span className="bh-muted block text-[11px] font-normal leading-4">{row.org}{variantOf(row.name) ? ` · ${variantOf(row.name)}` : ""}</span>
          </button>
          </span>
        </th>
        <td className="!py-2 align-middle">
          {/* CR-21.2: the bar spans 0 → the highest signal in this list, so differences stay visible. */}
          <div className="bh-magnitude-bar bh-magnitude-warn !text-left" data-signal-frac={(row.score / maxScore).toFixed(4)}>
            <div className="bh-magnitude-track" aria-hidden="true">
              <div className="bh-magnitude-fill" style={{ width: `${Math.max(0, Math.min(1, row.score / maxScore)) * 100}%` }} />
            </div>
            <span className="relative z-[1] block"><SignalValue score={row.score} level={row.level} /></span>
          </div>
        </td>
        <td className="hidden !py-2 align-middle tabular md:table-cell">{row.comparisons} in {row.topics} topics</td>
        <td className="!py-2 align-middle tabular">{row.measured}/{row.total}<span className="hidden sm:inline"> ({((row.measured / Math.max(1, row.total)) * 100).toFixed(0)}%)</span></td>
        <td className="hidden !py-2 align-middle tabular md:table-cell">{row.domainSpecialization == null ? "—" : row.domainSpecialization.toFixed(1)}</td>
      </tr>
      {open && <tr className="bh-bmx-quick"><td colSpan={5} id={panelId} className="!px-4 !py-4">
        <QuickLook row={row} onOpenReport={onOpenReport} />
      </td></tr>}
      </Fragment>;
    })}
  </>;
}

export function BenchmaxxingOverview({ rows, preset, onPreset, selected, onSelect, onOpenReport, showAll, onShowAll, taggedCount, minComparisons, minTopics }: {
  rows: BenchmaxxingOverviewRow[];
  onOpenReport: (id: string) => void;
  preset: BenchmaxxingPreset;
  onPreset: (preset: BenchmaxxingPreset) => void;
  selected: string[];
  onSelect: (id: string) => void;
  showAll: boolean;
  onShowAll: (value: boolean) => void;
  taggedCount: number;
  minComparisons: number;
  minTopics: number;
}) {
  const listed = presetRows(rows, preset);
  const [expanded, setExpanded] = useState<string | null>(null);
  const visible = showAll ? listed : listed.slice(0, 10);
  // CR-21.2 → CR-63.5: the bar spans 0 → the highest signal of every scored model, one scale for all tabs, so a
  // model's bar keeps its length when the list changes.
  const maxScore = Math.max(1e-9, ...rows.map((row) => row.score));
  // CR-63.4: the tag cut-offs as they fall today (tags are ranks, so the scores are read from the rows).
  const lowest = (level: "strong" | "weak") => { const s = rows.filter((r) => r.level === level).map((r) => r.score); return s.length ? Math.min(...s) : null; };
  const strongFrom = lowest("strong"), weakFrom = lowest("weak");
  const heading = BENCHMAXXING_PRESETS.find((p) => p.key === preset)!.heading;
  return <section className="bh-panel p-5" aria-label="Benchmaxxing overview">
    <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-start">
      <div>
        <h2 className="text-xl font-semibold">{heading}</h2>
        <p className="bh-muted mt-2 max-w-3xl text-sm">A signal highlights models whose results jump between related benchmarks. It is a screening flag—not proof of leakage, contamination, or intent. Select a row to open its report below, or ▸ for a quick look.</p>
      </div>
      <div className="rounded-lg border border-line px-4 !py-2 text-sm"><b>{taggedCount}</b> models carry the strong tag <span className="bh-muted">· coverage floor: {minComparisons} comparisons in {minTopics} topics</span></div>
    </div>
    <div role="group" aria-label="Model list preset" className="mt-4 flex flex-wrap gap-2">
      {BENCHMAXXING_PRESETS.map((p) => <button key={p.key} type="button" aria-pressed={preset === p.key} onClick={() => onPreset(p.key)}
        className={`bh-chip min-h-9 rounded-full border px-3 text-sm ${preset === p.key ? "border-accent bg-accent/15 font-semibold text-accent" : "border-line bh-muted"}`}>{p.label}</button>)}
    </div>
    <div className="bh-table-wrap mt-4">
      <table className="bh-table w-full table-fixed text-sm">
        <caption className="sr-only">{heading}; select a row to show its report</caption>
        <colgroup><col className="w-[44%] md:w-[28%]" /><col className="w-[22%] md:w-[14%]" /><col className="hidden md:table-column md:w-[20%]" /><col className="w-[34%] md:w-[18%]" /><col className="hidden md:table-column md:w-[20%]" /></colgroup>
        <thead><tr>
          <th scope="col" className="text-left">Model</th>
          <th scope="col" className="text-left">Signal <InfoTip title="Benchmaxxing signal" label="the Signal column">Within-topic percentile spread, 0–100, adjusted for the model’s level (mid-table models jump more by chance) and for coverage. The tags are ranks among models with at least 10 related comparisons: the top 10 % carry the strong ⚠ tag{strongFrom != null ? ` (today a signal of ${strongFrom.toFixed(1)} or more)` : ""}, the next 10 % the weak △ tag{weakFrom != null ? ` (today from ${weakFrom.toFixed(1)})` : ""} — the same tags as on the Overview table. It is a screening flag, not proof of leakage or intent. <span data-signal-max>Bars run from 0 to {maxScore.toFixed(1)}, the highest signal of any scored model, in every list.</span> <a href="/about#benchmaxxing" className="text-accent underline">How the signal works</a></InfoTip></th>
          <th scope="col" className="hidden text-left md:table-cell">Related comparisons</th>
          <th scope="col" className="text-left">Measured</th>
          <th scope="col" className="hidden text-left md:table-cell">Domain specialization <InfoTip title="Domain specialization" label="the Domain specialization column">Disclosed for context and deliberately not added to the Benchmaxxing signal. Consistently strong coding and weak writing is specialisation, not unevenness within a topic.</InfoTip></th>
        </tr></thead>
        <tbody><Rows rows={visible} maxScore={maxScore} selected={selected} onSelect={onSelect} expanded={expanded} onExpand={setExpanded} onOpenReport={onOpenReport} /></tbody>
      </table>
    </div>
    {!listed.length ? <p className="bh-empty mt-4">No scored model in this preset.</p> : null}
    {listed.length > 10 ? <button type="button" className="bh-button mt-4" onClick={() => onShowAll(!showAll)} aria-expanded={showAll}>{showAll ? "Show first 10" : `Show all ${listed.length} in this list`}</button> : null}
  </section>;
}
