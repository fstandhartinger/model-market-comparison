import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { assertJoinParity } from "./helpers/live-catalog.mjs";

// D172.1 (2026-09-22): the daily receipt asked for it by name — "Neue Anbieter ohne gepruefte Metadaten
// (nicht in EU-/Nicht-US-Filtern): Unbiased". A provider OpenRouter's table gives no headquarters for
// publishes with `metadata_unverified` and is kept out of the EU-hosted and non-US filters, so until it is
// curated its model offers are filtered on an absence rather than on a checked fact. Curated from the vendor's
// own Terms & Policies (https://unbiased.ai/terms/, checked 2026-09-22): "We are headquartered in the
// United States", legal entity Circuit & Chisel, Inc., Fairfield CT, Delaware law.
const ds = JSON.parse(await readFile(new URL("../data/dataset.json", import.meta.url), "utf8"));
const providerMeta = JSON.parse(await readFile(new URL("../data/raw/provider-meta.json", import.meta.url), "utf8"));
const openRouter = JSON.parse(await readFile(new URL("../data/raw/openrouter.json", import.meta.url), "utf8"));
const dataPolicy = JSON.parse(await readFile(new URL("../data/raw/openrouter-data-policy.json", import.meta.url), "utf8"));
const buildSource = await readFile(new URL("../scripts/build-dataset.mjs", import.meta.url), "utf8");

const curated = providerMeta.providers?.Unbiased;
const row = ds.providers.find((p) => p.provider === "Unbiased");
const paretoModels = ds.models.filter((m) => /^pareto(?:-\d{2}\.\d+(?:-[a-z]+)?)?::default$/.test(m.id));
// Unbiased reaches the dataset only through OpenRouter's live catalog and provider table (R9.1): the
// provider row, its offers and its Pareto models exist exactly while OpenRouter lists them.
const catalogRows = (openRouter.models ?? []).filter((m) => /^~?unbiased\/pareto(?:-\d{2}\.\d+(?:-[a-z]+)?)?$/.test(m.id));
const providerListed = (openRouter.models ?? []).some((m) => (m.endpoints ?? []).some((endpoint) => endpoint.provider_name === "Unbiased"));

test("D172.1: Unbiased is curated from its own terms, not guessed", () => {
  assert.ok(curated, "data/raw/provider-meta.json has no Unbiased entry");
  assert.equal(curated.country, "US");
  // The US headquarters is the reason both flags are false; neither may be set without an EU region.
  assert.equal(curated.eu_hosted, false);
  assert.equal(curated.non_us, false);
  assert.equal(curated.url, "https://unbiased.ai/terms/", "the evidence link is the page the judgment was read from");
  assert.equal(curated.website, "https://unbiased.ai");
  assert.match(curated.note, /headquartered in the United States/, "the note quotes the vendor's own sentence");
  assert.match(curated.note, /checked 2026-09-22/, "a curated judgment carries the date it was checked");
});

test("D172.1: the curation was needed — OpenRouter publishes no headquarters for Unbiased", () => {
  const listed = (dataPolicy.providers ?? []).find((p) => String(p.name).toLowerCase() === "unbiased");
  // OpenRouter's provider table is live: no listing, nothing to cross-check; a listing must not contradict the curation.
  if (!listed) return;
  if (listed.headquarters != null) assert.match(String(listed.headquarters), /US|United States/i, "OpenRouter now states a headquarters that disagrees with the curated country");
  assert.notEqual(listed.does_not_train, false, "OpenRouter now says Unbiased trains on data; the curated note must change");
  assert.match(curated.note, /not used for training without written consent/);
});

test("D172.1: the published provider row is verified and stays out of the EU and non-US filters", () => {
  if (!assertJoinParity(assert, row, providerListed, "published Unbiased provider row")) return;
  assert.ok(!row.metadata_unverified, "still published as unverified metadata");
  assert.equal(row.country, "US");
  assert.equal(row.website, "https://unbiased.ai");
  assert.deepEqual([row.eu_hosted, row.non_us, row.eu_dedicated], [false, false, false]);
  const offers = ds.models.flatMap((m) => (m.offers ?? []).filter((o) => o.provider === "Unbiased"));
  assert.ok(offers.length, "no Unbiased offer reaches the dataset");
  for (const offer of offers) assert.equal(offer.eu_hosted, false, "a US-hosted route must not pass the EU filter");
});

test("D172.1: Pareto is attributed to the lab that publishes it, and the composite is disclosed", () => {
  assertJoinParity(assert, paretoModels.length > 0, catalogRows.length > 0, "published Pareto model rows");
  for (const model of paretoModels) assert.equal(model.org, "Unbiased", `${model.id} lost the author attribution`);
  // OpenRouter can replace the generic slug with versioned ids; its names still omit the vendor prefix,
  // so the author alias must keep every published Pareto row attributed to Unbiased.
  for (const catalogRow of catalogRows) {
    assert.ok(!/^[^:]+:\s/.test(String(catalogRow.name ?? "")), `OpenRouter now names the vendor ("${catalogRow.name}"); the alias may be redundant`);
  }
  assert.match(buildSource, /unbiased:\s*"Unbiased"/, "the author alias is what carries the attribution");
  // A model sold as one string that runs several models must say so where the price is explained.
  if (row) assert.match(row.note, /composite/, "the provider note must disclose that Pareto is not a single model");
});
