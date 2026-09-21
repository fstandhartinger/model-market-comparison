// CR-73.3: the live-source contract gauntlet, as independent units.
//
// Each of the seven adapter contracts (aa, da, or, aa_efficiency, or_efficiency,
// chutes_efficiency, aa_coding_v15) is reviewed on its own frozen packet in its own
// `runDir/gauntlet/live-contract-<dataset>/` directory: no unit reads or writes
// another unit's files, and none of them touch the staged checkout. Reviewing them
// one after the other cost 34.6 min of the 17 Sep baseline (PROFILE-CR73.md).
//
// So the review runs with bounded concurrency, and everything that *decides*
// something — retention of a withheld snapshot, the deterministic fallback, the
// progress file, the stage failure — runs afterwards, strictly in manifest order.
// The decision loop is byte-identical to the sequential one it replaces; only the
// waiting is shared. `planRejectedContract` counts earlier retentions, which is why
// it must never see units in completion order.
import { join } from 'node:path';
import { writeJSONAtomic } from '../../lib/snapshot.mjs';
import { reviewArtifact, sha256, GAUNTLET_LIMITS } from './gauntlet.mjs';
import { planRejectedContract, retainPriorSnapshot, reviewerUnavailable } from './live-retention.mjs';
import { mapWithConcurrency, dailyConcurrency } from './concurrency.mjs';
import { openReuseCache, unitFingerprint, reuseProvenance, withoutCaptureStamps } from './reuse-cache.mjs';
import { RULES } from './review-live.mjs';

export const LIVE_CONTRACT_CRITERIA = [
  { id: 'mapping', text: 'Review this source adapter contract using the actual supplied native primary examples, verifier code, and successful execution report. The programmatic verifier compared EVERY numeric row against complete hash-verified primary bodies. LLM inspection is explicitly limited to the contract and listed examples, not manual full-row numeric coverage. Does the mapping preserve native units, identities, zero/null distinctions and required version boundaries?' },
  { id: 'safety', text: 'Trace missing/partial source, retained metadata and numeric equality checks in the supplied verifier. Retained values must equal prior accepted values and keep their original dates. Unreachable measurements cannot become fresh values. Hash checking and execution are performed by the owner program; inability to execute those yourself is not missing evidence. Raise actual unsupported claimed mapping or missing relevant evidence, without demanding unrelated fields or benchmarks on raw API data.' },
];

// The verifier sections each contract's critic is shown, as [start, end) markers.
const VERIFIER_SECTIONS = {
  aa: ['async function verifyAa(', 'async function verifyDa('],
  da: ['async function verifyDa(', 'async function verifyOr('],
  or: ['async function verifyOr(', 'async function verifyAaEfficiency('],
  aa_efficiency: ['function aaCarrierExtracts(', 'async function verifyOrEfficiency('],
  or_efficiency: ['async function verifyOrEfficiency(', 'async function verifyChutes('],
  chutes_efficiency: ['async function verifyChutes(', '// Raw benchmarkRows'],
  aa_coding_v15: ['function codingSourceRows(', '// --- evidence packets'],
};

const exampleContent = (r) => JSON.stringify({ row_id: r.row_id, staged: r.staged, primary: r.extract });

/**
 * Build one review unit per dataset — pure, in manifest order, no worker call.
 */
