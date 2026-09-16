import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import ts from "typescript";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ds = JSON.parse(await readFile(join(__dirname, "..", "data", "dataset.json"), "utf8"));
const providerMeta = JSON.parse(await readFile(join(__dirname, "..", "data", "raw", "provider-meta.json"), "utf8"));

// Compile the real Dataset -> client projection so a future omitted mapping cannot
// silently drop the provider website (the expanded-row links would vanish).
const clientSource = await readFile(join(__dirname, "..", "lib", "client-model.ts"), "utf8");
const compositeUrl = new URL("../lib/composite.mjs", import.meta.url).href;
const clientCompiled = ts.transpileModule(clientSource, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
}).outputText.replace('from "./composite.mjs"', `from "${compositeUrl}"`)
  .replace('from "./family-representative.mjs"', `from "${new URL("../lib/family-representative.mjs", import.meta.url).href}"`);
const client = await import(`data:text/javascript;base64,${Buffer.from(clientCompiled).toString("base64")}`);

test("CR-42.3: every dataset provider carries a curated official website", () => {
  assert.ok(ds.providers.length > 0);
  for (const p of ds.providers) {
    // `website: null` is deliberate when no homepage is confirmed by a primary source (plain text, no link).
    if (p.website === null) continue;
    assert.equal(typeof p.website, "string", `${p.provider} has no website`);
    assert.match(p.website, /^https:\/\//, `${p.provider} website is not https: ${p.website}`);
  }
});

test("CR-42.3: dataset website is the curated `website` when set, else the curated url (provenance preserved)", () => {
  const meta = providerMeta.providers || {};
  for (const p of ds.providers) {
    const m = meta[p.provider] || {};
    const curated = m.website !== undefined ? m.website : m.url;
    assert.equal(p.website, curated ?? null, `${p.provider}: dataset ${p.website} != curated ${curated}`);
  }
});

// Iteration 87: `url` is the evidence behind a provider's judgment and was often a privacy policy or terms
// page; a link labelled "official website" must never point at one, nor at a third party's provider page.
test("CR-42.3: no 'official website' link is a legal page, an OpenRouter page or an API host", () => {
  for (const p of ds.providers) {
    if (!p.website) continue;
    const u = new URL(p.website);
    assert.doesNotMatch(u.pathname, /privacy|terms|legal|policy/i, `${p.provider}: website is a legal page: ${p.website}`);
    assert.notEqual(u.hostname, "openrouter.ai", `${p.provider}: website is OpenRouter's page, not the provider's`);
    assert.doesNotMatch(u.hostname, /^api\./, `${p.provider}: website is an API host: ${p.website}`);
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

test("CR-42.3: clientData passes the provider website through to the client (expanded-row links)", () => {
  const cd = client.clientData(ds);
  assert.ok(cd.providers.length > 0);
  for (const p of cd.providers) {
    const datasetProvider = ds.providers.find((d) => d.platform === p.platform && d.provider === p.provider);
    assert.ok(datasetProvider, `dataset provider missing for ${p.provider}`);
    assert.equal(p.website, datasetProvider.website ?? null, `${p.provider}: client website ${p.website} != dataset ${datasetProvider.website}`);
    if (p.website !== null) assert.match(p.website, /^https:\/\//, `${p.provider} client website not https: ${p.website}`);
  }
});
