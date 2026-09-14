import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { indexRetailMeters, parseAzureRetail } from "../lib/azure-foundry-catalog.mjs";

// Synthetic Retail items; meter names follow the real API's spelling.
const item = (productName, meterName, retailPrice, extra = {}) => ({ productName, meterName, retailPrice, unitOfMeasure: "1M", type: "Consumption", armRegionName: "swedencentral", effectiveStartDate: "2026-08-01T00:00:00Z", ...extra });
const row = (model_name, input, output, product, inMeter, outMeter, extra = {}) => ({ model_name, provider_org: "OpenAI", input_per_1m_usd: input, output_per_1m_usd: output, region: "global", notes: "curated", retail_meters: { product, input: inMeter, output: outMeter }, ...extra });

test("indexRetailMeters: Consumption token units only, first billing region by preference", () => {
  const idx = indexRetailMeters([
    item("P", "a Inp Gl 1M Tokens", 2, { armRegionName: "westeurope" }),
    item("P", "a Inp Gl 1M Tokens", 1),
    item("P", "a Inp Gl 1M Tokens", 9, { type: "Reservation" }),
    item("P", "b Hours", 5, { unitOfMeasure: "1 Hour" }),
  ]);
  assert.equal(idx.size, 1);
  assert.equal([...idx.values()][0].retailPrice, 1);
  assert.throws(() => indexRetailMeters([item("P", "x", Number.NaN)]), /unreadable price/);
});

test("re-prices mapped rows from their named meters, converts 1K meters, keeps unmapped rows, reports new meters", () => {
  const previous = { models: [
    row("GPT-5.6 Sol", 5, 30, "Azure OpenAI GPT5", "5.6 sol ShortCo Inp Std Gl 1M Tokens", "5.6 sol ShortCo Opt Std Gl 1M Tokens"),
    row("DeepSeek-V4 Pro", 1.74, 3.48, "Azure Deepseek Models", "V4 Pro Inp glbl Tokens", "V4 Pro Outp glbl Tokens"),
    { model_name: "Claude Opus 5", input_per_1m_usd: 5, output_per_1m_usd: 25, region: "us", notes: "CCU billing" },
  ] };
  const { models, diff } = parseAzureRetail([
    item("Azure OpenAI GPT5", "5.6 sol ShortCo Inp Std Gl 1M Tokens", 4, { effectiveStartDate: "2026-09-01T00:00:00Z" }),
    item("Azure OpenAI GPT5", "5.6 sol ShortCo Opt Std Gl 1M Tokens", 20),
    item("Azure OpenAI GPT5", "5.6 sol ShortCo Inp Std Gl 1M Tokens Batch", 2),
    item("Azure Deepseek Models", "V4 Pro Inp glbl Tokens", 0.00174, { unitOfMeasure: "1K" }),
    item("Azure Deepseek Models", "V4 Pro Outp glbl Tokens", 0.00348, { unitOfMeasure: "1K" }),
    item("Azure Grok Models", "4.6 Inp Glbl Tokens", 2, { effectiveStartDate: "2026-09-01T00:00:00Z" }),
    item("Azure Grok Models", "4.3 Inp Glbl Tokens", 1.25, { effectiveStartDate: "2026-05-01T00:00:00Z" }),
    item("Azure OpenAI GPT5", "56sol ShCo Inp Fl Gl 1M Tokens", 2, { effectiveStartDate: "2026-09-01T00:00:00Z" }),
    item("Azure OpenAI GPT5", "5.6 sol LongCo Inp Std DZ 1M Tokens", 8.8, { effectiveStartDate: "2026-09-01T00:00:00Z" }),
    item("Azure Deepseek Models", "V4 Pro Inp DZ Tokens", 0.00191, { unitOfMeasure: "1K", effectiveStartDate: "2026-09-01T00:00:00Z" }),
    item("Azure Kimi", "Model 7 Inp glbl Tokens", 3.3, { effectiveStartDate: "2026-09-01T00:00:00Z" }),
  ], { ...previous, ignored_meter_bases: [{ product: "Azure Kimi", base: "Model 7", reason: "unnamed placeholder" }] }, { today: "2026-09-14" });
  assert.equal(models.length, 3);
  assert.deepEqual([models[0].input_per_1m_usd, models[0].output_per_1m_usd], [4, 20]);
  assert.equal(models[0].notes, "curated");
  assert.deepEqual([models[1].input_per_1m_usd, models[1].output_per_1m_usd], [1.74, 3.48]);
  assert.equal(models[2], previous.models[2]);
  assert.deepEqual(diff.price_changed, ["GPT-5.6 Sol: 5/30 -> 4/20 (effective 2026-09-01)"]);
  assert.deepEqual(diff.unmetered, ["Claude Opus 5"]);
  assert.deepEqual(diff.new_meters, ["Azure Grok Models · 4.6 Inp Glbl Tokens = 2 (effective 2026-09-01)"], "flex and batch meters are not new Standard offers; older meters are not new");
});

test("a vanished meter drops its row; swapped input/output keeps the previous prices; mass loss fails closed", () => {
  const previous = { models: [
    row("A", 1, 4, "P", "A Inp Tokens", "A Outp Tokens"),
    row("B", 1, 4, "P", "B Inp Tokens", "B Outp Tokens"),
    row("C", 1, 4, "P", "C Inp Tokens", "C Outp Tokens"),
  ] };
  const live = [item("P", "A Inp Tokens", 16.5), item("P", "A Outp Tokens", 2.75), item("P", "B Inp Tokens", 1), item("P", "B Outp Tokens", 4)];
  const { models, diff } = parseAzureRetail(live, previous);
  assert.deepEqual(models.map((m) => m.model_name), ["A", "B"]);
  assert.equal(models[0], previous.models[0]);
  assert.match(diff.suspicious[0], /^A: input 16\.5 > output 2\.75/);
  assert.deepEqual(diff.removed, ["C (C Inp Tokens no longer listed)"]);
  assert.throws(() => parseAzureRetail([item("P", "B Inp Tokens", 1), item("P", "B Outp Tokens", 4)], previous, { minRetainedShare: 0.5 }), /only 1\/3 mapped rows/);
  assert.throws(() => parseAzureRetail([], previous), /no items/);
  assert.throws(() => parseAzureRetail(live, { models: [{ model_name: "x" }] }), /no retail_meters/);
});

test("committed snapshot: every priced row except documented non-Retail billing names its meters", () => {
  const snapshot = JSON.parse(readFileSync(new URL("../data/raw/azure-foundry.json", import.meta.url)));
  const unmapped = snapshot.models.filter((m) => !m.retail_meters).map((m) => m.model_name);
  assert.deepEqual(unmapped, ["Claude Opus 5"], "Claude on Foundry bills through Marketplace CCUs, not Retail token meters");
  for (const m of snapshot.models.filter((x) => x.retail_meters)) {
    assert.ok(m.retail_meters.product && m.retail_meters.input && m.retail_meters.output, m.model_name);
    assert.ok(Number.isFinite(m.input_per_1m_usd) && Number.isFinite(m.output_per_1m_usd), `${m.model_name} has meters but no price`);
  }
});
