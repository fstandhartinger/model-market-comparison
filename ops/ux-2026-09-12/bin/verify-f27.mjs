// F-27 acceptance: Benchmarks page phone table and length. 1440×1000 and 390×844, light and dark.
// Usage: node verify-f27.mjs <base-url> <out-dir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = process.argv[2] || 'https://benchmarkheaven.com';
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/f27';
await fs.mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const out = { base: BASE, checked_at: new Date().toISOString(), errors: [], fails: [] };
const expect = (k, ok, detail) => { if (!ok) out.fails.push(`${k}: ${JSON.stringify(detail)}`); };

for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  for (const theme of ['light', 'dark']) {
    const mobile = kind === 'mobile';
    const k = `${kind}_${theme}`;
    try {
      const c = await browser.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme });
      const p = await c.newPage();
      p.on('pageerror', (e) => out.errors.push(`${k} pageerror: ${String(e).slice(0, 200)}`));
      await p.goto(`${BASE}/benchmarks`, { waitUntil: 'networkidle' });
      await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
      await p.waitForTimeout(1200);
      const o = out[k] = await p.evaluate(() => {
        const table = document.querySelector('table.bh-table');
        const visibleHeads = [...(table?.querySelectorAll('thead th') || [])].filter((th) => th.getBoundingClientRect().width > 0).map((th) => th.textContent.trim());
        return {
          title: document.querySelector('h2')?.textContent,
          height: document.documentElement.scrollHeight,
          scrollWidth: document.documentElement.scrollWidth,
          tableRights: [...document.querySelectorAll('table')].map((t) => Math.round(t.getBoundingClientRect().right)),
          visibleHeads,
          rows: table?.querySelectorAll('tbody tr').length ?? 0,
          // The row's own expand only — SourceScore nests its own Evidence disclosure inside it.
          expands: table?.querySelectorAll('tbody tr > td > details').length ?? 0,
          eyebrow: /BENCHMARK EXPLORER/i.test(document.body.innerText),
          compositeDefinition: /Composite definition/.test(document.body.innerText),
          showMore: [...document.querySelectorAll('button')].some((b) => /^Show more/.test(b.textContent || '')),
        };
      });
      expect(`${k} AA Intelligence Index is the default`, /Intelligence Index/.test(o.title || ''), o.title);
      expect(`${k} no page overflow`, o.scrollWidth === vp.width, o.scrollWidth);
      expect(`${k} no table wider than viewport`, o.tableRights.every((r) => r <= vp.width), o.tableRights);
      expect(`${k} 25 rows by default`, o.rows <= 25 && o.rows > 0, o.rows);
      expect(`${k} every row has a provenance expand`, o.expands === o.rows, { rows: o.rows, expands: o.expands });
      expect(`${k} no eyebrow`, !o.eyebrow, o.eyebrow);
      expect(`${k} no Composite definition`, !o.compositeDefinition, o.compositeDefinition);
      if (mobile) expect(`${k} phone columns Rank · Model · Result`, o.visibleHeads.length === 3 && !o.visibleHeads.includes('Explore'), o.visibleHeads);
      else expect(`${k} desktop height <= 3500`, o.height <= 3500, o.height);
      await p.screenshot({ path: `${OUT}/${k}-benchmarks.png`, fullPage: true });
      await c.close();
    } catch (e) { out.errors.push(`${k}: ${String(e).split('\n')[0].slice(0, 200)}`); }
  }
}
await browser.close();
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify(out, null, 2));
console.log(JSON.stringify({ fails: out.fails, errors: out.errors }, null, 2));
