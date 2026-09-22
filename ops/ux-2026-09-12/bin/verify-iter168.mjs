// Iteration 168 live check (claude-opus): VITA-Bench (CR-37.1) is served by the API with provenance, joins only the eight
// reviewed exact configurations (a stated level, or the non-thinking section → non-reasoning), keeps thinking rows without a
// level unjoined, carries the CR-65.7 judged flag (as does Surge GDP.pdf, not Chartography), and renders on the ranking page and on
// a joined model's page at desktop and phone width in both themes. Usage: node verify-iter168.mjs <base-url> <out-dir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');

const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-iter168';
await fs.mkdir(OUT, { recursive: true });
const REV = (await (await fetch(`${BASE}/api/meta`)).json()).revision;
const BOARDS = {
  'vitabench::2026-01-22': { name: 'VitaBench', category: 'Tool-use', url: 'https://vitabench.github.io/', sha: '08ba05f20f9fa97d23d3c072e2d7718c5a0a60eb4807ce56884c3bdbafc97d75', rows: 26, joins: 8,
    joined: { 'Thinking Models|GPT-5.2 (xhigh)': ['gpt-5.2::xhigh', 24.3], 'Thinking Models|o4-mini (high)': ['o4-mini::high', 19.5], 'Non-thinking Models|Claude-4.5-Opus': ['claude-opus-4.5::non-reasoning', 23.3],
      'Non-thinking Models|GLM-4.7': ['glm-4.7::non-reasoning', 15.5], 'Non-thinking Models|GPT-5.2 (none)': ['gpt-5.2::non-reasoning', 0.8], 'Non-thinking Models|Qwen3-32B': ['qwen3-32b::non-reasoning', 4] },
    open: { 'Thinking Models|Claude-4.5-Opus': 28.5, 'Thinking Models|GLM-4.7': 18.3, 'Thinking Models|o3 (high)': 26.3, 'Thinking Models|Gemini-3-Flash (high)': 32.5, 'Non-thinking Models|Gemini-3-Pro (low)': 30, 'Non-thinking Models|Kimi-K2-0905': 11.5 } },
};
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: !!ok, detail });
const settle = (p) => p.waitForLoadState('networkidle').catch(() => {}).then(() => p.waitForTimeout(1500));
const get = async (path) => (await fetch(`${BASE}${path}${path.includes('?') ? '&' : '?'}v=${Date.now()}`)).json();

