#!/usr/bin/env node
// CR-173 (frontiercode lane), 2026-09-26: the daily public arm for the two FrontierCode plan entries, run once
// against this lane's capture: candidate plan (source receipts swapped for the 2026-09-26 capture), the reviewed
// collector (ops/daily/public-candidate.py → scripts/collect-public-benchmarks.py), and the daily's identity
// reconciliation (ops/daily/public-identities.mjs). Writes candidate-plan.json, candidate-collected.json and
// changed-rows.json next to this file; public-observations.json is only written with --apply.
// --prior PATH compares against another copy of public-observations.json (the lane ran twice: first the Main boards
// against the branch base, written to changed-rows.json; then, after the Extended identities were added, the Extended
// boards, written with --changed changed-rows-extended.json).
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { isDeepStrictEqual as equal } from 'node:util';
import { reconcilePublicIdentities } from '../../../../daily/public-identities.mjs';

const D = 'ops/rebuild-2026-09/evidence/phase-09/frontiercode', E = 'data/raw/benchmarks/daily-evidence/2026-09-26-frontiercode';
const manifest = JSON.parse(readFileSync(`${E}/manifest.json`, 'utf8'));
const receipt = (url) => { const r = manifest.find((x) => x.url === url && x.status === 200); if (!r) throw new Error(`no capture: ${url}`);
  return { url: r.url, file: r.file, sha256: r.sha256, retrieved_at: r.retrieved_at }; };
const plan = JSON.parse(readFileSync('data/raw/benchmarks/collection-plan.json', 'utf8'));
const specs = plan.entries.filter((s) => ['frontiercode::1.1', 'frontiercode-cost::1.1', 'frontiercode-extended::1.1', 'frontiercode-extended-cost::1.1'].includes(s.benchmark_id)).map((s) => {
  const p = structuredClone(s); p.source = receipt(s.source.url); p.parser.method_source = receipt(s.parser.method_source.url); return p; });
writeFileSync(`${D}/candidate-plan.json`, JSON.stringify({ schema_version: 1, entries: specs }, null, 2) + '\n');
const publicPath = 'data/raw/benchmarks/public-observations.json';
const flag = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; };
const pub = JSON.parse(readFileSync(flag('--prior') ?? publicPath, 'utf8'));
const withdrawals = JSON.parse(readFileSync('data/raw/benchmarks/public-withdrawals.json', 'utf8')).withdrawals;
const semantic = (row) => ({ ...row, source: undefined, supporting_sources: undefined });
const out = { candidates: {}, changed: [] };
let rows = pub.observations;
for (const [index, spec] of specs.entries()) {
  const onePlan = `/tmp/fc-plan-${index}.json`, output = `/tmp/fc-public-${index}.json`;
  writeFileSync(onePlan, JSON.stringify({ schema_version: 1, entries: [spec] }));
  execFileSync('python3', ['ops/daily/public-candidate.py', onePlan, output], { stdio: 'inherit' });
  const { candidate, evidence } = JSON.parse(readFileSync(output, 'utf8'));
  const prior = pub.observations.filter((r) => r.benchmark_id === spec.benchmark_id);
  const reconciled = reconcilePublicIdentities(candidate.observations, evidence, prior, { withdrawals: withdrawals.filter((w) => w.benchmark_id === spec.benchmark_id) });
  if (reconciled.withdrawn.length) throw new Error('unexpected withdrawal');
  const old = new Map(prior.map((r) => [r.id, r]));
  const changed = reconciled.rows.filter((r) => !equal(semantic(r), semantic(old.get(r.id) ?? {})));
  out.candidates[spec.benchmark_id] = { rows: reconciled.rows.length, prior: prior.length, changed: changed.length };
  for (const r of changed) out.changed.push({ row: r, native_source_row: reconciled.evidence[r.id], prior: old.get(r.id) ?? null });
  const changedIds = new Set(changed.map((r) => r.id));
  // Daily rule: changed rows take the new capture; unchanged rows keep their prior object (original dates).
  rows = rows.filter((r) => r.benchmark_id !== spec.benchmark_id).concat(reconciled.rows.map((r) => changedIds.has(r.id) ? r : old.get(r.id)));
}
writeFileSync(flag('--changed') ?? `${D}/changed-rows.json`, JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify(out.candidates));
if (process.argv.includes('--apply')) {
  // Only the new/changed rows travel through JS; Python inserts them into the file (its existing form:
  // ensure_ascii=False, indent 2, and literal floats such as 73.0 that a JS round trip would rewrite).
  // A changed row replaces its prior object in place; a new row follows the last row of its benchmark.
  writeFileSync('/tmp/fc-changed.json', JSON.stringify(out.changed.map((c) => c.row)));
  execFileSync('python3', ['-c', `
import json,sys
path=sys.argv[1]; d=json.load(open(path)); rows=d['observations']; changed=json.load(open('/tmp/fc-changed.json'))
byid={r['id']:i for i,r in enumerate(rows)}
for r in changed:
  if r['id'] in byid: rows[byid[r['id']]]=r; continue
  same=[i for i,x in enumerate(rows) if x['benchmark_id']==r['benchmark_id']]
  last=max(same) if same else max(i for i,x in enumerate(rows) if x['benchmark_id'].startswith('frontiercode'))
  rows.insert(last+1,r); byid={x['id']:i for i,x in enumerate(rows)}
open(path,'w').write(json.dumps(d,indent=2,ensure_ascii=False)+'\\n')
`, publicPath]);
}
