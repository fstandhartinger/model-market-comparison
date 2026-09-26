// D218 (2026-09-26): the paid worker route ran out of money and every layer renamed the cause.
//
// Measured on `runs/2026-09-26T05-17-01-948Z-4136552`: the OpenRouter balance was $0.137 at 19:31 the
// previous evening and the overnight run spent the rest. At 05:20:47 the first paid call answered HTTP 402
// and `z-ai/glm-5.3-flash` answered 402 1.6 s later — an account condition, not two model faults. Every one
// was filed in `workers/unavailable-models.jsonl` as that model's own transport failure, which struck both
// paid routes off for the rest of the run, so 20 of the 27 retained sources reported
// "worker: No supported viable worker model found" — a worker-selection message that names no billing
// problem at all. `aa-benchmark-fields` had been retained on that pattern for 13 consecutive runs, since
// 2026-09-11, while the site kept publishing.
//
// Three separate defects, one per test below:
//   1. 402 was missing from the account-level status list, so it blacklisted a working model (and burned
//      three identical rounds per arm to learn the same thing).
//   2. the non-OK response body was discarded, so the receipt said "HTTP 402" and never the reason. Two
//      engines read that string on the same day and reached opposite conclusions.
//   3. nothing read the balance, which one GET answers.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ACCOUNT_LEVEL_HTTP, excludedWorkerModels } from '../ops/daily/gauntlet.mjs';
import { completionErrorMessage, providerErrorDetail, PROVIDER_ERROR_EXCERPT } from '../ops/rebuild-2026-09/bin/worker-policy.mjs';
import { openRouterCreditHealth, checkOpenRouterCredits, readOpenRouterCredits, creditCheckConfigured, DAILY_PAID_SPEND_USD, MIN_HEADROOM_DAYS } from '../lib/openrouter-credits.mjs';

const DEEPSEEK = 'deepseek/deepseek-v4-flash-0731';
const GLM = 'z-ai/glm-5.3-flash';

test('D218.1: a 402 is an account condition, so it does not strike the model off', () => {
  for (const status of [401, 402, 403, 429]) {
    assert.ok(ACCOUNT_LEVEL_HTTP.test(`OpenRouter completion HTTP ${status}`), `HTTP ${status} is account-level`);
  }
  // A status the key has nothing to do with is still the route's own problem and still excludes it.
  for (const status of [400, 404, 500, 502, 503]) {
    assert.ok(!ACCOUNT_LEVEL_HTTP.test(`OpenRouter completion HTTP ${status}`), `HTTP ${status} is not account-level`);
  }
  // The body excerpt rides along in the same string; the rule still has to see the status through it.
  assert.ok(ACCOUNT_LEVEL_HTTP.test(completionErrorMessage('OpenRouter', 402, '{"error":{"message":"This request requires more credits."}}')));
  // Once the record is never written, nothing excludes the route. The defect was that it was written at all:
  // an exclusion record for a 402 removes a route that is working the moment the bill is paid.
  assert.deepEqual(excludedWorkerModels([], { role: 'producer' }), []);
  const asWritten = [DEEPSEEK, GLM].map((model) => ({ model, role: 'producer', reason: 'OpenRouter completion HTTP 402', failure: 'transport' }));
  assert.deepEqual(excludedWorkerModels(asWritten, { role: 'producer' }).sort(), [DEEPSEEK, GLM].sort(),
    'the pre-fix records emptied the paid pool — this is what the run did, and why 20 arms said "No supported viable worker model found"');
});

test('D218.1: the runner does not write an exclusion record for an account-level status', async () => {
  const source = await readFile(new URL('../ops/daily/gauntlet.mjs', import.meta.url), 'utf8');
  // The guard is the one place that decides whether a failure becomes an exclusion; pin that it uses the
  // shared rule rather than its own list, which is how 402 came to be missing from one of the two sites.
  assert.match(source, /if \(model && failedFile && !ACCOUNT_LEVEL_HTTP\.test\(reason\)\)/);
  assert.equal(source.match(/HTTP \(401\|402\|403\|429\)/g)?.length, 1, 'the status list exists once, in ACCOUNT_LEVEL_HTTP');
  assert.ok(!/HTTP \(401\|403\|429\)/.test(source), 'no site still carries the list that omitted 402');
});

