import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { offerChannel, channelTitle, priceNotAvailable } from "../lib/offer-channel.mjs";

// CR-329.1 (Simon, 7 Oct 2026): every price says which channel it is for, and where/when it was read.
test("labels OpenRouter and direct channels with their source and day", () => {
  const viaOr = offerChannel({ platform: "OpenRouter", provider: "Inceptron", or_model_id: "z-ai/glm-5.3" }, "2026-10-07");
  assert.equal(viaOr.label, "via OpenRouter");
  assert.equal(viaOr.url, "https://openrouter.ai/z-ai/glm-5.3/providers");
  assert.match(channelTitle(viaOr), /^Price via OpenRouter: OpenRouter's price for Inceptron's endpoint .*collected 2026-10-07\.$/);
  const direct = offerChannel({ platform: "Inceptron", provider: "Inceptron", price_source: { url: "https://www.inceptron.io/models", date: "2026-10-07", basis: "Inceptron list price (direct API)" } });
  assert.equal(direct.label, "direct");
  assert.equal(channelTitle(direct), "Direct price: Inceptron list price (direct API) (https://www.inceptron.io/models), collected 2026-10-07.");
  assert.equal(offerChannel({ platform: "AWS Bedrock", provider: "Anthropic" }).label, "direct · AWS Bedrock");
  assert.equal(priceNotAvailable({ price_status: "n/a", input_per_1m: null, output_per_1m: null }), true);
  assert.equal(priceNotAvailable({ input_per_1m: 1.4, output_per_1m: 4.4 }), false);
});

test("dataset: every direct offer names its price source; no direct Inceptron row equals the OpenRouter feed price", async () => {
  const ds = JSON.parse(await readFile(new URL("../data/dataset.json", import.meta.url), "utf8"));
  const raw = JSON.parse(await readFile(new URL("../data/raw/inceptron.json", import.meta.url), "utf8"));
  const unsourced = [];
  for (const m of ds.models) for (const o of m.offers) {
    if (o.unit !== "per_1m_token" || o.platform === "OpenRouter" || o.platform === "Artificial Analysis") continue;
    if (!o.price_source?.url || !o.price_source?.date) unsourced.push(`${m.id} @ ${o.platform}`);
  }
  assert.deepEqual([...new Set(unsourced.map((s) => s.split(" @ ")[1]))], [], "direct offers without a price source");
  for (const row of raw.models) {
    assert.ok(row.price_source?.url?.startsWith("https://www.inceptron.io/"), `${row.model_name} direct price must come from Inceptron's own list`);
    if (row.input_per_1m_usd == null) { assert.equal(row.price_status, "n/a"); continue; }
    const feed = row.api_catalog_price;
    if (feed) assert.ok(!(feed.input_per_1m_usd === row.input_per_1m_usd && feed.output_per_1m_usd === row.output_per_1m_usd && row.price_source.url.includes("api.")), row.model_name);
  }
});
