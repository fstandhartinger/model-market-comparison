// CR-251: pure validation of a /submit request and its mapping onto the existing priority (fast-lane) request.
import { PRIORITY_PRICES_CENTS, quotePriorityEvaluation, validatePrioritySubmission } from './priority-evaluation.mjs';
import { FOLLOWUP_BENCHMARKS, fastLaneSubset, followupValue } from './submission-shared.mjs';

export { FOLLOWUP_BENCHMARKS };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const X_HANDLE = /^@?[A-Za-z0-9_]{1,15}$/;
export const SECRET_MESSAGE = 'Put API keys only in the API key field.';

// Same idea as the priority form's patterns, widened to common token shapes people paste into notes.
const SECRET_PATTERNS = [
  /\b(?:sk|rk|pk)[_-](?:live|test|proj|ant|or)?[_-]?[A-Za-z0-9_-]{16,}/i,
  /\bsk-[A-Za-z0-9_-]{20,}/,
  /\bBearer\s+[A-Za-z0-9._~+/-]{16,}/i,
  /\b(?:api|access|secret|auth)[\s_-]*(?:key|token)\s*[:=]\s*[^\s,;]{8,}/i,
  /\b(?:hf|ghp|gho|ghu|ghs|ghr|xox[abprs]|glpat)[_-][A-Za-z0-9_-]{16,}/,
  /\bgithub_pat_[A-Za-z0-9_]{20,}/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
];
export const containsSecret = (s) => typeof s === 'string' && SECRET_PATTERNS.some((p) => p.test(s));

const text = (v) => typeof v === 'string' ? v.trim() : '';
const noControls = (s, multiline) => !(multiline ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/ : /[\u0000-\u001f\u007f]/).test(s);

const httpsUrl = (value) => {
  const s = text(value);
  if (!s || s.length > 2048 || !noControls(s, false)) return null;
  try {
    const u = new URL(s);
    if (u.protocol !== 'https:' || u.username || u.password) return null;
    return u;
  } catch { return null; }
};

function siteLink(value, hosts) {
  const s = text(value);
  if (!s) return { value: '' };
  const u = httpsUrl(s);
  if (!u || !hosts.includes(u.hostname.toLowerCase()) || (u.port && u.port !== '443')) return { error: true };
  return { value: u.toString() };
}

const BLOCKED_SUFFIXES = ['.local', '.localhost', '.internal', '.lan', '.home', '.corp', '.intranet', '.private', '.test', '.invalid', '.example'];
const SECRET_QUERY_NAME = /(?:^|[_-])(?:api[_-]?key|key|token|secret|password|passwd|auth|access[_-]?token|signature|sig)$/i;

/** Public https endpoint only: a real DNS name, default port, no credentials, no IP literals, no internal names. */
export function parseApiUrl(value) {
  const s = text(value);
  if (!s) return { value: '' };
  const u = httpsUrl(s);
  if (!u) return { error: 'Use a full https:// API URL without a username or password.' };
  const host = u.hostname.toLowerCase().replace(/\.$/, '');
  if (u.port && u.port !== '443') return { error: 'The API URL must use the standard HTTPS port.' };
  if (host.startsWith('[') || host.includes(':') || /^[0-9.]+$/.test(host) || /^0x[0-9a-f]+$/i.test(host)) return { error: 'Use a host name, not an IP address.' };
  if (host === 'localhost' || BLOCKED_SUFFIXES.some((x) => host.endsWith(x)) || !/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(host)) {
    return { error: 'The API URL must be a public host name.' };
  }
  if (containsSecret(s) || [...u.searchParams.keys()].some((k) => SECRET_QUERY_NAME.test(k))) {
    return { error: 'Do not put keys in the API URL. Use the API key field.' };
  }
  return { value: u.toString() };
}

const fail = (error, field) => ({ ok: false, error, ...(field ? { field } : {}) });

/**
 * body: the JSON the form posts. followups: followupOptions() output (a follow-up must be one of them).
 * The honeypot and the form token are checked by the caller / here (honeypot) so the order stays stable.
 */
