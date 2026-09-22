// Iteration 173 live check (claude-opus): an English count never reads "1 offers". The pages below
// each print a count that is exactly one today — a model with a single offer, a provider with a
// single model, a board that opens on a single matched row — and every one of them printed a plural
// noun after the number before this change.
// Usage: node verify-iter173.mjs <base-url> <out-dir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');

const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-iter173';
await fs.mkdir(OUT, { recursive: true });
const REV = (await (await fetch(`${BASE}/api/meta`)).json()).revision;

// Exactly one published offer, and that offer survives the default global filters (the privacy
// filter hides offers whose provider trains on customer data, so a model can publish one offer and
// still show none in the panel — that is a different, correct, sentence).
const ONE_OFFER = 'grok-4::default';
const ONE_MODEL_PROVIDER = 'Unbiased';                // offers exactly one catalog model
// Boards whose default axis opens on exactly one matched catalog row.
const ONE_ROW_BOARDS = ['critpt::snapshot-2026-09-10'];

const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: !!ok, detail });
const settle = (p) => p.waitForLoadState('networkidle').catch(() => {}).then(() => p.waitForTimeout(1000));
const get = async (path) => (await fetch(`${BASE}${path}${path.includes('?') ? '&' : '?'}v=${Date.now()}`)).json();

// The exact shape the bug had: the number one followed by a plural noun. Applied to visible text,
// so it catches any surface on the page, not only the ones this iteration touched.
const BARE_PLURAL = /(?<![\d.])\b1 (offers|models|providers|results|benchmarks|rows|values|families|tasks|runs|configurations|entries|items)\b/;

// --- the counts really are one, per the public API (so a passing UI check cannot be vacuous) ---
const models = await get('/api/models');
const list = models.models ?? models.data ?? models;
const target = (Array.isArray(list) ? list : []).find((m) => m.id === ONE_OFFER);
// `cheapest_offers` is a truncated top-5 list; `offer_count` is the real one.
check('API: the model under test publishes exactly one offer', target?.offer_count === 1, { id: ONE_OFFER, offer_count: target?.offer_count });
const providers = (await get('/api/providers')).providers ?? [];
const prov = providers.find((p) => p.provider === ONE_MODEL_PROVIDER);
check('API: the provider under test offers exactly one model', prov?.model_count === 1, { provider: ONE_MODEL_PROVIDER, model_count: prov?.model_count });
for (const id of ONE_ROW_BOARDS) {
  const view = await get(`/api/benchmark-view?axis=${encodeURIComponent(await axisOf(id))}`);
  const scores = view.axes?.[0]?.scores ?? [];
  const matched = new Set(scores.filter((s) => s.modelId).map((s) => s.modelId)).size;
  check(`API: ${id} still opens on exactly one matched row`, matched === 1, { matched, published: scores.length });
}
async function axisOf(benchmarkId) {
  const index = await get('/api/benchmark-view');
  const axes = (index.axes ?? []).filter((a) => a.benchmarkId === benchmarkId);
  // the board's default axis is the one the page picks first: most measured catalog peers
  return axes.sort((a, b) => (b.stats?.n ?? 0) - (a.stats?.n ?? 0))[0]?.id;
}

