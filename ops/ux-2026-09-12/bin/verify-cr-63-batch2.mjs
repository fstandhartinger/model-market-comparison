// CR-63.4/63.5 (Benchmaxxing page), 63.6 (value formats), 63.10 (404), 63.11 (cost ticks), 63.12 (copy), CR-60.1/60.3
// (Union Alpha), CR-61.1 (removal note), CR-62.3 (share image) — 1440/390, light/dark.
// Usage: BH_RUNNER=<engine> node verify-cr-63-batch2.mjs <base> <outdir> [expected-revision-prefix]
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-63-batch2';
const REV = process.argv[4] || '';
await fs.mkdir(OUT, { recursive: true });
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const meta = await (await fetch(`${BASE}/api/meta`)).json().catch(() => ({}));
check('deployed revision matches the expected commit', !REV || String(meta.revision || '').startsWith(REV), { revision: meta.revision, expected: REV });

// Values: model page vs Benchmarks matrix formatter for the same model × benchmark.
const { formatNative, formatValue } = await import('/opt/model-market-comparison/lib/benchmark-matrix.mjs');
const nf = await fetch(`${BASE}/models/does-not-exist`);
check('CR-63.10: unknown model page answers 404', nf.status === 404, nf.status);
const head = (await (await fetch(`${BASE}/`, { headers: { 'User-Agent': 'Twitterbot/1.0' } })).text()).split('</head>')[0];
const ogImage = head.match(/property="og:image" content="([^"]+)"/)?.[1];
const img = ogImage ? await fetch(ogImage.replace('https://benchmarkheaven.com', BASE)) : null;
const imgBytes = img ? (await img.arrayBuffer()).byteLength : 0;
const square = await fetch(`${BASE}/brand/og-launch-square.png`); const squareBytes = (await square.arrayBuffer()).byteLength;
const fallback = await fetch(`${BASE}/brand/og-image.png`); await fallback.arrayBuffer();
check('CR-62.3: og:image is the product-look launch card (≤ 1 MB), square variant and text-only fallback served', /og-launch\.png/.test(ogImage || '') && img?.status === 200 && imgBytes < 1048576 && square.status === 200 && squareBytes < 1048576 && fallback.status === 200, { ogImage, imgBytes, squareBytes, fallback: fallback.status });

