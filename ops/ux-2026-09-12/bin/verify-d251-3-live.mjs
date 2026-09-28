// D251.3 live acceptance. Usage: node ops/ux-2026-09-12/bin/verify-d251-3-live.mjs <base> <outDir>
//
// The repair is a sentence a reviewer reads plus the 172 published cells that quote it, and both are
// served: /api/benchmarks carries the registry entry whole (`scoring.metric`, `unit`, `range`) and
// /api/benchmark-scores carries each observation's own `protocol` string, which ingestion composes
// from that same metric. So the deployed host can be asked all four questions the repair answers:
//  1. the withdrawn "Mean fraction" claim — a cross-task aggregation AA's methodology never states —
//     is gone from the registry and from every published cell;
//  2. the served metric states AA's own per-task rule, in AA's words;
//  3. it says which scale the maintainer serves that percentage on, which is the thing no protocol
//     page states and the thing three replay rounds refused the row for;
//  4. the values did not move: unit `fraction`, range [0,1], and every published value inside it.
//     This benchmark is an Agentic category anchor — the repair is prose, never the number.
import { writeFileSync, mkdirSync } from 'node:fs';

const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '.';
mkdirSync(OUT, { recursive: true });
const ID = 'aa-automationbench::1.0.6';
const WITHDRAWN = 'Mean fraction of objectives completed';
const SOURCE_RULE = 'the task receives the percentage of objectives the model completed';
const SERVED_SCALE = 'which the maintainer serves as a decimal fraction on a 0-1 scale';

const checks = [];
const ok = (name, pass, detail) => { checks.push({ name, pass: Boolean(pass), detail }); };

