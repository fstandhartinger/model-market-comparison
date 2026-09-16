// CR-63.2 (2026-09-16): /eu was empty for a fresh visitor — its curated family list had gone stale (deprecated
// families) and the global Featured default removed the rest. Fresh defaults must leave rows with EU prices.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const ds = JSON.parse(read("data/dataset.json"));

test("every /eu SOTA family is current, open-weight and in the catalog", () => {
  const keys = [...read("app/eu/page.tsx").matchAll(/\{ key: "([^"]+)", name:/g)].map((m) => m[1]);
  assert.ok(keys.length >= 5);
  for (const key of keys) {
    const rows = ds.models.filter((m) => m.family_key === key);
    assert.ok(rows.length, `${key} exists`);
    assert.ok(rows.some((m) => !m.deprecated), `${key} is not deprecated (Hide deprecated is a default)`);
    assert.ok(rows.some((m) => m.open_weights), `${key} is open weights`);
  }
  const withEu = keys.filter((key) => ds.models.some((m) => m.family_key === key && !m.deprecated && (m.offers || []).some((o) => o.eu_hosted || o.eu_policy_equivalent)));
  assert.ok(withEu.length >= 5, `at least five families have an EU route (${withEu.join(", ")})`);
});

test("the EU table does not apply the global Featured shortlist and offers a reset when empty", () => {
  const src = read("components/EuSotaTable.tsx");
  assert.doesNotMatch(src, /s\.featured && !model\.featured/);
  assert.match(src, />Reset filters<\/button>/);
});
