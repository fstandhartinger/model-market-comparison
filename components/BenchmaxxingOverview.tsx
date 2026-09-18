"use client";

import { Fragment, useEffect, useState } from "react";
import { InfoTip } from "./InfoTip";
import { SignalValue } from "./SignalValue";
import { TopicRadar } from "./TopicRadar";
import type { BenchmaxxingReportData } from "./BenchmaxxingReport";
import { interpretBenchmaxxing } from "../lib/benchmaxxing-interpretation.mjs";

import { BENCHMAXXING_PRESETS, presetLimit, presetRows, type BenchmaxxingOverviewRow, type BenchmaxxingPreset, type CompositeOf } from "../lib/benchmaxxing-presets";
import { signalBarDomain, signalBarGeometry, type SignalBarDomain } from "../lib/signal-bar.mjs";
import { BENCHMAXX_LEVELS, BENCHMAXX_TAG_MIN_COMPARISONS, BENCHMAXX_TAG_RULE_TEXT, BENCHMAXX_UNCERTAIN_MARK, BENCHMAXX_UNCERTAIN_TEXT, benchmaxxingThresholdText, type BenchmaxxingLevel } from "../lib/benchmaxxing-levels.mjs";

/** CR-15.2 → CR-74.2: the table's model list is a named, changeable preset (lib/benchmaxxing-presets): Featured models
 *  (default) · Top 50 by Main Composite · All scored. */

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
  const reading = interpretBenchmaxxing(report ?? { status: "scored", score: row.score, topicGaps: [] }, row.level, row.uncertain ?? null);
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
      <p className="text-3xl leading-none"><SignalValue score={row.score} level={row.level} uncertain={row.uncertain ?? null} /></p>
      <p className="font-medium" data-quick-reading>{reading.headline}</p>
      {reading.detail && <p className="bh-muted" data-quick-detail>{reading.detail}</p>}
      <p className="bh-muted text-xs">{reading.caveat}</p>
      {/* F-119 (Fable pass 22): the row above names the model; on a phone the full name made this a three-line button. */}
      <a href={`?model=${encodeURIComponent(row.id)}#radar`} className="bh-button inline-flex min-h-9 items-center px-3" data-quick-report aria-label={`Open the full report for ${row.name}`}
        onClick={(e) => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; e.preventDefault(); onOpenReport(row.id); }}>
        Open the full report ↓
      </a>
    </div>
  </div>;
}

/** CR-63.5: "Claude Fable 5.1 (Adaptive Reasoning, Max Effort, Default Fallback)" → base "Claude Fable 5.1", variant "Adaptive Reasoning · Max Effort · Default Fallback". */
function baseName(name: string) { const i = name.indexOf(" ("); return i > 0 && name.endsWith(")") ? name.slice(0, i) : name; }
function variantOf(name: string) { const i = name.indexOf(" ("); return i > 0 && name.endsWith(")") ? name.slice(i + 2, -1).split(", ").join(" · ") : ""; }

