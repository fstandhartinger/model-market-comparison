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

function Rows({ rows }: { rows: BenchmaxxingOverviewRow[] }) {
  return <>
    {rows.map((row) => <tr key={row.id}>
      <th scope="row" className="text-left align-top font-medium">
        <span className="block">{row.name}</span>
        <span className="bh-muted mt-1 block text-xs font-normal">{row.org}</span>
        <span className="bh-badge bh-alert mt-2 inline-flex">Benchmaxxing signal</span>
      </th>
      <td className="tabular align-top font-semibold">{row.score.toFixed(1)}</td>
      <td className="tabular align-top">{row.comparisons} in {row.topics} topics</td>
      <td className="tabular align-top">{row.measured}/{row.total} ({((row.measured / Math.max(1, row.total)) * 100).toFixed(0)}%)</td>
      <td className="tabular align-top">{row.domainSpecialization == null ? "—" : row.domainSpecialization.toFixed(1)}</td>
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
  return <section className="bh-panel p-5" aria-label="Benchmaxxing overview">
    <div className="grid gap-5 md:grid-cols-[1fr_auto]">
      <div>
        <h2 className="text-xl font-semibold">The strongest unevenness signals</h2>
        <p className="bh-muted mt-2 max-w-3xl text-sm">A signal highlights models whose results jump between related benchmarks. It is a screening flag—not proof of leakage, contamination, or intent.</p>
      </div>
      <div className="rounded-lg border border-line px-4 py-3 text-sm"><b>{taggedCount}</b> tagged models<br /><span className="bh-muted">{rows.length} with the strongest signals</span></div>
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
          <th scope="col" className="hidden text-left md:table-cell">Domain specialisation <InfoTip title="Domain specialisation" label="the Domain specialisation column">Disclosed for context and deliberately not added to the Benchmaxxing signal. Consistently strong coding and weak writing is specialisation, not unevenness within a topic.</InfoTip></th>
        </tr></thead>
        <tbody><Rows rows={visible} /></tbody>
      </table>
    </div>
    {rows.length > 10 ? <button type="button" className="bh-button mt-4" onClick={() => setShowAll((value) => !value)} aria-expanded={showAll}>{showAll ? "Show strongest 10" : `Show all ${taggedCount} tagged`}</button> : null}
    <p className="bh-muted mt-3 text-xs">Scores require at least {minComparisons} related comparisons across {minTopics} topics. Models below that coverage floor stay undisclosed rather than receiving a made-up score.</p>
  </section>;
}
