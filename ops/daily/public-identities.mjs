import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

// Source order is evidence, not model identity. Never match similar names.
const identity = (row) => {
  const fields = [row.benchmark_id, row.subject?.source_id, row.subject?.name, row.unit, row.basis];
  if (typeof row.id !== 'string' || !row.id || fields.some((v) => typeof v !== 'string' || !v)) throw new Error('Invalid public identity');
  for (const v of [row.subject.variant, row.subject.harness, row.source_basis]) if (v != null && typeof v !== 'string') throw new Error('Invalid public identity qualifier');
  return JSON.stringify([row.benchmark_id, row.subject.source_id, row.subject.name, row.subject.variant ?? null, row.subject.harness ?? null, row.unit, row.basis, row.source_basis ?? null]);
};
const semantics = ({ source, supporting_sources, ...row }) => row;
const group = (rows) => {
  const result = new Map(), ids = new Set();
  for (const row of rows) {
    const key = identity(row);
    if (ids.has(row.id)) throw new Error('Duplicate input public ID');
    ids.add(row.id); result.set(key, [...(result.get(key) ?? []), row]);
  }
  return result;
};

// A prior row may leave only through a reviewed withdrawal record (data/raw/benchmarks/public-withdrawals.json)
// that names its exact public ID *and* source label, and only while that source identity is really absent
// from today's rows. Anything else missing still fails closed, so a partial page can never erase data.
export function applicablePublicWithdrawals(priorRows, candidateRows, withdrawals = []) {
  const present = new Set(candidateRows.map(identity)), byId = new Map(priorRows.map((row) => [row.id, row]));
  return withdrawals.filter((w) => {
    const prior = byId.get(w.id);
    if (!prior) return false;
    if (w.benchmark_id !== prior.benchmark_id || w.source_id !== prior.subject?.source_id) throw new Error(`Withdrawal ${w.id} does not match its prior row`);
    return !present.has(identity(prior));
  });
}

export function reconcilePublicIdentities(candidateRows, nativeEvidence, allPriorRows, { withdrawals = [] } = {}) {
  const withdrawn = applicablePublicWithdrawals(allPriorRows, candidateRows, withdrawals);
  const gone = new Set(withdrawn.map((w) => w.id)), priorRows = allPriorRows.filter((row) => !gone.has(row.id));
  const previous = group(priorRows), candidates = group(candidateRows);
  const rows = [], evidence = {}, ids = new Set();
  for (const row of candidateRows) {
    if (!Object.hasOwn(nativeEvidence, row.id) || nativeEvidence[row.id] == null) throw new Error(`Missing native evidence: ${row.id}`);
    const key = identity(row), prior = previous.get(key) ?? [], current = candidates.get(key);
    let id;
    if (prior.length <= 1 && current.length === 1) {
      id = prior[0]?.id ?? `public:${createHash('sha256').update('public-identity-v1\0' + key).digest('hex').slice(0, 24)}`;
    } else {
      const exact = prior.find((old) => old.id === row.id);
      if (!exact || !isDeepStrictEqual(semantics(exact), semantics(row))) throw new Error(`Ambiguous changed public identity: ${row.id}`);
      id = row.id;
    }
    if (ids.has(id)) throw new Error(`Duplicate reconciled public ID: ${id}`);
    ids.add(id); rows.push({ ...row, id }); evidence[id] = nativeEvidence[row.id];
  }
  if (priorRows.some((row) => !ids.has(row.id))) throw new Error('Prior public identities disappeared');
  return { rows, evidence, withdrawn };
}
