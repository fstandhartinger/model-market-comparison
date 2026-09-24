import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Request received | Benchmark Heaven',
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function PriorityEvaluationSuccessPage() {
  return <article className="max-w-2xl text-[15px] leading-relaxed">
    <p className="bh-eyebrow">Priority evaluation request</p>
    <h1 className="mt-1 text-3xl font-bold tracking-tight">Thanks for your request</h1>
    <p className="bh-muted mt-4">If your payment completed, Stripe will send a receipt. We will email you after reviewing the submission. The 48-hour results window starts when the code review passes. If the request is unsafe or cannot be evaluated fairly, we will refuse it and issue a full refund.</p>
    <p className="mt-5"><Link className="text-accent underline" href="/jev-models">Return to JevBench</Link></p>
  </article>;
}
