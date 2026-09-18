// Iteration 90: CR-65.12, 65.1, 65.8, 65.5 (+65.6/65.7 core), 65.2 — live, 1440/390, light/dark.
// Usage: node verify-cr-65-p0.mjs <base> <outdir> [expected-revision-prefix]
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr65';
const REV = process.argv[4] || '';
await fs.mkdir(OUT, { recursive: true });
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const json = async (path) => { const r = await fetch(`${BASE}${path}`); return r.ok ? r.json() : { status: r.status }; };
const meta = await json('/api/meta');
check('deployed revision matches the expected commit', !REV || String(meta.revision || '').startsWith(REV), { revision: meta.revision, expected: REV });

// Local reference computed with the committed code and dataset.
// Re-pinned review 20260918T024002Z: CR-74.4 (Fable pass 22+, implemented after iter90/91) applies the
// family Benchmaxxing signal to the published Composite by default, so the local reference must include
// the same signals as production (`compositeBenchmaxxingSignals`), else every positively-signalled row reads as a mismatch.
const root = '/opt/model-market-comparison';
const { clientData } = await import(`${root}/lib/client-model.ts`);
const { benchmaxxingAdjustedComposite, BENCHMAXX_COMPOSITE_WEIGHT } = await import(`${root}/lib/composite.mjs`);
const local = new Map(clientData(JSON.parse(readFileSync(`${root}/data/dataset.json`, 'utf8'))).models.map((m) => [m.id, m]));

// CR-65.12: Nova Micro has no OpenRouter GPQA / τ² observation.
const nova = await json('/api/benchmark-scores?model_id=nova-micro::default&limit=500');
const novaOr = (nova.observations || []).filter((o) => o.benchmark_id.startsWith('openrouter-'));
check('CR-65.12: Nova Micro shows no OpenRouter GPQA Diamond / τ² value', Array.isArray(nova.observations) && novaOr.length === 0, { total: nova.total, openrouter: novaOr.map((o) => o.benchmark_id) });

// CR-65.1 + CR-65.2: live composite equals the local computation; non-reasoning no longer carries max's AA values.
const models = (await json('/api/models?score=composite')).models || [];
const sample = ['claude-opus-5::non-reasoning', 'claude-opus-5::max', 'kimi-k3::default', 'kimi-k3::max', 'claude-fable-5.1::max', 'gpt-6-astra::high', 'gpt-5.5-pro::xhigh', 'grok-4.6::high', 'glm-5.3::max', 'deepseek-v4-pro::high'];
// CR-74.4: the published score is the committed composite adjusted by the family Benchmaxxing signal
// (weight BENCHMAXX_COMPOSITE_WEIGHT), and composite_unpenalised must equal the local computation.
const mismatch = sample.map((id) => {
  const live = models.find((m) => m.id === id);
  const loc = local.get(id)?.scores.composite;
  const expected = benchmaxxingAdjustedComposite(loc, live?.benchmaxxing_signal ?? null);
  return [id, live?.score, expected, loc, live?.benchmaxxing_signal];
}).filter(([id, live, expected]) => live == null || expected == null || Math.abs(live - expected) > 1e-9);
check('CR-65.1/65.2: live composite equals the committed code on 10 sampled rows (CR-74.4 penalty applied)', models.length > 800 && mismatch.length === 0, { weight: BENCHMAXX_COMPOSITE_WEIGHT, mismatch });
const nr = local.get('claude-opus-5::non-reasoning');
check('CR-65.1: claude-opus-5::non-reasoning has no borrowed AA Intelligence / AA Coding', nr && nr.scores.aa_intelligence_index == null && nr.scores.aa_coding_index == null && !nr.composite_attachments.aa_intelligence_index, { aa_ii: nr?.scores.aa_intelligence_index, attached: Object.keys(nr?.composite_attachments || {}) });

// CR-65.5/65.7: report API carries the method evidence; no judged/Uncensored axes.
// Re-pinned review 20260918T024002Z: CR-69 replaced the quadratic level adjustment with pairwise
// common-cohort percentiles, CR-78 added the jaggedness part; levelAdjustment no longer exists.
for (const id of ['qwen3.6-plus::default', 'gpt-6-astra::max']) {
  const j = await json(`/api/benchmaxxing?report=${encodeURIComponent(id)}`);
  const r = j.report; const axes = r?.profile?.axes || []; const parts = r?.parts || {};
  check(`CR-65.5/65.7 report ${id}: CR-69/78 method evidence (shrinkage, gap+jaggedness parts, interval), no Uncensored axis`, r && (r.status !== 'scored' || (r.shrinkage && parts.gap != null && parts.jaggednessTerm != null && r.interval)) && !axes.some((a) => a.category === 'Uncensored'), { status: r?.status, parts: Object.keys(parts), uncensored: axes.filter((a) => a.category === 'Uncensored').length });
}

