import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const OUT = '/opt/benchmarkheaven/state/ux-evidence/fable-20260925-pass35/canonical';
const out = {};
for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const b = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
  const c = await b.newContext({ viewport: vp, isMobile: kind === 'mobile', hasTouch: kind === 'mobile', colorScheme: 'light', deviceScaleFactor: kind === 'mobile' ? 2 : 1 });
  const p = await c.newPage();
  await p.goto('https://benchmarkheaven.com/jev-models/v1.4.2', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(1000);
  await p.screenshot({ path: `${OUT}/${kind}_light-v142.png` });
  if (kind === 'desktop') await p.screenshot({ path: `${OUT}/${kind}_light-v142-full.png`, fullPage: true });
  out[kind] = await p.evaluate(() => { const m = document.querySelector('main'); const heads = [...m.querySelectorAll('h1,h2')].map((h) => ({ t: h.textContent.trim().slice(0, 60), y: Math.round(h.getBoundingClientRect().y + scrollY) })); const firstBar = m.querySelector('[data-bh-jev14-bar]'); return { h: document.documentElement.scrollHeight, heads, firstBarY: firstBar ? Math.round(firstBar.getBoundingClientRect().y + scrollY) : null, words: m.innerText.split(/\s+/).length }; });
  await b.close();
}
await (await import('node:fs/promises')).writeFile(`${OUT}/metrics-v142.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out));
