#!/usr/bin/env node
// D235 live proof: the nine Vals Index boards are served saying only what the Vals page says, the
// policy sentence is still on the site (it is a reader's only way to tell a Composite input from a
// secondary board), and no value moved.
//
//   node ops/ux-2026-09-12/bin/verify-d235-live.mjs <base> <outDir>
//
// The registry is served by /api/benchmarks. The behavioural half — each observation's frozen copy
// of the plan protocol — is expected red until the next daily republishes these arms, exactly as in
// D233, and it must never be satisfied by editing a published snapshot.
import { mkdir, writeFile } from 'node:fs/promises';
const [base, outDir] = process.argv.slice(2);
if (!base || !outDir) { console.error('usage: verify-d235-live.mjs <base> <outDir>'); process.exit(2); }
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

const VALS = ['vals-index::2', 'vals-index-finance-agent::2', 'vals-index-emb::2',
  'vals-index-terminal-bench-2.1::2', 'vals-index-vibe-code-bench::2', 'vals-index-code-migration::2',
  'vals-index-legal-research::2', 'vals-index-hlab::2', 'vals-index-cost::2'];
// Claims the Vals Index page does not make. "private benchmark" is not here: the page does call EMB,
// Code Migration and Legal Research Bench private, so the per-board wording is checked below.
const UNSOURCED = [/standard error per model/, /independent evaluator/, /secondary benchmark/,
  /updated 2026-09-10/, /56 model rows/];
const POLICY = 'Benchmark Heaven policy:';

const benchmarks = await get('/api/benchmarks?limit=500');
const rows = benchmarks.benchmarks ?? benchmarks.items ?? benchmarks.data ?? [];
check('/api/benchmarks serves a board list', rows.length > 0, rows.length);
const served = new Map(rows.filter((b) => VALS.includes(b.id)).map((b) => [b.id, b]));
check('all nine Vals Index boards are served', served.size === 9, [...served.keys()].length);

for (const id of VALS) {
  const board = served.get(id);
  const notes = board?.scoring?.notes ?? '';
  const hit = UNSOURCED.find((p) => p.test(JSON.stringify(board ?? {})));
  check(`${id}: no claim the Vals page never makes`, board && !hit, hit ? String(hit) : notes.slice(0, 90));
  check(`${id}: the site keeps the policy sentence`, notes.includes(POLICY), notes.slice(-110));
  // The cost board is the one where lower is better; every other Vals board is an accuracy percent.
  const cost = id === 'vals-index-cost::2';
  check(`${id}: unit and direction are untouched`,
    board?.scoring?.unit === (cost ? 'USD' : 'percent') && board?.scoring?.higher_better === !cost,
    `${board?.scoring?.unit}/${board?.scoring?.higher_better}`);
  check(`${id}: lifecycle unchanged — active, published, no successor`, board?.status === 'active'
    && board?.version_status === 'published' && (board?.superseded_by ?? null) === null,
    `${board?.status}/${board?.version_status}/${String(board?.superseded_by ?? null)}`);
}
// The page calls exactly these three private; the other components must not claim it.
for (const id of ['vals-index-emb::2', 'vals-index-code-migration::2', 'vals-index-legal-research::2']) {
  check(`${id}: quotes the page's own "A private benchmark" wording`,
    /A private benchmark/.test(served.get(id)?.scoring?.notes ?? ''), (served.get(id)?.scoring?.notes ?? '').slice(0, 100));
}
for (const id of ['vals-index-vibe-code-bench::2', 'vals-index-hlab::2', 'vals-index::2',
  'vals-index-finance-agent::2', 'vals-index-terminal-bench-2.1::2']) {
  const notes = served.get(id)?.scoring?.notes ?? '';
  check(`${id}: does not call its board private`, !/; private benchmark/.test(notes)
    && !/calls (it|HLAB|Vibe Code Bench) (a )?private/.test(notes), notes.slice(0, 100));
}
// The convention, live: a served board that states the Composite policy must state it behind the
// marker. The 14 boards where the clause is welded onto something a source has to settle are the
// inventory that test/d235-policy-note.test.mjs pins; they are named here so this check stays honest
// rather than being weakened when one of them appears.
const INVENTORY = new Set(['apprenticebench-api-cost::snapshot-2026-09-14', 'apprenticebench-api::snapshot-2026-09-14',
  'apprenticebench-cua-cost::snapshot-2026-09-14', 'apprenticebench-cua::snapshot-2026-09-14',
  'cursorbench-cost::4.0', 'cursorbench::4.0', 'frontiercode-cost::1.1', 'matharena-brokenarxiv::2026-06',
  'matharena-brokenarxiv::2026-08', 'openai-automationbench-cost::1.0.6', 'programbench::1',
  'react-native-evals::91-evals', 'researchclawbench::40-tasks', 'vulcanbench-frontier::4']);
