// R9.1 Azure AI Foundry collector, live read-back (iteration 58). Hard checks through the public API:
// /api/meta dates azure_foundry today's collection, and the re-priced offers are served. The model pages
// are opened at 1440/390, light/dark for screenshots and page errors; whether the Azure group is visible
// under the default filters is recorded, not asserted (R4.10 may hide providers).
// Usage: node verify-r91-azure.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
import fs from 'node:fs/promises';

const BASE = process.argv[2] || 'https://benchmarkheaven.com';
const OUT = process.argv[3] || '/tmp/r91-azure';
await fs.mkdir(OUT, { recursive: true });
const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail: detail ?? '' }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${detail ?? ''}`); };
const EXPECT = {
  'gpt-5.6-sol::high': [['global', 4, 20], ['eu', 4.4, 22]],
  'gpt-6-astra::high': [['global', 10, 50], ['eu', 12, 60]],
};

const meta = await (await fetch(`${BASE}/api/meta`, { cache: 'no-store' })).json();
const azureDate = JSON.stringify(meta).match(/"azure_foundry":"([^"]+)"/)?.[1];
check('/api/meta dates azure_foundry 2026-09-14', azureDate === '2026-09-14', azureDate);
for (const [id, want] of Object.entries(EXPECT)) {
  const d = await (await fetch(`${BASE}/api/models/${encodeURIComponent(id)}`, { cache: 'no-store' })).json();
  const azure = (d.model?.offers ?? []).filter((o) => o.source === 'Azure AI Foundry');
  for (const [region, input, output] of want) {
    const hit = azure.find((o) => o.region === region && o.input_per_1m === input && o.output_per_1m === output);
    check(`${id} Azure ${region} offer ${input}/${output}`, hit, azure.map((o) => `${o.region} ${o.input_per_1m}/${o.output_per_1m}`).join(' · '));
  }
  check(`${id} no stale Azure price left`, !azure.some((o) => (o.input_per_1m === 5 && o.output_per_1m === 30) || (o.input_per_1m === 5.5 && o.output_per_1m === 33) || o.input_per_1m == null), '');
}

const b = await chromium.launch();
const seen = {};
for (const theme of ['light', 'dark']) for (const [kind, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const ctx = await b.newContext({ viewport, colorScheme: theme });
  for (const id of Object.keys(EXPECT)) {
    const p = await ctx.newPage();
    const errors = [];
    p.on('pageerror', (e) => errors.push(String(e)));
    const res = await p.goto(`${BASE}/models/${encodeURIComponent(id)}`, { waitUntil: 'networkidle' });
    await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
    await p.waitForTimeout(600);
    const state = await p.evaluate(() => ({ azure: /Azure AI Foundry/.test(document.body.innerText), overflow: document.documentElement.scrollWidth > innerWidth + 1 }));
    seen[`${kind}_${theme} ${id}`] = state.azure;
    await p.screenshot({ path: `${OUT}/${kind}_${theme}-${id.replace(/[^a-z0-9.-]/gi, '_')}.png` });
    check(`${kind}_${theme} ${id} page renders without errors or overflow`, res?.ok() && errors.length === 0 && !state.overflow, `${res?.status()} ${errors.join(' | ').slice(0, 120)}`);
    await p.close();
  }
  await ctx.close();
}
await b.close();
const passed = results.filter((r) => r.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), passed, total: results.length, azure_group_visible_by_default: seen, results }, null, 2));
console.log(`${passed}/${results.length}`, JSON.stringify(seen));
process.exit(passed === results.length ? 0 : 1);
