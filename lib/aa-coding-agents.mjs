import { flightRecords, objects, resolveFlight } from "./aa-rsc.mjs";

export const CODING_AGENT_URL = "https://artificialanalysis.ai/agents/coding-agents";
export const CODING_AGENT_VERSION = "1.5";
const COMPONENTS = ["deep-swe-v1.1", "swe-atlas-qna", "terminal-bench-v4"];

export function parseCodingAgents(html, previous = null) {
  const records = flightRecords(html);
  const payload = JSON.stringify([...records.values()]);
  if (!payload.includes(`Coding Agent Index v${CODING_AGENT_VERSION}:`)) {
    throw new Error("AA Coding Agent version absent or changed; review methodology before updating the collector");
  }
  if (previous && previous.version !== CODING_AGENT_VERSION) {
    throw new Error("AA Coding Agent version mismatch; never replace a different benchmark version");
  }
  const candidates = [];
  for (const value of records.values()) for (const object of objects(value)) {
    if (Object.hasOwn(object, "benchmarkRows")) {
      const rows = resolveFlight(object.benchmarkRows, records);
      if (!Array.isArray(rows)) throw new Error("AA benchmarkRows is not an array");
      candidates.push(rows.map((row) => resolveFlight(row, records)));
    }
  }
  if (candidates.length !== 1) throw new Error(`AA expected one full benchmarkRows array, got ${candidates.length}`);
  const sourceRows = candidates[0];
  // This is a v1.5 baseline, NOT the 68-row v1.4 board or the homepage highlights.
  // A source shrink is reviewed explicitly; it may not silently erase known rows.
  if (sourceRows.length < Math.max(13, previous?.count || 0)) {
    throw new Error(`AA Coding Agent incomplete scrape: ${sourceRows.length} rows (minimum ${Math.max(13, previous?.count || 0)})`);
  }
  const ids = new Set();
  const rows = sourceRows.map((row) => {
    if (!row || typeof row !== "object" || typeof row.id !== "string" || !row.id || ids.has(row.id)) {
      throw new Error("AA Coding Agent invalid or duplicate source row");
    }
    ids.add(row.id);
    if (typeof row.display?.model !== "string" || !row.display.model.trim()
      || typeof row.agentName !== "string" || !row.agentName.trim()
      || !Number.isFinite(row.indexScore) || row.indexScore < 0 || row.indexScore > 1
      || row.indexComponentCount !== COMPONENTS.length || row.evalCount !== COMPONENTS.length
      || !Array.isArray(row.evals) || row.evals.length !== COMPONENTS.length
      || JSON.stringify(row.evals.map((e) => e.datasetIndexName).sort()) !== JSON.stringify(COMPONENTS)) {
      throw new Error(`AA Coding Agent invalid/incomplete row or changed components: ${row.id}`);
    }
    const mean = row.evals.reduce((sum, item) => {
      if (!Number.isFinite(item.mean?.reward) || item.mean.reward < 0 || item.mean.reward > 1
        || !Number.isFinite(item.weight) || Math.abs(item.weight - 1 / 3) > 1e-10) {
        throw new Error(`AA Coding Agent invalid component: ${row.id}`);
      }
      return sum + item.mean.reward / 3;
    }, 0);
    if (Math.abs(mean - row.indexScore) > 1e-9) throw new Error(`AA Coding Agent index/component mismatch: ${row.id}`);
    return {
      source_id: row.id, model_name: row.display.model, harness: row.agentName,
      score: row.indexScore, eval_count: row.evalCount,
      index_component_count: row.indexComponentCount, complete: true,
      components: row.evals.map((item) => ({ id: item.datasetIndexName, score: item.mean.reward, weight: item.weight })),
    };
  });
  return {
    source: "ArtificialAnalysis Coding Agent Index", version: CODING_AGENT_VERSION,
    collected_at: new Date().toISOString().slice(0, 10), endpoint: CODING_AGENT_URL,
    methodology_url: "https://artificialanalysis.ai/methodology/coding-agents-benchmarking",
    method: "Decode Flight JSON and resolve benchmarkRows references on the full coding-agents page; validate version, row count, identities, components and index arithmetic before atomic replacement.",
    score_scale: "0-1", basis: "measured", count: rows.length,
    completeness_note: "Complete v1.5 benchmarkRows only. v1.4 remains a separate dated snapshot for the unchanged Composite; versions must never be combined.",
    rows,
  };
}
