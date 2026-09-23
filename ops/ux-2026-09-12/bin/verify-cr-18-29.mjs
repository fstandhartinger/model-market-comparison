// CR-18 (data-derived Simple min-score default) + CR-29.1/29.2 (slider label = Benchmark Heaven Main Composite Score).
// Live at 1440/390, light/dark. Usage: node verify-cr-18-29.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-18-29';
await fs.mkdir(OUT, { recursive: true });
const goto = async (page, url) => { for (let a = 1; ; a++) { try { return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }); } catch (e) { if (a >= 3 || !/ERR_NETWORK_CHANGED|ERR_CONNECTION|ERR_TIMED_OUT|Timeout|ERR_INTERNET/.test(String(e))) throw e; await new Promise((r) => setTimeout(r, 3000 * a)); } } };
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });

const slider = (page) => page.locator('input[type=range][aria-label^="Minimum Capability Score"]').first();
const rows = (page) => page.evaluate(() => [...document.querySelectorAll('tr.bh-ranking-row')].filter((r) => r.offsetParent)
  .map((r) => ({ id: r.dataset.modelId, cost: r.dataset.cost == null ? null : Number(r.dataset.cost), score: r.dataset.score == null ? null : Number(r.dataset.score) })));

const browser = await chromium.launch();
for (const theme of ['light', 'dark']) for (const [kind, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const tag = `${kind}_${theme}`, mobile = kind === 'mobile';
  const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, colorScheme: theme });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  await goto(page, `${BASE}/`);
  await page.evaluate((t) => { try { localStorage.clear(); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  await page.reload().catch(async () => { await new Promise((r) => setTimeout(r, 3000)); await page.reload(); }); await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1500);

  const value = Number(await slider(page).inputValue());
  const r = await rows(page);
  const priced = r.filter((x) => x.cost != null && x.cost > 0 && x.score != null);
  const minCost = Math.min(...priced.map((x) => x.cost));
  const anchor = priced.filter((x) => x.cost === minCost).sort((a, b) => b.score - a.score)[0];
  check(`${tag} CR-18.2 untouched default is at least 65`, value >= 65, `slider=${value}`);
  check(`${tag} CR-18.1 default = floor(score of the cheapest listed model), or the 65 floor`, anchor && (value === Math.max(65, Math.floor(anchor.score))), { value, anchor });
  check(`${tag} CR-18.3 every listed row passes the slider value (table uses the same floor)`, r.length > 0 && r.every((x) => x.score != null && x.score >= value), { rows: r.length, below: r.filter((x) => !(x.score >= value)).slice(0, 3) });
  check(`${tag} CR-18.1 the cheapest listed model is on screen (on the Pareto line: nothing cheaper passes)`, !!anchor && anchor.score >= value, anchor);
  // 2026-09-23 (iteration 180): `text=/models pass/` resolves to the narrowest node containing the
  // phrase, which since the copy became "25 of 30 models pass · 5 below your score line" is a span
  // reading only "models pass" — so the count was outside the element this read and the check failed
  // on a page that states it. Read from the containing block, and accept either form of the sentence.
  const summary = await page.locator('text=/models pass/').first()
    .evaluate((el) => (el.closest('p,div,section') ?? el).innerText.replace(/\s+/g, ' ').trim()).catch(() => '');
  check(`${tag} CR-18.3 summary reports how many models pass`, /\d+(\s+of\s+\d+)?\s+models pass/.test(summary), summary.slice(0, 200));

  // CR-29.1/29.2: two-line label naming the Main Composite Score; aria label and (i) say the same.
  const sub = await page.locator('[data-min-score-sub]').first().innerText().catch(() => '');
  const aria = await slider(page).getAttribute('aria-label');
  check(`${tag} CR-29.1 second line reads (Benchmark Heaven Main Composite Score)`, sub.trim() === '(Benchmark Heaven Main Composite Score)', sub);
  check(`${tag} CR-29.1 slider accessible name`, aria === 'Minimum Capability Score (Benchmark Heaven Main Composite Score)', aria);
  const title = await page.evaluate(() => { const s = document.querySelector('[data-min-score-sub]'); const t = s?.previousElementSibling?.previousElementSibling; return t?.textContent || ''; });
  check(`${tag} CR-29.1 first line reads Minimum Capability Score`, /Minimum Capability Score/.test(title), title);
  const subBox = await page.locator('[data-min-score-sub]').first().boundingBox();
  const vw = viewport.width;
  check(`${tag} CR-29.1 label lines stay inside the viewport`, subBox && subBox.x >= 0 && subBox.x + subBox.width <= vw + 1, subBox);
  const heroKey = await page.locator('tr.bh-matrix-hero').first().getAttribute('data-score').catch(() => null);
  check(`${tag} CR-29.2 score row below uses the same key as the slider (composite)`, heroKey === 'composite', heroKey);
  await page.locator('[data-min-score-sub]').first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${OUT}/${tag}-default.png` });

  // A hand-set value wins, persists, and reset returns to the derived default.
  await slider(page).focus();
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(500);
  const moved = Number(await slider(page).inputValue());
  check(`${tag} CR-18.3 touching the slider overrides the default`, moved === value + 3 || moved > value, { value, moved });
  await page.reload().catch(async () => { await new Promise((r) => setTimeout(r, 3000)); await page.reload(); }); await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1500);
  const kept = Number(await slider(page).inputValue());
  check(`${tag} CR-18.3 the hand-set value persists across reload`, kept === moved, { moved, kept });
  await page.evaluate(() => { try { const k = 'mmc.settings.v9'; const s = JSON.parse(localStorage.getItem(k)); s.minScoreTouched = false; localStorage.setItem(k, JSON.stringify(s)); } catch {} });
  await page.reload().catch(async () => { await new Promise((r) => setTimeout(r, 3000)); await page.reload(); }); await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1500);
  check(`${tag} CR-18.3 untouched again → back to the derived default`, Number(await slider(page).inputValue()) === value, '');

  // Advanced is unchanged: no score floor chip by default.
  await page.getByRole('tab', { name: 'Advanced' }).first().click().catch(() => {}); await page.waitForTimeout(800);
  check(`${tag} CR-18.3 Advanced applies no score floor by default`, (await page.locator('[data-floor-chip=score]').count()) === 0, '');
  check(`${tag} no page errors`, !errors.length, errors);
  await context.close();
}
await browser.close();
const passed = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, runner: process.env.BH_RUNNER || 'unspecified', at: new Date().toISOString(), passed, total: checks.length, checks }, null, 2));
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name} — ${c.detail.slice(0, 220)}`);
console.log(`${passed}/${checks.length}`);
process.exit(passed === checks.length ? 0 : 1);