test('D218.2: a non-OK completion reports the provider’s own reason, bounded to one line', () => {
  // OpenRouter's real 400 body, read live on 2026-09-26 — the shape a 402 uses too.
  const body = '{"error":{"message":"This endpoint\'s maximum context length is 1310720 tokens. However, you requested about 900000001 tokens (1 of text input, 900000000 in the output).","code":400,"metadata":{"provider_name":null}}}';
  const message = completionErrorMessage('OpenRouter', 400, body);
  assert.ok(message.startsWith('OpenRouter completion HTTP 400: This endpoint'), message);
  assert.ok(message.includes('900000000 in the output'), 'the actionable number survives');

  // Bounded: source-health.md clips a reason at 160 characters, so the excerpt has to fit inside one.
  const long = JSON.stringify({ error: { message: 'x'.repeat(400) } });
  assert.equal(providerErrorDetail(long).length, PROVIDER_ERROR_EXCERPT);
  assert.ok(providerErrorDetail(long).endsWith('…'));

  // Flattened and neutral: provider text is data, never layout or instructions.
  assert.equal(providerErrorDetail('{"error":{"message":"line one\\nline\\ttwo"}}'), 'line one line two');
  // A key never appears in an error body, but this string is written to receipts and to Florian's digest.
  assert.equal(providerErrorDetail('{"error":{"message":"bad key sk-or-v1-abcdef1234567890"}}'), 'bad key sk-[redacted]');
  // Non-JSON, plain-string error, and empty bodies: no reason is better than a crash or a bare "[object Object]".
  assert.equal(completionErrorMessage('Router', 502, '<html>Bad Gateway</html>'), 'Router completion HTTP 502: <html>Bad Gateway</html>');
  assert.equal(providerErrorDetail('{"error":"rate limited"}'), 'rate limited');
  for (const empty of ['', '   ', null, undefined, 42]) assert.equal(completionErrorMessage('OpenRouter', 402, empty), 'OpenRouter completion HTTP 402');
  assert.equal(providerErrorDetail('{"nothing":"useful"}'), '{"nothing":"useful"}', 'an unrecognised body is quoted rather than dropped');
});

test('D218.3: the balance is judged, and the day it ran out would have been an alert', () => {
  // The two readings the workstream actually took, plus the state at 05:20:47 that nobody read.
  const exhausted = openRouterCreditHealth({ total_credits: 430.9112268, total_usage: 430.9112268 });
  assert.equal(exhausted.level, 'alert');
  assert.equal(exhausted.remaining_usd, 0);
  assert.match(exhausted.text, /out of credit/);
  assert.match(exhausted.text, /HTTP 402/);

  // 2026-09-25 19:31: $0.137 left. Thin enough to alert a day before the run lost 27 sources.
  const thin = openRouterCreditHealth({ total_credits: 430.9112268, total_usage: 430.774278105 });
  assert.equal(thin.level, 'alert');
  assert.ok(thin.remaining_usd > 0 && thin.remaining_usd < 0.2, `${thin.remaining_usd}`);
  assert.match(thin.text, /\$0\.14 left/);

  // 2026-09-26 20:26, after the top-up: healthy, and the line states the number rather than just "ok".
  const funded = openRouterCreditHealth({ total_credits: 448.9112268, total_usage: 433.06156976 });
  assert.equal(funded.level, 'ok');
  assert.match(funded.text, /\$15\.85 left, about 7 days/);

  // The threshold itself, from both sides.
  assert.equal(openRouterCreditHealth({ total_credits: DAILY_PAID_SPEND_USD * MIN_HEADROOM_DAYS, total_usage: 0 }).level, 'ok');
  assert.equal(openRouterCreditHealth({ total_credits: DAILY_PAID_SPEND_USD * MIN_HEADROOM_DAYS - 0.01, total_usage: 0 }).level, 'alert');
  // A negative balance is possible (a charge lands after the last call) and is not "ok".
  assert.equal(openRouterCreditHealth({ total_credits: 10, total_usage: 11 }).level, 'alert');
  // Garbage is an alert, never a silent pass.
  for (const bad of [{}, { total_credits: 'x', total_usage: 1 }, { total_credits: 1, total_usage: null }]) {
    assert.equal(openRouterCreditHealth(bad).level, 'alert', JSON.stringify(bad));
  }
});

test('D218.3: the check is fail-soft, reads the documented field, and never leaks the key', async () => {
  assert.equal((await checkOpenRouterCredits({ env: {} })).level, 'skip', 'unconfigured is not a failure');
  assert.equal(creditCheckConfigured({ OPENROUTER_API_KEY: 'k' }), true);
  assert.equal(creditCheckConfigured({ OPEN_ROUTER_API_KEY: 'k' }), true);
  assert.equal(creditCheckConfigured({}), false);

  let seen = null;
  const credits = await readOpenRouterCredits({
    env: { OPEN_ROUTER_API_KEY: 'sk-or-v1-secret' },
    fetchImpl: async (url, init) => { seen = { url, init }; return { ok: true, json: async () => ({ data: { total_credits: 5, total_usage: 1 } }) }; },
  });
  assert.deepEqual(credits, { total_credits: 5, total_usage: 1 });
  assert.equal(seen.url, 'https://openrouter.ai/api/v1/credits');
  assert.equal(seen.init.headers.authorization, 'Bearer sk-or-v1-secret');

  // An unreachable or refusing endpoint is an alert whose text carries the status and not the key.
  const failing = await checkOpenRouterCredits({
    env: { OPEN_ROUTER_API_KEY: 'sk-or-v1-secret' },
    fetchImpl: async () => ({ ok: false, status: 401, json: async () => ({}) }),
  });
  assert.equal(failing.level, 'alert');
  assert.match(failing.text, /HTTP 401/);
  assert.ok(!failing.text.includes('sk-or-v1-secret'));
  const thrown = await checkOpenRouterCredits({ env: { OPEN_ROUTER_API_KEY: 'k' }, fetchImpl: async () => { throw new Error('fetch failed'); } });
  assert.equal(thrown.level, 'alert');
  assert.match(thrown.text, /fetch failed/);
});
