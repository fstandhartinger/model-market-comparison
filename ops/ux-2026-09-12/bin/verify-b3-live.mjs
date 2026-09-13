// Iteration 7 live check: B3/B4 (coverage-robust Benchmaxxing tag) and F-06 (Advanced opens
// on the full catalog). Usage: OUT=<dir> node ops/ux-2026-09-12/bin/verify-b3-live.mjs [base]
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs');
const base = process.argv[2] || 'https://benchmarkheaven.com', out = process.env.OUT, res = { base, at: new Date().toISOString() };
res.revision = (await (await fetch(base + '/api/meta')).json()).revision;
const browser = await chromium.launch();
for (const [label, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const ctx = await browser.newContext({ viewport: vp }); // fresh storage = fresh session
  const page = await ctx.newPage();
  await page.goto(base + '/benchmaxxing', { waitUntil: 'networkidle' });
  const bm = await page.evaluate(() => ({
    qualified: document.body.innerText.match(/(\d+)\s+coverage-qualified models/)?.[1],
    tagSentence: document.body.innerText.match(/highest-scoring tenth[^(]*\(([^)]*)\)/)?.[1],
    badgesInTop25: document.querySelectorAll('table.bh-table .bh-alert').length,
    hasComparisonsCol: document.body.innerText.includes('Related comparisons'),
    methodMentionsFloor: /at least 6 related comparisons spread over at least 2 topics/.test(document.querySelector('#method')?.textContent || ''),
    firstRows: [...document.querySelectorAll('table.bh-table tbody tr')].slice(0, 5).map((tr) => tr.innerText.replace(/\s+/g, ' ').slice(0, 160)),
    scrollWidth: document.documentElement.scrollWidth,
  }));
  await page.screenshot({ path: `${out}/${label}-benchmaxxing.png` });
  const api = await page.evaluate(async () => (await (await fetch('/api/benchmaxxing?report=' + encodeURIComponent('claude-opus-5::max'))).json()).report);
  bm.apiOpus5 = { status: api.status, score: api.score, rawScore: api.rawScore, comparisons: api.comparisons, topics: api.topics, shrinkage: api.shrinkage };

  await page.goto(base + '/', { waitUntil: 'networkidle' });
  const simple = await page.evaluate(() => ({
    selected: document.querySelector('[role=tab][aria-selected=true]')?.textContent?.trim(),
    scoreSlider: document.querySelector('input[type=range]')?.value,
    rows: document.querySelectorAll('table.dtable tbody tr').length,
  }));
  await page.screenshot({ path: `${out}/${label}-simple.png` });
  await page.getByRole('tab', { name: 'Advanced' }).click();
  await page.waitForTimeout(1500);
  const advanced = await page.evaluate(() => {
    const txt = document.body.innerText;
    return {
      selected: document.querySelector('[role=tab][aria-selected=true]')?.textContent?.trim(),
      countLine: txt.match(/\b(\d+) models( · filtered)?/)?.[0],
      bodyRows: document.querySelectorAll('table.dtable tbody tr').length,
      benchmaxxBadges: [...document.querySelectorAll('table.dtable tbody')].reduce((n, tb) => n + (tb.innerText.match(/Benchmaxx/g) || []).length, 0),
      scrollWidth: document.documentElement.scrollWidth,
    };
  });
  await page.screenshot({ path: `${out}/${label}-advanced.png` });
  await page.getByRole('tab', { name: 'Simple' }).click();
  await page.waitForTimeout(1000);
  const simpleAgain = await page.evaluate(() => ({ scoreSlider: document.querySelector('input[type=range]')?.value }));
  res[label] = { benchmaxxing: bm, simple, advanced, simpleAfterAdvanced: simpleAgain };
  await ctx.close();
}
await browser.close();
fs.writeFileSync(`${out}/verification.json`, JSON.stringify(res, null, 2));
console.log(JSON.stringify(res, null, 2));
