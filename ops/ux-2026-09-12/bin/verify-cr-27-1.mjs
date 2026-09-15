// CR-27.1: TrustedTokens (TNG, DE-sovereign) is live as provider #92 — source date, exact
// converted prices, B2B/lifecycle honesty, model and /eu pages. API checks plus UI at 1440/390,
// light/dark. Usage: node verify-cr-27-1.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-27-1';
await fs.mkdir(OUT, { recursive: true });
const goto = async (page, url) => { for (let a = 1; ; a++) { try { return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }); } catch (e) { if (a >= 3 || !/ERR_NETWORK_CHANGED|ERR_CONNECTION|ERR_TIMED_OUT|Timeout|ERR_INTERNET/.test(String(e))) throw e; await new Promise((r) => setTimeout(r, 3000 * a)); } } };
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const settle = async (page) => { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(2000); };
const getOffer = async (id) => {
  const j = await (await fetch(`${BASE}/api/models/${id}`)).json();
  return (j?.model?.offers || []).filter((o) => o.provider === 'TrustedTokens');
};

// --- API ---
const meta = await (await fetch(`${BASE}/api/meta`)).json();
check('CR-27.1 /api/meta dates sources.trustedtokens today', typeof meta?.sources?.trustedtokens === 'string' && meta.sources.trustedtokens.startsWith('2026-09-15'), { trustedtokens: meta?.sources?.trustedtokens });

const g = (await getOffer('glm-5.3%3A%3Amax'))[0];
check('CR-27.1 GLM 5.3 has a TrustedTokens offer with exact ECB-converted prices', g && g.input_per_1m === 1.73 && g.output_per_1m === 5.19 && g.cache_read_per_1m === 0.35 && g.currency === 'EUR', g && { input: g.input_per_1m, output: g.output_per_1m, cache: g.cache_read_per_1m, currency: g.currency });
check('CR-27.1 GLM 5.3 TrustedTokens offer is EU-hosted with the audited note (TNG Germany, B2B credit)', g && g.eu_hosted === true && /TNG-operated GPU inference in Germany/.test(g.notes || '') && /monthly credit/.test(g.notes || ''), g && { eu_hosted: g.eu_hosted, notes: (g.notes || '').slice(0, 130) });

const c = await getOffer('deepseek-tng-r1t2-chimera%3A%3Adefault');
check('CR-27.1 new family DeepSeek TNG R1T2 Chimera exists via TrustedTokens with exact prices', c.length >= 1 && c[0].input_per_1m === 1.15 && c[0].output_per_1m === 3.46 && c[0].eu_hosted === true, c[0] && { input: c[0].input_per_1m, output: c[0].output_per_1m, eu: c[0].eu_hosted });

const f = (await getOffer('deepseek-v4.1-flash%3A%3Amax'))[0];
check('CR-27.1 DeepSeek V4.1 Flash joined its family with exact TrustedTokens prices', f && f.input_per_1m === 0.17 && f.output_per_1m === 0.35 && f.cache_read_per_1m === 0.03, f && { input: f.input_per_1m, output: f.output_per_1m, cache: f.cache_read_per_1m });

const g52 = (await getOffer('glm-5.2%3A%3Amax'))[0];
check('CR-27.1 deprecated GLM 5.2 stays in the dataset with its lifecycle catalog_status', g52 && g52.catalog_status === 'deprecated', g52 && { catalog_status: g52.catalog_status ?? 'api-field-absent' });

// --- UI ---
const browser = await chromium.launch();
for (const theme of ['light', 'dark']) for (const [kind, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const tag = `${kind}_${theme}`;
  const context = await browser.newContext({ viewport, isMobile: kind === 'mobile', hasTouch: kind === 'mobile', colorScheme: theme });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  await goto(page, `${BASE}/models/glm-5.3%3A%3Amax`);
  await page.evaluate((t) => { try { localStorage.setItem('bh-theme', t); } catch {} }, theme);
  await settle(page);
  const offersSummary = page.locator('details summary', { hasText: 'Token offers by platform' }).first();
  await offersSummary.click().catch(() => {});
  await page.waitForTimeout(700);
  const text = await page.evaluate(() => document.body.innerText);
  check(`${tag} CR-27.1 GLM 5.3 model page lists the TrustedTokens route (offers disclosure opened)`, text.includes('TrustedTokens'), text.includes('TrustedTokens') ? 'found' : 'missing');
  await goto(page, `${BASE}/eu`);
  await settle(page);
  const euText = await page.evaluate(() => document.body.innerText);
  check(`${tag} CR-27.1 /eu sovereign catalog table lists TrustedTokens (TNG, DE)`, euText.includes('TrustedTokens') && /TNG Technology Consulting/.test(euText), euText.includes('TrustedTokens') ? 'found' : 'missing');
  await page.screenshot({ path: `${OUT}/${tag}-eu.png` }).catch(() => {});
  check(`${tag} no page errors`, !errors.length, errors);
  await context.close();
}
await browser.close();
const passed = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, runner: process.env.BH_RUNNER || 'unspecified', at: new Date().toISOString(), passed, total: checks.length, checks }, null, 2));
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name} — ${c.detail.slice(0, 240)}`);
console.log(`${passed}/${checks.length}`);
process.exit(passed === checks.length ? 0 : 1);
