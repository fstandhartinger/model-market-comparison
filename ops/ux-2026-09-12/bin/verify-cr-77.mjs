// CR-77 live verification (Florian 2026-09-17, priority).
//  Re-pinned 2026-09-17 (iteration 101): the four named models keep their checks, but on the *rule* CR-77.1 states
//  — the level a row shows is the level its published score implies — not on the score values of the 17 Sep dataset.
//  CR-78 deliberately moved muse-spark-1.1 from medium to very strong and the daily refresh moved DeepSeek V4.1 Flash
//  from +6.4 to +6.7, so eight checks were failing on numbers that are meant to move.
//  77.1/77.2 — the Benchmaxxing tag follows the published score alone: DeepSeek V4.1 Flash (+6.4 when written) carries the medium
//              tag in Featured and in Top 50, Gemini 3.7 Flash / Muse Spark 1.1 / Muse Spark 1.2 carry the level their
//              score implies, the Overview table shows tagged models, and a tag on thin evidence is marked "◔
//              uncertain" with its reason instead of being suppressed. No surface still claims the old guards.
//  77.3    — the homepage value map's green line includes Claude Fable 5.1.
// Usage: node verify-cr-77.mjs <base> <outdir> [expected-revision-prefix]
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-77';
const REV = process.argv[4] || '';
await fs.mkdir(OUT, { recursive: true });
const goto = async (page, url) => { for (let a = 1; ; a++) { try { return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 3000 * a)); } } };
/** CR-74.1 thresholds, read off the value the pill itself prints — the rule CR-77.1 states, in one place. */
const levelFor = (printed) => { const v = Number(String(printed ?? '').replace('+', '')); if (!Number.isFinite(v)) return null; return v >= 12 ? 'strong' : v >= 6 ? 'medium' : v >= 3 ? 'light' : null; };
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const meta = await (await fetch(`${BASE}/api/meta`)).json().catch(() => ({}));
check('deployed revision matches the expected commit', !REV || String(meta.revision || '').startsWith(REV), { revision: meta.revision, expected: REV });

