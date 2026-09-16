import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ds = JSON.parse(await readFile(join(__dirname, "..", "data", "dataset.json"), "utf8"));
const providerMeta = JSON.parse(await readFile(join(__dirname, "..", "data", "raw", "provider-meta.json"), "utf8"));

test("CR-42.3: every dataset provider carries a curated official website", () => {
  assert.ok(ds.providers.length > 0);
  for (const p of ds.providers) {
    assert.equal(typeof p.website, "string", `${p.provider} has no website`);
    assert.match(p.website, /^https:\/\//, `${p.provider} website is not https: ${p.website}`);
  }
});

test("CR-42.3: dataset website is exactly the curated provider-meta url (provenance preserved)", () => {
  const meta = providerMeta.providers || {};
  for (const p of ds.providers) {
    const curated = meta[p.provider]?.url;
    assert.equal(p.website, curated ?? null, `${p.provider}: dataset ${p.website} != curated ${curated}`);
  }
});

test("CR-42.3: every curated provider-meta url is a well-formed https URL", () => {
  const meta = providerMeta.providers || {};
  assert.ok(Object.keys(meta).length >= 90, "provider-meta lost providers");
  for (const [name, m] of Object.entries(meta)) {
    assert.equal(typeof m.url, "string", `${name} has no curated url`);
    assert.match(m.url, /^https:\/\/[a-z0-9.-]+\.[a-z]{2,}\/?/i, `${name} url malformed: ${m.url}`);
  }
});

test("CR-42.3: the curation is dated in provider-meta", () => {
  assert.match(String(providerMeta.urls_verified_at ?? ""), /^\d{4}-\d{2}-\d{2}$/, "urls_verified_at missing or undated");
  assert.ok(String(providerMeta.url_provenance ?? "").length > 40, "url_provenance note missing");
});
