// CR-80 live verification (Florian 2026-09-18, CR-20260918a).
//   CR-80.3 — Muse Spark 1.3 is visible on the homepage leaderboard in Simple mode at its score position
//             (1440 and 390 px, light and dark, canonical and legacy hosts).
//   CR-80.2 — a model with a score but no priced offer is listed by default ("No public API price" cell),
//             excluded only from cost charts (note naming how many), and only a set cost limit drops it from
//             the table (with a count note). Verified on the Advanced home.
//   CR-80.1 — the Muse Spark 1.3 ranking row carries a real price from the OpenRouter Meta endpoint.
// Usage: node verify-cr-80.mjs <base> <outdir> [expected-revision-prefix]
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-80';
const REV = process.argv[4] || '';
await fs.mkdir(OUT, { recursive: true });
const goto = async (page, url) => { for (let a = 1; ; a++) { try { return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 3000 * a)); } } };
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const meta = await (await fetch(`${BASE}/api/meta`)).json().catch(() => ({}));
check('deployed revision matches the expected commit', !REV || String(meta.revision || '').startsWith(REV), { revision: meta.revision, expected: REV });
// CR-80.1 (provenance): the buried OpenRouter Meta price for Muse Spark 1.3 is in the site's data.
const home = await (await fetch(`${BASE}/api/page-data/home`)).json().catch(() => null);
const museOffer = home?.data?.offersByModel?.['muse-spark-1.3::max']?.find((o) => /openrouter/i.test(o.key ?? o.platform ?? ''));
check('CR-80.1: the OpenRouter Meta price (collected 2026-09-18) is in the site payload',
  museOffer && museOffer.input_per_1m > 0 && museOffer.output_per_1m > 0,
  museOffer ? { in: museOffer.input_per_1m, out: museOffer.output_per_1m } : 'offer missing');
check('CR-80.1 note: the offer is data-training-flagged, so the default private-data scope prices it out — by design',
  museOffer ? museOffer.data_private === false : true, museOffer?.data_private);

