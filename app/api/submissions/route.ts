import { randomUUID } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { isJsonRequest, publicOrigin, sameOrigin } from '../../../lib/account-sync.mjs';
import { insertSubmission, linkPriorityRequest, queuePosition } from '../../../lib/model-submission-db';
import { submissionReference, toPriorityBody, validateModelSubmission } from '../../../lib/model-submission.mjs';
import { activeStripeConfig, createCheckoutSession } from '../../../lib/priority-checkout';
import { markCheckoutFailed, preparePriorityRequest, PrioritySubmissionConflict, saveCheckoutSession } from '../../../lib/priority-evaluation-db';
import { startPriorityCheckout, validatePrioritySubmission, type PrioritySubmission } from '../../../lib/priority-evaluation.mjs';
import { encryptApiKey, parsePublicKey } from '../../../lib/submission-crypto.mjs';
import { clientIp, ipHash, submissionSecret, verifyFormToken } from '../../../lib/submission-guard.mjs';
import { followupOptions } from '../../../lib/submission-leaderboards.mjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const GENERIC = 'Refresh the page and try again.';

export async function POST(req: NextRequest) {
  if (!sameOrigin(req.headers) || !isJsonRequest(req.headers)) return json({ error: 'Forbidden' }, 403);
  const secret = submissionSecret();
  if (!secret || !process.env.ACCOUNTS_DATABASE_URL) return json({ error: 'Submissions are not available right now. Please try again later.' }, 503);

  const raw = await req.text();
  if (raw.length > 20_000) return json({ error: 'Request is too large.' }, 413);
  let body: Record<string, unknown>;
  try { body = JSON.parse(raw); } catch { return json({ error: 'Invalid request.' }, 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'Invalid request.' }, 400);
  if (!verifyFormToken(body.formToken, secret).ok) return json({ error: GENERIC }, 400);

  const validated = validateModelSubmission(body, { followups: await followupOptions() });
  if (!validated.ok) return json({ error: validated.error, ...(validated.field ? { field: validated.field } : {}) }, 400);
  const v = validated.value;
  const ref = submissionReference(v.submissionId);

  // Everything that can fail cheaply is checked before anything is stored.
  let ciphertext: string | null = null;
  if (v.apiKey) {
    if (!parsePublicKey(process.env.SUBMISSION_SECRET_PUBLIC_KEY)) {
      return json({ error: 'Secure key upload is not available right now; submit without the key and we will contact you.' }, 503);
    }
    try { ciphertext = encryptApiKey(v.apiKey, process.env.SUBMISSION_SECRET_PUBLIC_KEY); }
    catch { return json({ error: 'Secure key upload is not available right now; submit without the key and we will contact you.' }, 503); }
  }
  let prioritySubmission: PrioritySubmission | null = null;
  let stripe: ReturnType<typeof activeStripeConfig> = null;
  let origin: string | null = null;
  if (v.fastLane) {
    stripe = activeStripeConfig();
    origin = publicOrigin(req.headers);
    if (!stripe || !origin) return json({ error: 'The fast lane is not available right now. Untick it to send your submission to the regular queue.' }, 503);
    const priority = validatePrioritySubmission(toPriorityBody(v, ref));
    if (!priority.ok) return json({ error: priority.error }, 400);
    prioritySubmission = priority.value;
  }

  try {
    const stored = await insertSubmission(v, {
      ipHash: ipHash(secret, clientIp(req.headers)), apiKeyCiphertext: ciphertext, stripeMode: stripe?.mode ?? null,
    });
    if (stored.kind === 'rate_limited') return json({ error: 'You have sent a lot of submissions recently. Please try again later.' }, 429);
    if (stored.kind === 'conflict') return json({ error: GENERIC }, 409);

    if (!v.fastLane) {
      return json({ ok: true, reference: ref, queuePosition: await queuePosition(stored.id) });
    }
    if (stored.status !== 'awaiting_payment') return json({ ok: true, reference: ref, queuePosition: null, fastLane: true });

    const submissionId = v.submissionId;
    const result = await startPriorityCheckout({
      submission: prioritySubmission!,
      stripeMode: stripe!.mode,
      stripeKey: stripe!.key,
      origin: origin!,
      requestId: randomUUID(),
      prepareRequest: async (s, mode) => {
        const prepared = await preparePriorityRequest(s, mode);
        await linkPriorityRequest(submissionId, prepared.id);
        return prepared;
      },
      createSession: (input) => createCheckoutSession({
        ...input,
        successUrl: `${origin}/submit/success?ref=${submissionId}`,
        cancelUrl: `${origin}/submit/cancel?ref=${submissionId}`,
      }),
      saveSession: saveCheckoutSession,
      markFailed: markCheckoutFailed,
      isConflict: (error) => error instanceof PrioritySubmissionConflict,
      logFailure: (failure) => console.error('model_submission_checkout_failed', JSON.stringify(failure)),
    });
    return json({ ...result.body, reference: ref, submissionId }, result.status);
  } catch (err) {
    // Never log the body: it may carry an API key.
    console.error('model_submission_failed', err instanceof Error ? err.name : 'unknown');
    return json({ error: 'We could not save your submission. Please try again.' }, 500);
  }
}
