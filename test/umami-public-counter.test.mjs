import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fetchVisitorTotal, readVisitorTotal, UMAMI_COUNTER_ORIGIN, UMAMI_COUNTER_WEBSITE } from "../lib/umami-public-counter.mjs";

test("CR-188: reads plain and wrapped Umami visitor totals, rejecting malformed values", () => {
  assert.equal(readVisitorTotal({ visitors: 123 }), 123);
  assert.equal(readVisitorTotal({ visitors: { value: 45 } }), 45);
  for (const value of [undefined, -1, 1.5, "3", Number.MAX_SAFE_INTEGER + 1, true]) {
    assert.equal(readVisitorTotal({ visitors: value }), null);
  }
});

test("CR-188: requests one fixed site's aggregate with server-side Bearer auth", async () => {
  const calls = [];
  const visits = await fetchVisitorTotal({
    apiKey: "server-only-test-key-value",
    now: 1_800_000_000_000,
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return { ok: true, json: async () => ({ visitors: 7 }) };
    },
  });
  assert.equal(visits, 7);
  assert.equal(calls.length, 1);
  const request = new URL(calls[0].url);
  assert.equal(request.origin, UMAMI_COUNTER_ORIGIN);
  assert.equal(request.pathname, `/api/websites/${UMAMI_COUNTER_WEBSITE}/stats`);
  assert.equal(request.searchParams.get("startAt"), "0");
  assert.equal(request.searchParams.get("endAt"), "1800000000000");
  assert.equal(calls[0].init.headers.authorization, "Bearer server-only-test-key-value");
  assert.equal(calls[0].init.redirect, "error");
});

test("CR-188: fails closed when the key, Umami response, or aggregate is unavailable", async () => {
  await assert.rejects(fetchVisitorTotal({ apiKey: "" }));
  await assert.rejects(fetchVisitorTotal({ apiKey: "server-only-test-key-value", fetchImpl: async () => ({ ok: false, status: 401 }) }));
  await assert.rejects(fetchVisitorTotal({ apiKey: "server-only-test-key-value", fetchImpl: async () => ({ ok: true, json: async () => ({ visitors: "7" }) }) }));
});

test("CR-188: keeps the Umami API key out of the public route and renders the counter in the footer", () => {
  const route = readFileSync(new URL("../app/api/analytics/visits/route.ts", import.meta.url), "utf8");
  const component = readFileSync(new URL("../components/VisitorCounter.tsx", import.meta.url), "utf8");
  const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.match(route, /process\.env\.UMAMI_API_KEY/);
  assert.match(route, /\{ visits \}/);
  assert.doesNotMatch(component, /UMAMI_API_KEY|bh-analytics\.app\.mintapis\.com/);
  assert.match(component, /credentials: "omit"/);
  assert.match(layout, /<VisitorCounter \/>/);
});
