import test from "node:test";
import assert from "node:assert/strict";
import { parseRobotsDisallows, robotsDisallowedBy } from "../lib/openrouter-efficiency.mjs";

// OpenRouter robots.txt as served on 20 Nov 2026 (shortened: locale copies of the same rules).
const live = `User-Agent: *
Allow: /
Disallow: /seo/
Disallow: /sign-in
Disallow: /sign-up
Disallow: /workspaces
Disallow: /de/sign-in
Disallow: /de/workspaces
Disallow: /537s

Sitemap: https://openrouter.ai/sitemap.xml
`;

test("CR-795: the 20 Nov OpenRouter robots policy still allows every URL the efficiency collector fetches", () => {
  const rules = parseRobotsDisallows(live);
  assert.deepEqual(rules, ["/seo/", "/sign-in", "/sign-up", "/workspaces", "/de/sign-in", "/de/workspaces", "/537s"]);
  for (const url of ["https://openrouter.ai/rankings?view=week", "https://openrouter.ai/openai/gpt-5.2",
    "https://openrouter.ai/api/frontend/v1/stats/effective-pricing?permaslug=a&variant=standard&shape=v7"]) {
    assert.equal(robotsDisallowedBy(url, rules), null, url);
  }
  assert.equal(robotsDisallowedBy("https://openrouter.ai/workspaces/x", rules), "/workspaces");
  assert.equal(robotsDisallowedBy("https://openrouter.ai/seo/page", rules), "/seo/");
});

test("CR-795: fails closed when the policy disallows a collector path", () => {
  for (const [text, url] of [
    ["User-agent: *\nDisallow: /", "https://openrouter.ai/openai/gpt-5.2"],
    ["User-agent: *\nDisallow: /rankings", "https://openrouter.ai/rankings?view=week"],
    ["User-agent: *\nDisallow: /api/", "https://openrouter.ai/api/frontend/v1/stats/effective-pricing?x=1"],
    ["User-agent: *\nDisallow: /*?view=", "https://openrouter.ai/rankings?view=week"],
    ["User-agent: BenchmarkHeaven\nDisallow: /openai/", "https://openrouter.ai/openai/gpt-5.2"],
  ]) assert.ok(robotsDisallowedBy(url, parseRobotsDisallows(text)), `${text} -> ${url}`);
  // Allow lines never re-open a disallowed path; other bots' groups do not apply.
  assert.ok(robotsDisallowedBy("https://openrouter.ai/a/b", parseRobotsDisallows("User-agent: *\nAllow: /a/\nDisallow: /a")));
  assert.equal(robotsDisallowedBy("https://openrouter.ai/a/b", parseRobotsDisallows("User-agent: GPTBot\nDisallow: /\n\nUser-agent: *\nDisallow: /seo/")), null);
  assert.equal(robotsDisallowedBy("https://openrouter.ai/a/b$", parseRobotsDisallows("User-agent: *\nDisallow: /a$")), null);
});
