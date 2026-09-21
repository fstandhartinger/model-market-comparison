// Iteration 157 live check (claude-opus): Long-Horizon Terminal-Bench (CR-37.1) is served by the API on the board's
// 0–1 points scale with provenance, joins exactly six single-default families, keeps each run's date and solved
// counts, and renders on its ranking page and on a joined model's page. Usage: node verify-iter157.mjs <base-url> <out-dir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');

const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-iter157';
await fs.mkdir(OUT, { recursive: true });
const REV = (await (await fetch(`${BASE}/api/meta`)).json()).revision;
const BID = 'long-horizon-terminal-bench::1.0';
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: !!ok, detail });
const settle = (p) => p.waitForLoadState('networkidle').catch(() => {}).then(() => p.waitForTimeout(1500));
const get = async (path) => (await fetch(`${BASE}${path}${path.includes('?') ? '&' : '?'}v=${Date.now()}`)).json();

// --- API ---
const page = await get(`/api/benchmark-scores?benchmark_id=${encodeURIComponent(BID)}&limit=100`);
const rows = page.observations ?? page.scores ?? page.data ?? [];
check('API: all 22 LHTB rows are served, every one on the Terminus-2 harness', rows.length === 22 && rows.every((o) => o.subject?.harness === 'Terminus-2'), rows.length);
const astra = rows.find((o) => o.subject?.source_id === 'Grok 4.5');
check('API: Grok 4.5 = 0.505 points, measured, unjoined (the board states no setting; the catalog holds grok-4.5::high only)',
  astra && astra.value === 0.505 && astra.unit === 'points' && astra.basis === 'measured' && astra.subject.model_id === null,
  astra && { value: astra.value, unit: astra.unit, basis: astra.basis, model: astra.subject.model_id });
check('API: provenance names the LHTB script and the capture hash',
  astra?.source?.url === 'https://zli12321.github.io/LHTB/script.js' && astra?.source?.sha256 === '8b9c27664cc6298fa234c607ca27c953ec91b2eb9d116b8530cfaaa6722fa39e', astra?.source?.url);
const joined = rows.filter((o) => o.subject?.model_id).map((o) => `${o.subject.source_id}→${o.subject.model_id}=${o.value}`).sort();
check('API: exactly six single-default joins',
  JSON.stringify(joined) === JSON.stringify(['Grok 4.20→grok-4.20::default=0.102', 'Hy3→hy3::default=0.288', 'Kimi K2.7 Code→kimi-k2.7-code::default=0.367', 'MiniMax M3→minimax-m3::default=0.385', 'Qwen3.6 Plus→qwen3.6-plus::default=0.313', 'Qwen3.7 Max→qwen3.7-max::default=0.296']), joined);
const k3 = rows.find((o) => o.subject?.source_id === 'Kimi K3');
check('API: the post-paper Kimi K3 run keeps its date and solved counts in the protocol', k3 && k3.value === 0.378 && /"date":"2026-07-22"/.test(k3.protocol) && /"solved_at_0.90_0.95_1.00":\[7,6,5\]/.test(k3.protocol), k3?.protocol?.slice(-200));
const registry = await get('/api/benchmarks');
const entry = (registry.benchmarks ?? registry.entries ?? registry).find?.((e) => e.id === BID);
check('API: registry lists the board as Agentic on a 0–1 points scale', entry?.category === 'Agentic' && entry?.scoring?.unit === 'points', entry && { category: entry.category, unit: entry.scoring?.unit });
const { matrix } = await get(`/api/benchmark-matrix?models=${encodeURIComponent('hy3::default,minimax-m3::default')}`);
const mIndex = matrix?.rows?.findIndex((r) => r.benchmarkId === BID || (r.boards ?? []).includes(BID));
const mRow = matrix?.rows?.[mIndex];
const mVal = (matrix?.values?.['hy3::default'] ?? []).find((v) => v[0] === mIndex);
check('API: Benchmarks-tab matrix carries the row in the agentic group with Hy3 at 0.288, measured',
  mRow && /agent/i.test(mRow.group) && mVal && mVal[1] === 0.288 && mVal[2] === 0, mRow && { group: mRow.group, tags: mRow.tags, value: mVal });

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
      await p.goto(`${BASE}/benchmarks?benchmark=${encodeURIComponent(BID)}&v=${Date.now()}`, { waitUntil: 'domcontentloaded' });
      await settle(p);
      const first = await p.locator('main').innerText().catch(() => '');
      check(`${tag}: ranking page names the board`, /Long-Horizon Terminal-Bench/.test(first), first.slice(0, 200));
      check(`${tag}: default view lists the six joined models and says 6 of 22 are matched`, /\b6 results\b/.test(first) && /6 of 22 published results are matched/.test(first) && /MiniMax[- ]M3[\s\S]{0,200}0\.385/.test(first) && /Hy3/.test(first), (first.match(/\d+ results/) ?? [''])[0]);
      await p.getByLabel('Include results not matched to a catalog model').check();
      await p.waitForTimeout(800);
      const text = await p.locator('main').innerText().catch(() => '');
      check(`${tag}: with unmatched results included, 22 rows`, /\b22 results\b/.test(text), (text.match(/\d+ results/) ?? [''])[0]);
      check(`${tag}: ranking lists Grok 4.5 as named by the source with 0.505`, /Grok 4\.5[\s\S]{0,200}0\.505/.test(text), (text.match(/Grok 4\.5[^\n]*\n?[^\n]*\n?[^\n]*\n?[^\n]*/) ?? [''])[0]);
      check(`${tag}: ranking lists Kimi K3 with 0.378`, /Kimi K3[\s\S]{0,200}0\.378/.test(text));
      await p.screenshot({ path: `${OUT}/${tag}-ranking.png` }).catch(() => {});
      const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(`${tag}: ranking page has no horizontal overflow`, overflow <= 1, String(overflow));
      await p.goto(`${BASE}/models/${encodeURIComponent('hy3::default')}?v=${Date.now()}`, { waitUntil: 'domcontentloaded' });
      await settle(p);
      await p.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
      await p.waitForTimeout(600);
      const model = await p.locator('main').innerText().catch(() => '');
      check(`${tag}: Hy3 page lists its Long-Horizon Terminal-Bench result`, /Long-Horizon Terminal-Bench/.test(model), (model.match(/[^\n]*Long-Horizon Terminal-Bench[^\n]*\n?[^\n]*/) ?? [''])[0]);
      await p.screenshot({ path: `${OUT}/${tag}-model.png` }).catch(() => {});
      check(`${tag}: no page errors`, errors.length === 0, errors.slice(0, 3));
    } finally { await c.close(); }
  }
} finally { await browser.close(); }
const passed = checks.filter((x) => x.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, revision: REV, runner: process.env.BH_RUNNER || 'unspecified', at: new Date().toISOString(), passed, total: checks.length, checks }, null, 2));
for (const x of checks) if (!x.ok) console.log(`FAIL ${x.name} — ${JSON.stringify(x.detail).slice(0, 300)}`);
console.log(`${BASE} @ ${REV}: ${passed}/${checks.length}`);
process.exit(passed === checks.length ? 0 : 1);
