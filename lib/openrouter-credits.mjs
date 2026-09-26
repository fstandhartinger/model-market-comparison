// D218 (2026-09-26): the paid worker route ran out of money and no layer of the daily said so.
//
// What happened, measured: the OpenRouter balance was $0.475 at 13:53 and $0.137 at 19:31 on 2026-09-25,
// and the overnight run spent the rest. At 05:20:47 on 2026-09-26 the 05:17 run's first paid call answered
// HTTP 402, the second paid route answered 402 1.6 s later, and the step went on to retain **27 sources** —
// 20 of them reporting "worker: No supported viable worker model found", which names no billing problem at
// all. `aa-benchmark-fields` had been retained on that pattern for 13 consecutive runs, since 2026-09-11,
// while the site kept publishing. The balance is a number one GET answers; nobody read it.
//
// This module is that read, plus the judgement, so the daily gate can put one line in the digest — the same
// shape as CR-177.2's analytics line, for the same reason: a silent outage that lasts days is a missing
// sentence in a message Florian already gets.

/** Measured paid worker spend over one day: total_usage moved $2.29 between 2026-09-25 19:31 and 2026-09-26 20:26. */
export const DAILY_PAID_SPEND_USD = 2.3;
/** Days of headroom below which the digest asks for a top-up. Three days is the lead time a human needs. */
export const MIN_HEADROOM_DAYS = 3;

const usd = (n) => `$${n.toFixed(2)}`;

/**
 * @param {{ total_credits: number, total_usage: number }} credits the `/api/v1/credits` data object.
 * @returns {{ level: 'ok' | 'alert', text: string, remaining_usd: number, headroom_days: number }}
 */
export function openRouterCreditHealth({ total_credits: purchased, total_usage: used }) {
  const [a, b] = [Number(purchased), Number(used)];
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    return { level: 'alert', text: 'OpenRouter: credit check could not read a balance (no usable numbers) — D218.', remaining_usd: NaN, headroom_days: NaN };
  }
  const remaining = a - b;
  const days = remaining / DAILY_PAID_SPEND_USD;
  const common = { remaining_usd: remaining, headroom_days: days };
  if (remaining <= 0) {
    return {
      ...common,
      level: 'alert',
      text: `OpenRouter: ${usd(remaining)} left — the paid worker route is out of credit, so every producer and critic call answers HTTP 402 and the benchmark step retains its sources (D218). Top up at https://openrouter.ai/credits.`,
    };
  }
  if (days < MIN_HEADROOM_DAYS) {
    return {
      ...common,
      level: 'alert',
      text: `OpenRouter: ${usd(remaining)} left, about ${days.toFixed(1)} day${days < 1.05 && days >= 0.95 ? '' : 's'} of paid worker calls at ${usd(DAILY_PAID_SPEND_USD)}/day. Below that the step retains every source it cannot review (D218). Top up at https://openrouter.ai/credits.`,
    };
  }
  return { ...common, level: 'ok', text: `OpenRouter: ${usd(remaining)} left, about ${days.toFixed(0)} days of paid worker calls at ${usd(DAILY_PAID_SPEND_USD)}/day.` };
}

/** True when the check can run at all; unconfigured is not a failure (local runs, forks). */
export const creditCheckConfigured = (env = process.env) => Boolean(env.OPEN_ROUTER_API_KEY || env.OPENROUTER_API_KEY);

/** Read the two numbers from OpenRouter. The key is sent, never returned or printed. */
export async function readOpenRouterCredits({ env = process.env, fetchImpl = fetch } = {}) {
  const key = env.OPEN_ROUTER_API_KEY || env.OPENROUTER_API_KEY;
  const res = await fetchImpl('https://openrouter.ai/api/v1/credits', {
    headers: { authorization: `Bearer ${key}` }, cache: 'no-store', signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`OpenRouter /credits answered HTTP ${res.status}`);
  const body = await res.json();
  return body?.data ?? body;
}

/** The whole check: read, then judge. Never throws; an unreadable balance is itself an alert. */
export async function checkOpenRouterCredits(options = {}) {
  const env = options.env ?? process.env;
  if (!creditCheckConfigured(env)) return { level: 'skip', text: 'OpenRouter: credit check not configured (no API key).' };
  try {
    return openRouterCreditHealth(await readOpenRouterCredits({ ...options, env }));
  } catch (error) {
    return { level: 'alert', text: `OpenRouter: credit check could not read the balance (${error.message}) — D218.` };
  }
}
