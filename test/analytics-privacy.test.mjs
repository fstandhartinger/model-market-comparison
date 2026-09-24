import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeAnalyticsPayload } from "../lib/analytics-privacy.mjs";

const context = {
  origin: "https://www.benchmarkheaven.com",
  modelIds: new Set(["provider/model-a", "model-b"]),
  modelFamilyIds: new Set(["model-family"]),
  jevSystemIds: new Set(["jev-1.13.0", "hopper", "system"]),
};

test("analytics retains only canonical public compare model IDs", () => {
  const clean = sanitizeAnalyticsPayload({
    url: "/compare?model=provider%2Fmodel-a&model=someone%40example.com&model=unknown-model&campaign=private#account",
    referrer: "https://news.ycombinator.com/item?id=private",
    title: "Private page title",
    language: "en-US",
    screen: "1920x1080",
  }, context);

  assert.equal(clean.url, "/compare?model=provider%2Fmodel-a");
  assert.equal(clean.referrer, "https://news.ycombinator.com/");
  assert.equal("title" in clean, false);
  assert.equal("language" in clean, false);
  assert.equal("screen" in clean, false);
});

test("analytics retains only a known, distinct pair on the JevBench page", () => {
  const clean = sanitizeAnalyticsPayload({
    url: "/jev-models?compare=jev-1.13.0%2Chopper&query=private#compare",
    referrer: "https://benchmarkheaven.com/compare?model=model-b",
  }, context);
  assert.equal(clean.url, "/jev-models");

  const known = sanitizeAnalyticsPayload({ url: "/jev-models?compare=jev-1.13.0%2Chopper" }, context);
  assert.equal(known.url, "/jev-models?compare=jev-1.13.0%2Chopper");
});

test("analytics strips same-site referrers and rejects cross-origin event URLs", () => {
  const clean = sanitizeAnalyticsPayload({
    url: "/jev-models/system?token=private",
    referrer: "https://benchmarkheaven.com/compare?model=model-b",
  }, context);
  assert.equal(clean.url, "/jev-models/system");
  assert.equal(clean.referrer, "");

  const unknown = sanitizeAnalyticsPayload({ url: "/jev-models/person@example.com?token=private" }, context);
  assert.equal(unknown.url, "/other");

  const family = sanitizeAnalyticsPayload({ url: "/models/model-family?email=private" }, context);
  assert.equal(family.url, "/models/model-family");

  assert.equal(sanitizeAnalyticsPayload({ url: "https://attacker.example/path" }, context), false);
});
