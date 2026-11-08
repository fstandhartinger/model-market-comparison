import { randomUUID } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { publicOrigin } from '../../../../../lib/account-sync.mjs';
import {
  findPayableRequest, linkedSubmissionUuid, prepareApprovedRequest, PrioritySubmissionConflict,
  revertApprovedRequest, saveCheckoutSession,
} from '../../../../../lib/priority-evaluation-db';
import { activeStripeConfig, createCheckoutSession } from '../../../../../lib/priority-checkout';
import { startPriorityCheckout, type PrioritySubmission } from '../../../../../lib/priority-evaluation.mjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Review-first payment link: /api/priority-evaluation/pay/<request id>?token=<token>. The token is random, emailed by an agent
// after approval, and only its sha256 is stored. Works while the row is approved (intake_approved_at) and not yet paid.
const page = (title: string, text: string, status: number) => new NextResponse(
  `<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><title>${title}</title><body style="font:16px system-ui;max-width:34rem;margin:4rem auto;padding:0 1rem"><h1>${title}</h1><p>${text}</p>`,
  { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
const INVALID = () => page('This payment link is not valid', 'The link is wrong, has already been used, or was not approved yet. Reply to our email and we will help.', 404);

async function handle(req: NextRequest, id: string) {
  const token = req.nextUrl.searchParams.get('token') ?? '';
  const config = activeStripeConfig();
  if (!config) return page('Payment is not available right now', 'Please try again later.', 503);
  const origin = publicOrigin(req.headers);
  if (!origin) return page('This host is not enabled for checkout', 'Please use the link from our email.', 400);

  const row = await findPayableRequest(id, token);
  if (!row || row.stripe_mode !== config.mode) return INVALID();

  const submissionUuid = await linkedSubmissionUuid(id);
  const submission = {
    email: row.email, modelName: row.model_name, benchmarks: row.benchmarks, visibility: row.visibility,
    quote: { currency: 'usd', unitAmount: row.unit_amount, quantity: row.quantity, totalAmount: row.base_amount },
  } as unknown as PrioritySubmission;
  const result = await startPriorityCheckout({
    submission,
    stripeMode: config.mode,
    stripeKey: config.key,
    origin,
    requestId: randomUUID(),
    prepareRequest: () => prepareApprovedRequest(row),
    createSession: (input) => createCheckoutSession({
      ...input,
      ...(submissionUuid ? { successUrl: `${origin}/submit/success?ref=${submissionUuid}`, cancelUrl: `${origin}/submit/cancel?ref=${submissionUuid}` } : {}),
    }),
    saveSession: saveCheckoutSession,
    markFailed: revertApprovedRequest,
    isConflict: (error) => error instanceof PrioritySubmissionConflict,
    logFailure: (failure) => console.error('priority_evaluation_pay_failed', JSON.stringify(failure)),
  });
  if (result.status === 200 && 'url' in result.body) {
    return NextResponse.redirect(result.body.url, { status: 303, headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
  }
  if (result.status === 409) return INVALID();
  return page('Payment could not be started', 'Please try the link again in a minute. Nothing was charged.', 502);
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) { return handle(req, (await ctx.params).id); }
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) { return handle(req, (await ctx.params).id); }
