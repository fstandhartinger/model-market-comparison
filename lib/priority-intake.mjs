// Pre-payment intake check for fast-lane orders (BH fast-lane SLA job). Pure functions plus tiny network helpers whose
// fetch / DNS / HTTPS getters are injected, so tests never touch the network. Fail closed: any doubt -> "needs_review".
import { createHash, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
import { lookup as dnsLookup } from 'node:dns/promises';
import https from 'node:https';
import {
  ARCHITECTURES, BASE_INFERENCE_HOURS, BYTES_PER_DTYPE, GPU_HOURLY_USD, GPU_MEMORY_GB, INFERENCE_HOURS_PER_BILLION,
  MAX_GPUS, PER_ORDER_CAP_USD, REVIEWED_SUPPLEMENT_REPOS, SETUP_HOURS, VRAM_OVERHEAD,
} from './priority-intake-runtime.mjs';

export const REVIEW_LABEL = 'Request manual review first (pay only after we confirm)';
export const DUPLICATE_WINDOW_HOURS = 24;
export const DUPLICATE_STATUSES = Object.freeze(['paid', 'review_passed', 'completed', 'checkout_pending']);
const HF_TIMEOUT_MS = 8000;
const API_TIMEOUT_MS = 5000;
const REPO_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]{0,95}$/;

const verdict = (outcome, code, message, extra = {}) => ({ outcome, code, message, ...extra });
const review = (code, message, extra) => verdict('needs_review', code, message, extra);

// ---------- link normalisation (duplicate guard) ----------

/** Canonical key for a model link: lowercase host (no www, hf.co -> huggingface.co) + path, no query/fragment/.git/trailing slash.
 *  Hugging Face and GitHub keep only owner/repo. Returns '' for empty or unparsable input. */
export function normalizeModelLink(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  let u;
  try { u = new URL(value.trim()); } catch { return ''; }
  let host = u.hostname.toLowerCase().replace(/^www\./, '').replace(/\.$/, '');
  if (host === 'hf.co') host = 'huggingface.co';
  let segments = u.pathname.split('/').filter(Boolean).map((s) => s.toLowerCase());
  if (host === 'huggingface.co' || host === 'github.com') segments = segments.slice(0, 2);
  if (segments.length) segments[segments.length - 1] = segments[segments.length - 1].replace(/\.git$/, '');
  return segments.length ? `${host}/${segments.join('/')}` : host;
}

/** Duplicate key for one order: model link, else code link, else model name. */
export function duplicateKey({ modelLink, codeLink, modelName }) {
  return normalizeModelLink(modelLink) || normalizeModelLink(codeLink) || (modelName ? `name:${String(modelName).trim().toLowerCase()}` : '');
}

/** rows: candidate rows for the same lower(email) (db fields). Returns the newest duplicate inside the window, or null. */
export function findDuplicate(rows, submission, now = Date.now()) {
  const key = duplicateKey(submission);
  if (!key) return null;
  const email = String(submission.email || '').toLowerCase();
  const hits = (rows || []).filter((r) => {
    if (String(r.email || '').toLowerCase() !== email) return false;
    if (r.submission_id && r.submission_id === submission.submissionId) return false; // a retry of this very order
    if (!DUPLICATE_STATUSES.includes(r.status)) return false;
    if (r.status === 'checkout_pending' && !r.checkout_session_id) return false;
    const age = now - new Date(r.created_at).getTime();
    if (!(age >= 0 && age <= DUPLICATE_WINDOW_HOURS * 3600_000)) return false;
    return duplicateKey({ modelLink: r.model_link, codeLink: r.code_link, modelName: r.model_name }) === key;
  });
  hits.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return hits[0] ? { duplicate: true, existing_status: hits[0].status, created_at: new Date(hits[0].created_at).toISOString() } : null;
}

// ---------- GPU cost estimate ----------