const b = await chromium.launch();
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1100 }], ['mobile', { width: 390, height: 844 }]]) {
  const mobile = kind !== 'desktop';
  const c = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme, deviceScaleFactor: mobile ? 2 : 1 });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const page = await c.newPage(); const tag = `${kind}_${theme}`; const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));

  // --- home: value map + Overview tags -----------------------------------------------------------------------
  await goto(page, `${BASE}/`); await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
  await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1800);
  const home = await page.evaluate(() => ({
    labels: [...document.querySelectorAll('.bh-value-map .bh-point-labels text')].map((t) => t.textContent),
    frontier: [...document.querySelectorAll('.bh-value-map circle[data-frontier-id]')].map((c) => c.getAttribute('data-frontier-id')),
    halos: document.querySelectorAll('.bh-value-map circle[stroke="#7ee0c0"]').length,
    caption: document.querySelector('[data-bh-pareto-caption]')?.textContent ?? null,
    captionTitle: document.querySelector('[data-bh-pareto-caption]')?.getAttribute('title') ?? null,
    tags: [...document.querySelectorAll('tr.bh-ranking-row')].flatMap((r) => { const t = r.querySelector('.bh-bmx-tag'); if (!t) return [];
      return [{ name: r.querySelector('a')?.textContent?.trim(), level: t.dataset.level, uncertain: t.hasAttribute('data-bmx-uncertain'), title: t.getAttribute('title') ?? '' }]; }),
    frontierRows: [...document.querySelectorAll('tr.bh-ranking-row')].map((r) => ({ name: r.querySelector('a')?.textContent?.trim(), cost: Number(r.dataset.cost), score: Number(r.dataset.score) })),
    overflow: document.documentElement.scrollWidth - innerWidth,
  }));
  check(`${tag} home: Claude Fable 5.1 is on the green line`, home.frontier.some((id) => String(id).startsWith('claude-fable-5.1')), { frontier: home.frontier, labels: home.labels.slice(0, 6) });
  check(`${tag} home: GPT-6 Astra, the model it trails by 0.13 points, is on the line too`, home.frontier.some((id) => String(id).startsWith('gpt-6-astra')), home.frontier);
  check(`${tag} home: the green line has more than one member and did not become a cloud`, home.halos > 1 && home.halos <= 15 && home.halos === home.frontier.length, { halos: home.halos, frontier: home.frontier.length, plotted: home.frontierRows.length });
  check(`${tag} home: the caption keeps Florian's sentence and names the tolerance in its tooltip`,
    /most capable in their price range/.test(home.caption ?? '') && /half a point/.test(home.captionTitle ?? ''), { caption: home.caption, title: (home.captionTitle ?? '').slice(0, 90) });
  check(`${tag} home: the Overview table shows Benchmaxxing tags, and a thin-evidence tag says why`, home.tags.length > 0 && home.tags.every((t) => !t.uncertain || /uncertain/.test(t.title)), home.tags);
  check(`${tag} home: no horizontal overflow`, home.overflow <= 1, home.overflow);
  await page.screenshot({ path: `${OUT}/home-${tag}.png`, fullPage: false });
  const map = page.locator('.bh-value-map').first();
  if (await map.count()) await map.screenshot({ path: `${OUT}/valuemap-${tag}.png` }).catch(() => {});

  // --- benchmaxxing: Featured and Top 50 ---------------------------------------------------------------------
  await goto(page, `${BASE}/benchmaxxing`); await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
  await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1800);
  const read = () => page.evaluate(() => ({
    rows: [...document.querySelectorAll('tr[data-row-id]')].map((r) => ({ id: r.dataset.rowId,
      level: r.querySelector('.bh-signal-pill')?.dataset.level ?? null,
      value: r.querySelector('.bh-signal-pill .tabular')?.textContent ?? null,
      uncertain: r.querySelector('[data-bmx-uncertain]')?.getAttribute('title') ?? null })),
    legend: document.querySelector('[data-bmx-level-legend]')?.innerText ?? '',
    summary: document.querySelector('[data-bmx-uncertain-count]')?.closest('div')?.innerText ?? '',
    overflow: document.documentElement.scrollWidth - innerWidth,
  }));
  const featured = await read();
  const deep = featured.rows.find((r) => r.id.startsWith('deepseek-v4.1-flash'));
  check(`${tag} benchmaxxing Featured: DeepSeek V4.1 Flash carries the tag its score implies`,
    !!deep && deep.level === levelFor(deep.value) && deep.level !== null, deep);
  check(`${tag} benchmaxxing Featured: its thin evidence is disclosed, not suppressed`, /uncertain/.test(deep?.uncertain ?? ''), deep?.uncertain);
  check(`${tag} benchmaxxing: the legend states the rule and the marker, not the old guards`,
    /follows the score alone/.test(featured.legend) && /◔/.test(featured.legend) && !/needs ≥ 10 comparisons/.test(featured.legend), featured.legend.replace(/\n/g, ' · '));
  check(`${tag} benchmaxxing: every tagged row's level matches its score`, featured.rows.every((r) => {
    if (!r.level) return true; const v = Number(r.value); return r.level === (v >= 12 ? 'strong' : v >= 6 ? 'medium' : 'light');
  }), featured.rows.filter((r) => r.level).slice(0, 8));
  check(`${tag} benchmaxxing Featured: no horizontal overflow`, featured.overflow <= 1, featured.overflow);
  await page.screenshot({ path: `${OUT}/benchmaxxing-featured-${tag}.png`, fullPage: false });
  const deepRow = page.locator('tr[data-row-id^="deepseek-v4.1-flash"]').first();
  if (await deepRow.count()) await deepRow.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/benchmaxxing-featured-deepseek-${tag}.png`, fullPage: false });

  await page.getByRole('button', { name: 'Top 50' }).click(); await page.waitForTimeout(900);
  const top = await read();
  // The four models Florian named in CR-20260917j: each must carry the level its own score implies, whatever that
  // score is today — that is the whole of CR-77.1. A model that leaves Top 50 on a later dataset is reported, not failed.
  for (const family of ['deepseek-v4.1-flash', 'gemini-3.7-flash', 'muse-spark-1.1', 'muse-spark-1.2']) {
    const row = top.rows.find((r) => r.id.startsWith(family));
    check(`${tag} Top 50: ${family} carries the tag its score implies`,
      !row || row.level === levelFor(row.value), row ?? `${family} is not in today's Top 50`);
  }
  check(`${tag} Top 50: no horizontal overflow`, top.overflow <= 1, top.overflow);
  const target = page.locator('tr[data-row-id^="deepseek-v4.1-flash"]').first();
  if (await target.count()) await target.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/benchmaxxing-top50-deepseek-${tag}.png`, fullPage: false });

  check(`${tag} no page errors`, errors.length === 0, errors);
  await c.close();
}

// --- /about: the methodology no longer claims the guards, and explains the grace band ------------------------
const about = await (await fetch(`${BASE}/about`)).text();
check('/about: the tag level follows the score alone', /the level follows that score alone/.test(about), null);
check('/about: no claim that a tag needs ten comparisons and an interval above zero', !/Every level needs at least ten comparisons/.test(about), null);
check('/about: the value map section documents the grace band', /half a point of capability/.test(about), null);
await b.close();
const failed = checks.filter((c) => !c.ok);
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, revision: meta.revision, when: new Date().toISOString(), passed: checks.length - failed.length, failed: failed.length, checks }, null, 1));
console.log(`${checks.length - failed.length}/${checks.length} checks passed`);
for (const c of failed) console.log('FAIL', c.name, c.detail);
process.exit(failed.length ? 1 : 0);
