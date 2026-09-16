// Iteration 80 (CR-30.2 / CR-38.1): boards from the source audit — OSWorld 2.0 (one identity per task release),
// MathArena ArXivMath and BrokenArXiv 06/2026, and Epoch AI's FrontierMath v2 and SimpleQA Verified runs. Published values are checked against the numbers in the committed
// captures (independently re-readable from data/raw/benchmarks/daily-evidence/2026-09-16-*), then the rows
// are checked in the UI at 1440/390, light/dark.
// Usage: node verify-iter80.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-iter80';
await fs.mkdir(OUT, { recursive: true });
const goto = async (page, url) => { for (let a = 1; ; a++) { try { return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }); } catch (e) { if (a >= 3 || !/ERR_NETWORK_CHANGED|ERR_CONNECTION|ERR_TIMED_OUT|Timeout|ERR_INTERNET/.test(String(e))) throw e; await new Promise((r) => setTimeout(r, 3000 * a)); } } };
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const settle = async (page) => { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(2500); };

const IDS = ['claude-opus-5::max', 'gpt-6-astra::max', 'gpt-5.6-sol::max', 'claude-fable-5.1::max'];
const api = await (await fetch(`${BASE}/api/benchmark-matrix?models=${encodeURIComponent(IDS.join(','))}`)).json();
const matrix = api.matrix;
const rows = matrix?.rows ?? [];
const idx = (needle) => rows.findIndex((r) => r.name.includes(needle));
const valueOf = (modelId, needle) => { const i = idx(needle); return (matrix?.values?.[modelId] ?? []).find(([k]) => k === i)?.[1] ?? null; };
for (const [board, group] of [['OSWorld 2.0, August 2026 task release', 'agentic'], ['ArXivMath 06/2026', 'math'], ['BrokenArXiv 06/2026', 'math']]) {
  const r = rows[idx(board)];
  check(`API: ${board} is a row in its category`, r && r.group === group, r ? { name: r.name, group: r.group, cohort: r.cohort, unit: r.unit } : 'missing');
}
// The captured numbers (official-results.json updatedAt 2026-09-03; MathArena tables captured 2026-09-16).
check('API: OSWorld 2.0 August 2026 release claude-opus-5::max = 31.43 (full set, 500 steps, batch tool)', valueOf('claude-opus-5::max', 'August 2026 task release') === 31.43, String(valueOf('claude-opus-5::max', 'August 2026 task release')));
check('API: the June 2026 release row carries no August 2026 run (task releases are not mixed)', valueOf('claude-opus-5::max', 'June 2026 task release') === null && valueOf('gpt-5.6-sol::max', 'June 2026 task release') === null, '');
check('API: OSWorld 2.0 offline-subset value 34.72 is not published', !Object.values(matrix?.values ?? {}).flat().some(([, v]) => v === 34.72), '');
check('API: ArXivMath 06/2026 gpt-6-astra::max = 94.44', valueOf('gpt-6-astra::max', 'ArXivMath') === 94.44, String(valueOf('gpt-6-astra::max', 'ArXivMath')));
check('API: FrontierMath Tiers 1–3 v2 claude-fable-5.1::max = 0.9017543859649123 (Epoch CSV)', valueOf('claude-fable-5.1::max', 'FrontierMath Tiers 1–3 v2') === 0.9017543859649123, String(valueOf('claude-fable-5.1::max', 'FrontierMath Tiers 1–3 v2')));
check('API: SimpleQA Verified claude-fable-5.1::max = 0.708 (Epoch CSV)', valueOf('claude-fable-5.1::max', 'SimpleQA Verified') === 0.708, String(valueOf('claude-fable-5.1::max', 'SimpleQA Verified')));
check('API: BrokenArXiv carries the Judged tag (LLM-judged, CR-38.3)', (rows[idx('BrokenArXiv')]?.tags ?? []).includes('judged'), rows[idx('BrokenArXiv')]?.tags);
check('API: BrokenArXiv 06/2026 claude-opus-5::max = 90.74', valueOf('claude-opus-5::max', 'BrokenArXiv') === 90.74, String(valueOf('claude-opus-5::max', 'BrokenArXiv')));
check('API: catalog board count includes the six new boards (89 before)', (matrix?.catalogBoards ?? 0) >= 96, String(matrix?.catalogBoards));
// The June 2026 release carries none of the models above; read it through a model it did measure.
const june = (await (await fetch(`${BASE}/api/benchmark-matrix?models=${encodeURIComponent('gpt-5.5::xhigh,claude-sonnet-4.6::medium')}`)).json()).matrix;
const juneIdx = (june?.rows ?? []).map((r, i) => [r, i]).filter(([r]) => r.name.includes('June 2026 task release'));
const juneVal = (m) => (june?.values?.[m] ?? []).find(([k]) => juneIdx.some(([, i]) => i === k))?.[1] ?? null;
check('API: OSWorld 2.0 June 2026 release is an agentic row; gpt-5.5::xhigh = 13, claude-sonnet-4.6::medium = 9.3',
  juneIdx.length > 0 && juneIdx.every(([r]) => r.group === 'agentic') && juneVal('gpt-5.5::xhigh') === 13 && juneVal('claude-sonnet-4.6::medium') === 9.3,
  { rows: juneIdx.map(([r]) => `${r.name} · ${r.cohort}`), gpt55: juneVal('gpt-5.5::xhigh'), sonnet: juneVal('claude-sonnet-4.6::medium') });
