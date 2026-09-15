// CR-35.1 (Artificial Analysis attribution on every AA surface), CR-35.2 (BETA — Work in progress tag) and
// CR-35.4 (Epoch AI CC BY credit on every Epoch surface, citation on /about).
// Live at 1440/390, light/dark. Usage: node verify-cr-35.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-35';
await fs.mkdir(OUT, { recursive: true });
const goto = async (page, url) => { for (let a = 1; ; a++) { try { return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }); } catch (e) { if (a >= 3 || !/ERR_NETWORK_CHANGED|ERR_CONNECTION|ERR_TIMED_OUT|Timeout|ERR_INTERNET/.test(String(e))) throw e; await new Promise((r) => setTimeout(r, 3000 * a)); } } };
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const settle = async (page) => { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1800); };
const AA = 'https://artificialanalysis.ai/';
const EPOCH = 'https://epoch.ai/eci', CCBY = 'https://creativecommons.org/licenses/by/4.0/';
const epochCredits = (page, scope) => page.evaluate(({ scope, EPOCH, CCBY }) => [...document.querySelectorAll(`${scope} [data-epoch-credit]`)].filter((el) => [...el.querySelectorAll('a')].some((a) => a.href === EPOCH) && [...el.querySelectorAll('a')].some((a) => a.href === CCBY)).length, { scope, EPOCH, CCBY });
const credits = (page, scope) => page.evaluate(({ scope, AA }) => [...document.querySelectorAll(`${scope} [data-aa-credit] a`)].filter((a) => a.href === AA && /Artificial Analysis/.test(a.textContent)).length, { scope, AA });

const browser = await chromium.launch();
for (const theme of ['light', 'dark']) for (const [kind, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const tag = `${kind}_${theme}`, mobile = kind === 'mobile';
  const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, colorScheme: theme });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  await goto(page, `${BASE}/`);
  await page.evaluate((t) => { try { localStorage.clear(); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  await page.reload().catch(async () => { await new Promise((r) => setTimeout(r, 3000)); await page.reload(); }); await settle(page);

  // CR-35.2: BETA tag beside the logo, no header overflow, note on hover/tap.
  const beta = page.locator('header [data-beta-tag]');
  const geo = await page.evaluate(() => { const b = document.querySelector('header [data-beta-tag]'); const h = document.querySelector('header'); if (!b) return null; const r = b.getBoundingClientRect(); return { text: b.textContent, left: r.left, right: r.right, vw: innerWidth, headerOverflow: h.scrollWidth > h.clientWidth + 1, docOverflow: document.documentElement.scrollWidth > innerWidth + 1 }; });
  check(`${tag} CR-35.2 BETA tag visible in the header without overflow`, geo && /^BETA/.test(geo.text) && (mobile || /Work in progress/.test(geo.text)) && geo.right <= geo.vw && !geo.headerOverflow && !geo.docOverflow, geo);
  // tap() sends touch pointer events; click() in a touch-emulated context still sends mouse events, whose hover
  // handler opens the note before the click toggles it — not what a phone does.
  if (mobile) await beta.tap(); else await beta.hover();
  await page.waitForTimeout(300);
  const note = await page.locator('#bh-beta-note').innerText().catch(() => '');
  const noteBg = await page.locator('#bh-beta-note').evaluate((el) => getComputedStyle(el).backgroundColor).catch(() => '');
  check(`${tag} CR-35.2 hover/tap explains the tag (opaque)`, /under construction; data and features change daily/.test(note) && !/rgba\(.*, 0\)/.test(noteBg), note);
  await page.screenshot({ path: `${OUT}/${tag}-beta.png`, clip: { x: 0, y: 0, width: viewport.width, height: 160 } });
  await page.keyboard.press('Escape'); await page.mouse.click(viewport.width - 5, viewport.height - 5).catch(() => {});

  // CR-35.1 on the home page: footer, value map, column chart, Simple table footnote, score tooltip.
  check(`${tag} CR-35.1 footer credit (linked)`, (await credits(page, 'footer')) >= 1, '');
  check(`${tag} CR-35.4 footer Epoch AI (CC BY) credit with licence link`, (await epochCredits(page, 'footer')) >= 1, '');
  check(`${tag} CR-35.4 value map and column chart carry the Epoch credit`, (await epochCredits(page, '.bh-value-map')) >= 1 && (await epochCredits(page, '[data-shortlist-columns]')) >= 1, '');
  check(`${tag} CR-35.1 value map credit`, (await credits(page, '.bh-value-map')) >= 1, '');
  check(`${tag} CR-35.1 shortlist column chart credit`, (await credits(page, '[data-shortlist-columns]')) >= 1, '');
  check(`${tag} CR-35.1 Simple benchmark table credit`, (await credits(page, '#benchmarks')) >= 1, '');
  const tipBtn = page.getByRole('button', { name: /About the minimum capability score setting/ }).first();
  if (mobile) { await tipBtn.click(); await page.waitForTimeout(300); } else { await tipBtn.hover(); await page.waitForTimeout(300); }
  const tipCredit = await page.evaluate((AA) => [...document.querySelectorAll('[role=tooltip] [data-aa-credit] a, dialog[open] [data-aa-credit] a')].some((a) => a.href === AA), AA);
  check(`${tag} CR-35.1 capability score tooltip credit`, tipCredit, '');
  if (mobile) await page.keyboard.press('Escape');

  // Other AA surfaces.
  for (const [path, scope, label] of [['/compare', '#benchmark-radar', 'compare radar'], ['/benchmarks', 'main', 'benchmarks matrix'], ['/benchmaxxing', '.bh-page-head', 'Benchmaxxing page'], ['/about', 'main', 'about/method'], ['/models/' + encodeURIComponent('gpt-6-astra::high'), 'main', 'model page']]) {
    await goto(page, `${BASE}${path}`); await settle(page);
    check(`${tag} CR-35.1 ${label} credit`, (await credits(page, scope)) >= 1 && (await credits(page, 'footer')) >= 1, path);
    if (label === 'compare radar' || label === 'model page') check(`${tag} CR-35.4 ${label} Epoch credit`, (await epochCredits(page, scope)) >= 1, path);
    if (label === 'about/method') check(`${tag} CR-35.4 /about carries Epoch's recommended citation`, /Epoch AI, .Epoch Capabilities Index.\. Published online at epoch\.ai/.test(await page.locator('[data-epoch-citation]').innerText().catch(() => '')), '');
  }
  check(`${tag} no page errors`, !errors.length, errors);
  await context.close();
}
await browser.close();
const passed = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, runner: process.env.BH_RUNNER || 'unspecified', at: new Date().toISOString(), passed, total: checks.length, checks }, null, 2));
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name} — ${c.detail.slice(0, 220)}`);
console.log(`${passed}/${checks.length}`);
process.exit(passed === checks.length ? 0 : 1);
