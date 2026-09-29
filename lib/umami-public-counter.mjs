// Public aggregate only. The Umami API key remains on the server and is never returned to callers.
export const UMAMI_COUNTER_ORIGIN = "https://bh-analytics.app.mintapis.com";
export const UMAMI_COUNTER_WEBSITE = "ea13b906-b272-438c-b36f-f3da111410a4";

export function readVisitorTotal(payload) {
  const raw = payload?.visitors;
  const value = typeof raw === "object" && raw !== null ? raw.value : raw;
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

/** @param {{ apiKey?: string, fetchImpl?: typeof fetch, now?: number }} options */
export async function fetchVisitorTotal({ apiKey, fetchImpl = fetch, now = Date.now() } = {}) {
  if (typeof apiKey !== "string" || apiKey.length < 16) throw new Error("Umami API key is unavailable");
  const query = new URLSearchParams({ startAt: "0", endAt: String(now) });
  const url = `${UMAMI_COUNTER_ORIGIN}/api/websites/${UMAMI_COUNTER_WEBSITE}/stats?${query}`;
  const response = await fetchImpl(url, {
    headers: { authorization: `Bearer ${apiKey}` },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("Umami visitor count request failed");
  const visitors = readVisitorTotal(await response.json());
  if (visitors === null) throw new Error("Umami returned an invalid visitor count");
  return visitors;
}
