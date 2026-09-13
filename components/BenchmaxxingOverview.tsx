"use client";

import { useState } from "react";
import { InfoTip } from "./InfoTip";

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
};

// F-24: every row here is tagged and the heading says so, so rows carry no per-row badge.
// The Signal gets the same 4 px magnitude bar as the overview, in the Benchmaxxing orange.
function Rows({ rows, maxScore }: { rows: BenchmaxxingOverviewRow[]; maxScore: number }) {
  return <>
    {rows.map((row) => <tr key={row.id}>
      <th scope="row" className="!py-2 text-left align-middle font-medium">
        <span className="block truncate leading-5">{row.name}</span>
        <span className="bh-muted block text-[11px] font-normal leading-4">{row.org}</span>
      </th>
      <td className="!py-2 align-middle">
        <div className="bh-magnitude-bar bh-magnitude-warn !text-left">
          <div className="bh-magnitude-track" aria-hidden="true">
            <div className="bh-magnitude-fill" style={{ width: `${Math.max(0, Math.min(1, row.score / maxScore)) * 100}%` }} />
          </div>
          <span className="relative z-[1] block font-semibold tabular">{row.score.toFixed(1)}</span>
        </div>
      </td>
      <td className="hidden !py-2 align-middle tabular md:table-cell">{row.comparisons} in {row.topics} topics</td>
      <td className="!py-2 align-middle tabular">{row.measured}/{row.total}<span className="hidden sm:inline"> ({((row.measured / Math.max(1, row.total)) * 100).toFixed(0)}%)</span></td>
      <td className="hidden !py-2 align-middle tabular md:table-cell">{row.domainSpecialization == null ? "—" : row.domainSpecialization.toFixed(1)}</td>
    </tr>)}
  </>;
}

export function BenchmaxxingOverview({ rows, taggedCount, minComparisons, minTopics }: {
  rows: BenchmaxxingOverviewRow[];
  taggedCount: number;
  minComparisons: number;
  minTopics: number;
}) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? rows : rows.slice(0, 10);
  const maxScore = Math.max(1e-9, ...rows.map((row) => row.score));
  return <section className="bh-panel p-5" aria-label="Benchmaxxing overview">
    <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-start">
      <div>
        <h2 className="text-xl font-semibold">The strongest unevenness signals</h2>
        <p className="bh-muted mt-2 max-w-3xl text-sm">A signal highlights models whose results jump between related benchmarks. It is a screening flag—not proof of leakage, contamination, or intent.</p>
      </div>
      <div className="rounded-lg border border-line px-4 !py-2 text-sm"><b>{taggedCount}</b> tagged models <span className="bh-muted">· coverage floor: {minComparisons} comparisons in {minTopics} topics</span></div>
    </div>
    <div className="bh-table-wrap mt-5">
      <table className="bh-table w-full table-fixed text-sm">
        <caption className="sr-only">Benchmaxxing signals, ordered strongest first</caption>
        <colgroup><col className="w-[44%] md:w-[28%]" /><col className="w-[22%] md:w-[14%]" /><col className="hidden md:table-column md:w-[20%]" /><col className="w-[34%] md:w-[18%]" /><col className="hidden md:table-column md:w-[20%]" /></colgroup>
        <thead><tr>
          <th scope="col" className="text-left">Model</th>
          <th scope="col" className="text-left">Signal</th>
          <th scope="col" className="hidden text-left md:table-cell">Related comparisons</th>
          <th scope="col" className="text-left">Measured</th>
          <th scope="col" className="hidden text-left md:table-cell">Domain specialization <InfoTip title="Domain specialization" label="the Domain specialization column">Disclosed for context and deliberately not added to the Benchmaxxing signal. Consistently strong coding and weak writing is specialisation, not unevenness within a topic.</InfoTip></th>
        </tr></thead>
        <tbody><Rows rows={visible} maxScore={maxScore} /></tbody>
      </table>
    </div>
    {rows.length > 10 ? <button type="button" className="bh-button mt-4" onClick={() => setShowAll((value) => !value)} aria-expanded={showAll}>{showAll ? "Show strongest 10" : `Show all ${taggedCount} tagged`}</button> : null}
  </section>;
}
