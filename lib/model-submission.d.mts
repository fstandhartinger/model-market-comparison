import type { FollowupOption } from './submission-shared.mjs';
export type ModelSubmission = {
  submissionId: string; modelName: string; githubUrl: string; huggingfaceUrl: string; apiUrl: string; apiKey: string;
  description: string; email: string; contactX: string; benchmarks: string[];
  followup: FollowupOption | null; fastLane: boolean; fastLaneBenchmarks: ('jevbench' | 'imagejevbench')[];
  pricingTier: 'api_or_small_open' | 'large_open_gpu' | null; visibility: 'public' | 'private' | null;
  quote: { currency: 'usd'; unitAmount: number; quantity: number; totalAmount: number } | null;
};
export const SECRET_MESSAGE: string;
export function containsSecret(s: unknown): boolean;
export function parseApiUrl(value: unknown): { value: string; error?: undefined } | { error: string; value?: undefined };
export function validateModelSubmission(body: unknown, opts?: { followups?: FollowupOption[] }): { ok: true; value: ModelSubmission } | { ok: false; error: string; field?: string };
export function toPriorityBody(value: ModelSubmission, ref: string): Record<string, unknown>;
export function submissionReference(id: string): string;
export function fastLaneTotalText(unitCents: number, count: number): string;
