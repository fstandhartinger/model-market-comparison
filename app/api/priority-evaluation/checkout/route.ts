import { NextResponse, type NextRequest } from 'next/server';
import { isJsonRequest, publicOrigin, sameOrigin } from '../../../../lib/account-sync.mjs';
import { markCheckoutFailed, preparePriorityRequest, PrioritySubmissionConflict, saveCheckoutSession } from '../../../../lib/priority-evaluation-db';
import { validatePrioritySubmission } from '../../../../lib/priority-evaluation.mjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const BENCHMARK_LABELS: Record<string, string> = { jevbench: 'JevBench', imagejevbench: 'ImageJevBench' };

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

function activeStripeConfig() {
  const mode = process.env.STRIPE_MODE?.trim().toLowerCase();
  if (mode !== 'test' && mode !== 'live') return null;
  const key = mode === 'test' ? process.env.STRIPE_TEST_SECRET_KEY : process.env.STRIPE_LIVE_SECRET_KEY;
  if (!key || !key.startsWith(mode === 'test' ? 'sk_test_' : 'sk_live_')) return null;
  return { mode, key } as const;
}

async function createCheckoutSession(input: {
  id: string;
  email: string;
  modelName: string;
  benchmarks: string[];
  visibility: string;
  quote: { totalAmount: number };
  origin: string;
  key: string;
}) {
  const p = new URLSearchParams();
  p.set('mode', 'payment');
  p.set('locale', 'en');
  p.set('customer_email', input.email);
  p.set('billing_address_collection', 'required');
  p.set('tax_id_collection[enabled]', 'true');
  p.set('automatic_tax[enabled]', 'true');
  p.set('payment_method_types[0]', 'card');
  p.set('line_items[0][price_data][currency]', 'usd');
  p.set('line_items[0][price_data][tax_behavior]', 'exclusive');
  p.set('line_items[0][price_data][unit_amount]', String(input.quote.totalAmount));
  p.set('line_items[0][price_data][product_data][name]', 'Priority model evaluation');
  const benchmarkNames = input.benchmarks.map((b) => BENCHMARK_LABELS[b] ?? b);
  p.set('line_items[0][price_data][product_data][description]', `Earlier scheduling for ${benchmarkNames.join(' and ')}${input.visibility === 'private' ? ' (private report)' : ''}`);
  p.set('line_items[0][quantity]', '1');
  p.set('client_reference_id', input.id);
  p.set('metadata[priority_request_id]', input.id);
  p.set('metadata[benchmarks]', input.benchmarks.join(','));
  p.set('metadata[visibility]', input.visibility);
  p.set('payment_intent_data[receipt_email]', input.email);
  p.set('payment_intent_data[metadata][priority_request_id]', input.id);
  p.set('success_url', `${input.origin}/jev-models/request-evaluation/success`);
  p.set('cancel_url', `${input.origin}/jev-models/request-evaluation/cancel`);

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Idempotency-Key': `jev-priority-checkout-${input.id}`,
    },
    body: p,
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });
  const result = await response.json().catch(() => null) as { id?: unknown; url?: unknown } | null;
  if (!response.ok || !result || typeof result.id !== 'string' || !result.id.startsWith('cs_') ||
      typeof result.url !== 'string' || !result.url.startsWith('https://checkout.stripe.com/')) {
    throw new Error(`Stripe checkout creation failed with HTTP ${response.status}`);
  }
  return { id: result.id, url: result.url };
}

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

  let prepared: Awaited<ReturnType<typeof preparePriorityRequest>> | null = null;
  try {
    prepared = await preparePriorityRequest(validated.value, config.mode);
    if (prepared.checkoutUrl) return json({ url: prepared.checkoutUrl });
    const checkout = await createCheckoutSession({
      id: prepared.id,
      email: validated.value.email,
      modelName: validated.value.modelName,
      benchmarks: validated.value.benchmarks,
      visibility: validated.value.visibility,
      quote: validated.value.quote,
      origin,
      key: config.key,
    });
    await saveCheckoutSession(prepared.id, checkout.id, checkout.url);
    return json({ url: checkout.url });
  } catch (err) {
    if (prepared && !prepared.checkoutUrl) await markCheckoutFailed(prepared.id).catch(() => undefined);
    if (err instanceof PrioritySubmissionConflict) return json({ error: err.message }, 409);
    // Do not log request content, email, model notes, or Stripe credentials.
    console.error('Priority checkout failed:', err instanceof Error ? err.message.slice(0, 180) : 'unknown error');
    return json({ error: 'Checkout could not be started. Please try again or email us.' }, 502);
  }
}
