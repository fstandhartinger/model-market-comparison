import test from "node:test";
import assert from "node:assert/strict";
import { parseTrustedTokensCatalog, statusFor, derivedModelName, ORG_BY_VENDOR } from "../lib/trustedtokens-catalog.mjs";

const fx = { rate: 1.2, date: "2026-09-15" };
const row = (slug, { input = 1e-6, output = 2e-6, cache = 1e-7, ctx = 131072, attributes = ["production-stable"] } = {}) => ({
  name: slug, providers: [{ pricing: { input, output, cache_read: cache }, max_total_tokens: ctx }], default_provider_index: 0, attributes,
});
const page = (rows) => JSON.stringify({ models: [...rows] });
const nine = (extra = []) => [row("zai-org/GLM-5.3"), row("zai-org/GLM-5.2"), row("zai-org/GLM-5.3-Flash"), row("openai/gpt-oss-120b"), row("google/gemma-4-31b-it"), row("Qwen/Qwen3.5-397B-A17B-FP8"), row("Qwen/Qwen3.8-27B"), row("deepseek-ai/DeepSeek-V4-Flash-0731"), ...extra];

test("parses the catalog shape: per-token EUR normalized to per-1M EUR and USD", () => {
  const fixture = [row("zai-org/GLM-5.3", { input: 1.5e-6, output: 4.5e-6, cache: 3e-7, ctx: 230000, attributes: ["flagship", "production-stable"] }), ...nine().slice(1)];
  const { models, skipped, diff } = parseTrustedTokensCatalog(page(fixture), { models: [] }, fx);
  assert.equal(models.length, 8);
  const m = models.find((x) => x.api_model_id === "zai-org/GLM-5.3");
  assert.equal(m.model_name, "GLM 5.3");
  assert.equal(m.provider_org, "Z.ai");
  assert.equal(m.input_per_1m_eur, 1.5);
  assert.equal(m.output_per_1m_eur, 4.5);
  assert.equal(m.cache_read_per_1m_eur, 0.3);
  assert.equal(m.input_per_1m_usd, 1.8);
  assert.equal(m.output_per_1m_usd, 5.4);
  assert.equal(m.cache_read_per_1m_usd, 0.36);
  assert.equal(m.context_length, 230000);
  assert.equal(m.status, "production");
  assert.equal(m.eu_hosted, true);
  assert.equal(m.hosting_class, "sovereign_germany");
  assert.equal(m.region, "eu");
  assert.match(m.notes, /TNG-operated GPU inference in Germany/);
  assert.deepEqual(skipped, []);
  assert.equal(diff.added.length, 8);
});

test("statusFor maps the lifecycle attributes; derivedModelName and orgs cover the catalog vendors", () => {
  assert.equal(statusFor(["deprecated"]), "deprecated");
  assert.equal(statusFor(["experimental"]), "experimental");
  assert.equal(statusFor(["flagship", "production-stable"]), "production");
  assert.equal(statusFor([]), "unknown");
  assert.equal(derivedModelName("tngtech/DeepSeek-TNG-R1T2-Chimera"), "DeepSeek TNG R1T2 Chimera");
  assert.equal(ORG_BY_VENDOR["zai-org"], "Z.ai");
  assert.equal(ORG_BY_VENDOR.qwen, "Alibaba");
  assert.equal(ORG_BY_VENDOR.tngtech, "TNG Technology Consulting");
});

test("rows without a positive input or output price are skipped (not chat models)", () => {
  const { models, skipped } = parseTrustedTokensCatalog(page(nine([row("mistralai/embed-large", { input: null })])), { models: [] }, fx);
  assert.equal(models.length, 8);
  assert.deepEqual(skipped, ["mistralai/embed-large"]);
});

test("fails closed: non-JSON, no models array, too few models, duplicates, odd names, weird prices", () => {
  assert.throws(() => parseTrustedTokensCatalog("<html>sign in</html>", { models: [] }, fx), /not JSON/);
  assert.throws(() => parseTrustedTokensCatalog("{}", { models: [] }, fx), /no models array/);
  assert.throws(() => parseTrustedTokensCatalog(page([row("zai-org/GLM-5.3")]), { models: [] }, fx), /only 1 catalog models/);
  assert.throws(() => parseTrustedTokensCatalog(page(nine([row("zai-org/GLM-5.3")])), { models: [] }, fx), /listed twice/);
  assert.throws(() => parseTrustedTokensCatalog(page(nine([row("GLM 5.3")])), { models: [] }, fx), /unexpected model name/);
  assert.throws(() => parseTrustedTokensCatalog(page(nine([row("qwen/qwen3-weird", { output: 0.5 })])), { models: [] }, fx), /unreadable output price/);
  assert.throws(() => parseTrustedTokensCatalog(page(nine([row("qwen/qwen3-weird-2", { ctx: "big" })])), { models: [] }, fx), /unreadable max_total_tokens/);
  assert.throws(() => parseTrustedTokensCatalog(page(nine()), { models: [] }, null), /no FX rate/);
});

