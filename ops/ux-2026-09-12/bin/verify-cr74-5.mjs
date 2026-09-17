// CR-74.5: measure the Advanced Overview toolbar before/after opening "Better than a model ▾" / "Evidence ▾",
// with visible scrollbars, at 1440 and 390 px, light and dark; screenshot the inline Options panel.
// Usage: node verify-cr74-5.mjs <base> <out> <label>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'http://localhost:3414').replace(/\/$/, '');
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/cr74/advanced';
const LABEL = process.argv[4] || 'after';
await fs.mkdir(OUT, { recursive: true });
const b = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
const result = {};
try {
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const mobile = kind === 'mobile', tag = `${LABEL}-${kind}_${theme}`;
  const c = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme, deviceScaleFactor: 1 });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const p = await c.newPage();
  const errors = []; p.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  await p.goto(BASE + '/?view=advanced', { waitUntil: 'domcontentloaded', timeout: 180000 });
  await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
  await p.getByRole('tab', { name: 'Advanced' }).click({ timeout: 180000 });
  await p.waitForSelector('.bh-advanced-toolbar', { timeout: 60000 });
  await p.waitForLoadState('networkidle').catch(() => {});
  await p.waitForTimeout(2500);
  const boxes = () => p.evaluate(() => {
    const tb = document.querySelector('.bh-advanced-toolbar');
    const r = (el) => { if (!el) return null; const x = el.getBoundingClientRect(); return { x: Math.round(x.x * 10) / 10, y: Math.round(x.y * 10) / 10, w: Math.round(x.width * 10) / 10, h: Math.round(x.height * 10) / 10 }; };
    const kids = [...tb.querySelectorAll('input, select, summary, button')].filter((e) => e.getBoundingClientRect().width > 0);
    const table = document.querySelector('table[aria-label="Model ranking"]');
    return { toolbar: r(tb), controls: kids.map(r), table: r(table), docW: document.documentElement.clientWidth, scrollY: window.scrollY };
  });
  const entry = { errors };
  if (!mobile) {
    await p.evaluate(() => document.querySelector('.bh-advanced-toolbar').scrollIntoView({ block: 'start' }));
    await p.waitForTimeout(300);
    const before = await boxes();
    entry.closed = before;
    for (const name of ['Better than', 'Evidence']) {
      const summary = p.locator('.bh-advanced-toolbar summary', { hasText: name }).first();
      if (!(await summary.count())) { entry[name] = 'missing'; continue; }
      await summary.click(); await p.waitForTimeout(400);
      const open = await boxes();
      const maxShift = Math.max(Math.abs(open.toolbar.y - before.toolbar.y), Math.abs(open.toolbar.h - before.toolbar.h), Math.abs((open.table?.y ?? 0) - (before.table?.y ?? 0)),
        ...open.controls.map((cb, i) => before.controls[i] ? Math.max(Math.abs(cb.x - before.controls[i].x), Math.abs(cb.y - before.controls[i].y), Math.abs(cb.w - before.controls[i].w), Math.abs(cb.h - before.controls[i].h)) : 0));
      entry[name] = { maxShiftPx: maxShift, toolbarBefore: before.toolbar, toolbarOpen: open.toolbar, tableYBefore: before.table?.y, tableYOpen: open.table?.y, docWBefore: before.docW, docWOpen: open.docW };
      await p.screenshot({ path: `${OUT}/${tag}-${name.split(' ')[0].toLowerCase()}-open.png` });
      await p.keyboard.press('Escape'); await p.waitForTimeout(300);
      entry[name].closedByEscape = await p.evaluate((n) => ![...document.querySelectorAll('.bh-advanced-toolbar details')].find((d) => d.querySelector('summary')?.textContent.includes(n))?.open, name);
      if (!entry[name].closedByEscape) { await summary.click(); await p.waitForTimeout(200); }
    }
    // outside click closes
    const ev = p.locator('.bh-advanced-toolbar summary', { hasText: 'Evidence' }).first();
    await ev.click(); await p.waitForTimeout(200); await p.mouse.click(5, 700); await p.waitForTimeout(200);
    entry.outsideClickCloses = await p.evaluate(() => ![...document.querySelectorAll('.bh-advanced-toolbar details')].some((d) => d.open));
  }
  entry.inlineOptions = await p.evaluate(() => { const el = document.querySelector('[data-bh-options-inline]'); if (!el) return null; const r = el.getBoundingClientRect(); return { y: Math.round(r.y), h: Math.round(r.height), w: Math.round(r.width), overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth }; });
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(200);
  await p.screenshot({ path: `${OUT}/${tag}-top.png`, fullPage: false });
  if (mobile && entry.inlineOptions) { await p.locator('[data-bh-options-inline] > summary').click(); await p.waitForTimeout(500); entry.inlineOptionsExpanded = await p.evaluate(() => { const el = document.querySelector('[data-bh-options-inline]'); const r = el.getBoundingClientRect(); return { open: el.open, h: Math.round(r.height), overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth }; }); }
  if (entry.inlineOptions) { await p.locator('[data-bh-options-inline]').screenshot({ path: `${OUT}/${tag}-options-inline.png` }).catch((e) => { entry.shotErr = String(e).slice(0, 100); }); }
  result[tag] = entry;
  await c.close();
}
} finally { await b.close(); }
await fs.writeFile(`${OUT}/${LABEL}-measurements.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, (k, v) => (k === 'controls' ? undefined : v), 1));
