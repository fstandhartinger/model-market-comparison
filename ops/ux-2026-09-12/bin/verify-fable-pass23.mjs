// Fable pass-23 verifier — F-123: no data bar and no bold behind a chart-read (‡, preliminary) value on /benchmarks.
// 8 checks per host: for 1440/390 × light/dark, on Union Alpha's Terminal-Bench v4.0 (AA) row (one measured value + one ‡),
// (a) the row has zero `.bh-matrix-bar` (before F-123: two, "100%"/"99.96%"), (b) the ‡ cell is not bold.
// Usage: node verify-fable-pass23.mjs <base> <out>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/fable-20260918-pass23/verify';
await fs.mkdir(OUT, { recursive: true });
const SEL = 'claude-fable-5.1::high,gpt-6-astra::default,union-alpha::default';
const b = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
const results = { base: BASE, at: new Date().toISOString(), revision: null, checks: [] };
try { results.revision = (await (await fetch(`${BASE}/api/meta`)).json()).revision; } catch {}
const check = (name, ok, detail) => { results.checks.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${JSON.stringify(detail).slice(0, 200)}`); };
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const mobile = kind === 'mobile';
  const c = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme, deviceScaleFactor: mobile ? 2 : 1 });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const p = await c.newPage(); const tag = `${kind}_${theme}`; const errors = [];
  p.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  await p.goto(`${BASE}/benchmarks?rows=all&models=${encodeURIComponent(SEL)}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
  await p.waitForFunction(() => !document.querySelector('.bh-deferred'), null, { timeout: 90000 }).catch(() => {});
  await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(1200);
  const sup = p.locator('main table sup').filter({ hasText: '‡' }).first();
  const found = await sup.count();
  const row = found ? sup.locator('xpath=ancestor::tr[1]') : null;
  const geom = found ? await row.evaluate((tr) => ({ name: tr.querySelector('th')?.innerText.replace(/\s+/g, ' ').slice(0, 40), bars: [...tr.querySelectorAll('.bh-matrix-bar')].map((x) => x.style.width), prelimBold: !!tr.querySelector('sup')?.closest('.font-bold'), bold: [...tr.querySelectorAll('td .font-bold')].length, cells: [...tr.querySelectorAll('td')].map((td) => td.innerText.replace(/\s+/g, ' ').trim().slice(0, 12)) })) : null;
  if (found) { await row.first().scrollIntoViewIfNeeded(); await p.waitForTimeout(300); await row.first().screenshot({ path: `${OUT}/${tag}-prelim-row.png` }).catch(() => {}); }
  check(`${tag}: chart-read row has no data bar`, geom && geom.bars.length === 0, { found, ...geom, errors });
  check(`${tag}: chart-read cell is not bold`, geom && !geom.prelimBold, { found, prelimBold: geom?.prelimBold, bold: geom?.bold });
  await c.close();
}
await b.close();
const pass = results.checks.filter((c) => c.ok).length;
results.summary = `${pass}/${results.checks.length}`;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify(results, null, 1));
console.log(`SUMMARY ${results.summary} at ${results.revision} (${BASE})`);
process.exit(pass === results.checks.length ? 0 : 1);