const browser = await chromium.launch();
const settle = async (page) => { await page.waitForFunction(() => !document.querySelector('.bh-deferred'), null, { timeout: 90000 }).catch(() => {}); await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1200); };
try {
  for (const scheme of ['light', 'dark']) for (const [w, h] of [[1440, 900], [390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, ...(w < 500 ? { isMobile: true, hasTouch: true } : {}) });
    await ctx.addInitScript((t) => { try { localStorage.setItem('bh-theme', t); } catch {} }, scheme);
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
    const tag = `${w}px ${scheme}`;

    // CR-65.8: Options → Task workload, default "Same for every model"; switching changes a cost.
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 90000 }); await settle(page);
    const priceButton = () => page.locator('table tbody tr button[aria-haspopup="dialog"]').first();
    const firstCost = async () => { await priceButton().waitFor({ state: 'visible', timeout: 30000 }).catch(() => {}); return (await priceButton().innerText().catch(() => '')).trim(); };
    const before = await firstCost();
    await page.locator('[data-bh-filters-toggle]').first().click();
    const select = page.locator('#bh-io-basis');
    await select.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    const value = await select.inputValue().catch(() => null);
    const options = await select.locator('option').allInnerTexts().catch(() => []);
    await page.screenshot({ path: `${OUT}/options-${w}-${scheme}.png` });
    await select.selectOption('usage').catch(() => {});
    await page.waitForTimeout(800);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(800);
    const after = await firstCost();
    check(`CR-65.8 ${tag}: Task workload select, default common, usage view changes the top row's cost`, value === 'common' && options.join('|') === 'Same for every model|As used on OpenRouter' && before && after && before !== after, { value, options, before, after });
    await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('mmc.settings')) localStorage.removeItem(k); });

    // CR-65.5/65.6: /benchmaxxing pills follow the tag level; copy no longer says "more jagged = more benchmaxxed".
    await page.goto(`${BASE}/benchmaxxing`, { waitUntil: 'domcontentloaded' }); await settle(page);
    const pills = await page.locator('table .bh-signal-pill').evaluateAll((els) => els.map((e) => e.getAttribute('data-level')));
    const body = await page.locator('main').innerText();
    await page.screenshot({ path: `${OUT}/benchmaxxing-${w}-${scheme}.png` });
    // Re-pinned review 20260918T024002Z: CR-74.1 replaced strong/weak with three levels
    // (light/medium/very strong), CR-77.2 replaced the ">=10 comparisons" copy guard with the
    // uncertain marker, and CR-78/CR-79 gave the page its screening intro. Substance kept: pills
    // follow the published tag level, no copy claims a fixed cut, nothing says "more jagged = more benchmaxxed".
    check(`CR-65.5/65.6 ${tag}: pills carry the CR-74 tag levels, no fixed-25 copy, screening intro`, pills.length > 0 && pills.every((l) => ['light', 'medium', 'very strong'].includes(l)) && !/Above 25/.test(body) && /screening flag, not proof of leakage/.test(body) && !/more benchmaxxed it looks/.test(body), { pills: pills.slice(0, 20), n: pills.length });

    // /about copy for the four rows.
    await page.goto(`${BASE}/about`, { waitUntil: 'domcontentloaded' }); await settle(page);
    const about = await page.locator('main').innerText();
    // Re-pinned review 20260918T024002Z: the level-adjustment sentence left with CR-69; its successor in
    // /about is the pairwise common-cohort description plus pull-toward-zero shrinkage.
    check(`CR-65.1/65.2/65.8/65.5 ${tag}: /about describes family scope, linked rank-based composite, common workload, pairwise cohort signal`,
      /Effort settings are scored separately/.test(about) && /rank-based/.test(about) && /linked/.test(about) && /One common workload/.test(about) && /took both tests/.test(about) && /pulled toward zero/.test(about) && !/unknown cache-hit rate assumes 0/.test(about), '');

    check(`${tag}: no page errors`, errors.length === 0, errors.slice(0, 3));
    await ctx.close();
  }
} finally { await browser.close(); }
const failed = checks.filter((c) => !c.ok);
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, revision: meta.revision, runner: process.env.BH_RUNNER || null, at: new Date().toISOString(), passed: checks.length - failed.length, total: checks.length, checks }, null, 1));
console.log(`${checks.length - failed.length}/${checks.length} passed`); for (const c of failed) console.log('FAIL', c.name, c.detail);
