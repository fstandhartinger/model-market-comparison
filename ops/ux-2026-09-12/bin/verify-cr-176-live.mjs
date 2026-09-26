// CR-176.1–.5 live receipt: the JevBench Capability-vs-speed chart agrees with its 2x-latency line,
// the separator caption sits left of the line with direction arrows, and the $/1k cells are plain
// (no green heat, est./ann. pills left of a right-aligned number) in the board and the table.
// Usage: node verify-cr-176-live.mjs <base> <outDir>
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');

const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr176';
await fs.mkdir(OUT, { recursive: true });

const checks = [];
const check = (context, name, ok, detail) => checks.push({ context, name, ok: !!ok, detail: String(detail ?? '') });

const bubbleProbe = () => {
  const speedFig = document.querySelector('figure[data-bh-jev-bubble="speed"]');
  const costFig = document.querySelector('figure[data-bh-jev-bubble="cost"]');
  const probe = (fig, sepAttr) => {
    if (!fig) return { present: false };
    const sep = fig.querySelector(`g[data-bh-jev-separator="${sepAttr}"]`);
    const line = sep?.querySelector('line');
    const label = sep?.querySelector('text[data-bh-jev-separator-label]');
    const labels = [...(sep?.querySelectorAll('text') ?? [])].map((t) => t.textContent || '').filter((t) => !t.includes('2×'));
    const lineX = line ? Number(line.getAttribute('x1')) : null;
    const bubbles = [...fig.querySelectorAll('circle[data-bh-jev-bubble-point]')].map((c) => Number(c.getAttribute('cx')));
    const bb = label ? label.getBBox() : null;
    return {
      present: true,
      lineX,
      bubbles,
      violations: bubbles.filter((x) => x < lineX - 1),
      labelLeftOfLine: bb ? bb.x + bb.width <= lineX - 0.5 : false,
      labelText: label ? label.textContent : null,
      arrows: labels,
    };
  };
  const bar = {
    headerUsd: [...document.querySelectorAll('[data-bh-jev14-chart-sort] button, [data-bh-jev14-chart-sort] [role=button]')].map((b) => (b.textContent || '').trim()).find((t) => t.startsWith('$')) ?? null,
    heatLegend: document.querySelector('[data-bh-jev-heat-legend]')?.textContent ?? null,
    cells: [...document.querySelectorAll('[data-bh-jev14-bar] [data-bh-jev14-cost-cell]')].slice(0, 80).map((cell) => {
      const pill = cell.querySelector('.bh-thin-tag');
      let numLeft = null;
      const tabularSpan = cell.querySelector('.tabular');
      if (tabularSpan) { numLeft = Math.round(tabularSpan.getBoundingClientRect().left); }
      else {
        const range = document.createRange();
        const lastText = [...cell.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE && /\d/.test(n.nodeValue || '')).pop();
        if (lastText) { range.selectNodeContents(lastText); const r = range.getBoundingClientRect(); numLeft = Math.round(r.left); }
      }
      const pr = pill ? pill.getBoundingClientRect() : null;
      return {
        heat: cell.classList.contains('bh-heat'),
        pill: pill ? (pill.textContent || '').trim() : null,
        pillRight: pr ? Math.round(pr.right) : null,
        numLeft,
        text: (cell.textContent || '').replace(/\s+/g, ' ').trim(),
      };
    }),
  };
  const table = document.querySelector('[data-bh-jev14-table]') ?? document.querySelector('table');
  const ths = table ? [...table.querySelectorAll('th')].map((t) => (t.textContent || '').replace(/[↕▲▼↑↓×\s]+$/, '').trim()) : [];
  const usdCells = table ? [...table.querySelectorAll('td[data-bh-jev14-usd]')].map((cell) => {
    const inner = cell.querySelector('[data-bh-jev14-cost-cell]');
    const pill = inner?.querySelector('.bh-thin-tag');
    let numLeft = null;
    const range = document.createRange();
    const lastText = inner ? [...inner.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE && /\d/.test(n.nodeValue || '')).pop() : null;
    if (lastText) { range.selectNodeContents(lastText); const r = range.getBoundingClientRect(); numLeft = Math.round(r.left); }
    return {
      heat: cell.classList.contains('bh-heat') || !!inner?.classList.contains('bh-heat'),
      pill: pill ? (pill.textContent || '').trim() : null,
      pillRight: pill ? Math.round(pill.getBoundingClientRect().right) : null,
      numLeft,
    };
  }) : [];
  return {
    speed: probe(speedFig, 'latency'),
    cost: probe(costFig, 'cost'),
    bar,
    table: { ths, usdCells: usdCells.slice(0, 80) },
    estCells: [...document.querySelectorAll('[data-bh-jev14-est]')].length,
    annCells: [...document.querySelectorAll('[data-bh-jev14-ann]')].length,
  };
};