/** meta: HF `safetensors` object ({parameters:{DTYPE:count}, total}). Returns null when there is nothing to estimate from. */
export function estimateGpuCost(meta) {
  if (!meta || typeof meta !== 'object') return null;
  let bytes = 0;
  let params = 0;
  const parameters = meta.parameters;
  if (parameters && typeof parameters === 'object') {
    for (const [dtype, count] of Object.entries(parameters)) {
      if (!Number.isFinite(count) || count < 0) return null;
      bytes += count * (BYTES_PER_DTYPE[dtype] ?? 4); // unknown dtype: assume 4 bytes (conservative)
      params += count;
    }
  }
  if (!params && Number.isFinite(meta.total) && meta.total > 0) { params = meta.total; bytes = meta.total * 2; }
  if (!(params > 0) || !(bytes > 0)) return null;
  const vramGb = (bytes * VRAM_OVERHEAD) / 1e9;
  const gpus = Math.max(1, Math.ceil(vramGb / GPU_MEMORY_GB));
  const billions = params / 1e9;
  const hours = SETUP_HOURS + BASE_INFERENCE_HOURS + Math.max(0, billions - 10) * INFERENCE_HOURS_PER_BILLION;
  const hourlyUsd = gpus * GPU_HOURLY_USD;
  const costUsd = Math.round(hourlyUsd * hours * 100) / 100;
  return { params, billions: Math.round(billions * 10) / 10, vramGb: Math.round(vramGb * 10) / 10, gpus, hourlyUsd, hours: Math.round(hours * 100) / 100, costUsd };
}

// ---------- open-weights classification (pure) ----------

/** repo: 'org/name'. info: HF /api/models JSON. config: parsed config.json or null. */
export function classifyHfModel({ repo, info, config }) {
  const key = String(repo || '').toLowerCase();
  const registered = REVIEWED_SUPPLEMENT_REPOS.includes(key);
  if (!info || typeof info !== 'object') return review('hf_metadata', 'We could not read this model\'s details from Hugging Face.');
  if (info.private || info.disabled || info.gated) {
    return review('gated_or_private', 'This Hugging Face repository is private or gated, so our runner cannot download it without access. Make it public (or turn off gating) to pay right away, or request a manual review and we will arrange access with you.');
  }
  const files = Array.isArray(info.siblings) ? info.siblings.map((s) => String(s?.rfilename || '')) : [];
  const hasSafetensors = files.some((f) => f.endsWith('.safetensors')) || Boolean(info.safetensors);
  const hasGguf = files.some((f) => f.toLowerCase().endsWith('.gguf')) || (Array.isArray(info.tags) && info.tags.includes('gguf'));
  if (hasGguf && !hasSafetensors) {
    return review('gguf_only', 'This repository only contains GGUF files. Our GPU runner needs the original safetensors weights. Upload them to the repository to pay right away, or request a manual review.');
  }
  if (!config || typeof config !== 'object') {
    return review('no_config', 'We could not find a config.json in this repository, which our runner needs to load the model.');
  }
  const hasCustomCode = Boolean(config.auto_map || info.config?.auto_map);
  if (hasCustomCode && !registered) {
    return review('custom_code', 'This model needs custom Python code from its repository (trust_remote_code / auto_map). We review such code by hand before running it. You can request a manual review, or publish the model with a standard architecture.');
  }
  const arch = Array.isArray(config.architectures) ? config.architectures[0] : undefined;
  if (!registered && (typeof arch !== 'string' || !ARCHITECTURES.includes(arch))) {
    return review('unsupported_architecture', `The architecture "${typeof arch === 'string' ? arch.slice(0, 80) : 'unknown'}" is not one our standard runner serves yet. You can request a manual review and we will check whether we can run it.`);
  }
  if (!hasSafetensors) {
    return review('no_safetensors', 'We found no safetensors weights in this repository (pickle files such as .bin are not supported by our runner).');
  }
  const estimate = estimateGpuCost(info.safetensors);
  if (!estimate) return review('no_size', 'We could not work out the model size from its Hugging Face metadata, so we cannot estimate the GPU cost.');
  if (estimate.gpus > MAX_GPUS || estimate.costUsd > PER_ORDER_CAP_USD) {
    return verdict('over_cap', 'over_cap', `This model is about ${estimate.billions} B parameters. Running it would need ${estimate.gpus} GPU${estimate.gpus === 1 ? '' : 's'} and an estimated USD ${estimate.costUsd.toFixed(0)} of GPU time, above the limit the fast lane covers (about USD ${PER_ORDER_CAP_USD} per order on a single pod). You can request a manual review and we will tell you what is possible.`, { estimate });
  }
  return verdict('ok', registered ? 'reviewed_supplement' : 'supported', 'Supported by our runner.', { estimate });
}

