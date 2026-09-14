// Live acceptance for Fable pass 14: F-74 (shortlist cap keeps the Pareto line), F-75 (Guided
// result actions never wrap inside a button on phones), F-76 (harness option text).
// Usage: node verify-f74-f76.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = process.argv[2] || 'https://benchmarkheaven.com';
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/fable-20260914-pass14/verify-f74-f76/canonical';
await fs.mkdir(OUT, { recursive: true });
const b = await chromium.launch();
const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${detail ?? ''}`); };
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const c = await b.newContext({ viewport: vp, isMobile: kind === 'mobile', colorScheme: theme });
  await c.addInitScript((t) => { try { localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const p = await c.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  const tag = `${kind}_${theme}`;
  const go = async (path) => { await p.goto(BASE + path, { waitUntil: 'networkidle' }); await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme); await p.waitForTimeout(600); };
  // F-74 + F-75: Guided, skip every question → all featured models pass, cap 15.
  await go('/');
  await p.getByRole('tab', { name: 'Guided' }).click(); await p.waitForTimeout(600);
  for (let i = 0; i < 6; i++) { const btn = p.getByRole('button', { name: /^(Continue|See the models|Skip)/i }).first(); if (!(await btn.count())) break; await btn.click(); await p.waitForTimeout(500); }
  const g = await p.evaluate(() => {
    const rows = [...document.querySelectorAll('tbody tr')].map((tr) => tr.innerText.replace(/\s+/g, ' ').trim());
    const names = rows.map((t) => t.split(' ').slice(0, 3).join(' '));
    const caption = document.body.innerText.match(/\d+ models pass[^\n]*/)?.[0] ?? '';
    const btns = [...document.querySelectorAll('button')].filter((x) => /Change answers|Start over|Open in Advanced/.test(x.textContent)).map((x) => ({ t: x.textContent.trim(), h: x.getBoundingClientRect().height, w: x.getBoundingClientRect().width }));
    return { rows: rows.length, names, caption, btns, sw: document.documentElement.scrollWidth };
  });
  await p.screenshot({ path: `${OUT}/${tag}-guided-results.png` });
  check(`${tag} F-74 guided results show ≤ 15 rows`, g.rows > 0 && g.rows <= 15, `rows=${g.rows}`);
  const passCount = Number(g.caption.match(/^(\d+) models pass/)?.[1] ?? 0);
  check(`${tag} F-74 caption`, passCount > 0, g.caption);
  if (passCount > 15) {
    check(`${tag} F-74 caption names the rule, not "most expensive"`, /Pareto line first/.test(g.caption) && !/most expensive/.test(g.caption), g.caption);
    const cheapestIdx = g.names.findIndex((n) => /GLM-5\.3-Flash/.test(n));
    check(`${tag} F-74 cheapest passing model (GLM-5.3-Flash) is in the table`, cheapestIdx >= 0, `names=${g.names.join(' | ')}`);
    check(`${tag} F-74 first row is still the priciest (R5.2 literal)`, /Claude Fable 5\b/.test(g.names[0]), g.names[0]);
  } else {
    check(`${tag} F-74 not exercised: only ${passCount} pass (≤ 15)`, true, g.caption);
  }
  check(`${tag} F-75 result actions are single-line`, g.btns.length === 3 && g.btns.every((x) => x.h <= 46), JSON.stringify(g.btns));
  check(`${tag} no horizontal overflow`, g.sw <= vp.width, `scrollWidth=${g.sw}`);
  // F-76: Real-SWE board's evaluation-group select.
  await go('/benchmarks');
  const sel = p.locator('select').nth(1);
  const opts = await sel.locator('option').allTextContents();
  const o = opts.find((t) => /real-?swe/i.test(t));
  if (o) { await sel.selectOption({ label: o }); await p.waitForTimeout(800); }
  const f76 = await p.evaluate(() => [...document.querySelectorAll('select option')].map((x) => x.textContent).filter((t) => /measured catalog peers/.test(t)));
  check(`${tag} F-76 no "0 measured catalog peers" option`, !!o && !f76.some((t) => /\b0 measured/.test(t)), `real-swe=${!!o} peers-options=${JSON.stringify(f76)}`);
  check(`${tag} no page errors`, errors.length === 0, errors.join(' | ').slice(0, 300));
  await c.close();
}
await b.close();
const passed = results.filter((r) => r.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), passed, total: results.length, results }, null, 1));
console.log(`${passed}/${results.length} checks passed on ${BASE}`);
