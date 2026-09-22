// Iteration 169 live check (claude-opus): MCPMark Verified (CR-37.1) is served by the API with provenance (board value x100,
// basis derived from a measured source), joins only the seven reviewed exact configurations (an effort suffix, or a
// single-default family), keeps kimi-k2-6 unjoined, and renders on the ranking page and on a joined model's page at desktop and
// phone width in both themes. Usage: node verify-iter169.mjs <base-url> <out-dir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');

const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-iter169';
await fs.mkdir(OUT, { recursive: true });
const REV = (await (await fetch(`${BASE}/api/meta`)).json()).revision;
const BID = 'mcpmark::verified';
const B = { name: 'MCPMark Verified', category: 'Tool-use', url: 'https://mcpmark.ai/leaderboard/verified', sha: '0257d023a52ce88f5bf17acd97c9ee68153f10b44977de5faaa7d2136879b746', rows: 8, joins: 7,
  joined: { 'kimi-k3-max': ['kimi-k3::max', 96.06], 'gpt-5-5-xhigh': ['gpt-5.5::xhigh', 92.91], 'gpt-5-6-sol-max': ['gpt-5.6-sol::max', 92.91], 'claude-fable-5-max': ['claude-fable-5::max', 86.61],
    'kimi-k2-7-code': ['kimi-k2.7-code::default', 81.89], 'claude-opus-4-8-max': ['claude-opus-4.8::max', 76.38], 'deepseek-v4-pro-max': ['deepseek-v4-pro::max', 71.65] },
  open: { 'kimi-k2-6': 72.83 } };
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: !!ok, detail });
const settle = (p) => p.waitForLoadState('networkidle').catch(() => {}).then(() => p.waitForTimeout(1500));
const get = async (path) => (await fetch(`${BASE}${path}${path.includes('?') ? '&' : '?'}v=${Date.now()}`)).json();
const near = (a, b) => typeof a === 'number' && Math.abs(a - b) < 0.0051;

// --- API ---
const registry = await get('/api/benchmarks');
const list = registry.benchmarks ?? registry.entries ?? registry;
{
  const page = await get(`/api/benchmark-scores?benchmark_id=${encodeURIComponent(BID)}&limit=100`);
  const rows = page.observations ?? page.scores ?? page.data ?? [];
  const joined = rows.filter((o) => o.subject?.model_id);
  check(`API ${B.name}: ${B.rows} rows, ${B.joins} exact joins, percent, derived from measured`, rows.length === B.rows && joined.length === B.joins && rows.every((o) => o.unit === 'percent' && o.basis === 'derived' && o.source_basis === 'measured'), { rows: rows.length, joins: joined.length, basis: rows[0]?.basis, source_basis: rows[0]?.source_basis });
  check(`API ${B.name}: provenance names the source page and the capture hash`, rows.length && rows.every((o) => o.source?.url === B.url && o.source?.sha256 === B.sha), rows[0]?.source?.url);
  const at = (src) => rows.find((o) => o.subject?.source_id === src);
  const bad = Object.entries(B.joined).filter(([src, [m, v]]) => at(src)?.subject?.model_id !== m || !near(at(src)?.value, v)).map(([s]) => s);
  check(`API ${B.name}: every join carries the board value and the exact reviewed configuration`, bad.length === 0, bad);
  const badOpen = Object.entries(B.open).filter(([src, v]) => !at(src) || at(src).subject.model_id !== null || !near(at(src).value, v)).map(([s]) => s);
  check(`API ${B.name}: kimi-k2-6 (no setting, two configurations) stays unjoined, value kept`, badOpen.length === 0, badOpen);
  check(`API ${B.name}: the kimi-k2-7-code row keeps the page's second-run note`, /second recorded run/.test(at('kimi-k2-7-code')?.protocol ?? ''), (at('kimi-k2-7-code')?.protocol ?? '').slice(-200));
  const entry = list.find?.((e) => e.id === BID);
  check(`API ${B.name}: registry lists an active ${B.category} leaderboard`, entry?.category === B.category && entry?.status === 'active', entry && { category: entry.category, status: entry.status });
}
const { matrix } = await get(`/api/benchmark-matrix?models=${encodeURIComponent('kimi-k3::max,gpt-5.6-sol::max')}`);
const rowsM = matrix?.rows ?? [];
const idx = rowsM.map((r, i) => [r, i]).filter(([r]) => JSON.stringify(r).includes('mcpmark::')).map(([, i]) => i);
const vals = (matrix?.values?.['kimi-k3::max'] ?? []).filter((v) => idx.includes(v[0]));
check('API: Benchmarks-tab matrix has Kimi K3 (max) at 96.06 on MCPMark Verified', vals.some((v) => Math.abs(v[1] - 96.06) < 0.051), { idx, vals });
check('API: the MCPMark matrix row is not judged', idx.length > 0 && idx.every((i) => rowsM[i].judged !== true), idx.map((i) => rowsM[i].judged));

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
      check(`${tag}: ranking page names MCPMark Verified`, text.includes('MCPMark'), text.slice(0, 200));
      check(`${tag}: version line reads "Version verified", not "Version erified"`, text.includes('Version verified') && !text.includes('Version erified'), (text.match(/Version \w+/) ?? [''])[0]);
      check(`${tag}: MCPMark default view has the joined leader Kimi K3 (max) at 96.1 on top`, /1\s+Kimi K3[\s\S]{0,200}96\.(1|06)/.test(text), (text.match(/[^\n]*Kimi K3[^\n]*/) ?? [''])[0]);
      await p.screenshot({ path: `${OUT}/${tag}-MCPMark.png` }).catch(() => {});
      const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(`${tag}: MCPMark ranking page has no horizontal overflow`, overflow <= 1, String(overflow));
      await p.goto(`${BASE}/models/${encodeURIComponent('claude-fable-5::max')}?v=${Date.now()}`, { waitUntil: 'domcontentloaded' });
      await settle(p);
      await p.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
      await p.waitForTimeout(600);
      const model = await p.locator('main').innerText().catch(() => '');
      check(`${tag}: Claude Fable 5 (max) page lists MCPMark Verified at 86.6`, /MCPMark Verified[\s\S]{0,200}86\.6/.test(model), (model.match(/[^\n]*MCPMark[^\n]*\n?[^\n]*/g) ?? []).slice(0, 3));
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
