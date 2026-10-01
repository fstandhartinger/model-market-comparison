import type { Metadata } from 'next';
import Link from 'next/link';
import { submissionForPage } from '../../../lib/model-submission-db';
import { submissionReference } from '../../../lib/model-submission.mjs';

export const metadata: Metadata = {
  title: 'Submission received',
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};
export const dynamic = 'force-dynamic';

export default async function SubmitSuccessPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;
  const uuid = typeof ref === 'string' ? ref : '';
  let row: Awaited<ReturnType<typeof submissionForPage>> = null;
  try { row = process.env.ACCOUNTS_DATABASE_URL ? await submissionForPage(uuid) : null; } catch { row = null; }
  const paid = Boolean(row && row.status !== 'awaiting_payment');
  return <article className="max-w-2xl text-[15px] leading-relaxed">
    <p className="bh-eyebrow">Model submission</p>
    {paid
      ? <>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Payment received</h1>
        <p className="mt-4" role="status">Payment received — your submission is in the fast lane. Results within 48 hours of payment; a confirmation email follows.</p>
        <p className="bh-muted mt-3 text-sm">Reference: <b className="tabular-nums">{submissionReference(uuid)}</b>{row?.model_name ? <> · {row.model_name}</> : null}. If we miss the 48 hours, the payment is refunded automatically in full.</p>
      </>
      : <>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Thanks for your submission</h1>
        <p className="mt-4" role="status">{row ? 'We are still waiting for the payment confirmation from Stripe. ' : ''}If payment is still processing, this page updates within a minute — refresh to check.</p>
        {row && <p className="bh-muted mt-3 text-sm">Reference: <b className="tabular-nums">{submissionReference(uuid)}</b>. Once payment is confirmed your submission enters the fast lane (results within 48 hours of payment, or a full automatic refund).</p>}
        <p className="mt-4"><Link className="bh-button" href={`/submit/success?ref=${encodeURIComponent(uuid)}`}>Refresh</Link></p>
      </>}
    <p className="mt-6"><Link className="text-accent underline" href="/jev-models">Return to JevBench</Link> · <Link className="text-accent underline" href="/submit">Submit another model</Link></p>
  </article>;
}
