// Fable pass 20: pin down the "Minified React error #185" (maximum update depth) seen on / at 390 px.
// Records the error stack and which widths / views / routes reproduce it. Usage: node check-fable-pass20-error.mjs <base> <out>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/fable-20260916-pass20';
const b = await chromium.launch();
const out = { base: BASE, at: new Date().toISOString(), cases: [] };
const cases = [
  ['/', 390, true], ['/', 360, true], ['/', 430, true], ['/', 640, false], ['/', 768, false], ['/', 1024, false], ['/', 390, false],
  ['/charts', 390, true], ['/benchmarks', 390, true], ['/benchmaxxing', 390, true], ['/compare', 390, true],
];
for (const [path, width, mobile] of cases) {
  const c = await b.newContext({ viewport: { width, height: 844 }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
  const p = await c.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push({ message: String(e.message).slice(0, 200), stack: String(e.stack || '').split('\n').slice(0, 12).join('\n') }));
  try {
    await p.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await p.waitForLoadState('networkidle').catch(() => {});
    await p.waitForTimeout(2500);
    let tabs = null, fullPage = null;
    if (path === '/' && mobile) {
      // Reproduces: a full-page screenshot on the phone emulation flips the (hover)/(pointer) media queries twice
      // in quick succession; the site then throws React #185 (maximum update depth) from a MediaQueryList
      // listener in the layout chunk. Not seen on a plain load, a resize, or on desktop.
      errs.length = 0; await p.screenshot({ fullPage: true, path: `${OUT}/check-error-fullpage-${width}.png` }); await p.waitForTimeout(1500); fullPage = { errors: errs.length, first: errs[0] ?? null }; errs.length = 0;
    }
    if (path === '/' && width === 390 && mobile) {
      tabs = {};
      for (const t of ['Guided', 'Advanced', 'Simple']) { errs.length = 0; await p.getByRole('tab', { name: t }).click().catch(() => {}); await p.waitForTimeout(2000); tabs[t] = errs.length; }
    }
    out.cases.push({ path, width, mobile, errors: errs.length, first: errs[0] ?? null, tabs, fullPage });
  } catch (e) { out.cases.push({ path, width, mobile, failed: String(e).slice(0, 200) }); }
  await c.close();
}
await b.close();
await fs.writeFile(`${OUT}/check-error.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out.cases.map((c) => ({ ...c, first: c.first ? { message: c.first.message, stack: c.first.stack.slice(0, 900) } : null })), null, 1));
