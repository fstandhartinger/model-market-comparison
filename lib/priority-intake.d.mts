export type IntakeOutcome = 'ok' | 'needs_review' | 'over_cap';
export type GpuEstimate = { params: number; billions: number; vramGb: number; gpus: number; hourlyUsd: number; hours: number; costUsd: number };
export type IntakeVerdict = { outcome: IntakeOutcome; code: string; message: string; estimate?: GpuEstimate };
export const REVIEW_LABEL: string;
export const REVIEW_CONFIRMATION: string;
export const DUPLICATE_WINDOW_HOURS: number;
export const DUPLICATE_STATUSES: readonly string[];
export function normalizeModelLink(value: unknown): string;
export function duplicateKey(input: { modelLink?: string; codeLink?: string; modelName?: string }): string;
export function findDuplicate(
  rows: Record<string, unknown>[],
  submission: { email: string; submissionId?: string; modelLink?: string; codeLink?: string; modelName?: string },
  now?: number,
): { duplicate: true; existing_status: string; created_at: string } | null;
export function estimateGpuCost(meta: unknown): GpuEstimate | null;
export function classifyHfModel(input: { repo: string; info: unknown; config: unknown }): IntakeVerdict;
export function hfRepoFromLink(link: unknown): string | null;
export function checkOpenWeights(modelLink: string, deps?: { fetchImpl?: typeof fetch; timeoutMs?: number }): Promise<IntakeVerdict>;
export function isPublicAddress(ip: string): boolean;
export function resolvePublicHost(host: string, lookup?: unknown): Promise<{ ok: boolean; addresses?: { address: string; family: number }[] }>;
export function modelsProbeUrl(apiUrl: string): URL;
export function pinnedHttpsGet(url: URL, address: string, family: number, timeoutMs: number): Promise<{ status: number; body: string }>;
export function checkApiEndpoint(input: { apiUrl?: string; apiPublic?: boolean }, deps?: { lookup?: unknown; get?: unknown; timeoutMs?: number }): Promise<IntakeVerdict>;
export function runIntakeCheck(submission: { accessType: string; benchmarks?: string[]; modelLink?: string; apiUrl?: string; apiPublic?: boolean }, deps?: { hf?: unknown; api?: unknown }): Promise<IntakeVerdict>;
export function intakeAdvice(intake: IntakeVerdict): { intake: { outcome: string; code: string; message: string; canRequestReview: true; reviewLabel: string } };
export function hashPayToken(token: string): string;
export function payableRow<T extends Record<string, unknown>>(row: T | null | undefined, id: string, token: string): T | null;
