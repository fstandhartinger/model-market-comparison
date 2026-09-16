// CR-63.7/63.8/63.13/63.14/63.15/63.16/63.17/63.18/63.19 and CR-64 — 1440/390, light/dark.
// Usage: BH_RUNNER=<engine> node verify-cr-63-64-batch3.mjs <base> <outdir> [expected-revision-prefix]
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-batch3';
const REV = process.argv[4] || '';
await fs.mkdir(OUT, { recursive: true });
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const meta = await (await fetch(`${BASE}/api/meta`)).json().catch(() => ({}));
check('deployed revision matches the expected commit', !REV || String(meta.revision || '').startsWith(REV), { revision: meta.revision, expected: REV });

// CR-64 via the public report API: no cost/efficiency axis in any sampled report.
for (const id of ['claude-fable-5.1::max', 'gpt-6-astra::xhigh', 'glm-5.2::max', 'kimi-k3::max']) {
  const r = await fetch(`${BASE}/api/benchmaxxing?report=${encodeURIComponent(id)}`); const j = r.ok ? await r.json() : null;
  const axes = j?.report?.profile?.axes ?? [];
  check(`CR-64.1 report ${id}: capability axes only`, r.ok && axes.length > 0 && !axes.some((a) => /-cost::/.test(a.id) || a.category === 'Efficiency'), { status: r.status, axes: axes.length, cost: axes.filter((a) => /-cost::/.test(a.id)).map((a) => a.id) });
}

