// Acceptance for CR-2.2: pick compared models from a score-vs-cost chart on the Benchmarks tab — the
// global filters give the candidates, two sliders narrow them, clicking/tapping a point adds or removes
// its column immediately, selected models are visibly marked with the column colour.
// Usage: node verify-cr-2-2.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = process.argv[2] || 'https://benchmarkheaven.com';
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/iter53-cr-2-2/canonical';
await fs.mkdir(OUT, { recursive: true });
const b = await chromium.launch();
const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${detail ?? ''}`); };

const state = () => {
  const cols = [...document.querySelectorAll('table.bh-matrix thead th.bh-matrix-model')].map((th) => ({
    id: decodeURIComponent(th.querySelector('.bh-matrix-name a').getAttribute('href').replace('/models/', '')),
    colour: getComputedStyle(th.querySelector('.bh-matrix-accent'), '::after').backgroundColor,
  }));
  const pts = [...document.querySelectorAll('.bh-pick-point')].map((g) => {
    const dot = g.querySelectorAll('circle')[1];
    const r = g.querySelector('circle').getBoundingClientRect();
    return { id: g.dataset.id, selected: g.getAttribute('aria-pressed') === 'true', pass: g.dataset.pass === 'true', fill: dot ? getComputedStyle(dot).fill : null, hit: Math.round(r.width) };
  });
  const status = document.querySelector('.bh-pick [role="status"]')?.textContent.replace(/\s+/g, ' ').trim() ?? '';
  const svg = document.querySelector('.bh-pick svg');
  return { cols, pts, status, svgW: svg ? svg.getBoundingClientRect().width : 0, docOverflow: document.documentElement.scrollWidth > innerWidth + 1, url: location.search };
};

for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const c = await b.newContext({ viewport: vp, isMobile: kind === 'mobile', hasTouch: kind === 'mobile', colorScheme: theme });
  await c.addInitScript((t) => { try { localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const p = await c.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  const tag = `${kind}_${theme}`;
  await p.goto(BASE + '/benchmarks', { waitUntil: 'networkidle' });
  await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
  await p.waitForTimeout(800);
  const panel = p.locator('details.bh-pickpanel');
  check(`${tag} "Pick from chart" panel present`, await panel.count() === 1, '');
  await panel.locator('summary').click();
  await p.waitForTimeout(600);
  let s = await p.evaluate(state);
  await panel.screenshot({ path: `${OUT}/${tag}-pick-panel.png` });
  check(`${tag} chart plots the filtered candidates (≥ 8 points), fits its width, no page overflow`, s.pts.length >= 8 && s.svgW > 200 && !s.docOverflow, `${s.pts.length} points · svg ${Math.round(s.svgW)} px · ${s.status}`);
  const colIds = s.cols.map((x) => x.id);
  const marked = s.pts.filter((x) => x.selected);
  check(`${tag} selected models are marked in the chart with their column colour`, marked.length === colIds.filter((id) => s.pts.some((x) => x.id === id)).length && marked.every((x) => { const col = s.cols.find((cc) => cc.id === x.id); return col && x.fill === col.colour; }), marked.map((x) => `${x.id}:${x.fill}`).join(' | '));
  if (kind === 'mobile') check(`${tag} point hit areas ≥ 28 px on phones`, s.pts.every((x) => x.hit >= 28), `min ${Math.min(...s.pts.map((x) => x.hit))} px`);

  // Click an unselected passing point → a column is added immediately.
  const add = s.pts.find((x) => !x.selected && x.pass);
  await p.locator(`.bh-pick-point[data-id="${add.id}"]`).click({ force: true });
  await p.waitForTimeout(300);
  s = await p.evaluate(state);
  check(`${tag} clicking a point adds its column at once and marks it`, s.cols.some((x) => x.id === add.id) && s.pts.find((x) => x.id === add.id).selected && /models=/.test(s.url), `${add.id} → ${s.cols.length} cols`);
  // Click it again → removed.
  await p.locator(`.bh-pick-point[data-id="${add.id}"]`).click({ force: true });
  await p.waitForTimeout(300);
  s = await p.evaluate(state);
  check(`${tag} clicking it again removes the column`, !s.cols.some((x) => x.id === add.id) && !s.pts.find((x) => x.id === add.id).selected, `${s.cols.length} cols`);
  // Keyboard: focus a passing point and press Enter.
  const key = s.pts.find((x) => !x.selected && x.pass && x.id !== add.id);
  await p.locator(`.bh-pick-point[data-id="${key.id}"]`).focus();
  await p.keyboard.press('Enter');
  await p.waitForTimeout(300);
  s = await p.evaluate(state);
  check(`${tag} keyboard: Enter on a focused point adds it`, s.cols.some((x) => x.id === key.id), key.id);
  // Sliders narrow the candidates.
  const passBefore = s.pts.filter((x) => x.pass).length;
  const scoreSlider = p.getByRole('slider', { name: /^Minimum .* for chart candidates/ });
  await scoreSlider.focus();
  for (let i = 0; i < 12; i++) await p.keyboard.press('ArrowRight');
  await p.waitForTimeout(300);
  let s2 = await p.evaluate(state);
  check(`${tag} the score slider narrows the candidates`, s2.pts.filter((x) => x.pass).length < passBefore, `${passBefore} → ${s2.pts.filter((x) => x.pass).length} · ${s2.status}`);
  const passMid = s2.pts.filter((x) => x.pass).length;
  const costSlider = p.getByRole('slider', { name: /^Maximum adjusted cost per task for chart candidates/ });
  await costSlider.focus();
  await p.keyboard.press('Home');
  for (let i = 0; i < 350; i += 50) await p.keyboard.press('PageUp');
  await p.waitForTimeout(300);
  s2 = await p.evaluate(state);
  check(`${tag} the cost slider narrows the candidates further`, s2.pts.filter((x) => x.pass).length < passMid, `${passMid} → ${s2.pts.filter((x) => x.pass).length} · ${s2.status}`);
  await panel.screenshot({ path: `${OUT}/${tag}-pick-panel-narrowed.png` });
  check(`${tag} no page errors`, errors.length === 0, errors.join(' | '));
  await c.close();
}
await b.close();
const passed = results.filter((r) => r.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), passed, total: results.length, results }, null, 2));
console.log(`${passed}/${results.length}`);
process.exit(passed === results.length ? 0 : 1);
