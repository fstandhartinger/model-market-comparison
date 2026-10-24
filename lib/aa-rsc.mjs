// Read JSON data from Next.js Flight scripts. Never evaluate source JavaScript.
export function flightRecords(html) {
  const chunks = [];
  for (const match of html.matchAll(/<script[^>]*>self\.__next_f\.push\((\[.*?\])\)<\/script>/gs)) {
    const part = JSON.parse(match[1]);
    if (part[0] === 1 && typeof part[1] === "string") chunks.push(part[1]);
  }
  const records = new Map();
  for (const match of chunks.join("").matchAll(/(?:^|\n)([0-9a-f]+):([^\n]*)/g)) {
    try { records.set(match[1], JSON.parse(match[2])); }
    catch { /* Flight imports, hints and text records are not JSON model data. */ }
  }
  if (!records.size) throw new Error("AA Flight payload missing or malformed");
  return records;
}

export function* objects(value) {
  if (!value || typeof value !== "object") return;
  if (!Array.isArray(value)) yield value;
  for (const child of Object.values(value)) yield* objects(child);
}

export function resolveFlight(value, records, seen = new Set()) {
  if (typeof value !== "string" || !/^\$[0-9a-f]+(?::|$)/.test(value)) return value;
  if (seen.has(value)) throw new Error(`AA Flight circular reference: ${value}`);
  seen.add(value);
  const [id, ...path] = value.slice(1).split(":");
  let result = records.get(id);
  for (const key of path) {
    result = resolveFlight(result, records, new Set(seen));
    // React element references expose tuple slot 3 as `props`.
    const property = key === "props" && Array.isArray(result) && result[0] === "$" ? 3 : key;
    if (!result || !Object.hasOwn(result, property)) throw new Error(`AA Flight unresolved reference: ${value}`);
    result = result[property];
  }
  if (result === undefined) throw new Error(`AA Flight unresolved reference: ${value}`);
  return resolveFlight(result, records, seen);
}

export function parseArtificialAnalysisMetadata(html) {
  const metadata = new Map();
  for (const value of flightRecords(html).values()) {
    for (const row of objects(value)) {
      if (typeof row.isOpenWeights !== "boolean" || !(row.slug || row.id)) continue;
      const key = row.slug || row.id;
      const prior = metadata.get(key);
      if (prior && prior.isOpenWeights !== row.isOpenWeights) throw new Error(`AA conflicting metadata: ${key}`);
      metadata.set(key, { ...prior, ...row });
    }
  }
  return metadata;
}

// Slugs of models whose release the leaderboard page itself publishes as deprecated. Since 17 Oct 2026 the page
// embeds metadata objects only for live models, but still carries the release list (`{slug, deprecated,
// releaseDate}`) and the model -> release map (`{slug, releaseSlug}`). Only an explicit `deprecated: true` counts.
export function parseArtificialAnalysisDeprecatedModels(html) {
  const releases = new Map();
  const modelRelease = new Map();
  for (const value of flightRecords(html).values()) {
    for (const row of objects(value)) {
      if (typeof row.slug !== "string" || Object.hasOwn(row, "isOpenWeights")) continue;
      if (typeof row.releaseSlug === "string") {
        if (modelRelease.has(row.slug) && modelRelease.get(row.slug) !== row.releaseSlug) throw new Error(`AA conflicting release: ${row.slug}`);
        modelRelease.set(row.slug, row.releaseSlug);
      } else if (typeof row.deprecated === "boolean" && typeof row.releaseDate === "string") {
        if (releases.has(row.slug) && releases.get(row.slug) !== row.deprecated) throw new Error(`AA conflicting release deprecation: ${row.slug}`);
        releases.set(row.slug, row.deprecated);
      }
    }
  }
  return new Set([...modelRelease].filter(([, release]) => releases.get(release) === true).map(([slug]) => slug));
}
