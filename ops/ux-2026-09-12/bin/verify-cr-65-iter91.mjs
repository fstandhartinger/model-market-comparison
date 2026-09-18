// Iteration 91: CR-65.3 (one-sided projection), CR-65.4 (insufficient-evidence band), CR-65.10 (preliminary basis),
// CR-65.13 (OpenRouter default reasoning effort), CR-65.6 (bootstrap-gated tags) — live, 1440/390, light/dark.
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
// Re-pinned review 20260918T024002Z: CR-74.4 lowers the published composite by the family's positive
// Benchmaxxing signal — equality to the committed composite is now asserted through
// benchmaxxingAdjustedComposite(base, signal) from lib/composite.mjs.
const { benchmaxxingAdjustedComposite } = await import(`${root}/lib/composite.mjs`);
const models = (await json('/api/models?score=composite')).models || [];
const raised = models.filter((m) => m.score > m.composite_base + 1e-9).map((m) => [m.id, m.composite_base, m.score]);
check('CR-65.3: no live composite is raised above its mean-imputed base', models.length > 800 && raised.length === 0, { n: models.length, raised: raised.slice(0, 5) });
const sample = ['gpt-5.6-luna::non-reasoning', 'claude-opus-5::low', 'gpt-5.2-pro::default', 'claude-fable-5.1::max', 'gpt-6-astra::high', 'gpt-5.5-pro::xhigh', 'kimi-k3::max', 'agnes-3.0-flash::default'];
const mismatch = sample.map((id) => {
  const live = models.find((m) => m.id === id);
  const loc = local.get(id)?.scores.composite;
  const expected = benchmaxxingAdjustedComposite(loc, live?.benchmaxxing_signal ?? null);
  return [id, live?.score, expected, loc, live?.benchmaxxing_signal];
}).filter(([id, live, expected]) => live == null || expected == null || Math.abs(live - expected) > 1e-9);
check('CR-65.3: live composite equals the committed code on 8 sampled rows (CR-74.4 penalty applied)', mismatch.length === 0, { mismatch });
const luna = models.find((m) => m.id === 'gpt-5.6-luna::non-reasoning');
check('CR-65.3: gpt-5.6-luna::non-reasoning (raised 55.2 → 64.5 before) never sits above its base', luna && luna.score <= luna.composite_base + 1e-9 && Number.isFinite(luna.score), { score: luna?.score, base: luna?.composite_base });

// CR-65.10: the API accepts the new basis filter (no preliminary rows are published yet).
const prelim = await json('/api/benchmark-scores?basis=preliminary&limit=5');
check('CR-65.10: /api/benchmark-scores accepts basis=preliminary', Array.isArray(prelim.observations), { status: prelim.status, total: prelim.total });

// CR-65.13: OpenRouter's GPQA/τ² runs are not on the three non-reasoning rows; DeepSeek V4 Flash's run sits on ::high.
const orOn = async (id) => ((await json(`/api/benchmark-scores?model_id=${encodeURIComponent(id)}&limit=500`)).observations || []).filter((o) => o.benchmark_id.startsWith('openrouter-')).map((o) => o.benchmark_id.split('::')[0]);
const nonReasoning = {};
for (const id of ['deepseek-v4-flash::non-reasoning', 'gemini-2.5-flash::non-reasoning', 'qwen3.5-35b-a3b::non-reasoning']) nonReasoning[id] = await orOn(id);
const flashHigh = await orOn('deepseek-v4-flash::high');
check('CR-65.13: no OpenRouter run on the non-reasoning rows; DeepSeek V4 Flash GPQA/τ² on ::high', Object.values(nonReasoning).every((l) => l.length === 0) && flashHigh.includes('openrouter-gpqa-diamond') && flashHigh.includes('openrouter-tau2-bench-airline'), { nonReasoning, flashHigh });

// CR-65.6: the tag's evidence discipline + GPT-6 Astra untagged.
// Re-pinned review 20260918T024002Z: the "interval above the catalog average" gate was replaced
// (CR-77.1/77.2/78.1) by level thresholds on the published score with an "uncertain" marker when the
// 80 % interval reaches below zero — the tag is never suppressed.
const bmx = await json('/api/page-data/benchmaxxing');
const taggedRows = (bmx.rows || []).filter((r) => r.level);
// Levels follow the published one-decimal score (CR-77.1), so a raw 5.96 shown as +6.0 is medium.
const levelOk = (r) => { const shown = Math.round((r.score ?? 0) * 10) / 10; return (r.level === 'light' && shown >= 3 && shown < 6) || (r.level === 'medium' && shown >= 6 && shown < 12) || (r.level === 'strong' && shown >= 12); };
const crossingZero = taggedRows.filter((r) => r.interval && r.interval.lower <= 0);
check('CR-65.6: tagged rows follow the published score by level; interval below zero carries the uncertain marker; GPT-6 Astra untagged',
  taggedRows.length > 0 && taggedRows.every((r) => levelOk(r) && r.interval) && crossingZero.every((r) => !!r.uncertain) && !(bmx.rows || []).some((r) => r.id.startsWith('gpt-6-astra') && r.level),
  { tagged: taggedRows.map((r) => `${r.id}:${r.level}:${r.interval?.lower?.toFixed(1)}:${r.uncertain ? 'uncertain' : 'clean'}`) });

