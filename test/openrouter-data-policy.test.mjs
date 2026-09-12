import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  parseProviderPolicyPage, applyOverrides, keepsDataPrivate, offerPolicySlug, policyIndex, POLICY_OVERRIDES,
} from "../lib/openrouter-data-policy.mjs";

const row = (slug, name, trains, retention, hq = "United States") =>
  `<tr><td class="or-table__cell"><a href="/provider/${slug}">${name}</a></td>` +
  `<td class="or-table__cell text-sm">${trains}</td><td class="or-table__cell text-sm">${retention}</td>` +
  `<td class="or-table__cell text-sm">Yes</td><td class="or-table__cell text-sm">${hq}</td></tr>`;

const page = (...rows) => `<table><thead><tr><th>Provider</th><th>Trains</th><th>Retention</th></tr></thead><tbody>${rows.join("")}</tbody></table>`;

test("a provider passes only when it does not train AND keeps nothing", () => {
  const parsed = parseProviderPolicyPage(page(
    row("good", "Good Co", "No", "Zero retention"),
    row("trains", "Trainer", "Yes", "Zero retention"),
    row("keeps", "Keeper", "No", "30 days"),
    row("both-bad", "Both Bad", "Yes", "30 days"),
  ));
  const by = Object.fromEntries(parsed.map((p) => [p.slug, keepsDataPrivate(p)]));
  assert.deepEqual(by, { good: true, trains: false, keeps: false, "both-bad": false });
});

test("an unreadable cell stays unknown instead of silently failing the provider", () => {
  // Filtering a provider out asserts that it trains on or retains your data. A cell we
  // could not parse is not that assertion, so it must not become `false`.
  const [p] = parseProviderPolicyPage(page(row("mystery", "Mystery", "—", "—")));
  assert.equal(p.does_not_train, null);
  assert.equal(p.zero_retention, null);
  assert.equal(keepsDataPrivate(p), null);
});

test("Chutes is overridden to satisfy both guarantees, and the reason is recorded", () => {
  const [chutes] = applyOverrides(parseProviderPolicyPage(page(row("chutes", "Chutes", "No", "30 days"))));
  assert.equal(keepsDataPrivate(chutes), true);
  assert.match(chutes.override, /miscategorises/i);
  assert.ok(POLICY_OVERRIDES.chutes.reason);
});

test("an override does not leak to any other provider", () => {
  const [other] = applyOverrides(parseProviderPolicyPage(page(row("elsewhere", "Elsewhere", "No", "30 days"))));
  assert.equal(other.override, null);
  assert.equal(keepsDataPrivate(other), false);
});

test("an OpenRouter route resolves through the endpoint tag, not a provider name", () => {
  // `provider_name: "Google"` is ambiguous between Google Vertex and Google AI Studio,
  // which have different retention policies; the tag is unambiguous.
  assert.equal(offerPolicySlug({ platform: "OpenRouter", provider: "Google", endpoint_tag: "google-vertex/global/standard" }), "google-vertex");
  assert.equal(offerPolicySlug({ platform: "OpenRouter", provider: "Google", endpoint_tag: "google-ai-studio/global" }), "google-ai-studio");
  assert.equal(offerPolicySlug({ platform: "OpenRouter", provider: "X", endpoint_tag: null }), null);
  assert.equal(offerPolicySlug({ platform: "OpenRouter", provider: "SambaNova", endpoint_tag: "sambanova-turbo/us" }), "sambanova");
  assert.equal(offerPolicySlug({ platform: "AWS Bedrock", provider: "AWS Bedrock" }), "amazon-bedrock");
  assert.equal(offerPolicySlug({ platform: "IONOS", provider: "IONOS" }), null);
});

test("the parser refuses a page it does not recognise rather than returning nothing", () => {
  assert.throws(() => parseProviderPolicyPage("<html><body>redesigned</body></html>"), /provider table/);
  // marker present but every row lost its /provider/ link: a layout change, not an empty list
  assert.throws(() => parseProviderPolicyPage('<table><tr><td class="or-table__cell">No</td></tr></table>'), /no provider rows/);
});

test("the shipped snapshot agrees with OpenRouter's own published filter counts", () => {
  const snap = JSON.parse(readFileSync(new URL("../data/raw/openrouter-data-policy.json", import.meta.url), "utf8"));
  const { zero_retention, does_not_train } = snap.facet_crosscheck;
  assert.equal(zero_retention.parsed, zero_retention.page);
  assert.equal(does_not_train.parsed, does_not_train.page);
  assert.ok(snap.source.url.startsWith("https://openrouter.ai/"));
  assert.ok(snap.source.retrieved_at);
  const index = policyIndex(snap);
  assert.equal(index.get("chutes"), true, "the Chutes override must survive into the snapshot");
  assert.ok(index.size >= 50);
});
