// D248 live check (iteration 261): the two rows of a split family are two separate live model pages,
// one carrying the benchmarks and the other the price. Reads the rendered pages, pins nothing.
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const { writeFileSync, mkdirSync } = require('node:fs');
const OUT = process.argv[2] || '.';
const IDS = ['gemini-2.5-pro::default', 'gemini-2.5-pro::openrouter', 'command-a+::default',
  'command-a+::openrouter', 'gemini-3.1-flash-lite::default', 'gemini-3.1-flash-lite::openrouter'];
const b = await chromium.launch();
const result = { checked_at: new Date().toISOString(), base: 'https://benchmarkheaven.com', pages: {} };
for (const [kind, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
  const ctx = await b.newContext({ viewport: { width, height } });
  const p = await ctx.newPage();
  for (const id of IDS) {
    const url = `https://benchmarkheaven.com/models/${encodeURIComponent(id)}`;
    let pageerror = null;
    p.on('pageerror', (e) => { pageerror = String(e); });
    for (let i = 0; i < 3; i++) { try { await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 }); break; } catch (e) { if (i === 2) throw e; } }
    const m = await p.evaluate(() => {
      const t = document.body.innerText;
      return {
        h1: document.querySelector('h1')?.innerText.trim() ?? null,
        benchmark_rows: document.querySelectorAll('table tbody tr').length,
        says_no_offers: /no (provider|offer)/i.test(t),
        says_no_benchmark: /no benchmark/i.test(t),
        dollar_amounts: (t.match(/\$\d[\d.,]*/g) || []).length,
      };
    });
    result.pages[`${kind}:${id}`] = { url, ...m, pageerror };
  }
  await ctx.close();
}
await b.close();
mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/d248-live-model-pages.json`, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result.pages, null, 1));
