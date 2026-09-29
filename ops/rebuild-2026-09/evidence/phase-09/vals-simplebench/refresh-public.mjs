#!/usr/bin/env node
// CR-173 (vals-simplebench), 2026-09-26: re-collect named public-plan boards from their current plan receipts, the
// same way the daily does (ops/daily/public-candidate.py + reconcilePublicIdentities, which keeps every prior public
// ID), and replace those boards' rows in data/raw/benchmarks/public-observations.json. Run from the repo root:
//   node ops/rebuild-2026-09/evidence/phase-09/vals-simplebench/refresh-public.mjs OUT_DIR benchmark_id...
// Writes OUT_DIR/candidate-<n>.json (candidate + native evidence) and OUT_DIR/changes.json (per-row diff).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { reconcilePublicIdentities } from '../../../../daily/public-identities.mjs';

const [outDir, ...ids] = process.argv.slice(2);
if (!outDir || !ids.length) throw new Error('usage: refresh-public.mjs OUT_DIR benchmark_id...');
mkdirSync(outDir, { recursive: true });
const plan = JSON.parse(readFileSync('data/raw/benchmarks/collection-plan.json'));
const publicPath = 'data/raw/benchmarks/public-observations.json';
const pub = JSON.parse(readFileSync(publicPath));
const withdrawals = JSON.parse(readFileSync('data/raw/benchmarks/public-withdrawals.json')).withdrawals ?? [];
const semantic = (r) => ({ ...r, source: undefined, supporting_sources: undefined });
const changes = [];
for (const [n, id] of ids.entries()) {
  const spec = plan.entries.find((e) => e.benchmark_id === id);
  if (!spec?.parser || spec.refresh === 'manual') throw new Error(`${id}: no parser-driven plan entry`);
  const onePlan = join(outDir, `plan-${n}.json`), output = join(outDir, `candidate-${n}.json`);
  writeFileSync(onePlan, JSON.stringify({ schema_version: 1, entries: [spec] }, null, 2) + '\n');
  execFileSync('python3', ['ops/daily/public-candidate.py', onePlan, output], { stdio: 'inherit' });
  const { candidate, evidence } = JSON.parse(readFileSync(output));
  const prior = pub.observations.filter((r) => r.benchmark_id === id);
  const reconciled = reconcilePublicIdentities(candidate.observations, evidence, prior, { withdrawals: withdrawals.filter((w) => w.benchmark_id === id) });
  if (reconciled.withdrawn.length) throw new Error(`${id}: withdrawals would apply; review by hand`);
  const old = new Map(prior.map((r) => [r.id, r]));
  for (const r of reconciled.rows) {
    const before = old.get(r.id);
    if (!before) changes.push({ benchmark_id: id, id: r.id, source_id: r.subject.source_id, change: 'new', value: r.value });
    else if (before.value !== r.value) changes.push({ benchmark_id: id, id: r.id, source_id: r.subject.source_id, change: 'value', from: before.value, to: r.value });
    else if (!isDeepStrictEqual(semantic(before), semantic(r))) changes.push({ benchmark_id: id, id: r.id, source_id: r.subject.source_id, change: 'protocol_only' });
  }
  const at = pub.observations.findIndex((r) => r.benchmark_id === id);
  pub.observations = pub.observations.filter((r) => r.benchmark_id !== id);
  pub.observations.splice(at < 0 ? pub.observations.length : at, 0, ...reconciled.rows);
  const c = candidate.collections.find((x) => x.benchmark_id === id);
  const ci = pub.collections.findIndex((x) => x.benchmark_id === id);
  if (ci < 0) pub.collections.push(c); else pub.collections[ci] = c;
  console.log(id, 'rows', reconciled.rows.length, 'prior', prior.length);
}
writeFileSync(join(outDir, 'changes.json'), JSON.stringify(changes, null, 2) + '\n');
writeFileSync(publicPath, JSON.stringify(pub, null, 2) + '\n');
console.log(JSON.stringify(changes.reduce((a, c) => ({ ...a, [c.change]: (a[c.change] ?? 0) + 1 }), {})));
