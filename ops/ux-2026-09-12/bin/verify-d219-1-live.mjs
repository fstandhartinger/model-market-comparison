#!/usr/bin/env node
// D219.1 live verifier (iteration 242). Proves, against the deployed site rather than the build:
//  1. every reviewed EQ-Bench join reaches the public API as a measured cell, with the value the board publishes;
//  2. the rows the rule refuses are *absent* — no configuration of a setting-split frontier family carries an
//     EQ-Bench writing observation, which is the half of D219.1 that a "more joins" check cannot see;
//  3. a joined model's page really renders the board and the number (a joined observation nobody shows is not a fix).
// Usage: node ops/ux-2026-09-12/bin/verify-d219-1-live.mjs <outDir> [host ...]
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
const [outDir, ...hostArgs] = process.argv.slice(2);
if (!outDir) { console.error('usage: verify-d219-1-live.mjs <outDir> [host ...]'); process.exit(2); }
const hosts = hostArgs.length ? hostArgs : ['benchmarkheaven.com', 'model-market-comparison.app.mintapis.com'];
const BOARDS = ['eqbench-creative-writing::3', 'eqbench-longform-writing::v1.11'];
// Read the expectation from the committed data, so the verifier cannot drift from what shipped.
const scores = JSON.parse(readFileSync('data/raw/benchmarks/scores.json', 'utf8')).observations;
const models = JSON.parse(readFileSync('data/dataset.json', 'utf8')).models;
const joined = scores.filter((o) => BOARDS.includes(o.benchmark_id) && o.subject.model_id)
  .map((o) => ({ benchmark_id: o.benchmark_id, model_id: o.subject.model_id, source_id: o.subject.source_id, value: o.value }));
// Families the rule refuses because they are split by setting: every configuration must stay empty on both boards.
const REFUSED_FAMILIES = ['claude-opus-5', 'gpt-6-astra', 'gemini-3.8-flash', 'qwen3.8-27b', 'deepseek-v4-pro'];
const refused = models.filter((m) => REFUSED_FAMILIES.includes(m.family_key)).map((m) => m.id);
const PAGE_MODEL = 'gpt-4.1-mini::default';
const get = async (url) => {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: { 'user-agent': 'BenchmarkHeavenSelfCheck/1.0' }, signal: AbortSignal.timeout(25000) });
      return { status: r.status, text: await r.text() };
    } catch (e) { if (i === 2) return { status: 0, text: String(e) }; }
  }
};
const out = {};
for (const host of hosts) {
  const checks = [];
  const add = (name, pass, detail) => checks.push({ name, pass, detail });
  const meta = await get(`https://${host}/api/meta`);
  let revision = null;
  try { revision = JSON.parse(meta.text).revision; } catch {}
  add('meta revision readable', Boolean(revision), { status: meta.status, revision });
  for (const j of joined) {
    const url = `https://${host}/api/benchmark-scores?benchmark_id=${encodeURIComponent(j.benchmark_id)}&model_id=${encodeURIComponent(j.model_id)}&limit=500`;
    const r = await get(url);
    let body = null; try { body = JSON.parse(r.text); } catch {}
    const obs = (body?.observations ?? []).filter((o) => o.subject?.model_id === j.model_id);
    const hit = obs.find((o) => Math.abs(Number(o.value) - Number(j.value)) < 1e-9);
    add(`joined ${j.benchmark_id} ${j.source_id} -> ${j.model_id}`, r.status === 200 && Boolean(hit), {
      status: r.status, expected_value: j.value, values: obs.map((o) => o.value),
      basis: hit?.basis ?? null, cell_value: body?.cell?.value ?? null, join_note: hit?.join_note ?? null });
  }
  for (const board of BOARDS) for (const modelId of refused) {
    const r = await get(`https://${host}/api/benchmark-scores?benchmark_id=${encodeURIComponent(board)}&model_id=${encodeURIComponent(modelId)}&limit=500`);
    let body = null; try { body = JSON.parse(r.text); } catch {}
    const obs = (body?.observations ?? []).filter((o) => o.subject?.model_id === modelId);
    // The pass is 200 with no observation and a cell the site itself calls `unknown`: the board states no
    // setting, so this configuration must carry nothing and must say so. A 404 would mean the model id vanished
    // and the check proved nothing; a truthy `cell` alone proves nothing either, because the API always returns
    // one (`status: "unknown"` with an empty `observations` array is the refusal, measured 2026-09-27).
    add(`refused stays unjoined ${board} ${modelId}`, r.status === 200 && obs.length === 0
      && body?.cell?.status === 'unknown' && (body.cell.observations ?? []).length === 0,
      { status: r.status, observations: obs.length, cell_status: body?.cell?.status ?? null,
        cell_observations: (body?.cell?.observations ?? []).length });
  }
  const page = await get(`https://${host}/models/${encodeURIComponent(PAGE_MODEL)}`);
  const expected = joined.filter((j) => j.model_id === PAGE_MODEL);
  for (const j of expected) {
    const board = j.benchmark_id.startsWith('eqbench-creative') ? 'EQ-Bench Creative Writing v3' : 'EQ-Bench Longform Creative Writing';
    // The page rounds the Elo to whole points (measured 2026-09-27: 1144.7 renders as "1,145"), so accept the
    // roundings the value can legitimately take rather than one guessed spelling — and require the number inside
    // the board's own row, not anywhere on a 142 KB page, or a coincidence elsewhere would pass this check.
    const spellings = [...new Set([j.value.toFixed(0), j.value.toFixed(1), j.value.toFixed(2)]
      .flatMap((v) => [v, Number(v).toLocaleString('en-US', { minimumFractionDigits: (v.split('.')[1] ?? '').length, maximumFractionDigits: (v.split('.')[1] ?? '').length })]))];
    const at = page.text.indexOf(board);
    const row = at === -1 ? '' : page.text.slice(at, at + 1600);
    const found = spellings.filter((v) => row.includes(v));
    add(`page renders ${board} and its value for ${PAGE_MODEL}`,
      page.status === 200 && at !== -1 && found.length > 0,
      { status: page.status, board_named: at !== -1, accepted_spellings: spellings, found_in_row: found });
  }
  const pass = checks.filter((c) => c.pass).length;
  out[host] = { revision, pass, total: checks.length, checks };
  console.log(`${host}: ${pass}/${checks.length} (revision ${revision})`);
  for (const c of checks) if (!c.pass) console.log(`  FAIL ${c.name} ${JSON.stringify(c.detail)}`);
}
mkdirSync(outDir, { recursive: true });
writeFileSync(`${outDir}/verification.json`, JSON.stringify({ generated_at: new Date().toISOString(), joined: joined.length, refused_configurations: refused.length, hosts: out }, null, 2) + '\n');
const ok = Object.values(out).every((h) => h.pass === h.total);
console.log(ok ? 'ALL PASS' : 'FAILURES PRESENT');
process.exit(ok ? 0 : 1);
