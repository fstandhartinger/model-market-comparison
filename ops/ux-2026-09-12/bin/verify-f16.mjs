// F-16 acceptance (Advanced opens on the full catalog) in a fresh browser session.
// Usage: node verify-f16.mjs <base-url> <out-dir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = process.argv[2] || 'http://127.0.0.1:3241';
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/iter15/f16-local';
await fs.mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const out = { base: BASE, checked_at: new Date().toISOString(), results: {}, errors: [] };

const tableState = () => {
  const rows = [...document.querySelectorAll('table.dtable tbody tr.bh-ranking-row')];
  const scores = rows.map((r) => parseFloat((r.querySelectorAll('td')[2]?.innerText || '').replace(/[^0-9.]/g, ''))).filter(Number.isFinite);
  const toolbar = [...document.querySelectorAll('.card')].find((c) => c.querySelector('input[aria-label="Search model or organization"]'));
  const kids = toolbar ? [...toolbar.children].filter((k) => k.getBoundingClientRect().height > 0) : [];
  const tops = new Set(kids.map((k) => Math.round(k.getBoundingClientRect().top / 8)));
  return {
    rows: rows.length,
    stars: rows.filter((r) => r.innerText.includes('★')).length,
    minScore: scores.length ? Math.min(...scores) : null,
    count: toolbar ? (toolbar.innerText.match(/\d+ models[^\n]*/) || [null])[0] : null,
    toolbarRows: tops.size,
    toolbarHeight: toolbar ? Math.round(toolbar.getBoundingClientRect().height) : null,
    scrollWidth: document.documentElement.scrollWidth,
  };
};

for (const [name, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const ctx = await browser.newContext({ viewport: vp });
  const page = await ctx.newPage();
  const r = {};
  try {
    await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 90000 });
    r.simpleFirst = await page.evaluate(tableState);
    await page.getByRole('tab', { name: 'Advanced' }).click();
    await page.waitForTimeout(1500);
    r.advanced = await page.evaluate(tableState);
    // The global Featured toggle must show what Advanced applies (off).
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('bh:toggle-filters')));
    await page.waitForTimeout(400);
    r.featuredToggleInAdvanced = await page.evaluate(() => {
      const b = [...document.querySelectorAll('#global-filters button')].find((x) => x.innerText.trim().startsWith('Featured'));
      return b ? b.getAttribute('aria-pressed') : null;
    });
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('bh:toggle-filters')));
    await page.screenshot({ path: `${OUT}/${name}-advanced.png` });
    await page.getByRole('tab', { name: 'Simple' }).click();
    await page.waitForTimeout(1500);
    r.simpleAfterAdvanced = await page.evaluate(tableState);
  } catch (e) { out.errors.push(`${name}: ${String(e).split('\n')[0]}`); }
  r.pass = {
    advancedAtLeast50: (r.advanced?.rows ?? 0) >= 50,
    noStarInSimple: r.simpleFirst?.stars === 0 && r.simpleAfterAdvanced?.stars === 0,
    simpleKeeps85: (r.simpleAfterAdvanced?.minScore ?? 0) >= 85,
    simpleFeaturedOnly: (r.simpleAfterAdvanced?.rows ?? 99) <= 15,
    toolbarOneRow: name !== 'desktop' || r.advanced?.toolbarRows === 1,
    noFilteredSuffixByDefault: !(r.advanced?.count || '').includes('filtered'),
    toggleShowsOff: r.featuredToggleInAdvanced === 'false',
    noOverflow: r.advanced?.scrollWidth === vp.width,
  };
  out.results[name] = r;
  await ctx.close();
}
await browser.close();
out.allPass = Object.values(out.results).every((r) => Object.values(r.pass).every(Boolean)) && !out.errors.length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 1));
