// CR-229: protocol acceptance is per benchmark. A failed field keeps an exact
// prior raw snapshot and its source/approval lock while independently reviewed
// fields may use a new snapshot. Never combine old values with a new source date.
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

export async function reviewAaMappings(mappings, review) {
  const decisions = [];
  for (const mapping of mappings) {
    try {
      await review(mapping);
      decisions.push({ benchmark_id: mapping.benchmark_id, accepted: true });
    } catch (error) {
      decisions.push({ benchmark_id: mapping.benchmark_id, accepted: false, reason: error.message ?? String(error), error });
    }
  }
  return decisions;
}

export function retainedAaBenchmarks({ previous = {}, priorSnapshotLock, decisions }) {
  const retained = { ...previous };
  const { retained_benchmarks, ...prior } = priorSnapshotLock;
  for (const decision of decisions) {
    if (decision.accepted) delete retained[decision.benchmark_id];
    else retained[decision.benchmark_id] = { ...(previous[decision.benchmark_id] ?? prior), reason: decision.reason };
  }
  return retained;
}

export async function loadAaBenchmarkSnapshots({ snapshot, lock, mappings, read = readFile }) {
  const ids = new Set(mappings.map((m) => m.benchmark_id));
  const retained = lock.retained_benchmarks ?? {};
  for (const id of Object.keys(retained)) if (!ids.has(id)) throw new Error(`Unknown AA retained benchmark: ${id}`);
  const loaded = new Map(), views = new Map();
  for (const { benchmark_id: id } of mappings) {
    const spec = retained[id];
    if (!spec) { views.set(id, { snapshot, lock }); continue; }
    if (typeof spec.observations_file !== 'string' || !spec.observations_file || typeof spec.source_file !== 'string' || !spec.source_file) {
      throw new Error(`AA retained snapshot lacks locked files: ${id}`);
    }
    const key = JSON.stringify([spec.observations_file, spec.observations_sha256, spec.source_sha256]);
    let prior = loaded.get(key);
    if (!prior) {
      const bytes = await read(spec.observations_file);
      if (hash(bytes) !== spec.observations_sha256) throw new Error(`AA retained snapshot hash mismatch: ${id}`);
      prior = JSON.parse(bytes);
      if (prior.source_sha256 !== spec.source_sha256 || !/^[a-f0-9]{64}$/.test(spec.source_sha256 ?? '')
          || !Number.isFinite(Date.parse(prior.collected_at)) || !Array.isArray(prior.rows)) {
        throw new Error(`AA retained snapshot provenance mismatch: ${id}`);
      }
      loaded.set(key, prior);
    }
    views.set(id, { snapshot: prior, lock: spec });
  }
  return views;
}
