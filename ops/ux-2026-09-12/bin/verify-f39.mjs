// Independent live check for the Fable-authored F-39 map repair.
// Usage: node verify-f39.mjs <base-url> <out-dir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = process.argv[2] || 'https://benchmarkheaven.com';
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/f39';
await fs.mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const result = { base: BASE, checked_at: new Date().toISOString(), failures: [], viewports: {} };
const check = (name, ok, detail) => { if (!ok) result.failures.push({ name, detail }); };
for (const theme of ['light', 'dark']) for (const [kind, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const context = await browser.newContext({ viewport, isMobile: kind === 'mobile', hasTouch: kind === 'mobile', colorScheme: theme });
  await context.addInitScript((t) => { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); }, theme);
  const page = await context.newPage();
  try {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    const view = await page.evaluate(() => {
      const map = document.querySelector('.bh-value-map');
      const texts = [...(map?.querySelectorAll('svg text') || [])].map((t) => ({ text: t.textContent?.trim() || '', rect: t.getBoundingClientRect() })).filter((v) => v.text);
      let overlaps = 0;
      for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
        const a = texts[i].rect, b = texts[j].rect;
        if (a.width && b.width && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) overlaps++;
      }
      const xTicks = texts.filter((v) => v.text.startsWith('$')).map((v) => v.text);
      const horizontalPoints = [...(map?.querySelectorAll('.recharts-scatter-symbol circle') || [])].map((e) => Number(e.getAttribute('cx'))).filter(Number.isFinite);
      return { map: !!map, xTicks, overlaps, pointCount: horizontalPoints.length, width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth };
    });
    result.viewports[`${kind}_${theme}`] = view;
    check(`${kind}_${theme} map exists`, view.map, view);
    check(`${kind}_${theme} round cost ticks`, view.xTicks.length >= (kind === 'mobile' ? 3 : 4), view.xTicks);
    check(`${kind}_${theme} no overlapping map labels`, view.overlaps === 0, view.overlaps);
    check(`${kind}_${theme} free/positive point set is rendered`, view.pointCount >= 1, view.pointCount);
    check(`${kind}_${theme} no horizontal overflow`, view.scrollWidth <= view.width + 1, view);
    await page.screenshot({ path: `${OUT}/${kind}_${theme}.png`, fullPage: kind === 'mobile' });
  } catch (error) {
    result.failures.push({ name: `${kind}_${theme} exception`, detail: String(error).split('\n')[0] });
  }
  await context.close();
}
await browser.close();
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.failures.length ? 1 : 0;
