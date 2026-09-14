// Independent live check of Codex-implemented R5.3 (Simple score slider, default > 85) and
// F-48 (Benchmarks head card merged, first result in the first screen).
// Usage: node verify-r53-f48.mjs <base-url> <evidence-dir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE = process.argv[2] || 'https://benchmarkheaven.com';
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/iter45-r53-f48';
await fs.mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const result = { base: BASE, at: new Date().toISOString(), checks: [] };
const check = (name, ok, detail) => result.checks.push({ name, ok, detail });

for (const [label, viewport, isMobile] of [
  ['desktop', { width: 1440, height: 1000 }, false],
  ['phone', { width: 390, height: 844 }, true],
]) {
  for (const scheme of ['light', 'dark']) {
    const tag = `${label}-${scheme}`;
    const context = await browser.newContext({ viewport, isMobile, colorScheme: scheme });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));

    // R5.3 — a fresh session starts in Simple with the score floor above 85.
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    const slider = page.locator('input[type="range"][aria-label^="Minimum Capability Score"]').first();
    const present = await slider.count();
    check(`${tag} R5.3 score slider present`, present > 0, present);
    if (present) {
      const s = await slider.evaluate((n) => ({ value: Number(n.value), min: Number(n.min), max: Number(n.max), label: n.getAttribute('aria-label') }));
      check(`${tag} R5.3 default floor > 85`, s.value > 85, s);
      check(`${tag} R5.3 label names the active score`, /\(.+\)/.test(s.label || ''), s.label);
      // Moving the slider must change the floor (it is a real control, not a label).
      await slider.evaluate((n) => {
        const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        set.call(n, String(Math.max(Number(n.min), Number(n.value) - 20)));
        n.dispatchEvent(new Event('input', { bubbles: true }));
        n.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await page.waitForTimeout(500);
      const moved = await slider.evaluate((n) => Number(n.value));
      check(`${tag} R5.3 slider responds`, moved < s.value, { before: s.value, after: moved });
    }
    check(`${tag} home no overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), null);
    await page.screenshot({ path: path.join(OUT, `${tag}-home.png`) });

    // F-48 — one head panel, compact pickers, text source link, first result row near the top.
    await page.goto(`${BASE}/benchmarks`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    const f48 = await page.evaluate(() => {
      const labels = [...document.querySelectorAll('label')].map((l) => (l.childNodes[0]?.textContent || '').trim());
      const source = [...document.querySelectorAll('a')].find((a) => /Primary source/.test(a.textContent || ''));
      const panels = [...document.querySelectorAll('select')].map((s) => s.closest('section, .bh-card, [class*="card"]')).filter(Boolean);
      const firstRow = document.querySelector('table tbody tr');
      return {
        pickers: labels.filter((t) => t === 'Category' || t === 'Benchmark and version'),
        pickerPanels: new Set(panels).size,
        // The page head (around the H1) must carry no eyebrow; the category label above the
        // selected benchmark's name inside the panel was deliberately kept in 7c275c4.
        eyebrow: Boolean(document.querySelector('main h1')?.parentElement?.querySelector(':scope > .bh-eyebrow')),
        source: source ? { text: source.textContent.trim(), target: source.target, rel: source.rel } : null,
        firstRowTop: firstRow ? Math.round(firstRow.getBoundingClientRect().top + window.scrollY) : null,
        overflow: document.documentElement.scrollWidth > window.innerWidth,
      };
    });
    check(`${tag} F-48 both pickers`, f48.pickers.length === 2, f48.pickers);
    check(`${tag} F-48 pickers in one panel`, f48.pickerPanels === 1, f48.pickerPanels);
    check(`${tag} F-48 no eyebrow`, !f48.eyebrow, f48.eyebrow);
    check(`${tag} F-48 text primary-source link`, Boolean(f48.source && f48.source.target === '_blank' && /noreferrer/.test(f48.source.rel)), f48.source);
    check(`${tag} F-48 first result within first ~screen`, f48.firstRowTop !== null && f48.firstRowTop <= (label === 'desktop' ? 700 : 950), f48.firstRowTop);
    check(`${tag} F-48 no overflow`, !f48.overflow, f48.overflow);
    check(`${tag} no page errors`, errors.length === 0, errors);
    await page.screenshot({ path: path.join(OUT, `${tag}-benchmarks.png`) });
    await context.close();
  }
}

await browser.close();
result.failures = result.checks.filter((c) => !c.ok).length;
await fs.writeFile(path.join(OUT, 'verification.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify({ base: BASE, checks: result.checks.length, failures: result.failures, failed: result.checks.filter((c) => !c.ok) }, null, 2));
