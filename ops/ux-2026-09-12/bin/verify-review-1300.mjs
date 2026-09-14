// Independent review-gate verifier (claude-opus, REVIEW-20260914T130002Z) for F-66, F-69, F-70,
// F-71 (implementer Fable) and F-73 (this gate), written against the DESIGN-DIRECTIVES acceptance
// text rather than reusing verify-f69-f71.mjs. Adds cross-checks the implementer's script lacks:
// computed (not attribute) paint-order/stroke, the halo colour equals the page surface, the modal
// ratio equals input ÷ output tokens, and a real forced client error for the boundary.
// Usage: node verify-review-1300.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = process.argv[2] || 'https://benchmarkheaven.com';
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/review-20260914T130002Z/canonical';
await fs.mkdir(OUT, { recursive: true });
const b = await chromium.launch();
const results = [];
const check = (id, name, ok, detail) => { results.push({ id, name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${name} ${detail ?? ''}`); };
const num = (s) => Number(String(s).replace(/[^\d.]/g, ''));
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const c = await b.newContext({ viewport: vp, isMobile: kind === 'mobile', hasTouch: kind === 'mobile', colorScheme: theme });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const p = await c.newPage(); const tag = `${kind}_${theme}`;
  const errors = []; p.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  const go = async (path) => { await p.goto(BASE + path, { waitUntil: 'networkidle' }); await p.waitForTimeout(800); };

  // F-69: every benchmark name in the model page's sheet is fully visible (no clip, no ellipsis).
  await go('/models/claude-opus-5%3A%3Ahigh');
  const s = await p.evaluate(() => {
    const sums = [...document.querySelectorAll('details > summary')].filter((x) => x.closest('#benchmark-sheet') || x.querySelector('.bh-row-chevron'));
    const cells = sums.map((x) => x.querySelector('span') ).filter(Boolean);
    const named = sums.map((x) => [...x.querySelectorAll('span')].sort((a, b) => b.textContent.length - a.textContent.length)[0]).filter(Boolean);
    const clipped = named.filter((n) => n.scrollWidth > n.clientWidth + 1 || (getComputedStyle(n).textOverflow === 'ellipsis' && getComputedStyle(n).overflow !== 'visible' && n.scrollWidth > n.clientWidth));
    const hs = sums.map((x) => x.getBoundingClientRect().height);
    return { rows: sums.length, cells: cells.length, clipped: clipped.map((n) => n.textContent.trim()).slice(0, 5), maxH: Math.max(...hs), overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  check('F-69', `${tag} sheet rows`, s.rows >= 10, `rows=${s.rows}`);
  check('F-69', `${tag} no clipped name`, s.clipped.length === 0, JSON.stringify(s.clipped));
  check('F-69', `${tag} ${kind === 'mobile' ? 'rows ≥ 40 px' : 'rows ≤ 36 px'}`, kind === 'mobile' ? s.maxH >= 40 : s.maxH <= 36, `maxH=${s.maxH}`);
  check('F-69', `${tag} no horizontal overflow`, s.overflow <= 0, `overflow=${s.overflow}`);
  await p.screenshot({ path: `${OUT}/${tag}-model.png`, fullPage: kind === 'mobile' });

  // F-70: computed halo on every value-map label, colour equal to the card surface.
  await go('/');
  const h = await p.evaluate(() => {
    const t = [...document.querySelectorAll('.bh-point-labels text')];
    const probe = document.createElement('div'); probe.style.color = 'var(--surface)'; document.body.appendChild(probe);
    const surface = getComputedStyle(probe).color; probe.remove();
    const cs = t.map((e) => getComputedStyle(e));
    return { n: t.length, paint: cs.filter((x) => /^stroke/.test(x.paintOrder)).length, stroke: [...new Set(cs.map((x) => x.stroke))], width: [...new Set(cs.map((x) => x.strokeWidth))], surface };
  });
  check('F-70', `${tag} labels present`, h.n >= 3, `n=${h.n}`);
  check('F-70', `${tag} computed paint-order stroke on all`, h.n > 0 && h.paint === h.n, `${h.paint}/${h.n}`);
  check('F-70', `${tag} halo colour = surface`, h.stroke.length === 1 && h.stroke[0] === h.surface, `stroke=${h.stroke.join('|')} surface=${h.surface} width=${h.width.join('|')}`);

  // F-71: first Simple price opens a modal with integer tokens; ratio equals input ÷ output.
  const btn = p.locator('table tbody tr button').first();
  await btn.click(); await p.waitForTimeout(500);
  const dl = await p.evaluate(() => { const d = document.querySelector('dialog[open] dl'); return d ? [...d.querySelectorAll('dt')].map((dt) => [dt.textContent.trim(), dt.nextElementSibling?.textContent.trim()]) : null; });
  check('F-71', `${tag} modal`, !!dl, JSON.stringify(dl?.slice(0, 4)));
  if (dl) {
    const [inp, out, ratio, hit] = dl.map((x) => x[1]);
    check('F-71', `${tag} integer input tokens`, /^\d{1,3}(,\d{3})*$/.test(inp), inp);
    check('F-71', `${tag} integer output tokens`, /^\d{1,3}(,\d{3})*$/.test(out), out);
    check('F-71', `${tag} ratio one decimal`, /^\d+\.\d:1$/.test(ratio), ratio);
    check('F-71', `${tag} ratio = input ÷ output`, Math.abs(num(inp) / num(out) - parseFloat(ratio)) <= 0.06, `${(num(inp) / num(out)).toFixed(3)} vs ${ratio}`);
    check('F-71', `${tag} hit rate one decimal, 0–100`, /^\d+\.\d%$/.test(hit) && parseFloat(hit) <= 100, hit);
  }
  await p.screenshot({ path: `${OUT}/${tag}-cost-modal.png` });
  await p.keyboard.press('Escape');

  // F-73: all-unmatched boards say "not matched to a catalog model" once; mixed boards per row.
  for (const id of ['vals-index-code-migration%3A%3A2', 'frontiercode%3A%3A1.1']) {
    await go(`/benchmarks?benchmark=${id}`);
    const t = await p.evaluate(() => { const m = document.querySelector('main') || document.body; return { n: (m.innerText.match(/not matched to a catalog model/g) || []).length, rows: document.querySelectorAll('main table tbody tr').length }; });
    check('F-73', `${tag} ${decodeURIComponent(id)} phrase once`, t.rows > 0 && t.n === 1, `n=${t.n} rows=${t.rows}`);
  }
  if (kind === 'desktop' && theme === 'light') await p.screenshot({ path: `${OUT}/${tag}-frontiercode.png` });

  // F-66: a forced client error (the Charts page chunk replaced by a throwing script during a
  // client-side navigation) renders the branded panel with a non-empty Details disclosure.
  await go('/');
  await p.route(/\/_next\/static\/chunks\/app\/charts\/page-[^/]+\.js$/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: 'throw new Error("review-gate forced client error");' }));
  const link = p.locator('nav a[href="/charts"]').first();
  if (await link.isVisible().catch(() => false)) await link.click(); else await p.evaluate(() => document.querySelector('a[href="/charts"]')?.click());
  await p.waitForTimeout(2500);
  const eb = await p.evaluate(() => { const a = [...document.querySelectorAll('[role="alert"]')].find((x) => /hit an error/.test(x.textContent)); const d = a?.querySelector('details'); if (d) d.open = true; return a ? { details: !!d, body: d?.querySelector('p')?.textContent.trim(), nav: !!document.querySelector('nav a[href="/charts"]'), retry: !!a.querySelector('button') } : null; });
  check('F-66', `${tag} branded panel on forced error`, !!eb, JSON.stringify(eb));
  check('F-66', `${tag} Details body "name: message" non-empty`, !!eb?.details && /^\w*Error: .+/.test(eb?.body || '') && !/no message$/.test(eb.body), eb?.body);
  await p.screenshot({ path: `${OUT}/${tag}-error-boundary.png` });
  await p.unroute(/charts\/page/);
  check('ALL', `${tag} no page errors outside the forced one`, errors.filter((e) => !/review-gate forced/.test(e)).length === 0, errors.join(' || '));
  await c.close();
}
await b.close();
const fails = results.filter((r) => !r.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), pass: results.length - fails, fail: fails, results }, null, 1));
console.log(`${results.length - fails}/${results.length} checks passed on ${BASE}`);
process.exit(fails ? 1 : 0);
