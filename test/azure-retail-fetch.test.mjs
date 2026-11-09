import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRetailFetcher, retryAfterMs } from "../lib/azure-retail-fetch.mjs";
import { indexRetailMeters } from "../lib/azure-foundry-catalog.mjs";

const fixture = readFileSync(new URL("./fixtures/azure-retail-kimi-page.json", import.meta.url), "utf8");
const res = (status, body = "", headers = {}) => new Response(status === 200 ? body : "slow down", { status, headers });
const scripted = (...responses) => { const calls = []; const fn = async (url) => { calls.push(url); const r = responses.shift(); if (r instanceof Error) throw r; return r; }; return { fn, calls }; };

test("429 with Retry-After then 200: waits the hinted time and returns the page", async () => {
  const { fn, calls } = scripted(res(429, "", { "Retry-After": "7" }), res(200, fixture));
  const waits = [];
  const f = createRetailFetcher({ fetchImpl: fn, sleep: async (ms) => waits.push(ms) });
  const response = await f.get("https://prices.azure.com/x", {});
  const body = JSON.parse(await response.text());
  assert.deepEqual(waits, [7000]);
  assert.equal(calls.length, 2);
  assert.equal(f.state.retries, 1);
  assert.equal(body.Items.length, 3);
  assert.ok(indexRetailMeters(body.Items).size >= 1);
});

test("429 without Retry-After backs off exponentially; Retry-After is capped at maxDelayMs", async () => {
  const { fn } = scripted(res(429), res(429), res(503, "", { "Retry-After": "9999" }), res(200, fixture));
  const waits = [];
  const f = createRetailFetcher({ fetchImpl: fn, sleep: async (ms) => waits.push(ms), jitter: () => 0.5, baseDelayMs: 1000, maxDelayMs: 30000 });
  await f.get("u", {});
  assert.deepEqual(waits, [1000, 2000, 30000]);
});

test("gives up after maxRetries and when the total wait budget is exhausted", async () => {
  const always = () => ({ fn: async () => res(429) });
  const a = createRetailFetcher({ fetchImpl: always().fn, sleep: async () => {}, maxRetries: 2, baseDelayMs: 1 });
  await assert.rejects(a.get("u", {}), /HTTP 429 \(gave up after 3 attempts\)/);
  const b = createRetailFetcher({ fetchImpl: always().fn, sleep: async () => {}, maxTotalWaitMs: 5000, baseDelayMs: 4000, jitter: () => 0.5 });
  await assert.rejects(b.get("u", {}), /wait budget of 5s exhausted/);
});

test("network errors are retried; other 4xx fail immediately without retry", async () => {
  const { fn } = scripted(new Error("ECONNRESET"), res(200, fixture));
  const f = createRetailFetcher({ fetchImpl: fn, sleep: async () => {}, baseDelayMs: 1 });
  await f.get("u", {});
  assert.equal(f.state.requests, 2);
  const g = createRetailFetcher({ fetchImpl: async () => res(404), sleep: async () => { assert.fail("no sleep"); } });
  await assert.rejects(g.get("u", {}), /HTTP 404/);
  assert.equal(g.state.requests, 1);
});

test("retryAfterMs parses seconds and HTTP dates", () => {
  assert.equal(retryAfterMs("3"), 3000);
  assert.equal(retryAfterMs("Wed, 21 Oct 2026 07:28:10 GMT", Date.parse("Wed, 21 Oct 2026 07:28:00 GMT")), 10000);
  assert.equal(retryAfterMs(null), null);
  assert.equal(retryAfterMs("soon"), null);
});
