// Phase 10 — append an immutable dated benchmark state and refresh the history index.
//
// Idempotent: the state id is <yyyymmdd>-<contenthash8>, so re-running on unchanged
// observations is a no-op. An existing state file is never overwritten; if the same
// state id somehow carries different content the run aborts instead of clobbering.
//
//   node scripts/build-benchmark-history.mjs                 # append current scores.json
//   node scripts/build-benchmark-history.mjs --from <file>   # append an explicit snapshot
//   node scripts/build-benchmark-history.mjs --reindex       # rebuild index.json only
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { HISTORY_SCHEMA_VERSION, buildState } from "../lib/benchmark-history.mjs";
import { buildHeadlineObservations } from "../lib/headline-history.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const HISTORY_DIR = join(ROOT, "data", "raw", "benchmarks", "history");
const STATES_DIR = join(HISTORY_DIR, "states");

const readJSON = async (path) => JSON.parse(await readFile(path, "utf8"));
const fileSha256 = async (path) => createHash("sha256").update(await readFile(path)).digest("hex");

export function stateId(collected_at, content_sha256) {
  return `${String(collected_at).slice(0, 10).replace(/-/g, "")}-${content_sha256.slice(0, 8)}`;
}

export async function readIndex(dir = HISTORY_DIR) {
  const file = join(dir, "index.json");
  if (!existsSync(file)) return { schema_version: HISTORY_SCHEMA_VERSION, index_hash: null, states: [] };
  return readJSON(file);
}

// Full state bodies (with rows), needed for dated-state estimates.
export async function readHistory(dir = HISTORY_DIR) {
  const index = await readIndex(dir);
  const states = [];
  for (const meta of index.states) {
    const path = join(dir, meta.file ?? join("states", `${meta.state_id}.json`));
    if (!existsSync(path)) continue;
    states.push(await readJSON(path));
  }
  return { schema_version: index.schema_version ?? HISTORY_SCHEMA_VERSION, index_hash: index.index_hash ?? null, states };
}

export async function reindex(dir = HISTORY_DIR) {
  const statesDir = join(dir, "states");
  const files = existsSync(statesDir) ? (await readdir(statesDir)).filter((f) => f.endsWith(".json")) : [];
  const states = [];
  for (const f of files) {
    const s = await readJSON(join(statesDir, f));
    states.push({ state_id: s.state_id, source: s.source, collected_at: s.collected_at, content_sha256: s.content_sha256,
      count: s.count ?? s.rows?.length ?? 0, benchmark_ids: s.benchmark_ids ?? [], file: `states/${f}` });
  }
  states.sort((a, b) => String(a.collected_at).localeCompare(String(b.collected_at)));
  const index_hash = (await import("../lib/benchmark-score-evidence.mjs")).sha256(JSON.stringify(states));
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "index.json"), JSON.stringify({ schema_version: HISTORY_SCHEMA_VERSION, index_hash, states }, null, 2) + "\n");
  return { schema_version: HISTORY_SCHEMA_VERSION, index_hash, states };
}

export async function writeStateOnce(dir, state) {
  await mkdir(join(dir, "states"), { recursive: true });
  const file = join(dir, "states", `${state.state_id}.json`);
  if (existsSync(file)) {
    const existing = await readJSON(file);
    if (existing.content_sha256 !== state.content_sha256) {
      throw new Error(`benchmark history: state ${state.state_id} exists with different content (${existing.content_sha256} vs ${state.content_sha256})`);
    }
    return { written: false, state_id: state.state_id, file: `states/${state.state_id}.json` };
  }
  await writeFile(file, JSON.stringify(state) + "\n", { flag: "wx" });
  return { written: true, state_id: state.state_id, file: `states/${state.state_id}.json` };
}

export async function appendState({ root = ROOT, from = null, source = null, collected_at = null } = {}) {
  const dir = join(root, "data", "raw", "benchmarks", "history");
  const scoresPath = from ?? join(root, "data", "raw", "benchmarks", "scores.json");
  const snapshot = await readJSON(scoresPath);
  const when = collected_at ?? snapshot.collected_at ?? snapshot.verified_at ?? new Date().toISOString();
  const label = source ?? (from ? `snapshot:${from}` : "scores.json");
  // Headline boards are kept alongside registry observations in the immutable
  // state, but remain history-only so the product's benchmark denominator does
  // not silently change. A catalog join is optional and is never inferred.
  const rawDir = join(root, "data", "raw");
  const load = async (name) => {
    try { return await readJSON(join(rawDir, name)); } catch (error) { if (error.code === "ENOENT") return null; throw error; }
  };
  const [artificialanalysis, designarena, epochEci, dataset] = await Promise.all([
    load("artificialanalysis.json"), load("designarena.json"), load("epoch-eci.json"), load("../dataset.json"),
  ]);
  const withHash = async (payload, name) => payload ? { ...payload, sha256: await fileSha256(join(rawDir, name)) } : null;
  const headlineObservations = buildHeadlineObservations({
    artificialanalysis: await withHash(artificialanalysis, "artificialanalysis.json"),
    designarena: await withHash(designarena, "designarena.json"),
    epochEci,
    modelRows: dataset?.models || [],
  });
  const provisional = buildState([...snapshot.observations ?? [], ...headlineObservations], { state_id: "pending", source: label, collected_at: when });
  const existing = (await readIndex(dir)).states.find((s) => s.content_sha256 === provisional.content_sha256);
  if (existing) {
    const index = await reindex(dir);
    return { written: false, dedup: true, state_id: existing.state_id, file: existing.file, index_hash: index.index_hash, count: existing.count, benchmark_ids: (existing.benchmark_ids ?? []).length };
  }
  const state = { ...provisional, state_id: stateId(when, provisional.content_sha256) };
  const result = await writeStateOnce(dir, state);
  const index = await reindex(dir);
  return { ...result, index_hash: index.index_hash, count: state.count, benchmark_ids: state.benchmark_ids.length };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--reindex")) {
    const index = await reindex();
    console.log(JSON.stringify({ reindexed: index.states.length, index_hash: index.index_hash }, null, 2));
    return;
  }
  const from = args.includes("--from") ? args[args.indexOf("--from") + 1] : null;
  const result = await appendState({ from });
  console.log(JSON.stringify(result, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((error) => { console.error(error.message); process.exit(1); });
