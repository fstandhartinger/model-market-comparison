// Live check for the E2 Vals Index v2 + FrontierCode 1.1 slice on both hosts.
// Usage: node ops/ux-2026-09-12/bin/verify-e2-vals-frontiercode.mjs OUT_DIR
import { writeFileSync, mkdirSync } from 'node:fs';

const out = process.argv[2] || '/opt/benchmarkheaven/state/ux-evidence/iter35-e2/live';
mkdirSync(out, { recursive: true });
const hosts = ['https://benchmarkheaven.com', 'https://model-market-comparison.app.mintapis.com'];
const expected = {
  'vals-index::2': [56, 'percent', ['anthropic/claude-fable-5-1', 68.825]],
  'vals-index-finance-agent::2': [56, 'percent'], 'vals-index-emb::2': [56, 'percent'],
  'vals-index-terminal-bench-2.1::2': [56, 'percent', ['openai/gpt-6-astra', 87.266]],
  'vals-index-vibe-code-bench::2': [56, 'percent'], 'vals-index-code-migration::2': [56, 'percent'],
  'vals-index-legal-research::2': [56, 'percent'], 'vals-index-hlab::2': [56, 'percent'],
  'vals-index-cost::2': [55, 'USD', ['anthropic/claude-opus-5', 18.810212]],
  'frontiercode::1.1': [98, 'percent', ['GPT-6 Astra|max', 53.26]],
  'frontiercode-cost::1.1': [98, 'USD', ['GPT-6 Astra|max', 4.586]],
};
const result = { checked_at: new Date().toISOString(), hosts: {}, failures: [] };
for (const host of hosts) {
  const meta = await (await fetch(`${host}/api/meta`)).json().catch(() => null);
  const h = (result.hosts[host] = { revision: meta?.revision ?? meta?.git_sha ?? null, identities: {} });
  for (const [id, [count, unit, spot]] of Object.entries(expected)) {
    const api = await (await fetch(`${host}/api/benchmark-scores?benchmark_id=${encodeURIComponent(id)}&limit=500`)).json();
    const rows = api.observations ?? [];
    // Cohort axes: Vals publishes one board; FrontierCode is split per agent harness (never ranked across harnesses).
    const base = await (await fetch(`${host}/api/benchmark-view?benchmark_id=${encodeURIComponent(id)}`)).json();
    let axisRows = 0;
    for (const a of (base.axes ?? []).filter((x) => x.id.startsWith(`${id}@@`) && x.id.endsWith(`@@${unit}`))) {
      const v = await (await fetch(`${host}/api/benchmark-view?axis=${encodeURIComponent(a.id)}`)).json();
      axisRows += (v.axes ?? []).find((x) => x.id === a.id)?.scores?.length ?? 0;
    }
    const axis = { scores: { length: axisRows } };
    const spotRow = spot && rows.find((r) => r.subject.source_id === spot[0]);
    const r = { api_total: api.total, api_rows: rows.length, axis_rows: axis?.scores?.length ?? null, units: [...new Set(rows.map((o) => o.unit))],
      bases: [...new Set(rows.map((o) => o.source_basis ?? o.basis))], joined: rows.filter((o) => o.subject.model_id).length,
      spot: spot ? { source_id: spot[0], expected: spot[1], got: spotRow?.value ?? null } : null };
    h.identities[id] = r;
    const fail = (why) => result.failures.push(`${host} ${id}: ${why}`);
    if (api.total !== count || rows.length !== count) fail(`api rows ${api.total}/${rows.length} != ${count}`);
    if (r.axis_rows !== count) fail(`axis rows ${r.axis_rows} != ${count}`);
    if (r.units.length !== 1 || r.units[0] !== unit) fail(`unit ${r.units}`);
    if (r.joined) fail(`${r.joined} rows joined to catalog models`);
    const basis = id.startsWith('vals') ? 'measured' : 'self_reported';
    if (r.bases.length !== 1 || r.bases[0] !== basis) fail(`basis ${r.bases}`);
    if (spot && (spotRow == null || Math.abs(spotRow.value - spot[1]) > 1e-6)) fail(`spot ${spot[0]} = ${spotRow?.value}`);
  }
}
writeFileSync(`${out}/verification.json`, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ failures: result.failures, revisions: Object.fromEntries(Object.entries(result.hosts).map(([k, v]) => [k, v.revision])) }));
process.exit(result.failures.length ? 1 : 0);
