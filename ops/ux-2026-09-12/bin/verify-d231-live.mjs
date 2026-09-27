// D231 live verifier: the two rows whose protocol review had been "critic blocked the artifact" for
// days are live as repaired. Usage: node verify-d231-live.mjs <base> <outDir>   Exits 1 on any failure.
//
// Neither repair moves a number, so the surfaces are the ones that carry what changed:
//   * `/api/benchmarks` — the registry as the deploy serves it: the evidence references a reviewer
//     actually reads, the recipe that decides what a capture extracts to, and the prose that is now
//     only what a captured source states.
//   * `/api/benchmark-scores?benchmark_id=…` — the values and their bases, unchanged on both boards.
//   * `/benchmarks?benchmark=mls-bench-lite::30-tasks` in a real browser at desktop and mobile width,
//     because MLS-Bench-Lite is the one of the two with joined rows on a board page.
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');

const BASE = process.argv[2];
const OUT = process.argv[3];
if (!BASE || !OUT) { console.error('usage: verify-d231-live.mjs <base> <outDir>'); process.exit(2); }

const README = 'https://raw.githubusercontent.com/Imbernoulli/MLS-Bench/main/README.md';
const LEADERBOARD = 'https://mls-bench.com/leaderboard';
const FC_POST = 'https://cognition.com/blog/frontier-code';
// The four README passages the review asked for by name, each a contiguous quote of the file.
const README_QUOTES = [
  'whose gain transfers across settings, seeds, datasets, and scales?',
  'Each task fixes a research scaffold, gives the agent the relevant source code and strong baseline implementations',
  "Baseline scores are already populated in each task's `leaderboard.csv`",
  'Baselines and agents share the same task scripts, parsers, seeds, resource limits',
  'switched to arithmetic mean for easier comparison with the per-task numbers',
];
// Claims that left `scoring.notes` because they are collection plumbing or our own capture date,
// not protocol text. Each still lives in `how_to_collect`, which the site serves as well.
const WITHDRAWN_MLS = ['2026-05', '44.66 on 2026-09-22'];
const WITHDRAWN_FC = ['Source publishes a fraction', 'ships its own SWE models'];

const checks = [];
const check = (ctx, name, ok, detail) => { checks.push({ ctx, name, ok: !!ok, detail: String(detail ?? '').slice(0, 400) }); };
const get = async (path) => {
  const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(40000) });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
};

await fs.mkdir(OUT, { recursive: true });

const { benchmarks } = await get('/api/benchmarks');
const byId = new Map(benchmarks.map((b) => [b.id, b]));

// ── MLS-Bench-Lite: the packet was a 937-byte page ────────────────────────────────────────────────
const mls = byId.get('mls-bench-lite::30-tasks');
check('api', 'mls-bench-lite::30-tasks is served', !!mls, 'mls-bench-lite::30-tasks');
const board = (mls?.evidence ?? []).find((s) => s.url === LEADERBOARD);
check('api', "the leaderboard reference declares the recipe that reaches the board's own payload",
  board?.recipe === 'next-rsc', String(board?.recipe));
for (const quote of README_QUOTES) {
  check('api', `the README passage "${quote.slice(0, 44)}…" is cited`,
    (mls?.evidence ?? []).some((s) => s.url === README && (s.excerpt ?? '').includes(quote)),
    String((mls?.evidence ?? []).filter((s) => s.url === README).length));
}
check('api', "MLS-Bench-Lite quotes the README's own notation for the scoring change",
  /in 2026\.5 with rankings unchanged/.test(mls?.scoring?.notes ?? ''), (mls?.scoring?.notes ?? '').slice(0, 220));
for (const claim of WITHDRAWN_MLS) {
  check('api', `MLS-Bench-Lite's scoring notes no longer state "${claim}"`,
    !(mls?.scoring?.notes ?? '').includes(claim), claim);
}
check('api', 'MLS-Bench-Lite is still reported', mls?.status === 'active' && mls?.version_status === 'published',
  `${mls?.status}/${mls?.version_status}`);

// ── FrontierCode 1.1: the blocker rule was real, its source was simply not in the packet ──────────
const fc = byId.get('frontiercode::1.1');
check('api', 'frontiercode::1.1 is served', !!fc, 'frontiercode::1.1');
check('api', 'FrontierCode 1.1 cites the original release post for the blocker rule',
  (fc?.evidence ?? []).some((s) => s.url === FC_POST && /Otherwise it receives a score of zero/.test(s.excerpt ?? '')),
  JSON.stringify((fc?.evidence ?? []).map((s) => s.url)));
check('api', 'the metric the post supports is the one the row states',
  /solutions failing blocking criteria receive 0/.test(fc?.scoring?.metric ?? ''), fc?.scoring?.metric);
