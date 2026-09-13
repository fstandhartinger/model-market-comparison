// Independent live check of Codex-implemented R4.10, R5.8, R5.11 and F-19.
// Usage: node verify-r410-r58-r511-f19.mjs <base-url> <evidence-dir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE = process.argv[2] || 'https://benchmarkheaven.com';
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/iter34-indep';
await fs.mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const result = { base: BASE, at: new Date().toISOString(), checks: [] };
const check = (name, ok, detail) => result.checks.push({ name, ok, detail });

const openAdvanced = async (page) => {
  await page.getByRole('tab', { name: /advanced/i }).or(page.getByRole('button', { name: /^advanced$/i })).first().click();
  await page.waitForTimeout(900);
};
const tableSnapshot = (page) => page.$$eval('table tbody tr', (rows) => ({
  rows: rows.length,
  text: rows.slice(0, 40).map((r) => r.textContent.replace(/\s+/g, ' ').trim()).join('|'),
}));

for (const [label, viewport, isMobile] of [
  ['desktop', { width: 1440, height: 1000 }, false],
  ['phone', { width: 390, height: 844 }, true],
]) {
  const context = await browser.newContext({ viewport, isMobile, hasTouch: isMobile });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  // R4.10 — default off; switching it on widens the provider pool and changes the table.
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await openAdvanced(page);
  const before = await tableSnapshot(page);
  await page.locator('header button[aria-controls="global-filters"]').first().click();
  await page.waitForTimeout(400);
  const panel = page.locator('#global-filters');
  await panel.locator('details > summary', { hasText: 'More settings' }).click().catch(() => {});
  await page.waitForTimeout(200);
  const toggle = panel.getByRole('button', { name: /Trains or keeps your data/ }).first();
  const pressedDefault = await toggle.getAttribute('aria-pressed');
  check(`${label} R4.10 toggle off by default`, pressedDefault === 'false', pressedDefault);
  await toggle.click();
  await page.waitForTimeout(900);
  const pressedAfter = await toggle.getAttribute('aria-pressed');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);
  const after = await tableSnapshot(page);
  check(`${label} R4.10 toggle switches on`, pressedAfter === 'true', pressedAfter);
  check(`${label} R4.10 table changes when training/retaining providers are allowed`, before.text !== after.text || before.rows !== after.rows, { rowsBefore: before.rows, rowsAfter: after.rows });
  await page.screenshot({ path: path.join(OUT, `${label}-r410-after.png`) });
  await page.evaluate(() => localStorage.clear());

  // R5.8 — (i) on the Simple cost slider explains provider prices, caching and token efficiency.
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const costTip = page.locator('button[aria-label*="cost" i]').filter({ hasNot: page.locator('th *') }).first();
  let tipText = '';
  if (await costTip.count()) {
    if (isMobile) await costTip.tap(); else await costTip.hover();
    await page.waitForTimeout(500);
    tipText = await page.locator(isMobile ? 'dialog[open]' : '[role="tooltip"]:visible').allTextContents().then((t) => t.join(' '));
    await page.screenshot({ path: path.join(OUT, `${label}-r58-tip.png`) });
    if (isMobile) {
      await page.locator('dialog[open] button[aria-label="Close"]').first().click();
      await page.waitForTimeout(300);
      check(`${label} R5.8 modal closes with ✕`, await page.locator('dialog[open]').count() === 0, null);
    }
  }
  check(`${label} R5.8 cost (i) names providers/prices`, /provider/i.test(tipText) && /price/i.test(tipText), tipText.slice(0, 300));
  check(`${label} R5.8 cost (i) names caching`, /cach/i.test(tipText), null);
  check(`${label} R5.8 cost (i) names token efficiency`, /token/i.test(tipText), null);

  // R5.11 — header tooltips render above the table and stay inside the viewport (desktop hover).
  if (!isMobile) {
    for (const name of [/score/i, /cost/i]) {
      await page.mouse.move(5, 5);
      await page.waitForTimeout(250);
      const th = page.locator('thead th').filter({ hasText: name }).first();
      const btn = th.locator('button[aria-label]').last();
      await btn.hover();
      await page.waitForTimeout(500);
      const tip = await page.evaluate(() => {
        const t = [...document.querySelectorAll('[role="tooltip"]')].find((n) => n.getBoundingClientRect().height > 0);
        if (!t) return null;
        const r = t.getBoundingClientRect();
        const cx = Math.min(Math.max(r.left + 12, 0), innerWidth - 1), cy = Math.min(Math.max(r.top + 12, 0), innerHeight - 1);
        // The tooltip is pointer-events:none by design; hit-testing would skip it otherwise.
        t.style.pointerEvents = 'auto';
        const topEl = document.elementFromPoint(cx, cy);
        t.style.pointerEvents = '';
        return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, onTop: Boolean(topEl && t.contains(topEl)), vh: innerHeight, vw: innerWidth };
      });
      check(`${label} R5.11 ${name} header tooltip visible and on top`, Boolean(tip && tip.onTop), tip);
      check(`${label} R5.11 ${name} header tooltip inside viewport`, Boolean(tip && tip.top >= 0 && tip.bottom <= tip.vh && tip.left >= 0 && tip.right <= tip.vw), tip);
    }
    await page.screenshot({ path: path.join(OUT, `${label}-r511-tip.png`) });
  }

  // F-19 — Benchmaxxing title, 10 default signal rows, show-all control, no overflow.
  await page.goto(`${BASE}/benchmaxxing`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const bm = await page.evaluate(() => ({
    h1: document.querySelector('h1')?.textContent.trim(),
    firstTableRows: document.querySelector('table tbody')?.querySelectorAll('tr').length || 0,
    showAll: [...document.querySelectorAll('button')].map((b) => b.textContent.trim()).find((t) => /^Show all \d+ tagged/.test(t)) || null,
    overflow: document.documentElement.scrollWidth > innerWidth,
  }));
  check(`${label} F-19 H1 "Benchmaxxing"`, bm.h1 === 'Benchmaxxing', bm.h1);
  check(`${label} F-19 10 default signal rows`, bm.firstTableRows === 10, bm.firstTableRows);
  check(`${label} F-19 show-all tagged control`, Boolean(bm.showAll), bm.showAll);
  check(`${label} F-19 no overflow`, !bm.overflow, bm.overflow);
  check(`${label} no page errors`, errors.length === 0, errors.slice(0, 3));
  await context.close();
}

await browser.close();
result.failures = result.checks.filter((c) => !c.ok).length;
await fs.writeFile(path.join(OUT, 'verification.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify({ base: BASE, checks: result.checks.length, failures: result.failures, failed: result.checks.filter((c) => !c.ok) }, null, 2));