export function buildLiveContractUnits({ manifest, verified, verifier, aaEfficiencyParser, reviewerSource = null, now = () => new Date().toISOString() }) {
  return manifest.datasets.map((dataset) => {
    const packets = verified.evidence.packets.filter((p) => p.dataset === dataset.dataset);
    const allRows = packets.flatMap((p) => p.rows);
    // 2026-09-20: or_efficiency's first row (deepseek-v4-pro's model page, 137 kB) outgrew the per-source bound and the
    // contract was refused before any critic saw it, run after run. An oversized first/last example is replaced by the
    // nearest row of the same shape (same extract keys, so a model page stays a model page) that fits; when none does,
    // the oversized row stays and the packet builder still refuses the unit. The verifier still compares every row.
    const fits = (r) => Buffer.byteLength(exampleContent(r)) <= GAUNTLET_LIMITS.sourceBytesCap;
    const shape = (r) => JSON.stringify(r.extract && typeof r.extract === 'object' ? Object.keys(r.extract).sort() : typeof r.extract);
    const standIn = (original, order) => fits(original) ? original : order.find((r) => shape(r) === shape(original) && fits(r)) ?? original;
    const examples = [standIn(allRows[0], allRows), standIn(allRows.at(-1), [...allRows].reverse())].filter((r, i, a) => a.findIndex((x) => x.row_id === r.row_id) === i);
    const row = { id: dataset.dataset, mapping: RULES[dataset.dataset],
      required_rows: dataset.rows, programmatically_verified_rows: allRows.length,
      model_review_scope: 'extraction contract, failure/retention rules and explicitly supplied example rows',
      example_row_ids: examples.map((r) => r.row_id) };
    const [start, end] = VERIFIER_SECTIONS[dataset.dataset] ?? [];
    const begin = start ? verifier.indexOf(start) : -1;
    const finish = start ? verifier.indexOf(end, begin + start.length) : -1;
    if (begin < 0 || finish < 0) throw new Error(`Missing reviewed verifier section: ${dataset.dataset}`);
    const sources = [
      { url: 'repo:ops/daily/review-live.mjs', locator: `${start} through ${end}`, content: verifier.slice(verifier.indexOf('const RAW_DEFAULT'), verifier.indexOf('async function verifyAa(')) + '\n' + verifier.slice(begin, finish), sha256: sha256(verifier), retrieved_at: now(), note: 'Exact local verifier code; hash binds its full file' },
      { url: 'execution:review-live', sha256: sha256(JSON.stringify(verified.report)), retrieved_at: now(), locator: dataset.dataset, content: JSON.stringify({ run_started_at: verified.report.run?.first_receipt, dataset, execution_report: verified.report, complete_coverage: manifest.coverage }) },
      ...examples.map((r) => ({ ...r.source, locator: r.pointer, content: exampleContent(r) })),
    ];
    if (dataset.dataset === 'aa_efficiency') sources.splice(1, 0, {
      url: 'repo:lib/aa-efficiency.mjs', locator: 'complete file', content: aaEfficiencyParser,
      sha256: sha256(aaEfficiencyParser), retrieved_at: now(), note: 'Complete local AA-efficiency parser used by the deterministic verifier',
    });
    // CR-73.2: what this unit's review actually depends on, with every run-varying field left
    // out. The packet also carries timestamps, receipt file paths and the execution report's
    // run window — all of which differ on every run while saying nothing new about the data —
    // so the fingerprint is built from the semantics instead of from the packet bytes:
    // the complete row set (identity, pointer, staged value, primary extract and the capture
    // hash behind each row), the extraction contract, the criteria, and the reviewed code.
    const captures = [...new Set(allRows.map((r) => r.source?.sha256).filter(Boolean))].sort();
    const fingerprint = reviewerSource === null ? null : unitFingerprint({
      kind: 'live-contract', id: dataset.dataset,
      inputs: {
        contract: RULES[dataset.dataset] ?? null,
        criteria: LIVE_CONTRACT_CRITERIA.map((c) => ({ id: c.id, text: c.text })),
        required_rows: dataset.rows,
        verifier_sha256: sha256(verifier),
        // The code that *asks* the question, not only the code that produced the answer: the packet
        // builder, the round budget, the family-separation rule and the unit builder all shape what
        // a critic is shown. Without it (`reviewerSource: null`) a unit gets no fingerprint at all
        // and is always reviewed fresh — not knowing the reviewer version must never mean reusing.
        reviewer_sha256: sha256(reviewerSource),
        verifier_section: `${start} through ${end}`,
        aa_efficiency_parser_sha256: dataset.dataset === 'aa_efficiency' ? sha256(aaEfficiencyParser) : null,
        captures,
        // The rows themselves, not a count: a changed staged value or primary extract must be a miss
        // even when the capture it came from is served under the same hash by a different pointer.
        // Our own capture stamps are dropped (see withoutCaptureStamps): they record when we
        // fetched, never what we got, and the hash of the bytes sits right beside each of them.
        rows_sha256: sha256(JSON.stringify(allRows.map((r) => [r.row_id, r.pointer, r.source?.url ?? null, r.source?.sha256 ?? null,
          withoutCaptureStamps(r.staged), withoutCaptureStamps(r.extract)]))),
      },
    });
    return { dataset: dataset.dataset, rows: allRows.length, examples: examples.map((r) => r.row_id), row, sources, fingerprint, captures };
  });
}

/**
 * Review every unit with bounded concurrency, then decide in manifest order.
 * The injectable `review`/`retain`/`log` make the decision loop testable without a worker.
 */
