// D228/D229 live verifier: the two repaired registry rows are live as repaired, and no value moved.
// Usage: node verify-d228-d229-live.mjs <base> <outDir>   Exits 1 on any failure.
//
// D229 renames Blueprint-Bench 2's unit — the Andon Labs page never says "points", it says the scores
// are normalised so the random baseline is 0 and a perfect plan is 1 — so this one is visible on the
// page as well as in the registry, and three surfaces have to agree:
//   * `/api/benchmarks` — the registry as the deploy serves it.
//   * `/api/benchmark-scores?benchmark_id=…` — every stored observation carries the row's unit
//     (lib/benchmark-scores.mjs refuses a mismatch), so the rename is only honest if all 29 moved
//     with it and none of their values did.
//   * `/benchmarks?benchmark=blueprint-bench::2` in a real browser at desktop and mobile width. The
//     board lists the **joined** rows only — two of the 29 observations — and both of those sit at or
//     below the board's random baseline, so the values the page prints are 0. The 0.497 at the top of
//     the observation list is a source label with no catalog model and never appears there.
// D228 is registry prose only (FrontierSWE v2's harness), so it is checked where it is served.
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');

const BASE = process.argv[2];
const OUT = process.argv[3];
if (!BASE || !OUT) { console.error('usage: verify-d228-d229-live.mjs <base> <outDir>'); process.exit(2); }

const UNIT = 'normalized score';
const PAGE_QUOTE = 'All scores are normalized so that the random baseline maps to 0 and a perfect score maps to 1';
const BLOG_QUOTE = 'We evaluate each model at its maximum reasoning effort, with Proximus as the default harness and a 20-hour budget per task';
const README_QUOTE = 'We evaluated all models using our harness Proximus';
// The three claims the protocol review disputed, each unsupported by any captured FrontierSWE page.
const WITHDRAWN = ['Other Harnesses', "own harness selection", '14 rows', '12 overlapping'];
// Re-derived from the published dataset before this change.
const JOINED = [['Gemini 3 Flash', 0], ['Grok 4.20 Reasoning', 0]];
const UNJOINED = [['GPT-6 Astra', 0.497], ['Claude Fable 5.1', 0.419], ['Kimi K2.6', 0.039]];
const FC_BLOG = 'https://cognition.com/blog/frontier-code-1.1';

const checks = [];
const check = (ctx, name, ok, detail) => { checks.push({ ctx, name, ok: !!ok, detail: String(detail ?? '').slice(0, 400) }); };
const get = async (path) => {
  const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(40000) });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
};

await fs.mkdir(OUT, { recursive: true });

// ── The deployed registry ──────────────────────────────────────────────────────────────────────────
const { benchmarks } = await get('/api/benchmarks');
const byId = new Map(benchmarks.map((b) => [b.id, b]));

const bp = byId.get('blueprint-bench::2');
check('api', 'blueprint-bench::2 is served', !!bp, 'blueprint-bench::2');
check('api', `Blueprint-Bench 2 states the unit its own page states, not "points"`,
  bp?.scoring?.unit === UNIT, bp?.scoring?.unit);
check('api', 'Blueprint-Bench 2 keeps its 0–1 scale, higher better',
  JSON.stringify(bp?.scoring?.range) === '[0,1]' && bp?.scoring?.higher_better === true, JSON.stringify(bp?.scoring?.range));
check('api', "Blueprint-Bench 2's notes quote the page sentence the unit comes from",
  (bp?.scoring?.notes ?? '').includes(PAGE_QUOTE), (bp?.scoring?.notes ?? '').slice(-220));
check('api', 'Blueprint-Bench 2 no longer calls its number points anywhere in its scoring',
  !/\bpoints\b/.test(JSON.stringify(bp?.scoring ?? {})), JSON.stringify(bp?.scoring?.unit));
check('api', 'Blueprint-Bench 2 is still reported, and no value was withdrawn with the rename',
  bp?.status === 'active' && bp?.version_status === 'published', `${bp?.status}/${bp?.version_status}`);

const fs2 = byId.get('frontierswe::2');
check('api', 'frontierswe::2 is served', !!fs2, 'frontierswe::2');
check('api', 'FrontierSWE v2 describes the one harness its blog and README name',
  /Proximus harness at its maximum reasoning effort/.test(fs2?.one_sentence_description ?? ''), fs2?.one_sentence_description);
check('api', "FrontierSWE v2's notes quote the blog passage that settles the harness",
  (fs2?.scoring?.notes ?? '').includes(BLOG_QUOTE), (fs2?.scoring?.notes ?? '').slice(0, 200));
check('api', "FrontierSWE v2's notes quote the task repo's README as well",
  (fs2?.scoring?.notes ?? '').includes(README_QUOTE), (fs2?.scoring?.notes ?? '').slice(0, 320));
