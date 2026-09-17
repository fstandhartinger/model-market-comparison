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
const root = '/opt/model-market-comparison';
const { clientData } = await import(`${root}/lib/client-model.ts`);
const local = new Map(clientData(JSON.parse(readFileSync(`${root}/data/dataset.json`, 'utf8'))).models.map((m) => [m.id, m]));

// CR-65.12: Nova Micro has no OpenRouter GPQA / τ² observation.
const nova = await json('/api/benchmark-scores?model_id=nova-micro::default&limit=500');
const novaOr = (nova.observations || []).filter((o) => o.benchmark_id.startsWith('openrouter-'));
check('CR-65.12: Nova Micro shows no OpenRouter GPQA Diamond / τ² value', Array.isArray(nova.observations) && novaOr.length === 0, { total: nova.total, openrouter: novaOr.map((o) => o.benchmark_id) });

// CR-65.1 + CR-65.2: live composite equals the local computation; non-reasoning no longer carries max's AA values.
const models = (await json('/api/models?score=composite')).models || [];
const sample = ['claude-opus-5::non-reasoning', 'claude-opus-5::max', 'kimi-k3::default', 'kimi-k3::max', 'claude-fable-5.1::max', 'gpt-6-astra::high', 'gpt-5.5-pro::xhigh', 'grok-4.6::high', 'glm-5.3::max', 'deepseek-v4-pro::high'];
const mismatch = sample.map((id) => [id, models.find((m) => m.id === id)?.score, local.get(id)?.scores.composite]).filter(([, live, loc]) => live == null || Math.abs(live - loc) > 1e-9);
check('CR-65.1/65.2: live composite equals the committed code on 10 sampled rows', models.length > 800 && mismatch.length === 0, { mismatch });
const nr = local.get('claude-opus-5::non-reasoning');
check('CR-65.1: claude-opus-5::non-reasoning has no borrowed AA Intelligence / AA Coding', nr && nr.scores.aa_intelligence_index == null && nr.scores.aa_coding_index == null && !nr.composite_attachments.aa_intelligence_index, { aa_ii: nr?.scores.aa_intelligence_index, attached: Object.keys(nr?.composite_attachments || {}) });

// CR-65.5/65.6: report API carries the level adjustment; no judged/Uncensored axes.
for (const id of ['qwen3.6-plus::default', 'gpt-6-astra::max']) {
  const j = await json(`/api/benchmaxxing?report=${encodeURIComponent(id)}`);
  const r = j.report; const axes = r?.profile?.axes || [];
  check(`CR-65.5/65.7 report ${id}: level-adjusted, no Uncensored axis`, r && (r.status !== 'scored' || r.levelAdjustment) && !axes.some((a) => a.category === 'Uncensored'), { status: r?.status, level: r?.levelAdjustment, uncensored: axes.filter((a) => a.category === 'Uncensored').length });
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
    check(`CR-65.5/65.6 ${tag}: pills carry strong/weak levels, no fixed-25 copy, new intro`, pills.length > 0 && pills.every((l) => l === 'strong' || l === 'weak') && pills.includes('strong') && !/Above 25/.test(body) && /adjusted for where the model sits in the field/.test(body) && !/more benchmaxxed it looks/.test(body) && /a tag needs 10/.test(body), { pills: pills.slice(0, 20), n: pills.length });

    // /about copy for the four rows.
    await page.goto(`${BASE}/about`, { waitUntil: 'domcontentloaded' }); await settle(page);
    const about = await page.locator('main').innerText();
    check(`CR-65.1/65.2/65.8/65.5 ${tag}: /about describes family scope, linked rank-based composite, common workload, level adjustment`,
      /Effort settings are scored separately/.test(about) && /rank-based/.test(about) && /linked/.test(about) && /One common workload/.test(about) && /divided by the spread expected at its level/.test(about) && !/unknown cache-hit rate assumes 0/.test(about), '');

    check(`${tag}: no page errors`, errors.length === 0, errors.slice(0, 3));
    await ctx.close();
  }
} finally { await browser.close(); }
const failed = checks.filter((c) => !c.ok);
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, revision: meta.revision, runner: process.env.BH_RUNNER || null, at: new Date().toISOString(), passed: checks.length - failed.length, total: checks.length, checks }, null, 1));
console.log(`${checks.length - failed.length}/${checks.length} passed`); for (const c of failed) console.log('FAIL', c.name, c.detail);
