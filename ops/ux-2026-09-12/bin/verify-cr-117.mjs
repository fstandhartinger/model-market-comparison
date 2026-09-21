// CR-117 (iteration 159, claude-opus, non-implementer): MiMo-V2.6-Pro is live as specified. Expected values were read
// independently from Xiaomi's Hugging Face model card (XiaomiMiMo/MiMo-V2.6-Pro-RL: MIT, 1.02T/42B MoE, 1M context, the
// 17-row benchmark table) and OpenRouter's public /api/v1/models (exact prices), not from the implementer's data.
// MiMo Cyber Bench is the one row where the launch table (81.7, published) and the card (80.2) differ; the page must say so.
// usage: node verify-cr-117.mjs <base-url> <out-dir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-117';
await fs.mkdir(OUT, { recursive: true });
const REV = (await (await fetch(`${BASE}/api/meta`)).json()).revision;
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: !!ok, detail });
const get = async (path) => (await fetch(`${BASE}${path}${path.includes('?') ? '&' : '?'}v=${Date.now()}`, { cache: 'no-store' })).json();
const ID = 'mimo-v2.6-pro::default';
const api = await get(`/api/models/${encodeURIComponent(ID)}`);
const m = api.model;
check('identity: Xiaomi, open weights, MIT, official HF checkpoint, 1M context, released 2026-09-21', m.org === 'Xiaomi' && m.open_weights === true && m.aa_metadata?.license_name === 'MIT' && m.aa_metadata?.huggingface_url === 'https://huggingface.co/XiaomiMiMo/MiMo-V2.6-Pro-RL' && m.aa_metadata?.context_window_tokens === 1000000 && m.release_date === '2026-09-21', { org: m.org, lic: m.aa_metadata?.license_name, rel: m.release_date });
check('AA Intelligence Index 46.3 (existing pipeline)', m.benchmarks?.aa_intelligence_index === 46.3, m.benchmarks?.aa_intelligence_index);
check('exactly one offer: xiaomi/mimo-v2.6-pro at $0.435 / $0.87 per 1M (OpenRouter list price)', m.offers.length === 1 && m.offers[0].or_model_id === 'xiaomi/mimo-v2.6-pro' && m.offers[0].input_per_1m === 0.435 && m.offers[0].output_per_1m === 0.87, m.offers.map((o) => [o.or_model_id, o.input_per_1m, o.output_per_1m]));
for (const [id, orId, inP, outP] of [['mimo-v2.6-pro-ultraspeed::default', 'xiaomi/mimo-v2.6-pro-ultraspeed', 4.35, 8.7], ['mimo-v2.6-flash::default', 'xiaomi/mimo-v2.6-flash', 0.14, 0.28]]) {
  const x = (await get(`/api/models/${encodeURIComponent(id)}`)).model;
  check(`${orId} kept as its own model at $${inP} / $${outP}, no AA join`, x && x.offers.length === 1 && x.offers[0].or_model_id === orId && x.offers[0].input_per_1m === inP && x.offers[0].output_per_1m === outP && !x.aa_model_id, x && x.offers.map((o) => [o.or_model_id, o.input_per_1m]));
}
const CARD = { 'deepswe-v1-1': 71.9, programbench: 26.5, 'mimo-code-bench': 63.2, 'automationbench-v1-0-6': 53.1, 'toolathlon-verified': 76.9, 'gdpval-aa-2-1': 1673, 'agents-last-exam': 31.6, 'terminal-bench-4-0': 34.9, 'terminal-bench-2-1': 89.9, 'osworld-verified': 82, jobbench: 62, cybergym: 94, 'mimo-cyber-bench': 81.7, exploitgym: 17.8, exploitbench: 47.9, 'sec-bench-pro': 66.3, 'mimo-visual-coding': 72.3 };
const obs = api.benchmark_observations.filter((o) => o.id.startsWith('self-reported:mimo-v26-'));
const wrong = Object.entries(CARD).filter(([k, v]) => { const o = obs.find((x) => x.benchmark_id.startsWith(`xiaomi-${k}::`)); return !o || o.value !== v || o.basis !== 'self_reported'; });
check('all 17 Xiaomi claims match the model card (Cyber Bench: launch table), basis self_reported', obs.length === 17 && wrong.length === 0, { n: obs.length, wrong });
check('no independent LMArena/SWE-bench/Epoch rows inferred (coverage: 0 measured)', api.benchmark_coverage.measured === 0 && api.benchmark_coverage.self_reported === 17, api.benchmark_coverage);
const bx = await get(`/api/benchmaxxing?report=${encodeURIComponent(ID)}`);
check('Benchmaxxing: no verdict (insufficient coverage, score null)', bx.report?.status === 'insufficient-coverage' && bx.report?.score === null, bx.report?.status);
const browser = await chromium.launch();
try {
  for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1200 }], ['mobile', { width: 390, height: 844 }]]) {
    const tag = `${kind}_${theme}`, mobile = kind === 'mobile';
    const c = await browser.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme });
    await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
    const p = await c.newPage(); const errors = [];
    p.on('pageerror', (e) => errors.push(String(e)));
    try {
      await p.goto(`${BASE}/models/${encodeURIComponent(ID)}?v=${Date.now()}`, { waitUntil: 'domcontentloaded' });
      await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(1500);
      await p.screenshot({ path: `${OUT}/${tag}-top.png` }).catch(() => {});
      const text = await p.locator('main').innerText().catch(() => '');
      check(`${tag}: page names MiMo-V2.6-Pro with AA Intelligence 46.3`, /MiMo-V2\.6-Pro/.test(text) && /46\.3/.test(text));
      check(`${tag}: 17 developer claims, each marked self-reported`, (text.match(/developer's claim/g) ?? []).length === 17 && (text.match(/self-reported by the developer/g) ?? []).length === 17, (text.match(/developer's claim/g) ?? []).length);
      // Like every row's source description, the conflict sits in the row's <details>; one tap on the row opens it.
      const row = p.locator('details', { has: p.locator('summary', { hasText: 'MiMo Cyber Bench' }) }).first();
      await row.locator('summary').click();
      const cyber = row.getByText(/print 80\.2/).first();
      check(`${tag}: opening the MiMo Cyber Bench row shows 81.7 with the card's 80.2`, await cyber.isVisible().catch(() => false) && /81\.7[\s\S]*80\.2/.test(await row.innerText()), (await row.innerText().catch(() => '')).slice(0, 300));
      await row.scrollIntoViewIfNeeded(); await p.screenshot({ path: `${OUT}/${tag}-cyber.png` }).catch(() => {});
      const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(`${tag}: no horizontal overflow`, overflow <= 1, String(overflow));
      check(`${tag}: no page errors`, errors.length === 0, errors.slice(0, 3));
    } finally { await c.close(); }
  }
} finally { await browser.close(); }
const passed = checks.filter((x) => x.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, revision: REV, runner: process.env.BH_RUNNER || 'unspecified', at: new Date().toISOString(), passed, total: checks.length, checks }, null, 2));
for (const x of checks) if (!x.ok) console.log(`FAIL ${x.name} — ${JSON.stringify(x.detail).slice(0, 300)}`);
console.log(`${BASE} @ ${REV}: ${passed}/${checks.length}`);
process.exit(passed === checks.length ? 0 : 1);
