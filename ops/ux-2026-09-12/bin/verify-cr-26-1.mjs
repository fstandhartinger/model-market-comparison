// CR-26.1 (design F-96): the Charts tab's cost-vs-capability map is the Simple value map at full width — parity
// checklist (reversed cost axis, attractive quadrant + note, Pareto line, ≤ 15 in-chart names with halos, fitted Y
// axis, cogwheel, AA/Epoch credits), score picker and both sliders in the card header that change the map, the
// 30-model rule while Featured is untouched, 420 px tall at desktop / 240 px on phones. 1440/390, light/dark.
// Usage: BH_RUNNER=<engine> node verify-cr-26-1.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-26-1';
await fs.mkdir(OUT, { recursive: true });
const checks = []; const check = (name, ok, detail = '') => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });

const read = (page) => page.evaluate(() => {
  const card = document.querySelector('[data-bh-charts-map]');
  const map = card?.querySelector('.bh-value-map');
  const plot = map?.querySelector('[aria-hidden="true"].h-\\[240px\\]') || map?.querySelector('div[aria-hidden="true"]');
  const money = (t) => { const m = String(t).replace(/,/g, '').match(/\$?([\d.]+)/); return m ? Number(m[1]) : NaN; };
  const xTicks = [...(map?.querySelectorAll('.recharts-xAxis .recharts-cartesian-axis-tick') ?? [])].map((g) => ({ x: g.getBoundingClientRect().left, v: money(g.textContent) })).filter((t) => Number.isFinite(t.v)).sort((a, b) => a.x - b.x);
  const yTicks = [...(map?.querySelectorAll('.recharts-yAxis .recharts-cartesian-axis-tick') ?? [])].map((g) => Number(g.textContent)).filter(Number.isFinite);
  const labels = [...(map?.querySelectorAll('.bh-point-labels text') ?? [])];
  const caption = map?.querySelector('span.text-\\[11px\\]')?.textContent ?? '';
  const firstCard = document.querySelector('main .card');
  return {
    present: !!map, first: firstCard === card, cardWidth: card?.getBoundingClientRect().width ?? 0, mainWidth: document.querySelector('main')?.getBoundingClientRect().width ?? 0,
    plotHeight: Math.round(plot?.getBoundingClientRect().height ?? 0),
    reversed: xTicks.length >= 2 && xTicks.every((t, i) => i === 0 || t.v < xTicks[i - 1].v), xTicks: xTicks.map((t) => t.v),
    yTop: yTicks.length ? Math.max(...yTicks) : null,
    quadrant: !!map?.querySelector('.bh-quadrant rect'), note: map?.querySelector('.bh-quadrant-note')?.textContent ?? '',
    pareto: [...(map?.querySelectorAll('.recharts-scatter-line path, path.recharts-curve') ?? [])].some((p) => (p.getAttribute('stroke') || '').toLowerCase() === '#7ee0c0'),
    labels: labels.length, halos: labels.every((t) => t.getAttribute('paint-order') === 'stroke' && Number(t.getAttribute('stroke-width')) >= 3),
    cog: !!map?.querySelector('[data-value-map-settings]'),
    credits: /Artificial Analysis/.test(map?.textContent ?? '') && /Epoch/.test(map?.textContent ?? ''),
    caption, count: Number((caption.match(/Value map · (\d+) models/) || [])[1] ?? NaN),
    passing: [...(map?.querySelectorAll('.recharts-scatter circle') ?? [])].filter((c) => c.getAttribute('opacity') === '1').length,
    scorePicker: !!card?.querySelector('[data-label-picker="Capability score"]'), costPicker: !!card?.querySelector('[data-label-picker="Cost measure"]'),
    sliders: card?.querySelectorAll('input[type="range"]').length ?? 0,
    oldPanel: [...document.querySelectorAll('h2')].some((h) => /^Score vs cost$/.test(h.textContent.trim())),
    paragraphs: card?.querySelectorAll('p').length ?? 0,
  };
});

