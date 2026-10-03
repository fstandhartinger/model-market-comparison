"use client";
import { Radar, type Spoke, type Series } from "./JevRadars";
import type { CurrentCategoryView } from "../lib/jevbench-categories-v16.mjs";
const raw = (n: number | null) => n === null ? "Unavailable" : n.toFixed(1);
/** Optional current-only profiles. Neither schema validation nor this panel admits an artifact. */
export function JevCategoryProfilesV16({ view, names }: { view: CurrentCategoryView; names: Record<string, string> }) {
  return <section className="mt-8" aria-labelledby="jev16-category-heading" data-bh-jev16-category-profiles>
    <h3 id="jev16-category-heading" className="text-xl font-semibold">Current category diagnostics — {view.revision}</h3>
    <p className="bh-muted mt-1 text-sm">Each system has its own topic and use-case profiles. API and self-hosted raw competence is unequated: these separate plots are not a same-scope comparison or Capability Scores.</p>
    <p className="bh-muted mt-1 text-xs">Failures remain in the denominator. Negative competence stays in labels and tables; only radar coordinates clip to 0–100. Cells below n={view.minN} and empty cells are not plotted.</p>
    <div className="mt-4 grid gap-6 lg:grid-cols-2">{view.systems.map(({ key, measurement }, index) => <article key={key} className="min-w-0" data-bh-jev16-category-system={key}>
      <h4 className="font-semibold">{names[key] ?? key}</h4>
      {!measurement ? <p className="bh-muted mt-2 text-sm" data-bh-jev16-category-missing>Current category measurement unavailable. Historic values are not substituted.</p> : <>
        <p className="bh-muted mt-1 text-sm">{measurement.lane === "api" ? "Hosted API" : "Self-hosted"} · {measurement.cohort} · measured {measurement.measured_on} · unequated</p>
        {(["topics", "usecases"] as const).map((dim) => {
          const descriptors = view[dim]; const cells = measurement[dim];
          const n = descriptors.reduce((sum, d) => sum + cells[d.key].n, 0);
          const publicN = descriptors.reduce((sum, d) => sum + cells[d.key].public, 0);
          const sealedN = descriptors.reduce((sum, d) => sum + cells[d.key].sealed, 0);
          const title = dim === "topics" ? "Topic profile" : "Use-case profile";
          const eligible = descriptors.filter(d => d.key !== "unclassified" && d.n >= view.minN && cells[d.key].n >= view.minN && cells[d.key].competence !== null);
          const spokes: Spoke[] = eligible.map(d => ({ key: d.key, lines: [d.label],
            values: [Math.max(0, Math.min(100, cells[d.key].competence!))], texts: [raw(cells[d.key].competence)], thin: [false],
            tip: `${d.label}: ${d.covers}. ${measurement.cohort}; n=${cells[d.key].n}, public=${cells[d.key].public}, sealed=${cells[d.key].sealed}; measured ${measurement.measured_on}.` }));
          const series: Series[] = [{ name: names[key] ?? key, stroke: index === 0 ? "rgb(var(--jev-t-jev))" : "rgb(var(--jev-t-rebuild))", dashed: false, square: false }];
          return <div key={dim} className="mt-4" data-bh-jev16-category-dimension={dim}>
            <h5 className="font-semibold">{title}</h5><p className="bh-muted text-xs">n={n} · public={publicN} · sealed={sealedN} · {measurement.measured_on} · {measurement.cohort}</p>
            {spokes.length >= 5 ? <figure data-bh-jev16-category-radar-system={key}>
              <Radar spokes={spokes} series={series} size={{ w: 600, h: 430, r: 120 }} id={`jev16-category-${key}-${dim}`} title={`${names[key] ?? key}: ${title}`} desc={`One system only, own ${measurement.cohort} cohort, measured ${measurement.measured_on}; raw competence is unequated. Only coordinates clip; empty and low-count cells are excluded.`} />
            </figure> : <p className="bh-muted mt-2 text-sm" data-bh-jev16-category-insufficient>Fewer than five supported categories: radar unavailable. Own counts and values remain below.</p>}
            <div className="mt-2 overflow-x-auto"><table className="w-full text-left text-sm">
              <caption className="sr-only">{names[key] ?? key}: all {dim}, own {measurement.cohort} cohort, {measurement.measured_on}</caption>
              <thead><tr><th scope="col">Category</th><th scope="col">Raw competence</th><th scope="col">Counts / failures</th></tr></thead>
              <tbody>{descriptors.map(d => { const c = cells[d.key]; return <tr key={d.key} className="border-t border-line">
                <th scope="row" className="py-2 pr-2 font-normal">{d.label}<span className="bh-muted block text-xs">{d.covers}</span></th>
                <td className="tabular align-top py-2 pr-2">{raw(c.competence)}<span className="bh-muted block text-xs">{c.n === 0 ? c.unavailable : c.low_n ? `Low n (below ${view.minN}); not plotted` : d.key === "unclassified" ? "Unclassified; not plotted" : ""}</span></td>
                <td className="tabular align-top py-2">n={c.n} · public={c.public} · sealed={c.sealed}<span className="bh-muted block text-xs">{c.failed === undefined ? "Failure count unavailable" : `${c.failed} failed decisions counted wrong`}</span></td>
              </tr>; })}</tbody>
            </table></div>
          </div>;
        })}
      </>}
    </article>)}</div>
    <details className="mt-3 text-xs"><summary className="cursor-pointer text-accent">Current category method and provenance</summary>
      <p className="bh-muted mt-1">{view.metric}</p><ul className="bh-muted mt-1 list-disc pl-5">{view.rules.map(rule => <li key={rule}>{rule}</li>)}</ul>
      {Object.entries(view.provenance).map(([pin, hash]) => <p key={pin} className="bh-muted mt-1 break-all">{pin}: {hash}</p>)}
    </details>
  </section>;
}
