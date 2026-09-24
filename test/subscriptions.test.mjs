import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { subscriptionView, validateCatalog, companyUse } from "../lib/subscriptions.mjs";

const catalog = JSON.parse(readFileSync(new URL("../data/raw/subscriptions.json", import.meta.url), "utf8"));
const ids = (view) => view.plans.map((p) => p.id);

test("subscription catalog is structurally sourced", () => {
  assert.deepEqual(validateCatalog(catalog), []);
  const broken = structuredClone(catalog);
  broken.plans[0].included = "";
  broken.vendors.openai.quote_note = undefined;
  assert.equal(validateCatalog(broken).length, 2);
});

test("companies never see consumer plans whose terms exclude business use", () => {
  const view = subscriptionView(catalog, { isCompany: true });
  for (const p of view.plans) assert.notEqual(p.company_use, "not_allowed", p.id);
  assert.ok(!ids(view).includes("anthropic-claude-pro"));
  assert.ok(!ids(view).includes("google-ai-pro"));
  assert.ok(ids(view).includes("anthropic-claude-team"));
  assert.ok(ids(view).includes("cursor-pro"), "Cursor's terms allow entity use");
  const hidden = catalog.plans.filter((p) => companyUse(catalog, p) === "not_allowed").length;
  assert.equal(view.hiddenForCompany, hidden);
  assert.ok(hidden > 0);
});

test("individuals see consumer plans and no business seats", () => {
  const view = subscriptionView(catalog, { isCompany: false });
  assert.ok(view.plans.every((p) => p.audience === "individual"));
  assert.ok(ids(view).includes("anthropic-claude-pro"));
  assert.equal(view.hiddenForCompany, 0);
});

test("break-even uses the vendor's best-scoring priced model in view", () => {
  const rows = [
    { id: "a", name: "Claude A", org: "Anthropic", score: 90, cost: 0.4 },
    { id: "b", name: "Claude B", org: "Anthropic", score: 95, cost: 0.03 },
    { id: "c", name: "Claude C", org: "Anthropic", score: 99, cost: null },
    { id: "d", name: "Claude D", org: "Anthropic", score: 98, cost: 0 },
  ];
  const pro = subscriptionView(catalog, { rows }).plans.find((p) => p.id === "anthropic-claude-pro");
  assert.equal(pro.reference.id, "b");
  assert.equal(pro.breakEvenTasks, Math.floor(20 / 0.03));
});

test("no break-even without a reference, a price or a flat rate", () => {
  const rows = [{ id: "x", name: "X", org: "Other vendor", score: 90, cost: 0.1 }];
  const view = subscriptionView(catalog, { rows });
  const byId = new Map(view.plans.map((p) => [p.id, p]));
  assert.equal(byId.get("anthropic-claude-pro").breakEvenTasks, null, "no Anthropic model in view");
  assert.equal(byId.get("openai-chatgpt-plus").breakEvenTasks, null, "no OpenAI model in view");
  assert.equal(byId.get("github-copilot-pro").breakEvenTasks, null, "multi-vendor credit plan");
  const enterprise = subscriptionView(catalog, { isCompany: true, rows: [{ id: "c", name: "C", org: "Anthropic", score: 1, cost: 1 }] })
    .plans.find((p) => p.id === "anthropic-claude-enterprise");
  assert.equal(enterprise.breakEvenTasks, null, "seat plus API usage is not a flat rate");
});


test("refreshed OpenAI, xAI, and GitHub plan values carry source dates and receipts", () => {
  const byId = new Map(catalog.plans.map((p) => [p.id, p]));
  assert.equal(byId.get("openai-chatgpt-plus").usd_per_month, 20);
  assert.equal(byId.get("openai-chatgpt-pro-100").usd_per_month, 100);
  const pro200 = byId.get("openai-chatgpt-pro-200");
  assert.equal(pro200.usd_per_month, 200);
  assert.match(pro200.included, /new sign-ups\/upgrades paused since 2026-09-10/);
  assert.equal(pro200.source_checked_at, "2026-09-24");
  assert.match(pro200.source_receipts[0].evidence_receipt_sha256, /^[a-f0-9]{64}$/);
  const grok = byId.get("xai-supergrok");
  assert.equal(grok.usd_per_month, 30);
  assert.match(grok.included, /no numeric quota/);
  assert.equal(grok.source_url, "https://x.ai/pricing");
  assert.equal(grok.source_checked_at, "2026-09-24");
  assert.equal(byId.get("github-copilot-business").source_receipts.length, 3);
});
