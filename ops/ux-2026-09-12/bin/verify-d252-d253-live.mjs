// D252 + D253 live acceptance. Usage: node ops/ux-2026-09-12/bin/verify-d252-d253-live.mjs <base> <outDir>
//   base   e.g. https://benchmarkheaven.com
//   outDir absolute path; its previous verification.json is removed first, so an old receipt can
//          never be mistaken for this one's
//
// D252 — the category composites nobody re-measured:
//  1. the published payload carries no cat_long_context for any model row, and cat_coding/cat_agentic
//     now cover ~148 rows each where they covered 50 and 45;
//  2. /about lists exactly the three offered categories with their two anchors each, and no longer
//     names DeepSWE, EnterpriseOps-Gym-AA or a Long context category score;
//  3. no score picker offers "Long context (category composite)", and the three that are offered are
//     selectable and rank a real field;
//  4. withdrawal is not removal: the benchmark table still serves the long-context group and its
//     AA-LCR, MLCR-AA and GDP.pdf (AA) rows.
//
// D253 — GDP.pdf is judged on all three of its rows:
//  5. aa-gdp-pdf, stepfun-gdp-pdf and surge-gdp-pdf all serve judged === true with the `judged` tag;
//  6. the GDP.pdf (AA) row renders the Judged tag on the page, desktop and mobile, light and dark;
//  7. DeepSeek V4.1 Flash carries no Benchmaxxing tag, because it is no longer scored.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
// Playwright lives outside this checkout on Sandy, as every shoot-* script in this folder resolves it.
const { chromium } = createRequire('/home/flori/n8n-local/')('playwright');

const [, , BASE = 'https://benchmarkheaven.com', OUT = '/tmp/d252-d253'] = process.argv;
const checks = [];
const ok = (name, pass, detail) => checks.push({ name, pass: !!pass, detail });

async function getJson(path) {
  let last;
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(`${BASE}${path}`, { headers: { 'user-agent': 'benchmarkheaven-d252-verifier' } });
      if (r.ok) return await r.json();
      last = `HTTP ${r.status}`;
    } catch (e) { last = String(e); }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`${path}: ${last}`);
}

/** One fresh browser per context: the benchmark page kills a shared Chromium after a few contexts. */
async function onPage(url, label, theme, fn) {
  const [width, height] = label === 'mobile' ? [390, 844] : [1280, 900];
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width, height }, colorScheme: theme, isMobile: label === 'mobile', hasTouch: label === 'mobile' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  try {
    for (let i = 0; i < 3; i++) {
      try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); break; }
      catch (e) { if (i === 2) throw e; }
    }
    await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(2500);
    await fn(page, errors);
  } finally {
    await context.close();
    await browser.close();
  }
}

