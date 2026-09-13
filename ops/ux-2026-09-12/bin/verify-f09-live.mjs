import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const [BASE, OUT] = process.argv.slice(2); const fs = await import('node:fs/promises');
const b = await chromium.launch(); const res = {};
for (const theme of ['light', 'dark']) for (const [w, h, m] of [[1440, 1000, false], [390, 844, true]]) {
  const p = await (await b.newContext({ viewport: { width: w, height: h }, isMobile: m, colorScheme: theme })).newPage();
  await p.goto(BASE + '/charts', { waitUntil: 'networkidle' });
  const r = await p.evaluate(() => {
    const cards = [...document.querySelectorAll('.card h2')].map((e) => e.textContent);
    const barFills = [...document.querySelectorAll('.recharts-bar-rectangle path')].map((e) => e.getAttribute('fill'));
    return { cards, cardCount: cards.length, barCount: barFills.length, distinctBarFills: [...new Set(barFills)],
      orgDots: document.querySelectorAll('.recharts-yAxis circle').length,
      stripRows: document.querySelectorAll('[role=img][aria-label*="models"]').length,
      stripLabels: [...document.querySelectorAll('[role=img][aria-label*="models"]')].map((e) => e.getAttribute('aria-label')),
      valueMap: document.querySelectorAll('.bh-value-map').length,
      valueMapHeight: Math.round(document.querySelector('.bh-value-map [aria-hidden=true]')?.getBoundingClientRect().height || 0),
      scrollWidth: document.documentElement.scrollWidth };
  });
  await p.screenshot({ path: `${OUT}/charts-${theme}-${w}.png`, fullPage: true });
  res[`${theme}-${w}`] = r;
}
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify(res, null, 2)); console.log(JSON.stringify(res, null, 1)); await b.close();
