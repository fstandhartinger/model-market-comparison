#!/usr/bin/env node
// 2026-09-15 (iteration 69): live API check for the critic-reviewed self-reported joins (CR-12.4).
// Usage: node verify-identity-joins.mjs <base> <outdir>   (writes identity-joins.json; exit 1 on any failed check)
import { mkdir, writeFile } from 'node:fs/promises';

const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-bh-identity-joins';
const checks = [];
const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail });
const view = async (axis, models) => {
  const q = new URLSearchParams({ axis }); for (const m of models) q.append('model', m);
  const res = await fetch(`${BASE}/api/benchmark-view?${q}`, { headers: { 'cache-control': 'no-cache' } });
  return { status: res.status, body: res.ok ? await res.json() : null };
};
// Axes are cohorts `<benchmark_id>@@<harness or board>@@<unit>`; a benchmark can have several.
const index = await (await fetch(`${BASE}/api/benchmark-view`, { headers: { 'cache-control': 'no-cache' } })).json();
const cohorts = (id) => index.axes.map((a) => a.id).filter((a) => a.startsWith(`${id}@@`));
const cohortRows = async (id, model) => {
  const out = { statuses: [], rows: [] };
  for (const axis of cohorts(id)) {
    const { status, body } = await view(axis, [model]);
    out.statuses.push(status);
    out.rows.push(...((body?.axes ?? []).find((a) => a.id === axis)?.scores ?? []));
  }
  return out;
};

// Expected values straight from the source captures (data/raw/benchmarks/public-observations.json).
const EXPECT = [
  ['frontiercode::1.1', 'claude-fable-5.1::medium', 50.91],
  ['frontiercode::1.1', 'gpt-6-astra::max', 53.26],
  ['frontiercode::1.1', 'claude-opus-5::medium', 53.38],
  ['cursorbench::4.0', 'claude-fable-5.1::max', 51.8],
  ['cursorbench::4.0', 'claude-opus-5::xhigh', 46.1],
  ['cursorbench::4.0', 'composer-2.5::default', 27.7],
  ['swe-bench-pro-public::snapshot-2026-09-10', 'gpt-5.4::xhigh', 59.1],
];
for (const [id, model, value] of EXPECT) {
  const { statuses, rows } = await cohortRows(id, model);
  const row = rows.find((r) => r.modelId === model && Math.abs(r.value - value) < 1e-9);
  check(`${id} × ${model} = ${value} (self-reported)`, statuses.length > 0 && statuses.every((s) => s === 200) && row?.basis === 'self_reported',
    { statuses, row: row && { value: row.value, basis: row.basis, source: row.source, harness: row.harness } });
}
for (const id of ['frontiercode-cost::1.1', 'cursorbench-cost::4.0']) {
  const { statuses, rows } = await cohortRows(id, 'claude-fable-5.1::max');
  check(`${id} stays unjoined (no catalog model id)`, statuses.length > 0 && rows.length > 0 && rows.every((r) => !r.modelId), { statuses, rows: rows.length, joined: rows.filter((r) => r.modelId).length });
}
const html = await (await fetch(`${BASE}/?nocache=${Date.now()}`)).text();
const build = html.match(/<!--([A-Za-z0-9_-]{15,30})-->/)?.[1] ?? null;
const passed = checks.filter((c) => c.ok).length;
await mkdir(OUT, { recursive: true });
await writeFile(`${OUT}/identity-joins.json`, JSON.stringify({ base: BASE, build, checked_at: new Date().toISOString(),
  runner: process.env.BH_RUNNER ?? 'claude-opus', passed, total: checks.length, checks }, null, 2) + '\n');
console.log(`${BASE} build ${build}: ${passed}/${checks.length}`);
for (const c of checks.filter((x) => !x.ok)) console.log('FAIL', c.name, JSON.stringify(c.detail));
process.exit(passed === checks.length ? 0 : 1);
