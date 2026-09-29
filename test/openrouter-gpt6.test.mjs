import test from "node:test";
import assert from "node:assert/strict";
import {
  OPENROUTER_GPT6_PRIORITY_IDS,
  openRouterGpt6Alias,
  selectOpenRouterEfficiencyModels,
} from "../lib/openrouter-gpt6.mjs";

test("OpenRouter GPT-6 Pro route IDs resolve to their official family and preserve mode", () => {
  assert.deepEqual(openRouterGpt6Alias("openai/gpt-6-astra-pro"), {
    familyKey: "gpt-6-astra", variant: "pro-mode", displayName: "GPT-6 Astra (Pro mode)", reasoningMode: "pro",
  });
  assert.deepEqual(openRouterGpt6Alias("openai/gpt-6-sol-pro"), {
    familyKey: "gpt-6-sol", variant: "pro-mode", displayName: "GPT-6 Sol (Pro mode)", reasoningMode: "pro",
  });
  assert.deepEqual(openRouterGpt6Alias("openai/gpt-6-luna-pro"), {
    familyKey: "gpt-6-luna", variant: "pro-mode", displayName: "GPT-6 Luna (Pro mode)", reasoningMode: "pro",
  });
  assert.equal(openRouterGpt6Alias("openai/gpt-6-astra"), null);
  assert.equal(openRouterGpt6Alias("openai/gpt-6-astra-pro:batch"), null);
});

test("daily OpenRouter selection rotates one GPT-6 route and keeps three general slots", () => {
  const catalogIds = new Set([
    ...OPENROUTER_GPT6_PRIORITY_IDS,
    "vendor/model-old", "vendor/model-middle", "vendor/model-new", "vendor/model-newest",
  ]);
  const attempts = {
    "openai/gpt-6-astra": { collected_at: "2026-09-22T00:00:00Z" },
    "openai/gpt-6-sol": { collected_at: "2026-09-23T00:00:00Z" },
    "openai/gpt-6-luna": { collected_at: "2026-09-24T00:00:00Z" },
    "openai/gpt-6-astra-pro": { collected_at: "2026-09-20T00:00:00Z" },
    "openai/gpt-6-sol-pro": { collected_at: "2026-09-21T00:00:00Z" },
    "openai/gpt-6-luna-pro": { collected_at: "2026-09-19T00:00:00Z" },
    "vendor/model-old": { collected_at: "2026-09-01T00:00:00Z" },
    "vendor/model-middle": { collected_at: "2026-09-02T00:00:00Z" },
    "vendor/model-new": { collected_at: "2026-09-03T00:00:00Z" },
    "vendor/model-newest": { collected_at: "2026-09-04T00:00:00Z" },
  };

  assert.deepEqual(selectOpenRouterEfficiencyModels({ catalogIds, attempts, limit: 4 }), [
    "openai/gpt-6-luna-pro", "vendor/model-old", "vendor/model-middle", "vendor/model-new",
  ]);
});

test("daily OpenRouter selection falls back to the catalog rotation when no GPT-6 IDs exist", () => {
  assert.deepEqual(selectOpenRouterEfficiencyModels({
    catalogIds: new Set(["vendor/older", "vendor/newer"]),
    attempts: { "vendor/older": { collected_at: "2026-09-01" }, "vendor/newer": { collected_at: "2026-09-02" } },
    limit: 1,
  }), ["vendor/older"]);
});
