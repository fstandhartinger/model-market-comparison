// Review-gate live verifier for CR-142 (Jev capability + context charts).
// Usage: node verify-cr-142.mjs <base> <outDir>   exit 1 if any check fails.
// Groups: CR-142.2 (Luna medium/low + visible cost scale), CR-142.3 (theme-readable SVG text,
// tooltips, top-five labels in all four views), CR-142.4 (seven input buckets + log context chart).
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');

const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || `/tmp/cr142-${new URL(BASE).hostname}`;
await fs.mkdir(OUT, { recursive: true });
const results = [];
const check = (group, name, ok, detail) => {
  results.push({ group, name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${group} ${name}${ok ? '' : ' — ' + JSON.stringify(detail).slice(0, 400)}`);
};
const EXPECTED_BUCKETS = ['<2k', '2–8k', '8–16k', '16–64k', '64–256k', '256k–1M', '≥1M'];

// relative luminance contrast of two "rgb(r, g, b)" strings
function contrast(a, b) {
  const px = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
  const lum = (c) => { const [r, g, bb] = px(c).map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * bb; };
  const l1 = lum(a), l2 = lum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

const viewports = [{ tag: 'desktop', width: 1440, height: 1000 }, { tag: 'mobile', width: 390, height: 844 }];
const themes = ['light', 'dark'];

for (const vp of viewports) {
  for (const theme of themes) {
    const tag = `${vp.tag}-${theme}`;
    // one browser per context: the JevBench hub is heavy (memory note)
    const browser = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, colorScheme: theme, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
    try {
      await page.goto(`${BASE}/jev-models`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
      await page.waitForSelector('[data-bh-jev14-cost-axis]', { timeout: 60_000 });
      // scroll the whole page so lazy/3D sections mount
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 55)); }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(1500);

      // ---------- CR-142.2 ----------
      const luna = await page.evaluate(() => {
        const rows = [...document.querySelectorAll('[data-bh-jev14-capability-row]')];
        const texts = rows.map((r) => ({ key: r.getAttribute('data-bh-jev14-capability-row'), label: (r.querySelector('span.col-start-2')?.textContent || '').trim() }));
        return texts.filter((t) => /gpt-6 luna/i.test(t.label) || /luna/i.test(t.key || ''));
      });
      const lunaLabels = luna.map((l) => l.label);
      check('CR-142.2', `${tag} GPT-6 Luna medium row has a distinct visible label`, lunaLabels.some((l) => /GPT-6 Luna \(medium\)/.test(l)), lunaLabels);
      check('CR-142.2', `${tag} GPT-6 Luna low row has a distinct visible label`, lunaLabels.some((l) => /GPT-6 Luna \(low\)/.test(l)), lunaLabels);
      check('CR-142.2', `${tag} the two Luna labels are not identical`, new Set(lunaLabels).size === lunaLabels.length && lunaLabels.length >= 2, lunaLabels);

      const axis = await page.evaluate(() => {
        const box = document.querySelector('[data-bh-jev14-cost-axis]');
        if (!box) return null;
        const ticks = [...box.querySelectorAll('span[style*="left"]')].map((s) => ({ text: s.textContent.trim(), left: s.style.left, w: s.getBoundingClientRect().width }));
        return { ticks, caption: box.textContent.replace(/\s+/g, ' ').trim(), visible: box.checkVisibility?.() ?? true };
      });
      check('CR-142.2', `${tag} cost axis is present and visible`, !!axis && axis.visible, axis && { ticks: axis.ticks.length });
      check('CR-142.2', `${tag} cost axis shows >=3 rendered $ ticks`, !!axis && axis.ticks.filter((t) => /\$|Free/.test(t.text) && t.w > 0).length >= 3, axis && axis.ticks);
      check('CR-142.2', `${tag} cost axis states logarithmic + lower is better`, !!axis && /logarithmic/i.test(axis.caption) && /lower is better/i.test(axis.caption), axis && axis.caption.slice(0, 160));

      const costBars = await page.evaluate(() => {
        const rows = [...document.querySelectorAll('[data-bh-jev14-capability-row]')].slice(0, 20);
        return rows.map((r) => {
          const cost = r.getAttribute('data-bh-jev14-cost');
          const holder = [...r.querySelectorAll('span.bh-jevc-grid')][1];
          const bar = holder?.firstElementChild;
          const rect = bar?.getBoundingClientRect();
          return { key: r.getAttribute('data-bh-jev14-capability-row'), cost, w: rect ? +rect.width.toFixed(2) : null, h: rect ? +rect.height.toFixed(2) : null, title: holder?.getAttribute('title') || '' };
        });
      });
      const withCost = costBars.filter((b) => b.cost !== '' && b.cost !== null);
      check('CR-142.2', `${tag} cost bars render with non-zero width and height`, withCost.length >= 10 && withCost.every((b) => b.w > 0 && b.h > 0), withCost.filter((b) => !(b.w > 0 && b.h > 0)).slice(0, 5));
      check('CR-142.2', `${tag} cost bar tooltip names the log scale`, withCost.every((b) => /logarithmic scale, lower is better/.test(b.title)), withCost.find((b) => !/logarithmic/.test(b.title)));

      // ---------- CR-142.3: readable SVG text in this theme ----------
      const svgText = await page.evaluate(() => {
        const ids = ['#jev-context-chart-heading', ''];
        const figs = [...document.querySelectorAll('figure svg')];
        const out = [];
        for (const svg of figs) {
          const fig = svg.closest('figure');
          const label = fig?.getAttribute('data-bh-jev-context-chart') != null ? 'context-accuracy'
            : (fig?.querySelector('h3,h4')?.textContent || svg.querySelector('title')?.textContent || 'svg').trim().slice(0, 60);
          // walk up for the first painted background: .bh-panel can be transparent
          let bg = 'rgb(255, 255, 255)';
          for (let el = svg; el; el = el.parentElement) {
            const c = getComputedStyle(el).backgroundColor;
            if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) { bg = c; break; }
          }
          for (const t of svg.querySelectorAll('text')) {
            const r = t.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) continue;
            out.push({ chart: label, text: t.textContent.trim().slice(0, 24), fill: getComputedStyle(t).fill, bg });
          }
        }
        return out;
      });
      const bad = [];
      for (const t of svgText) {
        const c = contrast(t.fill, t.bg);
        if (!/^rgb/.test(t.fill) || c < 3) bad.push({ ...t, contrast: +c.toFixed(2) });
      }
      check('CR-142.3', `${tag} every rendered SVG label resolves to a color with >=3:1 contrast`, svgText.length > 0 && bad.length === 0, { sampled: svgText.length, bad: bad.slice(0, 8) });

      const views = await page.evaluate(() => ({
        costTopFive: [...document.querySelectorAll('[data-bh-jev14-scatter-top-five="cost"] [data-bh-jev14-leader]')].map((n) => n.textContent.replace(/\s+/g, ' ').trim()),
        speedTopFive: [...document.querySelectorAll('[data-bh-jev14-scatter-top-five="speed"] [data-bh-jev14-leader]')].map((n) => n.textContent.replace(/\s+/g, ' ').trim()),
        threeDTopFive: [...document.querySelectorAll('[data-bh-jev14-3d-top-five] [data-bh-jev14-3d-leader]')].map((n) => n.textContent.replace(/\s+/g, ' ').trim()),
        contextLegend: [...document.querySelectorAll('[data-bh-jev-context-top-five] [data-bh-jev-context-system]')].map((n) => n.textContent.replace(/\s+/g, ' ').trim()),
        scatterTitles: [...document.querySelectorAll('[data-bh-jev14-point] title')].map((n) => n.textContent.trim()),
        contextTitles: [...document.querySelectorAll('[data-bh-jev-context-point] title')].map((n) => n.textContent.trim()),
      }));
      for (const [name, arr] of [['Capability vs cost', views.costTopFive], ['Capability vs speed', views.speedTopFive], ['3D view', views.threeDTopFive]]) {
        check('CR-142.3', `${tag} ${name} names its top five permanently`, arr.length === 5 && arr.every((s) => /Capability #\d/.test(s) && s.length > 20), arr);
      }
      check('CR-142.3', `${tag} context chart marks the top five in its legend`, views.contextLegend.length >= 5 && views.contextLegend.slice(0, 5).every((s) => /Top five/.test(s)) && !views.contextLegend.slice(5).some((s) => /Top five/.test(s)), views.contextLegend.slice(0, 7));
      check('CR-142.3', `${tag} scatter points carry system+value tooltips`, views.scatterTitles.length > 20 && views.scatterTitles.every((t) => /Capability \d/.test(t) && /Cost /.test(t)), { n: views.scatterTitles.length, sample: views.scatterTitles[0] });
      check('CR-142.3', `${tag} context points carry system+value tooltips`, views.contextTitles.length > 10 && views.contextTitles.every((t) => /^#\d+ .+ tokens: /.test(t)), { n: views.contextTitles.length, sample: views.contextTitles[0] });

      // ---------- CR-142.4 ----------
      const ctxChart = await page.evaluate(() => {
        const fig = document.querySelector('[data-bh-jev-context-chart]');
        const labels = fig ? [...fig.querySelectorAll('svg > g > text')].map((t) => t.textContent.trim()).filter((t) => !/%$/.test(t)) : [];
        const cap = document.querySelector('[data-bh-jev-context-capacity-chart]');
        const rows = cap ? [...cap.querySelectorAll('[data-bh-jev-context-capacity-row]')] : [];
        const ticks = cap ? [...cap.querySelectorAll('span[style*="left"]')].filter((s) => s.getBoundingClientRect().width > 0).map((s) => s.textContent.trim()) : [];
        return {
          bucketLabels: labels,
          capacityRows: rows.length,
          unknownRows: rows.filter((r) => /Unknown/.test(r.textContent)).length,
          trainingRows: rows.filter((r) => /Training configuration/.test(r.textContent)).length,
          ticks,
          legend: cap ? (cap.querySelector('ul[aria-label="Context chart legend"]')?.textContent || '').replace(/\s+/g, ' ').trim() : '',
          caption: cap ? (cap.querySelector('figcaption')?.textContent || '').replace(/\s+/g, ' ').trim() : '',
          heading: cap ? (cap.querySelector('h3')?.textContent || '').trim() : '',
        };
      });
      check('CR-142.4', `${tag} the seven required input-length buckets are the axis labels`, JSON.stringify(ctxChart.bucketLabels.filter((l) => EXPECTED_BUCKETS.includes(l))) === JSON.stringify(EXPECTED_BUCKETS), ctxChart.bucketLabels);
      check('CR-142.4', `${tag} no legacy bucket label survives`, !ctxChart.bucketLabels.some((l) => /^(<500|500–999|1k–1,999|≥2k)$/.test(l)), ctxChart.bucketLabels);
      check('CR-142.4', `${tag} the logarithmic published-context chart is present`, /logarithmic/i.test(ctxChart.heading) && ctxChart.capacityRows > 0, { heading: ctxChart.heading, rows: ctxChart.capacityRows });
      check('CR-142.4', `${tag} every context row is represented`, ctxChart.capacityRows === 82, ctxChart.capacityRows);
      check('CR-142.4', `${tag} unknown limits are labelled`, ctxChart.unknownRows >= 0 && /Unknown|unknown/.test(ctxChart.caption + ctxChart.heading) || ctxChart.unknownRows > 0, { unknown: ctxChart.unknownRows });
      check('CR-142.4', `${tag} training markers are separated in the legend`, /max_seq_len/.test(ctxChart.legend) && /state limit/i.test(ctxChart.legend) && /Trained length/.test(ctxChart.legend), ctxChart.legend.slice(0, 200));
      check('CR-142.4', `${tag} training configuration values are printed`, ctxChart.trainingRows > 0, ctxChart.trainingRows);
      check('CR-142.4', `${tag} log ticks are rendered`, ctxChart.ticks.length >= 4, ctxChart.ticks);

      const overflow = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, win: window.innerWidth }));
      check('CR-142.3', `${tag} no horizontal document overflow`, overflow.doc <= overflow.win + 1, overflow);
      check('CR-142.3', `${tag} no page error`, errors.length === 0, errors.slice(0, 3));

      await page.screenshot({ path: `${OUT}/jev-models-${tag}.png`, fullPage: false });
      const capFig = await page.$('[data-bh-jev-context-capacity-chart]');
      if (capFig) await capFig.scrollIntoViewIfNeeded().then(() => page.screenshot({ path: `${OUT}/context-capacity-${tag}.png` })).catch(() => {});
    } catch (err) {
      check('CR-142', `${tag} page loaded`, false, String(err).slice(0, 300));
    } finally {
      await ctx.close().catch(() => {});
      await browser.close().catch(() => {});
      await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, results, passed: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length }, null, 2));
    }
  }
}
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed on ${BASE}`);
process.exit(failed.length ? 1 : 0);
