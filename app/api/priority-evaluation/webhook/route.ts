import { NextRequest, NextResponse } from 'next/server';
import { recordPaidCheckout } from '../../../../lib/priority-evaluation-db';
import { verifyStripeSignature } from '../../../../lib/priority-evaluation.mjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(req: NextRequest) {
  const raw = Buffer.from(await req.arrayBuffer());
  if (raw.length === 0 || raw.length > 64_000) return json({ error: 'Invalid webhook body.' }, 400);
  const signature = req.headers.get('stripe-signature');
  const activeMode = process.env.STRIPE_MODE?.trim().toLowerCase();
  if (activeMode !== 'test' && activeMode !== 'live') return json({ error: 'Webhook is not configured.' }, 503);
  const secret = activeMode === 'test' ? process.env.STRIPE_TEST_WEBHOOK_SECRET : process.env.STRIPE_LIVE_WEBHOOK_SECRET;
  if (!secret) return json({ error: 'Webhook is not configured.' }, 503);
  if (!verifyStripeSignature(raw, signature, secret)) return json({ error: 'Invalid signature.' }, 400);

  let event: Record<string, unknown>;
  try { event = JSON.parse(raw.toString('utf8')) as Record<string, unknown>; }
  catch { return json({ error: 'Invalid webhook event.' }, 400); }
  const eventId = event.id;
  const eventType = event.type;
  if (typeof eventId !== 'string' || typeof eventType !== 'string') return json({ error: 'Invalid webhook event.' }, 400);
  if (eventType !== 'checkout.session.completed') return json({ received: true, ignored: true });
  const livemode = event.livemode;
  if (typeof livemode !== 'boolean' || (livemode ? 'live' : 'test') !== activeMode) return json({ error: 'Payment mode does not match.' }, 400);
  const data = event.data as { object?: unknown } | undefined;
  const session = data?.object;
  if (!session || typeof session !== 'object' || Array.isArray(session)) return json({ error: 'Invalid checkout event.' }, 400);
  const checkout = session as Record<string, unknown>;
  const metadata = checkout.metadata && typeof checkout.metadata === 'object' ? checkout.metadata as Record<string, unknown> : null;
  const requestId = metadata?.priority_request_id;
  if (typeof requestId !== 'string') return json({ error: 'Missing request reference.' }, 400);

  try {
    const result = await recordPaidCheckout({
      eventId, eventType, requestId, mode: activeMode,
      session: checkout as never,
    });
    return json({ received: true, result });
  } catch (err) {
    // Keep request data and Stripe credentials out of application logs.
    console.error('Priority webhook processing failed:', err instanceof Error ? err.message.slice(0, 160) : 'unknown error');
    return json({ error: 'Webhook processing failed.' }, 500);
  }
}
