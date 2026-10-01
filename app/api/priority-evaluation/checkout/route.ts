import { randomUUID } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { isJsonRequest, publicOrigin, sameOrigin } from '../../../../lib/account-sync.mjs';
import { markCheckoutFailed, preparePriorityRequest, PrioritySubmissionConflict, saveCheckoutSession } from '../../../../lib/priority-evaluation-db';
import { activeStripeConfig, createCheckoutSession } from '../../../../lib/priority-checkout';
import { startPriorityCheckout, validatePrioritySubmission } from '../../../../lib/priority-evaluation.mjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(req: NextRequest) {
  if (!sameOrigin(req.headers) || !isJsonRequest(req.headers)) return json({ error: 'Forbidden' }, 403);
  const config = activeStripeConfig();
  if (!config) return json({ error: 'Priority checkout is not configured yet.' }, 503);
  const origin = publicOrigin(req.headers);
  if (!origin) return json({ error: 'This host is not enabled for checkout.' }, 400);

  const raw = await req.text();
  if (raw.length > 10_000) return json({ error: 'Request is too large.' }, 413);
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return json({ error: 'Invalid request.' }, 400); }
  const validated = validatePrioritySubmission(body);
  if (!validated.ok) return json({ error: validated.error }, 400);

  const result = await startPriorityCheckout({
    submission: validated.value,
    stripeMode: config.mode,
    stripeKey: config.key,
    origin,
    requestId: randomUUID(),
    prepareRequest: preparePriorityRequest,
    createSession: createCheckoutSession,
    saveSession: saveCheckoutSession,
    markFailed: markCheckoutFailed,
    isConflict: (error) => error instanceof PrioritySubmissionConflict,
    // Keep customer data and Stripe details out of logs; this ID joins the error to a request.
    logFailure: (failure) => console.error('priority_evaluation_checkout_failed', JSON.stringify(failure)),
  });
  return json(result.body, result.status);
}
