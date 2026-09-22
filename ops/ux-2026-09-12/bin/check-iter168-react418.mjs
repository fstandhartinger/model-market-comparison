// Iteration 168: clean-context console check for the React #418 the 091002Z gate saw once in the shared CDP profile.
// Usage: node check-iter168-react418.mjs <base-url>  (JSON on stdout)
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const host = process.argv[2] || 'https://benchmarkheaven.com';
const paths = ['/', '/benchmarks', '/benchmarks?benchmark=surge-chartography%3A%3A100-tasks', '/benchmarks?benchmark=mls-bench-lite%3A%3A30-tasks', '/benchmarks?benchmark=interfaze-sob%3A%3Atext-image-audio', '/models/gpt-5.6-sol::max'];
const out = [];
const browser = await chromium.launch();
for (const theme of ['light', 'dark']) for (const vp of [[1440, 1000], [390, 844]]) {
  const ctx = await browser.newContext({ viewport: { width: vp[0], height: vp[1] } });
  await ctx.addInitScript(t => { try { localStorage.setItem('bh-theme', t); } catch {} }, theme);
  for (const p of paths) {
    const page = await ctx.newPage();
    const errs = [];
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); });
    page.on('pageerror', e => errs.push('pageerror: ' + String(e).slice(0, 300)));
    for (const round of [1, 2]) {
      await page.goto(host + p, { waitUntil: 'networkidle', timeout: 60000 }).catch(e => errs.push('goto ' + e.message.slice(0, 100)));
      await page.waitForTimeout(1500);
    }
    out.push({ theme, vp: vp.join('x'), path: p, dataTheme: await page.evaluate(() => document.documentElement.dataset.theme), errors: errs });
    await page.close();
  }
  await ctx.close();
}
await browser.close();
console.log(JSON.stringify(out, null, 1));
