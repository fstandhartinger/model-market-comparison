import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const BASE = process.argv[2]; const OUT = process.argv[3];
const fs = await import('node:fs/promises');
const b = await chromium.launch(); const res = {};
for (const [name, vp, mobile] of [['desktop', { width: 1440, height: 1000 }, false], ['mobile', { width: 390, height: 844 }, true]]) {
  const ctx = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile });
  const p = await ctx.newPage(); const r = {};
  await p.goto(BASE + '/', { waitUntil: 'networkidle' });
  const det = p.locator('details[aria-label="Subscriptions"]').first();
  r.panels = await p.locator('details[aria-label="Subscriptions"]').count();
  await det.locator('summary').click();
  r.summary = (await det.locator('summary').innerText()).replace(/\s+/g, ' ');
  r.items = await det.locator('li').count();
  r.text = (await det.innerText()).replace(/\s+/g, ' ').slice(0, 900);
  r.breakEvenLines = (r.text.match(/Beats the API above/g) || []).length;
  r.hasClaudePro = r.text.includes('Claude Pro');
  await det.scrollIntoViewIfNeeded();
  await p.screenshot({ path: `${OUT}/${name}-individual.png` });
  r.scrollWidth = await p.evaluate(() => document.documentElement.scrollWidth);
  // company toggle through the real filter sheet
  const filters = p.locator('button:has-text("Filters"):visible').first();
  r.filtersBtn = await filters.count(); if (r.filtersBtn) { await filters.click(); await p.waitForTimeout(600); }
  const tog = p.locator('button:has-text("buying for a company"):visible').first();
  r.toggleFound = await tog.count();
  if (r.toggleFound) { await tog.click(); r.togglePressed = await tog.getAttribute('aria-pressed'); if (r.filtersBtn) await filters.click(); }
  await p.waitForTimeout(500);
  const t2 = (await det.innerText()).replace(/\s+/g, ' ');
  r.companySummary = (await det.locator('summary').innerText()).replace(/\s+/g, ' ');
  r.companyHasClaudePro = /Claude Pro\b/.test(t2); r.companyHasTeam = t2.includes('Claude Team');
  r.companyHiddenNote = (t2.match(/\d+ consumer plans are hidden[^.]*\./) || [null])[0];
  await det.scrollIntoViewIfNeeded();
  await p.screenshot({ path: `${OUT}/${name}-company.png` });
  r.scrollWidthCompany = await p.evaluate(() => document.documentElement.scrollWidth);
  res[name] = r; await ctx.close();
}
const about = await (await fetch(BASE + '/about')).text();
res.aboutAnchor = about.includes('id="subscriptions"');
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify(res, null, 2));
console.log(JSON.stringify(res, null, 2));
await b.close();
