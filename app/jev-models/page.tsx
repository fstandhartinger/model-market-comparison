import type { Metadata } from 'next';
import { readJevbench, jevbenchView, JEVBENCH_REPO } from '../../lib/jevbench.mjs';
import { JevModelsBoard } from '../../components/JevModels';
import { previewMetadata } from '../../lib/seo';

// CR-84 (Florian 2026-09-18): "we need a Jev benchmark - to see which of the Jevs is actually good => smart + cheap + fast +
// reliable + ideally open". JevBench v1 is our own measurement; every number here comes from the committed artifact
// (lib/jevbench.mjs validates it), and the copy is the supervisor's PAGE-COPY.md for this CR.
export const metadata: Metadata = previewMetadata({ path: '/jev-models', documentTitle: 'Jev-class decision models — JevBench v1', title: 'Jev-class models — JevBench v1 | Benchmark Heaven',
  description: 'Our own benchmark of typed-decision models: Jev and its open rebuilds against small instruction models, on accuracy, cost, latency, calibration and openness. No combined winner.' });

const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export default async function JevModelsPage() {
  const view = jevbenchView(await readJevbench());
  const split = Object.fromEntries(view.splits.map((s) => [s.name, s.n]));
  const credits = [...view.ranked, ...view.partial, ...view.unrunnable].filter((r) => r.cls !== 'llm-baseline').sort((a, b) => a.display.localeCompare(b.display));
  const rep = view.repeatability as { accuracy_run_1: number; accuracy_run_2: number; n_different_prediction: number; n_compared: number; families_of_differences: string[] } | null;
  return <>
    <header className="bh-page-head">
      <p className="bh-eyebrow">JevBench v1 · our own benchmark{view.pilot ? ' · pilot' : ''}</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">Jev-class models</h1>
      <p className="mt-3 max-w-3xl text-lg">Typed decisions compared on accuracy, cost, latency, reliability and openness.</p>
      <p className="bh-muted mt-2 max-w-3xl" data-bh-jev-own><b className="text-gray-200">JevBench v1 is our own benchmark</b> — built and run by Benchmark Heaven, not collected from someone else&apos;s leaderboard. These results describe the tested configurations and tasks, not every application or a vendor-wide ranking. Five axes, deliberately <b className="text-gray-200">no combined score</b>: the trade-off between them is the point.</p>
      <p className="bh-muted mt-3 max-w-3xl text-xs leading-relaxed" data-bh-jev-meta>
        Measured {day(view.generated)} · protocol <code>{view.protocol}</code> · {view.decisions} decisions per system
        ({split.original ?? '?'} published · {split.heldout ?? '?'} held out · {view.decisions - (split.original ?? 0) - (split.heldout ?? 0)} imported) · one request at a time from a {String(view.hardware.origin ?? 'server').replace(/^Sandy /, '')} in Germany ·{' '}
        <a className="text-accent underline" href={JEVBENCH_REPO}>harness &amp; published decisions (MIT)</a> ·{' '}
        <a className="text-accent underline" href="/api/jevbench" data-bh-jev-sha={view.sha256}>results JSON</a> <span className="whitespace-nowrap">sha256 <code title={view.sha256}>{view.sha256.slice(0, 12)}…</code></span>
      </p>
    </header>

    <JevModelsBoard view={view} />

    <section className="mt-10 max-w-4xl space-y-3" aria-labelledby="jev-not-measured">
      <h2 id="jev-not-measured" className="text-xl font-semibold">Who could not be measured, and why</h2>
      <p className="bh-muted text-sm">A benchmark that quietly drops what it could not run is a benchmark you cannot check. <b className="text-gray-200">An exclusion is an availability fact about our run — hardware, access, terms — never a quality verdict.</b></p>
      <ul className="space-y-2 text-sm" data-bh-jev-availability>
        {view.unrunnable.map((r) => <li key={r.key} className="bh-panel p-3" data-bh-jev-availability-row={r.key}><b>{r.display}</b> <span className="bh-muted">({r.author})</span> — reached, but the run stopped after {r.nAttempted} of {r.nPlanned} decisions: <span className="bh-muted">{r.stopReason}</span>. A handful of answers is evidence that we tried, not a measurement, so it is not ranked.</li>)}
        {view.notMeasured.map((n, i) => <li key={`${n.candidate}-${i}`} className="bh-panel p-3" data-bh-jev-availability-row={n.candidate}><b>{n.candidate}</b> <span className="bh-muted">({n.author})</span> — <span className="bh-muted">{n.reason.replace(/`/g, '')}</span></li>)}
      </ul>
      <p className="bh-muted text-sm">What would change this list: a public endpoint, a CPU-runnable checkpoint under ~3 GB, or a GPU budget. Authors who want their project measured can tell us what to run; a later entry becomes v1.1 rather than silently changing v1&apos;s cohort.</p>
    </section>

    <details id="method" className="bh-panel mt-8 max-w-4xl scroll-mt-6 p-5">
      <summary className="cursor-pointer text-sm font-semibold">Method</summary>
      <div className="bh-muted mt-4 space-y-3 text-sm">
        <p>Every system sees the same state, the same instructions, the same rubric and the same exact label set. Only the transport differs.</p>
        <p>The native adapters read the model&apos;s <b>own</b> probability distribution — a single forward pass, nothing generated. The <code>openai_compat</code> adapter asks an ordinary instruction model to <b>write</b> a distribution under a JSON schema. Those are different objects. They are labelled <i>native</i> and <i>verbalized</i> everywhere on this page and in the artifact, and they are never pooled into one calibration claim. Token-level logprobs are not used for anyone.</p>
        <p>Requests go out one at a time from a Hetzner server in Germany, with no retries and no concurrency, so the latency you see includes the network. The first request to each system is reported separately, because a scale-to-zero endpoint bills its cold start to whoever knocks first.</p>
        <p>Accuracy is argmax over the exact label set. Confidence intervals resample whole scenarios rather than individual decisions, because a paraphrase pair is one scenario asked twice. Brier is the multi-class sum over the label set. ECE is top-label confidence in ten equal-width bins, and empty bins are absent rather than zero.</p>
        <p>Price is the provider&apos;s own published tariff, read on the run day, multiplied by the token usage that provider reported. It is marked <code>derived_usage_times_tariff</code> in the artifact, not presented as an invoice. A route with no billable account — a public demo, a flat-rate subscription, open weights on our own CPU — has no per-token tariff; the compute is still real, so it is shown as “no tariff”, never as $0.</p>
        <p>The suite: {view.cohorts['original-public']} · {view.cohorts['heldout-private']} · {view.cohorts['imported-public-source']}. Private items, labels and raw replies never reach this page or its JSON; only aggregate counts and whole-split hashes are published ({view.splits.map((s) => `${s.name} ${s.n}: ${s.sha256.slice(0, 10)}…`).join(' · ')}). The held-out decisions are sent to the evaluated services to get predictions, so the split is not contamination-proof.</p>
        {rep && <p><b>How much of a gap is noise?</b> Jev answered the same {rep.n_compared} decisions twice, about 16 minutes apart. {rep.n_different_prediction} answers changed ({(rep.n_different_prediction / rep.n_compared * 100).toFixed(1)}% of the suite), all in {rep.families_of_differences.join(', ')}, and accuracy moved from {(rep.accuracy_run_1 * 100).toFixed(1)}% to {(rep.accuracy_run_2 * 100).toFixed(1)}%. These endpoints are not deterministic: read a gap of about a point between two rows as noise and use the confidence intervals.</p>}
        <p><b>One protocol change, stated openly.</b> v1 froze a 0.001 tolerance on “do the probabilities sum to 1” before the run. The run showed that this mostly measures rounding: models that write probabilities to three decimals land on 0.999 for a nine-option question. So the headline renormalizes any distribution that sums to within 2% of 1, uniformly for every system, and the page reports <b>both</b> — “valid answers” under the headline rule and “exact-sum answers” under the original one (in each row&apos;s details). Distributions outside the 2% band are still invalid and still count as wrong.</p>
      </div>
    </details>

    <details id="limits" className="bh-panel mt-3 max-w-4xl scroll-mt-6 p-5">
      <summary className="cursor-pointer text-sm font-semibold">Limits</summary>
      <ul className="bh-muted mt-4 list-disc space-y-2 pl-5 text-sm">
        <li>{view.decisions} decisions is a pilot, not a census, and it is English-only.</li>
        <li>The answer-adequacy family has a majority-class floor of {((view.familyFloors.adequacy?.floor ?? 0) * 100).toFixed(1)}%; read that family against its floor, which the per-family table shows.</li>
        <li>Two of the instruction-model baselines judge some of their own earlier answers in that family, because the saved answers came from four models and two of them are also measured here.</li>
        <li>The held-out decisions are sent to the services being evaluated in order to get predictions. Not public is not the same as not seen. This is not a contamination proof.</li>
        <li>Latency is one origin at one time of day. A hosted endpoint and a local CPU are not the same kind of latency and should not be read as one ranking.</li>
        <li>The public demo endpoints are shared with everyone else using them. Their numbers describe that deployment on that day, not the model&apos;s ceiling on your hardware.</li>
        <li>An earlier head-to-head on 78 routing tasks (Needle 3 vs Jev, 18 Sep) used a different protocol; it is kept in the artifact&apos;s legacy appendix and never ranked against v1.</li>
      </ul>
    </details>

    <details id="credit" className="bh-panel mt-3 max-w-4xl scroll-mt-6 p-5">
      <summary className="cursor-pointer text-sm font-semibold">Credit</summary>
      <div className="bh-muted mt-4 space-y-3 text-sm">
        <p>Every open rebuild here is someone&apos;s weekend project published for free, and several of them run on their author&apos;s own money. Links go to their repositories.</p>
        <ul className="list-disc space-y-1.5 pl-5" data-bh-jev-credits>
          {credits.map((r) => <li key={r.key}><b className="text-gray-200">{r.display}</b> — {r.author}, {r.licence}{r.repo && <> — <a className="text-accent underline" href={r.repo}>{r.repo.replace(/^https:\/\//, '')}</a></>}</li>)}
        </ul>
        <p>Authors: if we tested the wrong configuration, tell us and we will rerun it. New entrants become v1.1 rather than silently changing v1&apos;s cohort.</p>
      </div>
    </details>
  </>;
}