export function validateModelSubmission(body, { followups = [] } = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return fail('Enter a valid submission.');
  if (text(body.website)) return fail('Unable to accept this submission.'); // honeypot
  const submissionId = text(body.submissionId);
  if (!UUID.test(submissionId)) return fail('Refresh the page and try again.');

  const modelName = text(body.modelName);
  if (!modelName) return fail('Enter the model name.', 'modelName');
  if (modelName.length > 120 || !noControls(modelName, false)) return fail('Keep the model name under 120 characters.', 'modelName');

  const github = siteLink(body.githubUrl, ['github.com', 'www.github.com']);
  if (github.error) return fail('Use an https://github.com/… link.', 'githubUrl');
  const hf = siteLink(body.huggingfaceUrl, ['huggingface.co', 'www.huggingface.co', 'hf.co']);
  if (hf.error) return fail('Use an https://huggingface.co/… link.', 'huggingfaceUrl');
  const api = parseApiUrl(body.apiUrl);
  if (api.error) return fail(api.error, 'apiUrl');
  if (!github.value && !hf.value && !api.value) return fail('Add at least one of a GitHub link, a Hugging Face link or an API URL.', 'githubUrl');

  const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
  if (apiKey) {
    if (!api.value) return fail('An API key only makes sense together with an API URL.', 'apiKey');
    if (apiKey.length > 4096 || !noControls(apiKey, false)) return fail('That API key is too long or contains invalid characters.', 'apiKey');
  }

  const description = text(body.description).replace(/\r\n?/g, '\n');
  if (description.length > 2000 || !noControls(description, true)) return fail('Keep the description under 2,000 characters.', 'description');
  if (containsSecret(description) || containsSecret(modelName) || (apiKey.length >= 8 && description.includes(apiKey))) return fail(SECRET_MESSAGE, 'description');

  const email = text(body.email).toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Enter a valid email address.', 'email');
  const handle = text(body.xHandle);
  if (handle && !X_HANDLE.test(handle)) return fail('Enter an X handle like @name (letters, digits and underscores, up to 15).', 'xHandle');
  const contactX = handle.replace(/^@/, '');

  const benchmarks = body.benchmarks;
  if (!Array.isArray(benchmarks) || benchmarks.length < 1 || benchmarks.some((b) => !FOLLOWUP_BENCHMARKS.includes(b)) || new Set(benchmarks).size !== benchmarks.length) {
    return fail('Choose at least one benchmark.', 'benchmarks');
  }
  const ordered = FOLLOWUP_BENCHMARKS.filter((b) => benchmarks.includes(b));

  let followup = null;
  const rawFollowup = text(body.followup);
  if (rawFollowup && rawFollowup !== 'none') {
    const hit = (Array.isArray(followups) ? followups : []).find((o) => followupValue(o) === rawFollowup);
    if (!hit) return fail('Pick the earlier version from the list, or choose "No, this is a new model".', 'followup');
    followup = { benchmark: hit.benchmark, key: hit.key, name: hit.name, rank: hit.rank };
  }

  const fastLane = body.fastLane === true;
  let fastLaneBenchmarks = [];
  let pricingTier = null;
  let visibility = null;
  let quote = null;
  if (fastLane) {
    fastLaneBenchmarks = fastLaneSubset(ordered);
    if (!fastLaneBenchmarks.length) return fail('The fast lane covers JevBench and ImageJevBench. AudioJevBench joins the regular queue.', 'fastLane');
    pricingTier = body.pricingTier;
    if (!Object.hasOwn(PRIORITY_PRICES_CENTS, pricingTier)) return fail('Choose a pricing tier for the fast lane.', 'pricingTier');
    visibility = body.visibility;
    if (!['public', 'private'].includes(visibility)) return fail('Choose public or private results.', 'visibility');
    if (body.termsAccepted !== true) return fail('Please accept the evaluation terms to use the fast lane.', 'termsAccepted');
    quote = quotePriorityEvaluation({ benchmarks: fastLaneBenchmarks, pricingTier });
    if (!quote) return fail('Choose a pricing tier for the fast lane.', 'pricingTier');
  }

  return {
    ok: true,
    value: {
      submissionId, modelName, githubUrl: github.value, huggingfaceUrl: hf.value, apiUrl: api.value, apiKey,
      description, email, contactX, benchmarks: ordered, followup, fastLane, fastLaneBenchmarks, pricingTier, visibility, quote,
    },
  };
}

/** The existing priority request this submission turns into. Run through validatePrioritySubmission by the caller. */
export function toPriorityBody(value, ref) {
  const apiLine = value.apiUrl ? `API URL: ${value.apiUrl}` : '';
  let accessInstructions = value.apiUrl
    ? `Submitted via /submit (ref ${ref}). ${apiLine} API key: stored encrypted in the submission record.`
    : 'Open weights at the links above.';
  if (accessInstructions.length > 800) accessInstructions = `Submitted via /submit (ref ${ref}). API URL: see the submission record. API key: stored encrypted in the submission record.`;
  return {
    submissionId: value.submissionId,
    email: value.email,
    modelName: value.modelName,
    modelLink: value.huggingfaceUrl,
    codeLink: value.githubUrl,
    accessType: value.apiUrl ? 'api_endpoint' : 'open_weights',
    accessInstructions,
    notes: value.description.slice(0, 1200),
    pricingTier: value.pricingTier,
    benchmarks: value.fastLaneBenchmarks,
    visibility: value.visibility,
    termsAccepted: true,
  };
}

export const submissionReference = (id) => String(id).replace(/-/g, '').slice(0, 8).toUpperCase();

/** "$49 × 2 benchmarks = $98 + applicable tax" for the form and tests. */
export function fastLaneTotalText(unitCents, count) {
  const unit = unitCents / 100;
  return `$${unit} × ${count} benchmark${count === 1 ? '' : 's'} = $${unit * count} + applicable tax`;
}
