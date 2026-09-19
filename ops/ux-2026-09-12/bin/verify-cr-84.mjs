#!/usr/bin/env node
// CR-84 live check: /jev-models against the committed JevBench v1 artifact.
// Usage: node ops/ux-2026-09-12/bin/verify-cr-84.mjs BASE_URL OUT_DIR
// Numbers are compared against /api/jevbench, whose bytes must hash to the committed artifact.
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-84';
const SHA = '38fc5f1d6fd8bda970c6f4a918492d67370e9e764477a302611419a97fb0bd53';
mkdirSync(OUT, { recursive: true });
const checks = [];
const check = (id, ok, detail) => { checks.push({ id, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${detail ?? ''}`); };
const pct = (v) => `${(v * 100).toFixed(1)}%`;

const res = await fetch(`${BASE}/api/jevbench`, { cache: 'no-store' });
const body = Buffer.from(await res.arrayBuffer());
const sha = createHash('sha256').update(body).digest('hex');
check('api-sha256', res.ok && sha === SHA && res.headers.get('x-content-sha256') === SHA, `${res.status} ${sha.slice(0, 12)} header ${res.headers.get('x-content-sha256')?.slice(0, 12)}`);
const art = JSON.parse(body.toString('utf8'));
const shown = art.systems.filter((s) => s.ranked && s.overall.n_attempted * 2 >= s.overall.n_planned);
const meta = await (await fetch(`${BASE}/api/meta`, { cache: 'no-store' })).json().catch(() => ({}));

const b = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1100 }], ['mobile', { width: 390, height: 844 }]]) {
  const mobile = kind === 'mobile';
  const c = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme, deviceScaleFactor: mobile ? 2 : 1 });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const page = await c.newPage(); const tag = `${kind}_${theme}`; const errors = [];
  page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const r = await page.goto(`${BASE}/jev-models`, { waitUntil: 'networkidle' });
  await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
  check(`${tag}:status`, r.status() === 200, r.status());
  check(`${tag}:title`, (await page.title()).startsWith('Jev-class decision models — JevBench v1'), await page.title());
  const lead = await page.locator('header.bh-page-head').innerText();
  check(`${tag}:lead-own-benchmark`, /JevBench v1 is our own benchmark/.test(lead) && /no combined|accuracy, cost, latency, reliability and openness/.test(lead), '');
  const rows = page.locator('[data-bh-jev-row]');
  check(`${tag}:row-count`, (await rows.count()) === shown.length, `${await rows.count()} vs ${shown.length}`);
  // Number parity: accuracy for every row, price or "no per-token tariff".
  let parity = 0, bad = [];
  for (const s of shown) {
    const row = page.locator(`[data-bh-jev-row="${s.key}"]`);
    const acc = await row.locator('[data-col="accuracy"]').innerText();
    if (!acc.startsWith(pct(s.overall.accuracy))) bad.push(`${s.key} acc ${acc}`); else parity++;
    const cost = row.locator('[data-col="cost"]');
    if (mobile) continue; // the cost column is on the Cheap axis on phones
    const ct = await cost.innerText();
    const want = s.overall.cost_per_1000_usd == null ? 'no per-token tariff' : `$${s.overall.cost_per_1000_usd.toFixed(3)}`;
    if (!ct.startsWith(want)) bad.push(`${s.key} cost ${ct}`); else parity++;
  }
  check(`${tag}:number-parity`, !bad.length, `${parity} cells match${bad.length ? '; ' + bad.join(', ') : ''}`);
  const text = await page.locator('main').innerText().catch(() => page.locator('body').innerText());
  check(`${tag}:no-zero-price`, !/\$0\.00\b/.test(text), '');
  if (!mobile) {
    const axes = await page.locator('thead th[scope="colgroup"]').allInnerTexts();
    check(`${tag}:five-axes`, axes.map((x) => x.trim().toLowerCase()).join(',') === 'smart,cheap,fast,reliable,open', axes.join(','));
    // Sort by price: cheapest priced first, no-tariff rows last in both directions.
    const btn = page.locator('thead button', { hasText: '$ / 1k decisions' });
    await btn.click();
    const order1 = await rows.evaluateAll((els) => els.map((e) => e.getAttribute('data-bh-jev-row')));
    await btn.click();
    const order2 = await rows.evaluateAll((els) => els.map((e) => e.getAttribute('data-bh-jev-row')));
    const complete = shown.filter((s) => s.complete);
    const priced = complete.filter((s) => s.overall.cost_per_1000_usd != null).sort((a, b) => a.overall.cost_per_1000_usd - b.overall.cost_per_1000_usd).map((s) => s.key);
    const nPriced = priced.length;
    check(`${tag}:sort-price`, JSON.stringify(order1.slice(0, nPriced)) === JSON.stringify(priced) && JSON.stringify(order2.slice(0, nPriced)) === JSON.stringify([...priced].reverse()), `asc ${order1.slice(0, nPriced).join('>')} | desc ${order2.slice(0, nPriced).join('>')}`);
    // Keyboard: focus a scatter point → the readout appears.
    const pt = page.locator('[data-bh-jev-point]').first();
    await pt.focus();
    const status = await page.locator('[data-bh-jev-scatter] [role="status"]').innerText().catch(() => '');
    check(`${tag}:scatter-keyboard`, /Accuracy \d/.test(status), status.replace(/\s+/g, ' ').slice(0, 90));
    const labels = await page.locator('[data-bh-jev-scatter] svg text[paint-order="stroke"]').count();
    check(`${tag}:scatter-labels`, labels === shown.filter((s) => s.complete).length, `${labels} labels`);
  } else {
    await page.locator('button[aria-pressed]', { hasText: 'Cheap' }).click();
    const vis = await page.locator('[data-bh-jev-row] [data-col="cost"]').first().isVisible();
    const hid = await page.locator('[data-bh-jev-row] [data-col="accuracy"]').first().isVisible();
    check(`${tag}:axis-switch`, vis && !hid, `cost visible ${vis}, accuracy visible ${hid}`);
    await page.locator('button[aria-pressed]', { hasText: 'Smart' }).click();
    const top = await page.locator('[data-bh-jev-row] [data-col="accuracy"]').first().boundingBox();
    check(`${tag}:first-cell-in-first-screen`, top && top.y + top.height <= 844, top && Math.round(top.y));
    const labels = await page.locator('[data-bh-jev-scatter] svg text[paint-order="stroke"]').count();
    check(`${tag}:scatter-labels-phone`, labels >= 1, `${labels} labels (a label that fits nowhere is dropped, F-67)`);
  }
  // Row details expand.
  await page.locator('[data-bh-jev-row] button[aria-expanded]').first().click();
  check(`${tag}:row-details`, await page.locator('[id^="jev-details-"]').first().isVisible(), '');
  const calOk = await page.locator('[data-bh-jev-calibration] svg circle').count();
  check(`${tag}:calibration`, calOk > 0, `${calOk} bins drawn`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(`${tag}:no-horizontal-overflow`, overflow <= 0, `${overflow}px`);
  // The page clips overflow, so also measure the charts and the table card against the viewport.
  const boxes = await page.evaluate(() => ['[data-bh-jev-scatter] svg', '[data-bh-jev-calibration] svg', '[data-bh-jev-calibration] select', '[data-bh-jev-table]'].map((q) => { const r = document.querySelector(q)?.getBoundingClientRect(); const card = document.querySelector(q)?.closest('.card')?.getBoundingClientRect(); return { q, right: r ? Math.round(r.right) : null, cardRight: card ? Math.round(card.right) : null, left: r ? Math.round(r.left) : null }; }));
  const vw = vp.width;
  check(`${tag}:charts-fit`, boxes.every((x) => x.right != null && x.left >= 0 && (x.q === '[data-bh-jev-table]' ? x.cardRight <= vw : x.right <= vw && x.right <= x.cardRight)), JSON.stringify(boxes));
  check(`${tag}:nav-link`, (await page.locator('a[href="/jev-models"]').count()) > 0, '');
  check(`${tag}:unavailable-list`, (await page.locator('[data-bh-jev-unavailable] li').count()) >= 10, `${await page.locator('[data-bh-jev-unavailable] li').count()} entries`);
  check(`${tag}:no-console-errors`, !errors.length, errors.slice(0, 3).join(' | '));
  await page.screenshot({ path: `${OUT}/${tag}-viewport.png` });
  await page.screenshot({ path: `${OUT}/${tag}-full.png`, fullPage: !mobile });
  await c.close();
}
await b.close();
const pass = checks.filter((x) => x.ok).length;
writeFileSync(`${OUT}/verification.json`, JSON.stringify({ base: BASE, revision: meta.revision ?? null, at: new Date().toISOString(), artifact_sha256: sha, pass, total: checks.length, checks }, null, 2));
console.log(`${pass}/${checks.length} ${BASE} revision ${meta.revision ?? '?'}`);
process.exit(pass === checks.length ? 0 : 1);
