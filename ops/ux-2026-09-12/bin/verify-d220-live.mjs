#!/usr/bin/env node
// D220 live verifier (iteration 243). Proves against the deployed site, not the build, that the reviewed
// identity-map round actually reached users:
//  1. every one of the 49 newly reviewed joins is a measured cell on the public API, at the board's own value;
//  2. the defect the round was filed for is gone — Claude Opus 5.5's Vals code-migration cell reads the
//     board's measured 68.901 and not the 54.997 the history bridge was estimating;
//  3. the retracted rows D187 withheld are still withheld, which is the half a "more joins" check cannot see:
//     removing their map entry would have republished them, so each must stay absent from its board;
//  4. Union Alpha keeps CR-60.2's shape — the LiveBench row is measured, the two announced rows stay
//     preliminary, and the model page still renders all three.
// Usage: node ops/ux-2026-09-12/bin/verify-d220-live.mjs <outDir> [host ...]
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
const [outDir, ...hostArgs] = process.argv.slice(2);
if (!outDir) { console.error('usage: verify-d220-live.mjs <outDir> [host ...]'); process.exit(2); }
const hosts = hostArgs.length ? hostArgs : ['benchmarkheaven.com', 'model-market-comparison.app.mintapis.com'];

// Everything the verifier expects is derived from the committed repository, so it cannot drift from the
// commit it checks and it runs from a clean checkout with no external evidence file.
const scores = JSON.parse(readFileSync('data/raw/benchmarks/scores.json', 'utf8')).observations;
const map = JSON.parse(readFileSync('data/raw/benchmarks/identity-map.json', 'utf8')).entries;
const observations = JSON.parse(readFileSync('data/raw/benchmarks/public-observations.json', 'utf8'));
// The 49 joins this round reviewed are the map entries it dated.
const REVIEW_DATE = '2026-09-27';
const expected = map.filter((e) => e.reviewed_at === REVIEW_DATE).map((e) => {
  const o = scores.find((x) => x.benchmark_id === e.benchmark_id && x.subject.source_id === e.source_id);
  return { benchmark_id: e.benchmark_id, source_id: e.source_id, model_id: e.model_id, value: o?.value ?? null };
});
// The retracted rows are the map entries whose row a withdrawal record explains — the same set
// test/d220-identity-map-regeneration.test.mjs pins, read the same way.
const withdrawals = new Map([
  ...JSON.parse(readFileSync('data/raw/benchmarks/public-withdrawals.json', 'utf8')).withdrawals
    .map((w) => [`${w.benchmark_id}\0${w.source_id}`, { record: 'public-withdrawals.json', value: w.last_value }]),
  ...(observations.withdrawn_observations ?? []).filter((w) => w.withdrawn_reason)
    .map((w) => [`${w.benchmark_id}\0${w.subject.source_id}`, { record: 'withdrawn_observations (D187)', value: w.value }]),
]);
const WITHDRAWN = map.filter((e) => withdrawals.has(`${e.benchmark_id}\0${e.source_id}`)).map((e) => ({
  benchmark_id: e.benchmark_id, source_id: e.source_id, model_id: e.model_id,
  record: withdrawals.get(`${e.benchmark_id}\0${e.source_id}`).record,
  withdrawn_value: withdrawals.get(`${e.benchmark_id}\0${e.source_id}`).value,
}));
const UNION = 'union-alpha::default';
const PRELIMINARY_BOARDS = ['deepswe::snapshot-2026-09-15', 'aa-terminal-bench::4.0'];

const get = async (url) => {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: { 'user-agent': 'BenchmarkHeavenSelfCheck/1.0' }, signal: AbortSignal.timeout(25000) });
      return { status: r.status, text: await r.text() };
    } catch (e) { if (i === 2) return { status: 0, text: String(e) }; }
  }
};
const cell = async (host, benchmark_id, model_id) => {
  const r = await get(`https://${host}/api/benchmark-scores?benchmark_id=${encodeURIComponent(benchmark_id)}&model_id=${encodeURIComponent(model_id)}&limit=500`);
  let body = null; try { body = JSON.parse(r.text); } catch {}
  return { status: r.status, body, observations: (body?.observations ?? []).filter((o) => o.subject?.model_id === model_id) };
};

