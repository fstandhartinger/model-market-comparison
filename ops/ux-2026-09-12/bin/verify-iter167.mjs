// Iteration 167 live check (claude-opus): Surge AI's Chartography and GDP.pdf boards and Interfaze's SOB (CR-37.1) are served by the API with
// provenance, join only the reviewed exact configurations (Claude's plain "High reasoning" rows never join), stay separate
// from the AA/StepFun/DeepSeek snapshots, and render on the ranking page and on a joined model's page at desktop and phone
// width in both themes. Usage: node verify-iter167.mjs <base-url> <out-dir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');

const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-iter167';
await fs.mkdir(OUT, { recursive: true });
const REV = (await (await fetch(`${BASE}/api/meta`)).json()).revision;
const BOARDS = {
  'surge-chartography::100-tasks': { name: 'Chartography', url: 'https://surgehq.ai/benchmarks/chartography', sha: '9b815c23bd1d27e66be3b41a7d3b18d69f1505b96d8d21bfc6035c5e9376002e', rows: 58, joins: 36,
    joined: { 'Claude Fable 5.1 (Adaptive/Max)': ['claude-fable-5.1::max', 46.2], 'GPT 5.6 Sol (Max reasoning)': ['gpt-5.6-sol::max', 45], 'Gemini 3.8 Flash (Medium reasoning)': ['gemini-3.8-flash::medium', 42.5],
      'Claude Opus 5 (Adaptive/High)': ['claude-opus-5::high', 25.7], 'GPT 5.4 (No reasoning)': ['gpt-5.4::non-reasoning', 14.1], 'Kimi K3 (Max reasoning)': ['kimi-k3::max', 26.6], 'Mistral Large 3': ['mistral-large-3::default', 9] },
    open: { 'Claude Opus 4.8 (High reasoning)': 11.3, 'Claude Opus 4.7 (High reasoning)': 13.6, 'Muse Spark 1.2 (Auto reasoning)': 31.5, 'Qwen 3.8 Max (xHigh reasoning)': 29.1, 'DeepSeek V4 Flash Vision (experimental) (Max reasoning)': 11.2 } },
  'surge-gdp-pdf::100-tasks': { name: 'GDP.pdf', url: 'https://surgehq.ai/benchmarks/gdp-pdf', sha: 'd44bb04fd9aa6e63f5c838020028d9100164cf3acebe5327feb9b711c5cda972', rows: 41, joins: 26,
    joined: { 'GPT 5.6 Sol (Max reasoning)': ['gpt-5.6-sol::max', 30.7], 'Claude Fable 5 (Adaptive/Max)': ['claude-fable-5::max', 29.8], 'Claude Sonnet 4.6 (Adaptive/Max)': ['claude-sonnet-4.6::max', 18], 'Grok 4.3 (High reasoning)': ['grok-4.3::high', 8] },
    open: { 'Kimi K2.6 (Thinking on)': 12, 'Nova 2 Pro (No reasoning)': 2, 'Nemotron 3 Nano Omni': 2 } },
  'interfaze-sob::text-image-audio': { name: 'SOB', category: 'Instruction-following', url: 'https://interfaze.ai/leaderboards/structured-output-benchmark', sha: '9055391cd8f9f4b23006ade07715da60c8ec9107dd97112606cef19843d7b6d1', rows: 29, joins: 5,
    joined: { 'GPT-5.4': ['gpt-5.4::non-reasoning', 87], 'GPT-5.5': ['gpt-5.5::non-reasoning', 86], 'DeepSeek-V4-Pro': ['deepseek-v4-pro::non-reasoning', 85.3] },
    open: { 'GPT-5': 84.9, 'Gemini-3.1-Pro': 86.9, 'Claude-Sonnet-5': 86.2, 'Qwen3.5-35B': 86.1 } },
  'interfaze-sob-value-accuracy::text-image-audio': { name: 'SOB Value Accuracy', category: 'Instruction-following', url: 'https://interfaze.ai/leaderboards/structured-output-benchmark', sha: '9055391cd8f9f4b23006ade07715da60c8ec9107dd97112606cef19843d7b6d1', rows: 29, joins: 5,
    joined: { 'GPT-5.4': ['gpt-5.4::non-reasoning', 79.8], 'GLM-5.1': ['glm-5.1::non-reasoning', 80.6] },
    open: { 'Gemini-3.1-Pro': 82 } },
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
check('API: AA, StepFun and DeepSeek snapshots stay separate families', ['aa-gdp-pdf::snapshot-2026-09-21', 'stepfun-gdp-pdf::snapshot-2026-09-20', 'deepseek-chartography-w-tools::snapshot-2026-09-10']
  .every((id) => { const e = list.find?.((x) => x.id === id); return e && !e.family.startsWith('surge-'); }));
const { matrix } = await get(`/api/benchmark-matrix?models=${encodeURIComponent('claude-opus-5::max,gpt-5.6-sol::max')}`);
const idx = (matrix?.rows ?? []).map((r, i) => [r, i]).filter(([r]) => JSON.stringify(r).includes('surge-chartography::')).map(([, i]) => i);
const vals = (matrix?.values?.['gpt-5.6-sol::max'] ?? []).filter((v) => idx.includes(v[0]));
check('API: Benchmarks-tab matrix has GPT-5.6 Sol (max) at 45 on Chartography, measured', vals.some((v) => Math.abs(v[1] - 45) < 0.051 && v[2] === 0), { idx, vals });

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
      for (const [bid, b, top, topVal] of [['surge-chartography::100-tasks', BOARDS['surge-chartography::100-tasks'], 'Claude Fable 5\\.1', '46\\.2'], ['surge-gdp-pdf::100-tasks', BOARDS['surge-gdp-pdf::100-tasks'], 'GPT-5\\.6 Sol', '30\\.7'], ['interfaze-sob-value-accuracy::text-image-audio', BOARDS['interfaze-sob-value-accuracy::text-image-audio'], 'GLM-5\\.1', '80\\.6']]) {
        await p.goto(`${BASE}/benchmarks?benchmark=${encodeURIComponent(bid)}&v=${Date.now()}`, { waitUntil: 'domcontentloaded' });
        await settle(p);
        if (bid.startsWith('surge-chartography')) {
          const appliedTheme = await p.evaluate(() => document.documentElement.dataset.theme || getComputedStyle(document.documentElement).colorScheme);
          check(`${tag}: page theme is ${theme}`, String(appliedTheme).includes(theme), appliedTheme);
        }
        const text = await p.locator('main').innerText().catch(() => '');
        check(`${tag}: ranking page names ${b.name}`, text.includes(b.name), text.slice(0, 200));
        check(`${tag}: ${b.name} default view has the board leader on top`, new RegExp(`1\\s+${top}[\\s\\S]{0,200}${topVal}`).test(text), (text.match(new RegExp(`[^\\n]*${top}[^\\n]*`)) ?? [''])[0]);
        await p.screenshot({ path: `${OUT}/${tag}-${b.name.replace(/\W/g, '')}.png` }).catch(() => {});
        const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        check(`${tag}: ${b.name} ranking page has no horizontal overflow`, overflow <= 1, String(overflow));
      }
      await p.goto(`${BASE}/models/${encodeURIComponent('gpt-5.6-sol::max')}?v=${Date.now()}`, { waitUntil: 'domcontentloaded' });
      await settle(p);
      await p.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
      await p.waitForTimeout(600);
      const model = await p.locator('main').innerText().catch(() => '');
      check(`${tag}: GPT-5.6 Sol (max) page lists Chartography at 45 and GDP.pdf at 30.7`, /Chartography[\s\S]{0,200}45(\.0)?\b/.test(model) && /GDP\.pdf[\s\S]{0,200}30\.7/.test(model), (model.match(/[^\n]*(Chartography|GDP\.pdf)[^\n]*\n?[^\n]*/g) ?? []).slice(0, 4));
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
