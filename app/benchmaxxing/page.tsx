import type { Metadata } from 'next';
import { getDataset } from '../../lib/data';
import { clientData } from '../../lib/client-model';
import { getBenchmarkView } from '../../lib/benchmark-data';
import { BENCHMAXX_MIN_COMPARISONS, BENCHMAXX_MIN_TOPICS, benchmaxxingFamilySignals, benchmaxxingPrior, scoreBenchmaxxing } from '../../lib/benchmax.mjs';
import { BenchmaxxingWorkbench } from '../../components/BenchmaxxingWorkbench';
import { presetRows, type BenchmaxxingOverviewRow } from '../../lib/benchmaxxing-presets';
import { AaCredit } from '../../components/AaCredit';

export const metadata: Metadata = {
  title: 'Benchmaxxing — benchmark consistency signal',
  description: 'A coverage-aware, topic-local benchmark consistency signal. It is not evidence of training-data leakage.',
};

export default async function BenchmaxxingPage() {
  const ds = await getDataset();
  const view = await getBenchmarkView();
  const compositeById = new Map(clientData(ds).models.map((m) => [m.id, m.scores.composite]));
  // CR-21.1: one row per model family (its most-covered scored variant); the tag is the family's verdict.
  const { reports, tagged, taggedFamilies } = benchmaxxingFamilySignals(view);
  const reportsById = new Map(view.models.map((m) => [m.id, scoreBenchmaxxing(view, m.id)]));
  const models = view.models.map((m) => {
    const report = reportsById.get(m.id)!;
    return { id: m.id, name: m.name, org: m.org, composite: compositeById.get(m.id) ?? null,
      coverageAxes: report.profile.measured, totalAxes: report.profile.total, tagged: tagged.has(m.id) };
  }).sort((a, b) => b.coverageAxes - a.coverageAxes || (b.composite ?? -Infinity) - (a.composite ?? -Infinity) || a.name.localeCompare(b.name));
  const byId = new Map(models.map((m) => [m.id, m]));
  const scored = reports.map(([id, report]) => ({ model: byId.get(id), report })).filter((item): item is { model: (typeof models)[number]; report: ReturnType<typeof scoreBenchmaxxing> } => Boolean(item.model && item.report.status === 'scored'));
  // CR-15.2: every scored model family reaches the client; the table's preset (Featured by default) chooses the list.
  // A family counts as featured when any of its variants is featured.
  const featuredFamilies = new Set(ds.models.filter((m) => m.featured).map((m) => m.family_key));
  const overviewRows: BenchmaxxingOverviewRow[] = scored.map(({ model, report }) => ({
    id: model.id, name: model.name, org: model.org, score: report.score!, comparisons: report.comparisons, topics: report.topics,
    measured: report.profile.measured, total: report.profile.total, domainSpecialization: report.domainSpecialization,
    composite: model.composite, featured: featuredFamilies.has(view.models.find((m) => m.id === model.id)?.family ?? ''), tagged: tagged.has(model.id),
  }));
  const prior = benchmaxxingPrior(view);
  // The report opens on the first row of the default Featured preset (the top current model by Composite).
  const defaultModel = presetRows(overviewRows, 'featured')[0] ?? [...models].filter((m) => m.coverageAxes >= 40).sort((a, b) => (b.composite ?? -Infinity) - (a.composite ?? -Infinity) || a.name.localeCompare(b.name))[0] ?? models[0];
  const initial = defaultModel ? { id: defaultModel.id, report: scoreBenchmaxxing(view, defaultModel.id) } : null;
  return <>
    <header className="bh-page-head"><h1 className="text-3xl font-bold tracking-tight">Benchmaxxing</h1><p className="bh-muted mt-3 max-w-3xl">Which models are uneven inside a topic — strong on one coding benchmark, weak on the next? One row per model: reasoning variants share weights and training, so each model is shown through its best-covered variant and gets one verdict. <AaCredit /></p></header>
    <BenchmaxxingWorkbench rows={overviewRows} models={models} initial={initial} taggedCount={taggedFamilies.size} minComparisons={BENCHMAXX_MIN_COMPARISONS} minTopics={BENCHMAXX_MIN_TOPICS} />
    <details id="method" className="bh-panel mt-6 scroll-mt-6 p-5"><summary className="cursor-pointer text-sm font-semibold">Advanced method, uncertainty and limitations</summary><div className="bh-muted mt-4 max-w-4xl space-y-3 text-sm"><p>Each exact benchmark cohort is percentile-normalized from measured results only. Missing scores remain gaps: they are not zeros and are not imputed.</p><p>Axes are grouped by the registry’s semantic topic. Within each topic we take the mean absolute percentile difference over all pairs of measured benchmarks, so the result does not depend on the order in which axes are drawn. Topics are combined weighted by their number of independent comparisons (measured benchmarks in the topic minus one). Cross-topic variation is disclosed as domain specialization but is not added to the score: being consistently strong in coding and weak in writing is specialization, not Benchmaxxing.</p><p>Coverage rule: a model is scored only with at least {BENCHMAXX_MIN_COMPARISONS} related comparisons spread over at least {BENCHMAXX_MIN_TOPICS} topics. Because a score built from few comparisons is noisier, every score is shrunk toward the catalog mean{prior.mean != null ? ` (${prior.mean.toFixed(1)})` : ''} by n / (n + k), where n is the model’s comparisons and k = {prior.shrink.toFixed(1)} is estimated from how much score variance falls as coverage grows (never below 2). This keeps sparse profiles from dominating the tag.</p><p>Known limitation: percentiles are bounded, so a model at the very top of most benchmarks has less room to vary than a mid-field model.</p><p>This analysis cannot establish leakage, contamination, or intent. It is a descriptive screening signal that should prompt users to inspect sources, benchmark design and per-axis evidence.</p></div></details>
  </>;
}
