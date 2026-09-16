// Iteration 81 (CR-38.1): SWE-rebench (task window 2026-05-15..2026-07-01) and GSO (Opt@1). Published values are
// checked against the numbers the sources themselves display (SWE-rebench's rendered default table at capture;
// GSO's leaderboard.json), independently re-readable from data/raw/benchmarks/daily-evidence/2026-09-16-{swe-rebench,gso}/,
// then the rows are checked in the UI at 1440/390, light/dark.
// Usage: node verify-iter81.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-iter81';
await fs.mkdir(OUT, { recursive: true });
const goto = async (page, url) => { for (let a = 1; ; a++) { try { return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }); } catch (e) { if (a >= 3 || !/ERR_NETWORK_CHANGED|ERR_CONNECTION|ERR_TIMED_OUT|Timeout|ERR_INTERNET/.test(String(e))) throw e; await new Promise((r) => setTimeout(r, 3000 * a)); } } };
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const settle = async (page) => { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(2500); };

const IDS = ['claude-fable-5::high', 'claude-opus-5::high', 'gpt-5.6-sol::medium', 'claude-opus-4.8::xhigh'];
const api = await (await fetch(`${BASE}/api/benchmark-matrix?models=${encodeURIComponent(IDS.join(','))}`)).json();
const matrix = api.matrix;
const rows = matrix?.rows ?? [];
const idx = (needle) => rows.findIndex((r) => r.name.includes(needle));
const valueOf = (modelId, needle) => { const i = idx(needle); return (matrix?.values?.[modelId] ?? []).find(([k]) => k === i)?.[1] ?? null; };
for (const board of ['SWE-rebench, issues 15 May – 1 Jul 2026', 'GSO software optimization, Opt@1']) {
  const r = rows[idx(board)];
  check(`API: ${board} is a Coding row`, r && r.group === 'coding', r ? { name: r.name, group: r.group, cohort: r.cohort, unit: r.unit, tags: r.tags } : 'missing');
}
// SWE-rebench's rendered default table at capture: Fable 5 [high] 64.5 %, Opus 5 [high] 63.4 %, GPT-5.6 Sol [medium] 62.3 %.
check('API: SWE-rebench claude-fable-5::high = 64.5', valueOf('claude-fable-5::high', 'SWE-rebench') === 64.5, String(valueOf('claude-fable-5::high', 'SWE-rebench')));
check('API: SWE-rebench claude-opus-5::high = 63.4', valueOf('claude-opus-5::high', 'SWE-rebench') === 63.4, String(valueOf('claude-opus-5::high', 'SWE-rebench')));
check('API: SWE-rebench gpt-5.6-sol::medium = 62.3', valueOf('gpt-5.6-sol::medium', 'SWE-rebench') === 62.3, String(valueOf('gpt-5.6-sol::medium', 'SWE-rebench')));
check('API: an agent product (Claude Code 60.4) is not published as a model value', !Object.values(matrix?.values ?? {}).flat().some(([k, v]) => k === idx('SWE-rebench') && v === 60.4), '');
// GSO leaderboard.json: Claude Opus 4.8 xhigh Opt@1 47.06; Opt@10 values (15.7, 12.7) are another protocol.
check('API: GSO claude-opus-4.8::xhigh = 47.06', valueOf('claude-opus-4.8::xhigh', 'GSO') === 47.06, String(valueOf('claude-opus-4.8::xhigh', 'GSO')));
check('API: GSO rows carry neither SWE-rebench nor GSO judged tags', !(rows[idx('GSO')]?.tags ?? []).includes('judged') && !(rows[idx('SWE-rebench')]?.tags ?? []).includes('judged'), [rows[idx('GSO')]?.tags, rows[idx('SWE-rebench')]?.tags]);
check('API: catalog board count includes the two new boards (96 before)', (matrix?.catalogBoards ?? 0) >= 98, String(matrix?.catalogBoards));
const gpt = (await (await fetch(`${BASE}/api/benchmark-matrix?models=${encodeURIComponent('gpt-5.4::xhigh,claude-sonnet-5::xhigh')}`)).json()).matrix;
const gi = (gpt?.rows ?? []).findIndex((r) => r.name.includes('GSO'));
const gv = (m) => (gpt?.values?.[m] ?? []).find(([k]) => k === gi)?.[1] ?? null;
check('API: GSO gpt-5.4::xhigh = 31.37 and claude-sonnet-5::xhigh = 37.25', gv('gpt-5.4::xhigh') === 31.37 && gv('claude-sonnet-5::xhigh') === 37.25, { gpt54: gv('gpt-5.4::xhigh'), sonnet5: gv('claude-sonnet-5::xhigh') });
// Provenance: each observation names its source, keeps the window / contamination flag and the run date.
const scores = await (await fetch(`${BASE}/api/benchmark-scores?model_id=${encodeURIComponent('claude-fable-5::high')}&limit=500`)).json();
const obs = (scores.observations ?? scores.results ?? []).find((o) => o.benchmark_id === 'swe-rebench::2026-05-15..2026-07-01');
check('API: the SWE-rebench observation cites swe-rebench.com, is measured, and keeps the window and the contamination flag',
  obs && obs.source?.url === 'https://swe-rebench.com/' && obs.basis === 'measured' && /"window":"2026-05-15\.\.2026-07-01"/.test(obs.protocol ?? '') && /"potential_contamination":true/.test(obs.protocol ?? ''),
  obs ? { url: obs.source?.url, basis: obs.basis } : Object.keys(scores));
const gscores = await (await fetch(`${BASE}/api/benchmark-scores?model_id=${encodeURIComponent('claude-opus-4.8::xhigh')}&limit=500`)).json();
const gobs = (gscores.observations ?? gscores.results ?? []).find((o) => o.benchmark_id === 'gso::opt1-102');
check('API: the GSO observation cites leaderboard.json and keeps the run date and hack-adjusted score',
  gobs && gobs.source?.url === 'https://gso-bench.github.io/assets/leaderboard.json' && /"run_date":"2026-07-12"/.test(gobs.protocol ?? '') && /"score_hack_adjusted":47.06/.test(gobs.protocol ?? ''),
  gobs ? { url: gobs.source?.url, basis: gobs.basis } : Object.keys(gscores));

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
  }, ['SWE-rebench, issues 15 May', 'GSO software optimization']);
  check(`${tag} the new boards render as rows with values on /benchmarks`, seen.every((s) => s.row && /\d/.test(s.row)), JSON.stringify(seen).slice(0, 500));
  const text = await page.evaluate(() => document.body.innerText);
  check(`${tag} the published numbers appear in the table`, /64\.5/.test(text) && /47\.(06|1)\b/.test(text), '');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`${tag} no horizontal page overflow on /benchmarks`, overflow <= 1, String(overflow));
  const target = page.locator('table tr', { hasText: 'SWE-rebench' }).first();
  await target.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${tag}-benchmarks-swe-rebench.png` }).catch(() => {});
  await page.locator('table tr', { hasText: 'GSO software' }).first().scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${tag}-benchmarks-gso.png` }).catch(() => {});
  check(`${tag} no page errors`, !errors.length, errors);
  await context.close();
}
await browser.close();
const passed = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, runner: process.env.BH_RUNNER || 'unspecified', at: new Date().toISOString(), passed, total: checks.length, checks }, null, 2));
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name} — ${String(c.detail).slice(0, 220)}`);
console.log(`${passed}/${checks.length}`);
process.exit(passed === checks.length ? 0 : 1);