const out = {};
for (const host of hosts) {
  const checks = [];
  const add = (name, pass, detail) => checks.push({ name, pass, detail });
  const meta = await get(`https://${host}/api/meta`);
  let revision = null;
  try { revision = JSON.parse(meta.text).revision; } catch {}
  add('meta revision readable', Boolean(revision), { status: meta.status, revision });

  for (const e of expected) {
    const { status, observations } = await cell(host, e.benchmark_id, e.model_id);
    const hit = observations.find((o) => Math.abs(Number(o.value) - Number(e.value)) < 1e-6);
    add(`joined ${e.benchmark_id} ${e.source_id} -> ${e.model_id}`, status === 200 && Boolean(hit),
      { status, expected_value: e.value, values: observations.map((o) => o.value), basis: hit?.source_basis ?? hit?.basis ?? null });
  }

  // The named defect, stated as the number a reader sees rather than as "a join exists".
  {
    const { status, observations } = await cell(host, 'vals-index-code-migration::2', 'claude-opus-5.5::max');
    const measured = observations.find((o) => Math.abs(Number(o.value) - 68.901) < 1e-3);
    const stale = observations.some((o) => Math.abs(Number(o.value) - 54.997) < 1e-3);
    add('D220 defect gone: Vals code-migration Opus 5.5 is the measured 68.901, not the estimated 54.997',
      status === 200 && Boolean(measured) && !stale, { status, values: observations.map((o) => o.value) });
  }

  // A retracted row must stay retracted. Its map entry exists precisely so the value is withheld, so the
  // pass here is the *absence* of an observation for that configuration on that board.
  for (const w of WITHDRAWN) {
    const { status, body, observations } = await cell(host, w.benchmark_id, w.model_id);
    // Two things have to hold: the configuration carries no observation on that board, and the exact value the
    // maintainer took back is nowhere in the cell — an estimate carrying 103.67 back onto the page would be the
    // failure the entry exists to prevent, and it would not show up as an observation.
    const resurfaced = JSON.stringify(body?.cell ?? {}).includes(String(w.withdrawn_value));
    add(`withheld stays withheld ${w.benchmark_id} ${w.model_id} (${w.withdrawn_value})`,
      status === 200 && observations.length === 0 && !resurfaced,
      { status, observations: observations.length, record: w.record, resurfaced, cell_status: body?.cell?.status ?? null });
  }

  // CR-60.2's shape: one measured LiveBench row, two preliminary announced rows, all three on the page.
  {
    const live = await cell(host, 'livebench::2026-06-25', UNION);
    const hit = live.observations.find((o) => Math.abs(Number(o.value) - 76.13) < 1e-6);
    add('Union Alpha: LiveBench 76.13 is published and measured at source',
      live.status === 200 && Boolean(hit) && (hit?.source_basis ?? hit?.basis) === 'measured',
      { status: live.status, values: live.observations.map((o) => o.value), basis: hit?.source_basis ?? hit?.basis ?? null });
    for (const board of PRELIMINARY_BOARDS) {
      const c = await cell(host, board, UNION);
      const prelim = c.observations.filter((o) => o.basis === 'preliminary');
      add(`Union Alpha: ${board} stays preliminary`, c.status === 200 && prelim.length === 1 && c.observations.length === 1,
        { status: c.status, bases: c.observations.map((o) => o.basis) });
    }
    const page = await get(`https://${host}/models/${encodeURIComponent(UNION)}`);
    // 76.13 renders with the board's own precision; accept the roundings the value can legitimately take, but
    // require them *inside* the LiveBench row — "76" appears all over a long page, so a bare substring search
    // would pass while the row was missing.
    const spellings = ['76.13', '76.1'];
    const at = page.text.indexOf('LiveBench');
    const row = at === -1 ? '' : page.text.slice(at, at + 1600);
    add('Union Alpha model page renders the LiveBench row and its value',
      page.status === 200 && at !== -1 && spellings.some((v) => row.includes(v)),
      { status: page.status, board_named: at !== -1, found_in_row: spellings.filter((v) => row.includes(v)) });
    add('Union Alpha model page still marks the preliminary rows', page.status === 200 && page.text.includes('‡'),
      { status: page.status });
  }

  const pass = checks.filter((c) => c.pass).length;
  out[host] = { revision, pass, total: checks.length, checks };
  console.log(`${host}: ${pass}/${checks.length} (revision ${revision})`);
  for (const c of checks) if (!c.pass) console.log(`  FAIL ${c.name} ${JSON.stringify(c.detail)}`);
}
mkdirSync(outDir, { recursive: true });
writeFileSync(`${outDir}/verification.json`, JSON.stringify({ generated_at: new Date().toISOString(),
  reviewed_joins: expected.length, withheld_rows: WITHDRAWN.length, hosts: out }, null, 2) + '\n');
const ok = Object.values(out).every((h) => h.pass === h.total);
console.log(ok ? 'ALL PASS' : 'FAILURES PRESENT');
process.exit(ok ? 0 : 1);
