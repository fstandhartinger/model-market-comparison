// Fable pass-2 acceptance checks (F-13, F-14, F-15, F-17, F-20) at desktop 1440×1000 and
// mobile 390×844, light and dark. Usage: node verify-fable-pass2.mjs <base-url> <out-dir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = process.argv[2] || 'http://127.0.0.1:3210';
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/fable-20260913-pass2/local';
await fs.mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const out = { base: BASE, checked_at: new Date().toISOString(), errors: [] };
const safe = async (k, fn) => { try { await fn(); } catch (e) { out.errors.push(`${k}: ${String(e).split('\n')[0].slice(0, 200)}`); } };
const setTheme = (p, t) => p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), t);

const homeMetrics = () => {
  const row = document.querySelector('table.dtable tbody tr');
  const ths = [...document.querySelectorAll('table.dtable thead th')].filter((th) => th.getBoundingClientRect().width > 0);
  const firstCells = row ? [...row.querySelectorAll('td')].filter((td) => td.getBoundingClientRect().width > 0).map((td) => td.innerText.replace(/\s+/g, ' ').trim()) : [];
  const header = document.querySelector('header');
  const themeBtn = document.querySelector('header button[aria-label*="theme" i]');
  const map = document.querySelector('.bh-value-map, [data-bh-value-map]') || [...document.querySelectorAll('.recharts-responsive-container')][0];
  const labels = [...document.querySelectorAll('.recharts-wrapper text, .recharts-wrapper .bh-point-label')].map((t) => t.getBoundingClientRect()).filter((b) => b.width > 0);
  let overlaps = 0;
  for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) {
    const a = labels[i], b = labels[j];
    if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) overlaps++;
  }
  const yTicks = [...document.querySelectorAll('.recharts-yAxis .recharts-cartesian-axis-tick-value')].map((t) => t.textContent.trim());
  return {
    firstRowTop: row ? Math.round(row.getBoundingClientRect().top) : null,
    rowsVisible: [...document.querySelectorAll('table.dtable tbody tr')].filter((r) => r.getBoundingClientRect().bottom <= window.innerHeight).length,
    rows: document.querySelectorAll('table.dtable tbody tr').length,
    visibleHeaders: ths.map((th) => th.innerText.replace(/\s+/g, ' ').trim()),
    firstRowCells: firstCells,
    scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth,
    headerHeight: header ? Math.round(header.getBoundingClientRect().height) : null,
    headerText: header ? header.innerText.replace(/\s+/g, ' ').trim() : null,
    themeBtn: themeBtn ? { w: Math.round(themeBtn.getBoundingClientRect().width), h: Math.round(themeBtn.getBoundingClientRect().height), text: themeBtn.innerText.trim() } : null,
    mapHeight: map ? Math.round(map.getBoundingClientRect().height) : null,
    labelCount: labels.length, labelOverlaps: overlaps, yTicks,
    starsInTable: document.querySelectorAll('table.dtable tbody td span[title="Featured model"]').length,
  };
};

for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  for (const theme of ['light', 'dark']) {
    const mobile = kind === 'mobile';
    const c = await browser.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme });
    await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
    const p = await c.newPage();
    p.on('pageerror', (e) => out.errors.push(`${kind}/${theme} pageerror: ${String(e).slice(0, 200)}`));
    const k = `${kind}_${theme}`; const o = (out[k] = {});
    const shot = (n, full = false) => p.screenshot({ path: `${OUT}/${k}-${n}${full ? '-full' : ''}.png`, fullPage: full });
    await safe(`${k}/simple`, async () => {
      await p.goto(BASE, { waitUntil: 'networkidle' }); await setTheme(p, theme); await p.waitForTimeout(900);
      o.simple = await p.evaluate(homeMetrics); await shot('simple'); await shot('simple', true);
    });
    await safe(`${k}/advanced`, async () => {
      await p.getByRole('tab', { name: 'Advanced' }).click(); await p.waitForTimeout(1000);
      o.advanced = await p.evaluate(homeMetrics); await shot('advanced'); await shot('advanced', true);
    });
    await safe(`${k}/charts`, async () => {
      await p.goto(BASE + '/charts', { waitUntil: 'networkidle' }); await setTheme(p, theme); await p.waitForTimeout(900);
      const body = await p.evaluate(() => document.body.innerText);
      o.charts = { hasFixedInputs: /fixed inputs/i.test(body), hasCodingAgentV: /Coding Agent v1/i.test(body), intro: await p.locator('h1 + p').first().innerText().catch(() => null) };
      await shot('charts');
    });
    await c.close();
  }
}
await browser.close();
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
