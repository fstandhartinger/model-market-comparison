#!/usr/bin/env node
// D219 live verifier: on every host, no display badge is published on the three boards, every corrected
// label is published with the value the committed record names, and no retained state brings a badged
// label back as a "no longer published" estimate.
//
//   node ops/ux-2026-09-12/bin/verify-d219-live.mjs <outDir> [host ...]
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const [outDir, ...hostArgs] = process.argv.slice(2);
if (!outDir) { console.error('usage: verify-d219-live.mjs <outDir> [host ...]'); process.exit(2); }
const HOSTS = hostArgs.length ? hostArgs
  : ['https://benchmarkheaven.com', 'https://www.benchmarkheaven.com', 'https://model-market-comparison.app.mintapis.com'];
const BOARDS = ['eqbench-creative-writing::3', 'eqbench-longform-writing::v1.11', 'vending-bench::2'];
const badged = (n) => n.startsWith('*') || n.startsWith('!') || n.endsWith(' New');

const local = JSON.parse(await readFile('data/raw/benchmarks/public-observations.json', 'utf8'));
const corrections = local.display_badge_corrections ?? [];
const expected = new Map(corrections.map((c) => [`${c.benchmark_id}\0${c.to}`,
  local.observations.find((o) => o.id === c.id).value]));

const get = async (url) => {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, { headers: { 'user-agent': 'BenchmarkHeavenVerify/1.0' }, signal: AbortSignal.timeout(60_000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) { if (attempt === 2) throw error; }
  }
};

const checks = [];
const check = (host, name, ok, detail) => checks.push({ host, name, ok: !!ok, detail });
for (const host of HOSTS) {
  let meta;
  try { meta = await get(`${host}/api/meta`); } catch (error) { check(host, 'meta', false, String(error)); continue; }
  check(host, 'meta', true, `revision ${String(meta.revision).slice(0, 8)} generated ${meta.generated_at}`);
  for (const board of BOARDS) {
    let page;
    try { page = await get(`${host}/api/benchmark-scores?benchmark_id=${encodeURIComponent(board)}&limit=500`); }
    catch (error) { check(host, `${board} fetch`, false, String(error)); continue; }
    const rows = page.observations ?? [];
    check(host, `${board} rows`, rows.length > 0 && rows.length === page.total, `${rows.length} of total ${page.total}`);
    const wearing = rows.filter((r) => badged(r.subject.source_id)).map((r) => r.subject.source_id);
    check(host, `${board} no display badge published`, wearing.length === 0, wearing.join(', ') || 'none');
    for (const c of corrections.filter((c) => c.benchmark_id === board)) {
      const row = rows.find((r) => r.subject.source_id === c.to);
      const want = expected.get(`${c.benchmark_id}\0${c.to}`);
      check(host, `${board} ${c.from} -> ${c.to}`, row && row.value === want && !rows.some((r) => r.subject.source_id === c.from),
        row ? `value ${row.value} (want ${want})` : 'row missing');
    }
  }
  let dataset;
  try { dataset = await get(`${host}/api/dataset`); } catch (error) { check(host, 'dataset', false, String(error)); continue; }
  const estimates = dataset.benchmark_results?.historical?.estimates ?? [];
  const back = estimates.filter((e) => corrections.some((c) => c.benchmark_id === e.benchmark_id && c.from === e.subject_name));
  check(host, 'no badged label returns as a "no longer published" estimate', back.length === 0,
    back.map((e) => `${e.benchmark_id} ${e.subject_name}`).join(', ') || `none of ${estimates.length} estimates`);
}
const passed = checks.filter((c) => c.ok).length;
await mkdir(outDir, { recursive: true });
await writeFile(`${outDir}/verification.json`, JSON.stringify({ checked_at: new Date().toISOString(), hosts: HOSTS, passed, total: checks.length, checks }, null, 2) + '\n');
for (const c of checks.filter((c) => !c.ok)) console.log(`FAIL ${c.host} ${c.name}: ${c.detail}`);
console.log(`${passed}/${checks.length}`);
process.exit(passed === checks.length ? 0 : 1);