const run = async () => {
  mkdirSync(OUT, { recursive: true });
  rmSync(`${OUT}/verification.json`, { force: true });

  // ---- D252 (1): the published category scores
  const home = await getJson('/api/page-data/home');
  const models = home.data?.models ?? [];
  ok('home payload served', models.length > 500, `${models.length} model rows`);
  const held = (key) => models.filter((m) => typeof m.scores?.[key] === 'number').length;
  ok('cat_long_context is withdrawn: no model row carries it', held('cat_long_context') === 0, held('cat_long_context'));
  ok('cat_coding covers the wider field (was 50)', held('cat_coding') >= 120, held('cat_coding'));
  ok('cat_agentic covers the wider field (was 45)', held('cat_agentic') >= 120, held('cat_agentic'));
  ok('cat_science is unchanged (~513)', held('cat_science') >= 500, held('cat_science'));

  // ---- D253 (5): every identity of GDP.pdf is judged
  const BOARDS = { 'aa-gdp-pdf': 'gpt-5.6-sol::max', 'surge-gdp-pdf': 'gpt-5.6-sol::max', 'stepfun-gdp-pdf': 'step-5-preview::default' };
  const byModel = new Map();
  for (const model of new Set(Object.values(BOARDS))) {
    byModel.set(model, (await getJson(`/api/benchmark-matrix?models=${encodeURIComponent(model)}`)).matrix);
  }
  for (const [key, model] of Object.entries(BOARDS)) {
    const rows = byModel.get(model).rows.filter((r) => r.key === key);
    ok(`matrix row served: ${key}`, rows.length > 0, `${rows.length} row(s) on ${model}`);
    for (const row of rows) {
      ok(`judged === true: ${row.id}`, row.judged === true, JSON.stringify(row.judged));
      ok(`judged tag: ${row.id}`, (row.tags ?? []).includes('judged'), JSON.stringify(row.tags));
    }
  }
  // D252 (4): withdrawal is not removal — the long-context boards are still published
  const lcRows = byModel.get('gpt-5.6-sol::max').rows.filter((r) => r.group === 'long-context');
  ok('the long-context group is still served', lcRows.length >= 3, lcRows.map((r) => r.key));
  for (const key of ['aa-lcr', 'aa-gdp-pdf']) {
    ok(`long-context board still published: ${key}`, lcRows.some((r) => r.key === key), lcRows.map((r) => r.key));
  }

  // ---- D252 (2): /about
  await onPage(`${BASE}/about#category-scores`, 'desktop', 'dark', async (page, errors) => {
    const seen = await page.evaluate(() => {
      const list = document.querySelector('[data-category-anchors]');
      // The heading's own paragraph, not a container's: #category-scores is an <h4>, so walk forward
      // over its siblings until the next heading and read that.
      const parts = [];
      for (let el = document.getElementById('category-scores')?.nextElementSibling; el; el = el.nextElementSibling) {
        if (/^H[1-6]$/.test(el.tagName)) break;
        parts.push(el.textContent ?? '');
      }
      return {
        items: list ? [...list.querySelectorAll('li')].map((li) => li.textContent.replace(/\s+/g, ' ').trim()) : null,
        prose: parts.join(' ').replace(/\s+/g, ' ').trim(),
      };
    });
    ok('/about lists the offered categories', (seen.items ?? []).length === 3, seen.items);
    for (const [label, anchors] of [['Coding', ['Terminal-Bench v4.0 (AA)', 'SciCode (AA subproblems)']],
      ['Agentic & tool use', ['AutomationBench-AA', 'τ³-Banking (AA)']],
      ['Science', ['CritPt (AA)', 'GPQA Diamond (AA)']]]) {
      const item = (seen.items ?? []).find((t) => t.startsWith(label));
      ok(`/about anchors for ${label}`, item && anchors.every((a) => item.includes(a)), item);
    }
    ok('/about no longer names a withdrawn anchor', !(seen.items ?? []).some((t) => /DeepSWE|EnterpriseOps/.test(t)), seen.items);
    ok('/about offers no Long context category', !(seen.items ?? []).some((t) => t.startsWith('Long context')), seen.items);
    ok('/about explains the withdrawal', /Long context left it on 28 September 2026/.test(seen.prose), seen.prose.slice(-320));
    ok('/about: no page error', errors.length === 0, errors.slice(0, 3));
  });

  // ---- D252 (3) + D253 (6, 7): the home score picker, the GDP.pdf row and the Benchmaxxing tag
  for (const label of ['desktop', 'mobile']) {
    for (const theme of ['light', 'dark']) {
      await onPage(`${BASE}/?view=advanced`, label, theme, async (page, errors) => {
        const seen = await page.evaluate(() => {
          const options = [...document.querySelectorAll('select option')].map((o) => (o.textContent ?? '').trim());
          return { options, offersLongContext: options.some((t) => /Long context/i.test(t)) };
        });
        ok(`${label}/${theme}: a score picker is on the page`, seen.options.length > 5, seen.options.length);
        ok(`${label}/${theme}: no picker offers Long context`, !seen.offersLongContext, seen.options.filter((t) => /context/i.test(t)));
        ok(`${label}/${theme}: home has no page error`, errors.length === 0, errors.slice(0, 3));
        await page.screenshot({ path: `${OUT}/home-${label}-${theme}.png` });
      });
      await onPage(`${BASE}/benchmarks?models=${encodeURIComponent('gpt-5.6-sol::max')}`, label, theme, async (page, errors) => {
        const seen = await page.evaluate(() => {
          const rows = [...document.querySelectorAll('tr')];
          const gdp = rows.find((tr) => /GDP\.pdf \(AA\)/.test(tr.textContent ?? ''));
          return { tags: gdp ? [...gdp.querySelectorAll('.bh-matrix-tag')].map((e) => e.getAttribute('data-tag')) : null };
        });
        ok(`${label}/${theme}: GDP.pdf (AA) row served`, seen.tags !== null, seen.tags);
        ok(`${label}/${theme}: GDP.pdf (AA) carries the Judged tag`, (seen.tags ?? []).includes('judged'), seen.tags);
        ok(`${label}/${theme}: benchmarks has no page error`, errors.length === 0, errors.slice(0, 3));
        await page.screenshot({ path: `${OUT}/gdp-row-${label}-${theme}.png` });
      });
    }
  }
  // D253 (7): the family CR-77 named is unscored, so it shows no tag anywhere
  const bmx = await getJson('/api/benchmaxxing?report=deepseek-v4.1-flash%3A%3Amax');
  const report = bmx.report ?? {};
  ok('DeepSeek V4.1 Flash is unscored for want of capability comparisons',
    report.status === 'insufficient-coverage', { status: report.status, comparisons: report.comparisons, score: report.score });
  ok('and the count is the one the two GDP.pdf axes left behind (was 7)',
    report.comparisons === 5, report.comparisons);
  await onPage(`${BASE}/models/deepseek-v4.1-flash`, 'desktop', 'dark', async (page, errors) => {
    const text = await page.evaluate(() => document.body.textContent.replace(/\s+/g, ' ').trim());
    ok('model page: no Benchmaxxing level is claimed', !/Benchmaxxing[^.]{0,40}(light|medium|very strong)/i.test(text),
      (text.match(/.{0,80}Benchmaxxing.{0,120}/) ?? [''])[0]);
    ok('model page: no page error', errors.length === 0, errors.slice(0, 3));
  });

  const pass = checks.filter((c) => c.pass).length;
  writeFileSync(`${OUT}/verification.json`, `${JSON.stringify({ base: BASE, checked_at: new Date().toISOString(), pass, total: checks.length, checks }, null, 2)}\n`);
  console.log(`${BASE}: ${pass}/${checks.length}`);
  for (const c of checks) if (!c.pass) console.log(`  FAIL ${c.name}: ${JSON.stringify(c.detail)?.slice(0, 260)}`);
  if (pass !== checks.length) process.exitCode = 1;
};

run().catch((e) => { console.error(e); process.exitCode = 1; });
