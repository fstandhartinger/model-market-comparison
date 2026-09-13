import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const [BASE, OUT] = process.argv.slice(2); const fs = await import('node:fs/promises');
const b = await chromium.launch(); const res = {};
for (const [w, h, m] of [[1440, 1000, false], [390, 844, true]]) {
  const p = await (await b.newContext({ viewport: { width: w, height: h }, isMobile: m })).newPage(); const r = {};
  await p.goto(BASE + '/scatter', { waitUntil: 'networkidle' });
  const geo = await p.evaluate(() => {
    const svg = [...document.querySelectorAll('svg.recharts-surface')].sort((a, b) => b.getBoundingClientRect().height - a.getBoundingClientRect().height)[0];
    const grid = svg.querySelector('.recharts-cartesian-grid')?.getBoundingClientRect() || svg.getBoundingClientRect();
    const pts = [...svg.querySelectorAll('.recharts-scatter-symbol circle, .recharts-scatter-symbol rect')].map((c) => { const bb = c.getBoundingClientRect(); return bb.top + bb.height / 2; });
    const ticks = [...svg.querySelectorAll('.recharts-yAxis .recharts-cartesian-axis-tick-value')].map((t) => t.textContent);
    return { plotH: Math.round(grid.height), n: pts.length, spread: pts.length ? Math.round(Math.max(...pts) - Math.min(...pts)) : 0, yTicks: ticks };
  });
  r.scatter = { ...geo, fraction: geo.plotH ? +(geo.spread / geo.plotH).toFixed(2) : null };
  r.intro = (await p.locator('h1 + p').innerText()).replace(/\s+/g, ' ');
  r.scrollWidthScatter = await p.evaluate(() => document.documentElement.scrollWidth);
  await p.screenshot({ path: `${OUT}/scatter-${w}.png` });
  await p.goto(BASE + '/', { waitUntil: 'networkidle' });
  r.valueMap = await p.evaluate(() => {
    const map = document.querySelector('.bh-value-map svg.recharts-surface'); if (!map) return null;
    const halos = [...map.querySelectorAll('circle')].filter((c) => c.getAttribute('r') === '9').length;
    const dots = [...map.querySelectorAll('circle')].filter((c) => ['4', '5'].includes(c.getAttribute('r'))).length;
    return { halos, dots };
  });
  await p.screenshot({ path: `${OUT}/home-${w}.png` });
  await p.locator('[role=tab]:has-text("Guided")').first().click();
  for (let i = 0; i < 5; i++) { const nx = p.locator('button:visible', { hasText: /^(Next|Skip|See results|Show results)/ }).first(); if (!(await nx.count())) break; await nx.click(); await p.waitForTimeout(300); }
  r.wizardPrimary = await p.locator('button:has-text("Change answers")').first().evaluate((e) => getComputedStyle(e).backgroundColor).catch(() => null);
  r.wizardAdvancedIsLink = await p.locator('button:has-text("Open in Advanced")').first().evaluate((e) => getComputedStyle(e).borderTopWidth).catch(() => null);
  r.wizardMap = await p.locator('.bh-value-map').count();
  await p.screenshot({ path: `${OUT}/wizard-results-${w}.png` });
  res[w] = r;
}
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify(res, null, 2)); console.log(JSON.stringify(res, null, 1)); await b.close();
