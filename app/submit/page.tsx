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
        <li><b>Fast lane:</b> results within 48 hours of payment, or a full automatic refund. It covers JevBench and ImageJevBench.</li>
      </ul>
    </section>

    <section className="mt-6 rounded-xl border border-line p-5" aria-labelledby="submit-need">
      <h2 id="submit-need" className="text-lg font-semibold">What we need</h2>
      <p className="bh-muted mt-2 text-sm">A name, how to reach the model (a GitHub link, a Hugging Face link or a public API URL, at least one), your email and the benchmarks you want. For an API model you can add a key; it is encrypted the moment we receive it and used only for this evaluation. Never paste keys anywhere else.</p>
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
