// Iteration 20 acceptance: F-23 (phone Advanced toolbar + Refine sheet), F-24 (Benchmaxxing
// table density), F-25 (thin evidence hatched), F-28 (slider end labels, Evidence button),
// plus F-13's phone first-row guard for Simple. 1440×1000 and 390×844, light and dark.
// Usage: node verify-iter20.mjs <base-url> <out-dir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = process.argv[2] || 'https://benchmarkheaven.com';
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/iter20';
await fs.mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const out = { base: BASE, checked_at: new Date().toISOString(), errors: [], fails: [] };
const safe = async (k, fn) => { try { await fn(); } catch (e) { out.errors.push(`${k}: ${String(e).split('\n')[0].slice(0, 200)}`); } };
const expect = (k, ok, detail) => { if (!ok) out.fails.push(`${k}: ${JSON.stringify(detail)}`); return ok; };
const setTheme = (p, t) => p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), t);

for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  for (const theme of ['light', 'dark']) {
    const mobile = kind === 'mobile';
    const c = await browser.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme });
    const p = await c.newPage();
    p.on('pageerror', (e) => out.errors.push(`${kind}/${theme} pageerror: ${String(e).slice(0, 200)}`));
    const k = `${kind}_${theme}`; const o = (out[k] = {});
    const go = async (path) => { await p.goto(BASE + path, { waitUntil: 'networkidle' }); await setTheme(p, theme); await p.waitForTimeout(900); };

    await safe(`${k}/simple`, async () => {
      await go('/');
      o.simple = await p.evaluate(() => {
        const row = document.querySelector('table.dtable tbody tr');
        const card = document.querySelector('input[aria-label^="Minimum"]')?.closest('.card');
        return {
          firstRowTop: row ? Math.round(row.getBoundingClientRect().top) : null,
          rows: document.querySelectorAll('table.dtable tbody tr').length,
          hatched: document.querySelectorAll('table.dtable .bh-magnitude-thin').length,
          sparkTotals: document.querySelectorAll('.bh-spark-total').length,
          sparkColor: getComputedStyle(document.querySelector('.bh-spark-total') || document.body).backgroundColor,
          mapTicks: [...document.querySelectorAll('.bh-value-map .recharts-cartesian-axis-tick text')].filter((t) => t.getBoundingClientRect().width > 0).length,
          endLabels: card ? [...card.querySelectorAll('div.text-\\[10px\\] span')].map((s) => s.textContent) : [],
          scrollWidth: document.documentElement.scrollWidth,
        };
      });
      expect(`${k} F-28 slider end labels`, o.simple.endLabels.length >= 4, o.simple.endLabels);
      expect(`${k} F-25 Simple unhatched`, o.simple.hatched === 0, o.simple.hatched);
      expect(`${k} F-26 value map has >= 4 visible tick labels`, o.simple.mapTicks >= 4, o.simple.mapTicks);
      if (mobile) expect(`${k} F-13 phone first row <= 780`, o.simple.firstRowTop != null && o.simple.firstRowTop <= 780, o.simple.firstRowTop);
      await p.screenshot({ path: `${OUT}/${k}-simple.png` });
    });

    await safe(`${k}/advanced`, async () => {
      await p.getByRole('tab', { name: 'Advanced' }).click(); await p.waitForTimeout(1200);
      o.advanced = await p.evaluate(() => {
        const toolbar = document.querySelector('input[aria-label="Search model or organization"]')?.closest('.card');
        const tb = toolbar?.getBoundingClientRect();
        const row = document.querySelector('table.dtable tbody tr');
        const rows = [...document.querySelectorAll('table.dtable tbody tr.bh-ranking-row')];
        const fable = rows.find((r) => /Fable 5 \(high\)/.test(r.textContent || ''));
        const accentFilled = toolbar ? [...toolbar.querySelectorAll('summary, button')].filter((b) => (b.tagName === 'SUMMARY' || !b.closest('details:not([open])')) && b.getBoundingClientRect().width > 0 && /bg-accent\/15/.test(b.className)).map((b) => b.textContent?.trim()) : [];
        const withSub = rows.filter((r) => /\d\/7 inputs/.test(r.textContent || ''));
        return {
          toolbarHeight: tb ? Math.round(tb.height) : null,
          toolbarTop: tb ? Math.round(tb.top) : null,
          firstRowTop: row ? Math.round(row.getBoundingClientRect().top) : null,
          rows: rows.length,
          fableRow: fable ? { text: (fable.textContent || '').replace(/\s+/g, ' ').slice(0, 120), hatched: !!fable.querySelector('.bh-magnitude-thin') } : null,
          rowsWithInputsLabel: withSub.length,
          hatchedRows: document.querySelectorAll('table.dtable .bh-magnitude-thin').length,
          accentFilled,
          evidenceLabel: [...(toolbar?.querySelectorAll('summary') || [])].map((s) => s.textContent?.trim()),
          refineVisible: [...document.querySelectorAll('button')].some((b) => /^Refine/.test(b.textContent || '') && b.getBoundingClientRect().width > 0),
          scrollWidth: document.documentElement.scrollWidth,
        };
      });
      // The directive's example ("Fable 5 (high)" = 1/7) confused # benchmarks (1) with
      // composite_coverage (5/7). The written rule is checked instead: some rows hatched, and
      // every hatched row carries a "0/7"–"2/7 inputs" label.
      o.advanced.hatchRule = await p.evaluate(() => [...document.querySelectorAll('table.dtable tbody tr.bh-ranking-row')]
        .filter((r) => r.querySelector('.bh-magnitude-thin')).every((r) => /[012]\/7 inputs/.test(r.textContent || '')));
      expect(`${k} F-25 hatched rows follow the <3 inputs rule`, o.advanced.hatchedRows > 0 && o.advanced.hatchRule, { hatched: o.advanced.hatchedRows, rule: o.advanced.hatchRule });
      expect(`${k} F-28 no accent-filled toolbar button in fresh Advanced`, o.advanced.accentFilled.length === 0, o.advanced.accentFilled);
      expect(`${k} F-28 Evidence label`, !o.advanced.evidenceLabel.some((t) => /relaxed/.test(t || '')), o.advanced.evidenceLabel);
      expect(`${k} no overflow`, o.advanced.scrollWidth === vp.width, o.advanced.scrollWidth);
      if (mobile) {
        expect(`${k} F-23 toolbar <= 56`, o.advanced.toolbarHeight != null && o.advanced.toolbarHeight <= 56, o.advanced.toolbarHeight);
        expect(`${k} F-23 first row <= 480`, o.advanced.firstRowTop != null && o.advanced.firstRowTop <= 480, o.advanced.firstRowTop);
        expect(`${k} F-23 Refine visible`, o.advanced.refineVisible, o.advanced.refineVisible);
      } else {
        expect(`${k} F-23 desktop toolbar one row`, o.advanced.toolbarHeight != null && o.advanced.toolbarHeight <= 80, o.advanced.toolbarHeight);
        expect(`${k} F-23 no Refine on desktop`, !o.advanced.refineVisible, o.advanced.refineVisible);
      }
      await p.screenshot({ path: `${OUT}/${k}-advanced.png` });
      if (mobile) {
        await p.getByRole('button', { name: /^Refine/ }).click(); await p.waitForTimeout(500);
        o.refine = await p.evaluate(() => {
          const d = document.querySelector('[role="dialog"][aria-label="Refine the ranking"]');
          const t = d ? (d.textContent || '').replace(/\s+/g, ' ') : '';
          return { open: !!d, text: ['All orgs', 'Better than a model', 'Evidence'].filter((w) => t.includes(w)).join(' | ') + ' | ' + (t.match(/Show \d+ models/)?.[0] || '') };
        });
        await p.screenshot({ path: `${OUT}/${k}-refine-sheet.png` });
        expect(`${k} F-23 sheet opens with controls`, o.refine.open && /All orgs/.test(o.refine.text) && /Better than a model/.test(o.refine.text) && /Evidence/.test(o.refine.text) && /Show \d+ models/.test(o.refine.text), o.refine);
        await p.getByRole('button', { name: /^Show \d+ models/ }).last().click(); await p.waitForTimeout(400);
        o.refineClosed = await p.evaluate(() => !document.querySelector('[role="dialog"][aria-label="Refine the ranking"]'));
        expect(`${k} F-23 sheet closes`, o.refineClosed, o.refineClosed);
      }
    });

    await safe(`${k}/benchmaxxing`, async () => {
      await go('/benchmaxxing');
      o.benchmaxxing = await p.evaluate(() => {
        const sec = document.querySelector('section[aria-label="Benchmaxxing overview"]');
        const tbody = sec?.querySelector('tbody');
        const rows = [...(tbody?.querySelectorAll('tr') || [])];
        const tb = tbody?.getBoundingClientRect();
        return {
          rows: rows.length,
          tbodyHeight: tb ? Math.round(tb.height) : null,
          maxRowHeight: Math.max(0, ...rows.map((r) => Math.round(r.getBoundingClientRect().height))),
          signalBars: rows.filter((r) => r.querySelector('.bh-magnitude-warn .bh-magnitude-fill')).length,
          badgeMentions: ((sec?.querySelector('table')?.textContent || '').match(/Benchmaxxing signal/g) || []).length,
          summary: (sec?.querySelector('.rounded-lg.border')?.textContent || '').replace(/\s+/g, ' ').trim(),
          selectorHint: !!document.querySelector('section[aria-label="Per-model Benchmaxxing report"] .text-warn'),
          scrollWidth: document.documentElement.scrollWidth,
        };
      });
      const b = o.benchmaxxing;
      expect(`${k} F-24 ten rows`, b.rows === 10, b.rows);
      expect(`${k} F-24 every Signal cell has a bar`, b.signalBars === b.rows, b.signalBars);
      expect(`${k} F-24 badge at most once`, b.badgeMentions <= 1, b.badgeMentions);
      if (!mobile) expect(`${k} F-24 ten rows <= 620 px`, b.tbodyHeight != null && b.tbodyHeight <= 620, b.tbodyHeight);
      expect(`${k} F-24 rows <= 56 px`, b.maxRowHeight <= 56, b.maxRowHeight);
      expect(`${k} F-24 one-line summary`, /tagged models · coverage floor/.test(b.summary), b.summary);
      expect(`${k} no overflow`, b.scrollWidth === vp.width, b.scrollWidth);
      await p.screenshot({ path: `${OUT}/${k}-benchmaxxing.png` });
    });
    await safe(`${k}/model`, async () => {
      await go('/models/claude-opus-5%3A%3Ahigh');
      o.model = await p.evaluate(() => {
        const sheetRows = [...document.querySelectorAll('#benchmark-sheet section[aria-label$=" benchmarks"] li > details > summary')];
        const tables = [...document.querySelectorAll('table')].filter((t) => t.getBoundingClientRect().width > 0).map((t) => Math.round(t.getBoundingClientRect().right));
        const radar = document.querySelector('section[aria-label="Composite and its inputs"] svg[role="img"]');
        return {
          height: document.documentElement.scrollHeight,
          scrollWidth: document.documentElement.scrollWidth,
          radar: radar ? { h: Math.round(radar.getBoundingClientRect().height), dots: radar.querySelectorAll('circle').length } : null,
          sheetRows: sheetRows.length,
          rowsWithBar: sheetRows.filter((s) => s.querySelector('.bg-accent') && /\d/.test(s.querySelector('[title^="Percentile"]')?.textContent || '')).length,
          rowsWithoutPercentile: sheetRows.filter((s) => /no percentile/.test(s.textContent || '')).length,
          maxRowHeight: Math.max(0, ...sheetRows.map((s) => Math.round(s.getBoundingClientRect().height))),
          tableRights: tables,
          composite: /Composite definition/.test(document.body.innerText),
          unusual: /Unusual results/.test(document.body.innerText),
        };
      });
      const m = o.model;
      expect(`${k} F-08b height`, m.height <= (mobile ? 4500 : 2600), m.height);
      expect(`${k} F-08b radar`, m.radar && m.radar.h >= 200 && m.radar.dots >= 3, m.radar);
      expect(`${k} F-08b sheet rows carry a bar + percentile (or say none)`, m.sheetRows > 0 && m.rowsWithBar + m.rowsWithoutPercentile === m.sheetRows, { rows: m.sheetRows, bar: m.rowsWithBar, none: m.rowsWithoutPercentile });
      expect(`${k} F-08b rows <= 40 px`, m.maxRowHeight <= 40, m.maxRowHeight);
      expect(`${k} F-08b no table wider than viewport`, m.tableRights.every((r) => r <= vp.width), m.tableRights);
      expect(`${k} no overflow`, m.scrollWidth === vp.width, m.scrollWidth);
      expect(`${k} F-08a no Composite definition`, !m.composite, m.composite);
      await p.screenshot({ path: `${OUT}/${k}-model.png` });
      await p.screenshot({ path: `${OUT}/${k}-model-full.png`, fullPage: true });
    });
    await c.close();
  }
}
await browser.close();
out.pass = out.fails.length === 0 && out.errors.length === 0;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify(out, null, 2));
console.log(JSON.stringify({ pass: out.pass, fails: out.fails, errors: out.errors }, null, 2));
