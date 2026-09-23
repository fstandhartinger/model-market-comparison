// F-165(a), the rekey half: which vendor launch rows join an independent board's identity.
//
//   node verify-f165-a-rekey.mjs [outDir] [host ...]
//
// The open clause was "a launch row joining the board's own identity where the protocol matches
// it" — a per-row protocol match, not a name match. This receipt settles that question for every
// vendor launch row in the dataset and then measures what the pending joins cost on the live site.
// Nothing here is a typed expectation and no board id is hard-coded: the partition is re-derived
// from each row's own protocol text and from the counterpart entry's own `maintainer`, and the
// hosts are then required to agree.
//
// The rule the rows themselves state lives in ./f165a-rule.mjs, so this receipt and
// test/f165a-vendor-reprint.test.mjs judge by the same three conditions.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { partitionVendorRows, counterExamples } from './f165a-rule.mjs';

const REPO = process.env.BH_REPO || '/opt/model-market-comparison';
const OUT = process.argv[2] || '/opt/benchmarkheaven/state/ux-evidence/f165a-rekey';
const HOSTS = process.argv.slice(3).length ? process.argv.slice(3)
  : ['https://benchmarkheaven.com', 'https://model-market-comparison.app.mintapis.com'];
await mkdir(OUT, { recursive: true });

const checks = [];
const check = (scope, name, ok, detail) => {
  checks.push({ scope, name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${scope} ${name}${ok ? '' : ` — ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`}`);
};

// ------------------------------------------------------------------ the repository
const dataset = JSON.parse(await readFile(`${REPO}/data/dataset.json`, 'utf8'));
const results = dataset.benchmark_results;
const { superseded, separate, vendorBoards } = partitionVendorRows(results);

check('repo', 'every vendor launch row is decided', superseded.length + separate.length > 0,
  `${superseded.length} join, ${separate.length} stay separate, across ${vendorBoards.length} vendor-scoped boards`);

// The two conditions that are not a name match have to be doing work, or the rule is a rubber
// stamp. `kept` are rows whose benchmark name *does* have an independently measured counterpart
// for the same model and which stay separate anyway, because a different runner produced them.
const kept = counterExamples(results, separate);
check('repo', 'a vendor row with a measured same-name counterpart still stays separate', kept.length > 0,
  'condition (1) alone must never be enough to join a row');

// Each pending join has to survive being looked at one more time: the counterpart must really hold
// that measurement, from the maintainer the vendor row names, at the vendor's printed precision.
for (const row of superseded) {
  const measured = results.observations.find((o) => o.id === row.measured_id);
  check('repo', `pending join ${row.benchmark_id}: counterpart holds the measurement`,
    !!measured && measured.benchmark_id === row.counterpart && measured.subject.model_id === row.model_id
    && (measured.source_basis ?? measured.basis) === 'measured',
    { counterpart: row.counterpart, measured_id: row.measured_id });
  check('repo', `pending join ${row.benchmark_id}: the vendor names ${row.maintainer} as the runner`,
    new RegExp(`run independently by ${row.maintainer}`, 'i').test(
      results.observations.find((o) => o.id === row.id)?.protocol ?? ''), row.id);
}

// What the pending joins cost: a model credited with two boards for one evaluation reads a
// capability-benchmark count that no distinct evaluation stands behind.
const inflated = [];
for (const row of superseded) {
  const coverage = results.coverage?.by_model?.[row.model_id];
  if (coverage) inflated.push({ model_id: row.model_id, capability_available: coverage.capability_available, board: row.benchmark_id });
}
check('repo', 'the cost of the pending joins is recorded', inflated.length === superseded.length, inflated);

// The join moves a published number onto another board, and every self-reported vendor score is
// bound to a producer/critic approval digest (lib/benchmark-score-evidence.mjs). `identity_review`
// covers a `subject.model_id` join only, so a `benchmark_id` rekey has no approved path yet: that
// is why these stay pending rather than being applied quietly.
const evidence = await readFile(`${REPO}/lib/benchmark-score-evidence.mjs`, 'utf8');
check('repo', 'the approval guard that blocks an unreviewed rekey is still in place',
  /Unreviewed vendor score/.test(evidence) && /identity_review/.test(evidence),
  'if this guard disappeared, a vendor score could be moved between boards with no review');

// ------------------------------------------------------------------ what the hosts serve
for (const host of HOSTS) {
  const scope = new URL(host).host;
  let served;
  try {
    const response = await fetch(`${host}/api/benchmarks?t=${Date.now()}`, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    served = await response.json();
  } catch (error) { check(scope, 'api/benchmarks', false, error.message); continue; }
  const list = served.benchmarks ?? served.registry ?? served.data ?? served;
  const ids = new Set(Array.isArray(list) ? list.map((b) => b.id ?? b.benchmark_id) : []);
  check(scope, 'api/benchmarks answered', ids.size > 0, `${ids.size} boards`);
  // The finding is about the live product, not only the checkout: both the vendor-scoped board and
  // the board it duplicates are served today.
  for (const row of superseded) {
    check(scope, `the vendor-scoped board ${row.benchmark_id} is served`, ids.has(row.benchmark_id), 'expected the pending join to still be live');
    check(scope, `the board it duplicates ${row.counterpart} is served`, ids.has(row.counterpart), 'counterpart missing live');
  }
  for (const row of separate.slice(0, 5)) {
    check(scope, `retained vendor board ${row.benchmark_id} is served`, ids.has(row.benchmark_id), 'a retained board disappeared');
  }
}

const failed = checks.filter((c) => !c.ok);
await writeFile(`${OUT}/verification.json`, `${JSON.stringify({ generated_at: new Date().toISOString(), hosts: HOSTS,
  rule: "superseded = a counterpart board holds a measured row for the same model configuration, AND the vendor row's protocol names that counterpart's maintainer as the runner, AND the vendor's printed value is that measurement at the vendor's printed precision",
  vendor_boards: vendorBoards.length, rows_decided: superseded.length + separate.length,
  pending_joins: superseded, stay_separate: separate.length, counter_examples: kept.map((r) => r.benchmark_id),
  coverage_cost: inflated, checks, passed: checks.length - failed.length, failed: failed.length }, null, 2)}\n`);
console.log(`\n${checks.length - failed.length}/${checks.length} passed — ${OUT}/verification.json`);
process.exit(failed.length ? 1 : 0);
