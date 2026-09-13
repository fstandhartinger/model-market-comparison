import type { Metadata } from 'next';
import { getBenchmarkView } from '../../lib/benchmark-data';
import { BENCHMAXX_MIN_COMPARISONS, BENCHMAXX_MIN_TOPICS, benchmaxxingPrior, benchmaxxingSignals, scoreBenchmaxxing } from '../../lib/benchmax.mjs';
import { BenchmaxxingReport } from '../../components/BenchmaxxingReport';

export const metadata: Metadata = {
  title: 'Benchmaxxing — benchmark consistency signal',
  description: 'A coverage-aware, topic-local benchmark consistency signal. It is not evidence of training-data leakage.',
};

export default async function BenchmaxxingPage() {
  const view = await getBenchmarkView();
  const models = view.models.map((m) => ({ id: m.id, name: m.name, org: m.org })).sort((a, b) => a.name.localeCompare(b.name));
  const byId = new Map(models.map((m) => [m.id, m]));
  const { reports, tagged } = benchmaxxingSignals(view);
  const scored = reports.map(([id, report]) => ({ model: byId.get(id)!, report }));
  const prior = benchmaxxingPrior(view);
  const initial = models.length ? scoreBenchmaxxing(view, models[0].id) : null;
  return <>
    <header className="bh-page-head"><p className="bh-eyebrow">ADVANCED · BENCHMAXXING</p><h1>Does a model look consistent within a topic?</h1><p className="bh-muted mt-3 max-w-3xl">One primary score per model: how far apart its results sit on related benchmarks. A model that is uneven inside Coding, Math, or Writing is more notable than a smooth model that simply specializes by domain.</p></header>
    <section className="bh-panel p-5"><div className="grid gap-5 md:grid-cols-[1fr_auto]"><div><p className="bh-eyebrow">OVERVIEW</p><h2 className="text-xl font-semibold">Models with the strongest inconsistency signal</h2><p className="bh-muted mt-2 max-w-3xl text-sm">The tag marks the highest-scoring tenth of models that have enough related results to judge ({tagged.size} of {scored.length}). It is an anomaly flag—not proof of leakage, contamination, or intentional benchmark targeting.</p></div><div className="rounded-lg border border-line px-4 py-3 text-sm"><b>{scored.length}</b> coverage-qualified models<br/><span className="bh-muted">{view.axes.length} benchmark axes</span></div></div>
      <div className="bh-table-wrap mt-5"><table className="bh-table w-full text-sm"><thead><tr><th>Model</th><th>Primary score</th><th>Related comparisons</th><th>Measured coverage</th><th>Domain specialization</th></tr></thead><tbody>{scored.slice(0, 25).map(({ model, report }) => <tr key={model.id}><th scope="row" className="text-left font-medium">{model.name} {tagged.has(model.id) && <span className="bh-badge bh-alert ml-2">Benchmaxxing signal</span>}<p className="bh-muted mt-1 text-xs font-normal">{model.org}</p></th><td className="tabular font-semibold">{report.score?.toFixed(1)}</td><td className="tabular">{report.comparisons} in {report.topics} topics</td><td className="tabular">{report.profile.measured}/{report.profile.total} ({(report.coverage * 100).toFixed(0)}%)</td><td className="tabular">{report.domainSpecialization?.toFixed(1)} <span className="bh-muted text-xs">not scored</span></td></tr>)}</tbody></table></div>
    </section>
    <BenchmaxxingReport models={models} initial={initial} />
    <details id="method" className="bh-panel mt-6 scroll-mt-6 p-5"><summary className="cursor-pointer text-sm font-semibold">Advanced method, uncertainty and limitations</summary><div className="bh-muted mt-4 max-w-4xl space-y-3 text-sm"><p>Each exact benchmark cohort is percentile-normalized from measured results only. Missing scores remain gaps: they are not zeros and are not imputed.</p><p>Axes are grouped by the registry’s semantic topic. Within each topic we take the mean absolute percentile difference over all pairs of measured benchmarks, so the result does not depend on the order in which axes are drawn. Topics are combined weighted by their number of independent comparisons (measured benchmarks in the topic minus one). Cross-topic variation is disclosed as domain specialization but is not added to the score: being consistently strong in coding and weak in writing is specialization, not Benchmaxxing.</p><p>Coverage rule: a model is scored only with at least {BENCHMAXX_MIN_COMPARISONS} related comparisons spread over at least {BENCHMAXX_MIN_TOPICS} topics. Because a score built from few comparisons is noisier, every score is shrunk toward the catalog mean{prior.mean != null ? ` (${prior.mean.toFixed(1)})` : ''} by n / (n + k), where n is the model’s comparisons and k = {prior.shrink.toFixed(1)} is estimated from how much score variance falls as coverage grows (never below 2). This keeps sparse profiles from dominating the tag.</p><p>Known limitation: percentiles are bounded, so a model at the very top of most benchmarks has less room to vary than a mid-field model.</p><p>This analysis cannot establish leakage, contamination, or intent. It is a descriptive screening signal that should prompt users to inspect sources, benchmark design and per-axis evidence.</p></div></details>
  </>;
}
