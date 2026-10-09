import type { ReactNode } from 'react';
import { readDecisionBenchmarkManifest } from '../lib/decision-benchmark-manifest.mjs';

export function DecisionGuide({ title, intro, children, date = '2026-10-09' }: { title: string; intro: string; children: ReactNode; date?: string }) {
  return <article className="mx-auto max-w-4xl space-y-6 pb-10">
    <header className="bh-page-head"><p className="bh-eyebrow">JevBench by Benchmark Heaven · Decision model evaluation</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-4 text-lg leading-relaxed">{intro}</p>
      <p className="bh-muted mt-3 text-sm">Reviewed <time dateTime={date}>{date}</time> · Maintained by Benchmark Heaven, independently of TypeSafe AI.</p>
    </header>
    {children}
    <nav className="bh-panel flex flex-wrap gap-4 p-4 text-sm" aria-label="Decision model benchmark resources">
      {[['/jev-models', 'Open-weights leaderboard'], ['/jev-models/api', 'API leaderboard'], ['/image-jev-bench', 'ImageJevBench'], ['/jev-models/methodology', 'Methodology'], ['/jev-models/data', 'Data card & downloads'], ['/decision-model-benchmarks', 'Compare benchmarks'], ['/jev-models/calibration-reliability', 'Calibration & reliability'], ['/jev-models/alternatives', 'Jev alternatives']].map(([href, label]) => <a key={href} className="text-accent underline" href={href}>{label}</a>)}
    </nav>
  </article>;
}

export async function DecisionMethodology({ version = null }: { version?: string | null } = {}) {
  const m = await readDecisionBenchmarkManifest(process.cwd(), version);
  const s = m.scores;
  const apiRows = m.counts.api_input;
  const sameApiSet = apiRows === m.counts.selfhosted_input;
  const weights = Object.entries(s.composite.weights).map(([axis, weight]) => `${axis[0].toUpperCase()}${axis.slice(1)} ${weight}%`).join(', ');
  const amendmentNote = m.amendments.length
    ? `Published addenda ${m.amendments.map((a: { label: string; date: string }) => `${a.label} (${a.date})`).join(', ')}; amended through ${m.amended_through}; latest row measurement ${m.max_row_last_measured_on}. Cite source_sha256 ${m.source_sha256} for these exact result bytes.`
    : `No post-publication addenda are recorded. Cite source_sha256 ${m.source_sha256} for these result bytes.`;
  return <DecisionGuide title={`Decision model benchmark methodology — JevBench ${m.revision}`} intro="JevBench measures typed decisions: application state and a bounded rubric go in; a structured answer and, where supported, probabilities come out. Compare accuracy and calibration alongside measured latency and modeled cost. The open-weights board leads with Capability; the hosted API board leads with Composite.">
    <section className="space-y-3"><h2 className="text-2xl font-semibold">Release and measurement dates</h2>
      <p>Published release <b>{m.revision}</b>, initially published <time dateTime={m.published_at}>{m.published_at.slice(0,10)}</time>. The <a className="text-accent underline" href={m.version_page}>versioned leaderboard</a> retains its release context. {amendmentNote} {m.current_board_note}</p>
      <p>The release draw contains {m.counts.S.toLocaleString('en-US')} sealed and {m.counts.P.toLocaleString('en-US')} public decisions. Self-hosted systems answer {m.counts.selfhosted_input.toLocaleString('en-US')} decisions. {sameApiSet ? `The ${m.revision} full-set API rows answer the same set.` : `API rows answer ${apiRows.toLocaleString('en-US')} decisions on this release.`} Older subsets and later reruns are explicitly labeled and may be equated. Missing or refused answers are counted by the scorer, rather than silently removed.</p>
    </section>
    <section className="space-y-3"><h2 className="text-2xl font-semibold">Capability and Composite are different scores</h2>
      <p><b>Capability:</b> {s.capability.definition} The cost cap is USD {Number(s.capability.cost_cap_usd_per_1000).toFixed(4)} per 1,000 decisions, and the adjusted median-latency cap is {Number(s.capability.median_latency_cap_s).toFixed(2)} seconds. Eligibility is separate from the raw score.</p>
      <p><b>Composite:</b> {s.composite.definition}</p>
      <p>Official option {m.option} uses weights {weights}; Intelligence floor {s.composite.intelligence_floor}. A zero axis gives zero Composite; a missing axis gives no score.</p>
      <p className="bh-panel break-words p-4 font-mono text-sm">H = Σw / Σ(w / axis). Composite = H × min(1, I / {s.composite.intelligence_floor})² × min(1, Speed / 50)² × min(1, Cost / 50)².</p>
      <p>Intelligence is chance-corrected decision accuracy, with tier weighting and a public/sealed gap adjustment. Calibration evaluates probability distributions; it is not simply accuracy among confident answers. Noul handling, per-type normalization and equating are versioned in the scorer. The four normalized axes are on a 0–100 scale; actual seconds and USD remain separate values.</p>
    </section>
    <section className="space-y-3"><h2 className="text-2xl font-semibold">Reproducibility and model versions</h2>
      <p><a className="text-accent underline" href={m.reproducibility.scorer}>Scorer and public benchmark repository</a> · <a className="text-accent underline" href={m.reproducibility.presentation}>Board source</a> · <a className="text-accent underline" href="/api/jevbench/manifest">Release manifest and scorer hashes</a> · <a className="text-accent underline" href={m.reproducibility.results}>Published aggregate artifact</a>.</p>
      <p>Artifact SHA-256: <code className="break-all">{m.artifact_sha256}</code>. The <a className="text-accent underline" href="/jev-models/data">data card</a> documents model pins, measurement dates, price bases and latency adjustments. Unknown pins and dates remain null; hosted service names do not guarantee immutable weights.</p>
      <p>Sealed questions, identifiers and predictions are not downloadable. Public-split experiments can be reproduced, and aggregate Composite scores can be recalculated from the published axes. Complete independent reruns of the sealed evaluation require the official evaluation process.</p>
    </section>
    <section className="space-y-3"><h2 className="text-2xl font-semibold">Limitations and historical methods</h2>
      <p>Coverage is finite and uneven across languages and domains. Cost is modeled from a stated hardware or list-price basis; latency depends on the measured runtime and location. Confidence, coherence, robustness and real-world error costs need additional workload-specific checks. Training on the public split must be disclosed, and a sealed split is not a guarantee of no prior exposure.</p>
      <p>{m.historical_note} ImageJevBench {m.image.revision} has a separate image pool and frozen eligibility envelope; core and computer-use tracks remain separate. Its reserve size is not the number of decisions answered by each model.</p>
      <p>Another project named <a className="text-accent underline" href="https://jevbench.github.io/">JevBench tests metamorphic coherence</a>. It is independent of Benchmark Heaven and measures consistency rather than this board&apos;s accuracy/cost/latency score.</p>
    </section>
  </DecisionGuide>;
}
