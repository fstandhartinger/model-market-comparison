// Iteration 92: CR-65.16 (method texts match the code) and CR-65.15 (DesignArena Web Apps label + board links) — live /about at 1440/390, light/dark, plus the category (i) text
// in the deployed client bundle. Usage: node verify-cr-65-16-iter92.mjs <base> <outdir> [expected-revision-prefix]
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr65-16-iter92';
const REV = process.argv[4] || '';
await fs.mkdir(OUT, { recursive: true });
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const meta = await (await fetch(`${BASE}/api/meta?t=${Date.now()}`)).json();
check('deployed revision matches the expected commit', !REV || String(meta.revision || '').startsWith(REV), { revision: meta.revision, expected: REV });

const browser = await chromium.launch();
try {
  for (const scheme of ['light', 'dark']) for (const [w, h] of [[1440, 900], [390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, ...(w < 500 ? { isMobile: true, hasTouch: true } : {}) });
    await ctx.addInitScript((t) => { try { localStorage.setItem('bh-theme', t); } catch {} }, scheme);
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
    const tag = `${w}px ${scheme}`;
    await page.goto(`${BASE}/about`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1000);
    const text = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
    check(`CR-65.16 ${tag}: category scores are a weighted average with saturated anchors at half weight`, /weighted average of that category's anchor benchmarks, on a 0–100 scale: a saturated anchor counts at half the weight/.test(text) && !/plain average of that category/.test(text), '');
    check(`CR-65.16 ${tag}: category scores are compared within one category only`, /compare models within one category, not a Coding score with a Science score/.test(text), '');
    check(`CR-65.16 ${tag}: Elo conversion has no effect on the rank-based composite; deprecated rows in the population`, /does not change the composite, which uses ranks only/.test(text) && /deprecated ones included/.test(text), '');
    const links = await page.locator('main a[href^="https://www.designarena.ai/leaderboard/"]').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    check(`CR-65.15 ${tag}: /about names the Web Apps (agentic) board, links webapps + fullstack, no "DesignArena Frontend"`, /DesignArena Web Apps \(agentic\)/.test(text) && !/DesignArena Frontend/.test(text) && links.includes('https://www.designarena.ai/leaderboard/webapps') && links.includes('https://www.designarena.ai/leaderboard/fullstack'), { links });
    await page.locator('#category-scores').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${OUT}/about-category-scores-${w}-${scheme}.png` });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(`CR-65.16 ${tag}: no horizontal page overflow, no page errors`, overflow <= 1 && errors.length === 0, { overflow, errors });
    for (const path of ['/compare', `/models/${encodeURIComponent('claude-fable-5.1::max')}`]) {
      await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1500);
      const body = await page.locator('main').innerText();
      const at = page.getByText('DesignArena Web Apps (agentic)', { exact: false }).first();
      if (await at.count()) await at.scrollIntoViewIfNeeded().catch(() => {});
      await page.screenshot({ path: `${OUT}/designarena-label-${path.startsWith('/compare') ? 'compare' : 'model'}-${w}-${scheme}.png` });
      check(`CR-65.15 ${tag}: ${path} shows "DesignArena Web Apps (agentic)", no "DesignArena Frontend", no error page`, /DesignArena Web Apps \(agentic\)/.test(body) && !/DesignArena Frontend/.test(body) && !/hit an error while loading/.test(body), '');
    }
    await ctx.close();
  }
  // The category (i) text ships in a client chunk.
  const page = await (await browser.newContext()).newPage();
  const scripts = new Set();
  page.on('response', (r) => { if (r.url().includes('/_next/static/') && r.url().endsWith('.js')) scripts.add(r.url()); });
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 90000 });
  let found = false;
  for (const url of scripts) { const body = await (await fetch(url)).text(); if (body.includes('a saturated anchor counts') && body.includes('a 60 in Coding and a 60 in Science')) { found = true; break; } }
  check('CR-65.16: the category score (i) in the deployed client says weighted, saturated half, compare within one category', found, { scripts: scripts.size });
} finally { await browser.close(); }
const passed = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, revision: meta.revision, at: new Date().toISOString(), passed, total: checks.length, checks }, null, 2));
console.log(`${passed}/${checks.length}`); for (const c of checks.filter((c) => !c.ok)) console.log('FAIL', c.name, c.detail);
