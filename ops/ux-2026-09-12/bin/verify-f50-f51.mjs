// F-50 (Benchmaxxing right column) and F-51 (radar axes inside the radar card) live acceptance.
// Usage: node verify-f50-f51.mjs <base-url> <evidence-dir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE = process.argv[2] || 'https://benchmarkheaven.com';
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/iter34-f50-f51';
await fs.mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const result = { base: BASE, at: new Date().toISOString(), checks: [] };
const check = (name, ok, detail) => result.checks.push({ name, ok, detail });

for (const [label, viewport, isMobile, maxHeight] of [
  ['desktop', { width: 1440, height: 1000 }, false, 3900],
  ['phone', { width: 390, height: 844 }, true, 5200],
]) {
  for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({ viewport, isMobile, colorScheme: theme });
    const page = await context.newPage();
    const tag = `${label}-${theme}`;

    // F-51
    await page.goto(`${BASE}/compare`, { waitUntil: 'networkidle' });
    await page.evaluate((value) => document.documentElement.setAttribute('data-theme', value), theme);
    await page.waitForTimeout(600);
    const compare = await page.evaluate(() => {
      const picker = document.querySelector('[aria-label="Model selection"]');
      const strongest = document.querySelector('[aria-label="Benchmark category snapshots"]');
      const panels = [...document.querySelectorAll('.bh-panel')].filter((p) => !p.parentElement?.closest('.bh-panel'));
      const between = panels.filter((p) => picker && strongest
        && (picker.compareDocumentPosition(p) & Node.DOCUMENT_POSITION_FOLLOWING)
        && (p.compareDocumentPosition(strongest) & Node.DOCUMENT_POSITION_FOLLOWING));
      const summary = [...document.querySelectorAll('summary')].find((s) => /^Radar axes · \d+ \/ 8 selected$/.test(s.textContent.trim()));
      const card = summary?.closest('.bh-panel');
      const summaries = card ? [...card.querySelectorAll('summary')].map((s) => s.textContent.trim()) : [];
      return {
        between: between.length,
        summary: summary?.textContent.trim() || null,
        insideRadarCard: Boolean(card && card === between[0]),
        order: summaries,
        pageHeight: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
        overflow: document.documentElement.scrollWidth > window.innerWidth,
      };
    });
    check(`${tag} compare: one panel between picker and strongest`, compare.between === 1, compare.between);
    check(`${tag} compare: radar axes summary inside radar card`, compare.insideRadarCard, compare.summary);
    const iExact = compare.order.indexOf('Show exact radar values');
    const iAxes = compare.order.findIndex((s) => s.startsWith('Radar axes'));
    const iRead = compare.order.indexOf('How to read this chart');
    check(`${tag} compare: order exact values → axes → how to read`, iAxes > -1 && iRead > iAxes && (iExact === -1 || iExact < iAxes), compare.order);
    check(`${tag} compare: height ≤ ${maxHeight}`, compare.pageHeight <= maxHeight, compare.pageHeight);
    check(`${tag} compare: no overflow`, !compare.overflow, compare.overflow);

    // Toggling an axis re-draws the radar.
    await page.locator('summary', { hasText: /^Radar axes/ }).first().click();
    const before = await page.$$eval('#benchmark-radar svg line, #benchmark-radar svg polygon, #benchmark-radar svg path', (n) => n.length);
    const box = page.locator('#benchmark-radar input[type="checkbox"]:checked').first();
    const hasBox = await box.count();
    if (hasBox) {
      await box.uncheck();
      await page.waitForTimeout(400);
      const after = await page.$$eval('#benchmark-radar svg line, #benchmark-radar svg polygon, #benchmark-radar svg path', (n) => n.length);
      const summaryAfter = await page.locator('summary', { hasText: /^Radar axes/ }).first().textContent();
      check(`${tag} compare: axis toggle re-draws radar`, after !== before && /· \d+ \/ 8/.test(summaryAfter), { before, after, summaryAfter });
    } else check(`${tag} compare: axis checkbox inside radar card`, false, 'no checked checkbox inside #benchmark-radar');
    await page.screenshot({ path: path.join(OUT, `${tag}-compare.png`), fullPage: true });

    // F-50
    await page.goto(`${BASE}/benchmaxxing`, { waitUntil: 'networkidle' });
    await page.evaluate((value) => document.documentElement.setAttribute('data-theme', value), theme);
    await page.waitForTimeout(1500);
    const bm = await page.evaluate(() => {
      const summary = [...document.querySelectorAll('summary')].find((s) => s.textContent.trim() === 'Advanced details: topic groups and method');
      const details = summary?.parentElement;
      const aside = [...document.querySelectorAll('aside')].find((a) => /Benchmaxxing signal/i.test(a.textContent));
      const radar = aside?.closest('.grid')?.firstElementChild?.querySelector('svg');
      const r = (n) => n ? n.getBoundingClientRect() : null;
      const [d, a, s] = [r(details), r(aside), r(radar)];
      return {
        found: Boolean(details && aside && radar),
        sameColumn: Boolean(details && aside && details.parentElement === aside.parentElement),
        detailsBelowAside: d && a ? d.top >= a.bottom - 1 : null,
        besideRadar: d && s ? d.left > s.right : null,
        radarBottom: s ? Math.round(s.bottom) : null,
        columnBottom: d ? Math.round(Math.max(d.bottom, a.bottom)) : null,
        radarTop: s ? Math.round(s.top) : null,
        asideTop: a ? Math.round(a.top) : null,
        overflow: document.documentElement.scrollWidth > window.innerWidth,
      };
    });
    check(`${tag} benchmaxxing: report elements found`, bm.found, bm);
    check(`${tag} benchmaxxing: disclosure directly under signal card`, bm.sameColumn && bm.detailsBelowAside, bm);
    if (label === 'desktop') {
      check(`${tag} benchmaxxing: disclosure in right column`, bm.besideRadar === true, bm);
      check(`${tag} benchmaxxing: column bottom within 120 px of radar bottom`, Math.abs(bm.columnBottom - bm.radarBottom) <= 120, { radarBottom: bm.radarBottom, columnBottom: bm.columnBottom });
    } else {
      check(`${tag} benchmaxxing: radar → card → disclosure stacked`, bm.besideRadar === false && bm.asideTop > bm.radarTop, bm);
    }
    check(`${tag} benchmaxxing: no overflow`, !bm.overflow, bm.overflow);
    await page.screenshot({ path: path.join(OUT, `${tag}-benchmaxxing.png`), fullPage: true });
    await context.close();
  }
}

await browser.close();
result.failures = result.checks.filter((c) => !c.ok).length;
await fs.writeFile(path.join(OUT, 'verification.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify({ base: BASE, checks: result.checks.length, failures: result.failures, failed: result.checks.filter((c) => !c.ok) }, null, 2));