export async function reviewLiveContracts({
  runDir, rawDir, units, review = reviewArtifact, retain = retainPriorSnapshot,
  limit = dailyConcurrency(), log = console, cache = null, runId = null,
} = {}) {
  if (!runDir) throw new Error('reviewLiveContracts requires runDir');
  const progressFile = join(runDir, 'reports', 'live-gauntlet-progress.json');
  const done = new Set();
  // CR-73.2: a disabled cache is a real object that misses on everything, so there is exactly
  // one code path here whether reuse is on or off.
  const reuse = cache ?? await openReuseCache({ enabled: false });
  const reused = [];
  const settled = await mapWithConcurrency(units, (unit) => {
    const entry = unit.fingerprint ? reuse.get(unit.fingerprint) : null;
    if (entry) {
      const provenance = reuseProvenance(entry);
      log.log?.(`live gauntlet ${unit.dataset}: inputs byte-identical to the accepted review of ${provenance.accepted_run_id ?? provenance.accepted_at} — reusing that verified outcome (CR-73.2, fingerprint ${unit.fingerprint.slice(0, 12)})`);
      return Promise.resolve({
        ...entry.outcome, reviews: [], reuse: provenance,
        manifest: { ...entry.outcome.manifest, reused: provenance },
      });
    }
    return review({
      runDir, artifactId: `live-contract-${unit.dataset}`, rows: [unit.row], sources: unit.sources, criteria: LIVE_CONTRACT_CRITERIA,
    });
  }, {
    limit,
    // Serialised by mapWithConcurrency; the content is the sorted set of finished
    // units, so the file never depends on which lane won a race.
    onSettled: async (index) => {
      done.add(units[index].dataset);
      await writeJSONAtomic(progressFile, { total_contracts: units.length, concurrency: limit,
        reviewed_contracts: units.map((u) => u.dataset).filter((d) => done.has(d)) });
    },
  });

  const reviewed = [], retained = [], deterministic = [];
  for (const [index, unit] of units.entries()) {
    const outcome = settled[index];
    // A thrown review is a stage failure, exactly as in the sequential loop — but
    // it is raised in unit order, after every unit has spent its own budget.
    if (outcome.status === 'rejected') throw outcome.reason;
    const result = outcome.value;
    reviewed.push({ dataset: unit.dataset, programmatic_rows: unit.rows, example_rows: unit.examples, ...result });
    await writeJSONAtomic(progressFile, { total_contracts: units.length, concurrency: limit, reviewed, retained, deterministic });
    if (reviewerUnavailable(result)) {
      // 17 Sep 2026: never block a day on a reviewer format error. The deterministic verifier already matched every row.
      deterministic.push({ dataset: unit.dataset, decision: 'model review unavailable after all retries; accepted on the deterministic full-row verification', reasons: result.errors.slice(0, 5) });
      await writeJSONAtomic(progressFile, { total_contracts: units.length, concurrency: limit, reviewed, retained, deterministic });
      log.warn(`live gauntlet ${unit.dataset}: model review unavailable (${result.errors.join('; ').slice(0, 300)}) — accepted on the deterministic verification of ${unit.rows} rows`);
      continue;
    }
    if (!result.accepted || result.fingerprints.length !== 1 || result.quarantined.length) {
      const plan = planRejectedContract(unit.dataset, retained);
      if (plan.action !== 'retain') throw new Error(`Live source contract rejected ${unit.dataset}: ${result.errors.join('; ')} (${plan.reason})`);
      // CR-67.2: never overrule the review — withhold this dataset's fresh capture and keep the published snapshot.
      retained.push(await retain({ runDir, rawDir, dataset: unit.dataset, errors: result.errors }));
      await writeJSONAtomic(progressFile, { total_contracts: units.length, concurrency: limit, reviewed, retained, deterministic });
      log.warn(`live gauntlet ${unit.dataset}: contract NOT accepted — previous snapshot retained (${result.errors.join('; ').slice(0, 300)})`);
      continue;
    }
    // CR-73.2: an outcome a different-family critic accepted, over inputs whose fingerprint is
    // recorded with it. Only this branch stores — a retention, a rejection and the deterministic
    // fallback above all `continue` before it, so none of them can ever become a reusable pass.
    if (result.reuse) reused.push({ dataset: unit.dataset, ...result.reuse });
    else if (unit.fingerprint) await reuse.put({
      fingerprint: unit.fingerprint, kind: 'live-contract', id: unit.dataset, decision: 'accepted', run_id: runId,
      captures: unit.captures ?? [],
      note: `${unit.rows} rows verified against primary bodies; ${unit.examples.length} explicit model examples`,
      outcome: { accepted: true, fingerprints: result.fingerprints, quarantined: [], errors: [], manifest: result.manifest },
    });
    log.log(`live gauntlet ${unit.dataset}: contract accepted; ${unit.rows} rows verified against primary bodies; ${unit.examples.length} explicit model examples`);
  }
  return { reviewed, retained, deterministic, reused, reuse_stats: reuse.stats() };
}