const unmarked = rows.filter((b) => /Composite input|enters the Composite|into the Composite/.test(b?.scoring?.notes ?? '')
  && !(b?.scoring?.notes ?? '').includes(POLICY) && !INVENTORY.has(b.id)).map((b) => b.id);
check('every served board states the Composite policy behind the marker, bar the 14 inventoried',
  unmarked.length === 0, unmarked.join(', ') || 'none');
const markedBoards = rows.filter((b) => (b?.scoring?.notes ?? '').includes(POLICY));
check('the 47 converted boards and the nine Vals boards serve the marker', markedBoards.length >= 56, markedBoards.length);
// Everything after the marker is ours by definition, so the invariant is not "nothing follows" — it is
// that no claim about what a value *means* hides there, where the reviewer can no longer see it. Same
// word list as test/d235-policy-note.test.mjs.
const PROTOCOL_WORDS = /\b(metric|unit|units|range|task set|tasks|harness|judge|judges|rubric|version|saturat\w*|pass@|denominator|subset)\b/i;
const hidden = markedBoards.filter((b) => PROTOCOL_WORDS.test(b.scoring.notes.slice(b.scoring.notes.indexOf(POLICY))));
check('no protocol claim hides behind the marker on any served board', hidden.length === 0,
  hidden.map((b) => b.id).join(', ') || 'none');

// The cross-source clause stays on the site on both sides: it is a reader's warning, and only the
// pair of registry entries can settle it.
const harvey = rows.find((b) => b.id === 'aa-harvey-lab::snapshot-2026-09-10');
check('both Harvey LAB-AA and Vals HLAB still warn about each other on the site',
  /not the same run or scale as Vals AI's HLAB row/.test(harvey?.one_sentence_description ?? '')
  && /not comparable with Artificial Analysis' Harvey LAB-AA row/
    .test(served.get('vals-index-hlab::2')?.one_sentence_description ?? ''),
  harvey?.one_sentence_description?.slice(-60) ?? null);

// Values: this repair is prose only. Legal Research is the board whose refusal reproduced.
const scores = await get('/api/benchmark-scores?benchmark_id=vals-index-legal-research%3A%3A2&limit=500');
const cells = scores.observations ?? [];
check('the Legal Research board still publishes its rows', cells.length > 0, `${cells.length} of ${scores.total}`);
check('every published cell is a numeric percent', cells.length > 0
  && cells.every((c) => typeof c.value === 'number' && c.unit === 'percent'), cells.length);
const muse = cells.find((c) => (c.subject?.source_id ?? c.subject?.name) === 'meta/muse_spark_1_3_max');
check('meta/muse_spark_1_3_max still reads 55.288', muse?.value === 55.288, muse?.value ?? null);
// Expected red until the next daily republishes these arms — the plan is the input and is corrected.
check("each observation's protocol line has dropped the board's last-updated date (pending the next daily publish)",
  cells.length > 0 && cells.every((c) => !/updated 2026-09-10/.test(c.protocol ?? '')),
  cells[0]?.protocol?.slice(0, 120) ?? null);

const pass = checks.filter((c) => c.pass).length;
await writeFile(`${outDir}/verification.json`, JSON.stringify({ base, at: new Date().toISOString(),
  pass, total: checks.length, checks }, null, 2) + '\n');
console.log(`${base}: ${pass}/${checks.length}`);
for (const c of checks) if (!c.pass) console.log(`  FAIL ${c.name} — ${c.detail}`);
process.exit(pass === checks.length ? 0 : 1);
