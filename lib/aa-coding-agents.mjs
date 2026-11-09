import { flightRecords, objects, resolveFlight } from "./aa-rsc.mjs";

export const CODING_AGENT_URL = "https://artificialanalysis.ai/agents/coding-agents";
export const CODING_AGENT_METHODOLOGY_URL = "https://artificialanalysis.ai/methodology/coding-agents-benchmarking";

// Each AA index version is its own registry identity with its own component contract and snapshot file.
// A version that is not the collector's current one is frozen: its file keeps its own date and is never refreshed.
// The component ids are AA's payload ids. `swe-atlas-qna` keeps its id in v2.0 although AA re-graded it as
// SWE-Atlas-QnA-AA (GPT-6 Luna judge, five votes, 127 reworded criteria), so a component id alone never
// makes two versions comparable.
export const CODING_AGENT_CONTRACTS = {
  "1.5": {
    file: "aa-coding-agents-v1.5.json", source_key: "aa_coding_agents_v1_5",
    components: ["deep-swe-v1.1", "swe-atlas-qna", "terminal-bench-v4"],
    component_labels: { "deep-swe-v1.1": "DeepSWE v1.1", "swe-atlas-qna": "SWE-Atlas-QnA (Claude Opus 4.5 judge)", "terminal-bench-v4": "Terminal-Bench 4.0" },
  },
  "2.0": {
    file: "aa-coding-agents-v2.0.json", source_key: "aa_coding_agents_v2_0",
    components: ["frontiercode-v1.1-main", "swe-atlas-qna", "terminal-bench-v4"],
    component_labels: { "frontiercode-v1.1-main": "FrontierCode v1.1 Main", "swe-atlas-qna": "SWE-Atlas-QnA-AA (GPT-6 Luna xhigh judge, five votes)", "terminal-bench-v4": "Terminal-Bench 4.0" },
  },
};
// CR-545: AA published Coding Agent Index v2.0 on 2026-10-23; the collector follows it and v1.5 is frozen.
export const CODING_AGENT_VERSION = "2.0";
export const CODING_AGENT_FILE = CODING_AGENT_CONTRACTS[CODING_AGENT_VERSION].file;
export const CODING_AGENT_SOURCE_KEY = CODING_AGENT_CONTRACTS[CODING_AGENT_VERSION].source_key;
export const FROZEN_CODING_AGENT_FILES = Object.entries(CODING_AGENT_CONTRACTS)
  .filter(([version]) => version !== CODING_AGENT_VERSION).map(([, contract]) => contract.file);
const COMPONENTS = CODING_AGENT_CONTRACTS[CODING_AGENT_VERSION].components;

// CR-542: the page names one *other* index version everywhere it states one (AA moved from v1.5 to v2.0 on
// 2026-10-23). That is a methodology change for review, not a broken scrape: the daily keeps the
// last verified snapshot of the pinned version with its own date (live-retention / review-live) instead of losing the day.
export const CODING_AGENT_VERSION_CHANGED = "AA_CODING_AGENT_VERSION_CHANGED";

/** The page's version statements: the Performance section(s) and every version the page names for the index. */
export function codingAgentPageVersions(html, records = flightRecords(html)) {
  // Identify the current Performance section, not a stale version mentioned in history.
  const performance = [];
  for (const value of records.values()) for (const object of objects(value)) {
    if (object.title === "Performance" && object.description === "Performance across the Artificial Analysis Coding Agent Index.") performance.push(object);
  }
  // The "Updated to ... v1.5:" change badge is transient release news (AA dropped it on
  // 2026-10-05). The stable statement is the server-rendered index subtitle, also in the
  // JSON-LD Dataset. Every statement found must name the expected version.
  const marker = performance[0]?.change?.description;
  const versions = typeof marker === "string" ? [...marker.matchAll(/Coding Agent Index v([0-9.]+):/g)].map((m) => m[1]) : [];
  versions.push(...[...html.matchAll(/Artificial Analysis Coding Agent Index v([0-9.]+) (?:incorporates|·)/g)].map((m) => m[1]));
  return { performance, versions };
}

/** The single other version a well-formed page consistently states, or null (expected version, absent, or mixed). */
export function changedCodingAgentVersion({ performance, versions }) {
  if (performance.length !== 1 || !versions.length) return null;
  const [first] = versions;
  return first !== CODING_AGENT_VERSION && versions.every((version) => version === first) ? first : null;
}

// CR-709 (2026-11-07): AA removed one published v2.0 row (Mistral Large 4 (High), Mistral Vibe) and relabelled the
// retained Medium row as High. A board that lost known rows is a source change for review, never a smaller scrape to
// publish. The collector still refuses it before its atomic write; the marker lets the daily keep the last verified
// full snapshot with its own date (like CR-542) instead of losing every other source's day. Only a small, pure removal
// carries it: every captured row valid, no identity the published snapshot does not know, at most
// CODING_AGENT_MAX_REMOVED rows missing. A larger drop, new identities or a bare count without rows fails closed.
export const CODING_AGENT_ROSTER_SHRANK = "AA_CODING_AGENT_ROSTER_SHRANK";
export const CODING_AGENT_MAX_REMOVED = 2;