const browser = await chromium.launch();
const settle = async (page) => { await page.waitForFunction(() => !document.querySelector('.bh-deferred'), null, { timeout: 90000 }).catch(() => {}); await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1200); };
try {
  for (const scheme of ['light', 'dark']) for (const [w, h] of [[1440, 900], [390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme });
    await ctx.addInitScript((t) => { try { localStorage.setItem('bh-theme', t); } catch {} }, scheme);
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
    const tag = `${w}px ${scheme}`;

    await page.goto(`${BASE}/benchmaxxing`, { waitUntil: 'domcontentloaded', timeout: 90000 }); await settle(page);
    const pressed = await page.locator('[aria-label="Model list preset"] [aria-pressed="true"]').textContent();
    const flagged = await page.locator('section[aria-label="Benchmaxxing overview"] tbody tr[data-row-id]').first().locator('text=⚠').count();
    const intro = (await page.locator('header.bh-page-head p').first().innerText()).trim();
    const letters = await page.locator('section[aria-label="Benchmaxxing overview"] tbody th .text-\\[10px\\].font-bold').count();
    const frac = async () => page.locator('[data-row-id]').first().evaluate((tr) => ({ id: tr.dataset.rowId, frac: tr.querySelector('[data-signal-frac]')?.dataset.signalFrac }));
    const inSignals = await frac();
    await page.getByRole('button', { name: 'All scored' }).click(); await page.waitForTimeout(400);
    const sameInAll = await page.locator(`[data-row-id="${inSignals.id}"] [data-signal-frac]`).first().getAttribute('data-signal-frac').catch(() => null);
    const nameLines = await page.locator('section[aria-label="Benchmaxxing overview"] tbody th button[aria-pressed] span').first().evaluate((el) => Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)));
    check(`CR-63.4 ${tag}: opens on Strongest signals with flagged rows; two-sentence intro`, pressed === 'Strongest signals' && flagged >= 1 && /^The more jagged a model's results across related benchmarks, the more benchmaxxed it looks\. A high signal is a screening flag, not proof of leakage\./.test(intro), { pressed, flagged, intro });
    check(`CR-63.5 ${tag}: one bar scale across tabs, no stray A letter, short name lines`, inSignals.frac && inSignals.frac === sameInAll && letters === 0 && nameLines <= 3, { inSignals, sameInAll, letters, nameLines });
    await page.getByRole('button', { name: 'Strongest signals' }).click(); await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/benchmaxxing-${w}-${scheme}.png` });

    await page.goto(`${BASE}/models/claude-opus-5`, { waitUntil: 'domcontentloaded', timeout: 90000 }); await settle(page);
    const shown = await page.locator('#benchmark-sheet li summary').evaluateAll((els) => els.map((s) => [...s.children].map((c) => c.textContent.trim())));
    const values = shown.map((c) => c[2]).filter(Boolean);
    const bad = values.filter((v) => /fraction|percent|USD|points/.test(v));
    check(`CR-63.6 ${tag}: model page values use %, $, Elo (no raw unit words)`, values.length > 10 && bad.length === 0 && values.some((v) => /%$/.test(v)), { sample: values.slice(0, 8), bad });
    const compare = await page.getByRole('link', { name: /Compare this model/ }).textContent();
    check(`CR-63.12f ${tag}: internal compare link uses →`, /→$/.test(compare.trim()), compare);

    await page.goto(`${BASE}/models/does-not-exist`, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(800);
    const nfInfo = await page.evaluate(() => ({ text: document.querySelector('main')?.innerText || '', bg: getComputedStyle(document.body).backgroundColor, links: [...document.querySelectorAll('main a')].map((a) => a.getAttribute('href')) }));
    check(`CR-63.10 ${tag}: themed 404 with links`, /This page doesn.t exist/.test(nfInfo.text) && nfInfo.links.includes('/') && nfInfo.links.includes('/compare'), nfInfo);
    await page.screenshot({ path: `${OUT}/404-${w}-${scheme}.png` });

    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }); await settle(page);
    const ticks = await page.locator('.recharts-xAxis .recharts-cartesian-axis-tick-value').allTextContents();
    const body = await page.locator('main').innerText();
    check(`CR-63.11 ${tag}: cost ticks follow one rule`, ticks.length >= 3 && ticks.every((t) => /^\$(\d+|0\.\d\d|0\.00\d)$/.test(t)), ticks);
    const hero = await page.locator('.bh-hero-line .whitespace-nowrap').count();
    check(`CR-63.12 ${tag}: credits, pass count and hero date`, /Data: Artificial Analysis · Epoch AI \(CC BY\)/.test(body) && !/Data: Epoch AI/.test(body.split('Subscription costs')[0]) && /\d+ of \d+ models pass/.test(body) && hero === 1, { credit: body.match(/Data: Artificial Analysis[^\n]{0,40}/)?.[0], pass: body.match(/\d+ of \d+ models pass/)?.[0], hero });

    await page.goto(`${BASE}/about`, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(600);
    const about = await page.locator('main').innerText();
    const removal = await page.locator('#removal').count();
    const mail = await page.locator('#removal ~ p a[href="mailto:info@productivity-boost.com"], a[href="mailto:info@productivity-boost.com"]').count();
    const footer = await page.locator('footer a[href="/about#removal"]').count();
    check(`CR-61.1 ${tag}: removal-on-request section with mail link, footer line`, removal === 1 && mail >= 1 && footer === 1 && /free, open-source, non-commercial hobby project/.test(about), { removal, mail, footer });
    check(`CR-63.12d ${tag}: /about says Sources below`, /Sources below/.test(about), about.match(/see Sources \w+/)?.[0]);

    await page.goto(`${BASE}/eu`, { waitUntil: 'domcontentloaded' }); await settle(page);
    const eu = await page.locator('main').innerText();
    check(`CR-63.12e ${tag}: /eu 'Global offers' spaced`, /Azure Direct Global offers/.test(eu) && !/Globaloffers/.test(eu), eu.match(/Azure Direct Global.{0,10}/)?.[0]);

    await page.goto(`${BASE}/models/union-alpha`, { waitUntil: 'domcontentloaded' }); await settle(page);
    const ua = await page.locator('main').innerText();
    check(`CR-60.1/60.3 ${tag}: Union Alpha page with 'free (stealth preview)', no paid price`, /Union Alpha/.test(ua) && /free \(stealth preview\)/.test(ua) && /released 2026-09-16/.test(ua), ua.slice(0, 300));
    await page.screenshot({ path: `${OUT}/union-alpha-${w}-${scheme}.png` });
    check(`${tag}: no page errors`, errors.length === 0, errors);
    await ctx.close();
  }
} finally { await browser.close(); }
const passed = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, runner: process.env.BH_RUNNER || null, at: new Date().toISOString(), revision: meta.revision ?? null, passed, total: checks.length, checks }, null, 2));
for (const c of checks.filter((x) => !x.ok)) console.log('FAIL', c.name, c.detail);
console.log(`${passed}/${checks.length} checks passed → ${OUT}/verification.json`);
process.exit(passed === checks.length ? 0 : 1);