// ---------- Hugging Face fetch ----------

/** Accepts https://huggingface.co/<org>/<repo>[/...] (also hf.co). Returns 'org/name' or null. */
export function hfRepoFromLink(link) {
  if (typeof link !== 'string') return null;
  let u;
  try { u = new URL(link.trim()); } catch { return null; }
  const host = u.hostname.toLowerCase();
  if (u.protocol !== 'https:' || !['huggingface.co', 'www.huggingface.co', 'hf.co'].includes(host)) return null;
  const segs = u.pathname.split('/').filter(Boolean);
  if (segs.length < 2 || ['datasets', 'spaces', 'models', 'api'].includes(segs[0])) return null;
  if (!REPO_SEGMENT.test(segs[0]) || !REPO_SEGMENT.test(segs[1])) return null;
  return `${segs[0]}/${segs[1].replace(/\.git$/, '')}`;
}

async function hfGet(fetchImpl, url, signal) {
  const response = await fetchImpl(url, { signal, redirect: 'follow', headers: { Accept: 'application/json', 'User-Agent': 'benchmark-heaven-intake/1' }, cache: 'no-store' });
  return response;
}

/** Network step. Never throws; returns an intake verdict. */
export async function checkOpenWeights(modelLink, { fetchImpl = globalThis.fetch, timeoutMs = HF_TIMEOUT_MS } = {}) {
  const repo = hfRepoFromLink(modelLink);
  if (!repo) return review('not_hf', 'For open-weights models please give the link to the model\'s Hugging Face page (https://huggingface.co/<owner>/<model>), so we can check that our runner supports it.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs); // one deadline for the whole check (a ref'd timer, unlike AbortSignal.timeout)
  try {
    const signal = controller.signal;
    const base = `https://huggingface.co/${repo}`;
    const [apiRes, cfgRes] = await Promise.all([
      hfGet(fetchImpl, `https://huggingface.co/api/models/${repo}`, signal),
      hfGet(fetchImpl, `${base}/resolve/main/config.json`, signal),
    ]);
    if (apiRes.status === 401 || apiRes.status === 403) return review('gated_or_private', 'This Hugging Face repository is private or gated, so our runner cannot download it without access. Make it public (or turn off gating) to pay right away, or request a manual review and we will arrange access with you.');
    if (apiRes.status === 404) return review('hf_not_found', 'We could not find this repository on Hugging Face. Check the link, or request a manual review.');
    if (!apiRes.ok) return review('hf_unavailable', 'We could not reach Hugging Face to check your model just now. Nothing was charged. You can try again in a few minutes or request a manual review.');
    const info = await apiRes.json();
    let config = null;
    if (cfgRes.ok) { try { config = await cfgRes.json(); } catch { config = null; } }
    else if (cfgRes.status === 401 || cfgRes.status === 403) return review('gated_or_private', 'This Hugging Face repository is gated, so our runner cannot download it without access. Make it public (or turn off gating) to pay right away, or request a manual review.');
    return classifyHfModel({ repo, info, config });
  } catch {
    return review('hf_unavailable', 'We could not reach Hugging Face to check your model just now. Nothing was charged. You can try again in a few minutes or request a manual review.');
  } finally {
    clearTimeout(timer);
  }
}

// ---------- SSRF guard + public endpoint probe ----------

function ipv4Parts(ip) { const p = ip.split('.').map(Number); return p.length === 4 && p.every((n) => Number.isInteger(n) && n >= 0 && n <= 255) ? p : null; }

