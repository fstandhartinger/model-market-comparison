// Stripe Checkout creation for priority (fast-lane) evaluations, shared by /api/priority-evaluation/checkout and
// /api/submissions (CR-251). Server only; never logs the key.
const BENCHMARK_LABELS: Record<string, string> = { jevbench: 'JevBench', imagejevbench: 'ImageJevBench' };

export function activeStripeConfig() {
  const mode = process.env.STRIPE_MODE?.trim().toLowerCase();
  if (mode !== 'test' && mode !== 'live') return null;
  const key = mode === 'test' ? process.env.STRIPE_TEST_SECRET_KEY : process.env.STRIPE_LIVE_SECRET_KEY;
  if (!key || !key.startsWith(mode === 'test' ? 'sk_test_' : 'sk_live_')) return null;
  return { mode, key } as const;
}

export async function createCheckoutSession(input: {
  id: string;
  email: string;
  modelName: string;
  benchmarks: string[];
  visibility: string;
  quote: { totalAmount: number };
  origin: string;
  key: string;
  /** Absolute URLs; default to the original /jev-models/request-evaluation pages. */
  successUrl?: string;
  cancelUrl?: string;
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
  p.set('line_items[0][price_data][product_data][description]', `Earlier scheduling for ${input.benchmarks.map((b) => BENCHMARK_LABELS[b] ?? b).join(' and ')}${input.visibility === 'private' ? ' (private report)' : ''}`);
  p.set('line_items[0][quantity]', '1');
  p.set('client_reference_id', input.id);
  p.set('metadata[priority_request_id]', input.id);
  p.set('metadata[benchmarks]', input.benchmarks.join(','));
  p.set('metadata[visibility]', input.visibility);
  p.set('payment_intent_data[receipt_email]', input.email);
  p.set('payment_intent_data[metadata][priority_request_id]', input.id);
  p.set('success_url', input.successUrl ?? `${input.origin}/jev-models/request-evaluation/success`);
  p.set('cancel_url', input.cancelUrl ?? `${input.origin}/jev-models/request-evaluation/cancel`);

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
