// Fable pass-20 spot checks at 390 px: (1) the deep link from an Overview tag to /benchmaxxing?model=…#radar — which
// element holds focus and whether the skip link is visible; (2) topic-label bounding boxes of the many-axis radar for a
// model with a "Long-context" topic (MiniMax-M2.7, the gauntlet's clipped example); (3) the phone More-menu order.
// Usage: node check-fable-pass20.mjs <base> <out>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/fable-20260916-pass20';
const b = await chromium.launch();
const out = { base: BASE, at: new Date().toISOString() };
const c = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const p = await c.newPage();
const settle = async () => { await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(1500); };
try {
  // (1) deep link focus
  await p.goto(BASE + '/benchmaxxing?model=minimax-m2.7%3A%3Adefault#radar', { waitUntil: 'domcontentloaded', timeout: 45000 }); await settle(); await p.waitForTimeout(2500);
  out.deepLink = await p.evaluate(() => { const a = document.activeElement; const s = document.querySelector('.skip-link'); const r = s?.getBoundingClientRect(); return { active: a ? `${a.tagName}#${a.id}.${a.className}`.slice(0, 80) : null, skipTransform: s ? getComputedStyle(s).transform : null, skipVisible: !!r && r.bottom > 0 && r.top < innerHeight, h1: document.querySelector('h1')?.innerText, radarTitle: document.querySelector('#radar h2')?.innerText }; });
  await p.screenshot({ path: `${OUT}/check-deeplink-390.png` });
  // (2) radar labels for the selected model
  const radar = p.locator('#radar').first();
  if (await radar.count()) {
    out.radar = await radar.evaluate((el) => { const s = el.querySelector('svg'); const sb = s.getBoundingClientRect(); const wrap = s.parentElement.getBoundingClientRect(); const labels = [...s.parentElement.querySelectorAll('span')].map((t) => { const r = t.getBoundingClientRect(); return { t: t.textContent.trim(), l: Math.round(r.left), r: Math.round(r.right), insideWrap: r.left >= wrap.left - 1 && r.right <= wrap.right + 1, insideViewport: r.left >= 0 && r.right <= innerWidth }; }); return { svg: { l: Math.round(sb.left), r: Math.round(sb.right), w: Math.round(sb.width) }, wrap: { l: Math.round(wrap.left), r: Math.round(wrap.right) }, labels, jagged: el.querySelector('[data-jagged-note]')?.innerText, axesNote: [...el.querySelectorAll('p')].map((x) => x.innerText).find((x) => /Axes are/.test(x)) }; });
    await radar.screenshot({ path: `${OUT}/check-radar-minimax-390.png` });
  }
  // (3) More menu
  await p.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 45000 }); await settle();
  const more = p.locator('header summary:visible, header button:visible').filter({ hasText: /^More/ }).first();
  if (await more.count()) { await more.click(); await p.waitForTimeout(600); out.moreMenu = await p.evaluate(() => [...document.querySelectorAll('header a')].map((a) => a.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean)); await p.screenshot({ path: `${OUT}/check-more-menu-390.png` }); }
  out.headerLinks = await p.evaluate(() => [...document.querySelectorAll('header a, header summary')].map((a) => a.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 8));
} catch (e) { out.failed = String(e).slice(0, 300); } finally { await c.close(); await b.close(); }
await fs.writeFile(`${OUT}/check.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
