// D226/D227 live verifier: the three repaired registry rows are live as repaired, no ARC-AGI value moved,
// and the contamination caveat the site serves is the ARC Prize policy's own sentence rather than the
// withdrawn metric string. Usage: node verify-d226-d227-live.mjs <base> <outDir>   Exits 1 on any failure.
//
// Three surfaces, because the repair reaches three:
//   * `/api/benchmarks` — the registry as the deploy serves it: metric, unit, range, lifecycle, supersession.
//   * `/api/benchmark-matrix?models=…` — the reader's caveat, with the field and quote it rests on. Two
//     models that actually hold ARC-AGI results have to be asked for, or the board is not in the matrix.
//   * `/benchmarks?benchmark=arc-agi::1` in a real browser at desktop and mobile width. Note the default
//     view: the board lists the **joined** rows only, seven of the 221 observations, so the values pinned
//     below are the seven the page really prints — the 98.5 at the top of the raw observation list belongs
//     to a source label with no catalog model and never appears here.
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');

const BASE = process.argv[2];
const OUT = process.argv[3];
if (!BASE || !OUT) { console.error('usage: verify-d226-d227-live.mjs <base> <outDir>'); process.exit(2); }

const METRIC = 'Semi-Private Evaluation Set accuracy on the ARC Prize Verified Leaderboard';
const CAVEAT = 'Scored on the semi-private set, which is not publicly released; ARC Prize acknowledges the possibility of limited leakage because tasks are sent to third-party APIs.';
const CAVEAT_QUOTE = 'because tasks are sent to external APIs, we acknowledge the possibility of limited leakage over time';
// The claim four protocol rounds refused. No captured ARC Prize page states it, so it may not come back.
const RETIRED_CLAIM = 'exact grid';
// Re-derived from the published dataset before this change, in the page's own order.
const BOARD_ROWS = [['Gemini 3 Pro', '75'], ['DeepSeek R1', '15.8'], ['o1-mini', '14'], ['GPT-4.1', '5.5']];

const checks = [];
const check = (ctx, name, ok, detail) => { checks.push({ ctx, name, ok: !!ok, detail: String(detail ?? '').slice(0, 400) }); };
const get = async (path) => {
  const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(40000) });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
};

await fs.mkdir(OUT, { recursive: true });

// ── D226 and D227 on the deployed registry ─────────────────────────────────────────────────────────
const { benchmarks } = await get('/api/benchmarks');
const byId = new Map(benchmarks.map((b) => [b.id, b]));
for (const [id, successor] of [['arc-agi::1', 'arc-agi::2'], ['arc-agi::2', 'arc-agi::3']]) {
  const b = byId.get(id);
  check('api', `${id} is served`, !!b, id);
  if (!b) continue;
  check('api', `${id} states the metric the ARC Prize pages state`, b.scoring?.metric === METRIC, b.scoring?.metric);
  check('api', `${id} is a percent scale 0–100, higher better`, b.scoring?.unit === 'percent'
    && JSON.stringify(b.scoring?.range) === '[0,100]' && b.scoring?.higher_better === true, JSON.stringify(b.scoring?.range));
  check('api', `${id} names ${successor} as the successor its protocol names`, b.superseded_by === successor, String(b.superseded_by));
  check('api', `${id} is still reported, so a named successor did not retire it`,
    b.status === 'active' && b.version_status === 'published', `${b.status}/${b.version_status}`);
  check('api', `${id} records that its evidence was reviewed on 2026-09-27`, b.last_verified === '2026-09-27', b.last_verified);
  check('api', `${id}'s notes carry the policy's single-run rule`,
    /A single run is used/.test(b.scoring?.notes ?? ''), (b.scoring?.notes ?? '').slice(0, 80));
}
const stillClaiming = benchmarks.filter((b) => new RegExp(RETIRED_CLAIM, 'i').test(b.scoring?.metric ?? '')).map((b) => b.id);
check('api', 'no board on the site claims an "exact grid" metric any more', stillClaiming.length === 0, JSON.stringify(stillClaiming));

const aime = byId.get('aa-aime::2025');
check('api', 'aa-aime::2025 is served', !!aime, 'aa-aime::2025');
check('api', 'AIME 2025 records a retired version, as AA\'s own note states',
  aime?.version_status === 'retained' && aime?.status === 'retained', `${aime?.status}/${aime?.version_status}`);
check('api', 'AIME 2025 names no successor, because AA names none', aime?.superseded_by === null, String(aime?.superseded_by));

// ── The reader's caveat, and the sentence it rests on ──────────────────────────────────────────────
const { matrix } = await get(`/api/benchmark-matrix?models=${encodeURIComponent('deepseek-r1::default,grok-3::default')}`);
for (const id of ['arc-agi::1', 'arc-agi::2']) {
  const row = matrix.rows.find((r) => r.benchmarkId === id);
  check('matrix', `${id} is a row of the served matrix`, !!row, id);
  if (!row) continue;
  check('matrix', `${id}'s contamination caveat is the policy's statement`, row.freshness?.contamination === CAVEAT, row.freshness?.contamination);
  check('matrix', `${id}'s caveat cites the passage it quotes`, row.freshness?.source?.quote === CAVEAT_QUOTE
    && row.freshness?.source?.field === 'evidence.excerpt', JSON.stringify(row.freshness?.source));
  check('matrix', `${id}'s caveat no longer rests on the withdrawn metric wording`,
    !new RegExp(RETIRED_CLAIM, 'i').test(JSON.stringify(row.freshness ?? {})), JSON.stringify(row.freshness?.source));
}

// ── The board itself, at both widths ───────────────────────────────────────────────────────────────
const browser = await chromium.launch();
try {
  for (const [ctx, opts] of [['desktop', { viewport: { width: 1440, height: 1000 } }], ['mobile', { viewport: { width: 390, height: 844 } }]]) {
    const c = await browser.newContext(opts);
    try {
      const p = await c.newPage();
      const pageErrors = []; p.on('pageerror', (e) => pageErrors.push(String(e)));
      const url = `${BASE}/benchmarks?benchmark=${encodeURIComponent('arc-agi::1')}`;
      // The hub times out under load often enough that one goto is not a measurement.
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
      await p.screenshot({ path: `${OUT}/${ctx}-arc-agi-1.png` });
      check(ctx, 'the ARC-AGI-1 board is the one on screen', m.headings.some((h) => /^ARC-AGI-1$/.test(h)), JSON.stringify(m.headings));
      check(ctx, 'the board still lists its seven joined rows', m.rows.length === 7, `${m.rows.length}: ${JSON.stringify(m.rows.map((r) => r.name.slice(0, 18)))}`);
      for (const [name, value] of BOARD_ROWS) {
        const row = m.rows.find((r) => r.name.startsWith(name));
        check(ctx, `${name} is still on the board`, !!row, JSON.stringify(m.rows.map((r) => r.name.slice(0, 18))));
        check(ctx, `${name} still reads ${value} percent — the registry repair moved no value`,
          !!row && row.result.startsWith(`${value} percent`), row ? row.result : '(row absent)');
      }
      check(ctx, 'no horizontal overflow', !m.overflow, String(m.overflow));
      check(ctx, 'no page errors', pageErrors.length === 0, JSON.stringify(pageErrors));
    } finally { await c.close(); }
  }
} finally { await browser.close(); }

const pass = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), pass, total: checks.length, checks }, null, 1));
console.log(`${pass}/${checks.length} checks passed (${BASE})`);
process.exit(pass === checks.length ? 0 : 1);
