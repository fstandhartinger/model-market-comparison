// Live acceptance for F-72 (Charts "Cheapest models" as a log-position dot plot), per the
// DESIGN-DIRECTIVES pass-13 acceptance text. Usage: node verify-f72.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = process.argv[2] || 'https://benchmarkheaven.com';
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/iter51-f72/canonical';
await fs.mkdir(OUT, { recursive: true });
const ALLOWED = new Set(['$0.01', '$0.03', '$0.1', '$0.3', '$1', '$3', '$10', '$30', '$100']);
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
  await p.goto(BASE + '/charts', { waitUntil: 'networkidle' });
  await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
  await p.waitForTimeout(800);
  const r = await p.evaluate((isMobile) => {
    const card = [...document.querySelectorAll('.card')].find((el) => el.querySelector('h2')?.textContent?.startsWith('Cheapest models'));
    if (!card) return null;
    const visible = (el) => el.getBoundingClientRect().width > 0;
    const list = [...card.querySelectorAll('[role=list][aria-label="Cheapest models"]')].find(visible);
    const dots = list ? [...list.querySelectorAll('.bh-cost-dot')].map((d) => { const bb = d.getBoundingClientRect(); return { x: bb.x + bb.width / 2, w: bb.width }; }) : [];
    const ticks = [...card.querySelectorAll('.bh-cost-tick')].filter(visible).map((t) => t.textContent.trim());
    const fillBars = list ? list.querySelectorAll('.bg-accent\\/80').length : -1;
    return {
      bars: card.querySelectorAll('.recharts-bar-rectangle').length,
      fillBars, dots, ticks,
      rows: list ? list.querySelectorAll('[role=listitem]').length : 0,
      caption: /log scale/.test(card.innerText),
      overflow: document.documentElement.scrollWidth,
    };
  }, kind === 'mobile');
  check(`${tag} card found`, !!r);
  if (r) {
    check(`${tag} no recharts bar rectangles`, r.bars === 0, `bars=${r.bars}`);
    check(`${tag} no fill bars`, r.fillBars === 0, `fill=${r.fillBars}`);
    check(`${tag} one dot per row`, r.rows >= 3 && r.dots.length === r.rows, `rows=${r.rows} dots=${r.dots.length}`);
    check(`${tag} caption says log scale`, r.caption);
    check(`${tag} no horizontal overflow`, r.overflow <= vp.width, `scrollWidth=${r.overflow}`);
    if (kind === 'desktop') {
      const [a, bb, cc] = r.dots.map((d) => d.x);
      const gaps = [bb - a, cc - bb, cc - a];
      check(`${tag} three cheapest marks ≥ 10 px apart pairwise`, gaps.every((g) => g >= 10), `gaps=${gaps.map((g) => g.toFixed(1)).join(',')}`);
      check(`${tag} tick labels are round money ticks`, r.ticks.length >= 2 && r.ticks.every((t) => ALLOWED.has(t)), r.ticks.join(' '));
      check(`${tag} dots ascend left to right`, r.dots.every((d, i) => i === 0 || d.x >= r.dots[i - 1].x - 0.5), '');
    }
  }
  check(`${tag} no page errors`, errors.length === 0, errors.join(' | '));
  const card = p.locator('.card', { has: p.locator('h2', { hasText: 'Cheapest models' }) });
  await card.scrollIntoViewIfNeeded();
  await card.screenshot({ path: `${OUT}/${tag}-cheapest.png` });
  await c.close();
}
await b.close();
const fails = results.filter((x) => !x.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), pass: results.length - fails, fail: fails, results }, null, 1));
console.log(`${results.length - fails}/${results.length} checks passed on ${BASE}`);
process.exit(fails ? 1 : 0);
