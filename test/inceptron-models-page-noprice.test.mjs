import test from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdtemp, mkdir, cp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { parseInceptronModelsPage, inspectInceptronModelsPage } from "../lib/inceptron-catalog.mjs";

// 2026-11-09: www.inceptron.io/models still lists the models but the Input/Output/Cache-read slots are empty
// (also in the rendered DOM; the framercms payload holds no prices). Lead decision 9 Nov: "list prices withdrawn
// by source" is a successful state with no direct price; a page without model cards still fails closed.
const root = new URL("..", import.meta.url).pathname;
const noPrice = await readFile(new URL("./fixtures/inceptron-models-page-2026-11-09-no-prices.html", import.meta.url), "utf8");
const pricedCard = "Go to playground GLM-5.3 Z.ai Description License Mode Inceptron Optimized Region Input tokens, 1M $1.00 Output tokens, 1M $4.90 Cache read $0.14 Quantization fp4 Size";
const wrap = (inner) => `<html><body>${inner}</body></html>`;

test("classifier: price-less cards = withdrawn, no cards = unrecognised, some priced = priced", () => {
  assert.match(noPrice, /Input tokens, 1M/);
  assert.equal(inspectInceptronModelsPage(noPrice).state, "list_prices_withdrawn_by_source");
  assert.equal(inspectInceptronModelsPage(wrap("<p>Something else</p>")).state, "unrecognised");
  assert.equal(inspectInceptronModelsPage("").state, "unrecognised");
  const mixed = inspectInceptronModelsPage(wrap(`<p>${pricedCard}</p>${noPrice}`));
  assert.equal(mixed.state, "priced");
  assert.equal(mixed.prices.length, 1);
  assert.equal(mixed.prices[0].input_per_1m_usd, 1);
});

test("parseInceptronModelsPage keeps failing closed without any price", () => {
  assert.throws(() => parseInceptronModelsPage(noPrice), /no priced model cards/);
  assert.throws(() => parseInceptronModelsPage(wrap("<p>x</p>")), /no priced model cards/);
  assert.equal(parseInceptronModelsPage(wrap(`<p>${pricedCard}</p>`))[0].name, "GLM-5.3");
});

// Runs the real collector script in a temp copy of lib/ + scripts/ with fetch mocked via --import.
async function runCollector(html, { listUrlHtml = html, previous } = {}) {
  const dir = await mkdtemp(join(tmpdir(), "inceptron-collector-"));
  await mkdir(join(dir, "data/raw"), { recursive: true });
  await cp(join(root, "lib"), join(dir, "lib"), { recursive: true });
  await cp(join(root, "scripts/fetch-inceptron-catalog.mjs"), join(dir, "scripts/fetch-inceptron-catalog.mjs"), { recursive: true }).catch(async () => {
    await mkdir(join(dir, "scripts"), { recursive: true });
    await cp(join(root, "scripts/fetch-inceptron-catalog.mjs"), join(dir, "scripts/fetch-inceptron-catalog.mjs"));
  });
  await writeFile(join(dir, "package.json"), '{"type":"module"}');
  await writeFile(join(dir, "data/raw/inceptron.json"), JSON.stringify(previous));
  const api = { data: [{ id: "zai-org/GLM-5.3", name: "GLM 5.3", owned_by: "zai-org", quantization: "fp4", context_length: 1048576, input_modalities: ["text"], output_modalities: ["text"], supported_features: ["chat"], pricing: { prompt: "0.000001", completion: "0.0000049", input_cache_reads: "0.00000014" } }] };
  await writeFile(join(dir, "mock.mjs"), `globalThis.fetch = async (u) => new Response(String(u).includes("api.inceptron.io") ? ${JSON.stringify(JSON.stringify(api))} : ${JSON.stringify(listUrlHtml)}, { status: 200 });`);
  const r = spawnSync(process.execPath, ["--import", join(dir, "mock.mjs"), join(dir, "scripts/fetch-inceptron-catalog.mjs")], { cwd: dir, encoding: "utf8" });
  return { r, snapshot: JSON.parse(await readFile(join(dir, "data/raw/inceptron.json"), "utf8")) };
}
const previous = { source: "Inceptron", collected_at: "2026-11-04", models: [
  { model_name: "GLM 5.3", provider_org: "Z.ai", api_model_id: "zai-org/GLM-5.3", input_per_1m_usd: 1.4, output_per_1m_usd: 4.4, cache_read_per_1m_usd: 0.26, region: "eu", notes: "zai-org/GLM-5.3" },
] };

test("collector: withdrawn state succeeds, drops direct prices, writes availability, keeps api_catalog_price", async () => {
  const { r, snapshot } = await runCollector(wrap(noPrice), { previous });
  assert.equal(r.status, 0, r.stderr);
  const m = snapshot.models[0];
  assert.equal(m.input_per_1m_usd, undefined);
  assert.equal(m.output_per_1m_usd, undefined);
  assert.equal(m.cache_read_per_1m_usd, undefined);
  assert.equal(m.price_status, "n/a");
  assert.equal(m.api_catalog_price.input_per_1m_usd, 1);
  assert.equal(m.api_catalog_price.output_per_1m_usd, 4.9);
  assert.equal(snapshot.availability.state, "list_prices_withdrawn_by_source");
  assert.equal(snapshot.availability.observed_since, "2026-11-05");
  assert.equal(snapshot.availability.url, "https://www.inceptron.io/models");
  assert.ok(!Number.isNaN(Date.parse(snapshot.availability.checked_at)));
  assert.match(snapshot.availability.note, /without prices/);
});

test("collector: page without cards still fails, snapshot untouched", async () => {
  const { r, snapshot } = await runCollector(wrap("<p>maintenance</p>"), { previous });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /no model cards/);
  assert.deepEqual(snapshot, previous);
});

test("collector: priced cards reappear -> direct price back, availability cleared", async () => {
  const withdrawn = { ...previous, availability: { state: "list_prices_withdrawn_by_source" } };
  const { r, snapshot } = await runCollector(wrap(`<p>${pricedCard}</p>`), { previous: withdrawn });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(snapshot.availability, undefined);
  assert.equal(snapshot.models[0].input_per_1m_usd, 1);
  assert.equal(snapshot.models[0].price_source.basis, "Inceptron list price (direct API)");
});
