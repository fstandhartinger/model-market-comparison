// Iteration 158 live check (claude-opus): React Native Evals (CR-37.1) is served by the API in percent with provenance,
// joins exactly three single-default families, keeps each row's requirement counts, carries the Judged tag, and renders
// on its ranking page and on a joined model's page. Usage: node verify-iter158.mjs <base-url> <out-dir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');

const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-iter158';
await fs.mkdir(OUT, { recursive: true });
const REV = (await (await fetch(`${BASE}/api/meta`)).json()).revision;
const BID = 'react-native-evals::91-evals';
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: !!ok, detail });
const settle = (p) => p.waitForLoadState('networkidle').catch(() => {}).then(() => p.waitForTimeout(1500));
const get = async (path) => (await fetch(`${BASE}${path}${path.includes('?') ? '&' : '?'}v=${Date.now()}`)).json();

// --- API ---
const page = await get(`/api/benchmark-scores?benchmark_id=${encodeURIComponent(BID)}&limit=100`);
const rows = page.observations ?? page.scores ?? page.data ?? [];
check('API: all 27 React Native Evals rows are served, none with a harness identity', rows.length === 27 && rows.every((o) => !o.subject?.harness), rows.length);
const opus = rows.find((o) => o.subject?.source_id === 'claude-opus-5');
check('API: Claude Opus 5 = 90.809 %, measured, unjoined (the board states no setting; the catalog holds six configurations)',
  opus && Math.abs(opus.value - 90.80917874396135) < 1e-9 && opus.unit === 'percent' && opus.basis === 'measured' && opus.subject.model_id === null,
  opus && { value: opus.value, unit: opus.unit, basis: opus.basis, model: opus.subject.model_id });
check('API: provenance names the board page and the capture hash',
  opus?.source?.url === 'https://rn-evals.vercel.app/' && opus?.source?.sha256 === '44177e508aa4b210b607a99c44f7aaea9c6f86d1a91016b0e2f46bc6d19fe812', opus?.source?.url);
const joined = rows.filter((o) => o.subject?.model_id).map((o) => `${o.subject.source_id}→${o.subject.model_id}=${o.value.toFixed(4)}`).sort();
check('API: exactly three single-default joins',
  JSON.stringify(joined) === JSON.stringify(['gemini-3.1-pro-preview→gemini-3.1-pro-preview::default=84.2677', 'minimax-m3→minimax-m3::default=83.4596', 'mistral-large-3→mistral-large-3::default=72.7778']), joined);
check('API: Opus 5 keeps its requirement counts (3578 of 3940 judged) and the run date in the protocol',
  /"requirements_passed":3578/.test(opus?.protocol ?? '') && /"requirements_judged":3940/.test(opus?.protocol ?? '') && /"run_finished_at":"2026-09-17/.test(opus?.protocol ?? ''), opus?.protocol?.slice(-260));
const registry = await get('/api/benchmarks');
const entry = (registry.benchmarks ?? registry.entries ?? registry).find?.((e) => e.id === BID);
check('API: registry lists the board as Coding in percent', entry?.category === 'Coding' && entry?.scoring?.unit === 'percent', entry && { category: entry.category, unit: entry.scoring?.unit });
const { matrix } = await get(`/api/benchmark-matrix?models=${encodeURIComponent('minimax-m3::default,mistral-large-3::default')}`);
const mIndex = matrix?.rows?.findIndex((r) => r.benchmarkId === BID || (r.boards ?? []).includes(BID));
const mRow = matrix?.rows?.[mIndex];
const mVal = (matrix?.values?.['minimax-m3::default'] ?? []).find((v) => v[0] === mIndex);
check('API: Benchmarks-tab matrix carries the row in the coding group, tagged Judged, with MiniMax M3 measured',
  mRow && /cod/i.test(mRow.group) && JSON.stringify(mRow).toLowerCase().includes('judged') && mVal && Math.abs(mVal[1] - 83.45959595959596) < 0.06 && mVal[2] === 0, mRow && { group: mRow.group, tags: mRow.tags, judged: mRow.judged, value: mVal });

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
      check(`${tag}: ranking page names the board`, /React Native Evals/.test(first), first.slice(0, 200));
      check(`${tag}: default view lists the three joined models and says 3 of 27 are matched`, /\b3 results\b/.test(first) && /3 of 27 published results are matched/.test(first) && /MiniMax[- ]M3[\s\S]{0,200}83\.[45]/.test(first) && /Mistral Large 3/.test(first), (first.match(/\d+ results/) ?? [''])[0]);
      await p.getByLabel('Include results not matched to a catalog model').check();
      await p.waitForTimeout(800);
      const text = await p.locator('main').innerText().catch(() => '');
      check(`${tag}: with unmatched results included, 27 rows`, /\b27 results\b/.test(text), (text.match(/\d+ results/) ?? [''])[0]);
      check(`${tag}: ranking lists Claude Opus 5 as named by the source with 90.8`, /Claude Opus 5[\s\S]{0,200}90\.8/.test(text), (text.match(/Claude Opus 5[^\n]*\n?[^\n]*\n?[^\n]*\n?[^\n]*/) ?? [''])[0]);
      check(`${tag}: ranking lists Callstack's Apex agent with 90.9`, /Apex[\s\S]{0,200}90\.9/.test(text));
      await p.screenshot({ path: `${OUT}/${tag}-ranking.png` }).catch(() => {});
      const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(`${tag}: ranking page has no horizontal overflow`, overflow <= 1, String(overflow));
      await p.goto(`${BASE}/models/${encodeURIComponent('minimax-m3::default')}?v=${Date.now()}`, { waitUntil: 'domcontentloaded' });
      await settle(p);
      await p.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
      await p.waitForTimeout(600);
      const model = await p.locator('main').innerText().catch(() => '');
      check(`${tag}: MiniMax M3 page lists its React Native Evals result`, /React Native Evals/.test(model), (model.match(/[^\n]*React Native Evals[^\n]*\n?[^\n]*/) ?? [''])[0]);
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
