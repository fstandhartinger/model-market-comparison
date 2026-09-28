#!/usr/bin/env node
// D238 / D246 live acceptance: every JevBench row that answered fewer than all sealed decisions validly
// states that count on the page, exactly once, in the notes disclosure the board's † opens.
//
// Nothing here is a hard-coded number. The expected rows and ratios are re-derived from the release
// artifact the page renders from (`lib/jevbench-v1422.mjs`), so a later release changes the expectation
// with the data. The page's own claim is read out of the rendered DOM, not out of the RSC payload, and the
// notes disclosure is opened first: a closed <details> still reports a box, so `checkVisibility()` decides.
//
// Usage: node ops/ux-2026-09-12/bin/verify-d238-sealed-shortfall.mjs <outDir> [host ...]
// Writes <outDir>/verification.json plus one screenshot per host/viewport. Exit 1 if any check fails.

import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');

const REPO = '/opt/model-market-comparison';
const outDir = process.argv[2];
if (!outDir) { console.error('usage: verify-d238-sealed-shortfall.mjs <outDir> [host ...]'); process.exit(2); }
const hosts = process.argv.slice(3).length ? process.argv.slice(3) : [
  'https://benchmarkheaven.com', 'https://www.benchmarkheaven.com', 'https://model-market-comparison.app.mintapis.com',
];
mkdirSync(outDir, { recursive: true });

const { readJevbenchV1422 } = await import(`${REPO}/lib/jevbench-v1422.mjs`);
const { artifact } = await readJevbenchV1422(REPO);
// The rows the current board must account for, straight out of the artifact it renders.
const expected = artifact.systems
  .map((row) => ({ key: row.key, display: row.display, ...(row.sealed_aggregate ?? {}) }))
  .filter((row) => Number.isInteger(row.answered_valid) && Number.isInteger(row.n) && row.answered_valid < row.n)
  .map((row) => ({ key: row.key, display: row.display, ratio: `${row.answered_valid}/${row.n}` }));
if (!expected.length) { console.error('the artifact publishes no sealed shortfall; nothing to verify'); process.exit(2); }

const results = [];
const record = (id, ok, detail) => { results.push({ id, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${id}  ${detail}`); };

const browser = await chromium.launch();
try {
  for (const host of hosts) {
    for (const [label, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
       for (const theme of ['light', 'dark']) {
        // A fresh context per viewport: the hub is heavy and a shared one loses its metrics.
        const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, colorScheme: theme, isMobile: label === 'mobile', hasTouch: label === 'mobile' });
        await ctx.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
        const page = await ctx.newPage();
        const pageErrors = [];
        page.on('pageerror', (err) => pageErrors.push(String(err)));
        let ok = false;
        for (let attempt = 1; attempt <= 3 && !ok; attempt += 1) {
          try { await page.goto(`${host}/jev-models`, { waitUntil: 'domcontentloaded', timeout: 60_000 }); ok = true; } catch (err) { if (attempt === 3) throw err; }
        }
        await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
        await page.waitForSelector('[data-bh-jev14-notes]', { timeout: 30_000 });
        await page.evaluate(() => { document.querySelector('[data-bh-jev14-notes]').open = true; });
        await page.waitForTimeout(300);
        const seen = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-bh-jev14-notes] li')]
          .map((li) => [li.id.replace(/^jev14-note-/, ''), { text: li.innerText, visible: li.checkVisibility() }])));
        const ctxName = `${new URL(host).host}/${label}/${theme}`;
        for (const row of expected) {
          const li = seen[row.key];
          const hits = li ? (li.text.match(new RegExp(String.raw`\b${row.ratio.replace('/', String.raw`\s*/\s*`)}\b`, 'g')) ?? []).length : 0;
          record(`d238/${ctxName}/${row.key}-states-${row.ratio}-once`, !!li && li.visible && hits === 1,
            li ? `visible=${li.visible} occurrences=${hits} text=${JSON.stringify(li.text.slice(-120))}` : 'no note entry for this row');
        }
        // D246's own row: the only published reason qwen3.8-27b is partial and unranked.
        const qwen = seen['qwen3.8-27b'];
        record(`d246/${ctxName}/qwen3.8-27b-keeps-its-published-partial-reason`,
          !!qwen && qwen.visible && /Chutes rate limit stopped the run after 81\s*\/\s*308 items/.test(qwen.text),
          qwen ? JSON.stringify(qwen.text.slice(0, 160)) : 'no note entry');
        // The shared sentence the filter drops must not come back, and no note may repeat a ratio.
        const shared = Object.entries(seen).filter(([, li]) => /sealed item text \(no golds\) was sent to/i.test(li.text)).map(([key]) => key);
        record(`d238/${ctxName}/the-shared-sealed-exposure-sentence-is-still-dropped`, shared.length === 0, `rows repeating it=${JSON.stringify(shared)}`);
        record(`d238/${ctxName}/no-page-errors`, pageErrors.length === 0, JSON.stringify(pageErrors.slice(0, 3)));
        await page.screenshot({ path: resolve(outDir, `${new URL(host).host}-${label}-${theme}-notes.png`), fullPage: false });
        await ctx.close();
       }
    }
  }
} finally { await browser.close(); }

const passed = results.filter((r) => r.ok).length;
writeFileSync(resolve(outDir, 'verification.json'), `${JSON.stringify({
  generated_at: new Date().toISOString(), hosts, expected, passed, total: results.length, results,
}, null, 2)}\n`);
console.log(`\n${passed}/${results.length}`);
process.exit(passed === results.length ? 0 : 1);
