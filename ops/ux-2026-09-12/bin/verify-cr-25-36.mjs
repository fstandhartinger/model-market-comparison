// CR-25.4 / CR-25.5 / CR-36.3 (design F-94): the Options panel's section order, the three positively worded regional
// rows (four chips each, all pressed on a fresh load, no (i)), the Models · Providers · Labs comboboxes (popover
// ≤ 320 px with internal scroll at desktop, bottom sheet on phones, search, All · None, keyboard Escape), the lab
// filter, and that a stored pre-CR-25.4 "EU-hosted only" setting gives the same result as the chips.
// Usage: BH_RUNNER=<engine> node verify-cr-25-36.mjs <base> <outdir>   (1440/390, light/dark)
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-25-36';
await fs.mkdir(OUT, { recursive: true });
const checks = []; const check = (name, ok, detail = '') => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const KEY = 'mmc.settings.v9';

const openOptions = async (page) => {
  await page.evaluate(() => {
    const visible = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const b = [...document.querySelectorAll('[data-bh-filters-toggle], header button[aria-controls="global-filters"]')].find(visible);
    b?.click();
  });
  await page.locator('#global-filters').waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(400);
};
const count = async (page) => {
  const t = await page.locator('#global-filters').getByRole('button', { name: /^Show \d+ models$/ }).first().textContent().catch(() => null);
  return t ? Number(t.match(/\d+/)[0]) : null;
};
const trigger = (page, label) => page.locator(`#global-filters [data-bh-combobox-trigger="${label}"]`);