function Rows({ rows, domain, selected, onSelect, expanded, onExpand, onOpenReport }: { rows: BenchmaxxingOverviewRow[]; domain: SignalBarDomain; selected: string[]; onSelect: (id: string) => void; expanded: Set<string>; onExpand: (id: string, open: boolean) => void; onOpenReport: (id: string) => void }) {
  return <>
    {rows.map((row) => {
      const slot = selected.indexOf(row.id);
      const open = expanded.has(row.id);
      const bar = signalBarGeometry(row.score, domain);
      const panelId = `bmx-quick-${row.id.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
      return <Fragment key={row.id}><tr className={`cursor-pointer ${slot >= 0 ? "bg-accent/10" : "hover:bg-accent/5"}`} onClick={() => onSelect(row.id)} data-row-id={row.id}>
        <th scope="row" className="!py-2 text-left align-middle font-medium">
          <span className="flex items-start gap-1">
          <button type="button" className="bh-bmx-expand -ml-1 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded text-gray-400 hover:text-accent" aria-expanded={open} aria-controls={panelId}
            aria-label={`${open ? "Hide" : "Show"} quick look for ${row.name}`} title={open ? "Hide quick look" : "Quick look: compact radar and reading"}
            onClick={(e) => { e.stopPropagation(); onExpand(row.id, !open); }}>
            <span aria-hidden="true" className={`inline-block transition-transform ${open ? "rotate-90" : ""}`}>▸</span>
          </button>
          <button type="button" className="block min-w-0 flex-1 text-left" aria-pressed={slot >= 0} onClick={(e) => { e.stopPropagation(); onSelect(row.id); }}>
            {/* F-67: phones wrap the name (two Qwen rows differed only in the truncated part); md:truncate keeps the desktop single line. */}
            <span className="block leading-5 md:truncate">{selected.length > 1 && slot >= 0 && <span className="mr-1 text-[10px] font-bold text-accent" title={`Model ${String.fromCharCode(65 + slot)} of the side-by-side report`}>{String.fromCharCode(65 + slot)}</span>}{baseName(row.name)}</span>
            {/* CR-63.5: base name first; the reasoning configuration in muted small text instead of a six-line name. */}
            <span className="bh-muted block truncate text-[11px] font-normal leading-4" title={`${row.org}${variantOf(row.name) ? ` · ${variantOf(row.name)}` : ""}`}>{row.org}{variantOf(row.name) ? ` · ${variantOf(row.name)}` : ""}</span>
          </button>
          </span>
        </th>
        <td className="!py-2 align-middle">
          {/* CR-21.2 → F-112: the bar diverges around a shared zero line on one catalog-wide scale, so a negative
              signal draws its own bar to the left instead of leaving the row blank. */}
          <div className="bh-magnitude-bar bh-magnitude-warn bh-magnitude-diverge !text-left" data-signal-frac={bar.fraction.toFixed(4)} data-signal-sign={bar.sign}>
            <div className="bh-magnitude-track" aria-hidden="true">
              <span className="bh-magnitude-zero" style={{ left: `${domain.zero * 100}%` }} title="zero — no sign" data-signal-zero />
              {bar.sign !== "zero" && <div className="bh-magnitude-fill" data-sign={bar.sign}
                style={bar.sign === "pos"
                  ? { left: `${domain.zero * 100}%`, width: `${bar.width * 100}%` }
                  : { right: `${(1 - domain.zero) * 100}%`, width: `${bar.width * 100}%` }} />}
            </div>
            <span className="relative z-[1] block"><SignalValue score={row.score} level={row.level} uncertain={row.uncertain ?? null} /></span>
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

export function BenchmaxxingOverview({ rows, preset, onPreset, selected, onSelect, onOpenReport, showAll, onShowAll, levelCounts, uncertainCount = 0, tagAverage, minComparisons, tagMinComparisons, minTopics, compositeOf }: {
  rows: BenchmaxxingOverviewRow[];
  onOpenReport: (id: string) => void;
  preset: BenchmaxxingPreset;
  onPreset: (preset: BenchmaxxingPreset) => void;
  selected: string[];
  onSelect: (id: string) => void;
  showAll: boolean;
  onShowAll: (value: boolean) => void;
  levelCounts: Record<BenchmaxxingLevel, number>;
  /** CR-77.2: how many tagged families rest on thin evidence (shown as "n marked uncertain"). */
  uncertainCount?: number;
  tagAverage: number | null;
  minComparisons: number;
  tagMinComparisons: number;
  minTopics: number;
  compositeOf?: CompositeOf;
}) {
  const listed = presetRows(rows, preset, compositeOf);
  // CR-71.4: several rows can be open at once (each keeps its own quick look), not an accordion.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExpanded = (id: string, open: boolean) => setExpanded((old) => { const next = new Set(old); if (open) next.add(id); else next.delete(id); return next; });
  // CR-74.2: Featured and Top 50 show every row; only All scored is cut at its first page.
  const limit = presetLimit(preset);
  const visible = showAll ? listed : listed.slice(0, limit);
  const taggedCount = BENCHMAXX_LEVELS.reduce((sum, x) => sum + (levelCounts[x.level] ?? 0), 0);
  // CR-21.2 → CR-63.5 → F-112: one scale for all three presets, taken from every scored model in the catalog, so a
  // model's bar keeps its length and its position when the list changes. The domain is signed and always contains
  // zero: a negative signal draws to the left of the shared zero line instead of leaving the row blank.
  const domain = signalBarDomain(rows.map((row) => row.score));
  // CR-77.1: the tag level follows the published score alone; the InfoTip names that rule and the uncertainty marker.
  const heading = BENCHMAXXING_PRESETS.find((p) => p.key === preset)!.heading;
  return <section className="bh-panel p-5" aria-label="Benchmaxxing overview">
    <h2 className="text-xl font-semibold">{heading}</h2>
    {/* F-114: one explainer per page. What the signal means is said once, in the page intro above; this line only
        tells the reader how to drive the table. */}
    <p className="bh-muted mt-2 max-w-3xl text-sm" data-bmx-instruction>Select a row to open its report below, or ▸ for a quick look.</p>
    <div role="group" aria-label="Model list preset" className="mt-4 flex flex-wrap gap-2">
      {BENCHMAXXING_PRESETS.map((p) => <button key={p.key} type="button" aria-pressed={preset === p.key} onClick={() => onPreset(p.key)}
        className={`bh-chip min-h-9 rounded-full border px-3 text-sm ${preset === p.key ? "border-accent bg-accent/15 font-semibold text-accent" : "border-line bh-muted"}`}>{p.label}</button>)}
    </div>
    {/* F-114: the status line in the reader's order — what carries a tag, at which threshold, then the rule. It is
        also CR-74.1's legend and CR-77.2's uncertainty line: the counts and the levels were two stacked rows saying
        the same three words, and on a phone they pushed the first data row off the screen. */}
    <p className="bh-muted mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" data-bmx-level-legend>
      <span className="font-semibold">Tagged:</span>
      {taggedCount
        ? [...BENCHMAXX_LEVELS].reverse().map((x) => <span key={x.level} className="inline-flex items-center gap-1">
            <span className="bh-signal-pill" data-level={x.level} aria-hidden="true">{x.mark}</span><b>{levelCounts[x.level] ?? 0}</b> {x.label} ≥ +{x.min}</span>)
        : <b data-bmx-none-flagged>no model reaches a tag level</b>}
      {uncertainCount ? <span className="inline-flex items-center gap-1" data-bmx-uncertain-count title={BENCHMAXX_UNCERTAIN_TEXT}>
        <span className="bh-bmx-uncertain" aria-hidden="true">{BENCHMAXX_UNCERTAIN_MARK}</span><b>{uncertainCount}</b> marked uncertain</span> : null}
      <span>— {BENCHMAXX_TAG_RULE_TEXT}</span></p>
    <div className="bh-table-wrap mt-4">
      <table className="bh-table w-full table-fixed text-sm">
        <caption className="sr-only">{heading}; select a row to show its report</caption>
        <colgroup><col className="w-[44%] md:w-[28%]" /><col className="w-[22%] md:w-[14%]" /><col className="hidden md:table-column md:w-[20%]" /><col className="w-[34%] md:w-[18%]" /><col className="hidden md:table-column md:w-[20%]" /></colgroup>
        <thead><tr>
          <th scope="col" className="text-left">Model</th>
          <th scope="col" className="text-left"><span className="whitespace-nowrap">Signal <InfoTip title="Benchmaxxing signal" label="the Signal column">
            {/* F-118 (Fable pass 22): four short lines, not one 170-word paragraph; the method lives behind the link. */}
            <span className="block">Signed gap, in percentile points, between a model&apos;s rank on public headline benchmarks and on held-out ones of the same topic; plus = better on the famous tests, pulled toward zero with few boards. A model is scored once it has at least {minComparisons} comparisons in {minTopics} topics.</span>
            <span className="mt-1.5 block">Tags follow the score alone ({benchmaxxingThresholdText()}), as on the Overview.</span>
            <span className="mt-1.5 block">{BENCHMAXX_UNCERTAIN_MARK} = fewer than {BENCHMAXX_TAG_MIN_COMPARISONS} comparisons, or an 80 % interval reaching below zero: treat the tag as uncertain.</span>
            <span className="mt-1.5 block" data-signal-max>Bars: one catalog-wide scale in every list ({domain.min.toFixed(1)} to +{domain.max.toFixed(1)}), diverging around zero.</span>
            <a href="/about#benchmaxxing" className="mt-1.5 block text-accent underline">How the signal works</a></InfoTip></span></th>
          <th scope="col" className="hidden text-left md:table-cell">Boards compared (n)</th>
          <th scope="col" className="text-left">Measured</th>
          <th scope="col" className="hidden text-left md:table-cell">Domain specialization <InfoTip title="Domain specialization" label="the Domain specialization column">Disclosed for context and deliberately not added to the Benchmaxxing signal. Consistently strong coding and weak writing is specialisation, not a headline-over-held-out gap.</InfoTip></th>
        </tr></thead>
        <tbody><Rows rows={visible} domain={domain} selected={selected} onSelect={onSelect} expanded={expanded} onExpand={toggleExpanded} onOpenReport={onOpenReport} /></tbody>
      </table>
    </div>
    {!listed.length ? <p className="bh-empty mt-4">No scored model in this preset.</p> : null}
    {listed.length > limit ? <button type="button" className="bh-button mt-4" onClick={() => onShowAll(!showAll)} aria-expanded={showAll}>{showAll ? `Show first ${limit}` : `Show all ${listed.length} in this list`}</button> : null}
  </section>;
}