const browser = await chromium.launch();
for (const [w, h] of [[1440, 1000], [390, 844]]) {
  for (const theme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: theme });
    const errors = [];
    ctx.on('weberror', (e) => errors.push(String(e.error()).slice(0, 200)));
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
    const tag = `${w}-${theme}`;

    // 1. a model page whose subtitle and offer panel both count a single offer
    await page.goto(`${BASE}/models/${encodeURIComponent(ONE_OFFER)}`, { waitUntil: 'domcontentloaded' });
    await settle(page);
    let text = await page.locator('body').innerText();
    check(`${tag}: the model subtitle reads "1 offer"`, /·\s*1 offer\b/.test(text) && !/1 offers/.test(text), text.match(/·\s*1 offers?\b/)?.[0]);
    const summary = page.locator('#all-offers summary');
    check(`${tag}: the token-offer panel is headed "1 offer"`, /Token offers by platform · 1 offer(?!s)/.test(await summary.innerText()), (await summary.innerText()).slice(0, 60));
    await summary.click();
    await page.waitForTimeout(400);
    const panel = await page.locator('#all-offers').innerText();
    check(`${tag}: the opened panel says one offer is within the filters`, /\b1 offer within the active global filters/.test(panel), panel.match(/\b\d+ offers? within[^;]*/)?.[0]);
    check(`${tag}: nothing on the model page counts in the plural of one`, !BARE_PLURAL.test(await page.locator('body').innerText()),
      (await page.locator('body').innerText()).match(BARE_PLURAL)?.[0]);
    await page.screenshot({ path: `${OUT}/model-one-offer-${tag}.png`, fullPage: false });

    // 2. a board that opens on a single matched row
    for (const id of ONE_ROW_BOARDS) {
      await page.goto(`${BASE}/benchmarks?benchmark=${encodeURIComponent(id)}`, { waitUntil: 'domcontentloaded' });
      await settle(page);
      text = await page.locator('body').innerText();
      check(`${tag}: ${id} reports "1 result"`, /\b1 result\b/.test(text) && !/\b1 results\b/.test(text), text.match(/\b1 results?\b/)?.[0]);
      check(`${tag}: ${id} keeps the plural where the number is not one`, /of \d+ published results are matched/.test(text) || /of 1 published result is matched/.test(text),
        text.match(/of \d+ published results? (?:are|is) matched/)?.[0]);
      check(`${tag}: ${id} counts nothing in the plural of one`, !BARE_PLURAL.test(text), text.match(BARE_PLURAL)?.[0]);
    }
    await page.screenshot({ path: `${OUT}/board-one-row-${tag}.png`, fullPage: false });

    // 3. the provider that offers exactly one model
    await page.goto(`${BASE}/provider-explorer`, { waitUntil: 'domcontentloaded' });
    await settle(page);
    // Pick a provider the directory itself lists with a single model, so the check cannot pass on a
    // provider the default filters emptied.
    const single = await page.evaluate(() => {
      const tr = [...document.querySelectorAll('table.dtable tbody tr')]
        .find((r) => r.lastElementChild?.textContent?.trim() === '1');
      return tr ? tr.querySelector('button')?.textContent?.trim() ?? null : null;
    });
    check(`${tag}: the directory lists at least one provider with a single model`, !!single, single);
    if (single) {
      await page.getByRole('button', { name: single, exact: true }).first().click();
      await page.waitForTimeout(700);
      text = await page.locator('body').innerText();
      check(`${tag}: the selected one-model provider reads "1 model"`, /\b1 model\b/.test(text) && !/\b1 models\b/.test(text), { single, hit: text.match(/\b1 models?\b/)?.[0] });
    }
    check(`${tag}: the provider directory counts nothing in the plural of one`, !BARE_PLURAL.test(text), text.match(BARE_PLURAL)?.[0]);
    await page.screenshot({ path: `${OUT}/provider-one-model-${tag}.png`, fullPage: false });

    check(`${tag}: no page raised an error`, errors.length === 0, errors.slice(0, 3));
    // A count fix must not have widened any page.
    for (const path of [`/models/${encodeURIComponent(ONE_OFFER)}`, '/provider-explorer', '/benchmarks']) {
      await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
      await settle(page);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(`${tag}: ${path} has no horizontal overflow`, over <= 1, over);
    }
    await ctx.close();
  }
}
await browser.close();

const pass = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, revision: REV, pass, total: checks.length, checks }, null, 2));
console.log(`${BASE} ${pass}/${checks.length} @ ${REV}`);
for (const c of checks.filter((c) => !c.ok)) console.log('FAIL', c.name, JSON.stringify(c.detail));
process.exit(pass === checks.length ? 0 : 1);