const browser = await chromium.launch();
for (const theme of ['light', 'dark']) for (const [kind, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const tag = `${kind}_${theme}`, mobile = kind === 'mobile';
  const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, colorScheme: theme });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((t) => { try { localStorage.clear(); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  await page.reload(); await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1500);
  await openOptions(page);
  const panel = page.locator('#global-filters');
  check(`${tag} Options panel opens`, await panel.isVisible());

  // F-94.1 section order
  const titles = await panel.locator('span.uppercase, summary').allTextContents();
  const want = ['Ranking', 'Price basis', 'Models, providers and labs', 'Regional', 'Data confidentiality', 'More settings'];
  const got = titles.map((t) => t.trim()).filter((t) => want.some((w) => w.toLowerCase() === t.toLowerCase()));
  check(`${tag} F-94.1 section order Ranking · Price basis · Models, providers and labs · Regional · Data confidentiality · More settings`, got.map((t) => t.toLowerCase()).join('|') === want.map((w) => w.toLowerCase()).join('|'), got);
  const priceBasis = await panel.evaluate((el) => {
    const title = [...el.querySelectorAll('span.uppercase')].find((s) => /price basis/i.test(s.textContent));
    return title?.parentElement?.parentElement?.textContent ?? '';
  });
  check(`${tag} CR-25.3 "I'm buying for a company" stays in Price basis`, /buying for a company/i.test(priceBasis), priceBasis.slice(0, 120));

  // CR-25.4 regional rows
  const rows = await panel.evaluate(() => ['Hosted in', 'Provider company based in', 'Model lab based in'].map((label) => {
    const g = document.querySelector(`#global-filters [role="group"][aria-label="${label}"]`);
    const chips = g ? [...g.querySelectorAll('button')] : [];
    return { label, chips: chips.map((c) => c.textContent.replace('✓', '').trim()), pressed: chips.filter((c) => c.getAttribute('aria-pressed') === 'true').length };
  }));
  check(`${tag} CR-25.4 three regional rows, chips China · EU · US · Other, all pressed on a fresh load`, rows.every((r) => r.chips.join('|') === 'China|EU|US|Other' && r.pressed === 4), rows);
  const panelText = await panel.innerText();
  check(`${tag} CR-25.4 the former switches and the EU-hosted (i) are gone`, !/Exclude Chinese providers|EU-hosted only|Non-US provider only/.test(panelText) && !(await panel.getByRole('button', { name: 'About the EU-hosted filter' }).count()), '');
  check(`${tag} CR-25.4 one muted line explains hosting vs company`, /Hosting = where inference runs; company = where the provider or lab is registered\./.test(panelText));
  const box = await panel.boundingBox();
  if (!mobile) check(`${tag} F-94 Options popover ≤ 600 px tall with comboboxes closed`, box && box.height <= 600, box && Math.round(box.height));
  else check(`${tag} F-94 Options sheet is not wider than the viewport`, box && box.width <= viewport.width + 1, box && Math.round(box.width));
  await page.screenshot({ path: `${OUT}/${tag}-options.png` });

  // CR-25.5 triggers
  const triggers = await Promise.all(['Models', 'Providers', 'Labs'].map(async (l) => (await trigger(page, l).textContent().catch(() => '')).replace('▾', '').trim()));
  check(`${tag} CR-25.5 Models · Providers · Labs comboboxes read "All" on a fresh load`, triggers.join('|') === 'Models: All|Providers: All|Labs: All', triggers);
  const base = await count(page);

  // CR-36.3 Providers popover
  await trigger(page, 'Providers').scrollIntoViewIfNeeded();
  await trigger(page, 'Providers').click(); await page.waitForTimeout(400);
  const pop = page.locator('div[data-bh-combobox]:has([role="listbox"])');
  const pb = await pop.boundingBox();
  const scroll = await page.locator('[role="listbox"][aria-label="Providers"]').evaluate((el) => ({ sh: el.scrollHeight, ch: el.clientHeight, n: el.querySelectorAll('[role="option"]').length, bg: getComputedStyle(el.closest('[data-bh-combobox]')).backgroundColor }));
  if (!mobile) check(`${tag} CR-36.3 Providers popover ≤ 320 px, inside the viewport, list scrolls inside`, pb && pb.height <= 320.5 && pb.y >= 0 && pb.y + pb.height <= viewport.height && pb.width >= 280 && scroll.sh > scroll.ch, { box: pb, scroll });
  else check(`${tag} CR-36.3 Providers list is a full-width bottom sheet that scrolls inside`, pb && Math.abs(pb.width - viewport.width) <= 1 && Math.abs(pb.y + pb.height - viewport.height) <= 2 && scroll.sh > scroll.ch, { box: pb, scroll });
  check(`${tag} CR-36.3 popover is opaque`, !/rgba\(.*,\s*0(\.\d+)?\)$/.test(scroll.bg) && scroll.bg !== 'transparent', scroll.bg);
  await page.screenshot({ path: `${OUT}/${tag}-providers-open.png` });
  await page.getByRole('textbox', { name: 'Search providers' }).fill('chutes'); await page.waitForTimeout(250);
  const filtered = await page.locator('[role="listbox"][aria-label="Providers"] [role="option"]').count();
  check(`${tag} CR-36.3 typing filters the list`, filtered >= 1 && filtered < scroll.n, { before: scroll.n, after: filtered });
  await page.getByRole('textbox', { name: 'Search providers' }).fill('');
  await pop.getByRole('button', { name: 'None', exact: true }).click();
  await page.locator('[role="listbox"][aria-label="Providers"] [role="option"]').first().click(); await page.waitForTimeout(300);
  const one = (await trigger(page, 'Providers').textContent()).replace('▾', '').trim();
  check(`${tag} CR-36.3 None then one pick selects exactly one provider`, /^Providers: 1 of \d+$/.test(one), one);
  await page.getByRole('textbox', { name: 'Search providers' }).focus();
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  check(`${tag} CR-36.3 Escape closes the list, not the Options panel, and returns focus to the trigger`, !(await pop.count()) && await panel.isVisible() && await page.evaluate(() => document.activeElement?.getAttribute('data-bh-combobox-trigger') === 'Providers'));
  await trigger(page, 'Providers').click(); await page.waitForTimeout(250);
  await pop.getByRole('button', { name: 'All', exact: true }).click(); await page.waitForTimeout(200);
  await page.keyboard.press('Escape'); await page.waitForTimeout(250);
  check(`${tag} CR-36.3 All restores every provider`, /Providers: All/.test(await trigger(page, 'Providers').textContent()));

  // CR-25.5 Labs filter
  await trigger(page, 'Labs').click(); await page.waitForTimeout(300);
  await pop.getByRole('button', { name: 'None', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search labs' }).fill('Anthropic'); await page.waitForTimeout(200);
  await page.locator('[role="listbox"][aria-label="Labs"] [role="option"]', { hasText: 'Anthropic' }).first().click(); await page.waitForTimeout(500);
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  const labsStored = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || '{}').labs, KEY);
  const labCount = await count(page);
  check(`${tag} CR-25.5 Labs: picking one lab stores it and narrows the result`, JSON.stringify(labsStored) === '["Anthropic"]' && /Labs: 1 of \d+/.test(await trigger(page, 'Labs').textContent()) && (base == null || (labCount != null && labCount < base)), { labsStored, base, labCount });
  await panel.getByRole('button', { name: 'Reset', exact: true }).click(); await page.waitForTimeout(500);

  // CR-25.4 chips ⇔ migrated legacy switch
  for (const b of ['China', 'US', 'Other']) await panel.getByRole('button', { name: `Hosted in ${b}`, exact: true }).click();
  await page.waitForTimeout(600);
  const chipCount = await count(page);
  const hostedStored = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || '{}').hostedIn, KEY);
  check(`${tag} CR-25.4 Hosted in EU only is stored as ["EU"]`, JSON.stringify(hostedStored) === '["EU"]', hostedStored);
  // The last pressed chip cannot be released.
  await panel.getByRole('button', { name: 'Hosted in EU', exact: true }).click(); await page.waitForTimeout(300);
  check(`${tag} CR-25.4 the last pressed chip stays pressed`, (await panel.getByRole('button', { name: 'Hosted in EU', exact: true }).getAttribute('aria-pressed')) === 'true');
  await page.evaluate((k) => {
    const s = JSON.parse(localStorage.getItem(k) || '{}');
    delete s.hostedIn; delete s.providerBasedIn; delete s.labBasedIn; delete s.labs;
    s.euHostedOnly = true; s.excludeChinese = false; s.nonUsOnly = false;
    localStorage.setItem(k, JSON.stringify(s));
  }, KEY);
  await page.reload(); await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1500);
  await openOptions(page);
  const legacyCount = await count(page);
  const migrated = await page.evaluate(() => [...document.querySelectorAll('#global-filters [role="group"][aria-label="Hosted in"] button[aria-pressed="true"]')].map((b) => b.textContent.replace('✓', '').trim()));
  check(`${tag} CR-25.4 a stored pre-CR-25.4 "EU-hosted only" loads as Hosted in EU with the same result`, migrated.join('|') === 'EU' && chipCount === legacyCount, { migrated, chipCount, legacyCount });
  await panel.getByRole('button', { name: 'Reset', exact: true }).click().catch(() => {});
  await page.waitForTimeout(400);

  check(`${tag} no page errors, no horizontal overflow`, errors.length === 0 && !(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), errors);
  await context.close();
}
await browser.close();
const passed = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, runner: process.env.BH_RUNNER || 'unspecified', at: new Date().toISOString(), passed, total: checks.length, checks }, null, 2));
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name} — ${c.detail.slice(0, 220)}`);
console.log(`${passed}/${checks.length}`);
process.exit(passed === checks.length ? 0 : 1);
