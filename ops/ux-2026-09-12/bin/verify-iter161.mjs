// Iteration 161 live check (claude-opus): MathArena's deprecated HMMT and Apex competitions (CR-37.1) are served by
// the API in percent with provenance, join only the reviewed exact configurations, are listed as retained, refuse the
// item-response-theory rows, and render on the ranking page and on a joined model's page.
// Usage: node verify-iter161.mjs <base-url> <out-dir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');

const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-iter161';
await fs.mkdir(OUT, { recursive: true });
const REV = (await (await fetch(`${BASE}/api/meta`)).json()).revision;
const BOARDS = {
  'matharena-hmmt::2026-02': { rows: 31, joins: 7, sha: '02223488d1ac9d11e89a51b12c3068088db9eec17b26e6409cc984eb648db66a', comp: 'hmmt--hmmt_feb_2026' },
  'matharena-hmmt::2025-11': { rows: 23, joins: 10, sha: 'aa9287d733e27dde3646179a18070c07f558fb51926a8fe90cdf38985d6fce6d', comp: 'hmmt--hmmt_nov_2025' },
  'matharena-apex::2025': { rows: 48, joins: 16, sha: '20b28370d9d7f5a15a19fc9e4226c9857cdb07bc42b32ccec508e687b7b9f3fc', comp: 'apex--apex_2025' },
  'matharena-apex-shortlist::2025': { rows: 38, joins: 13, sha: 'fa4653a72c5c252f920b7b8795cb4d7a76d3afc88ab6b1e01195a035dd347b20', comp: 'apex--shortlist_2025' },
};
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: !!ok, detail });
const settle = (p) => p.waitForLoadState('networkidle').catch(() => {}).then(() => p.waitForTimeout(1500));
const get = async (path) => (await fetch(`${BASE}${path}${path.includes('?') ? '&' : '?'}v=${Date.now()}`)).json();

// --- API ---
const registry = await get('/api/benchmarks');
const list = registry.benchmarks ?? registry.entries ?? registry;
const byBoard = {};
for (const [bid, want] of Object.entries(BOARDS)) {
  const page = await get(`/api/benchmark-scores?benchmark_id=${encodeURIComponent(bid)}&limit=100`);
  const rows = page.observations ?? page.scores ?? page.data ?? [];
  byBoard[bid] = rows;
  const joined = rows.filter((o) => o.subject?.model_id);
  check(`API ${bid}: ${want.rows} measured rows, ${want.joins} exact joins, percent`,
    rows.length === want.rows && joined.length === want.joins && rows.every((o) => o.unit === 'percent' && o.basis === 'measured'), { rows: rows.length, joins: joined.length });
  check(`API ${bid}: provenance names the competition table and the capture hash`,
    rows.every((o) => o.source?.url === `https://matharena.ai/competition_tables/${want.comp}` && o.source?.sha256 === want.sha), rows[0]?.source?.url);
  check(`API ${bid}: no item-response-theory row is served`, !rows.some((o) => /^Qwen3\.5-[24]B$/.test(o.subject?.source_id ?? '')));
  const entry = list.find?.((e) => e.id === bid);
  check(`API ${bid}: registry lists it as retained Math`, entry?.category === 'Math' && entry?.status === 'retained', entry && { category: entry.category, status: entry.status });
}
const hmmt = byBoard['matharena-hmmt::2026-02'];
const gpt55 = hmmt.find((o) => o.subject?.source_id === 'GPT-5.5 (xhigh)');
check('API: HMMT Feb 2026 GPT-5.5 (xhigh) = 98.48 → gpt-5.5::xhigh, released-after-competition flag kept',
  gpt55?.value === 98.48 && gpt55?.subject?.model_id === 'gpt-5.5::xhigh' && /"released_after_competition":true/.test(gpt55?.protocol ?? ''), gpt55 && { v: gpt55.value, m: gpt55.subject.model_id });
