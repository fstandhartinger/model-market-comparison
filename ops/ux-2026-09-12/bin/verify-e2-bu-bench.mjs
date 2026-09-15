// Live check for the E2 BU Bench V1 slice (Browser Use official_results run files) on both hosts.
// Every live value is compared with tasks_successful / tasks_completed of the committed run-file capture
// (repository commit 421390ea). Usage: node ops/ux-2026-09-12/bin/verify-e2-bu-bench.mjs OUT_DIR
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

const out = process.argv[2] || '/opt/benchmarkheaven/state/ux-evidence/iter63-e2-bubench-v1/live';
mkdirSync(out, { recursive: true });
const hosts = ['https://benchmarkheaven.com', 'https://model-market-comparison.app.mintapis.com'];
const id = 'bu-bench-v1::snapshot-2026-09-09';
const count = 9;
const manifest = JSON.parse(readFileSync('data/raw/benchmarks/daily-evidence/2026-09-15-bu-bench-v1/manifest.json', 'utf8'));
// source label model|framework version|browser, rebuilt from the file name exactly as the parser does
const expected = new Map(manifest.filter((m) => m.url.endsWith('.json')).map((m) => {
  const n = m.url.split('/').pop().match(/^([A-Za-z]+)_([^_]+)_browser_([^_]+)_model_(.+)\.json$/);
  const [run] = JSON.parse(gunzipSync(readFileSync(m.file)).toString('utf8'));
  return [`${n[4]}|${n[1]} ${n[2]}|${n[3]}`, { value: run.tasks_successful / run.tasks_completed, url: m.url }];
}));
const result = { checked_at: new Date().toISOString(), hosts: {}, failures: [] };
for (const host of hosts) {
  const fail = (why) => result.failures.push(`${host}: ${why}`);
  const meta = await (await fetch(`${host}/api/meta`)).json().catch(() => null);
  const api = await (await fetch(`${host}/api/benchmark-scores?benchmark_id=${encodeURIComponent(id)}&limit=100`)).json();
  const rows = api.observations ?? [];
  const base = await (await fetch(`${host}/api/benchmark-view?benchmark_id=${encodeURIComponent(id)}`)).json();
  let axisRows = 0;
  for (const a of (base.axes ?? []).filter((x) => x.id.startsWith(`${id}@@`))) {
    const v = await (await fetch(`${host}/api/benchmark-view?axis=${encodeURIComponent(a.id)}`)).json();
    axisRows += (v.axes ?? []).find((x) => x.id === a.id)?.scores?.length ?? 0;
  }
  const mismatches = rows.filter((o) => {
    const e = expected.get(o.subject.source_id);
    return !e || Math.abs(e.value - o.value) > 1e-12 || e.url !== o.source?.url;
  }).map((o) => [o.subject.source_id, o.value, o.source?.url]);
  const r = { revision: meta?.revision ?? null, api_total: api.total, api_rows: rows.length, axis_rows: axisRows,
    units: [...new Set(rows.map((o) => o.unit))], source_bases: [...new Set(rows.map((o) => o.source_basis ?? o.basis))],
    joined: rows.filter((o) => o.subject.model_id).length, mismatches };
  result.hosts[host] = r;
  if (api.total !== count || rows.length !== count) fail(`rows api ${api.total}/${rows.length} != ${count}`);
  if (axisRows !== count) fail(`axis rows ${axisRows} != ${count}`);
  if (r.units.length !== 1 || r.units[0] !== 'fraction') fail(`unit ${r.units}`);
  if (r.source_bases.length !== 1 || r.source_bases[0] !== 'self_reported') fail(`source basis ${r.source_bases}`);
  if (r.joined) fail(`${r.joined} rows joined to catalog models`);
  if (mismatches.length) fail(`${mismatches.length} rows differ from the run files, e.g. ${JSON.stringify(mismatches[0])}`);
}
writeFileSync(`${out}/verification.json`, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ failures: result.failures, revisions: Object.fromEntries(Object.entries(result.hosts).map(([k, v]) => [k, v.revision])) }));
process.exit(result.failures.length ? 1 : 0);