const browser = await chromium.launch({ headless: true });
try {
  for (const width of [{ w: 1440, h: 950, tag: 'desktop' }, { w: 390, h: 844, tag: 'phone' }]) {
    for (const scheme of ['light', 'dark']) {
      const context = `${width.tag}-${scheme}`;
      const c = await browser.newContext({ viewport: { width: width.w, height: width.h }, colorScheme: scheme });
      const p = await c.newPage();
      const errors = [];
      p.on('pageerror', (e) => errors.push(String(e)));
      await p.goto(`${BASE}/jev-models`, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await p.waitForSelector('figure[data-bh-jev-bubble="speed"] circle[data-bh-jev-bubble-point]', { timeout: 30000 });
      await p.waitForTimeout(700);
      const d = await p.evaluate(bubbleProbe);
      check(context, 'speed chart rendered', d.speed.present && d.speed.lineX != null, `lineX=${d.speed.lineX} bubbles=${d.speed.bubbles.length}`);
      check(context, 'CR-176.3: every in-class bubble at or right of the latency line', d.speed.violations.length === 0, d.speed.violations.slice(0, 5));
      check(context, 'CR-176.1: speed caption left of the line', d.speed.labelLeftOfLine, `label=${JSON.stringify(d.speed.labelText)}`);
      check(context, 'CR-176.2: speed direction arrows', d.speed.arrows.includes('← slower') && d.speed.arrows.includes('faster →'), JSON.stringify(d.speed.arrows));
      check(context, 'CR-176.1: cost caption left of the line', d.cost.labelLeftOfLine, `label=${JSON.stringify(d.cost.labelText)}`);
      check(context, 'CR-176.2: cost direction arrows', d.cost.arrows.includes('← pricier') && d.cost.arrows.includes('cheaper →'), JSON.stringify(d.cost.arrows));
      check(context, 'CR-176.4: bar header reads $/1k decisions', (d.bar.headerUsd ?? '').includes('$/1k decisions'), JSON.stringify(d.bar.headerUsd));
      check(context, 'CR-176.4: no green heat on bar $/1k cells', d.bar.cells.length > 0 && d.bar.cells.every((x) => !x.heat), `cells=${d.bar.cells.length}`);
      const pillCells = d.bar.cells.filter((x) => x.pill && x.numLeft != null);
      check(context, 'CR-176.4: est./ann. pills left of the number (bars)', pillCells.length > 0 && pillCells.every((x) => x.pillRight <= x.numLeft + 1), JSON.stringify(pillCells.slice(0, 3)));
      check(context, 'no "~$" prefix remains', d.bar.cells.every((x) => !x.text.startsWith('~$')), '');
      check(context, 'CR-176.4: $/1k decisions in the table header', d.table.ths.includes('$/1k decisions'), JSON.stringify(d.table.ths.filter((t) => t.includes('/1k'))));
      check(context, 'CR-176.5: no green heat on the table $/1k column', d.table.usdCells.length > 0 && d.table.usdCells.every((x) => !x.heat), `cells=${d.table.usdCells.length}`);
      const tPills = d.table.usdCells.filter((x) => x.pill && x.numLeft != null);
      check(context, 'CR-176.5: est./ann. pills left of the number (table)', tPills.length > 0 && tPills.every((x) => x.pillRight <= x.numLeft + 1), JSON.stringify(tPills.slice(0, 3)));
      check(context, 'legend no longer claims $/1k is shaded', !/\/1k/.test(d.bar.heatLegend ?? ''), JSON.stringify(d.bar.heatLegend));
      check(context, 'page errors', errors.length === 0, errors.slice(0, 3));
      const fig = p.locator('figure[data-bh-jev-bubble="speed"]').first();
      await fig.scrollIntoViewIfNeeded();
      await p.waitForTimeout(250);
      await fig.screenshot({ path: `${OUT}/${context}-speed.png` });
      const board = p.locator('figure[data-bh-jev14-chart]').first();
      if (await board.count()) { await board.scrollIntoViewIfNeeded(); await p.waitForTimeout(250); await board.screenshot({ path: `${OUT}/${context}-bars.png` }); }
      if (width.tag === 'desktop') {
        const tbl = p.locator('[data-bh-jev14-table]').first();
        if (await tbl.count()) { await tbl.scrollIntoViewIfNeeded(); await p.waitForTimeout(250); await tbl.screenshot({ path: `${OUT}/${context}-table.png` }); }
      }
      await c.close();
    }
  }
  await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), checks, failed: checks.filter((c) => !c.ok) }, null, 2));
  console.log(`${checks.length - checks.filter((c) => !c.ok).length}/${checks.length} passed`);
  for (const f of checks.filter((c) => !c.ok)) console.log('FAIL', f.context, f.name, '—', f.detail);
} finally {
  await browser.close();
}
