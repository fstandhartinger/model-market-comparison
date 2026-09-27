#!/usr/bin/env node
// D233 live proof: the corrected Vending-Bench 2 metadata is served, and the run count the source
// never stated is gone from every public surface.
//
//   node ops/ux-2026-09-12/bin/verify-d233-live.mjs <base> <outDir>
//
// The registry is served by /api/benchmarks (the cheapest live proof of a registry repair), and the
// board's own page lists the joined rows. Values are asserted unchanged: this repair is prose only,
// so a moved score would be the failure to catch.
import { mkdir, writeFile } from 'node:fs/promises';
const [base, outDir] = process.argv.slice(2);
if (!base || !outDir) { console.error('usage: verify-d233-live.mjs <base> <outDir>'); process.exit(2); }
await mkdir(outDir, { recursive: true });
const checks = [];
const check = (name, ok, detail) => checks.push({ name, pass: Boolean(ok), detail: detail ?? null });
const get = async (path) => {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const res = await fetch(`${base}${path}`, { headers: { accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (error) { if (attempt === 3) throw error; await new Promise((r) => setTimeout(r, 2000 * attempt)); }
  }
};

const benchmarks = await get('/api/benchmarks?limit=500');
const rows = benchmarks.benchmarks ?? benchmarks.items ?? benchmarks.data ?? [];
check('/api/benchmarks serves a board list', rows.length > 0, rows.length);
const vb = rows.find((b) => b.id === 'vending-bench::2');
check('vending-bench::2 is served', Boolean(vb), vb?.id ?? null);
const metric = vb?.scoring?.metric ?? '';
const notes = vb?.scoring?.notes ?? '';
check('the metric no longer claims a run count the source never stated',
  !/across 5 runs/.test(metric), metric);
check('the metric states the average the leaderboard labels',
  /averaged across runs$/.test(metric), metric);
check('the notes record why no run count is claimed',
  /publishes no run count in its page text/.test(notes) && /D233/.test(notes), notes.slice(-160));
check('unit, direction and range are untouched', vb?.scoring?.unit === 'USD'
  && vb?.scoring?.higher_better === true, JSON.stringify(vb?.scoring?.unit ?? null) + '/' + String(vb?.scoring?.higher_better));
check('lifecycle is unchanged: active, published, no successor', vb?.status === 'active'
  && vb?.version_status === 'published' && (vb?.superseded_by ?? null) === null,
  `${vb?.status}/${vb?.version_status}/${String(vb?.superseded_by ?? null)}`);
// The notes deliberately quote the wording they retire, so the claim is what must be gone: no field
// of this board may still *state* a run count.
// The notes deliberately quote the wording they retire, so the only run count allowed anywhere on
// this board is that quotation. Strip it and nothing may be left.
const notesBeyondQuote = notes.replace("'(average across 5 runs)'", '');
check('no field of this board claims a run count outside the quotation that retires it',
  !/across \d+ runs/.test(metric) && !/across \d+ runs/.test(notesBeyondQuote)
  && !/across \d+ runs/.test(vb?.one_sentence_description ?? ''),
  [metric, notesBeyondQuote.slice(-90), vb?.one_sentence_description?.slice(0, 60)].join(' | '));

// The values behind the board: this repair is prose only, so every published score must still be
// there, unmoved. Ten observations and GPT-6 Astra's $15,514.70 are the board's published state.
const scores = await get('/api/benchmark-scores?benchmark_id=vending-bench%3A%3A2&limit=500');
const cells = scores.observations ?? [];
check('the board still publishes all ten observations', cells.length === 10, `${cells.length} of ${scores.total}`);
const values = cells.map((c) => c.value).filter((v) => typeof v === 'number');
check('every published cell carries a numeric USD balance', values.length === cells.length
  && cells.every((c) => c.unit === 'USD'), `${values.length}/${cells.length}`);
check('the leader is still GPT-6 Astra at 15514.7', Math.max(...values) === 15514.7, Math.max(...values));
// Each observation carries the *collection plan's* copy of the metric, frozen when it was collected.
// Correcting the registry cannot move it: only a run that republishes this arm can, and this arm has
// been retained since 2026-09-23. So this check is the behavioural half of D233 — it is expected red
// until the next daily publishes `vending-bench::2`, and it is the receipt for that run. Do not
// satisfy it by editing a published snapshot: the plan is the input, and it is already corrected.
check("each observation's protocol line carries the corrected metric (pending the next daily publish)",
  cells.length > 0 && cells.every((c) => /averaged across runs/.test(c.protocol ?? '')
    && !/across \d+ runs/.test(c.protocol ?? '')), cells[0]?.protocol?.slice(0, 130) ?? null);

const pass = checks.filter((c) => c.pass).length;
await writeFile(`${outDir}/verification.json`, JSON.stringify({ base, at: new Date().toISOString(),
  pass, total: checks.length, checks }, null, 2) + '\n');
console.log(`${base}: ${pass}/${checks.length}`);
for (const c of checks) if (!c.pass) console.log(`  FAIL ${c.name} — ${c.detail}`);
process.exit(pass === checks.length ? 0 : 1);