// --- API ---
const registry = await get('/api/benchmarks');
const list = registry.benchmarks ?? registry.entries ?? registry;
for (const [bid, b] of Object.entries(BOARDS)) {
  const page = await get(`/api/benchmark-scores?benchmark_id=${encodeURIComponent(bid)}&limit=100`);
  const rows = page.observations ?? page.scores ?? page.data ?? [];
  const joined = rows.filter((o) => o.subject?.model_id);
  check(`API ${b.name}: ${b.rows} measured rows, ${b.joins} exact joins, percent`, rows.length === b.rows && joined.length === b.joins && rows.every((o) => o.unit === 'percent' && o.basis === 'measured'), { rows: rows.length, joins: joined.length });
  check(`API ${b.name}: provenance names the source page and the capture hash`, rows.length && rows.every((o) => o.source?.url === b.url && o.source?.sha256 === b.sha), rows[0]?.source?.url);
  const at = (src) => rows.find((o) => o.subject?.source_id === src);
  const bad = Object.entries(b.joined).filter(([src, [m, v]]) => at(src)?.subject?.model_id !== m || at(src)?.value !== v).map(([s]) => s);
  check(`API ${b.name}: sampled joins carry the board value and the exact reviewed configuration`, bad.length === 0, bad);
  const badOpen = Object.entries(b.open).filter(([src, v]) => !at(src) || at(src).subject.model_id !== null || at(src).value !== v).map(([s]) => s);
  check(`API ${b.name}: refused labels stay unjoined, values kept`, badOpen.length === 0, badOpen);
  const entry = list.find?.((e) => e.id === bid);
  check(`API ${b.name}: registry lists an active ${b.category ?? 'Vision'} leaderboard`, entry?.category === (b.category ?? 'Vision') && entry?.status === 'active', entry && { category: entry.category, status: entry.status });
}
const { matrix } = await get(`/api/benchmark-matrix?models=${encodeURIComponent('gpt-5.2::xhigh,glm-4.7::non-reasoning')}`);
const rowsM = matrix?.rows ?? [];
const idx = rowsM.map((r, i) => [r, i]).filter(([r]) => JSON.stringify(r).includes('vitabench::')).map(([, i]) => i);
const vals = (matrix?.values?.['gpt-5.2::xhigh'] ?? []).filter((v) => idx.includes(v[0]));
check('API: Benchmarks-tab matrix has GPT-5.2 (xhigh) at 24.3 on VitaBench, measured', vals.some((v) => Math.abs(v[1] - 24.3) < 0.051 && v[2] === 0), { idx, vals });
const judgedOf = (needle) => rowsM.filter((r) => JSON.stringify(r).includes(needle)).map((r) => r.judged === true);
check('API: the VitaBench matrix row carries the judged tag', judgedOf('vitabench::').length > 0 && judgedOf('vitabench::').every(Boolean), judgedOf('vitabench::'));
const { matrix: m2 } = await get(`/api/benchmark-matrix?models=${encodeURIComponent('gpt-5.6-sol::max,claude-fable-5.1::max')}`);
const tagged = (needle) => (m2?.rows ?? []).filter((r) => JSON.stringify(r).includes(needle)).map((r) => r.judged === true);
check('API: Surge GDP.pdf is judged, Chartography is not', tagged('surge-gdp-pdf::').length > 0 && tagged('surge-gdp-pdf::').every(Boolean) && tagged('surge-chartography::').length > 0 && !tagged('surge-chartography::').some(Boolean), { gdp: tagged('surge-gdp-pdf::'), chart: tagged('surge-chartography::') });

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
      await p.goto(`${BASE}/benchmarks?benchmark=${encodeURIComponent('vitabench::2026-01-22')}&v=${Date.now()}`, { waitUntil: 'domcontentloaded' });
      await settle(p);
      const appliedTheme = await p.evaluate(() => document.documentElement.dataset.theme || getComputedStyle(document.documentElement).colorScheme);
      check(`${tag}: page theme is ${theme}`, String(appliedTheme).includes(theme), appliedTheme);
      const text = await p.locator('main').innerText().catch(() => '');
      check(`${tag}: ranking page names VitaBench`, text.includes('VitaBench'), text.slice(0, 200));
      check(`${tag}: VitaBench default view has the joined leader GPT-5.2 (xhigh) at 24.3 on top`, /1\s+GPT-5\.2[\s\S]{0,200}24\.3/.test(text), (text.match(/[^\n]*GPT-5\.2[^\n]*/) ?? [''])[0]);
      await p.screenshot({ path: `${OUT}/${tag}-VitaBench.png` }).catch(() => {});
      const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(`${tag}: VitaBench ranking page has no horizontal overflow`, overflow <= 1, String(overflow));
      await p.goto(`${BASE}/models/${encodeURIComponent('glm-4.7::non-reasoning')}?v=${Date.now()}`, { waitUntil: 'domcontentloaded' });
      await settle(p);
      await p.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
      await p.waitForTimeout(600);
      const model = await p.locator('main').innerText().catch(() => '');
      check(`${tag}: GLM-4.7 (non-reasoning) page lists VitaBench at 15.5`, /VitaBench[\s\S]{0,200}15\.5/.test(model), (model.match(/[^\n]*VitaBench[^\n]*\n?[^\n]*/g) ?? []).slice(0, 3));
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