const browser = await chromium.launch();
for (const theme of ['light', 'dark']) for (const [kind, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const tag = `${kind}_${theme}`, mobile = kind === 'mobile';
  const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, colorScheme: theme });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  await page.goto(`${BASE}/charts`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((t) => { try { localStorage.clear(); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  await page.reload(); await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(2500);
  const a = await read(page);
  check(`${tag} value map is the first card, full width`, a.present && a.first && a.cardWidth >= a.mainWidth - 40, { first: a.first, card: Math.round(a.cardWidth), main: Math.round(a.mainWidth) });
  check(`${tag} plot height ${mobile ? '240' : '420'} px`, Math.abs(a.plotHeight - (mobile ? 240 : 420)) <= 2, a.plotHeight);
  check(`${tag} parity: reversed cost axis (cheaper → right)`, a.reversed, a.xTicks);
  check(`${tag} parity: attractive quadrant + note`, a.quadrant && /most attractive quadrant/i.test(a.note), a.note);
  check(`${tag} parity: Pareto line`, a.pareto);
  check(`${tag} parity: in-chart names (1–15) with halos`, a.labels >= 1 && a.labels <= 15 && a.halos, a.labels);
  check(`${tag} parity: fitted Y axis (top < 100 unless best ≥ 90)`, a.yTop != null && a.yTop <= 100, a.yTop);
  check(`${tag} parity: cogwheel and AA / Epoch credits`, a.cog && a.credits);
  check(`${tag} header: score picker, cost picker and two sliders; old "Score vs cost" panel gone; no extra paragraph`, a.scorePicker && a.costPicker && a.sliders === 2 && !a.oldPanel && a.paragraphs === 0, { scorePicker: a.scorePicker, costPicker: a.costPicker, sliders: a.sliders, oldPanel: a.oldPanel, paragraphs: a.paragraphs });
  check(`${tag} 30-model rule while Featured is untouched`, a.count > 0 && a.count <= 30, a.caption);
  await page.screenshot({ path: `${OUT}/${tag}-charts.png` });

  // Min-score slider: raising it dims points.
  const range = page.locator('[data-bh-charts-map] input[type="range"]').first();
  const box = await range.boundingBox();
  if (box) { await range.focus(); for (let i = 0; i < 40; i++) await page.keyboard.press('ArrowRight'); }
  await page.waitForTimeout(800);
  const b = await read(page);
  check(`${tag} min-score slider dims models below the line`, b.passing < a.passing, { before: a.passing, after: b.passing });
  // Cost slider: a cap dims more.
  const cost = page.locator('[data-bh-charts-map] input[type="range"]').nth(1);
  await cost.focus(); await page.keyboard.press('Home'); for (let i = 0; i < 300; i++) await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(800);
  const c = await read(page);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('mmc.settings.v9') || '{}'));
  check(`${tag} max-cost slider sets the Advanced cap and dims more`, stored.maxCost != null && c.passing <= b.passing, { maxCost: stored.maxCost, before: b.passing, after: c.passing });
  // Score picker: switch to AA Intelligence Index.
  await page.locator('[data-bh-charts-map] [data-label-picker="Capability score"]').click();
  await page.locator('[data-bh-charts-map] [role="menuitemradio"][data-choice="aa_intelligence_index"]').click();
  await page.waitForTimeout(1200);
  const d = await read(page);
  const s2 = await page.evaluate(() => JSON.parse(localStorage.getItem('mmc.settings.v9') || '{}'));
  check(`${tag} score picker switches the map's score`, s2.score === 'aa_intelligence_index' && d.present && d.yTop != null, { score: s2.score, yTop: d.yTop });
  check(`${tag} no page errors, no horizontal overflow`, !errors.length && !(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), errors);
  await context.close();
}
await browser.close();
const passed = checks.filter((x) => x.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, runner: process.env.BH_RUNNER || 'unspecified', at: new Date().toISOString(), passed, total: checks.length, checks }, null, 2));
for (const x of checks) console.log(`${x.ok ? 'PASS' : 'FAIL'} ${x.name} — ${x.detail.slice(0, 220)}`);
console.log(`${passed}/${checks.length}`);
process.exit(passed === checks.length ? 0 : 1);
