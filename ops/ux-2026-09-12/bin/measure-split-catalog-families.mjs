#!/usr/bin/env node
// D248: measure catalog families that carry the same model under two configurations which are *not*
// two settings — an Artificial Analysis row and an OpenRouter row that failed to merge. Both rows are
// the same product, so the benchmarks land on one and the offers on the other, and no single row can
// answer "what does this benchmarked model cost".
//
// Nothing here is pinned. The families, the variants, the benchmark counts and the offers are all read
// from the published `data/dataset.json`, so a catalog repair moves the answer instead of agreeing with
// this one — when the split is fixed, `split_families` is empty and the script says so.
//
// Usage: node ops/ux-2026-09-12/bin/measure-split-catalog-families.mjs [outDir]
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

// Variants that name how a model is *routed*, not how it was *run*. A family split along one of these
// is one product held twice; a family split along an effort (max/high/…) is genuinely two runs.
export const ROUTING_VARIANTS = new Set(['openrouter']);

const providersOf = (m) => [...new Set((m.offers ?? []).map((o) => o.provider_id ?? o.provider).filter(Boolean))].sort();
// `benchmarks` is a map of benchmark id → cell, not an array: count its keys, never its `.length`.
const benchmarkCount = (m) => Object.keys(m.benchmarks ?? {}).length;

export function findSplitFamilies(models) {
  const byFamily = new Map();
  for (const m of models) byFamily.set(m.family_key, [...(byFamily.get(m.family_key) ?? []), m]);
  const split = [];
  for (const [family_key, members] of byFamily) {
    if (members.length < 2) continue;
    // Only the shape where every configuration is either the setting-less default or a routing row:
    // no effort is involved, so the several rows cannot be several runs.
    if (!members.every((m) => m.variant === 'default' || ROUTING_VARIANTS.has(m.variant))) continue;
    if (!members.some((m) => ROUTING_VARIANTS.has(m.variant))) continue;
    const rows = members.map((m) => ({
      id: m.id, variant: m.variant, display_name: m.display_name ?? null, deprecated: m.deprecated === true,
      benchmarks: benchmarkCount(m), offers: (m.offers ?? []).length, providers: providersOf(m),
      has_benchmark: m.has_benchmark === true, has_pricing: m.has_pricing === true,
      // Why the merge failed: the AA row retains an OpenRouter slug that the OpenRouter row no longer uses.
      aa_openrouter_api_id: m.aa_metadata?.openrouter_api_id ?? null,
      openrouter_id: m.openrouter_metadata?.id ?? null,
    }));
    const benchRow = rows.find((r) => r.benchmarks === Math.max(...rows.map((x) => x.benchmarks)));
    const priceRow = rows.find((r) => r.offers === Math.max(...rows.map((x) => x.offers)));
    const slugs = rows.map((r) => r.aa_openrouter_api_id ?? r.openrouter_id).filter(Boolean);
    split.push({
      family_key, family_name: members[0].family_name ?? null, rows,
      // The product consequence, stated per family rather than asserted once for all of them.
      benchmarks_and_offers_on_different_rows: benchRow?.id !== priceRow?.id,
      benchmark_row_has_no_offers: benchRow ? benchRow.offers === 0 : false,
      benchmark_row_is_deprecated: benchRow?.deprecated === true,
      provider_count_by_row: Object.fromEntries(rows.map((r) => [r.id, r.providers.length])),
      // The other half of the same defect: where the offers are *not* split they are duplicated, so one
      // product occupies two rows of the overview table with the same providers behind both.
      offers_duplicated_across_rows: rows.length > 1 && rows.every((r) => r.offers > 0)
        && new Set(rows.map((r) => r.providers.join('|'))).size === 1,
      openrouter_slugs: [...new Set(slugs)],
      slug_mismatch: new Set(slugs).size > 1,
    });
  }
  return split.sort((a, b) => a.family_key.localeCompare(b.family_key));
}

export async function measure({ root = process.cwd() } = {}) {
  const dataset = JSON.parse(await readFile(`${root}/data/dataset.json`, 'utf8'));
  const split_families = findSplitFamilies(dataset.models);
  return {
    measured_at: new Date().toISOString(),
    dataset_generated_at: dataset.generated_at,
    models: dataset.models.length,
    families: new Set(dataset.models.map((m) => m.family_key)).size,
    routing_variants: [...ROUTING_VARIANTS],
    split_families_found: split_families.length,
    split_families,
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const outDir = process.argv[2] ?? null;
  const out = await measure();
  console.log(`${out.models} models / ${out.families} families — ${out.split_families_found} split by a routing variant`);
  for (const f of out.split_families) {
    console.log(`  ${f.family_key}${f.slug_mismatch ? '  [OpenRouter slug mismatch]' : ''}`);
    for (const r of f.rows) {
      console.log(`    ${r.id.padEnd(38)} benchmarks ${String(r.benchmarks).padStart(3)}  offers ${String(r.offers).padStart(3)}  providers ${String(r.providers.length).padStart(2)}  ${r.deprecated ? 'deprecated' : ''}`);
    }
    if (f.benchmarks_and_offers_on_different_rows) {
      console.log(`    → benchmarks and offers sit on different rows${f.benchmark_row_has_no_offers ? '; the benchmarked row has no offers at all' : ''}${f.benchmark_row_is_deprecated ? '; the benchmarked row is deprecated' : ''}`);
    }
    if (f.offers_duplicated_across_rows) console.log('    → both rows carry the same providers: one product, two overview rows');
    if (f.openrouter_slugs.length) console.log(`    → OpenRouter slugs seen: ${f.openrouter_slugs.join(' vs ')}`);
  }
  if (outDir) {
    await mkdir(outDir, { recursive: true });
    await writeFile(`${outDir}/split-catalog-families.json`, `${JSON.stringify(out, null, 2)}\n`);
    console.log(`\nwrote ${outDir}/split-catalog-families.json`);
  }
}