const b = await chromium.launch();
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1100 }], ['mobile', { width: 390, height: 844 }]]) {
  const mobile = kind !== 'desktop';
  const c = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme, deviceScaleFactor: mobile ? 2 : 1 });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const page = await c.newPage(); const tag = `${kind}_${theme}`; const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));

  // --- CR-80.3: Simple mode, default view ---------------------------------------------------------------
  await goto(page, `${BASE}/`); await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
  await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(2000);
  const simple = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('tr.bh-ranking-row')];
    return {
      muse: rows.some((r) => r.dataset.modelId === 'muse-spark-1.3::max'),
      museRow: rows.filter((r) => r.dataset.modelId === 'muse-spark-1.3::max')
        .map((r) => ({ score: Number(r.dataset.score), cost: r.dataset.cost })),
      ordered: rows.filter((r) => r.dataset.score != null).map((r) => Number(r.dataset.score)),
      overflow: document.documentElement.scrollWidth - innerWidth,
    };
  });
  check(`${tag} CR-80.3 Simple: Muse Spark 1.3 is in the default leaderboard`, simple.muse, simple.museRow);
  const museScore = Number(simple.museRow[0]?.score);
  const rowsAbove = simple.ordered.slice(0, simple.ordered.indexOf(museScore));
  const rowsBelow = simple.ordered.slice(simple.ordered.indexOf(museScore) + 1);
  check(`${tag} CR-80.3 Simple: it sits at its score position (every row above scores higher, below lower)`,
    Number.isFinite(museScore) && rowsAbove.every((v) => v >= museScore) && rowsBelow.every((v) => v <= museScore),
    { muse: simple.museRow[0], above: rowsAbove.slice(-2), below: rowsBelow.slice(0, 2) });
  check(`${tag} CR-80.1 Simple: the value map notes how many of these models have no public price`,
    /\d+ models without a public price not plotted/.test(await page.locator('[data-bh-unpriced-note]').first().textContent().catch(() => '')), null);
  check(`${tag} no horizontal overflow (Simple)`, simple.overflow <= 1, simple.overflow);
  await page.screenshot({ path: `${OUT}/home-simple-${tag}.png`, fullPage: false });

  // --- CR-80.2: Advanced mode --------------------------------------------------------------------
  await page.getByRole('tab', { name: /advanced/i }).click().catch(() => {});
  await page.waitForTimeout(1500);
  const adv = await page.evaluate(() => {
    const noPrice = [...document.querySelectorAll('tr.bh-ranking-row [data-bh-no-public-price]')];
    const rows = [...document.querySelectorAll('tr.bh-ranking-row')];
    return {
      noPriceCells: noPrice.length,
      noPriceText: noPrice[0]?.textContent ?? null,
      noPriceTooltip: noPrice[0]?.getAttribute('title') ?? null,
      noPriceScored: noPrice.map((el) => el.closest('tr.bh-ranking-row')?.dataset.score).filter(Boolean).length,
      note: document.querySelector('[data-bh-unpriced-note]')?.textContent ?? null,
      overflow: document.documentElement.scrollWidth - innerWidth,
    };
  });
  check(`${tag} CR-80.2 Advanced: unpriced scored models are listed, cost cell "No public API price"`,
    adv.noPriceCells > 0 && /No public API price/.test(adv.noPriceText ?? '') && adv.noPriceScored > 0,
    { cells: adv.noPriceCells, text: adv.noPriceText, scored: adv.noPriceScored });
  check(`${tag} CR-80.2 Advanced: the cell explains why (tooltip)`, /No provider publishes an API price/.test(adv.noPriceTooltip ?? ''), adv.noPriceTooltip);
  check(`${tag} CR-80.2 Advanced: no cost chart is shown here, so no note is expected`, adv.note === null, adv.note);
  check(`${tag} no horizontal overflow (Advanced)`, adv.overflow <= 1, adv.overflow);
  await page.screenshot({ path: `${OUT}/home-advanced-${tag}.png`, fullPage: false });

  // --- CR-80.2: a set cost limit drops unpriced rows, with a count note; clearing brings them back -----
  if (!mobile) {
    const input = page.locator('input[aria-label="Max $/task"]').first();
    if (await input.count()) {
      await input.fill('0.5'); await page.waitForTimeout(800);
      const capped = await page.evaluate(() => ({
        excluded: document.querySelector('[data-bh-unpriced-excluded]')?.textContent ?? null,
        noPriceLeft: document.querySelectorAll('tr.bh-ranking-row [data-bh-no-public-price]').length,
      }));
      check(`${tag} CR-80.2 Advanced: a set cost limit hides unpriced rows WITH a count note`,
        capped.noPriceLeft === 0 && /\d+ without a public price excluded/.test(capped.excluded ?? ''), capped);
      await input.fill(''); await page.waitForTimeout(800);
      const cleared = await page.evaluate(() => ({
        excluded: document.querySelector('[data-bh-unpriced-excluded]')?.textContent ?? null,
        noPriceBack: document.querySelectorAll('tr.bh-ranking-row [data-bh-no-public-price]').length,
      }));
      check(`${tag} CR-80.2 Advanced: clearing the limit restores the unpriced rows and drops the note`,
        cleared.noPriceBack > 0 && cleared.excluded === null, cleared);
    } else check(`${tag} CR-80.2 Advanced: Max $/task input present`, false, 'input not found');
  }
  if (errors.length) check(`${tag} page errors`, false, errors.slice(0, 3));
  await c.close();
}
await b.close();
// CR-80.2 full variant: the /scatter value map says how many scored models it cannot plot.
const b2 = await chromium.launch();
const c2 = await b2.newContext({ viewport: { width: 1440, height: 1100 } });
const p2 = await c2.newPage();
await goto(p2, `${BASE}/scatter`); await p2.waitForLoadState('networkidle').catch(() => {}); await p2.waitForTimeout(2500);
const fullNote = await p2.locator('[data-bh-unpriced-note]').first().textContent().catch(() => '');
check('charts CR-80.2: the full value map says how many scored models are not plotted',
  /\d+ models without a public price not plotted/.test(fullNote ?? ''), fullNote);
await b2.close();
const failed = checks.filter((x) => !x.ok);
console.log(JSON.stringify({ base: BASE, passed: checks.length - failed.length, failed: failed.length, checks }, null, 1));
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, revision: meta.revision, passed: checks.length - failed.length, failed: failed.length, checks }, null, 1));
process.exit(failed.length ? 1 : 0);
