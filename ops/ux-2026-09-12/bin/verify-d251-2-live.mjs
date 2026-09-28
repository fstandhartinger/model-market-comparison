// D251.2 / D251.4 live acceptance. Usage: node ops/ux-2026-09-12/bin/verify-d251-2-live.mjs <base> <outDir>
//
// The repair is prose a reviewer reads, and /api/benchmarks serves the registry entry whole
// (`how_to_collect.version_guard`), so the published guard is checkable on the deployed host:
//  1. the withdrawn clause, which demanded a harness parenthesis on every chart key, is gone;
//  2. the served guard states the no-effort case and quotes the qualified harness verbatim;
//  3. the board's own published rows still carry both key shapes at their published values, so the
//     guard is checked against the data it guards and not against itself;
//  4. nothing else about the entry moved: identity, unit, range and status are the reviewed ones.
import { writeFileSync, mkdirSync } from 'node:fs';

const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '.';
mkdirSync(OUT, { recursive: true });
const ID = 'mls-bench-lite::30-tasks';
const WITHDRAWN = 'with a harness parenthesis that agrees with the stated effort';

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

  const guard = entry.how_to_collect?.version_guard ?? '';
  ok('the withdrawn parenthesis-on-every-key clause is gone', !guard.includes(WITHDRAWN), guard.slice(0, 120));
  ok('the guard states the no-effort case', guard.includes('no parenthesis at all when the board states no effort'));
  ok('the guard quotes the qualified harness verbatim', guard.includes('"Claude Code (max effort, with fallback)"'));
  for (const effort of ['max', 'xhigh', 'high', 'medium', 'low']) {
    ok(`the guard names the reviewed effort ${effort}`, guard.includes(effort));
  }
  for (const harness of ['Claude Code', 'Codex', 'Kimi-Code']) {
    ok(`the guard names the harness ${harness}`, guard.includes(`"${harness}`));
  }
  ok('the guard still requires the leaderboard method sentence',
    guard.includes('MLS-Bench-Lite Score. The evaluation is based on Harbor with a 5-hour exploration budget for each agent.'));
  ok('the guard still requires one chart object with the reviewed title', guard.includes('the title "MLS-Bench Lite"'));
  ok('the guard still calls another subset or scoring a new identity',
    /Another task subset or scoring is a new identity/.test(guard));

  // Nothing else about the reviewed row moved.
  ok('unit unchanged', entry.scoring?.unit === 'points', entry.scoring?.unit);
  ok('range unchanged', JSON.stringify(entry.scoring?.range) === '[0,100]', entry.scoring?.range);
  ok('status unchanged', entry.status === 'active' && entry.version_status === 'published',
    { status: entry.status, version_status: entry.version_status });
  ok('last_verified is still the daily\'s to set', typeof entry.last_verified === 'string', entry.last_verified);

  // The board's published rows still hold both key shapes the guard now describes.
  const scores = await getJson(`/api/benchmark-scores?benchmark_id=${encodeURIComponent(ID)}&limit=500`);
  const rows = scores.scores ?? scores.observations ?? scores.rows ?? [];
  const bySource = new Map(rows.map((r) => [r.subject?.source_id ?? r.source_id ?? r.label, r]));
  ok('the board publishes its rows', rows.length >= 15, rows.length);
  const value = (key) => {
    const r = bySource.get(key);
    return r == null ? null : (r.value ?? r.score ?? null);
  };
  ok('a no-effort key is published at its value', value('Qwen3.8-Max-0902|Claude Code') === 50.1,
    value('Qwen3.8-Max-0902|Claude Code'));
  ok('a qualified-effort key is published at its value', value('Claude Fable 5|Claude Code (max effort, with fallback)') === 49.9,
    value('Claude Fable 5|Claude Code (max effort, with fallback)'));
  ok('a plain-effort key is published at its value', value('Claude Opus 5|Claude Code (max effort)') === 49.8,
    value('Claude Opus 5|Claude Code (max effort)'));

  // D251.4: Scale's detail route, whose 404 retained swe-atlas-test-writing on 2026-09-28.
  const scale = await fetch('https://labs.scale.com/leaderboard/sweatlas-tw');
  const scaleBody = scale.ok ? await scale.text() : '';
  ok('Scale\'s sweatlas-tw detail route answers 200', scale.status === 200, scale.status);
  ok('and still carries its registered title guard', scaleBody.includes('<title>SWE Atlas - Test Writing</title>'));

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
