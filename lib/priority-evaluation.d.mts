export type PriorityBenchmark = 'jevbench' | 'imagejevbench';
export type PriorityTier = 'api_or_small_open' | 'large_open_gpu';
export type PriorityQuote = { currency: 'usd'; unitAmount: number; quantity: number; totalAmount: number };
export function quotePriorityEvaluation(input: { benchmarks: PriorityBenchmark[]; pricingTier: PriorityTier }): PriorityQuote | null;
export function validatePrioritySubmission(body: unknown): { ok: true; value: {
  submissionId: string; email: string; modelName: string; modelLink: string; codeLink: string;
  accessType: 'open_weights' | 'api_endpoint'; accessInstructions: string; notes: string;
  pricingTier: PriorityTier; benchmarks: PriorityBenchmark[]; visibility: 'public' | 'private'; quote: PriorityQuote;
} } | { ok: false; error: string };
export function verifyStripeSignature(payload: Buffer, header: string | null, secret: string | null, nowSeconds?: number, toleranceSeconds?: number): boolean;
