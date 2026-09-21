// CR-115 (iteration 158, claude-opus, non-implementer): JevBench v1.2.16 reranker class is live — five open rerankers
// ranked with measured GPU cost, zerank-2 68.9 / #12, earlier rows preserved; /jev-models renders at 1440/390 in light
// and dark without page errors or horizontal overflow. usage: node verify-cr-115.mjs <base-url> <out-dir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-115';
await fs.mkdir(OUT, { recursive: true });
const REV = (await (await fetch(`${BASE}/api/meta`)).json()).revision;
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: !!ok, detail });
const api = await (await fetch(`${BASE}/api/jevbench/v1.2?v=${Date.now()}`, { cache: 'no-store' })).json();
check('API revision v1.2.16', api.revision === 'v1.2.16', api.revision);
const RERANKERS = { 'zerank-2': [12, '68.9'], 'qwen3-reranker-4b': [20, '66.6'], 'mxbai-rerank-base-v2': [26, '64.5'], 'gte-reranker-modernbert-base': [28, '63.8'], 'bge-reranker-v2-m3': [32, '63.6'] };
for (const [key, [rank, score]] of Object.entries(RERANKERS)) {
  const r = api.systems.find((s) => s.key === key);
  check(`${key}: ranked #${rank} at ${score}, class reranker`, r && r.listing === 'ranked' && r.rank === rank && r.jevbench_score.toFixed(1) === score && r.class === 'reranker', r && { rank: r.rank, score: r.jevbench_score, cls: r.class });
  check(`${key}: measured non-zero GPU cost, open licence, complete row`, r && r.cost?.kind === 'measured' && r.cost.usd_per_1000 > 0 && r.endpoint_kind === 'gpu' && /Apache|MIT/.test(r.licence ?? '') && r.partial === false, r && { cost: r.cost?.kind, usd: r.cost?.usd_per_1000, licence: r.licence, partial: r.partial });
}
check('exactly five rows in the reranker class', api.systems.filter((s) => s.class === 'reranker').length === 5);
for (const [key, score, rank] of [['jev-1.13.0', '75.4', 1], ['winnow-12b', '72.5', 5], ['smalljev', '62.4', 36], ['gliner2', '53.0', null]]) {
  const r = api.systems.find((s) => s.key === key);
  check(`preserved row ${key} = ${score}`, r && r.jevbench_score.toFixed(1) === score && (rank === null || r.rank === rank), r && { score: r.jevbench_score, rank: r.rank });
}
const browser = await chromium.launch();
try {
  for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
    const tag = `${kind}_${theme}`, mobile = kind === 'mobile';
    const c = await browser.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme });
    await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
    const p = await c.newPage(); const errors = [];
    p.on('pageerror', (e) => errors.push(String(e)));
    try {
      await p.goto(`${BASE}/jev-models?v=${Date.now()}`, { waitUntil: 'domcontentloaded' });
      await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(1500);
      const text = await p.locator('main').innerText().catch(() => '');
      check(`${tag}: /jev-models shows zerank-2 with 68.9`, /zerank-2[\s\S]{0,300}68\.9/.test(text), (text.match(/[^\n]*zerank-2[^\n]*\n?[^\n]*/) ?? [''])[0]);
      check(`${tag}: the page names the reranker rows`, /Qwen3-Reranker-4B/i.test(text) && /bge-reranker-v2-m3/i.test(text));
      const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(`${tag}: no horizontal overflow`, overflow <= 1, String(overflow));
      check(`${tag}: no page errors`, errors.length === 0, errors.slice(0, 3));
      await p.screenshot({ path: `${OUT}/${tag}.png` }).catch(() => {});
    } finally { await c.close(); }
  }
} finally { await browser.close(); }
const passed = checks.filter((x) => x.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, revision: REV, runner: process.env.BH_RUNNER || 'unspecified', at: new Date().toISOString(), passed, total: checks.length, checks }, null, 2));
for (const x of checks) if (!x.ok) console.log(`FAIL ${x.name} — ${JSON.stringify(x.detail).slice(0, 300)}`);
console.log(`${BASE} @ ${REV}: ${passed}/${checks.length}`);
process.exit(passed === checks.length ? 0 : 1);
