// CR-28.1: the start page's benchmark table lists every benchmark its models have, not only the headline rows.
// API checks plus UI at 1440/390, light/dark. Usage: node verify-cr-28-1.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-28-1';
await fs.mkdir(OUT, { recursive: true });
const goto = async (page, url) => { for (let a = 1; ; a++) { try { return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }); } catch (e) { if (a >= 3 || !/ERR_NETWORK_CHANGED|ERR_CONNECTION|ERR_TIMED_OUT|Timeout|ERR_INTERNET/.test(String(e))) throw e; await new Promise((r) => setTimeout(r, 3000 * a)); } } };
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const settle = async (page) => { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(2500); };

// API: rejects an empty request; rows only for the requested models; catalog size reported.
const bad = await fetch(`${BASE}/api/benchmark-matrix`);
check('CR-28.1 API rejects a request without models (400)', bad.status === 400, String(bad.status));
const ids = ['claude-fable-5.1::high', 'gpt-6-astra::high'];
const api = await (await fetch(`${BASE}/api/benchmark-matrix?models=${encodeURIComponent(ids.join(','))}`)).json();
const m = api.matrix;
const keys = Object.keys(m?.values ?? {});
check('CR-28.1 API returns values only for the requested models, rows re-indexed, catalog size reported',
  m && keys.every((k) => ids.includes(k)) && m.rows.length > 22 && m.catalogRows >= m.rows.length && Object.values(m.values).flat().every(([i]) => i >= 0 && i < m.rows.length),
  { rows: m?.rows.length, catalogRows: m?.catalogRows, keys });

const browser = await chromium.launch();
for (const theme of ['light', 'dark']) for (const [kind, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const tag = `${kind}_${theme}`, mobile = kind === 'mobile';
  const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, colorScheme: theme });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  await goto(page, `${BASE}/`);
  await page.evaluate((t) => { try { localStorage.clear(); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  await page.reload().catch(async () => { await new Promise((r) => setTimeout(r, 3000)); await page.reload(); }); await settle(page);
  await page.locator('#benchmarks').scrollIntoViewIfNeeded();
  await page.locator('[data-catalog-count]').waitFor({ timeout: 15000 }).catch(() => {});
  const info = await page.evaluate(() => ({
    rows: [...document.querySelectorAll('#benchmarks tbody tr')].filter((tr) => !tr.classList.contains('bh-matrix-hero') && !tr.classList.contains('bh-matrix-group')).length,
    shown: Number(document.querySelector('[data-bench-count]')?.textContent), catalog: Number(document.querySelector('[data-catalog-count]')?.textContent),
    groups: document.querySelectorAll('#benchmarks tr.bh-matrix-group').length,
    // F-102: a benchmark is a board (family + version); harness cohorts and cost twins are rows of it.
    boards: new Set([...document.querySelectorAll('#benchmarks tbody tr[data-board]')].map((tr) => tr.getAttribute('data-board'))).size,
    sentence: document.querySelector('[data-bench-count]')?.closest('p')?.innerText.replace(/\s+/g, ' ').trim() ?? '',
  }));
  check(`${tag} CR-28.1 the table lists every benchmark its models have (more than the 22 headline rows), count stated honestly`,
    info.rows > 22 && info.rows >= info.shown && info.catalog >= info.shown && info.groups >= 5, info);
  // F-102: the published number is the board count of the very rows on screen, and the sentence counts
  // benchmarks, never "benchmark results".
  check(`${tag} F-102 the count is the board count of the rows shown, out of the same catalog count`,
    info.shown === info.boards && info.catalog >= info.boards && /benchmarks we track/.test(info.sentence) && !/benchmark results/.test(info.sentence),
    JSON.stringify(info));
  await page.locator('#benchmarks .bh-matrix-wrap').screenshot({ path: `${OUT}/${tag}-all-benchmarks.png` }).catch(() => {});
  check(`${tag} no page errors`, !errors.length, errors);
  await context.close();
}
await browser.close();
const passed = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, runner: process.env.BH_RUNNER || 'unspecified', at: new Date().toISOString(), passed, total: checks.length, checks }, null, 2));
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name} — ${c.detail.slice(0, 220)}`);
console.log(`${passed}/${checks.length}`);
process.exit(passed === checks.length ? 0 : 1);
