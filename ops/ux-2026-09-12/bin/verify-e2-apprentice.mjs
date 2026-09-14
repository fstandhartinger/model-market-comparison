// Live check for the E2 ApprenticeBench slice (CUA and API boards, score + cost) on both hosts.
// Usage: node ops/ux-2026-09-12/bin/verify-e2-apprentice.mjs OUT_DIR
import { writeFileSync, mkdirSync } from 'node:fs';

const out = process.argv[2] || '/opt/benchmarkheaven/state/ux-evidence/iter48-e2-apprentice/live';
mkdirSync(out, { recursive: true });
const hosts = ['https://benchmarkheaven.com', 'https://model-market-comparison.app.mintapis.com'];
const snap = 'snapshot-2026-09-14';
// Spot values read from the page's own bundle (sha256 8b07652a…): first CUA and first API run.
const fable = 'claude-fable-5-1|Claude Code|max';
const expected = {
  [`apprenticebench-cua::${snap}`]: [29, 'percent', [fable, 72]],
  [`apprenticebench-cua-cost::${snap}`]: [29, null, [fable, 18.23]],
  [`apprenticebench-api::${snap}`]: [27, 'percent', [fable, 70]],
  [`apprenticebench-api-cost::${snap}`]: [27, null, [fable, 6.95]],
};
const result = { checked_at: new Date().toISOString(), hosts: {}, failures: [] };
for (const host of hosts) {
  const meta = await (await fetch(`${host}/api/meta`)).json().catch(() => null);
  const h = (result.hosts[host] = { revision: meta?.revision ?? null, identities: {} });
  for (const [id, [count, unit, spot]] of Object.entries(expected)) {
    const fail = (why) => result.failures.push(`${host} ${id}: ${why}`);
    const api = await (await fetch(`${host}/api/benchmark-scores?benchmark_id=${encodeURIComponent(id)}&limit=500`)).json();
    const rows = api.observations ?? [];
    const units = [...new Set(rows.map((o) => o.unit))];
    // Axis ids carry version, unit and harness cohort; sum every cohort of this identity.
    const base = await (await fetch(`${host}/api/benchmark-view?benchmark_id=${encodeURIComponent(id)}`)).json();
    let axisRows = 0;
    for (const a of (base.axes ?? []).filter((x) => x.id.startsWith(`${id}@@`))) {
      const v = await (await fetch(`${host}/api/benchmark-view?axis=${encodeURIComponent(a.id)}`)).json();
      axisRows += (v.axes ?? []).find((x) => x.id === a.id)?.scores?.length ?? 0;
    }
    const spotRow = rows.find((r) => r.subject.source_id === spot[0]);
    const r = { api_total: api.total, api_rows: rows.length, axis_rows: axisRows, units,
      bases: [...new Set(rows.map((o) => o.source_basis ?? o.basis))], joined: rows.filter((o) => o.subject.model_id).length,
      spot: { source_id: spot[0], expected: spot[1], got: spotRow?.value ?? null } };
    h.identities[id] = r;
    if (api.total !== count || rows.length !== count) fail(`api rows ${api.total}/${rows.length} != ${count}`);
    if (axisRows !== count) fail(`axis rows ${axisRows} != ${count}`);
    if (units.length !== 1 || (unit && units[0] !== unit)) fail(`unit ${units}`);
    if (r.joined) fail(`${r.joined} rows joined to catalog models`);
    if (r.bases.length !== 1 || r.bases[0] !== 'measured') fail(`basis ${r.bases}`);
    if (spotRow == null || Math.abs(spotRow.value - spot[1]) > 1e-6) fail(`spot ${spot[0]} = ${spotRow?.value}`);
    if (rows.some((o) => /human/i.test(o.subject.source_id))) fail('human baseline ingested as a model row');
  }
}
writeFileSync(`${out}/verification.json`, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ failures: result.failures, revisions: Object.fromEntries(Object.entries(result.hosts).map(([k, v]) => [k, v.revision])) }));
process.exit(result.failures.length ? 1 : 0);
