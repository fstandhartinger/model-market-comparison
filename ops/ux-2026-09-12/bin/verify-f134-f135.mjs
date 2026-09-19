// Review gate 20260919T165003Z: independent live check of F-134 (chart legend) and F-135 (cost disclosure) on /jev-models.
// Usage: node verify-f134-f135.mjs <base> <outdir>   → <outdir>/verification.json. 1440/390 × light/dark, headless, closes its browser.
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-f134-f135';
await fs.mkdir(OUT, { recursive: true });
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail });
const revision = await fetch(`${BASE}/api/meta`).then((r) => r.json()).then((m) => m.revision).catch(() => null);
const b = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
try {
  for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
    const mobile = kind === 'mobile'; const tag = `${kind}_${theme}`;
    const c = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme, deviceScaleFactor: mobile ? 2 : 1 });
    await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
    const p = await c.newPage(); const errors = [];
    p.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
    await p.goto(`${BASE}/jev-models`, { waitUntil: 'networkidle', timeout: 90000 });
    await p.waitForTimeout(600);
    const g = await p.evaluate(() => {
      const cap = document.querySelector('[data-bh-jevc-footnotes]');
      const det = cap.querySelector('details');
      const vis = [...cap.children].filter((el) => el !== det);
      const lh = parseFloat(getComputedStyle(cap).lineHeight) || 14;
      const visLines = vis.reduce((n, el) => n + Math.round(el.getBoundingClientRect().height / lh), 0);
      const legendLine = (cap.querySelector('[data-bh-jev12-legend-line]') || {}).innerText || '';
      const daggers = document.querySelectorAll('[data-bh-jev12-main-chart] sup').length;
      const notes = [...cap.querySelectorAll('[data-bh-jev12-footnote]')].map((li) => li.textContent.trim());
      const costs = document.getElementById('jev-costs');
      const outside = costs?.parentElement?.querySelector(':scope > p')?.innerText || '';
      return {
        visLines, legendLine, sentences: legendLine.split(/[.;]\s+(?=[A-Z])/).length,
        speedFirst: !!vis[0] && /speed/i.test(vis[0].innerText),
        detClosed: !!det && !det.open, detSummary: det?.querySelector('summary')?.innerText.trim(),
        labelNote: !!cap.querySelector('[data-bh-jev12-label-note]'), namesNote: /Names link to each project/.test(det?.innerText || ''),
        daggers, notes, notesAfterGeneral: det ? [...det.querySelectorAll('li')].slice(0, 2).every((li) => !li.hasAttribute('data-bh-jev12-footnote')) : false,
        oneliners: document.querySelectorAll('[data-bh-jev12-oneliner]').length,
        costsTag: costs?.tagName, costsClosed: costs && !costs.open, costsH: Math.round(costs?.getBoundingClientRect().height || 0),
        outside, rows: costs?.querySelectorAll('[data-bh-jev-cost-rows] li').length || 0, classes: !!costs?.querySelector('[data-bh-jev-cost-classes]'),
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    check(`${tag}: F-134 speed note first, then one legend sentence`, g.speedFirst && g.legendLine.startsWith('I, C, S, K = Intelligence, Calibration, Speed, Cost') && g.sentences <= 2, g.legendLine);
    if (mobile) check(`${tag}: F-134 visible caption ≤ 6 lines at 390`, g.visLines <= 6, g.visLines);
    check(`${tag}: F-134 "Legend and notes" closed on load`, g.detClosed && g.detSummary === 'Legend and notes', g.detSummary);
    check(`${tag}: F-134 legend holds label-only + names notes and one note per † system`, g.labelNote && g.namesNote && g.notes.length > 0 && g.notes.length === g.daggers && g.notesAfterGeneral, `${g.notes.length} notes / ${g.daggers} daggers`);
    check(`${tag}: score one-liner selector unique`, g.oneliners === 1, g.oneliners);
    check(`${tag}: F-135 costs panel is a closed <details>`, g.costsTag === 'DETAILS' && g.costsClosed, g.costsTag);
    if (mobile) check(`${tag}: F-135 closed panel ≤ 160 px at 390`, g.costsH <= 160, g.costsH);
    check(`${tag}: F-135 one-line summary outside, rows + reference prices inside`, /public tariff/.test(g.outside) && g.rows >= 1 && g.classes, `${g.rows} rows`);
    check(`${tag}: no horizontal overflow`, g.overflow <= 0, g.overflow);
    await p.screenshot({ path: `${OUT}/${tag}-caption-closed.png` });
    // Click the chart's "how costs are estimated" link → opens + first cost row in the viewport.
    await p.locator('[data-bh-jev12-legend-line] a[href="#jev-costs"]').scrollIntoViewIfNeeded();
    await p.locator('[data-bh-jev12-legend-line] a[href="#jev-costs"]').click(); await p.waitForTimeout(1500);
    const afterClick = await p.evaluate(() => { const d = document.getElementById('jev-costs'); const li = d.querySelector('[data-bh-jev-cost-rows] li').getBoundingClientRect(); return { open: d.open, top: Math.round(li.top), bottom: Math.round(li.bottom), vh: innerHeight }; });
    check(`${tag}: F-135 chart link opens the panel, first cost row in view`, afterClick.open && afterClick.top >= 0 && afterClick.bottom <= afterClick.vh, JSON.stringify(afterClick));
    await p.screenshot({ path: `${OUT}/${tag}-costs-open.png` });
    // A second in-page #jev-costs link (Method text) after closing again.
    await p.evaluate(() => { document.getElementById('jev-costs').open = false; history.replaceState(null, '', location.pathname); });
    const other = p.locator('a[href="#jev-costs"]:not([data-bh-jev12-legend-line] a)').first();
    if (await other.count()) {
      await other.scrollIntoViewIfNeeded(); await other.click(); await p.waitForTimeout(1500);
      check(`${tag}: F-135 a second in-page link opens it too`, await p.evaluate(() => document.getElementById('jev-costs').open), '');
    }
    // Open the legend.
    await p.locator('[data-bh-jev12-legend] summary').scrollIntoViewIfNeeded(); await p.locator('[data-bh-jev12-legend] summary').click(); await p.waitForTimeout(300);
    await p.locator('[data-bh-jev12-legend]').screenshot({ path: `${OUT}/${tag}-legend-open.png` });
    // Direct load with the hash.
    await p.goto(`${BASE}/jev-models#jev-costs`, { waitUntil: 'networkidle', timeout: 90000 }); await p.waitForTimeout(1500);
    const hash = await p.evaluate(() => { const d = document.getElementById('jev-costs'); const r = d.getBoundingClientRect(); return { open: d.open, top: Math.round(r.top), vh: innerHeight }; });
    check(`${tag}: F-135 /jev-models#jev-costs loads open and in view`, hash.open && hash.top >= -5 && hash.top < hash.vh, JSON.stringify(hash));
    check(`${tag}: no page errors`, errors.length === 0, errors.join(' | '));
    await p.close(); await c.close();
  }
} finally { await b.close(); }
const passed = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, revision, at: new Date().toISOString(), passed, total: checks.length, checks }, null, 1));
console.log(`${BASE} revision ${revision}: ${passed}/${checks.length}`); for (const c of checks.filter((c) => !c.ok)) console.log('FAIL', c.name, c.detail);
