#!/usr/bin/env node
// 2026-09-15 controlled check of the normal daily refresh path for the new coding sources, without publishing:
// one capture per SWE Atlas page through scripts/capture-benchmark-sources.py (robots, delay, size bound), then
// ops/daily/public-candidate.py on the same plan entry with the fresh receipt — exactly what refresh-benchmarks.mjs
// does — compared with the committed rows. DeepSWE is a manual snapshot and must not be queued.
// Usage: node ops/benchmark-table-2026-09-15/controlled-refresh-check.mjs <outdir>
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const out = process.argv[2] || '/tmp/bh-controlled-refresh';
const captures = join(out, 'captures');
mkdirSync(captures, { recursive: true });
const plan = JSON.parse(readFileSync('data/raw/benchmarks/collection-plan.json'));
const committed = JSON.parse(readFileSync('data/raw/benchmarks/public-observations.json')).observations;
const specs = plan.entries.filter((e) => /^swe-atlas-/.test(e.benchmark_id));
const manual = plan.entries.filter((e) => e.refresh === 'manual').map((e) => e.benchmark_id);

writeFileSync(join(out, 'urls.json'), JSON.stringify(specs.map((s) => s.source.url)));
execFileSync('python3', ['scripts/capture-benchmark-sources.py', join(out, 'urls.json'), captures], { stdio: 'inherit', timeout: 300_000 });
const receipts = JSON.parse(readFileSync(join(captures, 'manifest.json')));
const semantic = (o) => JSON.stringify({ id: o.id, benchmark_id: o.benchmark_id, subject: o.subject, value: o.value, unit: o.unit, basis: o.basis });

const report = { checked_at: new Date().toISOString(), manual_snapshots_skipped: manual, boards: [] };
for (const [index, spec] of specs.entries()) {
  const receipt = receipts.find((r) => r.url === spec.source.url);
  const board = { benchmark_id: spec.benchmark_id, url: spec.source.url, status: receipt?.status ?? null, sha256: receipt?.sha256 ?? null, same_bytes_as_committed: receipt?.sha256 === spec.source.sha256 };
  report.boards.push(board);
  if (receipt?.status !== 200) { board.result = 'source unavailable (the daily run would retain prior rows)'; continue; }
  const proposed = { ...structuredClone(spec), source: { ...spec.source, ...receipt, fetched_at: receipt.retrieved_at ?? receipt.fetched_at } };
  const planFile = join(out, `plan-${index}.json`), candidateFile = join(out, `candidate-${index}.json`);
  writeFileSync(planFile, JSON.stringify({ schema_version: 1, entries: [proposed] }));
  try {
    execFileSync('python3', ['ops/daily/public-candidate.py', planFile, candidateFile], { timeout: 60_000 });
  } catch (error) { board.result = `candidate parser failed: ${String(error.stderr ?? error.message).slice(0, 300)}`; continue; }
  const rows = JSON.parse(readFileSync(candidateFile)).candidate.observations;
  const prior = committed.filter((o) => o.benchmark_id === spec.benchmark_id);
  const byId = new Map(prior.map((o) => [o.id, o]));
  // Joins happen at ingestion; compare the collector's native rows (model_id null on both sides).
  const native = (o) => semantic({ ...o, subject: { ...o.subject, model_id: null } });
  Object.assign(board, {
    candidate_rows: rows.length, committed_rows: prior.length,
    unchanged: rows.filter((r) => byId.has(r.id) && native(r) === native(byId.get(r.id))).length,
    changed: rows.filter((r) => byId.has(r.id) && native(r) !== native(byId.get(r.id))).map((r) => r.subject.name),
    added: rows.filter((r) => !byId.has(r.id)).map((r) => r.subject.name),
    disappeared: prior.filter((o) => !rows.some((r) => r.id === o.id)).map((o) => o.subject.name),
  });
  board.result = board.disappeared.length ? 'identities disappeared (the daily run fails closed and retains prior rows)'
    : board.changed.length || board.added.length ? 'changed rows would go to the different-family gauntlet review' : 'checked_unchanged';
}
writeFileSync(join(out, 'controlled-refresh-check.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