function publicIPv4(ip) {
  const p = ipv4Parts(ip);
  if (!p) return false;
  const [a, b, c] = p;
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;       // CGNAT
  if (a === 169 && b === 254) return false;                 // link-local, cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return false;
  if (a === 192 && b === 88 && c === 99) return false;
  if (a === 198 && (b === 18 || b === 19)) return false;
  if (a === 198 && b === 51 && c === 100) return false;
  if (a === 203 && b === 0 && c === 113) return false;
  return true;
}

function expandIPv6(ip) {
  let s = ip.toLowerCase().split('%')[0];
  const dotted = s.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (dotted) {
    const p = ipv4Parts(dotted[1]);
    if (!p) return null;
    s = s.replace(dotted[1], ((p[0] << 8) | p[1]).toString(16) + ':' + ((p[2] << 8) | p[3]).toString(16));
  }
  const halves = s.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const fill = halves.length === 2 ? 8 - head.length - tail.length : 0;
  if (fill < 0 || (halves.length === 1 && head.length !== 8)) return null;
  const groups = [...head, ...Array(halves.length === 2 ? fill : 0).fill('0'), ...tail].map((g) => parseInt(g || '0', 16));
  return groups.length === 8 && groups.every((g) => Number.isInteger(g) && g >= 0 && g <= 0xffff) ? groups : null;
}