const browser = await chromium.launch();
const settle = async (page) => { await page.waitForFunction(() => !document.querySelector('.bh-deferred'), null, { timeout: 90000 }).catch(() => {}); await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1200); };
try {
  for (const scheme of ['light', 'dark']) for (const [w, h] of [[1440, 900], [390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, ...(w < 500 ? { isMobile: true, hasTouch: true } : {}) });
    await ctx.addInitScript((t) => { try { localStorage.setItem('bh-theme', t); } catch {} }, scheme);
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
    const tag = `${w}px ${scheme}`;

    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 90000 }); await settle(page);
    const legends = await page.locator('[data-bh-tag-legend]').allInnerTexts();
    const tip = await page.locator('.bh-value-tag').first().getAttribute('title').catch(() => null);
    check(`CR-63.7/63.8 ${tag}: tag legend under the table; badge tooltip names its reference set`, legends.some((t) => /Benchmaxxing/.test(t)) && legends.some((t) => /cheaper/.test(t) && /Simple and Advanced/.test(t)) && /priced models in this (Simple|Advanced) view/.test(tip || ''), { legends: legends.map((t) => t.slice(0, 60)), tip });
    const labels = await page.evaluate(() => {
      const texts = [...document.querySelectorAll('.recharts-wrapper svg text')].filter((t) => !t.closest('.recharts-cartesian-axis')).map((t) => ({ t: t.textContent, r: t.getBoundingClientRect() })).filter((x) => x.r.width > 0 && x.t.trim());
      const ov = []; for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) { const a = texts[i].r, c = texts[j].r; if (a.left < c.right - 1 && c.left < a.right - 1 && a.top < c.bottom - 1 && c.top < a.bottom - 1) ov.push([texts[i].t, texts[j].t]); }
      return { n: texts.length, ov };
    });
    check(`CR-63.18 ${tag}: value-map labels do not overlap`, labels.n >= 3 && labels.ov.length === 0, labels);

    await page.goto(`${BASE}/models/glm-5.2`, { waitUntil: 'domcontentloaded' }); await settle(page);
    const bmx = await page.locator('[data-bh-model-benchmaxxing]').innerText().catch(() => '');
    const card = await page.locator('section[aria-label="Composite and its inputs"]').innerText();
    const hint = await page.getByText('The same list price can give a different adjusted $/task').count();
    const reportHref = await page.locator('[data-bh-model-benchmaxxing] a').getAttribute('href').catch(() => null);
    check(`CR-63.14 ${tag}: model page Benchmaxxing line, radar-axes note, price hint`, /Benchmaxxing signal/.test(bmx) && /report/.test(bmx) && /\/benchmaxxing\?model=.*#radar/.test(reportHref || '') && /6 radar axes/.test(card) && hint === 1, { bmx, reportHref, hint });

    await page.goto(`${BASE}/eu`, { waitUntil: 'domcontentloaded' }); await settle(page);
    const eu = await page.locator('main').innerText();
    const h1 = await page.locator('main h1').evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    const bullets = await page.locator('main ul li').filter({ hasText: /^• (TensorX|Inceptron|Scaleway|Nebius|NextBit|Policy exceptions)/ }).count();
    const th = await page.locator('main table thead th').nth(1).evaluate((el) => ({ text: el.textContent, clipped: el.scrollWidth > el.clientWidth + 1 }));
    check(`CR-63.15 ${tag}: /eu head size, no stale leader names, provider bullets, header not clipped`, h1 >= 24 && !/GLM 5\.1\+|Kimi K2\.6\+|GPT-5\.x/.test(eu) && bullets === 6 && !th.clipped, { h1, bullets, th });

    await page.goto(`${BASE}/benchmarks`, { waitUntil: 'domcontentloaded' }); await settle(page);
    const eciTags = await page.locator('tr').filter({ hasText: /Epoch Capabilities Index|Epoch Software ECI/ }).locator('.bh-matrix-bench [class*="tag"], .bh-matrix-bench span[title]').count();
    const groupLine = await page.locator('.bh-cat-basis').first().innerText().catch(() => '');
    const groupHead = await page.locator('.bh-matrix-group button').first().innerText().catch(() => '');
    const mask = await page.locator('.bh-matrix-bar').first().evaluate((el) => getComputedStyle(el).maskImage || getComputedStyle(el).webkitMaskImage).catch(() => '');
    check(`CR-63.16 ${tag}: ECI chips, group wording, fading bar ends`, eciTags >= 1 && /feed the group score|no group score/.test(groupLine) && /benchmarks/i.test(groupHead) && /gradient/.test(mask || ''), { eciTags, groupLine, groupHead, mask });

    await page.goto(`${BASE}/compare`, { waitUntil: 'domcontentloaded' }); await settle(page);
    const colours = await page.locator('article .h-full.rounded-full').evaluateAll((els) => [...new Set(els.map((e) => e.style.background))]);
    const axesLabel = await page.getByText(/Simple radar · \d+ of 8 axes/).count();
    check(`CR-63.17 ${tag}: strength bars in per-model colours; axes wording`, colours.length >= 2 && axesLabel >= 1, { colours, axesLabel });

    await page.goto(`${BASE}/about#benchmaxxing`, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(600);
    check(`CR-63.19 ${tag}: /about#benchmaxxing section`, (await page.locator('#benchmaxxing').count()) === 1 && /screening flag/.test(await page.locator('#benchmaxxing + p').innerText()), '');

    await page.goto(`${BASE}/benchmaxxing`, { waitUntil: 'domcontentloaded' }); await settle(page);
    check(`CR-64.2 ${tag}: /benchmaxxing states the exclusion`, /cost, token and speed metrics are left out by design/.test(await page.locator('[data-bh-capability-only]').innerText().catch(() => '')), '');
    await page.screenshot({ path: `${OUT}/benchmaxxing-${w}-${scheme}.png` });
    check(`${tag}: no page errors`, errors.length === 0, errors);
    await ctx.close();
  }
} finally { await browser.close(); }
const passed = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, runner: process.env.BH_RUNNER || null, at: new Date().toISOString(), revision: meta.revision ?? null, passed, total: checks.length, checks }, null, 2));
for (const c of checks.filter((x) => !x.ok)) console.log('FAIL', c.name, c.detail);
console.log(`${passed}/${checks.length} checks passed → ${OUT}/verification.json`);
process.exit(passed === checks.length ? 0 : 1);
