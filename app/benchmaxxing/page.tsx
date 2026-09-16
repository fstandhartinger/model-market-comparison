import type { Metadata } from 'next';
import { getBenchmarkView } from '../../lib/benchmark-data';
import { BENCHMAXX_MIN_COMPARISONS, BENCHMAXX_MIN_TOPICS, BENCHMAXX_TAG_SHARE, BENCHMAXX_WEAK_SHARE, benchmaxxingPrior } from '../../lib/benchmax.mjs';
import { BenchmaxxingWorkbenchLoader } from '../../components/deferred/BenchmaxxingWorkbenchLoader';
import { pageDataVersion } from '../../lib/page-data';
import { AaCredit } from '../../components/AaCredit';
import { previewMetadata } from '../../lib/seo';

export const metadata: Metadata = previewMetadata({ path: '/benchmaxxing', documentTitle: 'Benchmaxxing — benchmark consistency signal', title: 'Benchmaxxing — Benchmark Heaven',
  description: 'A coverage-aware, topic-local benchmark consistency signal. It is not evidence of training-data leakage.' });

export default async function BenchmaxxingPage() {
  const view = await getBenchmarkView();
  const prior = benchmaxxingPrior(view);
  return <>
    <header className="bh-page-head"><h1 className="text-3xl font-bold tracking-tight">Benchmaxxing</h1><p className="bh-muted mt-3 max-w-3xl">Which models are uneven inside a topic — strong on one coding benchmark, weak on the next? One row per model: reasoning variants share weights and training, so each model is shown through its best-covered variant and gets one verdict. <AaCredit /></p></header>
    {/* CR-62.1: rows, models and the opening report are built in lib/page-data.ts and fetched after this shell. */}
    <BenchmaxxingWorkbenchLoader version={await pageDataVersion()} minComparisons={BENCHMAXX_MIN_COMPARISONS} minTopics={BENCHMAXX_MIN_TOPICS} />
    <details id="method" className="bh-panel mt-6 scroll-mt-6 p-5"><summary className="cursor-pointer text-sm font-semibold">Advanced method, uncertainty and limitations</summary><div className="bh-muted mt-4 max-w-4xl space-y-3 text-sm"><p>Each exact benchmark cohort is percentile-normalized from measured results only. Missing scores remain gaps: they are not zeros and are not imputed.</p><p>Axes are grouped by the registry’s semantic topic. Within each topic we take the mean absolute percentile difference over all pairs of measured benchmarks, so the result does not depend on the order in which axes are drawn. Topics are combined weighted by their number of independent comparisons (measured benchmarks in the topic minus one). Cross-topic variation is disclosed as domain specialization but is not added to the score: being consistently strong in coding and weak in writing is specialization, not Benchmaxxing.</p><p>Coverage rule: a model is scored only with at least {BENCHMAXX_MIN_COMPARISONS} related comparisons spread over at least {BENCHMAXX_MIN_TOPICS} topics. Because a score built from few comparisons is noisier, every score is shrunk toward the catalog mean{prior.mean != null ? ` (${prior.mean.toFixed(1)})` : ''} by n / (n + k), where n is the model’s comparisons and k = {prior.shrink.toFixed(1)} is estimated from how much score variance falls as coverage grows (never below 2). This keeps sparse profiles from dominating the tag.</p><p>Tag levels on the Overview table: the top {Math.round(BENCHMAXX_TAG_SHARE * 100)} % of scored models carry the strong (solid) Benchmaxxing tag, the next {Math.round((BENCHMAXX_WEAK_SHARE - BENCHMAXX_TAG_SHARE) * 100)} % the weak (pale) one. Both are ranks within today&apos;s catalog, not fixed score cut-offs, and each tag opens that model&apos;s radar here.</p><p>Known limitation: percentiles are bounded, so a model at the very top of most benchmarks has less room to vary than a mid-field model.</p><p>This analysis cannot establish leakage, contamination, or intent. It is a descriptive screening signal that should prompt users to inspect sources, benchmark design and per-axis evidence.</p></div></details>
  </>;
}
