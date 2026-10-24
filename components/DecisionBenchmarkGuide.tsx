import type { ReactNode } from 'react';
import { readDecisionBenchmarkManifest } from '../lib/decision-benchmark-manifest.mjs';
import { JEVBENCH_COST_RULE, JEVBENCH_COST_RULE_HISTORY } from '../lib/jevbench-cost-rule.mjs';
import { hasPublishedJevbenchV170Release } from '../lib/jevbench-v170-release.mjs';

// The "Reviewed" date every guide prints; the methodology TechArticle JSON-LD reuses it as dateModified.
export const GUIDE_REVIEWED = '2026-10-09';

export function DecisionGuide({ title, intro, children, date = GUIDE_REVIEWED }: { title: string; intro: string; children: ReactNode; date?: string }) {
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
  // The 10 s rule is in force only on the current method page and only once the v1.7.0 release is published; archived method pages keep their published text.
  const inForce = !version && await hasPublishedJevbenchV170Release();
  const s = m.scores;
  const apiRows = m.counts.api_input;
  const sameApiSet = apiRows === m.counts.selfhosted_input;
  const weights = Object.entries(s.composite.weights).map(([axis, weight]) => `${axis[0].toUpperCase()}${axis.slice(1)} ${weight}%`).join(', ');
  const amendmentNote = m.amendments.length
    ? `Additions stored in the results file: ${m.amendments.map((a: { label: string; date: string }) => `${a.label} (${a.date})`).join(', ')}; amended through ${m.amended_through}; latest row measurement ${m.max_row_last_measured_on}.`
    : `No post-publication additions are recorded in the results file.`;
  return <DecisionGuide title={`Decision model benchmark methodology — JevBench ${m.revision}`} intro="JevBench measures typed decisions: application state and a bounded rubric go in; a structured answer and, where supported, probabilities come out. Compare accuracy and calibration alongside measured latency and modeled cost. The open-weights board leads with Capability; the hosted API board leads with Composite.">
    <section className="space-y-3"><h2 className="text-2xl font-semibold">Release and measurement dates</h2>
      <p>Published release <b>{m.revision}</b>, initially published <time dateTime={m.published_at}>{m.published_at.slice(0,10)}</time>. The <a className="text-accent underline" href={m.version_page}>versioned leaderboard</a> retains its release context. {amendmentNote} Cite <code className="break-all">source_sha256 {m.source_sha256}</code> for these exact result bytes. {m.current_board_note}</p>
      <p>The release draw contains {m.counts.S.toLocaleString('en-US')} sealed and {m.counts.P.toLocaleString('en-US')} public decisions. Self-hosted systems answer {m.counts.selfhosted_input.toLocaleString('en-US')} decisions. {sameApiSet ? `The ${m.revision} full-set API rows answer the same set.` : `API rows answer ${apiRows.toLocaleString('en-US')} decisions on this release.`} Older subsets and later reruns are explicitly labeled and may be equated. Missing or refused answers are counted by the scorer, rather than silently removed.</p>
    </section>
    <section className="space-y-3"><h2 className="text-2xl font-semibold">Capability and Composite are different scores</h2>
      <p><b>Capability:</b> {s.capability.definition} The cost cap is USD {Number(s.capability.cost_cap_usd_per_1000).toFixed(4)} per 1,000 decisions, and the adjusted median-latency cap is {Number(s.capability.median_latency_cap_s).toFixed(2)} seconds. Eligibility is separate from the raw score.</p>
      <p><b>Composite:</b> {s.composite.definition}</p>
      <p>Official option {m.option} uses weights {weights}; Intelligence floor {s.composite.intelligence_floor}. A zero axis gives zero Composite; a missing axis gives no score.</p>
      <p className="bh-panel break-words p-4 font-mono text-sm">H = Σw / Σ(w / axis). Composite = H × min(1, I / {s.composite.intelligence_floor})² × min(1, Speed / 50)² × min(1, Cost / 50)².</p>
      <p data-bh-jev-cost-rule><b>Cost basis:</b> {JEVBENCH_COST_RULE} {JEVBENCH_COST_RULE_HISTORY}</p>
      <p>Intelligence is chance-corrected decision accuracy, with tier weighting and a public/sealed gap adjustment. Calibration evaluates probability distributions; it is not simply accuracy among confident answers. Noul handling, per-type normalization and equating are versioned in the scorer. The four normalized axes are on a 0–100 scale; actual seconds and USD remain separate values.</p>
    </section>
    <section className="space-y-3" id="latency" data-bh-jev-latency-method-section><h2 className="text-2xl font-semibold">Latency: what is measured and what is estimated</h2>
      <p>We time every request and use the median (p50) and the 95th percentile (p95). <b>API models</b> are timed end to end from our measuring host against the vendor endpoint, so their latency includes the network round trip. <b>Self-hosted (open-weights) models</b> run on hardware we rent and operate (a GPU, or a CPU host for the smallest models) and are timed over loopback, where there is no network at all. We tag that value “on-GPU, no network” (or “on-CPU, no network”) wherever it appears, and it is not directly comparable with API latency.</p>
      <p>Those two numbers are not comparable as they stand, so for every self-hosted model the ranking and the latency cap use the same estimate that adds the network: <b>2 × measured p50 + 150 ms</b> (the same adjustment is applied to p95). This is an assumption, not a measurement: it stands in for the extra time an API call to the same model would spend on the network and the serving layer. The Speed axis, the Jev-class latency cap and every rank use the estimate; the measured loopback value is shown next to it on the board, the model pages and in the JSON (<code>p50_s_measured</code>, <code>latency_basis</code>).</p>
      <p><b>Hosted endpoint timing on request.</b> A model author may provide a hosted endpoint for their model. We then time it exactly like an API, network included, with no assumption, and that measured latency replaces the estimate for that row, noted in the revision history. Contact <a className="text-accent underline" href="mailto:info@productivity-boost.com">info@productivity-boost.com</a> or note it in your <a className="text-accent underline" href="/submit">submission</a>.</p>
      <p data-bh-jev-latency-calibration><b>Calibrating the assumption (planned, not yet applied).</b> The 2 × + 150 ms rule is a fixed assumption. We intend to check it against real end-to-end timings of self-hosted models behind public endpoints, for example endpoints that model authors provide. Any change to the rule will be announced in the revision history and applied to all self-hosted rows at once, never switched silently for single rows. If we use timings from decisionmodels.io, we will say so, because decisionmodels.io hosts some of these models.</p>
      {inForce ? <p data-bh-jev-decision-limit><b>10-second limit per decision (method v1.7, from JevBench v1.7.0).</b> Every decision is timed on the harness the system is measured with, from the moment the request is sent until the answer is received. A decision that takes longer than 10 seconds counts as failed: it is scored as a wrong answer and as zero calibration for that item (each type&apos;s calibration is multiplied by the share of its decisions answered within 10 seconds). Exactly 10 seconds passes. The limit uses the measured time, not the displayed estimate for self-hosted rows. The rule is the same for every system. The Speed axis uses the measured times of all decisions, including the slow tail, and every row shows its median (p50) and 95th-percentile (p95) time and how many of its decisions took longer than 10 seconds. All rows were recomputed from their recorded per-decision times. Systems whose times were recorded on a shared, loaded machine are listed as “re-measure pending” with their v1.6 values until they are measured again. Earlier results stay available with their method label; the previous method page is <a className="text-accent underline" href="/jev-models/methodology/v1.6.1">method v1.6</a>.</p> : <p data-bh-jev-decision-limit-upcoming>Upcoming in JevBench v1.7.0 (not before 24 October 2026): a 10-second limit per decision. Every decision is timed on the harness the system is measured with, from the moment the request is sent until the answer is received. A decision that takes longer than 10 seconds counts as failed: it is scored as a wrong answer and as zero calibration for that item. Exactly 10 seconds passes. The rule is the same for every system. The Speed axis will use the measured times of all decisions, including the slow tail, and every row will show its median (p50) and 95th-percentile (p95) time and how many of its decisions took longer than 10 seconds. All rows are recomputed from their recorded per-decision times. Systems whose times were recorded on a shared, loaded machine are measured again and are listed as pending until then. Earlier results stay available with their method label.</p>}
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
