// Acceptance for CR-6.1 (phone header: Options · Benchmarks · More, all visible, ≥ 44 px targets; 'Filters' was renamed 'Options' by CR-25.1)
// and CR-8.1 (overview table opens score-descending in Simple and Advanced).
// Usage: node verify-cr-6-8.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = process.argv[2] || 'https://benchmarkheaven.com';
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/iter52-cr-6-8/canonical';
await fs.mkdir(OUT, { recursive: true });
const b = await chromium.launch();
const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${detail ?? ''}`); };
const scoreOrder = () => {
  const ths = [...document.querySelectorAll('thead th')];
  const idx = ths.findIndex((th) => /^Score/i.test(th.innerText.trim()));
  const sort = idx >= 0 ? ths[idx].getAttribute('aria-sort') : null;
  const vals = [...(ths[idx]?.closest('table') ?? document).querySelectorAll('tbody tr')] /* iteration 53: scoped to the ranking table — Simple now has a second (benchmarks) table */.map((tr) => {
    const td = tr.children[idx];
    const m = td?.innerText.match(/\d+(\.\d+)?/);
    return m ? Number(m[0]) : null;
  }).filter((v) => v != null);
  const desc = vals.every((v, i) => i === 0 || vals[i - 1] >= v);
  return { idx, sort, n: vals.length, desc, head: vals.slice(0, 5) };
};
const VPS = [['desktop', { width: 1440, height: 1000 }], ['mobile390', { width: 390, height: 844 }], ['mobile360', { width: 360, height: 780 }]];
for (const theme of ['light', 'dark']) for (const [kind, vp] of VPS) {
  const c = await b.newContext({ viewport: vp, isMobile: kind !== 'desktop', hasTouch: kind !== 'desktop', colorScheme: theme });
  await c.addInitScript((t) => { try { localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const p = await c.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  const tag = `${kind}_${theme}`;
  await p.goto(BASE + '/', { waitUntil: 'networkidle' });
  await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
  await p.waitForTimeout(800);

  // CR-6.1 — header controls
  const h = await p.evaluate(() => {
    const header = document.querySelector('header');
    const vis = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return { t: el.innerText.trim(), x: r.left, r: r.right, w: r.width, h: r.height, shown: r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden', clipped: el.scrollWidth > el.clientWidth + 1 }; };
    const filters = vis(header.querySelector('[data-bh-filters-toggle]'));
    const bench = [...header.querySelectorAll('a[href="/benchmarks"]')].map(vis).find((x) => x.shown) ?? null;
    const more = [...header.querySelectorAll('summary')].map(vis).find((x) => x.shown) ?? null;
    const menuText = [...header.querySelectorAll('summary, button, a')].some((el) => el.getBoundingClientRect().width > 0 && /^Menu$/.test(el.innerText.trim()));
    return { filters, bench, more, menuText, headerOverflow: header.scrollWidth > header.clientWidth + 1, docOverflow: document.documentElement.scrollWidth > window.innerWidth + 1, vw: window.innerWidth };
  });
  if (kind === 'desktop') {
    check(`${tag} CR-6.1 desktop primary nav keeps Benchmarks`, h.bench?.shown, JSON.stringify(h.bench));
    check(`${tag} CR-6.1 desktop no "Menu" label`, !h.menuText);
  } else {
    for (const [n, x] of [['Options', h.filters], ['Benchmarks', h.bench], ['More', h.more]]) {
      check(`${tag} CR-6.1 ${n} visible, unclipped, inside viewport`, x?.shown && !x.clipped && x.r <= h.vw + 0.5 && x.x >= 0, JSON.stringify(x));
      check(`${tag} CR-6.1 ${n} tap target ≥ 44 px`, x && x.h >= 44 && x.w >= 44, x ? `${x.w.toFixed(1)}×${x.h.toFixed(1)}` : 'missing');
    }
    check(`${tag} CR-6.1 labels read Options / Benchmarks / More (CR-25.1)`, h.filters?.t === 'Options' && h.bench?.t === 'Benchmarks' && h.more?.t === 'More', `${h.filters?.t}|${h.bench?.t}|${h.more?.t}`);
    check(`${tag} CR-6.1 order Options < Benchmarks < More`, h.filters && h.bench && h.more && h.filters.r <= h.bench.x + 0.5 && h.bench.r <= h.more.x + 0.5);
    check(`${tag} CR-6.1 no "Menu" label, no header/page overflow`, !h.menuText && !h.headerOverflow && !h.docOverflow, JSON.stringify({ menu: h.menuText, ho: h.headerOverflow, dox: h.docOverflow }));
    const name = await p.getByRole('link', { name: 'Benchmarks', exact: true }).filter({ visible: true }).count();
    check(`${tag} CR-6.1 accessible name "Benchmarks" link`, name >= 1, `count=${name}`);
    await p.screenshot({ path: `${OUT}/${tag}-header.png`, clip: { x: 0, y: 0, width: vp.width, height: 70 } });
    await p.locator('header summary').filter({ visible: true }).first().click();
    await p.waitForTimeout(300);
    const moreList = await p.evaluate(() => [...document.querySelectorAll('header details[open] a')].map((a) => a.getAttribute('href')));
    check(`${tag} CR-6.1 More opens and lists the rest without a duplicate Benchmarks`, moreList.length >= 5 && !moreList.includes('/benchmarks'), moreList.join(','));
    await p.screenshot({ path: `${OUT}/${tag}-more-open.png` });
    await p.keyboard.press('Escape');
    await p.locator('header summary').filter({ visible: true }).first().click();
  }

  // CR-8.1 — Simple then Advanced, fresh load
  if (kind !== 'mobile360') {
    const s = await p.evaluate(scoreOrder);
    check(`${tag} CR-8.1 Simple opens aria-sort=descending on Score, values descending`, s.sort === 'descending' && s.desc && s.n > 0, JSON.stringify(s));
    await p.screenshot({ path: `${OUT}/${tag}-simple.png` });
    await p.getByRole('tab', { name: 'Advanced' }).click();
    await p.waitForTimeout(800);
    const a = await p.evaluate(scoreOrder);
    check(`${tag} CR-8.1 Advanced opens aria-sort=descending on Score, values descending`, a.sort === 'descending' && a.desc && a.n > 0, JSON.stringify(a));
    await p.screenshot({ path: `${OUT}/${tag}-advanced.png` });
  }
  check(`${tag} no page errors`, errors.length === 0, errors.join(' | '));
  await c.close();
}
await b.close();
const passed = results.filter((r) => r.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), passed, total: results.length, results }, null, 2));
console.log(`${passed}/${results.length}`);
process.exit(passed === results.length ? 0 : 1);