check('api', 'FrontierCode 1.1 states the subset size the release post states',
  /the 100 hardest of the 150-task Extended set/.test(fc?.scoring?.notes ?? ''), fc?.scoring?.notes);
for (const claim of WITHDRAWN_FC) {
  check('api', `FrontierCode 1.1's scoring notes no longer state "${claim}"`,
    !(fc?.scoring?.notes ?? '').includes(claim), claim);
}
// The two sentences are not lost: they are collection facts and the collection record still carries them.
check('api', "the ×100 projection stays in the row's collection locator, where it belongs",
  /fraction; the rendered leaderboard shows it ×100/.test(fc?.how_to_collect?.locator ?? ''), fc?.how_to_collect?.locator);
check('api', 'the self-reported basis stays in the collection notes',
  /every row is self_reported/.test(fc?.how_to_collect?.notes ?? ''), (fc?.how_to_collect?.notes ?? '').slice(-160));

// ── No value moved on either board ────────────────────────────────────────────────────────────────
// Counts and values re-derived from the published dataset before this change. MLS-Bench-Lite's rows
// are model×harness keys, FrontierCode's are model×effort; both boards join a subset of their rows.
const PINS = [
  ['mls-bench-lite::30-tasks', 15, 'points', [['Claude Fable 5.1|Claude Code (max effort)', 50.3], ['Qwen3.8-Max-0902|Claude Code', 50.1]]],
  ['frontiercode::1.1', 101, 'percent', [['Claude Opus 5.5', 54.6], ['Claude Fable 5|xhigh', 53.480000000000004]]],
];
for (const [id, total, unit, pins] of PINS) {
  const scores = await get(`/api/benchmark-scores?benchmark_id=${encodeURIComponent(id)}&limit=500`);
  check('scores', `${id} still publishes all ${total} observations`, scores.total === total, String(scores.total));
  check('scores', `${id}'s observations all carry the row's unit`,
    scores.observations.length === total && scores.observations.every((o) => o.unit === unit),
    JSON.stringify([...new Set(scores.observations.map((o) => o.unit))]));
  for (const [key, value] of pins) {
    const o = scores.observations.find((r) => r.subject?.source_id === key);
    check('scores', `${id}: ${key} is still on the board`, !!o, key);
    check('scores', `${id}: ${key} still reads ${value} — the repair moved no value`, o?.value === value, String(o?.value));
  }
}

// ── The board itself, at both widths ───────────────────────────────────────────────────────────────
const browser = await chromium.launch();
try {
  for (const [ctx, opts] of [['desktop', { viewport: { width: 1440, height: 1000 } }], ['mobile', { viewport: { width: 390, height: 844 } }]]) {
    const c = await browser.newContext(opts);
    try {
      const p = await c.newPage();
      const pageErrors = []; p.on('pageerror', (e) => pageErrors.push(String(e)));
      const url = `${BASE}/benchmarks?benchmark=${encodeURIComponent('mls-bench-lite::30-tasks')}`;
      for (let i = 0; i < 3; i++) { try { await p.goto(url, { waitUntil: 'networkidle', timeout: 120000 }); break; } catch (e) { if (i === 2) throw e; } }
      await p.waitForTimeout(2500);
      const m = await p.evaluate(() => ({
        headings: [...document.querySelectorAll('h1,h2,h3')].map((e) => e.textContent.trim()).slice(0, 4),
        rows: [...document.querySelectorAll('table tbody tr')].map((tr) => {
          const cells = [...tr.querySelectorAll('th,td')].map((cell) => cell.textContent.trim());
          return { name: (cells[1] ?? '').slice(0, 60), result: (cells[2] ?? '').slice(0, 40) };
        }),
        overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      }));
      await p.screenshot({ path: `${OUT}/${ctx}-mls-bench-lite.png` });
      check(ctx, 'the MLS-Bench-Lite board is the one on screen',
        m.headings.some((h) => /MLS-Bench-Lite/.test(h)), JSON.stringify(m.headings));
      check(ctx, 'the board still lists joined rows', m.rows.length > 0, `${m.rows.length}`);
      check(ctx, 'every row still prints a points value', m.rows.every((r) => /points/.test(r.result)),
        JSON.stringify(m.rows.slice(0, 3)));
      check(ctx, 'no horizontal overflow', !m.overflow, String(m.overflow));
      check(ctx, 'no page errors', pageErrors.length === 0, JSON.stringify(pageErrors));
    } finally { await c.close(); }
  }
} finally { await browser.close(); }

const pass = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), pass, total: checks.length, checks }, null, 1));
console.log(`${pass}/${checks.length} checks passed (${BASE})`);
process.exit(pass === checks.length ? 0 : 1);
