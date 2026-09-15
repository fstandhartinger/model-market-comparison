// CR-17 (Florian 2026-09-15): EU-hosted filter — Claude via AWS Bedrock EU geo, OpenAI via Azure Europe Data Zone,
// one plain definition. Data checks against the deployed per-model API; UI checks at 1440/390, light/dark.
// Usage: node verify-cr-17.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-17';
await fs.mkdir(OUT, { recursive: true });
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });

// Data: exact offers on the deployed dataset (the filter's own flags).
const offers = async (id) => (await (await fetch(`${BASE}/api/models/${encodeURIComponent(id)}`)).json()).model?.offers ?? [];
const eu = (o) => o.eu_policy_equivalent === true || o.eu_hosted === true;
const astra = await offers('gpt-6-astra::high');
check('CR-17.2 GPT-6 Astra has no EU Azure AI Foundry route (Data Zone Standard is US-only; Europe is Global)', astra.length > 0 && !astra.some((o) => o.provider === 'Azure AI Foundry' && eu(o)), astra.filter((o) => o.provider === 'Azure AI Foundry').map((o) => `${o.region}:${o.input_per_1m}/${o.output_per_1m}:eu=${o.eu_hosted}`));
const flash = await offers('deepseek-v4-flash::high');
const flashEu = flash.filter((o) => o.provider === 'Azure AI Foundry' && eu(o));
check('CR-17.2 DeepSeek-V4 Flash gains the Azure Europe Data Zone route at $0.21/$0.56', flashEu.length === 1 && flashEu[0].region === 'eu' && flashEu[0].input_per_1m === 0.21 && flashEu[0].output_per_1m === 0.56, flashEu);
const sol = await offers('gpt-5.6-sol::high');
check('CR-17.2 GPT-5.6 Sol keeps its Azure Europe Data Zone route', sol.some((o) => o.provider === 'Azure AI Foundry' && o.region === 'eu' && o.eu_hosted === true), sol.filter((o) => o.provider === 'Azure AI Foundry').map((o) => `${o.region}:eu=${o.eu_hosted}`));
for (const id of ['claude-sonnet-5::high', 'claude-opus-5::high']) {
  const list = await offers(id);
  check(`CR-17.1 ${id} passes via AWS Bedrock's EU geo profile`, list.some((o) => o.provider === 'AWS Bedrock' && eu(o)), list.filter((o) => /Bedrock/.test(o.provider)).map((o) => `${o.region}:eu=${o.eu_hosted}`));
}
const fable = await offers('claude-fable-5.1::high');
check('CR-17.1 Claude Fable 5.1 has no EU Bedrock route (US/Global only)', fable.length > 0 && !fable.some((o) => /Bedrock/.test(o.provider) && o.source !== 'OpenRouter' && eu(o)), fable.filter((o) => /Bedrock/.test(o.provider)).map((o) => `${o.provider}:${o.region}:eu=${o.eu_hosted}`));

// UI: one plain definition beside the toggle, and in the guided hint.
const browser = await chromium.launch();
for (const theme of ['light', 'dark']) for (const [kind, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const tag = `${kind}_${theme}`, mobile = kind === 'mobile';
  const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, colorScheme: theme });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((t) => { try { localStorage.setItem('bh-theme', t); } catch {} }, theme);
  await page.reload(); await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1000);
  // The filter panel is the #global-filters dialog; open it from whichever visible toggle this view shows
  // (Simple's "open the filters" button carries data-bh-filters-toggle; headers show a "Filters" button).
  await page.evaluate(() => {
    const visible = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const buttons = [...document.querySelectorAll('[data-bh-filters-toggle]'), ...document.querySelectorAll('button')];
    buttons.find((b) => visible(b) && (b.hasAttribute('data-bh-filters-toggle') || /^\s*(✓\s*)?Filters\b/.test(b.textContent || '')))?.click();
  });
  await page.locator('#global-filters').waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
  check(`${tag} filter panel opens`, await page.locator('#global-filters').isVisible(), '');
  const trigger = page.locator('#global-filters').getByRole('button', { name: 'About the EU-hosted filter' }).first();
  let text = '';
  if (mobile) {
    await trigger.click(); await page.waitForTimeout(300);
    text = await page.locator('dialog[open]').last().innerText().catch(() => '');
  } else {
    await trigger.focus(); await page.waitForTimeout(300);
    const id = await trigger.getAttribute('aria-describedby');
    text = id ? await page.locator(`[id="${id}"]`).innerText().catch(() => '') : '';
  }
  check(`${tag} CR-17.3 the EU-hosted (i) states the definition: in-EU inference, Global / billing / control plane do not count, equivalents disclosed`,
    /inference runs inside the EU/.test(text) && /Europe Data Zone/.test(text) && /Global deployments do not count/.test(text) && /control plane/.test(text) && /EU equivalent/.test(text), text.slice(0, 260));
  await page.screenshot({ path: `${OUT}/${tag}-eu-definition.png` });
  if (!mobile) await page.keyboard.press('Escape'); else await page.keyboard.press('Escape');
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(800);
  await page.getByRole('tab', { name: 'Guided' }).click(); await page.waitForTimeout(400);
  const hint = await page.getByRole('button', { name: /EU-hosted only/ }).first().innerText().catch(() => '');
  check(`${tag} CR-17.3 guided hint says in-EU inference, no Global routes`, /Inference inside the EU/.test(hint) && /no Global routes/.test(hint), hint);
  check(`${tag} no page errors`, !errors.length, errors);
  await context.close();
}
await browser.close();
const passed = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, runner: process.env.BH_RUNNER || 'unspecified', at: new Date().toISOString(), passed, total: checks.length, checks }, null, 2));
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name} — ${c.detail.slice(0, 220)}`);
console.log(`${passed}/${checks.length}`);
process.exit(passed === checks.length ? 0 : 1);
