import type { Metadata } from 'next';
import Link from 'next/link';
import { SubmitCancelAction } from '../../../components/SubmitCancelAction';

export const metadata: Metadata = {
  title: 'Payment cancelled | Benchmark Heaven',
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};
export const dynamic = 'force-dynamic';

export default async function SubmitCancelPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;
  const uuid = typeof ref === 'string' ? ref : '';
  return <article className="max-w-2xl text-[15px] leading-relaxed">
    <p className="bh-eyebrow">Model submission</p>
    <h1 className="mt-1 text-3xl font-bold tracking-tight">Payment cancelled</h1>
    <p className="mt-4" role="status">Payment cancelled — nothing was charged and your submission was not sent.</p>
    <p className="bh-muted mt-3 text-sm">You can still send it without the fast lane. It is then evaluated in the regular queue, which is free.</p>
    <div className="mt-5">{/^[0-9a-f-]{36}$/i.test(uuid) ? <SubmitCancelAction submissionId={uuid} /> : null}</div>
    <p className="mt-5"><Link className="text-accent underline" href="/submit">Back to the submission form</Link></p>
  </article>;
}
