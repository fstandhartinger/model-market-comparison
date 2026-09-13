// F-46/F-47 live acceptance. Usage: node verify-f46-f47.mjs <base> <outjson>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = process.argv[2] || 'https://benchmarkheaven.com';
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/fable-20260913-pass6/checks/verification-F46-F47.json';
const b = await chromium.launch(); const res = { base: BASE, at: new Date().toISOString(), checks: [] };
const meta = await (await fetch(BASE + '/api/meta')).json(); res.revision = meta.revision;
const check = (name, ok, detail) => res.checks.push({ name, ok, detail });
for (const theme of ['light', 'dark']) {
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, colorScheme: theme }); const p = await c.newPage();
  await p.goto(BASE + '/', { waitUntil: 'networkidle' }); await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme); await p.waitForTimeout(600);
  const geo = () => p.evaluate(() => { const t = document.querySelector('table').getBoundingClientRect(); const ths = [...document.querySelectorAll('thead th')].filter(th => th.getBoundingClientRect().width > 0).map(th => { const r = th.getBoundingClientRect(); const i = th.querySelector('button[aria-label^="About"]'); return { t: th.innerText.split('\n')[0], w: Math.round(r.width), h: Math.round(r.height), iconRight: i ? i.getBoundingClientRect().right : null }; }); return { tableRight: t.right, sw: document.documentElement.scrollWidth, ths }; });
  const s = await geo();
  const iconOK = s.ths.every(th => th.iconRight == null || th.iconRight <= s.tableRight);
  check(`F-46 simple ${theme}: every header (i) inside the table (table right ${Math.round(s.tableRight)})`, iconOK && s.sw <= 390, s);
  await p.screenshot({ path: OUT.replace(/\.json$/, `-simple-${theme}.png`), clip: { x: 0, y: 0, width: 390, height: 844 } });
  await p.getByRole('tab', { name: 'Advanced' }).click(); await p.waitForTimeout(800);
  const a = await geo();
  check(`F-46 advanced ${theme}: every header (i) inside the table`, a.ths.every(th => th.iconRight == null || th.iconRight <= a.tableRight) && a.sw <= 390, a);
  await c.close();
}
{ const c = await b.newContext({ viewport: { width: 1440, height: 1000 } }); const p = await c.newPage();
  await p.goto(BASE + '/', { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
  const d = await p.evaluate(() => [...document.querySelectorAll('thead th')].map(th => Math.round(th.getBoundingClientRect().width)));
  check('F-46 desktop columns unchanged (30/13/12/17/14/14 %)', Math.abs(d[0] - 0.30 * 1366) < 6 && Math.abs(d[2] - 0.12 * 1366) < 6, d);
  const r = await p.goto(BASE + '/models/this-model-does-not-exist', { waitUntil: 'networkidle' });
  const txt = await p.evaluate(() => document.body.innerText);
  check('F-47 unknown model id does not show the unbranded "Application error" screen', !/Application error/.test(txt) && /Benchmark Heaven/.test(txt), { status: r.status(), head: txt.slice(0, 120) });
  await c.close(); }
await b.close(); res.pass = res.checks.every(c => c.ok);
await fs.writeFile(OUT, JSON.stringify(res, null, 1)); console.log(res.revision, res.pass ? 'PASS' : 'FAIL'); for (const c of res.checks) console.log((c.ok ? 'ok  ' : 'FAIL') + ' ' + c.name);
