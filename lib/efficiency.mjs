import { tokenPrice } from "./openrouter-efficiency.mjs";
import { parseChutesUsage } from "./chutes-efficiency.mjs";

const observation = (value, provenance, extra = {}) => ({ value, ...provenance, ...extra });
const ageDays = (date, now) => (Date.parse(now) - Date.parse(date)) / 86400000;

// Additive only. Exact AA UUIDs select benchmark configurations. Exact OR IDs
// select workload populations. Neither model families nor provider names join
// telemetry, and source dates are never advanced during a dataset build.
export function attachEfficiency(modelRows, { aa, aaEfficiency, openrouter, openrouterEfficiency, chutesEfficiency, now }) {
  if (aaEfficiency.rows?.length !== aaEfficiency.count || !aaEfficiency.count) throw new Error("Invalid AA efficiency snapshot count");
  const aaById = new Map(aaEfficiency.rows.map((row) => [row.source_id, row]));
  if (aaById.size !== aaEfficiency.count) throw new Error("Duplicate AA efficiency UUIDs");
  const aaCatalog = new Map(aa.models.map((row) => [row.id, row]));
  const chutes = parseChutesUsage(chutesEfficiency.rows, chutesEfficiency.window);
  if (chutes.input_output_ratio !== chutesEfficiency.input_output_ratio) throw new Error("Chutes ratio differs from source totals");
  const globalRatio = observation(chutes.input_output_ratio, chutesEfficiency.ratio_provenance, {
    window: chutesEfficiency.window, totals: chutes.totals, coverage: chutes.coverage,
  });
  const aaProvenance = { source: aaEfficiency.source, url: aaEfficiency.source_url, collected_at: aaEfficiency.collected_at, basis: "measured", scope: "aa_intelligence_index_benchmark" };
  const orCatalog = new Map(openrouter.models.map((model) => [model.id, model]));
  const pageModels = openrouterEfficiency.models;
  const registry = {};
  for (const model of openrouter.models) {
    const byTag = {};
    const page = pageModels[model.id];
    const endpoints = model.endpoints || [];
    for (const endpoint of endpoints) {
      if (!endpoint.tag) continue; // a missing tag cannot establish identity
      const duplicates = endpoints.filter((e) => e.tag === endpoint.tag);
      const pageMatches = (page?.endpoints || []).filter((e) => e.endpoint_tag === endpoint.tag);
      const pageMatch = pageMatches.length === 1 ? pageMatches[0] : null;
      const sameProvider = pageMatch?.provider === endpoint.provider_name;
      const ambiguous = duplicates.length > 1 || pageMatches.length > 1;
      const cacheStatus = ambiguous ? "ambiguous_endpoint_tag" : pageMatch && !sameProvider ? "provider_identity_conflict"
        : pageMatch?.cache_status || "not_collected";
      const prices = { source: "OpenRouter public endpoint pricing", url: `https://openrouter.ai/api/v1/models/${model.id}/endpoints`, collected_at: openrouter.collected_at, basis: "derived", source_basis: "self_reported", formula: "Published USD/token × 1,000,000" };
      const rateAvailable = !ambiguous && sameProvider && pageMatch.cache_hit_rate != null && page?.cache?.provenance;
      byTag[endpoint.tag] = {
        or_model_id: model.id, endpoint_tag: endpoint.tag, provider: endpoint.provider_name,
        endpoint_id: !ambiguous && sameProvider ? pageMatch.endpoint_id : null,
        cache_hit_rate: rateAvailable ? observation(pageMatch.cache_hit_rate, page.cache.provenance, {
          scope: "model_endpoint_workload", total_tokens: pageMatch.total_tokens,
          source_provider_name: pageMatch.source_provider_name, source_provider_slug: pageMatch.source_provider_slug,
          summary_window: page.cache.summary_window, chart_date_range: page.cache.chart_date_range,
          definition: pageMatch.cache_note,
          stale: ageDays(page.cache.provenance.collected_at, now) > 30,
        }) : null,
        cache_read_per_1m: !ambiguous && endpoint.pricing?.input_cache_read != null ? observation(tokenPrice(endpoint.pricing.input_cache_read), prices) : null,
        cache_write_per_1m: !ambiguous && endpoint.pricing?.input_cache_write != null ? observation(tokenPrice(endpoint.pricing.input_cache_write), prices) : null,
        status: cacheStatus,
        attempts: [{ source: "OpenRouter public endpoints", url: prices.url, collected_at: prices.collected_at, status: "prices_only_no_usage_statistics" },
          ...(openrouterEfficiency.attempts[model.id] ? [openrouterEfficiency.attempts[model.id]] : []),
          ...(page?.cache ? [{ source: "OpenRouter effective pricing statistics", url: page.cache.provenance?.url || page.cache.url,
            collected_at: page.cache.provenance?.collected_at || page.cache.collected_at, status: page.cache.status || cacheStatus,
            ...(page.cache.reason ? { reason: page.cache.reason } : {}) }] : []),
          ...(page?.cache_attempt?.status === "fetch_or_parse_failed" ? [page.cache_attempt] : [])],
      };
    }
    if (Object.keys(byTag).length) registry[model.id] = byTag;
  }

  for (const model of modelRows) {
    const sourceAa = aaCatalog.get(model.aa_model_id);
    const aaRow = aaById.get(model.aa_model_id);
    if (aaRow && aaRow.slug !== sourceAa?.slug) throw new Error(`AA efficiency UUID/slug mismatch: ${model.id}`);
    const aaData = {
      status: aaRow ? "available" : sourceAa ? "not_published_in_collected_payload" : "not_in_aa",
      source_model_id: model.aa_model_id || null, source_slug: sourceAa?.slug || null,
      source_variant: aaRow?.variant || null,
      tokens_per_task: aaRow ? observation(aaRow.tokens_per_task, aaProvenance) : null,
      canonical_token_counts: aaRow ? observation(aaRow.canonical_token_counts, aaProvenance) : null,
      benchmark_input_output_ratio: aaRow ? observation(aaRow.canonical_token_counts.input / aaRow.canonical_token_counts.output, { ...aaProvenance, basis: "derived" }, { formula: "canonical input / canonical output", interpretation: "benchmark_proxy" }) : null,
    };
    // Prefer the explicitly published source linkage. A sole exact offered SKU
    // may identify pricing-only rows; never guess among multiple offered SKUs.
    const explicitId = model.aa_metadata?.openrouter_api_id || model.openrouter_metadata?.id;
    const offeredIds = [...new Set(model.offers.map((offer) => offer.or_model_id).filter(Boolean))];
    const orId = explicitId || (offeredIds.length === 1 ? offeredIds[0] : null);
    let page = orId ? pageModels[orId] : null;
    const attempts = [{ source: "OpenRouter public model/endpoint API", url: orId ? `https://openrouter.ai/api/v1/models/${orId}/endpoints` : "https://openrouter.ai/api/v1/models",
      collected_at: openrouter.collected_at, status: orId && orCatalog.has(orId) ? "no_usage_fields_in_public_api" : "no_exact_current_catalog_match",
      or_model_id: orId || null },
      ...(orId && openrouterEfficiency.attempts[orId] ? [openrouterEfficiency.attempts[orId]] : [{ source: "OpenRouter model page", url: orId ? `https://openrouter.ai/${orId}` : null, collected_at: null,
        status: orId ? "not_yet_collected_in_page_rotation" : "no_exact_model_id" }])];
    const ranking = openrouterEfficiency.rankings?.rows.find((row) => row.variant_permaslug === orCatalog.get(orId)?.canonical_slug);
    if (openrouterEfficiency.rankings_attempt) attempts.push({ ...openrouterEfficiency.rankings_attempt,
      status: openrouterEfficiency.rankings_attempt.status === "fetch_or_parse_failed" ? "fetch_or_parse_failed"
        : ranking ? "available_exact_canonical_slug" : "not_in_weekly_top_models" });
    if (ranking && (!page || page.usage.status !== "available" || ageDays(page.provenance.collected_at, now) > 30)) {
      page = { usage: { ...ranking, status: "available" }, provenance: openrouterEfficiency.rankings.provenance,
        window: openrouterEfficiency.rankings.window, source_updated_at: null };
    }
    const usable = page?.usage?.status === "available" && page.usage.input_output_ratio != null
      && ageDays(page.provenance.collected_at, now) <= 30;
    let ratio;
    if (usable) {
      ratio = observation(page.usage.input_output_ratio, { ...page.provenance, basis: "derived" }, {
        source_basis: "measured", formula: "sum(total_prompt_tokens) / sum(total_completion_tokens)",
        scope: "openrouter_model_workload_all_apps", fallback: false, or_model_id: orId,
        window: page.window, source_updated_at: page.source_updated_at,
        configuration_scope: "All reasoning configurations routed to this exact OpenRouter SKU; not effort-specific or coding-agent-only.",
      });
    } else {
      if (page?.usage.status === "available") attempts.push({ ...page.provenance, status: "stale_over_30_days" });
      attempts.push(...chutesEfficiency.attempts);
      ratio = observation(globalRatio.value, { ...chutesEfficiency.ratio_provenance, basis: "assumed" }, {
        source_basis: "derived", scope: "chutes_global_workload_fallback", fallback: true,
        fallback_reason: page?.usage.status === "available" ? "openrouter_observation_stale" : page?.usage.status || (orId ? "openrouter_page_not_available" : "no_exact_openrouter_model_id"),
        evidence_ref: "efficiency.global_io_ratio", window: chutesEfficiency.window,
        stale: ageDays(chutesEfficiency.collected_at, now) > 30,
      });
    }
    if (sourceAa) attempts.push({ source: aaProvenance.source, url: aaProvenance.url, collected_at: aaProvenance.collected_at,
      status: aaData.status, dimension: "aa_benchmark_tokens", basis: aaRow ? "measured" : null });
    model.token_efficiency = { aa: aaData, input_output_ratio: ratio, attempts };
  }
  const pairs = Object.values(registry).flatMap(Object.values);
  const matchedIds = new Set(modelRows.map((m) => m.aa_model_id));
  const unmatchedAa = aaEfficiency.rows.filter((row) => !matchedIds.has(row.source_id));
  return { schema_version: 1, global_io_ratio: globalRatio, openrouter_endpoints: registry,
    aa_unmatched: observation(unmatchedAa, aaProvenance, { reason: "Source UUID absent from the current built model catalog; not attached by name or family." }),
    coverage: {
      dataset_models: modelRows.length, aa_catalog_models: aa.models.length,
      aa_published_efficiency_rows: aaEfficiency.count, aa_page_scored_models: aaEfficiency.coverage.scored_denominator,
      aa_matched_dataset_models: modelRows.filter((m) => m.token_efficiency.aa.status === "available").length,
      aa_unmatched_rows: unmatchedAa.length,
      openrouter_empirical_models: modelRows.filter((m) => !m.token_efficiency.input_output_ratio.fallback).length,
      global_fallback_models: modelRows.filter((m) => m.token_efficiency.input_output_ratio.fallback).length,
      openrouter_catalog_models: openrouter.models.length, openrouter_collected_model_pages: Object.keys(pageModels).length,
      openrouter_weekly_ranked_models: openrouterEfficiency.rankings?.rows.length || 0,
      endpoint_pairs: pairs.length, endpoint_pairs_with_cache_hit_rate: pairs.filter((p) => p.cache_hit_rate != null).length,
      endpoint_pairs_with_cache_read_price: pairs.filter((p) => p.cache_read_per_1m != null).length,
      endpoint_pairs_with_cache_write_price: pairs.filter((p) => p.cache_write_per_1m != null).length,
      endpoint_pairs_ambiguous: pairs.filter((p) => p.status === "ambiguous_endpoint_tag").length,
    } };
}
