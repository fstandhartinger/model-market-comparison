import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Checkout cancelled | Benchmark Heaven',
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function PriorityEvaluationCancelPage() {
  return <article className="max-w-2xl text-[15px] leading-relaxed">
    <p className="bh-eyebrow">Priority evaluation request</p>
    <h1 className="mt-1 text-3xl font-bold tracking-tight">Checkout cancelled</h1>
    <p className="bh-muted mt-4">No payment was completed and no evaluation request was submitted. You can return to the request form whenever you are ready.</p>
    <p className="mt-5"><Link className="text-accent underline" href="/jev-models/request-evaluation">Return to the request form</Link></p>
  </article>;
}
