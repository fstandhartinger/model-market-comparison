// CR-19.2 (compare radar zooms to the pair, honest ring labels, full-scale toggle) and CR-21.1 (one Benchmaxxing
// row per model family, one verdict). Live at 1440/390, light/dark. Usage: node verify-cr-19-2-21-1.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-19-2-21-1';
await fs.mkdir(OUT, { recursive: true });
const goto = async (page, url) => { for (let a = 1; ; a++) { try { return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }); } catch (e) { if (a >= 3 || !/ERR_NETWORK_CHANGED|ERR_CONNECTION|ERR_TIMED_OUT|Timeout|ERR_INTERNET/.test(String(e))) throw e; await new Promise((r) => setTimeout(r, 3000 * a)); } } };
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const settle = async (page) => { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1500); };

// Family of every model id, from the deployed per-model API list.
const models = (await (await fetch(`${BASE}/api/models?score=composite`)).json()).models ?? [];
const familyOf = new Map(models.map((m) => [m.id, m.family_key]));
const nameFamily = new Map(models.map((m) => [m.display_name, m.family_key]));

const browser = await chromium.launch();
for (const theme of ['light', 'dark']) for (const [kind, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const tag = `${kind}_${theme}`, mobile = kind === 'mobile';
  const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, colorScheme: theme });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  await goto(page, `${BASE}/compare`);
  await page.evaluate((t) => { try { localStorage.clear(); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  await page.reload().catch(async () => { await new Promise((r) => setTimeout(r, 3000)); await page.reload(); }); await settle(page);

  const svgSel = mobile ? '#benchmark-radar .md\\:hidden svg[role=group]' : '#benchmark-radar .md\\:block svg[role=group]';
  const read = () => page.evaluate((sel) => {
    const svg = document.querySelector(sel);
    if (!svg) return null;
    const rings = [...svg.querySelectorAll('[data-radar-ring]')].map((t) => Number(t.textContent));
    const floor = svg.querySelector('[data-radar-floor]')?.textContent ?? null;
    const dots = [...svg.querySelectorAll('circle[pointer-events=none]')].map((c) => [Number(c.getAttribute('cx')), Number(c.getAttribute('cy'))]);
    return { rings, floor: floor == null ? 0 : Number(floor), dots, note: document.querySelector('[data-radar-zoom-note]')?.textContent ?? '' };
  }, svgSel);
  const zoomed = await read();
  check(`${tag} CR-19.2 default radar zooms: rings start above 0 and the centre is labelled`, zoomed && zoomed.floor > 0 && zoomed.rings.length === 4 && zoomed.rings[3] === 100 && zoomed.rings[0] > zoomed.floor, zoomed && { floor: zoomed.floor, rings: zoomed.rings });
  check(`${tag} CR-19.2 zoom is disclosed in text`, zoomed && /centre is \d+/.test(zoomed.note), zoomed?.note);
  await page.locator('#benchmark-radar').screenshot({ path: `${OUT}/${tag}-radar-zoomed.png` }).catch(() => {});
  // The two default models' shapes differ more when zoomed: mean distance between their dots grows.
  const spread = (d) => { if (!d || d.dots.length < 4) return 0; const half = Math.floor(d.dots.length / 2); let s = 0; for (let i = 0; i < half; i++) s += Math.hypot(d.dots[i][0] - d.dots[i + half][0], d.dots[i][1] - d.dots[i + half][1]); return s / half; };
  await page.locator('[data-radar-fullscale]').check();
  await page.waitForTimeout(400);
  const full = await read();
  check(`${tag} CR-19.2 'Full 0–100 scale' restores rings 25/50/75/100 and no floor label`, full && JSON.stringify(full.rings) === '[25,50,75,100]' && full.floor === 0 && !full.note, full && { rings: full.rings, floor: full.floor });
  check(`${tag} CR-19.2 the pair's shapes are further apart when zoomed than on the full scale`, spread(zoomed) > spread(full) * 1.2, { zoomed: spread(zoomed).toFixed(1), full: spread(full).toFixed(1) });

  // CR-21.1: every Benchmaxxing preset lists each model family at most once.
  await goto(page, `${BASE}/benchmaxxing`); await settle(page);
  for (const label of ['Featured models', 'Strongest signals', 'All scored']) {
    await page.getByRole('button', { name: label }).first().click(); await page.waitForTimeout(400);
    const more = page.getByRole('button', { name: /^Show all \d+/ });
    if (await more.count()) { await more.first().click(); await page.waitForTimeout(400); }
    const names = await page.evaluate(() => [...document.querySelectorAll('section[aria-label="Benchmaxxing overview"] tbody th button span.block:first-child')].map((s) => s.textContent.replace(/^[AB]/, '').trim()));
    const fams = names.map((n) => nameFamily.get(n) ?? n);
    const dup = fams.filter((f, i) => fams.indexOf(f) !== i);
    check(`${tag} CR-21.1 '${label}': one row per model family`, names.length > 0 && dup.length === 0, { rows: names.length, duplicates: [...new Set(dup)].slice(0, 5) });
  }
  const count = await page.locator('section[aria-label="Benchmaxxing overview"] b').first().innerText().catch(() => '');
  await page.getByRole('button', { name: 'Strongest signals' }).first().click(); await page.waitForTimeout(400);
  const signalRows = await page.locator('section[aria-label="Benchmaxxing overview"] tbody tr').count();
  const more2 = page.getByRole('button', { name: /^Show all (\d+)/ });
  const listed = (await more2.count()) ? Number((await more2.first().innerText()).match(/\d+/)[0]) : signalRows;
  check(`${tag} CR-21.1 tagged count equals the number of tagged model rows`, Number(count) === listed, { count, listed });
  const intro = await page.locator('.bh-page-head').innerText().catch(() => '');
  check(`${tag} CR-21.1 the page says one row per model, one verdict`, /One row per model/.test(intro), intro.slice(0, 160));
  await page.screenshot({ path: `${OUT}/${tag}-benchmaxxing.png` });
  check(`${tag} no page errors`, !errors.length, errors);
  await context.close();
}
// Overview API: every variant of a family carries the same Benchmaxxing verdict.
const overview = await (await fetch(`${BASE}/api/models?score=composite`)).json();
const verdicts = new Map();
let disagree = 0, seen = 0;
for (const m of overview.models ?? []) {
  const b = m.benchmaxxing; if (!b) continue; seen++;
  const key = m.family_key, v = `${b.signal}`;
  if (verdicts.has(key) && verdicts.get(key) !== v) disagree++; else verdicts.set(key, v);
}
check('CR-21.1 API: reasoning variants of one model never disagree on the Benchmaxxing tag', seen === 0 || disagree === 0, { seen, disagree, note: seen === 0 ? 'API does not expose benchmaxxing; checked in the UI only' : '' });
await browser.close();
void familyOf;
const passed = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, runner: process.env.BH_RUNNER || 'unspecified', at: new Date().toISOString(), passed, total: checks.length, checks }, null, 2));
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name} — ${c.detail.slice(0, 220)}`);
console.log(`${passed}/${checks.length}`);
process.exit(passed === checks.length ? 0 : 1);
