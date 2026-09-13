// Fable pass-3 screenshots + metrics: Simple, Advanced, Guided wizard, Benchmaxxing, model page.
// Desktop 1440×1000 and mobile 390×844, light and dark.
// Usage: node verify-fable-pass3.mjs <base-url> <out-dir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = process.argv[2] || 'https://benchmarkheaven.com';
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/fable-20260913-pass3';
await fs.mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const out = { base: BASE, checked_at: new Date().toISOString(), errors: [] };
const safe = async (k, fn) => { try { await fn(); } catch (e) { out.errors.push(`${k}: ${String(e).split('\n')[0].slice(0, 200)}`); } };
const setTheme = (p, t) => p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), t);
const pageMetrics = () => {
  const row = document.querySelector('table.dtable tbody tr');
  const ths = [...document.querySelectorAll('table.dtable thead th')].filter((th) => th.getBoundingClientRect().width > 0);
  const overflow = [...document.querySelectorAll('body *')].filter((el) => { const r = el.getBoundingClientRect(); return r.right > window.innerWidth + 1 && r.width > 0; }).slice(0, 8).map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].slice(0,3).join('.')} right=${Math.round(el.getBoundingClientRect().right)}`);
  const h1 = document.querySelector('h1');
  return {
    firstRowTop: row ? Math.round(row.getBoundingClientRect().top) : null,
    rowsVisible: [...document.querySelectorAll('table.dtable tbody tr')].filter((r) => r.getBoundingClientRect().bottom <= window.innerHeight).length,
    rows: document.querySelectorAll('table.dtable tbody tr').length,
    visibleHeaders: ths.map((th) => th.innerText.replace(/\s+/g, ' ').trim()),
    scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight,
    h1: h1 ? h1.innerText.trim() : null,
    overflow,
    textLen: document.body.innerText.length,
    words: document.body.innerText.split(/\s+/).length,
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
    const go = async (path) => { await p.goto(BASE + path, { waitUntil: 'networkidle' }); await setTheme(p, theme); await p.waitForTimeout(900); };
    await safe(`${k}/simple`, async () => { await go('/'); o.simple = await p.evaluate(pageMetrics); await shot('simple'); await shot('simple', true); });
    await safe(`${k}/advanced`, async () => { await p.getByRole('tab', { name: 'Advanced' }).click(); await p.waitForTimeout(1200); o.advanced = await p.evaluate(pageMetrics); await shot('advanced'); await shot('advanced', true); });
    await safe(`${k}/advanced-expanded`, async () => { await p.locator('table.dtable tbody tr').first().click(); await p.waitForTimeout(600); await shot('advanced-row-expanded'); });
    await safe(`${k}/guided`, async () => {
      await go('/'); await p.getByRole('tab', { name: /Guided|Wizard|Assistant/i }).click(); await p.waitForTimeout(900);
      o.guided = await p.evaluate(pageMetrics); await shot('guided-1'); await shot('guided-1', true);
      for (let s = 2; s <= 5; s++) {
        const btn = p.getByRole('button', { name: /^(Next|Continue|See results|Show results|Results)/i }).first();
        if (await btn.count()) { await btn.click(); await p.waitForTimeout(700); await shot(`guided-${s}`); if (s === 5) { await shot(`guided-${s}`, true); o.guidedResults = await p.evaluate(pageMetrics); } }
      }
    });
    await safe(`${k}/filters`, async () => { await go('/'); const b = p.getByRole('button', { name: /^Filters/i }).first(); await b.click(); await p.waitForTimeout(700); await shot('filters'); await shot('filters', true); });
    await safe(`${k}/benchmaxxing`, async () => { await go('/benchmaxxing'); o.benchmaxxing = await p.evaluate(pageMetrics); await shot('benchmaxxing'); await shot('benchmaxxing', true); });
    await safe(`${k}/model`, async () => { await go('/models/claude-opus-5%3A%3Ahigh'); o.model = await p.evaluate(pageMetrics); await shot('model'); await shot('model', true); });
    await safe(`${k}/benchmarks`, async () => { await go('/benchmarks'); o.benchmarks = await p.evaluate(pageMetrics); await shot('benchmarks'); });
    await safe(`${k}/charts`, async () => { await go('/charts'); o.charts = await p.evaluate(pageMetrics); await shot('charts'); });
    await c.close();
  }
}
await browser.close();
await fs.writeFile(`${OUT}/metrics.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