// The first 30 composite rows of the Overview's default order hold no thin row while measured rows remain.
// Re-pinned review 20260918T024002Z: CR-74.3 sorts thin rows in place (no evidence band), so a thin row may
// appear in the top 30; every thin row must be identifiable as thin by score alone.
const current = [...local.values()].filter((m) => !m.deprecated);
const ordered = current.map((m) => ({ m, sc: m.scores.composite })).sort((a, b) => b.sc - a.sc);
const thinInTop = ordered.slice(0, 30).filter((x) => isThinComposite(x.m));
const liveDef = thinInTop.every((x) => { const live = models.find((m) => m.id === x.m.id); return live && live.composite_coverage < 3; });
check('CR-65.4: thin rows in the composite top 30 are exposed as thin by the API (badge follows coverage)', liveDef, thinInTop.map((x) => x.m.id).join(', ') || 'no thin row in top 30');

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
    // Re-pinned review 20260918T024002Z: CR-74.3 replaced the labelled "insufficient evidence" band with
    // in-place ranking + a "◔ Thin data · n/7" badge on every thin row (hatched bar). Substance kept:
    // every rendered thin row is visibly marked, and no band element exists.
    const bandAt = layout.kinds.indexOf('band'), thin = layout.kinds.filter((k) => k === 'thin').length;
    check(`CR-65.4 ${tag}: Advanced composite ranking — thin rows in place, all marked by the n/7 badge (CR-74.3 form)`, /score/i.test(layout.sort || '') && bandAt < 0 && layout.inputs.length > 0 && layout.inputs.every((t) => /(^|[^\d])[0-2]\/7 inputs?$/.test(t) || /[0-2]\/7/.test(t)),
      { sort: layout.sort, rows: layout.kinds.length, bandAt, thin, inputs: layout.inputs });
    if (bandAt >= 0) {
      await page.locator('[data-evidence-band]').scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${OUT}/overview-band-${w}-${scheme}.png` });
    } else await page.screenshot({ path: `${OUT}/overview-advanced-${w}-${scheme}.png` });
    await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('mmc.settings')) localStorage.removeItem(k); });

    // CR-65.3: the model page discloses an adjustment above one point.
    await page.goto(`${BASE}/models/${encodeURIComponent('agnes-3.0-flash::default')}`, { waitUntil: 'domcontentloaded' }); await settle(page);
    const adj = await page.locator('[data-bh-composite-adjusted]').first().innerText().catch(() => '');
    await page.screenshot({ path: `${OUT}/model-adjusted-${w}-${scheme}.png` });
    // Re-pinned review 20260918T024002Z: the disclosure now says "dominance-adjusted from …" with the
    // rule named on the same line (still the required "adjusted from <base>" disclosure).
    check(`CR-65.3 ${tag}: model page says "adjusted from" for a lowered row`, /^dominance-adjusted from \d+(\.\d)?/.test(adj), adj);

    // CR-65.6: /benchmaxxing opens on the tagged models; their pills carry a level.
    await page.goto(`${BASE}/benchmaxxing`, { waitUntil: 'domcontentloaded' }); await settle(page);
    const pills = await page.locator('table .bh-signal-pill').evaluateAll((els) => els.map((e) => e.getAttribute('data-level')));
    await page.screenshot({ path: `${OUT}/benchmaxxing-${w}-${scheme}.png` });
    // Re-pinned review 20260918T024002Z: CR-74.1 renamed the two pills (weak "△"/strong "⚠") into three
    // level pills (light "?", medium "⚠", very strong "⚠⚠"); the gate is now the level thresholds.
    check(`CR-65.6 ${tag}: /benchmaxxing lists the gated tags (level pills, at most ${taggedRows.length})`, pills.length > 0 && pills.length <= taggedRows.length && pills.every((l) => ['light', 'medium', 'strong'].includes(l)), { pills });

    // /about copy.
    await page.goto(`${BASE}/about`, { waitUntil: 'domcontentloaded' }); await settle(page);
    const about = await page.locator('main').innerText();
    // Re-pinned review 20260918T024002Z: "insufficient evidence" band wording left with CR-74.3; the
    // disclosure the dossier demanded lives in the dominance sentence + the thin-row paragraph, and the
    // CR-77.2 uncertain marker replaced "interval above the catalog average" as the published rule.
    check(`CR-65.3/65.4 ${tag}: /about describes the one-sided dominance adjustment and thin rows`, /better-measured model is never moved/.test(about) && /fewer than three/.test(about) && !/smallest symmetric amount/.test(about), '');
    check(`CR-65.6 ${tag}: /about names the interval uncertainty rule`, /80 % interval reaches below zero is marked uncertain/.test(about), '');
    check(`${tag}: no page errors`, errors.length === 0, errors.slice(0, 3));
    await ctx.close();
  }
} finally { await browser.close(); }
const failed = checks.filter((c) => !c.ok);
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, revision: meta.revision, runner: process.env.BH_RUNNER || null, at: new Date().toISOString(), passed: checks.length - failed.length, total: checks.length, checks }, null, 1));
console.log(`${checks.length - failed.length}/${checks.length} passed`); for (const c of failed) console.log('FAIL', c.name, c.detail);
