// CR-50.2 (iteration 149): the "Free route" pill. Advanced overview at 1440/390, light/dark: every marked row is a model
// with a current, healthy, non-stealth OpenRouter free route (expected set from the dataset passed in), the pill reads
// "Free route" (desktop) / "Free" (phone) and its title names provider and limits, the paid price is unaffected, the
// legend explains it, the pill opens the model page's route list, and an EU-hosted-only region filter removes every
// pill (no free route is EU-hosted today). Usage: node verify-cr-50-2.mjs <base> <outdir> [dataset.json]
import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { currentFreeRoutes, isFreeRoute } from '../../../lib/free-route.mjs';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-50-2';
const DATASET = process.argv[4] || new URL('../../../data/dataset.json', import.meta.url).pathname;
await mkdir(OUT, { recursive: true });
const results = [];
const check = (name, ok, detail) => results.push({ name, ok: !!ok, detail });

const ds = JSON.parse(await readFile(DATASET, 'utf8'));
const when = { snapshotDate: ds.sources.openrouter, generatedAt: ds.generated_at };
const expected = new Set(ds.models.filter((m) => currentFreeRoutes(m.offers, when).length).map((m) => m.id));
const freeButNotCurrent = new Set(ds.models.filter((m) => m.offers.some(isFreeRoute) && !expected.has(m.id)).map((m) => m.id));
let meta = {};
try { meta = await (await fetch(`${BASE}/api/meta?v=${Date.now()}`, { cache: 'no-store' })).json(); } catch {}

const lum = (rgb) => { const [r, g, b] = rgb.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const b = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const tag = `${kind}_${theme}`; const mobile = kind === 'mobile';
  const c = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const p = await c.newPage(); const errors = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  const openAdvanced = async (url) => {
    await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
    await p.waitForLoadState('networkidle').catch(() => {});
    await p.getByRole('tab', { name: /advanced/i }).first().click({ timeout: 15000 }).catch(() => {});
    await p.waitForTimeout(1500);
  };
  await openAdvanced(`${BASE}/?v=${Date.now()}`);
  const pills = await p.evaluate(() => [...document.querySelectorAll('[data-bh-free-route]')].map((a) => {
    const cs = getComputedStyle(a); const row = a.closest('tr'); const cell = a.closest('td');
    let bg = null; for (let e = a; e && !bg; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) bg = c; }
    const visible = [...a.querySelectorAll('span[aria-hidden="true"]')].filter((s) => getComputedStyle(s).display !== 'none').map((s) => s.textContent).join('');
    return { id: a.dataset.bhFreeRoute, text: visible, title: a.getAttribute('title'), href: a.getAttribute('href'), fontPx: parseFloat(cs.fontSize), color: cs.color, bg,
      rowId: row?.dataset.modelId, cost: row?.dataset.cost ?? null, cellText: cell?.innerText.replace(/\s+/g, ' ').trim() };
  }));
  const rgb = (s) => (s || '').match(/[\d.]+/g)?.slice(0, 3).map(Number) ?? [0, 0, 0];
  check(`${tag}: at least one row carries the Free route pill`, pills.length > 0, pills.length);
  const wrong = pills.filter((x) => !expected.has(x.id) || x.id !== x.rowId);
  check(`${tag}: every pill sits on a model with a current, healthy free route (none on degraded/stealth-only/stale)`, wrong.length === 0 && !pills.some((x) => freeButNotCurrent.has(x.id)), { wrong, marked: pills.map((x) => x.id) });
  check(`${tag}: pill text is "${mobile ? 'Free' : 'Free route'}"`, pills.every((x) => x.text === (mobile ? 'Free' : 'Free route')), [...new Set(pills.map((x) => x.text))]);
  check(`${tag}: title names OpenRouter + provider, limits, and never calls the model free`, pills.every((x) => /^Free route on OpenRouter via .+\. Rate and daily limits apply and availability may change; every other route costs money/.test(x.title) && !/model is free/i.test(x.title)), pills[0]?.title);
  check(`${tag}: pill font ≥ 10 px and contrast ≥ 4.5:1`, pills.every((x) => x.fontPx >= 10 && contrast(rgb(x.color), rgb(x.bg)) >= 4.5), pills.slice(0, 3).map((x) => ({ px: x.fontPx, c: contrast(rgb(x.color), rgb(x.bg)).toFixed(2) })));
  const priced = pills.filter((x) => x.cost != null);
  check(`${tag}: a marked row with a paid route still shows a non-zero paid cost`, priced.every((x) => Number(x.cost) > 0 && !/\$0\.00\b/.test(x.cellText)), priced.slice(0, 3).map((x) => [x.id, x.cost, x.cellText]));
  const legend = await p.evaluate(() => { const d = document.querySelector('[data-bh-legend]'); if (d) d.open = true; const dt = document.querySelector('[data-bh-tag-legend="free-route"]'); return dt ? dt.nextElementSibling?.textContent : null; });
  check(`${tag}: the legend explains the pill`, /zero-price OpenRouter route was live at the last refresh; limits apply/.test(legend || ''), legend);
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`${tag}: no horizontal page overflow`, overflow <= 1, overflow);
  const first = pills.find((x) => x.cost != null) || pills[0];
  if (first) {
    await p.locator(`[data-bh-free-route="${first.id}"]`).first().scrollIntoViewIfNeeded();
    await p.screenshot({ path: `${OUT}/${tag}-advanced.png` });
    await p.locator(`[data-bh-free-route="${first.id}"]`).first().click();
    await p.waitForURL(/#all-offers$/, { timeout: 30000 }).catch(() => {});
    await p.waitForTimeout(2000);
    const target = await p.evaluate(() => { const d = document.getElementById('all-offers'); const rows = [...(d?.querySelectorAll('[data-bh-free-route-current="1"]') || [])]; return { url: location.pathname + location.hash, open: d?.open ?? null, current: rows.length, title: rows[0]?.getAttribute('title') || null }; });
    check(`${tag}: the pill opens the model page's route list with the free route explained`, target.url.endsWith('#all-offers') && target.open === true && target.current > 0 && /^Free route on OpenRouter via /.test(target.title || ''), target);
    await p.screenshot({ path: `${OUT}/${tag}-model-offers.png` });
  }
  // Region filter: EU-hosted only. No free route is EU-hosted, so every pill must go.
  await p.evaluate(() => { const k = 'mmc.settings.v9'; const s = JSON.parse(localStorage.getItem(k) || '{}'); s.hostedIn = ['EU']; localStorage.setItem(k, JSON.stringify(s)); });
  await openAdvanced(`${BASE}/?v=${Date.now()}`);
  const euPills = await p.locator('[data-bh-free-route]').count();
  check(`${tag}: with EU-hosted only, no pill remains`, euPills === 0, euPills);
  check(`${tag}: 0 page errors`, errors.length === 0, errors.slice(0, 3));
  await c.close();
}
await b.close();
const pass = results.filter((r) => r.ok).length;
await writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, revision: meta.revision ?? null, at: new Date().toISOString(), expected: [...expected], pass, total: results.length, results }, null, 1));
for (const r of results) if (!r.ok) console.log('FAIL', r.name, JSON.stringify(r.detail).slice(0, 300));
console.log(`${pass}/${results.length} ${BASE} @ ${meta.revision ?? '?'}`);
process.exit(pass === results.length ? 0 : 1);
