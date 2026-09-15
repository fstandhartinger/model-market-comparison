// Live check for the E2 BullshitBench slice (V1 and V2 clear-pushback boards) on both hosts.
// Every live value is compared with the committed canonical CSV capture (repository commit 2678ac29).
// Usage: node ops/ux-2026-09-12/bin/verify-e2-bullshitbench.mjs OUT_DIR
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

const out = process.argv[2] || '/opt/benchmarkheaven/state/ux-evidence/iter62-e2-bullshitbench/live';
mkdirSync(out, { recursive: true });
const hosts = ['https://benchmarkheaven.com', 'https://model-market-comparison.app.mintapis.com'];
const ev = 'data/raw/benchmarks/daily-evidence/2026-09-15-bullshitbench/';
const suites = {
  'bullshitbench-v1::snapshot-2026-09-10': ['2605907319773e0e5858.gz', 194],
  'bullshitbench-v2::snapshot-2026-09-10': ['0c866538642eab944f67.gz', 214],
};
const csv = (file) => {
  const [head, ...lines] = gunzipSync(readFileSync(ev + file)).toString('utf8').trim().split(/\r?\n/);
  const keys = head.split(',');
  return new Map(lines.map((l) => Object.fromEntries(l.split(',').map((c, i) => [keys[i], c]))).map((r) => [r.model, Number(r.green_rate)]));
};
const result = { checked_at: new Date().toISOString(), hosts: {}, failures: [] };
for (const host of hosts) {
  const meta = await (await fetch(`${host}/api/meta`)).json().catch(() => null);
  const h = (result.hosts[host] = { revision: meta?.revision ?? null, identities: {} });
  for (const [id, [file, count]] of Object.entries(suites)) {
    const fail = (why) => result.failures.push(`${host} ${id}: ${why}`);
    const source = csv(file);
    const api = await (await fetch(`${host}/api/benchmark-scores?benchmark_id=${encodeURIComponent(id)}&limit=500`)).json();
    const rows = api.observations ?? [];
    const base = await (await fetch(`${host}/api/benchmark-view?benchmark_id=${encodeURIComponent(id)}`)).json();
    let axisRows = 0;
    for (const a of (base.axes ?? []).filter((x) => x.id.startsWith(`${id}@@`))) {
      const v = await (await fetch(`${host}/api/benchmark-view?axis=${encodeURIComponent(a.id)}`)).json();
      axisRows += (v.axes ?? []).find((x) => x.id === a.id)?.scores?.length ?? 0;
    }
    const mismatches = rows.filter((o) => source.get(o.subject.source_id) !== o.value).map((o) => [o.subject.source_id, o.value]);
    const r = { api_total: api.total, api_rows: rows.length, source_rows: source.size, axis_rows: axisRows,
      units: [...new Set(rows.map((o) => o.unit))], bases: [...new Set(rows.map((o) => o.source_basis ?? o.basis))],
      joined: rows.filter((o) => o.subject.model_id).length, value_mismatches: mismatches.length };
    h.identities[id] = r;
    if (api.total !== count || rows.length !== count || source.size !== count) fail(`rows api ${api.total}/${rows.length}, source ${source.size} != ${count}`);
    if (axisRows !== count) fail(`axis rows ${axisRows} != ${count}`);
    if (r.units.length !== 1 || r.units[0] !== 'fraction') fail(`unit ${r.units}`);
    if (r.bases.length !== 1 || r.bases[0] !== 'measured') fail(`basis ${r.bases}`);
    if (r.joined) fail(`${r.joined} rows joined to catalog models`);
    if (mismatches.length) fail(`${mismatches.length} values differ from the CSV, e.g. ${JSON.stringify(mismatches[0])}`);
  }
}
writeFileSync(`${out}/verification.json`, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ failures: result.failures, revisions: Object.fromEntries(Object.entries(result.hosts).map(([k, v]) => [k, v.revision])) }));
process.exit(result.failures.length ? 1 : 0);
