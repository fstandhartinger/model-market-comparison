// CR-34.1: pure validator for OpenRouter Benchmarks API payloads (used by
// scripts/fetch-openrouter-benchmarks.mjs). Fail-closed: any shape drift refuses the capture.

export const KNOWN_TYPES = new Set(["gpqa_diamond", "tau_bench_verified_airline", "search_browsecomp", "search_hle", "search_dsqa", "search_widesearch"]);
export const KNOWN_SOURCES = new Set(["openrouter", "artificial-analysis", "design-arena"]);

export function parseBenchmarksResponse(text, label = "response") {
  let body;
  try { body = JSON.parse(String(text)); } catch { throw new Error(`OpenRouter benchmarks (${label}): response is not JSON`); }
  if (!Array.isArray(body?.data) || body.data.length === 0) throw new Error(`OpenRouter benchmarks (${label}): no data rows`);
  if (!body.meta || typeof body.meta.as_of !== "string" || Number.isNaN(Date.parse(body.meta.as_of))) throw new Error(`OpenRouter benchmarks (${label}): no parseable meta.as_of`);
  return body;
}

export function validateBenchmarksRows(data, { minOwnRows = 100, minTotalRows = 500 } = {}) {
  const seen = new Set();
  let ownRows = 0, aaRows = 0, daRows = 0;
  for (const item of data) {
    if (typeof item?.model_permaslug !== "string" || !item.model_permaslug) throw new Error("OpenRouter benchmarks: a row is missing model_permaslug");
    if (!KNOWN_SOURCES.has(item.source)) throw new Error(`OpenRouter benchmarks: unexpected row source ${JSON.stringify(item.source)}`);
    if (item.source === "openrouter") {
      ownRows += 1;
      if (!KNOWN_TYPES.has(item.benchmark_type)) throw new Error(`OpenRouter benchmarks: unexpected benchmark_type ${JSON.stringify(item.benchmark_type)}`);
      const score = item.accuracy ?? item.primary_score;
      if (!(typeof score === "number" && score > -0.01 && score <= 1.000001)) throw new Error(`OpenRouter benchmarks: implausible score ${JSON.stringify(score)} for ${item.model_permaslug} ${item.benchmark_type}`);
      const id = `${item.model_permaslug}|${item.benchmark_type}`;
      if (seen.has(id)) throw new Error(`OpenRouter benchmarks: ${id} listed twice`);
      seen.add(id);
    } else if (item.source === "artificial-analysis") aaRows += 1;
    else daRows += 1;
  }
  if (ownRows < minOwnRows) throw new Error(`OpenRouter benchmarks: only ${ownRows} own-run rows (expected ≥ ${minOwnRows}) — refusing to replace the snapshot`);
  if (data.length < minTotalRows) throw new Error(`OpenRouter benchmarks: only ${data.length} total rows (expected ≥ ${minTotalRows}) — refusing to replace the snapshot`);
  return { ownRows, aaRows, daRows, totalRows: data.length };
}
