// Iteration 170 live check (claude-opus): CharXiv Reasoning (CR-37.1) is served by the API with provenance (the authors' CSV,
// measured), joins only the sixteen reviewed exact configurations (a stated level, a dated release, or a single-default family),
// keeps the ambiguous labels unjoined with their values, is not tagged Judged, and renders on the ranking page and on a joined
// model's page at desktop and phone width in both themes. Usage: node verify-iter170.mjs <base-url> <out-dir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');

const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-iter170';
await fs.mkdir(OUT, { recursive: true });
const REV = (await (await fetch(`${BASE}/api/meta`)).json()).revision;
const BID = 'charxiv-reasoning::val-v1.0';
const B = { name: 'CharXiv Reasoning', category: 'Vision', url: 'https://charxiv.github.io/data/val_result.csv', sha: '11fe8260714bffef6062091524d3f9103e62d704522bea37408de4b7f34607c0', rows: 95, joins: 16,
  joined: { 'o4 mini (high)': ['o4-mini::high', 72.0], 'GPT 4.1': ['gpt-4.1::default', 56.7], 'GPT 4.1 mini': ['gpt-4.1-mini::default', 56.8], 'GPT 4.1 nano': ['gpt-4.1-nano::default', 40.5],
    'GPT 4.5': ['gpt-4.5-preview::default', 55.4], 'o1': ['o1::default', 52.6], 'GPT-4o 240513': ['gpt-4o-may-24::default', 47.1], 'Claude 3 Opus': ['claude-3-opus::default', 30.2],
    'Claude 3 Sonnet': ['claude-3-sonnet::default', 32.2], 'Claude 3 Haiku': ['claude-3-haiku::default', 31.8], 'Gemini 1.0 Pro': ['gemini-1.0-pro::default', 22.8],
    'Llama 3.2 Vision 11B': ['llama-3.2-11b-vision-instruct::default', 31.2], 'Llama 3.2 Vision 90B': ['llama-3.2-instruct-90b-vision::default', 37.5], 'Molmo 7B D': ['molmo-7b-d::default', 26.4],
    'Pixtral 12B': ['pixtral-12b-2409::default', 42.4], 'Qwen2.5-VL 72B': ['qwen2.5-vl-72b-instruct::default', 49.7] },
  open: { 'o3 (high)': 78.6, 'o1 (high)': 55.1, 'Claude 3.7 Sonnet': 64.2, 'Claude 3.5 Sonnet': 60.2, 'GPT-4o 241120': 50.5, 'GPT-4o Mini': 34.1, 'Gemini 1.5 Pro': 43.3 } };
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: !!ok, detail });
const settle = (p) => p.waitForLoadState('networkidle').catch(() => {}).then(() => p.waitForTimeout(1500));
const get = async (path) => (await fetch(`${BASE}${path}${path.includes('?') ? '&' : '?'}v=${Date.now()}`)).json();
const near = (a, b) => typeof a === 'number' && Math.abs(a - b) < 0.0051;