const getJson = async (path) => {
  const res = await fetch(`${BASE}${path}`, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
};

const run = async () => {
  const meta = await getJson('/api/meta');
  ok('served revision recorded', typeof meta.revision === 'string' && meta.revision.length >= 7, meta.revision);

  const payload = await getJson('/api/benchmarks');
  const list = payload.benchmarks ?? payload.entries ?? payload;
  const entry = (Array.isArray(list) ? list : []).find((e) => e.id === ID);
  ok('the registry entry is served', Boolean(entry), entry ? entry.id : null);
  if (!entry) return finish();

  const metric = entry.scoring?.metric ?? '';
  ok('the withdrawn "Mean fraction" aggregation claim is gone', !metric.includes(WITHDRAWN), metric.slice(0, 140));
  ok('the served metric names the published dataset version', metric.includes('AutomationBench dataset version 1.0.6'));
  ok('the served metric names the held-out split AA describes', metric.includes('private 657-task held-out split'));
  ok('the served metric keeps the guardrail-zero rule', metric.includes('a task receives 0 if the model violates any guardrail'));
  ok('the served metric keeps the errored-task rule', metric.includes('errored tasks also score 0'));
  ok('the served metric states AA\'s own per-task rule verbatim', metric.includes(SOURCE_RULE));
  ok('the served metric states the scale the maintainer serves on', metric.includes(SERVED_SCALE));

  // The values did not move.
  ok('unit unchanged', entry.scoring?.unit === 'fraction', entry.scoring?.unit);
  ok('range unchanged', JSON.stringify(entry.scoring?.range) === '[0,1]', entry.scoring?.range);
  ok('higher_better unchanged', entry.scoring?.higher_better === true, entry.scoring?.higher_better);
  ok('identity unchanged', entry.version === '1.0.6' && entry.status === 'active'
    && entry.version_status === 'published' && (entry.superseded_by ?? null) === null,
    { version: entry.version, status: entry.status, version_status: entry.version_status, superseded_by: entry.superseded_by ?? null });
  ok('maintainer unchanged', entry.maintainer === 'Artificial Analysis', entry.maintainer);
  ok('last_verified is still the daily\'s to set', typeof entry.last_verified === 'string', entry.last_verified);

  // Every published cell quotes the repaired metric, because ingestion composes `protocol` from it.
  const scores = await getJson(`/api/benchmark-scores?benchmark_id=${encodeURIComponent(ID)}&limit=500`);
  const rows = scores.scores ?? scores.observations ?? scores.rows ?? [];
  ok('the board publishes its rows', rows.length >= 150, rows.length);
  // The board holds two populations. `aa:` rows are ingested from the AA model-page field and
  // compose their `protocol` from the registry metric this repair changed; the 17 CR-128 rows were
  // read off individual AA model pages and carry their own reviewed protocol text, which this
  // repair does not touch. Checking them separately is the point: the repair must reach every cell
  // it owns and no cell it does not.
  const ingested = rows.filter((r) => String(r.id ?? '').startsWith('aa:'));
  const thirdParty = rows.filter((r) => !String(r.id ?? '').startsWith('aa:'));
  ok('the AA-ingested population is served', ingested.length >= 150, ingested.length);
  ok('the third-party population is served beside it', thirdParty.length > 0, thirdParty.length);
  const protocols = ingested.map((r) => r.protocol ?? '');
  ok('no published cell on this board still carries the withdrawn claim',
    rows.every((r) => !(r.protocol ?? '').includes(WITHDRAWN)),
    rows.filter((r) => (r.protocol ?? '').includes(WITHDRAWN)).length);
  ok('every AA-ingested cell quotes AA\'s own per-task rule',
    protocols.length > 0 && protocols.every((p) => p.includes(SOURCE_RULE)),
    protocols.filter((p) => !p.includes(SOURCE_RULE)).length);
  ok('every AA-ingested cell states the served scale',
    protocols.length > 0 && protocols.every((p) => p.includes(SERVED_SCALE)),
    protocols.filter((p) => !p.includes(SERVED_SCALE)).length);
  ok('every AA-ingested cell still records its AA effort',
    protocols.length > 0 && protocols.every((p) => /; effort /.test(p)),
    protocols.filter((p) => !/; effort /.test(p)).length);
  ok('the third-party cells keep their own reviewed protocol text',
    thirdParty.length > 0 && thirdParty.every((r) => /AutomationBench-AA \(partial score\)/.test(r.protocol ?? '')
      || /automationBenchPartialScore/.test(r.source?.locator ?? '')),
    thirdParty.filter((r) => !/AutomationBench-AA \(partial score\)/.test(r.protocol ?? '')
      && !/automationBenchPartialScore/.test(r.source?.locator ?? '')).length);

  // The number the prose describes: unchanged, measured, and on the scale the prose now names.
  const values = rows.map((r) => (r.value ?? r.score ?? null)).filter((v) => typeof v === 'number');
  ok('every published value is a number', values.length === rows.length, { values: values.length, rows: rows.length });
  ok('every published value lies on the 0-1 scale the metric names',
    values.length > 0 && values.every((v) => v >= 0 && v <= 1),
    { min: values.length ? Math.min(...values) : null, max: values.length ? Math.max(...values) : null });
  ok('every published cell keeps unit fraction',
    rows.length > 0 && rows.every((r) => (r.unit ?? 'fraction') === 'fraction'),
    [...new Set(rows.map((r) => r.unit))]);
  ok('every published cell is still measured',
    rows.length > 0 && rows.every((r) => (r.basis ?? 'measured') === 'measured'),
    [...new Set(rows.map((r) => r.basis))]);

  finish();
};

function finish() {
  const pass = checks.filter((c) => c.pass).length;
  writeFileSync(`${OUT}/verification.json`,
    `${JSON.stringify({ base: BASE, checked_at: new Date().toISOString(), pass, total: checks.length, checks }, null, 2)}\n`);
  console.log(`${BASE}: ${pass}/${checks.length}`);
  for (const c of checks) if (!c.pass) console.log(`  FAIL ${c.name}: ${JSON.stringify(c.detail)?.slice(0, 260)}`);
  if (pass !== checks.length) process.exitCode = 1;
}

run().catch((e) => { console.error(e); process.exitCode = 1; });
