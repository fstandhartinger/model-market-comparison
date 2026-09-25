// Review-gate F-187 verifier (2026-09-25T13:40Z). Independent browser sign-off for the
// responsive Image JevBench preview: bar ranking before the whole-candidate detail table,
// semantic table labels, pinned rank/system columns that stay put AND stay opaque while the
// metric columns scroll, noindex, and no page-level horizontal overflow.
// Usage: node verify-review-20260925T134004Z-f187.mjs <base> <outDir>
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-f187';
await fs.mkdir(OUT, { recursive: true });
const ROUTES = ['/jev-models/multimodal-preview', '/wip-oiifi41ouv1f/image-jev'];
const checks = [];
const check = (ctx, name, ok, detail) => checks.push({ ctx, name, ok: !!ok, detail });

for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  for (const route of ROUTES) {
    const ctx = `${kind}_${theme}${route.replace(/\//g, '_')}`;
    const b = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
    try {
      const c = await b.newContext({ viewport: vp, isMobile: kind === 'mobile', hasTouch: kind === 'mobile', colorScheme: theme, deviceScaleFactor: 1 });
      const p = await c.newPage(); p.setDefaultTimeout(25000);
      await p.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
      await p.waitForLoadState('networkidle').catch(() => {});
      await p.waitForTimeout(500);

      const meta = await p.evaluate(() => {
        const robots = document.querySelector('meta[name="robots"]')?.getAttribute('content') || '';
        const bars = [...document.querySelectorAll('[data-bh-mm-bars]')].map((el) => ({ track: el.getAttribute('data-bh-mm-bars'), y: Math.round(el.getBoundingClientRect().top + scrollY) }));
        const tables = [...document.querySelectorAll('[data-bh-mm-ranking]')].map((el) => ({ track: el.getAttribute('data-bh-mm-ranking'), label: el.getAttribute('aria-label'), y: Math.round(el.getBoundingClientRect().top + scrollY) }));
        return { robots, bars, tables, docScroll: document.documentElement.scrollWidth, docClient: document.documentElement.clientWidth, bodyScroll: document.body.scrollWidth };
      });
      check(ctx, 'noindex', /noindex/.test(meta.robots), meta.robots);
      check(ctx, 'three ranking tables', meta.tables.length === 3, JSON.stringify(meta.tables.map((t) => t.track)));
      check(ctx, 'every ranking table has an aria-label', meta.tables.every((t) => t.label && t.label.trim().length > 3), JSON.stringify(meta.tables.map((t) => t.label)));
      const barsAll = meta.bars.find((x) => x.track === 'all');
      const tableAll = meta.tables.find((x) => x.track === 'all');
      check(ctx, 'bar ranking precedes the whole-candidate table', !!barsAll && !!tableAll && barsAll.y < tableAll.y, JSON.stringify({ bars: barsAll?.y, table: tableAll?.y }));
      check(ctx, 'no page-level horizontal overflow', meta.docScroll <= meta.docClient + 1, JSON.stringify({ scroll: meta.docScroll, client: meta.docClient }));

      // Pinned columns: measure the whole-candidate table before and after scrolling its own wrapper.
      const pinned = await p.evaluate(() => {
        const table = document.querySelector('[data-bh-mm-ranking="all"]');
        const wrap = table.closest('.overflow-x-auto');
        const opaque = (el) => {
          const bg = getComputedStyle(el).backgroundColor;
          const m = bg.match(/rgba?\(([^)]+)\)/);
          const parts = m ? m[1].split(/[\s,\/]+/).filter(Boolean) : [];
          const alpha = parts.length > 3 ? Number(parts[3]) : 1;
          return { bg, alpha, ok: bg !== 'transparent' && alpha === 1 };
        };
        const firstRow = table.querySelector('tbody tr');
        const rankCell = firstRow.querySelector('td');
        const sysCell = firstRow.querySelector('th');
        const before = { rank: rankCell.getBoundingClientRect().left, sys: sysCell.getBoundingClientRect().left };
        const maxScroll = wrap.scrollWidth - wrap.clientWidth;
        wrap.scrollLeft = maxScroll;
        const after = { rank: rankCell.getBoundingClientRect().left, sys: sysCell.getBoundingClientRect().left };
        const rankStyle = getComputedStyle(rankCell), sysStyle = getComputedStyle(sysCell);
        return {
          maxScroll, before, after,
          rankPos: rankStyle.position, sysPos: sysStyle.position,
          rankLeft: rankStyle.left, sysLeft: sysStyle.left,
          rankBg: opaque(rankCell), sysBg: opaque(sysCell),
          rankText: rankCell.textContent.trim(), sysText: sysCell.textContent.trim(),
          rankW: rankCell.getBoundingClientRect().width, sysW: sysCell.getBoundingClientRect().width,
          wrapLeft: wrap.getBoundingClientRect().left,
          overlap: Math.round(sysCell.getBoundingClientRect().left - (rankCell.getBoundingClientRect().left + rankCell.getBoundingClientRect().width)),
        };
      });
      check(ctx, 'table scrolls horizontally inside its wrapper', pinned.maxScroll > 0, `maxScroll=${Math.round(pinned.maxScroll)}`);
      check(ctx, 'rank cell is sticky at left 0', pinned.rankPos === 'sticky' && pinned.rankLeft === '0px', `${pinned.rankPos} ${pinned.rankLeft}`);
      check(ctx, 'system cell is sticky at left 56px', pinned.sysPos === 'sticky' && pinned.sysLeft === '56px', `${pinned.sysPos} ${pinned.sysLeft}`);
      check(ctx, 'rank stays in place after scrolling right', Math.abs(pinned.after.rank - pinned.before.rank) <= 1, JSON.stringify(pinned));
      check(ctx, 'system stays in place after scrolling right', Math.abs(pinned.after.sys - pinned.before.sys) <= 1, JSON.stringify({ before: pinned.before.sys, after: pinned.after.sys }));
      check(ctx, 'rank cell background is opaque', pinned.rankBg.ok, JSON.stringify(pinned.rankBg));
      check(ctx, 'system cell background is opaque', pinned.sysBg.ok, JSON.stringify(pinned.sysBg));
      check(ctx, 'pinned columns do not overlap', pinned.overlap >= 0 && pinned.overlap <= 2, `gap=${pinned.overlap}px rankW=${Math.round(pinned.rankW)} sysW=${Math.round(pinned.sysW)}`);
      check(ctx, 'rank and system identity carry text', pinned.rankText.length > 0 && pinned.sysText.length > 0, JSON.stringify({ rank: pinned.rankText, sys: pinned.sysText }));
      await p.screenshot({ path: `${OUT}/${ctx}.png` });
      await c.close();
    } finally { await b.close(); }
  }
}
const fail = checks.filter((c) => !c.ok);
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), total: checks.length, passed: checks.length - fail.length, failed: fail.length, checks }, null, 2));
console.log(`${checks.length - fail.length}/${checks.length} pass`);
for (const f of fail) console.log('FAIL', f.ctx, f.name, f.detail);
process.exit(fail.length ? 1 : 0);
