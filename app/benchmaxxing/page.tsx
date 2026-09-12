import type { Metadata } from 'next';
import { getBenchmarkView } from '../../lib/benchmark-data';
import { scoreBenchmaxxing } from '../../lib/benchmax.mjs';
import { BenchmaxxingReport } from '../../components/BenchmaxxingReport';

export const metadata: Metadata = {
  title: 'Benchmaxxing — benchmark consistency signal',
  description: 'A coverage-aware, topic-local benchmark consistency signal. It is not evidence of training-data leakage.',
};

export default async function BenchmaxxingPage() {
  const view = await getBenchmarkView();
  const models = view.models.map((m) => ({ id: m.id, name: m.name, org: m.org })).sort((a, b) => a.name.localeCompare(b.name));
  const scored = models.map((model) => ({ model, report: scoreBenchmaxxing(view, model.id) }))
    .filter((entry) => entry.report.status === 'scored')
    .sort((a, b) => (b.report.score ?? -1) - (a.report.score ?? -1) || a.model.id.localeCompare(b.model.id));
  const worst = new Set(scored.slice(0, Math.max(1, Math.ceil(scored.length * .1))).map((entry) => entry.model.id));
  const initial = models.length ? scoreBenchmaxxing(view, models[0].id) : null;
  return <>
    <header className="bh-page-head"><p className="bh-eyebrow">ADVANCED · BENCHMAXXING</p><h1>Does a model look consistent within a topic?</h1><p className="bh-muted mt-3 max-w-3xl">One primary score per model: the average jump between adjacent, related benchmark axes. A jagged line inside Coding, Math, or Writing is more notable than a smooth model that simply specializes by domain.</p></header>
    <section className="bh-panel p-5"><div className="grid gap-5 md:grid-cols-[1fr_auto]"><div><p className="bh-eyebrow">OVERVIEW</p><h2 className="text-xl font-semibold">Models with the strongest inconsistency signal</h2><p className="bh-muted mt-2 max-w-3xl text-sm">The tag identifies the highest-scoring tenth of models that meet the coverage rule. It is an anomaly flag—not proof of leakage, contamination, or intentional benchmark targeting.</p></div><div className="rounded-lg border border-line px-4 py-3 text-sm"><b>{scored.length}</b> coverage-qualified models<br/><span className="bh-muted">{view.axes.length} benchmark axes</span></div></div>
      <div className="bh-table-wrap mt-5"><table className="bh-table w-full text-sm"><thead><tr><th>Model</th><th>Primary score</th><th>Measured coverage</th><th>Topic-local interpretation</th></tr></thead><tbody>{scored.slice(0, 25).map(({ model, report }) => <tr key={model.id}><th scope="row" className="text-left font-medium">{model.name} {worst.has(model.id) && <span className="bh-badge bh-alert ml-2">Benchmaxxing signal</span>}<p className="bh-muted mt-1 text-xs font-normal">{model.org}</p></th><td className="tabular font-semibold">{report.score?.toFixed(1)}</td><td className="tabular">{report.profile.measured}/{report.profile.total} ({(report.coverage * 100).toFixed(0)}%)</td><td>Within-topic jump average; domain specialization {report.domainSpecialization?.toFixed(1)} is separate.</td></tr>)}</tbody></table></div>
    </section>
    <BenchmaxxingReport models={models} initial={initial} />
    <details id="method" className="bh-panel mt-6 scroll-mt-6 p-5"><summary className="cursor-pointer text-sm font-semibold">Advanced method, uncertainty and limitations</summary><div className="bh-muted mt-4 max-w-4xl space-y-3 text-sm"><p>Each exact benchmark cohort is percentile-normalized from measured results only. Missing scores remain gaps: they are not zeros and are not imputed. A model needs at least four measured axes to receive a score; its exact coverage is always displayed alongside it, so sparse profiles remain visibly uncertain.</p><p>Axes are deterministically grouped clockwise by the registry’s semantic topic category. Only consecutive measured axes in the same topic contribute to the primary score. Cross-topic variation is disclosed as domain specialization but is not added to the score.</p><p>This analysis cannot establish leakage, contamination, or intent. It is a descriptive screening signal that should prompt users to inspect sources, benchmark design and per-axis evidence.</p></div></details>
  </>;
}