// The retained snapshot may stand in for at most this many days; after that the daily fails closed again so the
// removal gets its review instead of a quietly ageing board.
export const CODING_AGENT_SHRINK_RETENTION_DAYS = 14;
export function codingAgentShrinkRetentionAllowed(runStart, collectedAt) {
  const start = Date.parse(runStart), collected = Date.parse(collectedAt);
  if (!Number.isFinite(start) || !Number.isFinite(collected) || collected > start) return false;
  return start - collected <= CODING_AGENT_SHRINK_RETENTION_DAYS * 86_400_000;
}

// Lead decision 2026-11-09: AA removed this row from its public Coding Agent board (absent since 2026-11-06, three
// byte-identical captures on 2026-11-09). Benchmark Heaven follows the source. Only ids listed here may disappear
// without the roster-shrink refusal; any other missing id still fails exactly as before. An approved id that is
// back on the page is simply kept.
export const APPROVED_CODING_AGENT_REMOVALS = Object.freeze({
  '9fcf1e000a8ac75cca614977bcac25da': {
    cr: 'CR-PENDING', approved_on: '2026-11-09', label: 'Mistral Large 4 (High) / Mistral Vibe',
    reason: 'AA removed the row from its public Coding Agent board (absent since 2026-11-06; captures 2026-11-09)',
  },
});

/** `previous` minus approved ids that are absent from `presentIds`; the baseline the roster minimum and shrink check use. */
export function effectiveCodingAgentPrevious(previous, presentIds) {
  if (!previous || !Array.isArray(previous.rows) || previous.rows.length !== previous.count) return previous;
  const kept = previous.rows.filter((row) => !(Object.hasOwn(APPROVED_CODING_AGENT_REMOVALS, row?.source_id) && !presentIds.has(row.source_id)));
  return kept.length === previous.rows.length ? previous : { ...previous, rows: kept, count: kept.length };
}

/** Missing published identities when `rows` (validated) is a small pure removal from `previous`, else null. */
export function codingAgentRosterShrink(rows, previous) {
  if (!previous || previous.version !== CODING_AGENT_VERSION || !Array.isArray(previous.rows)
    || previous.rows.length !== previous.count || rows.length >= previous.count || rows.length < 13) return null;
  const known = new Set(previous.rows.map((row) => row?.source_id));
  if (known.size !== previous.rows.length || rows.some((row) => !known.has(row.source_id))) return null;
  const present = new Set(rows.map((row) => row.source_id));
  const missing = previous.rows.filter((row) => !present.has(row.source_id))
    .map((row) => ({ source_id: row.source_id, model_name: row.model_name, harness: row.harness }));
  if (!missing.length || missing.length > CODING_AGENT_MAX_REMOVED || missing.length !== previous.count - rows.length) return null;
  return { rows: rows.length, previous_count: previous.count, missing };
}

export function parseCodingAgents(html, previous = null) {
  const records = flightRecords(html);
  const statements = codingAgentPageVersions(html, records);
  const { performance, versions } = statements;
  if (performance.length !== 1 || !versions.length || versions.some((version) => version !== CODING_AGENT_VERSION)) {
    const changed = changedCodingAgentVersion(statements);
    throw new Error(`${changed ? `${CODING_AGENT_VERSION_CHANGED} (page states v${changed}, collector pinned to v${CODING_AGENT_VERSION}): ` : ""}AA Coding Agent version absent or changed; review methodology before updating the collector`);
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
  // This is the current-version board, NOT the 68-row v1.4 board or the homepage highlights.
  // A source shrink is reviewed explicitly; it may not silently erase known rows.
  const sourceIds = new Set(sourceRows.map((row) => row?.id));
  const baseline = effectiveCodingAgentPrevious(previous, sourceIds);
  const minimum = Math.max(13, baseline?.count || 0);
  const incomplete = () => `AA Coding Agent incomplete scrape: ${sourceRows.length} rows (minimum ${minimum})`;
  if (sourceRows.length < 13) throw new Error(incomplete());
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
  if (rows.length < minimum) {
    // CR-709: the marker is decided on fully validated rows; the refusal itself is unchanged.
    const shrink = codingAgentRosterShrink(rows, baseline);
    throw new Error(`${shrink ? `${CODING_AGENT_ROSTER_SHRANK} (${shrink.rows} of ${shrink.previous_count} published rows; removed ${shrink.missing.map((row) => row.source_id).join(",")}): ` : ""}${incomplete()}`);
  }
  return {
    source: "ArtificialAnalysis Coding Agent Index", version: CODING_AGENT_VERSION,
    collected_at: new Date().toISOString().slice(0, 10), endpoint: CODING_AGENT_URL,
    methodology_url: CODING_AGENT_METHODOLOGY_URL,
    method: "Decode Flight JSON and resolve benchmarkRows references on the full coding-agents page; validate version, row count, identities, components and index arithmetic before atomic replacement.",
    score_scale: "0-1", basis: "measured", count: rows.length,
    components: COMPONENTS.map((id) => ({ id, label: CODING_AGENT_CONTRACTS[CODING_AGENT_VERSION].component_labels[id] })),
    completeness_note: `Complete v${CODING_AGENT_VERSION} benchmarkRows only. v1.4 and v1.5 remain separate dated snapshots (v1.4 feeds the unchanged Composite); versions use different components and must never be combined or compared as one scale.`,
    rows,
  };
}