test("diff tracks added/removed/eur price changes, keeps curated org overrides, refuses large loss", () => {
  const first = parseTrustedTokensCatalog(page(nine()), { models: [] }, fx).models;
  const previous = { models: first.map((m) => ({ ...m, provider_org: "Curated Org" })) };
  const changed = page(nine().slice(0, 8).map((r, i) => (i === 0 ? row("zai-org/GLM-5.3", { input: 2e-6 }) : r)));
  const { models, diff } = parseTrustedTokensCatalog(changed, previous, fx);
  assert.equal(models.length, 8);
  assert.deepEqual(diff.removed, []);
  assert.deepEqual(diff.added, []);
  assert.deepEqual(diff.eur_price_changed, ["zai-org/GLM-5.3"]);
  assert.equal(models[0].provider_org, "Curated Org");
  // Large loss: the catalog-count gate needs ≥ 8 current rows, so use 18 → 8.
  const rows18 = Array.from({ length: 18 }, (_, i) => row(`zai-org/GLM-5.${i + 10}`));
  const prev18 = { models: parseTrustedTokensCatalog(page(rows18), { models: [] }, fx).models };
  assert.throws(() => parseTrustedTokensCatalog(page(rows18.slice(0, 8)), prev18, fx), /only 8\/18 previous models still listed/);
});

test("keeps deprecated rows with their lifecycle (never silently dropped)", () => {
  const { models } = parseTrustedTokensCatalog(page(nine().slice(0, 8).concat([row("zai-org/GLM-5.2-old", { attributes: ["deprecated"] })])), { models: [] }, fx);
  assert.equal(models.find((m) => m.api_model_id === "zai-org/GLM-5.2-old").status, "deprecated");
});

// The 2026-10 site rebuild moved the catalog to /api/public/models with extra fields on each row
// (short_name, capabilities, license, supported_endpoints, lifecycle/mode per provider,
// top-level default_provider). The parser must accept the richer payload and keep ignoring extras.
const publicRow = (slug, { input = 1e-6, output = 2e-6, cache = 1e-7, ctx = 131072, attributes = ["production-stable"] } = {}) => ({
  name: slug,
  short_name: `TT: ${slug.split("/").pop()}`,
  short_description: `${slug} description.`,
  providers: [{ provider: "tng", tokens_per_second: 97, lifecycle: { state: "stable" }, mode: "chat", pricing: { mode: "chat", input, output, cache_read: cache, price_update: null }, max_total_tokens: ctx, max_input_length: ctx - 1 }],
  default_provider_index: 0,
  capabilities: ["chat", "tools"],
  attributes,
  license: { name: "MIT", url: "https://example.com/license" },
  supported_endpoints: ["/v1/chat/completions"],
  model_parameters: ["temperature"],
  hugging_face_id: slug,
  quantization: "nvfp4",
  default: true,
  mode: "chat",
  max_output_tokens: 8192,
});
const publicPage = (rows) => JSON.stringify({ models: [...rows], default_provider: "tng" });

test("accepts the /api/public/models payload shape (2026-10 site rebuild)", () => {
  const rows = [publicRow("zai-org/GLM-5.3", { input: 1.5e-6, output: 4.5e-6, cache: 3e-7, ctx: 230000, attributes: ["flagship", "production-stable"] }),
    publicRow("zai-org/GLM-5.2", { input: 1.5e-6, output: 4.5e-6, attributes: ["deprecated"] }),
    publicRow("zai-org/GLM-5.3-Flash", { input: 3e-7, output: 6e-7, attributes: ["experimental"] }),
    publicRow("tngtech/DeepSeek-TNG-R1T2-Chimera"),
    publicRow("google/gemma-4-26B-A4B-it", { input: 3e-7, output: 8e-7, attributes: ["experimental"] }),
    publicRow("openai/gpt-oss-120b", { input: 1.5e-7, output: 6e-7, attributes: ["production-stable", "long-term-stable"] }),
    publicRow("Qwen/Qwen3.6-35B-A3B-FP8", { input: 2.5e-7, output: 1.5e-6, attributes: [] }),
    publicRow("deepseek-ai/DeepSeek-V4.1-Flash-1017", { input: 3e-7, output: 6e-7, attributes: ["experimental"] }),
    publicRow("Qwen/Qwen3.8-27B", { input: 4e-7, output: 2.7e-6 })];
  const { models, skipped } = parseTrustedTokensCatalog(publicPage(rows), { models: [] }, fx);
  assert.equal(models.length, 9);
  assert.deepEqual(skipped, []);
  const m = models.find((x) => x.api_model_id === "zai-org/GLM-5.3");
  assert.equal(m.model_name, "GLM 5.3");
  assert.equal(m.provider_org, "Z.ai");
  assert.equal(m.input_per_1m_eur, 1.5);
  assert.equal(m.output_per_1m_eur, 4.5);
  assert.equal(m.context_length, 230000);
  assert.equal(m.status, "production");
  assert.equal(models.find((x) => x.api_model_id === "Qwen/Qwen3.6-35B-A3B-FP8").status, "unknown");
  assert.match(m.notes, /trustedtokens\.eu\/api\/public\/models zai-org\/GLM-5\.3/);
});

test("must still fail: a dead-endpoint answer (404 page/text) is not a catalog", () => {
  assert.throws(() => parseTrustedTokensCatalog("Not Found", { models: [] }, fx), /not JSON/);
  assert.throws(() => parseTrustedTokensCatalog('<html><body><h1>404</h1><p>/api/service/models</p></body></html>', { models: [] }, fx), /not JSON/);
  assert.throws(() => parseTrustedTokensCatalog('{"default_provider":"tng"}', { models: [] }, fx), /no models array/);
});
