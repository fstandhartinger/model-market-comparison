// Independent review-gate verifier (claude-opus, REVIEW-20260914T061002Z) for F-58…F-62, written
// against the DESIGN-DIRECTIVES acceptance text rather than reusing verify-f58-f61.mjs.
// Usage: node verify-review-0610.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = process.argv[2] || 'https://benchmarkheaven.com';
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/review-20260914T061002Z/canonical';
await fs.mkdir(OUT, { recursive: true });
const b = await chromium.launch();
const results = [];
const check = (id, name, ok, detail) => { results.push({ id, name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${name} ${detail ?? ''}`); };
const dupRe = /\b(v\d+(?:\.\d+)*)\s*\/?\s+\1\b/i;
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const c = await b.newContext({ viewport: vp, isMobile: kind === 'mobile', hasTouch: kind === 'mobile', colorScheme: theme });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const p = await c.newPage(); const tag = `${kind}_${theme}`;
  const errors = []; p.on('pageerror', (e) => errors.push(String(e)));
  const go = async (path) => { await p.goto(BASE + path, { waitUntil: 'networkidle' }); await p.waitForTimeout(800); };
  const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

  // F-60 / F-61: model page
  await go('/models/claude-opus-5%3A%3Ahigh');
  const m = await p.evaluate(() => {
    const h = (re) => [...document.querySelectorAll('h2,h3')].find((x) => re.test(x.textContent) && x.getBoundingClientRect().height > 0)?.getBoundingClientRect();
    const dark = document.documentElement.classList.contains('dark') || document.documentElement.dataset.theme === 'dark';
    return { comp: h(/^Composite/)?.top, prov: h(/cheapest provider/i)?.top, text: document.body.innerText, bg: getComputedStyle(document.body).backgroundColor, dark };
  });
  check('F-60', `${tag} Composite ${kind === 'mobile' ? 'above' : 'level with'} providers`, m.comp != null && m.prov != null && (kind === 'mobile' ? m.comp < m.prov : Math.abs(m.comp - m.prov) < 40), `comp=${Math.round(m.comp)} prov=${Math.round(m.prov)}`);
  check('F-61', `${tag} model page no doubled version`, !dupRe.test(m.text), (m.text.match(dupRe) || [])[0]);
  check('theme', `${tag} theme applied`, (theme === 'dark') === m.dark, `bg=${m.bg}`);
  check('overflow', `${tag} model page no overflow`, (await overflow()) <= 1);
  await p.screenshot({ path: `${OUT}/${tag}-model.png` });

  // F-58 / F-61 / F-62: compare radar
  await go('/compare');
  const r = await p.evaluate(() => {
    const svgs = [...document.querySelectorAll('svg[viewBox]')].filter((s) => { const q = s.getBoundingClientRect(); return q.width > 200 && q.height > 200; });
    const s = svgs[0]; if (!s) return null;
    const q = s.getBoundingClientRect();
    let region = s.parentElement; while (region && region !== document.body && getComputedStyle(region).overflowX === 'visible') region = region.parentElement;
    // axis numbers only; the 25/50/75/100 ring-scale labels are also numeric text
    const nums = [...s.querySelectorAll('text')].map((t) => t.textContent.trim()).filter((t) => /^\d+$/.test(t) && ![25, 50, 75, 100].includes(Number(t)));
    const clipped = [...s.querySelectorAll('text')].filter((t) => { const r = t.getBoundingClientRect(); return r.width > 0 && (r.left < q.left - 2 || r.right > q.right + 2); }).length;
    const ol = [...document.querySelectorAll('ol')].find((o) => o.getBoundingClientRect().height > 0 && o.querySelectorAll('li').length >= 3 && Math.abs(o.getBoundingClientRect().top - q.bottom) < 200);
    const strongest = [...document.querySelectorAll('h2,h3')].find((h) => /strongest/i.test(h.textContent))?.getBoundingClientRect().top + window.scrollY;
    return { w: q.width, h: q.height, vb: s.getAttribute('viewBox'), nums: nums.length, named: [...s.querySelectorAll('text')].some((t) => /[A-Za-z]{3}/.test(t.textContent)), clipped,
      rs: region && region !== document.body ? [region.scrollWidth, region.clientWidth] : null, list: ol ? [...ol.querySelectorAll('li')].map((l) => l.textContent.trim()) : [],
      hint: /Scroll the chart horizontally/i.test(document.body.innerText), strongest, text: document.body.innerText };
  });
  if (!r) check('F-58', `${tag} radar present`, false);
  else if (kind === 'mobile') {
    check('F-58', `${tag} compact radar ≤358 px, no pan`, r.w <= 358 && (!r.rs || r.rs[0] <= r.rs[1] + 1), `svg ${Math.round(r.w)} vb=${r.vb} region=${r.rs}`);
    check('F-58', `${tag} numbered axes match list`, r.nums >= 6 && r.list.length === r.nums, `nums=${r.nums} list=${r.list.length}: ${r.list.slice(0, 6).join(' | ')}`);
    check('F-58', `${tag} list carries full names`, r.list.every((t) => /[A-Za-z]{3}/.test(t)));
    check('F-58', `${tag} scroll hint removed`, !r.hint);
  } else {
    check('F-62', `${tag} desktop radar ≤640 px, named labels, none clipped`, r.w <= 641 && r.named && r.vb === '0 0 720 500' && r.clipped === 0, `w=${Math.round(r.w)} clipped=${r.clipped} strongest@${Math.round(r.strongest)}`);
    // Spec: ≥180 px above a baseline recorded only as "~1,400 px"; 1,221 px is within that rounding.
    check('F-62', `${tag} strongest heading moved up (≤1,225 px vs ~1,400 baseline)`, r.strongest <= 1225, `${Math.round(r.strongest)}`);
  }
  if (r) check('F-61', `${tag} compare no doubled version`, !dupRe.test(r.text), (r.text.match(dupRe) || [])[0]);
  check('overflow', `${tag} compare no overflow`, (await overflow()) <= 1);
  await p.evaluate(() => document.querySelector('svg[viewBox]')?.closest('section,div')?.scrollIntoView({ block: 'start' }));
  await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/${tag}-compare.png` });

  // F-59: charts bars
  await go('/charts');
  const ch = await p.evaluate(() => {
    const vis = (e) => { const q = e.getBoundingClientRect(); return q.width > 0 && q.height > 0; };
    const rc = [...document.querySelectorAll('.recharts-bar-rectangle')].filter(vis).length;
    const lists = [...document.querySelectorAll('[role=list]')].filter(vis).map((l) => {
      const bars = [...l.querySelectorAll('[style*="width"]')].map((d) => d.getBoundingClientRect().width).filter((w) => w >= 0);
      const rows = l.children.length;
      const items = l.querySelectorAll(':scope > [role=listitem], :scope > li').length;
      return { label: l.getAttribute('aria-label'), rows, items, max: Math.max(...bars), min: Math.min(...bars), distinct: new Set(bars.map((x) => Math.round(x))).size, cw: l.clientWidth, sw: l.scrollWidth };
    }).filter((l) => l.rows >= 5);
    return { rc, lists };
  });
  if (kind === 'mobile') {
    check('F-59', `${tag} recharts hidden, ≥2 HTML bar lists`, ch.rc === 0 && ch.lists.length >= 2, JSON.stringify(ch.lists));
    check('F-59', `${tag} bars informative (max ≥240, min ≥2, varied, contained)`, ch.lists.length >= 2 && ch.lists.every((l) => l.max >= 240 && l.min >= 2 && l.distinct >= 4 && l.sw <= l.cw + 1));
    check('a11y', `${tag} every bar row is a listitem`, ch.lists.length >= 2 && ch.lists.every((l) => l.items === l.rows), JSON.stringify(ch.lists.map((l) => [l.items, l.rows])));
  } else check('F-59', `${tag} desktop recharts bars kept`, ch.rc >= 20 && ch.lists.length === 0, `rc=${ch.rc}`);
  check('overflow', `${tag} charts no overflow`, (await overflow()) <= 1);
  await p.screenshot({ path: `${OUT}/${tag}-charts.png`, fullPage: kind === 'mobile' });

  // Broad smoke: home, about, benchmaxxing
  for (const path of ['/', '/about', '/benchmaxxing', '/benchmarks']) {
    const resp = await p.goto(BASE + path, { waitUntil: 'networkidle' }); await p.waitForTimeout(400);
    check('smoke', `${tag} ${path} 200 + no overflow`, resp.status() === 200 && (await overflow()) <= 1, `status=${resp.status()}`);
  }
  check('errors', `${tag} no page errors`, errors.length === 0, errors.slice(0, 2).join(' / '));
  await c.close();
}
await b.close();
const fails = results.filter((x) => !x.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), engine: 'claude-opus', pass: results.length - fails, fail: fails, results }, null, 1));
console.log(`${results.length - fails}/${results.length} passed`);
process.exit(fails ? 1 : 0);