/** True only for globally routable unicast addresses. Anything unparsable is refused. */
export function isPublicAddress(ip) {
  const kind = typeof ip === 'string' ? isIP(ip) : 0;
  if (kind === 4) return publicIPv4(ip);
  if (kind !== 6) return false;
  const g = expandIPv6(ip);
  if (!g) return false;
  const v4 = (hi, lo) => `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
  if (g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff) return publicIPv4(v4(g[6], g[7])); // ::ffff:a.b.c.d
  if (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((x) => x === 0)) return publicIPv4(v4(g[6], g[7])); // NAT64
  if ((g[0] & 0xe000) !== 0x2000) return false;                       // only 2000::/3 global unicast
  if (g[0] === 0x2001 && g[1] === 0x0db8) return false;               // documentation
  if (g[0] === 0x2001 && g[1] === 0) return false;                    // Teredo
  if (g[0] === 0x2002) return false;                                  // 6to4
  return true;
}

/** Resolves host and requires every address to be public. Returns {ok, addresses} (pin the connection to addresses[0]). */
export async function resolvePublicHost(host, lookup = dnsLookup) {
  if (typeof host !== 'string' || !host) return { ok: false };
  if (isIP(host)) return isPublicAddress(host) ? { ok: true, addresses: [{ address: host, family: isIP(host) }] } : { ok: false };
  try {
    const found = await lookup(host, { all: true });
    const list = Array.isArray(found) ? found : [found];
    if (!list.length || !list.every((a) => isPublicAddress(a.address))) return { ok: false };
    return { ok: true, addresses: list };
  } catch { return { ok: false }; }
}

/** Probe URL: <link>/v1/models (no double /v1, query and fragment dropped). */
export function modelsProbeUrl(apiUrl) {
  const u = new URL(apiUrl);
  u.search = ''; u.hash = '';
  const path = u.pathname.replace(/\/+$/, '');
  u.pathname = /\/v1$/.test(path) ? `${path}/models` : `${path}/v1/models`;
  return u;
}

/** Default HTTPS GET pinned to a pre-validated IP (defeats DNS rebinding); no redirects; response capped at 256 KiB. */
export function pinnedHttpsGet(url, address, family, timeoutMs) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      host: url.hostname, port: 443, path: url.pathname, method: 'GET', servername: url.hostname,
      headers: { Accept: 'application/json', 'User-Agent': 'benchmark-heaven-intake/1', Host: url.host },
      lookup: (_h, _o, cb) => cb(null, address, family), timeout: timeoutMs,
    }, (res) => {
      const chunks = []; let size = 0;
      res.on('data', (c) => { size += c.length; if (size > 262144) { req.destroy(new Error('too large')); } else chunks.push(c); });
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') }));
      res.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
    req.end();
  });
}

const PRIVATE_ENDPOINT = 'We cannot test a private endpoint before payment, because we never ask for API keys in the form. Our team will check your endpoint and email you a payment link; the 48-hour clock starts only when you pay.';

export async function checkApiEndpoint({ apiUrl, apiPublic }, { lookup = dnsLookup, get = pinnedHttpsGet, timeoutMs = API_TIMEOUT_MS } = {}) {
  if (!apiUrl) return review('api_url_missing', 'Please add your API URL so we can check the endpoint, or request a manual review.');
  if (apiPublic !== true) return review('api_private', PRIVATE_ENDPOINT);
  let target;
  try {
    target = modelsProbeUrl(apiUrl);
    if (target.protocol !== 'https:' || target.username || target.password || (target.port && target.port !== '443')) throw new Error('bad url');
  } catch { return review('api_url_invalid', 'We could not use that API URL. It must be a public https:// address.'); }
  const resolved = await resolvePublicHost(target.hostname.replace(/^\[|\]$/g, ''), lookup);
  if (!resolved.ok) return review('api_host_refused', 'That API host does not resolve to a public internet address, so we cannot test it. Request a manual review and we will arrange access with you.');
  try {
    const { address, family } = resolved.addresses[0];
    const res = await get(target, address, family, timeoutMs);
    if (res.status === 200) {
      const body = JSON.parse(res.body);
      if (body && Array.isArray(body.data)) return verdict('ok', 'api_public_ok', 'The endpoint answered without a key.');
    }
  } catch { /* falls through to review */ }
  return review('api_probe_failed', 'Your endpoint did not answer a key-free request to /v1/models with a model list. If it needs a key, request a manual review and we will arrange a secure handover; if it is meant to be public, check the URL.');
}

/** Whole intake decision for one validated priority submission. Never throws. */
export async function runIntakeCheck(submission, deps = {}) {
  try {
    if (submission.accessType === 'api_endpoint') return await checkApiEndpoint({ apiUrl: submission.apiUrl, apiPublic: submission.apiPublic }, deps.api);
    if ((submission.benchmarks || []).includes('imagejevbench')) {
      return review('image_open_weights', 'ImageJevBench on open weights runs only after a manual source review. Request a manual review and pay only once we confirm, or choose JevBench only.');
    }
    return await checkOpenWeights(submission.modelLink, deps.hf);
  } catch {
    return review('check_failed', 'We could not finish the automatic check. Nothing was charged. You can request a manual review.');
  }
}

/** What the API returns to the form when the check does not pass (no Stripe session was created). */
export const intakeAdvice = (intake) => ({ intake: { outcome: intake.outcome, code: intake.code, message: intake.message, canRequestReview: true, reviewLabel: REVIEW_LABEL } });
export const REVIEW_CONFIRMATION = 'We\'ll check your model and email you a payment link; the 48-hour clock starts only when you pay.';

// ---------- review-first payment link ----------

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const hashPayToken = (token) => createHash('sha256').update(String(token), 'utf8').digest('hex');

/** The row a /pay link may start a checkout for, or null. Needs: well-formed id and token, row approved by an agent
 *  (intake_approved_at), still unpaid (awaiting_review, or checkout_pending to re-open the same session) and a matching token hash. */
export function payableRow(row, id, token) {
  if (!row || typeof id !== 'string' || !UUID.test(id) || row.id !== id) return null;
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{20,128}$/.test(token)) return null;
  if (!row.intake_approved_at || !row.pay_token_hash || !/^[0-9a-f]{64}$/.test(String(row.pay_token_hash))) return null;
  if (row.status !== 'awaiting_review' && row.status !== 'checkout_pending') return null;
  const a = Buffer.from(hashPayToken(token), 'hex');
  const b = Buffer.from(String(row.pay_token_hash), 'hex');
  return a.length === b.length && timingSafeEqual(a, b) ? row : null;
}
