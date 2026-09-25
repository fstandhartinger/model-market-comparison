import type { Metadata } from 'next';
import Link from 'next/link';
import { RequestPriorityEvaluationForm } from '../../../components/RequestPriorityEvaluationForm';

export const metadata: Metadata = {
  title: 'Request a priority evaluation | Benchmark Heaven',
  description: 'Request earlier scheduling for a JevBench or ImageJevBench evaluation.',
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  alternates: { canonical: '/jev-models/request-evaluation' },
};

export const dynamic = 'force-dynamic';

export default function RequestPriorityEvaluationPage() {
  const testMode = process.env.STRIPE_MODE?.trim().toLowerCase() === 'test';
  return <article className="max-w-3xl text-[15px] leading-relaxed">
    <header className="bh-page-head">
      <p className="bh-eyebrow">JevBench · priority evaluation requests</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">Request a priority evaluation</h1>
      <p className="bh-muted mt-3 max-w-3xl text-lg">JevBench is independent, volunteer-run and open source. We do this in our spare time, and GPU and token costs have become a real problem. A priority request helps cover those costs and moves a model earlier in our evaluation queue.</p>
      <p className="bh-muted mt-3 max-w-3xl">The regular benchmark remains free. We continue to re-score models on our own schedule, including weekly batches, at no cost.</p>
    </header>

    <section className="mt-7 rounded-xl border border-line bg-panel p-5" aria-labelledby="priority-fees">
      <h2 id="priority-fees" className="text-xl font-semibold">Fees</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-line bg-surface p-4"><b className="text-lg">$49</b><p className="bh-muted mt-1 text-sm">Per benchmark for API-served models or open models up to about 9B parameters.</p></div>
        <div className="rounded-lg border border-line bg-surface p-4"><b className="text-lg">$99</b><p className="bh-muted mt-1 text-sm">Per benchmark for larger open models that we run on our GPUs.</p></div>
      </div>
      <p className="bh-muted mt-3 text-sm">Choosing both JevBench and ImageJevBench charges the selected tier twice. Applicable tax is calculated at checkout.</p>
    </section>

    <section className="mt-7" aria-labelledby="priority-fairness">
      <h2 id="priority-fairness" className="text-xl font-semibold">What the fee does and does not change</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
        <li>Payment buys earlier scheduling only. It never buys a different method, score or rank. Every model uses the same sealed task set and rules.</li>
        <li>We decide which models we evaluate and when. We may also evaluate any model early on our own if it is of public interest.</li>
        <li>Every submission goes through code review. We refuse and fully refund requests that are unsafe or cannot be evaluated fairly.</li>
        <li>After a request passes code review, we provide results within 48 hours. If we miss that deadline, the payment is automatically refunded.</li>
        <li>A public paid run carries a visible “priority run” marker in the data. A private report is never published without your team&apos;s consent. We may still evaluate the model later on our own schedule if it becomes a matter of public interest.</li>
      </ul>
    </section>

    <section className="mt-8 rounded-xl border border-line bg-panel p-5" aria-labelledby="priority-request-form">
      <h2 id="priority-request-form" className="mb-5 text-xl font-semibold">Request a run</h2>
      <RequestPriorityEvaluationForm testMode={testMode} />
    </section>

    <section className="mt-7 rounded-xl border border-line p-5" aria-labelledby="priority-waiver">
      <h2 id="priority-waiver" className="text-lg font-semibold">Think you should be exempt from this fee?</h2>
      <p className="bh-muted mt-2 text-sm">For example, if you work for a non-profit or in research, contact us and briefly explain your request. We can waive the fee at our discretion.</p>
      <p className="mt-3 text-sm"><a className="text-accent underline" href="mailto:info@productivity-boost.com?subject=Priority%20evaluation%20fee%20waiver">Email us about a fee waiver</a>.</p>
    </section>

    <p className="bh-muted mt-8 border-t border-line pt-4 text-xs">Operated by productivity-boost.com Betriebs UG (haftungsbeschränkt) &amp; Co. KG · <Link className="text-accent underline" href="/impressum">Imprint</Link> · <Link className="text-accent underline" href="/terms">Terms</Link> · <Link className="text-accent underline" href="/privacy">Privacy</Link></p>
  </article>;
}
