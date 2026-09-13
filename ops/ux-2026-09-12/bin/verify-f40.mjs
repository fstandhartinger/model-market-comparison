// F-40 acceptance: Simple's floor/cap stay in Simple; Advanced and Guided use their own pair.
// Usage: node verify-f40.mjs <base> <out>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = process.argv[2] || 'https://benchmarkheaven.com';
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/iter29-f40/live';
await fs.mkdir(OUT, { recursive: true });
const b = await chromium.launch();
const out = { base: BASE, checked_at: new Date().toISOString(), fails: [] };
const expect = (k, ok, detail) => { out[k] = { ok, detail }; if (!ok) out.fails.push(k); };

const count = (p) => p.evaluate(() => {
  // Scoped to the mode section: the hero line also says "841 models".
  const m = document.querySelector('section[aria-label="Recommendation mode"]').innerText.match(/(?<!Show )(\d+) models( · filtered)?/);
  return m ? { n: Number(m[1]), filtered: !!m[2] } : null;
});
const simpleRows = (p) => p.evaluate(() => document.querySelectorAll('table[aria-label="Model ranking"] tbody tr').length);
const chips = (p) => p.evaluate(() => [...document.querySelectorAll('[data-floor-chip]')].filter((e) => e.offsetParent).map((e) => e.innerText.trim()));
const tab = async (p, name) => { await p.getByRole('tab', { name }).click(); await p.waitForTimeout(900); };

for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  // Baseline: a fresh Advanced session.
  let c = await b.newContext({ viewport: vp, isMobile: kind === 'mobile' }); let p = await c.newPage();
  await p.goto(BASE + '/', { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
  const simpleFresh = { rows: await simpleRows(p), value: await p.getByLabel(/Minimum Capability Score/).first().inputValue() };
  await tab(p, 'Advanced');
  const advFresh = await count(p);
  await c.close();

  // Reproduction: fresh → Simple → ← then → on the score slider → Advanced.
  c = await b.newContext({ viewport: vp, isMobile: kind === 'mobile' }); p = await c.newPage();
  await p.goto(BASE + '/', { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
  const slider = p.getByLabel(/Minimum Capability Score/).first();
  await slider.focus(); await p.keyboard.press('ArrowLeft'); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(400);
  await tab(p, 'Advanced');
  const advAfter = await count(p);
  expect(`${kind}/Advanced row count unchanged after touching Simple slider`, advAfter && advFresh && advAfter.n === advFresh.n && !advAfter.filtered, { advFresh, advAfter });
  expect(`${kind}/no floor chip in Advanced after touching Simple slider`, (await chips(p)).length === 0, await chips(p));
  await p.screenshot({ path: `${OUT}/${kind}-advanced-after-simple-touch.png` });

  if (kind === 'desktop') {
    await p.getByLabel('Max $/task').first().fill('5'); await p.waitForTimeout(500);
    const advCapped = await count(p);
    await tab(p, 'Simple');
    const costSlider = await p.getByLabel(/^Maximum /).first().inputValue();
    expect('desktop/Advanced Max $/task = 5 does not move Simple cost slider', costSlider === '1000', { costSlider, advCapped });
  } else {
    await tab(p, 'Simple');
  }
  const simpleAfter = { rows: await simpleRows(p), value: await p.getByLabel(/Minimum Capability Score/).first().inputValue() };
  expect(`${kind}/Simple still 85 with the same rows`, simpleAfter.value === '85' && simpleAfter.rows === simpleFresh.rows, { simpleFresh, simpleAfter });
  await c.close();

  // Guided with a 3-month intelligence floor → results → Open in Advanced → chip → × restores.
  c = await b.newContext({ viewport: vp, isMobile: kind === 'mobile' }); p = await c.newPage();
  await p.goto(BASE + '/', { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
  await tab(p, 'Guided');
  await p.getByRole('button', { name: 'Continue →' }).click();
  await p.getByRole('button', { name: 'Continue →' }).click();
  await p.getByRole('button', { name: '3 mo' }).first().click();
  await p.getByRole('button', { name: 'Continue →' }).click();
  await p.getByRole('button', { name: 'See the models →' }).click(); await p.waitForTimeout(900);
  const guidedText = await p.evaluate(() => document.body.innerText.match(/Intelligence ≥ [\d.]+/)?.[0] ?? null);
  // No floor = the range sits at its minimum (the pool's lowest score) and the caption reads "any".
  const guidedSlider = await p.getByLabel(/Minimum Capability Score/).first().evaluate((e) => ({ value: e.value, min: e.min, caption: e.closest('div')?.parentElement?.innerText ?? '' })).catch(() => null);
  expect(`${kind}/Guided results show the intelligence floor and no inherited Simple floor`, !!guidedText && guidedSlider && guidedSlider.value === guidedSlider.min, { guidedText, guidedSlider });
  await p.screenshot({ path: `${OUT}/${kind}-guided-results.png` });
  await p.getByRole('button', { name: 'Open in Advanced' }).click(); await p.waitForTimeout(900);
  const advChips = await chips(p); const advGuided = await count(p);
  expect(`${kind}/Advanced after Guided shows a removable floor chip`, advChips.some((t) => /^Intelligence ≥/.test(t)) && advGuided.n < advFresh.n, { advChips, advGuided, advFresh });
  await p.screenshot({ path: `${OUT}/${kind}-advanced-after-guided.png` });
  await p.locator('[data-floor-chip="intelligence"]:visible').first().click(); await p.waitForTimeout(700);
  const advCleared = await count(p);
  expect(`${kind}/removing the chip restores the full catalog`, advCleared.n === advFresh.n && (await chips(p)).length === 0, { advCleared, advFresh });
  await tab(p, 'Simple');
  const simpleAfterGuided = { rows: await simpleRows(p), value: await p.getByLabel(/Minimum Capability Score/).first().inputValue() };
  expect(`${kind}/Simple untouched by Guided`, simpleAfterGuided.value === '85' && simpleAfterGuided.rows === simpleFresh.rows, { simpleFresh, simpleAfterGuided });
  await c.close();
}
await b.close();
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify(out, null, 2));
console.log(JSON.stringify({ fails: out.fails, checks: Object.keys(out).length - 3 }, null, 1));
