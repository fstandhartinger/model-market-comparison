// R9.1 Google Vertex collector, live read-back (iteration 59, verifying cfd37e9). Hard checks through the public
// API: /api/meta dates google_vertex today's collection, the two rows the collector added are served at the
// pricing page's prices, and a long-standing row kept its prices. The model pages are opened at 1440/390,
// light/dark for screenshots and page errors; whether the Vertex group is visible under the default filters is
// recorded, not asserted (R4.10 may hide providers).
// Usage: node verify-r91-vertex.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
import fs from 'node:fs/promises';

const BASE = process.argv[2] || 'https://benchmarkheaven.com';
const OUT = process.argv[3] || '/tmp/r91-vertex';
await fs.mkdir(OUT, { recursive: true });
const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail: detail ?? '' }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${detail ?? ''}`); };
const EXPECT = {
  'grok-4.6::high': [['global', 2, 6]],
  'glm-5.2::max': [['global', 1.4, 4.4]],
  'claude-opus-5::max': [['global', 5, 25], ['eu', 5.5, 27.5]],
};

const meta = await (await fetch(`${BASE}/api/meta`, { cache: 'no-store' })).json();
const vertexDate = JSON.stringify(meta).match(/"google_vertex":"([^"]+)"/)?.[1];
check('/api/meta dates google_vertex 2026-09-14', vertexDate === '2026-09-14', vertexDate);
for (const [id, want] of Object.entries(EXPECT)) {
  const d = await (await fetch(`${BASE}/api/models/${encodeURIComponent(id)}`, { cache: 'no-store' })).json();
  const vertex = (d.model?.offers ?? []).filter((o) => o.source === 'Google Vertex AI');
  for (const [region, input, output] of want) {
    const hit = vertex.find((o) => o.region === region && o.input_per_1m === input && o.output_per_1m === output);
    check(`${id} Vertex ${region} offer ${input}/${output}`, hit, vertex.map((o) => `${o.region} ${o.input_per_1m}/${o.output_per_1m}`).join(' · '));
  }
  check(`${id} every Vertex offer priced`, vertex.length > 0 && !vertex.some((o) => o.input_per_1m == null || o.output_per_1m == null), `${vertex.length} offers`);
}

const b = await chromium.launch();
const seen = {};
for (const theme of ['light', 'dark']) for (const [kind, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const ctx = await b.newContext({ viewport, colorScheme: theme });
  for (const id of Object.keys(EXPECT).slice(0, 2)) {
    const p = await ctx.newPage();
    const errors = [];
    p.on('pageerror', (e) => errors.push(String(e)));
    const res = await p.goto(`${BASE}/models/${encodeURIComponent(id)}`, { waitUntil: 'networkidle' });
    await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
    await p.waitForTimeout(600);
    const state = await p.evaluate(() => ({ vertex: /Google Vertex AI/.test(document.body.innerText), overflow: document.documentElement.scrollWidth > innerWidth + 1 }));
    seen[`${kind}_${theme} ${id}`] = state.vertex;
    await p.screenshot({ path: `${OUT}/${kind}_${theme}-${id.replace(/[^a-z0-9.-]/gi, '_')}.png` });
    check(`${kind}_${theme} ${id} page renders without errors or overflow`, res?.ok() && errors.length === 0 && !state.overflow, `${res?.status()} ${errors.join(' | ').slice(0, 120)}`);
    await p.close();
  }
  await ctx.close();
}
await b.close();
const passed = results.filter((r) => r.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), passed, total: results.length, vertex_group_visible_by_default: seen, results }, null, 2));
console.log(`${passed}/${results.length}`, JSON.stringify(seen));
process.exit(passed === results.length ? 0 : 1);