// --- API ---
const registry = await get('/api/benchmarks');
const list = registry.benchmarks ?? registry.entries ?? registry;
{
  const page = await get(`/api/benchmark-scores?benchmark_id=${encodeURIComponent(BID)}&limit=200`);
  const rows = page.observations ?? page.scores ?? page.data ?? [];
  const joined = rows.filter((o) => o.subject?.model_id);
  check(`API ${B.name}: ${B.rows} rows, ${B.joins} exact joins, percent, measured`, rows.length === B.rows && joined.length === B.joins && rows.every((o) => o.unit === 'percent' && o.basis === 'measured'), { rows: rows.length, joins: joined.length, basis: rows[0]?.basis, source_basis: rows[0]?.source_basis });
  check(`API ${B.name}: provenance names the source page and the capture hash`, rows.length && rows.every((o) => o.source?.url === B.url && o.source?.sha256 === B.sha), rows[0]?.source?.url);
  const at = (src) => rows.find((o) => o.subject?.source_id === src);
  const bad = Object.entries(B.joined).filter(([src, [m, v]]) => at(src)?.subject?.model_id !== m || !near(at(src)?.value, v)).map(([s]) => s);
  check(`API ${B.name}: every join carries the board value and the exact reviewed configuration`, bad.length === 0, bad);
  const badOpen = Object.entries(B.open).filter(([src, v]) => !at(src) || at(src).subject.model_id !== null || !near(at(src).value, v)).map(([s]) => s);
  check(`API ${B.name}: ambiguous labels (o3/o1 (high), Claude 3.5/3.7 Sonnet, GPT-4o 241120/Mini, Gemini 1.5 Pro) stay unjoined, values kept`, badOpen.length === 0, badOpen);
  check(`API ${B.name}: Pixtral 12B keeps its source-inconsistency note; the Human/random baselines are absent`, /source_inconsistency/.test(at('Pixtral 12B')?.protocol ?? '') && !at('Human') && !at('Random (GPT-4o)'), (at('Pixtral 12B')?.protocol ?? '').slice(-160));
  const entry = list.find?.((e) => e.id === BID);
  check(`API ${B.name}: registry lists an active ${B.category} leaderboard`, entry?.category === B.category && entry?.status === 'active', entry && { category: entry.category, status: entry.status });
}
const { matrix } = await get(`/api/benchmark-matrix?models=${encodeURIComponent('o4-mini::high,gpt-4.1::default')}`);
const rowsM = matrix?.rows ?? [];
const idx = rowsM.map((r, i) => [r, i]).filter(([r]) => JSON.stringify(r).includes('charxiv-reasoning::')).map(([, i]) => i);
const vals = (matrix?.values?.['o4-mini::high'] ?? []).filter((v) => idx.includes(v[0]));
check('API: Benchmarks-tab matrix has o4-mini (high) at 72.0 on CharXiv Reasoning', vals.some((v) => Math.abs(v[1] - 72.0) < 0.051), { idx, vals });
check('API: the CharXiv matrix row is not tagged Judged (answer-key check)', idx.length > 0 && idx.every((i) => rowsM[i].judged !== true), idx.map((i) => rowsM[i].judged));

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
      const appliedTheme = await p.evaluate(() => document.documentElement.dataset.theme || getComputedStyle(document.documentElement).colorScheme);
      check(`${tag}: page theme is ${theme}`, String(appliedTheme).includes(theme), appliedTheme);
      const text = await p.locator('main').innerText().catch(() => '');
      check(`${tag}: ranking page names CharXiv Reasoning`, text.includes('CharXiv'), text.slice(0, 200));
      check(`${tag}: version line reads "Version val-v1.0"`, text.includes('Version val-v1.0'), (text.match(/Version [\w.-]+/) ?? [''])[0]);
      check(`${tag}: CharXiv default view shows o4-mini at 72.0`, /o4-mini[\s\S]{0,200}72(\.0)?\b/i.test(text), (text.match(/[^\n]*o4-mini[^\n]*/i) ?? [''])[0]);
      await p.screenshot({ path: `${OUT}/${tag}-CharXiv.png` }).catch(() => {});
      const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(`${tag}: CharXiv ranking page has no horizontal overflow`, overflow <= 1, String(overflow));
      await p.goto(`${BASE}/models/${encodeURIComponent('gpt-4.1::default')}?v=${Date.now()}`, { waitUntil: 'domcontentloaded' });
      await settle(p);
      await p.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
      await p.waitForTimeout(600);
      const model = await p.locator('main').innerText().catch(() => '');
      check(`${tag}: GPT-4.1 page lists CharXiv Reasoning at 56.7`, /CharXiv Reasoning[\s\S]{0,200}56\.7/.test(model), (model.match(/[^\n]*CharXiv[^\n]*\n?[^\n]*/g) ?? []).slice(0, 3));
      await p.screenshot({ path: `${OUT}/${tag}-model.png` }).catch(() => {});
      const overflow2 = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(`${tag}: model page has no horizontal overflow`, overflow2 <= 1, String(overflow2));
      check(`${tag}: no page errors`, errors.length === 0, errors.slice(0, 3));
    } finally { await c.close(); }
  }
} finally { await browser.close(); }
const passed = checks.filter((x) => x.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, revision: REV, runner: process.env.BH_RUNNER || 'unspecified', at: new Date().toISOString(), passed, total: checks.length, checks }, null, 2));
for (const x of checks) if (!x.ok) console.log(`FAIL ${x.name} — ${JSON.stringify(x.detail).slice(0, 300)}`);
console.log(`${BASE} @ ${REV}: ${passed}/${checks.length}`);
process.exit(passed === checks.length ? 0 : 1);
