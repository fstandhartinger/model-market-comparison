// CR-32.1 (score picker at Simple's slider label) and CR-32.2 (cost-measure picker at the cost label).
// Live at 1440/390, light/dark. Usage: node verify-cr-32-1-2.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-32-1-2';
await fs.mkdir(OUT, { recursive: true });
const goto = async (page, url) => { for (let a = 1; ; a++) { try { return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }); } catch (e) { if (a >= 3 || !/ERR_NETWORK_CHANGED|ERR_CONNECTION|ERR_TIMED_OUT|Timeout|ERR_INTERNET/.test(String(e))) throw e; await new Promise((r) => setTimeout(r, 3000 * a)); } } };
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const settle = async (page) => { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1500); };
const alpha = (c) => { const m = String(c).match(/rgba?\(([^)]+)\)/); if (!m) return 1; const p = m[1].split(/[ ,/]+/).filter(Boolean); return p.length >= 4 ? Number(p[3]) : 1; };

const browser = await chromium.launch();
for (const theme of ['light', 'dark']) for (const [kind, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const tag = `${kind}_${theme}`, mobile = kind === 'mobile';
  const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, colorScheme: theme });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  await goto(page, `${BASE}/`);
  await page.evaluate((t) => { try { localStorage.clear(); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  await page.reload().catch(async () => { await new Promise((r) => setTimeout(r, 3000)); await page.reload(); }); await settle(page);

  // CR-32.1: score picker.
  const scoreBtn = page.locator('[data-label-picker="Capability score"]');
  check(`${tag} CR-32.1 the capability label carries a ▼ picker`, (await scoreBtn.count()) === 1 && /▼/.test(await scoreBtn.innerText()), await scoreBtn.innerText().catch(() => ''));
  await scoreBtn.click(); await page.waitForTimeout(250);
  const menu = page.locator('[role=menu][aria-label="Capability score"]');
  const menuInfo = await menu.evaluate((el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); const top = document.elementFromPoint(r.left + 20, r.top + 12); return { items: [...el.querySelectorAll('[role=menuitemradio]')].map((b) => b.textContent), bg: cs.backgroundColor, onTop: el.contains(top), inView: r.left >= 0 && r.right <= innerWidth + 1 }; }).catch(() => null);
  check(`${tag} CR-32.1 popup lists Main Composite first plus AA, Epoch and DesignArena scores; opaque, on top, in view`,
    menuInfo && /Main Composite/.test(menuInfo.items[0]) && menuInfo.items.some((t) => /Intelligence Index/.test(t)) && menuInfo.items.some((t) => /ECI/.test(t)) && menuInfo.items.some((t) => /DesignArena/.test(t)) && alpha(menuInfo.bg) === 1 && menuInfo.onTop && menuInfo.inView, menuInfo);
  await page.screenshot({ path: `${OUT}/${tag}-score-menu.png` });
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  check(`${tag} CR-32.1 Escape closes the popup`, (await menu.count()) === 0, '');
  await scoreBtn.click(); await page.locator('[role=menuitemradio][data-choice=aa_intelligence_index]').click(); await page.waitForTimeout(1200);
  const after = await page.evaluate(() => ({
    sub: document.querySelector('[data-min-score-sub]')?.textContent,
    hero: [...document.querySelectorAll('#benchmarks tr.bh-matrix-hero')].map((tr) => tr.dataset.score),
    slider: Number(document.querySelector('input[type=range][aria-label^="Minimum Capability Score"]')?.value),
    yTop: Math.max(...[...document.querySelectorAll('.bh-value-map .recharts-yAxis .recharts-cartesian-axis-tick-value')].map((t) => Number(t.textContent))),
    header: [...document.querySelectorAll('thead th')].map((th) => th.textContent).find((t) => /Score/.test(t)) ?? '',
  }));
  check(`${tag} CR-32.1 choosing AA Intelligence Index drives label, score rows, slider scale, value map and table header`,
    /AA Intelligence/.test(after.sub) && after.hero[0] === 'composite' && after.hero[1] === 'aa_intelligence_index' && after.slider < 86 && after.yTop < 100 && /AA Intelligence/.test(after.header), after);
  await page.reload(); await settle(page);
  check(`${tag} CR-32.1 the chosen score persists like other settings`, /AA Intelligence/.test(await page.locator('[data-min-score-sub]').first().innerText().catch(() => '')), '');

  // CR-32.2: cost measure picker.
  const costBtn = page.locator('[data-label-picker="Cost measure"]');
  check(`${tag} CR-32.2 the cost label carries a ▼ picker`, (await costBtn.count()) === 1 && /Max adjusted cost/i.test(await costBtn.innerText()), await costBtn.innerText().catch(() => ''));
  const costOf = () => page.evaluate(() => [...document.querySelectorAll('tr.bh-ranking-row')].filter((r) => r.offsetParent).slice(0, 5).map((r) => Number(r.dataset.cost)));
  const before = await costOf();
  await costBtn.click(); await page.waitForTimeout(250);
  const items = await page.locator('[role=menu][aria-label="Cost measure"] [role=menuitemradio]').allInnerTexts();
  check(`${tag} CR-32.2 popup offers adjusted, blended, input and output price measures`, items.length === 4 && /Adjusted/.test(items[0]) && items.some((t) => /Blended/.test(t)) && items.some((t) => /^Input price/.test(t)) && items.some((t) => /^Output price/.test(t)), items);
  await page.locator('[role=menuitemradio][data-choice=input]').click(); await page.waitForTimeout(1200);
  const label = await costBtn.innerText();
  const input = await costOf();
  const headerSub = await page.evaluate(() => [...document.querySelectorAll('thead th')].map((th) => th.textContent).find((t) => /Cost|Price/i.test(t)) ?? '');
  check(`${tag} CR-32.2 'Input price / 1M tokens' changes the label, the cap (no limit) and the table's cost column`,
    /input price/i.test(label) && /no limit/.test(await page.locator('text=/no limit/').first().innerText().catch(() => '')) && JSON.stringify(input) !== JSON.stringify(before) && input.every((v) => Number.isFinite(v)), { label, before, input, headerSub });
  await page.screenshot({ path: `${OUT}/${tag}-cost-input.png` });
  await costBtn.click(); await page.locator('[role=menuitemradio][data-choice=adjusted]').click(); await page.waitForTimeout(1000);
  check(`${tag} CR-32.2 back to adjusted cost restores the adjusted values`, JSON.stringify(await costOf()) !== JSON.stringify(input) && /adjusted/i.test(await costBtn.innerText()), '');
  check(`${tag} no page errors`, !errors.length, errors);
  await context.close();
}
await browser.close();
const passed = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, runner: process.env.BH_RUNNER || 'unspecified', at: new Date().toISOString(), passed, total: checks.length, checks }, null, 2));
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name} — ${c.detail.slice(0, 220)}`);
console.log(`${passed}/${checks.length}`);
process.exit(passed === checks.length ? 0 : 1);
