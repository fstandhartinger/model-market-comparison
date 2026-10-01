// CR-251: abuse protection for /submit without a captcha: a signed time-to-submit token and a salted, daily-rotating
// IP hash for the rate limits. Pure functions; the route supplies the secret and the clock.
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const TOKEN_MIN_AGE_MS = 4_000;
export const TOKEN_MAX_AGE_MS = 24 * 3_600_000;
export const RATE_LIMITS = Object.freeze({ perIpHour: 5, perIpDay: 20, globalDay: 300 });

export const submissionSecret = (env = process.env) => (env.SUBMISSION_FORM_SECRET || env.AUTH_SECRET || '').trim();

const mac = (secret, issuedAt) => createHmac('sha256', secret).update(String(issuedAt)).digest('base64url');

/** base64url(issuedAtMs + "." + HMAC_SHA256(secret, issuedAtMs)) */
export function issueFormToken(secret, now = Date.now()) {
  if (!secret) throw new Error('submission secret missing');
  return Buffer.from(`${now}.${mac(secret, now)}`).toString('base64url');
}

/** Returns { ok: true } or { ok: false } with no reason: every failure looks the same to the caller. */
export function verifyFormToken(token, secret, now = Date.now()) {
  const fail = { ok: false };
  if (!secret || typeof token !== 'string' || token.length > 200) return fail;
  let decoded;
  try { decoded = Buffer.from(token, 'base64url').toString('utf8'); } catch { return fail; }
  const dot = decoded.indexOf('.');
  if (dot < 1) return fail;
  const issued = decoded.slice(0, dot);
  if (!/^\d{10,15}$/.test(issued)) return fail;
  const given = Buffer.from(decoded.slice(dot + 1));
  const expected = Buffer.from(mac(secret, issued));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return fail;
  const age = now - Number(issued);
  if (age < TOKEN_MIN_AGE_MS || age > TOKEN_MAX_AGE_MS) return fail;
  return { ok: true };
}

/** Last x-forwarded-for entry (the one our single Coolify proxy appended; earlier entries are client-supplied and
 *  spoofable), else x-real-ip. `headers` is anything with .get(). */
export function clientIp(headers) {
  const forwarded = (headers.get('x-forwarded-for') ?? '').split(',').map((s) => s.trim()).filter(Boolean).at(-1);
  return forwarded || (headers.get('x-real-ip') ?? '').trim() || 'unknown';
}

/** sha256(secret + ":" + clientIp + ":" + YYYY-MM-DD) in hex. The date rotates the hash daily (UTC). */
export function ipHash(secret, ip, now = new Date()) {
  return createHash('sha256').update(`${secret}:${ip}:${now.toISOString().slice(0, 10)}`).digest('hex');
}