// Provenance: the observation names its source and keeps MathArena's release-date flag.
const scores = await (await fetch(`${BASE}/api/benchmark-scores?model_id=${encodeURIComponent('gpt-6-astra::max')}&limit=500`)).json();
const obs = (scores.observations ?? scores.results ?? []).find((o) => o.benchmark_id === 'matharena-arxivmath::2026-06');
check('API: the ArXivMath observation cites the MathArena table endpoint and keeps the release-date flag',
  obs && obs.source?.url === 'https://matharena.ai/competition_tables/arxiv--june' && /"released_after_competition":true/.test(obs.protocol ?? ''), obs ? { url: obs.source?.url, basis: obs.basis } : Object.keys(scores));

const browser = await chromium.launch();
for (const theme of ['light', 'dark']) for (const [kind, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const tag = `${kind}_${theme}`, mobile = kind === 'mobile';
  const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, colorScheme: theme });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  await goto(page, `${BASE}/?v=${Date.now()}`);
  await page.evaluate((t) => { try { localStorage.clear(); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  await page.reload().catch(async () => { await new Promise((r) => setTimeout(r, 3000)); await page.reload(); }); await settle(page);
  const hero = await page.evaluate(() => document.querySelector('.bh-hero-line')?.innerText.replace(/\s+/g, ' ').trim() ?? '');
  const heroBoards = Number(/(\d[\d,]*) benchmarks/.exec(hero)?.[1]?.replace(/,/g, '') ?? 0);
  check(`${tag} hero count equals the API's catalog board count`, heroBoards === matrix?.catalogBoards, { hero, api: matrix?.catalogBoards });

  await goto(page, `${BASE}/benchmarks?models=${encodeURIComponent(IDS.join(','))}&rows=all`);
  await settle(page);
  const seen = await page.evaluate((boards) => {
    const trs = [...document.querySelectorAll('table tr')].map((tr) => tr.innerText.replace(/\s+/g, ' ').trim());
    return boards.map((b) => ({ board: b, row: trs.find((r) => r.includes(b)) ?? null }));
  }, ['OSWorld 2.0, August 2026', 'ArXivMath', 'BrokenArXiv', 'FrontierMath Tiers 1–3 v2', 'SimpleQA Verified']);
  check(`${tag} the new boards render as rows with values on /benchmarks`, seen.every((s) => s.row && /\d/.test(s.row)), JSON.stringify(seen).slice(0, 500));
  const text = await page.evaluate(() => document.body.innerText);
  check(`${tag} the published numbers appear in the table`, /31\.4/.test(text) && /94\.4/.test(text) && /90\.7/.test(text), '');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`${tag} no horizontal page overflow on /benchmarks`, overflow <= 1, String(overflow));
  const target = page.locator('table tr', { hasText: 'ArXivMath' }).first();
  await target.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${tag}-benchmarks-arxivmath.png` }).catch(() => {});
  await page.locator('table tr', { hasText: 'August 2026 task release' }).first().scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${tag}-benchmarks-osworld.png` }).catch(() => {});
  check(`${tag} no page errors`, !errors.length, errors);
  await context.close();
}
await browser.close();
const passed = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, runner: process.env.BH_RUNNER || 'unspecified', at: new Date().toISOString(), passed, total: checks.length, checks }, null, 2));
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name} — ${String(c.detail).slice(0, 220)}`);
console.log(`${passed}/${checks.length}`);
process.exit(passed === checks.length ? 0 : 1);
