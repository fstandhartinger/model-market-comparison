// Iteration 93: CR-65.9 (cache baseline scope, write surcharge, /about) and CR-65.11 (Coding Agent v1.4 labels) — 1440/390, light/dark.
// Usage: node verify-cr-65-9.mjs <base> <outdir> [expected-revision-prefix]
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr65-9';
const REV = process.argv[4] || '';
await fs.mkdir(OUT, { recursive: true });
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const meta = await (await fetch(`${BASE}/api/meta`)).json();
check('deployed revision matches the expected commit', !REV || String(meta.revision || '').startsWith(REV), { revision: meta.revision, expected: REV });
const browser = await chromium.launch();
const settle = async (page) => { await page.waitForFunction(() => !document.querySelector('.bh-deferred'), null, { timeout: 90000 }).catch(() => {}); await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1200); };
try {
  for (const scheme of ['light', 'dark']) for (const [w, h] of [[1440, 900], [390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, ...(w < 500 ? { isMobile: true, hasTouch: true } : {}) });
    await ctx.addInitScript((t) => { try { localStorage.setItem('bh-theme', t); } catch {} }, scheme);
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
    const tag = `${w}px ${scheme}`;
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 90000 }); await settle(page);
    await page.getByRole('tab', { name: 'Advanced' }).click().catch(() => {}); await settle(page);
    // An Anthropic model: its cheapest route publishes a 1.25× write price, so the modal shows the surcharge.
    const row = page.locator('tr[data-model-id^="claude-opus-5::"]').first();
    await row.scrollIntoViewIfNeeded().catch(() => {});
    await row.locator('button[aria-haspopup="dialog"]').first().click().catch(() => {});
    const dialog = page.locator('dialog[open]');
    await dialog.waitFor({ timeout: 10000 }).catch(() => {});
    const text = await dialog.innerText().catch(() => '');
    await dialog.screenshot({ path: `${OUT}/cost-modal-opus5-${w}-${scheme}.png` }).catch(() => {});
    check(`CR-65.9 ${tag}: the Claude Opus 5 cost modal names the cache-write surcharge and its assumption`, /cache-write surcharge \$/.test(text) && /assumed to be written once at that price/.test(text), text.slice(text.indexOf('Cache-efficiency'), text.indexOf('Sources')));
    await page.keyboard.press('Escape').catch(() => {});
    // CR-65.11: the score picker names the pinned v1.4 value.
    const options = await page.locator('select option').allInnerTexts().catch(() => []);
    check(`CR-65.11 ${tag}: every Coding Agent option in the score pickers names its version`, options.some((o) => /Coding Agent/.test(o)) && options.filter((o) => /Coding Agent/.test(o)).every((o) => /v1\.[45]/.test(o)), options.filter((o) => /Coding Agent/.test(o)));
    await page.goto(`${BASE}/about`, { waitUntil: 'domcontentloaded' }); await settle(page);
    const about = await page.locator('main').innerText();
    check(`CR-65.9 ${tag}: /about states the write term and the baseline scope`, /\(write price − input price\)/.test(about) && /a route without a cache-read price gets no cache-hit rate and no discount/.test(about) && !/unmeasured cache writes assume 0 tokens/.test(about), '');
    check(`CR-65.11 ${tag}: /about names Coding Agent v1.4 as the pinned slot`, /AA Coding Agent v1\.4 \(the pinned 9 September snapshot; AA now publishes v1\.5/.test(about), '');
    check(`${tag}: no page errors`, errors.length === 0, errors.slice(0, 3));
    await ctx.close();
  }
} finally { await browser.close(); }
const failed = checks.filter((c) => !c.ok);
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, revision: meta.revision, runner: process.env.BH_RUNNER || null, at: new Date().toISOString(), passed: checks.length - failed.length, total: checks.length, checks }, null, 1));
console.log(`${checks.length - failed.length}/${checks.length} passed`); for (const c of failed) console.log('FAIL', c.name, c.detail);
