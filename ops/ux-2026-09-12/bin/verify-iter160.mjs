// Iteration 160 live check (claude-opus): four duplicate catalog models merged into their canonical families. The twin
// ids are gone from the API, their offers and Epoch ECI sit on the canonical rows, the five "Nemotron 3 Ultra" board
// rows stay published unjoined, and the merged model page and a ranking page render at 1440/390, light/dark.
// Usage: node verify-iter160.mjs <base-url> <out-dir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');

const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-iter160';
await fs.mkdir(OUT, { recursive: true });
const REV = (await (await fetch(`${BASE}/api/meta`)).json()).revision;
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: !!ok, detail });
const settle = (p) => p.waitForLoadState('networkidle').catch(() => {}).then(() => p.waitForTimeout(1500));
const url = (path) => `${BASE}${path}${path.includes('?') ? '&' : '?'}v=${Date.now()}`;
const get = async (path) => (await fetch(url(path))).json();
const NEMO = 'nemotron-3-ultra-550b-a55b::reasoning';

// --- API ---
for (const id of ['nemotron-3-ultra::default', 'nemotron-3.5-lightning-30b-a3b::default', 'llama-4-maverick-17b::default', 'llama-4-scout-17b::default']) {
  const r = await fetch(url(`/api/models/${encodeURIComponent(id)}`));
  check(`API: twin ${id} no longer resolves`, r.status === 404, r.status);
}
const model = async (id) => (await get(`/api/models/${encodeURIComponent(id)}`)).model;
const providers = (m) => new Set((m?.offers ?? []).map((o) => o.provider));
const nemo = await model(NEMO);
check('API: Nemotron 3 Ultra carries the Azure AI Foundry offer ($0.66 / $2.64)', nemo?.offers?.some((o) => o.provider === 'Azure AI Foundry' && o.input_per_1m === 0.66 && o.output_per_1m === 2.64), [...providers(nemo)]);
check('API: Nemotron 3 Ultra carries Epoch ECI 146.27 with its family-scope note', nemo?.benchmarks?.epoch_eci === 146.27 && /family representative/.test(nemo?.epoch_eci_attachment_note ?? ''), nemo?.benchmarks?.epoch_eci);
check('API: Nemotron 3 Ultra keeps its AA Intelligence Index 22.9 and its OpenRouter offers', nemo?.benchmarks?.aa_intelligence_index === 22.9 && providers(nemo).has('Nebius') && providers(nemo).has('DeepInfra'), nemo?.benchmarks?.aa_intelligence_index);
const light = await model('nemotron-3.5-lightning::default');
check('API: Nemotron 3.5 Lightning carries the TrustedTokens EU offer', light?.offers?.some((o) => o.provider === 'TrustedTokens' && o.region === 'eu'), [...providers(light)]);
const mav = await model('llama-4-maverick::default');
check('API: Llama 4 Maverick carries the AWS Bedrock and Azure AI Foundry offers', providers(mav).has('AWS Bedrock') && providers(mav).has('Azure AI Foundry'), [...providers(mav)]);
const scout = await model('llama-4-scout::default');
check('API: Llama 4 Scout carries the AWS Bedrock offer', providers(scout).has('AWS Bedrock'), [...providers(scout)]);
const all = await get('/api/models?score=composite');
const ids = new Set((all.models ?? all.data ?? all).map?.((m) => m.id) ?? []);
check('API: the composite model list has the canonical rows and none of the twins', ids.has(NEMO) && ids.has('llama-4-maverick::default') && !ids.has('nemotron-3-ultra::default') && !ids.has('llama-4-scout-17b::default'), ids.size);
for (const [bid, sid, value] of [['simple-bench::snapshot-2026-09-10', 'Nemotron 3 Ultra', 41.7], ['toolathlon-verified::2026-06-30', 'Nemotron 3 Ultra', 34.3],
  ['chess-puzzles::snapshot-2026-09-18', 'nemotron-3-ultra', 0.12], ['mystery-game-puzzles::snapshot-2026-09-18', 'nemotron-3-ultra', 0.2], ['epoch-gpqa-diamond::snapshot-2026-09-18', 'nemotron-3-ultra', 0.8535353535353535]]) {
  const page = await get(`/api/benchmark-scores?benchmark_id=${encodeURIComponent(bid)}&limit=500`);
  const rows = page.observations ?? page.scores ?? page.data ?? [];
  const row = rows.find((o) => o.subject?.source_id === sid);
  check(`API: ${bid} still publishes "${sid}" = ${value}, unjoined`, row && row.value === value && row.subject.model_id === null && row.basis === 'measured', row && { value: row.value, model: row.subject.model_id });
}

// --- UI ---
const browser = await chromium.launch();
try {
  for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
    const tag = `${kind}_${theme}`, mobile = kind === 'mobile';
    const c = await browser.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme });
    await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
    const p = await c.newPage(); const errors = [];
    p.on('pageerror', (e) => errors.push(String(e)));
    try {
      await p.goto(url(`/models/${encodeURIComponent(NEMO)}`), { waitUntil: 'domcontentloaded' });
      await settle(p);
      await p.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
      await p.waitForTimeout(600);
      const text = await p.locator('main').innerText().catch(() => '');
      check(`${tag}: Nemotron 3 Ultra page lists the Azure AI Foundry offer`, /Azure AI Foundry/.test(text), (text.match(/[^\n]*Azure[^\n]*/) ?? [''])[0]);
      check(`${tag}: Nemotron 3 Ultra page shows Epoch ECI 146.3`, /ECI[\s\S]{0,300}146\.3|146\.3[\s\S]{0,300}ECI/.test(text), (text.match(/[^\n]*146\.3[^\n]*/) ?? [''])[0]);
      await p.screenshot({ path: `${OUT}/${tag}-model.png` }).catch(() => {});
      const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(`${tag}: model page has no horizontal overflow`, overflow <= 1, String(overflow));
      await p.goto(url(`/benchmarks?benchmark=${encodeURIComponent('simple-bench::snapshot-2026-09-10')}`), { waitUntil: 'domcontentloaded' });
      await settle(p);
      const box = p.getByLabel('Include results not matched to a catalog model');
      if (await box.count()) { await box.check(); await p.waitForTimeout(800); }
      await p.getByPlaceholder('Model or creator').fill('Nemotron 3 Ultra');
      await p.waitForTimeout(800);
      const rank = await p.locator('main').innerText().catch(() => '');
      check(`${tag}: SimpleBench ranking still lists Nemotron 3 Ultra with 41.7 (unmatched)`, /Nemotron 3 Ultra[\s\S]{0,200}41\.7/.test(rank), (rank.match(/[^\n]*Nemotron 3 Ultra[^\n]*\n?[^\n]*/) ?? [''])[0]);
      await p.screenshot({ path: `${OUT}/${tag}-ranking.png` }).catch(() => {});
      check(`${tag}: no page errors`, errors.length === 0, errors.slice(0, 3));
    } finally { await c.close(); }
  }
} finally { await browser.close(); }
const passed = checks.filter((x) => x.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, revision: REV, runner: process.env.BH_RUNNER || 'unspecified', at: new Date().toISOString(), passed, total: checks.length, checks }, null, 2));
for (const x of checks) if (!x.ok) console.log(`FAIL ${x.name} — ${JSON.stringify(x.detail).slice(0, 300)}`);
console.log(`${BASE} @ ${REV}: ${passed}/${checks.length}`);
process.exit(passed === checks.length ? 0 : 1);
