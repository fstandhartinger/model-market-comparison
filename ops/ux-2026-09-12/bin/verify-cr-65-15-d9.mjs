// Iteration 94: CR-65.15 D9 — "Changed at source" tag with each row's own note, "values as published on <date>" in the
// row hover, the note on the result page; /benchmarks 1440/390, light/dark.
// Usage: node verify-cr-65-15-d9.mjs <base> <outdir> [expected-revision-prefix]
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr65-15-d9';
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
    // Two models with a LiveBench and an AA Coding Index result, so both tagged rows are in the table.
    await page.goto(`${BASE}/benchmarks?models=${encodeURIComponent('glm-5.3-flash::default,minimax-m3::default')}`, { waitUntil: 'domcontentloaded', timeout: 90000 }); await settle(page);
    // Open every collapsed group so every row is in the DOM.
    for (const button of await page.locator('table tbody button[aria-expanded="false"]').all()) await button.click().catch(() => {});
    await page.waitForTimeout(800);
    const rows = await page.locator('tr:has(.bh-matrix-tag[data-tag="source_changed"])').evaluateAll((trs) => trs.map((tr) => ({
      name: tr.querySelector('.bh-matrix-bench')?.firstChild?.textContent ?? '',
      tip: tr.querySelector('.bh-matrix-tag[data-tag="source_changed"]')?.getAttribute('title') ?? '',
      label: tr.querySelector('.bh-matrix-tag[data-tag="source_changed"]')?.firstChild?.textContent ?? '',
      desc: tr.querySelector('.bh-matrix-desc')?.getAttribute('title') ?? '',
      href: tr.querySelector('a.bh-matrix-link')?.getAttribute('href') ?? null,
    })));
    const live = rows.find((r) => r.name === 'LiveBench'), aa = rows.find((r) => r.name === 'AA Coding Index');
    const tagged = await page.locator('tr:has(.bh-matrix-tag[data-tag="source_changed"])').first();
    await tagged.scrollIntoViewIfNeeded().catch(() => {});
    await page.screenshot({ path: `${OUT}/benchmarks-${w}-${scheme}.png` });
    check(`D9 ${tag}: exactly the LiveBench and AA Coding Index rows carry "Changed at source"`, rows.length === 2 && live && aa && rows.every((r) => r.label === 'Changed at source'), rows.map((r) => r.name));
    check(`D9 ${tag}: each tag's hover is that row's own note`, /LiveBench re-scored this table after we captured it on 10 Sep 2026 \(GLM-5\.3 Flash: 71\.59 then, 71\.14/.test(live?.tip ?? '') && /Artificial Analysis no longer shows the Coding Index on its website/.test(aa?.tip ?? ''), { live: live?.tip, aa: aa?.tip });
    check(`D9 ${tag}: the LiveBench row hover says "values as published on" and repeats the note`, /values as published on 2026-09-10/.test(live?.desc ?? '') && /LiveBench re-scored/.test(live?.desc ?? '') && !/results as of/.test(live?.desc ?? ''), live?.desc?.slice(-400));
    if (live?.href) {
      await page.goto(new URL(live.href, BASE).href, { waitUntil: 'domcontentloaded' }); await settle(page);
      const note = await page.locator('[data-bh-source-change]').first().innerText().catch(() => '');
      await page.screenshot({ path: `${OUT}/result-livebench-${w}-${scheme}.png` });
      check(`D9 ${tag}: the LiveBench result page lists the source change`, /^Changed at source\. LiveBench re-scored this table/.test(note), note);
    } else check(`D9 ${tag}: the LiveBench result page lists the source change`, false, 'no result link in the row');
    check(`${tag}: no page errors`, errors.length === 0, errors.slice(0, 3));
    await ctx.close();
  }
} finally { await browser.close(); }
const failed = checks.filter((c) => !c.ok);
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, revision: meta.revision, runner: process.env.BH_RUNNER || null, at: new Date().toISOString(), passed: checks.length - failed.length, total: checks.length, checks }, null, 1));
console.log(`${checks.length - failed.length}/${checks.length} passed`); for (const c of failed) console.log('FAIL', c.name, c.detail);
