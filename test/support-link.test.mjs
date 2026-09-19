import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = new URL("..", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const supportUrl = "https://donate.stripe.com/fZu00i9ro0wmdF88sg1Jm01";

test("CR-89: the shared footer offers the exact support link and required company disclosure", () => {
  const layout = read("app/layout.tsx");
  assert.ok(layout.includes(supportUrl));
  assert.match(layout, /data-bh-support-link/);
  assert.match(layout, /Support Benchmark Heaven/);
  assert.match(layout, /Payments go to productivity-boost\.com Betriebs UG/);
  assert.doesNotMatch(layout, />\s*(?:Donate|Donation|Spende)\s*</i);
});

test("CR-89: About and repository support affordances use support language, not donation claims", () => {
  const about = read("app/about/page.tsx");
  const readme = read("README.md");
  const funding = read(".github/FUNDING.yml");
  assert.match(about, /id="support"/);
  assert.match(about, /Support this project/);
  assert.ok(about.includes(supportUrl));
  assert.match(about, /Payments go to productivity-boost\.com Betriebs UG/);
  assert.match(readme, /^## Support$/m);
  assert.ok(readme.includes(supportUrl));
  assert.equal(funding.trim(), "custom: " + supportUrl);
  for (const source of [about, readme]) assert.doesNotMatch(source.replaceAll(supportUrl, ""), /\b(?:donate|donation|spende)\b/i);
});
