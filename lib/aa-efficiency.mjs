// Artificial Analysis token-efficiency collector (Intelligence Index benchmark).
// The three model pages checked on 2026-09-10 carry the same broad chart
// population. This is observed page coverage, not proof of all AA measurements.
// Raw AA numbers are measured benchmark observations; all RATIOS derived here
// are benchmark proxies and must never be presented as typical user usage.
import { flightRecords, objects, resolveFlight } from "./aa-rsc.mjs";
import { isDeepStrictEqual } from "node:util";

export const AA_EFFICIENCY_MODEL_SLUGS = ["gpt-5-6-sol", "claude-sonnet-5", "gemini-3-5-flash"];
export const aaModelPageURL = (slug) => `https://artificialanalysis.ai/models/${slug}`;
// Verified floor; a publish-side reduction is a source change, not a quiet shrink.
export const AA_EFFICIENCY_MIN_ROWS = 100;
export const AA_MIN_SCORED_DENOMINATOR = 400;
const PER_TASK_KEYS = ["reasoning", "answer", "output"];
const TOKEN_COUNT_KEYS = ["input", "output", "answer", "reasoning"];
const SUM_TOLERANCE = 0.01;

const isRef = (value) => typeof value === "string" && /^\$[0-9a-f]+(?::|$)/.test(value);

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function validateExactSums(counts, inContext) {
  if (counts.answer + counts.reasoning !== counts.output) {
    throw new Error(`AA efficiency invalid canonical token counts (answer+reasoning != output): ${inContext}`);
  }
}

function validateRow(row, context) {
  if (!row || typeof row !== "object") throw new Error(`AA efficiency malformed carrier row: ${context}`);
  if (typeof row.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/.test(row.id)) {
    throw new Error(`AA efficiency missing source UUID: ${context}`);
  }
  if (typeof row.slug !== "string" || !row.slug.trim()) throw new Error(`AA efficiency missing slug: ${row.id}`);
  if (typeof row.name !== "string" || !row.name.trim()) throw new Error(`AA efficiency missing name: ${row.id}`);
  const perTask = {};
  for (const key of PER_TASK_KEYS) {
    const value = row.intelligenceIndexOutputTokensPerTask?.[key];
    if (!finiteNumber(value) || value < 0) throw new Error(`AA efficiency invalid tokens-per-task ${key}: ${row.id}`);
    perTask[key] = value;
  }
  if (Math.abs(perTask.answer + perTask.reasoning - perTask.output) > SUM_TOLERANCE) {
    throw new Error(`AA efficiency tokens-per-task arithmetic mismatch: ${row.id}`);
  }
  const counts = {};
  for (const key of TOKEN_COUNT_KEYS) {
    const value = row.canonicalIntelligenceIndexTokenCount?.[key];
    if (!finiteNumber(value) || value < 0 || !Number.isSafeInteger(value)) {
      throw new Error(`AA efficiency invalid canonical token count ${key}: ${row.id}`);
    }
    counts[key] = value;
  }
  if (counts.output === 0 || counts.input === 0) throw new Error(`AA efficiency zero token budget: ${row.id}`);
  validateExactSums(counts, row.id);
  const effort = row.effort;
  const variant = typeof effort === "object" && effort !== null && typeof effort.slug === "string"
    ? effort.slug : null;
  return { id: row.id, slug: row.slug, name: row.name, variant, perTask, counts };
}

