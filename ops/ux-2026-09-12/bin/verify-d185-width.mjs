// D185: does /jev-models still overflow a narrow viewport, and is `overflow-x: clip` hiding it?
//
// A clipped document reports scrollWidth === clientWidth whatever it contains, so measuring the
// document alone would pass vacuously. This receipt removes the clip in the page, re-measures, and
// reports the widest element that crosses the viewport's right edge outside an intentional scroll
// container. The browser keeps classic scrollbars, because that is the case the defect needed
// (a 390 px window lays out at 380). Every `<details>` note is opened first, so the long project
// URLs the row notes carry are in layout.
//
// usage: node verify-d185-width.mjs [outDir] [host ...]
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const OUT = process.argv[2] || '/opt/benchmarkheaven/state/ux-evidence/d185-width';
const HOSTS = process.argv.slice(3).length ? process.argv.slice(3)
  : ['https://benchmarkheaven.com', 'https://model-market-comparison.app.mintapis.com'];
const WIDTHS = [320, 360, 375, 390, 414, 768, 1440];
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
const results = [];
for (const host of HOSTS) {
  for (const width of WIDTHS) {
    const context = await browser.newContext({ viewport: { width, height: 844 } });
    const page = await context.newPage();
    await page.goto(`${host}/jev-models?review=${Date.now()}`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.evaluate(() => document.querySelectorAll('details').forEach((node) => { node.open = true; }));
    await page.waitForTimeout(600);
    const measured = await page.evaluate(() => {
      const root = document.documentElement;
      const clipped = { root: root.style.overflowX, body: document.body.style.overflowX };
      const withClip = root.scrollWidth - root.clientWidth;
      root.style.overflowX = 'visible';
      document.body.style.overflowX = 'visible';
      void root.offsetWidth;
      const viewport = root.clientWidth;
      const past = [];
      for (const element of document.querySelectorAll('body *')) {
        const rect = element.getBoundingClientRect();
        if (rect.height <= 0 || rect.width <= 0) continue;
        const over = Math.round(rect.right - viewport);
        if (over <= 1) continue;
        let inScroller = false;
        for (let parent = element.parentElement; parent; parent = parent.parentElement) {
          const style = getComputedStyle(parent);
          if (style.overflowX === 'auto' || style.overflowX === 'scroll') { inScroller = true; break; }
        }
        if (!inScroller) past.push({ over, tag: element.tagName, cls: String(element.className || '').slice(0, 50), text: (element.textContent || '').trim().slice(0, 70) });
      }
      const withoutClip = root.scrollWidth - viewport;
      root.style.overflowX = clipped.root;
      document.body.style.overflowX = clipped.body;
      past.sort((a, b) => b.over - a.over);
      return { viewport, withClip, withoutClip, past: past.slice(0, 5), pastCount: past.length };
    });
    const ok = measured.withClip <= 0 && measured.withoutClip <= 0 && measured.pastCount === 0;
    results.push({ host, width, ok, ...measured });
    console.log(`${ok ? 'PASS' : 'FAIL'} ${host} @${width} — viewport ${measured.viewport}, overflow ${measured.withoutClip} unclipped, ${measured.pastCount} element(s) past the edge${ok ? '' : ` — ${JSON.stringify(measured.past)}`}`);
    await context.close();
  }
}
await browser.close();
const failed = results.filter((row) => !row.ok);
await writeFile(`${OUT}/verification.json`, JSON.stringify({ verifiedAt: new Date().toISOString(), passed: results.length - failed.length, total: results.length, results }, null, 2));
console.log(`\n${results.length - failed.length}/${results.length} viewport checks passed — ${OUT}/verification.json`);
process.exit(failed.length ? 1 : 0);
