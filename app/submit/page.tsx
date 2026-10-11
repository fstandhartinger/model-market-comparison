import type { Metadata } from 'next';
import Link from 'next/link';
import { ModelSubmissionForm } from '../../components/ModelSubmissionForm';
import { PRIORITY_PRICES_CENTS } from '../../lib/priority-evaluation.mjs';
import { followupOptions } from '../../lib/submission-leaderboards.mjs';
import { issueFormToken, submissionSecret } from '../../lib/submission-guard.mjs';

export const metadata: Metadata = {
  title: 'Submit a model',
  description: 'Submit your model for evaluation on JevBench, ImageJevBench or AudioJevBench. The regular queue is free; the fast lane delivers results within 48 hours.',
  alternates: { canonical: '/submit' },
};

// The form token is minted per request; the follow-up list reads the current leaderboards.
export const dynamic = 'force-dynamic';

export default async function SubmitPage() {
  const secret = submissionSecret();
  const followups = await followupOptions();
  const testMode = process.env.STRIPE_MODE?.trim().toLowerCase() === 'test';
  return <article className="max-w-3xl text-[15px] leading-relaxed">
    <header className="bh-page-head">
      <p className="bh-eyebrow">JevBench · ImageJevBench · AudioJevBench</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">Submit a model for evaluation</h1>
      <p className="bh-muted mt-3 max-w-3xl text-lg">Hand in a model and we will run it through our benchmarks and publish the result. Anyone can submit; no account needed.</p>
    </header>

    <section className="mt-6" aria-labelledby="submit-how">
      <h2 id="submit-how" className="text-xl font-semibold">How it works</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
        <li><b>The regular queue is free.</b> Submissions are evaluated in the order we receive them.</li>
        <li><b>Top-10 models are re-evaluated with every release;</b> the rest of the leaderboard is re-evaluated less often.</li>
        <li><b>Fast lane:</b> results within 48 hours of payment, or a full refund on request. It covers JevBench and ImageJevBench.</li>
      </ul>
    </section>

    <section className="mt-6 rounded-xl border border-line bg-panel p-5" aria-labelledby="submit-fees">
      <h2 id="submit-fees" className="text-xl font-semibold">Fast-lane fees</h2>
      <p className="bh-muted mt-2 text-sm">JevBench is independent, volunteer-run and open source. GPU and token costs are real, and a fast-lane fee helps cover them.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-line bg-surface p-4"><b className="text-lg">${PRIORITY_PRICES_CENTS.api_or_small_open / 100}</b><p className="bh-muted mt-1 text-sm">Per benchmark for API-served models or open models up to about 9B parameters.</p></div>
        <div className="rounded-lg border border-line bg-surface p-4"><b className="text-lg">${PRIORITY_PRICES_CENTS.large_open_gpu / 100}</b><p className="bh-muted mt-1 text-sm">Per benchmark for larger open models that we run on our GPUs.</p></div>
      </div>
      <p className="bh-muted mt-3 text-sm">Choosing both JevBench and ImageJevBench charges the selected tier twice. Applicable tax is calculated at checkout.</p>
      <h3 className="mt-5 text-base font-semibold">What the fee does and does not change</h3>
      <ul className="mt-2 list-disc space-y-2 pl-5 text-sm">
        <li>Payment buys earlier scheduling only. It never buys a different method, score or rank. Every model uses the same frozen task set and rules.</li>
        <li>We decide which models we evaluate and when. We may also evaluate any model early on our own if it is of public interest.</li>
        <li>Every submission goes through code review. If something needs to change, we tell you exactly what; the clock pauses and the full 48 hours start again when you send the update. We refuse and fully refund requests that are unsafe or cannot be evaluated fairly.</li>
        <li>If we miss the 48-hour deadline, you can ask for a full refund. The clock pauses while we wait for information requested from you.</li>
        <li>A public paid run carries a visible “priority run” marker in the data. A private report is never published without your team&apos;s consent.</li>
      </ul>
      <p className="bh-muted mt-4 text-sm"><b>Think you should be exempt?</b> If you work for a non-profit or in research, tell us briefly why and we can waive the fee at our discretion. <a className="text-accent underline" href="mailto:info@productivity-boost.com?subject=Priority%20evaluation%20fee%20waiver">Email us about a fee waiver</a>.</p>
    </section>

    <section className="mt-6 rounded-xl border border-line p-5" aria-labelledby="submit-need">
      <h2 id="submit-need" className="text-lg font-semibold">What we need</h2>
      <p className="bh-muted mt-2 text-sm">A name, how to reach the model (a GitHub link, a Hugging Face link or a public API URL, at least one), your email and the benchmarks you want. For an API model you can add a key; it is encrypted the moment we receive it and used only for this evaluation. Never paste keys anywhere else.</p>
    </section>

    <section className="mt-6 rounded-xl border border-line p-5" aria-labelledby="submit-hosted">
      <h2 id="submit-hosted" className="text-lg font-semibold">Hosted-endpoint timing (on request)</h2>
      <p className="bh-muted mt-2 text-sm" data-bh-hosted-endpoint-note>Self-hosted models are timed on our GPU over loopback, and the ranking uses an estimate of 2× measured + 150 ms for network. If you prefer, give us a hosted endpoint and we time it exactly like an API, network included, with no assumption. Mention it in the notes field below or email <a className="text-accent underline" href="mailto:info@productivity-boost.com?subject=Hosted-endpoint%20timing">info@productivity-boost.com</a>.</p>
    </section>

    <section className="mt-8 rounded-xl border border-line bg-panel p-5" aria-labelledby="submit-form">
      <h2 id="submit-form" className="mb-5 text-xl font-semibold">Your submission</h2>
      {secret
        ? <ModelSubmissionForm followups={followups} formToken={issueFormToken(secret)} prices={PRIORITY_PRICES_CENTS} testMode={testMode} />
        : <p className="text-sm" role="status">Submissions are temporarily unavailable. Please try again later.</p>}
    </section>

    <p className="bh-muted mt-6 text-xs">We store what you enter here to run and report on the evaluation, and delete a submitted API key afterwards. See the <Link className="text-accent underline" href="/privacy">privacy policy</Link> and <Link className="text-accent underline" href="/terms">terms</Link>.</p>
  </article>;
}
