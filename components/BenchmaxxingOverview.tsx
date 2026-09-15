"use client";

import { InfoTip } from "./InfoTip";
import { SIGNAL_WARN, SignalValue } from "./SignalValue";

export type BenchmaxxingOverviewRow = {
  id: string;
  name: string;
  org: string;
  score: number;
  comparisons: number;
  topics: number;
  measured: number;
  total: number;
  domainSpecialization: number | null;
  composite: number | null;
  featured: boolean;
  tagged: boolean;
};

/** CR-15.2: the table's model list is a named, changeable preset. Featured (current top models by
 *  Composite) is the default; the strongest signals and every scored model stay one click away. */
export type BenchmaxxingPreset = "featured" | "signals" | "all";
export const BENCHMAXXING_PRESETS: { key: BenchmaxxingPreset; label: string; heading: string }[] = [
  { key: "featured", label: "Featured models", heading: "Today’s featured models" },
  { key: "signals", label: "Strongest signals", heading: "The strongest unevenness signals" },
  { key: "all", label: "All scored", heading: "Every scored model" },
];
export function presetRows(rows: BenchmaxxingOverviewRow[], preset: BenchmaxxingPreset): BenchmaxxingOverviewRow[] {
  const bySignal = (a: BenchmaxxingOverviewRow, b: BenchmaxxingOverviewRow) => b.score - a.score || b.comparisons - a.comparisons || a.name.localeCompare(b.name);
  if (preset === "featured") return rows.filter((r) => r.featured).sort((a, b) => (b.composite ?? -Infinity) - (a.composite ?? -Infinity) || a.name.localeCompare(b.name));
  if (preset === "signals") return rows.filter((r) => r.tagged).sort(bySignal);
  return [...rows].sort(bySignal);
}

// F-24: the Signal keeps its 4 px magnitude bar in the Benchmaxxing orange; CR-15.3 turns values above
// the warning threshold into a pill. CR-15.4: a row is the master — selecting it drives the report below.
function Rows({ rows, maxScore, selected, onSelect }: { rows: BenchmaxxingOverviewRow[]; maxScore: number; selected: string[]; onSelect: (id: string) => void }) {
  return <>
    {rows.map((row) => {
      const slot = selected.indexOf(row.id);
      return <tr key={row.id} className={`cursor-pointer ${slot >= 0 ? "bg-accent/10" : "hover:bg-accent/5"}`} onClick={() => onSelect(row.id)}>
        <th scope="row" className="!py-2 text-left align-middle font-medium">
          <button type="button" className="block w-full text-left" aria-pressed={slot >= 0} onClick={(e) => { e.stopPropagation(); onSelect(row.id); }}>
            {/* F-67: phones wrap the name (two Qwen rows differed only in the truncated part); md:truncate keeps the desktop single line. */}
            <span className="block leading-5 md:truncate">{slot >= 0 && <span className="mr-1 text-[10px] font-bold text-accent">{String.fromCharCode(65 + slot)}</span>}{row.name}</span>
            <span className="bh-muted block text-[11px] font-normal leading-4">{row.org}</span>
          </button>
        </th>
        <td className="!py-2 align-middle">
          {row.score > SIGNAL_WARN ? <SignalValue score={row.score} /> : <div className="bh-magnitude-bar bh-magnitude-warn !text-left">
            <div className="bh-magnitude-track" aria-hidden="true">
              <div className="bh-magnitude-fill" style={{ width: `${Math.max(0, Math.min(1, row.score / maxScore)) * 100}%` }} />
            </div>
            <span className="relative z-[1] block"><SignalValue score={row.score} /></span>
          </div>}
        </td>
        <td className="hidden !py-2 align-middle tabular md:table-cell">{row.comparisons} in {row.topics} topics</td>
        <td className="!py-2 align-middle tabular">{row.measured}/{row.total}<span className="hidden sm:inline"> ({((row.measured / Math.max(1, row.total)) * 100).toFixed(0)}%)</span></td>
        <td className="hidden !py-2 align-middle tabular md:table-cell">{row.domainSpecialization == null ? "—" : row.domainSpecialization.toFixed(1)}</td>
      </tr>;
    })}
  </>;
}

export function BenchmaxxingOverview({ rows, preset, onPreset, selected, onSelect, showAll, onShowAll, taggedCount, minComparisons, minTopics }: {
  rows: BenchmaxxingOverviewRow[];
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
  const visible = showAll ? listed : listed.slice(0, 10);
  const maxScore = Math.max(1e-9, ...rows.map((row) => row.score));
  const heading = BENCHMAXXING_PRESETS.find((p) => p.key === preset)!.heading;
  return <section className="bh-panel p-5" aria-label="Benchmaxxing overview">
    <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-start">
      <div>
        <h2 className="text-xl font-semibold">{heading}</h2>
        <p className="bh-muted mt-2 max-w-3xl text-sm">A signal highlights models whose results jump between related benchmarks. It is a screening flag—not proof of leakage, contamination, or intent. Select a row to open its report below.</p>
      </div>
      <div className="rounded-lg border border-line px-4 !py-2 text-sm"><b>{taggedCount}</b> tagged models <span className="bh-muted">· coverage floor: {minComparisons} comparisons in {minTopics} topics</span></div>
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
          <th scope="col" className="text-left">Signal <InfoTip title="Benchmaxxing signal" label="the Signal column">Within-topic percentile spread, adjusted for coverage, 0–100. Above {SIGNAL_WARN} it is shown as a warning: results jump strongly between related benchmarks. That is where today&apos;s tag starts (the top 10 % of scored models). It is a screening flag, not proof of leakage or intent.</InfoTip></th>
          <th scope="col" className="hidden text-left md:table-cell">Related comparisons</th>
          <th scope="col" className="text-left">Measured</th>
          <th scope="col" className="hidden text-left md:table-cell">Domain specialization <InfoTip title="Domain specialization" label="the Domain specialization column">Disclosed for context and deliberately not added to the Benchmaxxing signal. Consistently strong coding and weak writing is specialisation, not unevenness within a topic.</InfoTip></th>
        </tr></thead>
        <tbody><Rows rows={visible} maxScore={maxScore} selected={selected} onSelect={onSelect} /></tbody>
      </table>
    </div>
    {!listed.length ? <p className="bh-empty mt-4">No scored model in this preset.</p> : null}
    {listed.length > 10 ? <button type="button" className="bh-button mt-4" onClick={() => onShowAll(!showAll)} aria-expanded={showAll}>{showAll ? "Show first 10" : `Show all ${listed.length}`}</button> : null}
  </section>;
}
