import { createHmac, timingSafeEqual } from 'node:crypto';

export const PRIORITY_PRICES_CENTS = Object.freeze({
  api_or_small_open: 4900,
  large_open_gpu: 9900,
});

export const PRIORITY_BENCHMARKS = Object.freeze(['jevbench', 'imagejevbench']);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SECRET_PATTERNS = [
  /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{8,}\b/i,
  /\bBearer\s+[A-Za-z0-9._~+/-]{16,}/i,
  /\b(?:api|access|secret)[\s_-]*key\s*[:=]\s*[^\s,;]{8,}/i,
];

const text = (v) => typeof v === 'string' ? v.trim() : '';
const cleanField = (v, max) => {
  const s = text(v);
  return s.length <= max && !/[\u0000-\u001f\u007f]/.test(s) ? s : null;
};

function allowedLink(value) {
  const s = text(value);
  if (!s) return '';
  if (s.length > 2048) return null;
  try {
    const u = new URL(s);
    if (u.protocol !== 'https:' || u.username || u.password) return null;
    const host = u.hostname.toLowerCase();
    if (!['huggingface.co', 'hf.co', 'github.com', 'www.github.com'].includes(host)) return null;
    return u.toString();
  } catch { return null; }
}

export function quotePriorityEvaluation({ benchmarks, pricingTier }) {
  if (!Array.isArray(benchmarks) || benchmarks.length < 1 || benchmarks.some((x) => !PRIORITY_BENCHMARKS.includes(x))) return null;
  const unique = [...new Set(benchmarks)];
  if (unique.length !== benchmarks.length) return null;
  const unitAmount = PRIORITY_PRICES_CENTS[pricingTier];
  if (!unitAmount) return null;
  return { currency: 'usd', unitAmount, quantity: unique.length, totalAmount: unitAmount * unique.length };
}

export function validatePrioritySubmission(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, error: 'Enter a valid request.' };
  if (text(body.website)) return { ok: false, error: 'Unable to accept this request.' }; // honeypot
  const submissionId = text(body.submissionId);
  if (!UUID.test(submissionId)) return { ok: false, error: 'Refresh the page and try again.' };
  const email = text(body.email).toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'Enter a valid email address.' };
  const modelName = cleanField(body.modelName, 120);
  const accessInstructions = cleanField(body.accessInstructions, 800);
  const notes = cleanField(body.notes ?? '', 1200);
  if (!modelName || !modelName.length) return { ok: false, error: 'Enter the model name.' };
  if (!accessInstructions || accessInstructions.length < 4) return { ok: false, error: 'Tell us how to access the model.' };
  if (notes === null) return { ok: false, error: 'Keep notes under 1,200 characters and remove control characters.' };
  if ([modelName, accessInstructions, notes].some((s) => SECRET_PATTERNS.some((p) => p.test(s)))) {
    return { ok: false, error: 'Do not enter API keys or access tokens. We will arrange encrypted handover after review.' };
  }
  const modelLink = allowedLink(body.modelLink);
  const codeLink = allowedLink(body.codeLink);
  if (modelLink === null || codeLink === null) return { ok: false, error: 'Use HTTPS links to Hugging Face or GitHub.' };
  const accessType = body.accessType;
  if (!['open_weights', 'api_endpoint'].includes(accessType)) return { ok: false, error: 'Choose how the model is served.' };
  const pricingTier = body.pricingTier;
  if (!Object.hasOwn(PRIORITY_PRICES_CENTS, pricingTier)) return { ok: false, error: 'Choose a pricing tier.' };
  const benchmarks = body.benchmarks;
  const quote = quotePriorityEvaluation({ benchmarks, pricingTier });
  if (!quote) return { ok: false, error: 'Choose one or both benchmarks.' };
  const visibility = body.visibility;
  if (!['public', 'private'].includes(visibility)) return { ok: false, error: 'Choose public or private results.' };
  if (body.termsAccepted !== true) return { ok: false, error: 'Please accept the evaluation terms.' };
  return {
    ok: true,
    value: { submissionId, email, modelName, modelLink, codeLink, accessType, accessInstructions, notes, pricingTier, benchmarks, visibility, quote },
  };
}

export function verifyStripeSignature(payload, header, secret, nowSeconds = Math.floor(Date.now() / 1000), toleranceSeconds = 300) {
  if (!Buffer.isBuffer(payload) || typeof header !== 'string' || typeof secret !== 'string' || !secret.startsWith('whsec_')) return false;
  if (header.length > 4096) return false;
  const fields = header.split(',').map((part) => part.split('=', 2));
  const timestamp = fields.find(([k]) => k === 't')?.[1];
  const signatures = fields.filter(([k]) => k === 'v1').map(([, v]) => v).filter((v) => /^[0-9a-f]{64}$/i.test(v || ''));
  if (!timestamp || !/^\d{1,12}$/.test(timestamp) || signatures.length === 0) return false;
  const ts = Number(timestamp);
  if (!Number.isSafeInteger(ts) || Math.abs(nowSeconds - ts) > toleranceSeconds) return false;
  const expected = createHmac('sha256', secret).update(Buffer.concat([Buffer.from(`${timestamp}.`), payload])).digest();
  return signatures.some((sig) => {
    const actual = Buffer.from(sig, 'hex');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  });
}
