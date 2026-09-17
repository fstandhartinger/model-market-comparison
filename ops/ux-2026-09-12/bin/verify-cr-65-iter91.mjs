// Iteration 91: CR-65.3 (one-sided projection), CR-65.4 (insufficient-evidence band), CR-65.10 (preliminary basis) — live, 1440/390, light/dark.
// Usage: node verify-cr-65-iter91.mjs <base> <outdir> [expected-revision-prefix]
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr65-iter91';
const REV = process.argv[4] || '';
await fs.mkdir(OUT, { recursive: true });
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const json = async (path) => { const r = await fetch(`${BASE}${path}`); return r.ok ? r.json() : { status: r.status }; };
const meta = await json('/api/meta');
check('deployed revision matches the expected commit', !REV || String(meta.revision || '').startsWith(REV), { revision: meta.revision, expected: REV });

const root = '/opt/model-market-comparison';
const { clientData, isThinComposite } = await import(`${root}/lib/client-model.ts`);
const local = new Map(clientData(JSON.parse(readFileSync(`${root}/data/dataset.json`, 'utf8'))).models.map((m) => [m.id, m]));

// CR-65.3: no live score above its base; sampled rows equal the committed code; the former raised dominators sit at their base.
const models = (await json('/api/models?score=composite')).models || [];
const raised = models.filter((m) => m.score > m.composite_base + 1e-9).map((m) => [m.id, m.composite_base, m.score]);
check('CR-65.3: no live composite is raised above its mean-imputed base', models.length > 800 && raised.length === 0, { n: models.length, raised: raised.slice(0, 5) });
const sample = ['gpt-5.6-luna::non-reasoning', 'claude-opus-5::low', 'gpt-5.2-pro::default', 'claude-fable-5.1::max', 'gpt-6-astra::high', 'gpt-5.5-pro::xhigh', 'kimi-k3::max', 'agnes-3.0-flash::default'];
const mismatch = sample.map((id) => [id, models.find((m) => m.id === id)?.score, local.get(id)?.scores.composite]).filter(([, live, loc]) => live == null || Math.abs(live - loc) > 1e-9);
check('CR-65.3: live composite equals the committed code on 8 sampled rows', mismatch.length === 0, { mismatch });
const luna = models.find((m) => m.id === 'gpt-5.6-luna::non-reasoning');
check('CR-65.3: gpt-5.6-luna::non-reasoning (raised 55.2 → 64.5 before) keeps its base', luna && Math.abs(luna.score - luna.composite_base) < 1e-9, { score: luna?.score, base: luna?.composite_base });

// CR-65.10: the API accepts the new basis filter (no preliminary rows are published yet).
const prelim = await json('/api/benchmark-scores?basis=preliminary&limit=5');
check('CR-65.10: /api/benchmark-scores accepts basis=preliminary', Array.isArray(prelim.observations), { status: prelim.status, total: prelim.total });

// The first 30 composite rows of the Overview's default order hold no thin row while measured rows remain.
const current = [...local.values()].filter((m) => !m.deprecated);
const ordered = current.map((m) => ({ m, sc: m.scores.composite })).sort((a, b) => Number(isThinComposite(a.m)) - Number(isThinComposite(b.m)) || b.sc - a.sc);
check('CR-65.4: first 30 rows of the default composite order are all ≥ 3 inputs', ordered.slice(0, 30).every((x) => !isThinComposite(x.m)), ordered.slice(0, 30).map((x) => x.m.id).join(', '));

const browser = await chromium.launch();
const settle = async (page) => { await page.waitForFunction(() => !document.querySelector('.bh-deferred'), null, { timeout: 90000 }).catch(() => {}); await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1200); };
try {
  for (const scheme of ['light', 'dark']) for (const [w, h] of [[1440, 900], [390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, ...(w < 500 ? { isMobile: true, hasTouch: true } : {}) });
    await ctx.addInitScript((t) => { try { localStorage.setItem('bh-theme', t); } catch {} }, scheme);
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
    const tag = `${w}px ${scheme}`;

    // CR-65.4: Advanced, default sort (Score ▼ Composite): thin rows only after the band row, each with "n/7 inputs".
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 90000 }); await settle(page);
    await page.getByRole('tab', { name: 'Advanced' }).click(); await settle(page);
    const layout = await page.evaluate(() => {
      const trs = [...document.querySelectorAll('table tbody tr')].filter((tr) => tr.matches('[data-model-id], [data-evidence-band]'));
      const kinds = trs.map((tr) => tr.hasAttribute('data-evidence-band') ? 'band' : tr.querySelector('[data-composite-inputs]') ? 'thin' : 'measured');
      const sort = document.querySelector('th[aria-sort="descending"]')?.textContent || null;
      const band = document.querySelector('[data-evidence-band]');
      return { kinds, sort, bandText: band?.textContent?.trim() || null, inputs: [...document.querySelectorAll('[data-composite-inputs]')].slice(0, 3).map((e) => e.textContent) };
    });
    const bandAt = layout.kinds.indexOf('band'), firstThin = layout.kinds.indexOf('thin'), lastMeasured = layout.kinds.lastIndexOf('measured');
    const ordered = firstThin < 0 ? bandAt < 0 : bandAt >= 0 && bandAt < firstThin && lastMeasured < bandAt && layout.kinds.filter((k) => k === 'band').length === 1;
    check(`CR-65.4 ${tag}: Advanced composite ranking — thin rows only inside one labelled band below measured rows`, /score/i.test(layout.sort || '') && lastMeasured > 0 && ordered && layout.inputs.every((t) => /^[0-2]\/7 inputs$/.test(t)),
      { sort: layout.sort, rows: layout.kinds.length, bandAt, firstThin, lastMeasured, thin: layout.kinds.filter((k) => k === 'thin').length, inputs: layout.inputs, band: layout.bandText });
    if (bandAt >= 0) {
      await page.locator('[data-evidence-band]').scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${OUT}/overview-band-${w}-${scheme}.png` });
    } else await page.screenshot({ path: `${OUT}/overview-advanced-${w}-${scheme}.png` });
    await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('mmc.settings')) localStorage.removeItem(k); });

    // CR-65.3: the model page discloses an adjustment above one point.
    await page.goto(`${BASE}/models/${encodeURIComponent('agnes-3.0-flash::default')}`, { waitUntil: 'domcontentloaded' }); await settle(page);
    const adj = await page.locator('[data-bh-composite-adjusted]').first().innerText().catch(() => '');
    await page.screenshot({ path: `${OUT}/model-adjusted-${w}-${scheme}.png` });
    check(`CR-65.3 ${tag}: model page says "adjusted from" for a lowered row`, /^adjusted from \d+(\.\d)?/.test(adj), adj);

    // /about copy.
    await page.goto(`${BASE}/about`, { waitUntil: 'domcontentloaded' }); await settle(page);
    const about = await page.locator('main').innerText();
    check(`CR-65.3/65.4 ${tag}: /about describes the one-sided adjustment and the evidence band`, /better-measured model is never moved/.test(about) && /insufficient evidence/.test(about) && !/smallest symmetric amount/.test(about), '');

    check(`${tag}: no page errors`, errors.length === 0, errors.slice(0, 3));
    await ctx.close();
  }
} finally { await browser.close(); }
const failed = checks.filter((c) => !c.ok);
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, revision: meta.revision, runner: process.env.BH_RUNNER || null, at: new Date().toISOString(), passed: checks.length - failed.length, total: checks.length, checks }, null, 1));
console.log(`${checks.length - failed.length}/${checks.length} passed`); for (const c of failed) console.log('FAIL', c.name, c.detail);
