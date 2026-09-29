export type PriorityBenchmark = 'jevbench' | 'imagejevbench';
export type PriorityTier = 'api_or_small_open' | 'large_open_gpu';
export type PriorityQuote = { currency: 'usd'; unitAmount: number; quantity: number; totalAmount: number };
export type PrioritySubmission = {
  submissionId: string; email: string; modelName: string; modelLink: string; codeLink: string;
  accessType: 'open_weights' | 'api_endpoint'; accessInstructions: string; notes: string;
  pricingTier: PriorityTier; benchmarks: PriorityBenchmark[]; visibility: 'public' | 'private'; quote: PriorityQuote;
};
export function quotePriorityEvaluation(input: { benchmarks: PriorityBenchmark[]; pricingTier: PriorityTier }): PriorityQuote | null;
export function validatePrioritySubmission(body: unknown): { ok: true; value: PrioritySubmission } | { ok: false; error: string };
export function startPriorityCheckout(input: {
  submission: PrioritySubmission;
  stripeMode: 'test' | 'live';
  stripeKey: string;
  origin: string;
  requestId: string;
  prepareRequest: (submission: PrioritySubmission, mode: 'test' | 'live') => Promise<{ id: string; checkoutUrl: string | null }>;
  createSession: (input: {
    id: string; email: string; modelName: string; benchmarks: PriorityBenchmark[];
    visibility: 'public' | 'private'; quote: PriorityQuote; origin: string; key: string;
  }) => Promise<{ id: string; url: string }>;
  saveSession: (requestId: string, sessionId: string, url: string) => Promise<unknown>;
  markFailed: (requestId: string) => Promise<unknown>;
  isConflict: (error: unknown) => boolean;
  logFailure: (failure: { requestId: string; phase: 'prepare' | 'stripe' | 'save'; errorType: string; markFailedError?: true }) => void;
}): Promise<
  | { status: 200; body: { url: string } }
  | { status: 409; body: { error: string } }
  | { status: 502; body: { error: string; requestId: string } }
>;
export function verifyStripeSignature(payload: Buffer, header: string | null, secret: string | null, nowSeconds?: number, toleranceSeconds?: number): boolean;
export function paidAtFromStripeEvent(created: unknown, nowSeconds?: number): string | null;
