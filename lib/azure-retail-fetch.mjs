// Polite GET for the Azure Retail Prices API: bounded retries on HTTP 429/5xx and network errors, honouring
// Retry-After, exponential backoff otherwise, and one wait budget shared by the whole run so a throttled
// API can never stall the daily job for more than `maxTotalWaitMs`.
export const RETRYABLE = new Set([429, 500, 502, 503, 504]);

/** Retry-After as milliseconds (delta-seconds or HTTP date), or null when absent/unreadable. */
export function retryAfterMs(value, now = Date.now()) {
  if (value == null || value === "") return null;
  const secs = Number(value);
  if (Number.isFinite(secs)) return Math.max(0, secs * 1000);
  const at = Date.parse(value);
  return Number.isFinite(at) ? Math.max(0, at - now) : null;
}

export function createRetailFetcher({
  fetchImpl = globalThis.fetch, sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  maxRetries = 5, baseDelayMs = 4000, maxDelayMs = 90000, maxTotalWaitMs = 300000, timeoutMs = 90000, jitter = () => Math.random(),
} = {}) {
  const state = { requests: 0, retries: 0, waitedMs: 0 };
  async function get(url, headers) {
    for (let attempt = 0; ; attempt++) {
      let response = null, failure;
      state.requests++;
      try { response = await fetchImpl(url, { headers, signal: AbortSignal.timeout(timeoutMs) }); }
      catch (error) { failure = `network error: ${error.message}`; }
      if (response?.ok) return response;
      if (response && !RETRYABLE.has(response.status)) throw new Error(`HTTP ${response.status}`);
      failure ??= `HTTP ${response.status}`;
      if (attempt >= maxRetries) throw new Error(`${failure} (gave up after ${attempt + 1} attempts)`);
      const hinted = retryAfterMs(response?.headers?.get?.("retry-after"));
      const wait = Math.min(hinted ?? baseDelayMs * 2 ** attempt * (0.75 + jitter() * 0.5), maxDelayMs);
      if (state.waitedMs + wait > maxTotalWaitMs) throw new Error(`${failure} (retry wait budget of ${maxTotalWaitMs / 1000}s exhausted after ${attempt + 1} attempts)`);
      try { await response?.body?.cancel(); } catch { /* body already consumed */ }
      state.retries++; state.waitedMs += wait;
      await sleep(wait);
    }
  }
  return { get, state };
}