const gpt52 = hmmt.find((o) => o.subject?.source_id === 'GPT-5.2 (high)');
check('API: HMMT Feb 2026 GPT-5.2 (high) = 96.97 stays unjoined (the catalog has no gpt-5.2::high)', gpt52?.value === 96.97 && gpt52?.subject?.model_id === null, gpt52?.subject);
const kimi = hmmt.find((o) => o.subject?.source_id === 'Kimi K3 (Think)');
check('API: Kimi K3 (Think) stays unjoined (Think is not a reviewed setting)', kimi && kimi.subject.model_id === null);
const opusApex = byBoard['matharena-apex::2025'].find((o) => o.subject?.source_id === 'Claude-Opus-4.8 (max)');
check('API: Apex Claude-Opus-4.8 (max) = 81.25 → claude-opus-4.8::max', opusApex?.value === 81.25 && opusApex?.subject?.model_id === 'claude-opus-4.8::max', opusApex?.value);
const { matrix } = await get(`/api/benchmark-matrix?models=${encodeURIComponent('gpt-5.4::xhigh,gpt-5.5::xhigh')}`);
// One matrix row per family: HMMT's two editions share the matharena-hmmt row, which shows the newer (2026-02).
const found = ['matharena-hmmt::2026-02', 'matharena-apex::2025', 'matharena-apex-shortlist::2025'].map((bid) => {
  const i = matrix?.rows?.findIndex((r) => r.benchmarkId === bid || (r.boards ?? []).includes(bid));
  return { bid, i, row: matrix?.rows?.[i], val: (matrix?.values?.['gpt-5.4::xhigh'] ?? []).find((v) => v[0] === i) };
});
check('API: Benchmarks-tab matrix carries the three family rows in the math group, tagged retired',
  found.every((f) => f.row && /math/i.test(f.row.group) && JSON.stringify(f.row).toLowerCase().includes('retired')), found.map((f) => f.row && { bid: f.bid, group: f.row.group, tags: f.row.tags }));
const f0 = found[0];
check('API: matrix has GPT-5.4 (xhigh) at 97.73 on HMMT Feb 2026, measured', f0.val && Math.abs(f0.val[1] - 97.73) < 0.051 && f0.val[2] === 0, f0.val);

// --- UI ---
const BID = 'matharena-hmmt::2026-02';
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
      check(`${tag}: ranking page names the board`, /HMMT February 2026/.test(first), first.slice(0, 200));
      check(`${tag}: default view lists the 7 joined models, GPT-5.5 on top at 98.48`, /\b7 results\b/.test(first) && /1\s+GPT-5\.5 \(xhigh\)[\s\S]{0,60}98\.48 percent/.test(first), (first.match(/\d+ results/) ?? [''])[0]);
      await p.getByLabel('Include results not matched to a catalog model').check();
      await p.waitForTimeout(800);
      const text = await p.locator('main').innerText().catch(() => '');
      check(`${tag}: with unmatched results included, 31 rows, GPT-5.2 (high) at 96.97 as named by the source`, /\b31 results\b/.test(text) && /GPT-5\.2 \(high\)[\s\S]{0,120}96\.97 percent/.test(text), (text.match(/\d+ results/) ?? [''])[0]);
      await p.screenshot({ path: `${OUT}/${tag}-ranking.png` }).catch(() => {});
      const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(`${tag}: ranking page has no horizontal overflow`, overflow <= 1, String(overflow));
      await p.goto(`${BASE}/models/${encodeURIComponent('gpt-5.4::xhigh')}?v=${Date.now()}`, { waitUntil: 'domcontentloaded' });
      await settle(p);
      await p.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
      await p.waitForTimeout(600);
      const model = await p.locator('main').innerText().catch(() => '');
      check(`${tag}: GPT-5.4 (xhigh) page lists its HMMT and Apex results`, /HMMT February 2026/.test(model) && /Apex 2025/.test(model) && /Apex Shortlist 2025/.test(model), (model.match(/[^\n]*HMMT[^\n]*\n?[^\n]*/) ?? [''])[0]);
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
