export const TOKEN_MIN_AGE_MS: number;
export const TOKEN_MAX_AGE_MS: number;
export const RATE_LIMITS: Readonly<{ perIpHour: number; perIpDay: number; globalDay: number }>;
export function submissionSecret(env?: Record<string, string | undefined>): string;
export function issueFormToken(secret: string, now?: number): string;
export function verifyFormToken(token: unknown, secret: string, now?: number): { ok: boolean };
export function clientIp(headers: { get(name: string): string | null }): string;
export function ipHash(secret: string, ip: string, now?: Date): string;
