// Independent check of DESIGN-DIRECTIVES acceptance lines (F-01, F-02, F-03, F-05, F-12) and
// H3 presence, live. Usage: BH_OUT=<dir> node verify-directives-indep.mjs <base-url>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = process.argv[2] || 'https://benchmarkheaven.com';
const OUT = process.env.BH_OUT || '/opt/benchmarkheaven/state/ux-evidence/indep-directives';
await fs.mkdir(OUT, { recursive: true });
const b = await chromium.launch();
const out = { base: BASE, at: new Date().toISOString(), runs: [] };
for (const theme of ['light', 'dark']) for (const [w, h, mobile] of [[1440, 1000, false], [390, 844, true]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, colorScheme: theme });
  const p = await ctx.newPage(); const r = { theme, width: w };
  try {
    await p.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 90000 });
    r.revision = await p.evaluate(async () => (await (await fetch('/api/meta')).json()).revision);
    const hdr = await p.evaluate(() => { const e = document.querySelector('header') || document.querySelector('nav'); const bb = e?.getBoundingClientRect(); return bb ? { h: Math.round(bb.height) } : null; });
    r.F02_navHeight = hdr?.h ?? null;
    r.F02_noSecondFilterBar = !(await p.locator('text=/Filters & settings/i').first().isVisible().catch(() => false));
    r.F02_filtersButton = await p.locator('button:has-text("Filters"):visible').count();
    r.F02_radarInTopNav = await p.locator('header a:visible:text-is("Radar"), nav a:visible:text-is("Radar")').count();
    r.F01_eyebrowOnHome = await p.locator('.bh-eyebrow:visible').count();
    const rows = p.locator('table[aria-label="Model ranking"] tbody tr.bh-ranking-row');
    r.rowCount = await rows.count();
    const tops = await rows.evaluateAll((els) => els.slice(0, 3).map((e) => Math.round(e.getBoundingClientRect().bottom + window.scrollY)));
    r.F01_firstRowTop = await rows.first().evaluate((e) => Math.round(e.getBoundingClientRect().top + window.scrollY));
    r.F01_rowsOnFirstScreen = tops.filter((y) => y <= h).length;
    r.F03_thirdRowBottom = tops[2] ?? null;
    r.F03_sliders = await p.locator('input[type=range]:visible').count();
    r.F03_scatterSvg = await p.locator('svg:visible').evaluateAll((els) => els.filter((e) => e.getBoundingClientRect().height >= 70 && e.querySelectorAll('circle').length >= 3).length);
    r.F03_summary = (await p.locator('text=/models? pass/').first().innerText().catch(() => null));
    const bars = await p.evaluate(() => {
      const f = (sel) => [...document.querySelectorAll(sel)].map((e) => ({ h: Math.round(e.parentElement.getBoundingClientRect().height), bg: getComputedStyle(e).backgroundColor }));
      return { score: f('.bh-magnitude-score .bh-magnitude-fill'), cost: f('.bh-magnitude-cost .bh-magnitude-fill') };
    });
    r.F05_scoreBars = bars.score.length; r.F05_costBars = bars.cost.length;
    r.F05_trackHeights = [...new Set([...bars.score, ...bars.cost].map((x) => x.h))];
    r.F05_scoreColor = bars.score[0]?.bg; r.F05_costColor = bars.cost[0]?.bg;
    r.F05_colorsDiffer = !!(bars.score[0] && bars.cost[0] && bars.score[0].bg !== bars.cost[0].bg);
    r.F05_scoreBarsUniformColor = new Set(bars.score.map((x) => x.bg)).size <= 1;
    r.F12_footerHeight = await p.evaluate(() => { const f = document.querySelector('footer'); return f ? Math.round(f.getBoundingClientRect().height) : null; });
    r.F12_identityInFooter = await p.evaluate(() => /Not affiliated/i.test(document.querySelector('footer')?.innerText || ''));
    r.scrollWidth = await p.evaluate(() => document.documentElement.scrollWidth);
    await p.screenshot({ path: `${OUT}/${theme}-${w}-simple.png` });
    await p.locator('[role=tab]:has-text("Advanced")').first().click();
    await p.waitForTimeout(1200);
    r.H3_control = await p.locator('summary:has-text("Better than a model")').count();
    r.F06_advancedRows = await p.locator('table[aria-label="Model ranking"] tbody tr.bh-ranking-row').count();
    r.scrollWidthAdvanced = await p.evaluate(() => document.documentElement.scrollWidth);
    await p.screenshot({ path: `${OUT}/${theme}-${w}-advanced.png` });
  } catch (e) { r.error = String(e).slice(0, 300); }
  out.runs.push(r); await ctx.close();
}
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 1));
await b.close();