export function parseAaEfficiency(html, { previous = null, attempts = [], sourceUrl = null, fetchedAt = null } = {}) {
  const records = flightRecords(html);
  // Merge keyed Flight objects spread across chunks (any object may appear in
  // parts); keep carriers and the scored leaderboard denominator.
  const rows = new Map();
  for (const value of records.values()) {
    for (const object of objects(value)) {
      const key = typeof object.id === "string" ? object.id : typeof object.slug === "string" ? object.slug : null;
      if (!key) continue;
      const prior = rows.get(key) || {};
      if (prior.slug && object.slug && prior.slug !== object.slug) throw new Error(`AA conflicting source slug: ${key}`);
      // A keyed object may recur in another chunk with identical values; the
      // same id carrying DIFFERENT efficiency values is a corrupt payload.
      for (const field of ["intelligenceIndexOutputTokensPerTask", "canonicalIntelligenceIndexTokenCount"]) {
        if (prior[field] !== undefined && object[field] !== undefined
          && !isDeepStrictEqual(resolveFlight(prior[field], records), resolveFlight(object[field], records))) {
          throw new Error(`AA conflicting efficiency values: ${prior.id || key}`);
        }
      }
      rows.set(key, { ...prior, ...object });
    }
  }
  // Resolve one level of Flight references for the two efficiency fields.
  const carriers = new Map();
  for (const raw of rows.values()) {
    let efficiency = raw.intelligenceIndexOutputTokensPerTask;
    let counts = raw.canonicalIntelligenceIndexTokenCount;
    if (isRef(efficiency)) efficiency = resolveFlight(efficiency, records);
    if (isRef(counts)) counts = resolveFlight(counts, records);
    if (efficiency === undefined && counts === undefined) continue;
    // Fail closed on source shape changes: a carrier must publish both fields.
    if (efficiency === undefined || counts === undefined) {
      throw new Error(`AA efficiency partial carrier row (exactly one of the two fields): ${raw.id || raw.slug}`);
    }
    let effort = raw.effort;
    if (isRef(effort)) effort = resolveFlight(effort, records);
    const row = validateRow({ ...raw, effort, intelligenceIndexOutputTokensPerTask: efficiency, canonicalIntelligenceIndexTokenCount: counts }, raw.id || raw.slug || "?");
    const prior = carriers.get(row.id);
    if (prior && JSON.stringify(prior.perTask) !== JSON.stringify(row.perTask)) {
      throw new Error(`AA conflicting efficiency values: ${row.id}`);
    }
    carriers.set(row.id, row);
  }
  const minimum = Math.max(AA_EFFICIENCY_MIN_ROWS, previous?.count || 0);
  if (carriers.size < minimum) {
    throw new Error(`AA efficiency incomplete scrape: ${carriers.size} rows (minimum ${minimum})`);
  }
  const scored = [...rows.values()].filter((row) => Number.isFinite(row.intelligenceIndex));
  if (scored.length < AA_MIN_SCORED_DENOMINATOR || scored.length < carriers.size) {
    throw new Error(`AA efficiency missing scored denominator: ${scored.length} scored rows vs ${carriers.size} carriers`);
  }
  const rowsOut = [...carriers.values()]
    .map((row) => ({
      source_id: row.id,
      slug: row.slug,
      name: row.name,
      variant: row.variant,
      tokens_per_task: row.perTask,
      canonical_token_counts: row.counts,
      derived: {
        basis: "derived",
        input_output_ratio: row.counts.input / row.counts.output,
        reasoning_output_share: row.perTask.output > 0 ? row.perTask.reasoning / row.perTask.output : null,
      },
    }))
    .sort((a, b) => a.slug.localeCompare(b.slug) || (a.variant || "").localeCompare(b.variant || ""));
  return {
    source: "Artificial Analysis Intelligence Index token efficiency (website Flight payload)",
    basis: "measured",
    interpretation: "benchmark_proxy",
    caveat: "AA Intelligence Index benchmark token accounting. Ratios are BENCHMARK PROXIES, never typical user I/O usage; usage ratios must come from OpenRouter/Chutes sources.",
    collected_at: fetchedAt || new Date().toISOString(),
    source_url: sourceUrl || aaModelPageURL(AA_EFFICIENCY_MODEL_SLUGS[0]),
    data_fields: {
      tokens_per_task: "intelligenceIndexOutputTokensPerTask {reasoning, answer, output} (measured)",
      canonical_token_counts: "canonicalIntelligenceIndexTokenCount {input, output, answer, reasoning} (measured)",
      derived: "input_output_ratio = counts.input / counts.output; reasoning_output_share = perTask.reasoning / perTask.output (derived from measured values)",
    },
    attempts,
    coverage: {
      published_rows: rowsOut.length,
      scored_denominator: scored.length,
      denominator_source: "Leaderboard rows carrying a finite intelligenceIndex inside the same model-page Flight payload",
    },
    count: rowsOut.length,
    rows: rowsOut,
  };
}
