// CR-60.1/60.3 (2026-09-16): Union Alpha, a stealth model, is in the catalog with its free OpenRouter preview route;
// a $0 route is never a paid price and is labelled as a stealth preview.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { freeRouteLabel, isFreeRoute, isStealthPreview, paidRoutes } from "../lib/free-route.mjs";

const ds = JSON.parse(readFileSync(new URL("../data/dataset.json", import.meta.url), "utf8"));

test("Union Alpha is a catalog model with only its free stealth preview route", () => {
  const rows = ds.models.filter((m) => m.family_key === "union-alpha");
  assert.equal(rows.length, 1);
  const [m] = rows;
  assert.equal(m.org, "Union Alpha");
  assert.equal(m.open_weights, false);
  assert.equal(m.release_date, "2026-09-16");
  const offers = m.offers.filter((o) => o.or_model_id === "stealth/union-alpha");
  assert.equal(offers.length, 1);
  assert.ok(isStealthPreview(offers[0]));
  assert.equal(paidRoutes(m.offers).length, 0, "no paid price is invented");
  assert.ok(ds.providers.some((p) => p.provider === "Stealth" && !p.eu_hosted && !p.non_us && p.country == null));
});

test("free-route labels", () => {
  assert.equal(freeRouteLabel({ or_model_id: "stealth/union-alpha", endpoint_tag: "stealth", input_per_1m: 0, output_per_1m: 0 }), "free (stealth preview)");
  assert.equal(freeRouteLabel({ or_model_id: "qwen/qwen3.8-27b:free", input_per_1m: 0, output_per_1m: 0 }), "free");
  assert.equal(isStealthPreview({ or_model_id: "stealth/x", input_per_1m: 1, output_per_1m: 2 }), false, "a priced stealth route is not a free preview");
  assert.ok(isFreeRoute({ or_model_id: "stealth/union-alpha", input_per_1m: 0, output_per_1m: 0 }));
});