for (const claim of WITHDRAWN) {
  check('api', `FrontierSWE v2 no longer claims "${claim}"`,
    !JSON.stringify({ d: fs2?.one_sentence_description, n: fs2?.scoring?.notes }).includes(claim), claim);
}
check('api', 'FrontierSWE v2 is still reported', fs2?.status === 'active' && fs2?.version_status === 'published',
  `${fs2?.status}/${fs2?.version_status}`);

// D230 (partial): the FrontierCode 1.1 release post is the source that states the Main/Extended
// subset sizes the version guard asserts, so both FrontierCode rows now cite it.
for (const id of ['frontiercode::1.1', 'frontiercode-cost::1.1']) {
  const e = byId.get(id);
  check('api', `${id} cites the FrontierCode 1.1 release post`,
    (e?.publication_urls ?? []).some((u) => u.url === FC_BLOG), JSON.stringify((e?.publication_urls ?? []).map((u) => u.url)));
  check('api', `${id} carries the post's subset sentence as evidence`,
    (e?.evidence ?? []).some((s) => s.url === FC_BLOG && /Main consists of the 100 hardest/.test(s.excerpt ?? '')),
    JSON.stringify((e?.evidence ?? []).map((s) => s.url)));
}

// ── Every stored observation moved with the row, and no value did ──────────────────────────────────
const scores = await get(`/api/benchmark-scores?benchmark_id=${encodeURIComponent('blueprint-bench::2')}&limit=500`);
check('scores', 'the board still publishes all 29 observations', scores.total === 29, String(scores.total));
check('scores', 'every observation carries the renamed unit',
  scores.observations.length === 29 && scores.observations.every((o) => o.unit === UNIT),
  JSON.stringify([...new Set(scores.observations.map((o) => o.unit))]));
for (const [name, value] of [...JOINED, ...UNJOINED]) {
  const o = scores.observations.find((r) => r.subject?.source_id === name);
  check('scores', `${name} is still on the board`, !!o, name);
  check('scores', `${name} still reads ${value} — the rename moved no value`, o?.value === value, String(o?.value));
}
check('scores', 'every observation is still measured', scores.observations.every((o) => o.basis === 'measured'),
  JSON.stringify([...new Set(scores.observations.map((o) => o.basis))]));

// ── The comparison matrix reads the same unit ──────────────────────────────────────────────────────
// The row is only in the matrix for models that actually hold a Blueprint-Bench result.
const { matrix } = await get(`/api/benchmark-matrix?models=${encodeURIComponent('gemini-3-flash::default,grok-4.20-reasoning::default')}`);
const row = matrix.rows.find((r) => r.benchmarkId === 'blueprint-bench::2');
check('matrix', 'Blueprint-Bench 2 is a row of the served matrix', !!row, 'blueprint-bench::2');
check('matrix', 'the matrix row carries the renamed unit', row?.unit === UNIT, row?.unit);
check('matrix', 'the matrix row keeps its 0–1 scale', JSON.stringify(row?.range) === '[0,1]', JSON.stringify(row?.range));

// ── The board itself, at both widths ───────────────────────────────────────────────────────────────
const browser = await chromium.launch();
try {
  for (const [ctx, opts] of [['desktop', { viewport: { width: 1440, height: 1000 } }], ['mobile', { viewport: { width: 390, height: 844 } }]]) {
    const c = await browser.newContext(opts);
    try {
      const p = await c.newPage();
      const pageErrors = []; p.on('pageerror', (e) => pageErrors.push(String(e)));
      const url = `${BASE}/benchmarks?benchmark=${encodeURIComponent('blueprint-bench::2')}`;
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
      await p.screenshot({ path: `${OUT}/${ctx}-blueprint-bench-2.png` });
      check(ctx, 'the Blueprint-Bench 2 board is the one on screen',
        m.headings.some((h) => /^Blueprint-Bench 2$/.test(h)), JSON.stringify(m.headings));
      check(ctx, 'the board still lists its two joined rows', m.rows.length === 2,
        `${m.rows.length}: ${JSON.stringify(m.rows.map((r) => r.name.slice(0, 22)))}`);
      for (const [name, value] of JOINED) {
        const r = m.rows.find((x) => x.name.startsWith(name));
        check(ctx, `${name} is still on the board`, !!r, JSON.stringify(m.rows.map((x) => x.name.slice(0, 22))));
        check(ctx, `${name} still reads ${value}, now named as the normalised score it is`,
          !!r && r.result.startsWith(`${value} ${UNIT}`), r ? r.result : '(row absent)');
        // The cell text runs the value into the date and the evidence link ("0 points2026-09-25Source …"),
        // so a \b-anchored search reads False on a page that still says points. No anchor.
        check(ctx, `${name}'s result is not labelled points any more`, !!r && !/points/.test(r.result), r ? r.result : '(row absent)');
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
