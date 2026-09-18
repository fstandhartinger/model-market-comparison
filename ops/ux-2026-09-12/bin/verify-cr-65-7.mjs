// Iteration 94: CR-65.7 (Benchmaxxing pairs ranked among their common cohort) — live scores equal the committed code,
// tag levels, method copy on /benchmaxxing, /about and the Signal (i); 1440/390, light/dark.
// Usage: node verify-cr-65-7.mjs <base> <outdir> [expected-revision-prefix]
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { buildBenchmarkView } from '../../../lib/benchmark-view.mjs';
import { benchmaxxingFamilySignals, scoreBenchmaxxing } from '../../../lib/benchmax.mjs';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr65-7';
const REV = process.argv[4] || '';
await fs.mkdir(OUT, { recursive: true });
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const json = async (path) => (await fetch(`${BASE}${path}`)).json();
const meta = await json('/api/meta');
check('deployed revision matches the expected commit', !REV || String(meta.revision || '').startsWith(REV), { revision: meta.revision, expected: REV });

const ds = JSON.parse(readFileSync(new URL('../../../data/dataset.json', import.meta.url), 'utf8'));
const view = buildBenchmarkView(ds);
const sameData = ds.generated_at === meta.generated_at;
check('live dataset is the committed dataset (score comparison is exact)', sameData, { live: meta.generated_at, local: ds.generated_at });
// Re-pinned review 20260918T024002Z: CR-74.1 gave the pills three levels (light/medium/very strong);
// taggedFamilies is the committed-code ground truth for which families carry a pill.
const { taggedFamilies, representatives } = benchmaxxingFamilySignals(view);
const taggedNames = [...taggedFamilies].map((f) => view.models.find((m) => m.id === representatives.get(f))?.name ?? f);
for (const id of ['glm-5.3::max', 'gpt-6-astra::max', 'qwen3.6-plus::default', 'grok-4.3::high']) {
  const r = (await json(`/api/benchmaxxing?report=${encodeURIComponent(id)}`)).report;
  const local = scoreBenchmaxxing(view, id);
  check(`CR-65.7 report ${id}: live score and comparisons equal the committed code`, r && r.status === local.status && (local.score == null ? r.score == null : Math.abs(r.score - local.score) < 1e-9) && r.comparisons === local.comparisons,
    { live: r && { status: r.status, score: r.score, comparisons: r.comparisons }, local: { status: local.status, score: local.score, comparisons: local.comparisons } });
}

const browser = await chromium.launch();
const settle = async (page) => { await page.waitForFunction(() => !document.querySelector('.bh-deferred'), null, { timeout: 90000 }).catch(() => {}); await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1200); };
const squash = (s) => s.replace(/\s+/g, ' ');
try {
  for (const scheme of ['light', 'dark']) for (const [w, h] of [[1440, 900], [390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, ...(w < 500 ? { isMobile: true, hasTouch: true } : {}) });
    await ctx.addInitScript((t) => { try { localStorage.setItem('bh-theme', t); } catch {} }, scheme);
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
    const tag = `${w}px ${scheme}`;
    await page.goto(`${BASE}/benchmaxxing`, { waitUntil: 'domcontentloaded', timeout: 90000 }); await settle(page);
    await page.screenshot({ path: `${OUT}/benchmaxxing-${w}-${scheme}.png` });
    const pills = await page.locator('table .bh-signal-pill').evaluateAll((els) => els.map((e) => ({ level: e.getAttribute('data-level'), row: (e.closest('tr')?.innerText ?? '').replace(/\s+/g, ' ').slice(0, 120) })));
    const text = squash(await page.locator('main').evaluate((el) => el.textContent));
    // Re-pinned review 20260918T024002Z: the table is paginated ("Show all"), so only the visible pill rows
    // are name-compared; the complete-set/level assertions run API-side in verify-cr-65-iter91.
    check(`CR-65.7 ${tag}: visible pills carry the CR-74 levels and name committed tagged families only`, pills.length > 0 && pills.every((p) => ['light', 'medium', 'strong'].includes(p.level))
      && pills.length <= taggedNames.length && pills.every((p) => taggedNames.some((n) => p.row.includes(n.replace(/ \(.*$/, '')))), { pills, visible: pills.length, taggedTotal: taggedNames.length });
    // F-118 (Fable pass 22) replaced the long page intro with the four-line Signal InfoTip below; the
    // shrink details live on /about (asserted at the end of this block).
    check(`CR-65.7 ${tag}: /benchmaxxing states the screening, capability-only premise`, /screening flag, not proof of leakage/.test(text) && /Only verifiable capability results count/.test(text), '');
    await page.getByRole('button', { name: 'About the Signal column' }).first().click().catch(() => {});
    await page.waitForTimeout(600);
    const tip = squash(await page.evaluate(() => [...document.querySelectorAll('[role="tooltip"], [role="dialog"], dialog[open]')].map((el) => el.textContent).join(' ')));
    await page.screenshot({ path: `${OUT}/signal-info-${w}-${scheme}.png` });
    // F-118 rewrote the tooltip as four short lines; pairwise-percentile wording now sits on /about.
    check(`CR-65.7 ${tag}: Signal (i) names the headline/held-out percentile gap and shrinkage`, /Signed gap, in percentile points/.test(tip) && /pulled toward zero/.test(tip) && /held-out/.test(tip), tip.slice(0, 220));
    await page.keyboard.press('Escape').catch(() => {});
    await page.goto(`${BASE}/about`, { waitUntil: 'domcontentloaded' }); await settle(page);
    const about = squash(await page.locator('main').evaluate((el) => el.textContent));
    check(`CR-65.7 ${tag}: /about states the common-cohort comparison and the k-clamped shrinkage`, /ranked among the models that took both tests/.test(about) && /clamped to 6.{0,3}50/.test(about), '');
    check(`${tag}: no page errors`, errors.length === 0, errors.slice(0, 3));
    await ctx.close();
  }
} finally { await browser.close(); }
const failed = checks.filter((c) => !c.ok);
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, revision: meta.revision, runner: process.env.BH_RUNNER || null, at: new Date().toISOString(), passed: checks.length - failed.length, total: checks.length, checks }, null, 1));
console.log(`${checks.length - failed.length}/${checks.length} passed`); for (const c of failed) console.log('FAIL', c.name, c.detail);
