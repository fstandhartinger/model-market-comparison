import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { crossCheckProviderMeta } from "../lib/provider-meta-crosscheck.mjs";

const filler = Array.from({ length: 60 }, (_, i) => ({ name: `Filler ${i}`, headquarters: "United States" }));
const policy = (rows, retrieved_at = "2026-09-14T05:14:46.238Z") => ({ source: { retrieved_at }, providers: [...rows, ...filler] });
const previous = () => ({
  collected_at: "2026-07-12",
  country_disputes: { Cohere: { openrouter: "United States", reason: "HQ Toronto" } },
  providers: {
    OpenAI: { country: "US", eu_hosted: false, non_us: false },
    Mistral: { country: "France", eu_hosted: true, non_us: true },
    Cohere: { country: "Canada", eu_hosted: false, non_us: true },
    "Z.AI": { country: "China", eu_hosted: false, non_us: true },
    Liquid: { country: "US", eu_hosted: false, non_us: false },
    Scaleway: { country: "France", eu_hosted: true, non_us: true },
  },
});
const OR = [
  { name: "OpenAI", headquarters: "United States" },
  { name: "mistral", headquarters: "France" },
  { name: "Cohere", headquarters: "United States" },
  { name: "Z.AI", headquarters: "Singapore" },
  { name: "Liquid", headquarters: null },
];

test("crossCheckProviderMeta: agreements, explained and new disagreements, missing rows; curated values untouched", () => {
  const before = previous();
  const next = crossCheckProviderMeta(before, policy(OR), { minMatched: 5 });
  const x = next.openrouter_crosscheck;
  assert.equal(x.agree, 2); // "United States" = "US"; names match case-insensitively
  assert.deepEqual(x.explained, [{ provider: "Cohere", curated: "Canada", openrouter: "United States" }]);
  assert.deepEqual(x.disagreements, [{ provider: "Z.AI", curated: "China", openrouter: "Singapore" }]);
  assert.deepEqual(x.no_headquarters, ["Liquid"]);
  assert.deepEqual(x.not_listed, ["Scaleway"]);
  assert.deepEqual(next.providers, before.providers);
  assert.equal(next.collected_at, "2026-09-14"); // the OpenRouter data's date, not the run's
  assert.equal(next.judgments_checked_at, "2026-07-12");
});

test("crossCheckProviderMeta: a second run keeps the judgment date; an explanation covers only the value it was written about", () => {
  const first = crossCheckProviderMeta(previous(), policy(OR), { minMatched: 5 });
  const moved = OR.map((r) => (r.name === "Cohere" ? { ...r, headquarters: "Canada" } : r));
  const second = crossCheckProviderMeta(first, policy(moved, "2026-09-15T05:00:00Z"), { minMatched: 5 });
  assert.equal(second.judgments_checked_at, "2026-07-12");
  assert.equal(second.collected_at, "2026-09-15");
  assert.equal(second.openrouter_crosscheck.agree, 3);
  const changed = OR.map((r) => (r.name === "Cohere" ? { ...r, headquarters: "Germany" } : r));
  const third = crossCheckProviderMeta(first, policy(changed), { minMatched: 5 });
  assert.ok(third.openrouter_crosscheck.disagreements.some((d) => d.provider === "Cohere" && d.openrouter === "Germany"));
});

test("crossCheckProviderMeta: fails closed on a thin table, renamed providers or an undated table", () => {
  assert.throws(() => crossCheckProviderMeta(previous(), { source: { retrieved_at: "2026-09-14" }, providers: OR }), /refusing/);
  assert.throws(() => crossCheckProviderMeta(previous(), policy(OR)), /names changed/); // default minMatched 40
  assert.throws(() => crossCheckProviderMeta(previous(), policy(OR, "")), /retrieved_at/);
  assert.throws(() => crossCheckProviderMeta({ providers: {} }, policy(OR)), /no providers/);
});

test("committed snapshot: every disagreement with OpenRouter is explained", () => {
  const meta = JSON.parse(readFileSync(new URL("../data/raw/provider-meta.json", import.meta.url), "utf8"));
  const table = JSON.parse(readFileSync(new URL("../data/raw/openrouter-data-policy.json", import.meta.url), "utf8"));
  const next = crossCheckProviderMeta(meta, table);
  assert.deepEqual(next.openrouter_crosscheck.disagreements, []);
  assert.ok(next.openrouter_crosscheck.agree >= 40);
  assert.deepEqual(next.providers, meta.providers);
});
