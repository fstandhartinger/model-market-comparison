// CR-16 (Florian 2026-09-15): subscription-cost modelling — cautious eligibility copy, API as baseline with a quiet
// "Subscription costs may differ" note, assumption-based estimate, company question no longer the opening guided page.
// Usage: node verify-cr-16.mjs <base> <outdir>   (1440×1000 and 390×844, light and dark; writes verification.json + PNGs)
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-16';
await fs.mkdir(OUT, { recursive: true });
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const browser = await chromium.launch();
async function settle(page) { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1200); }
const dollars = (text) => Number(String(text).match(/\$([\d,.]+)/)?.[1].replace(/,/g, ''));

for (const theme of ['light', 'dark']) for (const [kind, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const tag = `${kind}_${theme}`, mobile = kind === 'mobile';
  const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, colorScheme: theme });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((t) => { try { localStorage.setItem('bh-theme', t); } catch {} }, theme);
  await page.reload(); await settle(page);

  let panel = page.locator('details[aria-label="Subscriptions"]');
  let where = 'Simple';
  if (!(await panel.count())) { await page.getByRole('tab', { name: 'Advanced' }).click(); await settle(page); panel = page.locator('details[aria-label="Subscriptions"]'); where = 'Advanced'; }
  const summary = (await panel.locator('summary').innerText()).trim();
  const body = await page.locator('body').innerText();
  check(`${tag} CR-16.2 a quiet, folded "Subscription costs may differ" note; API prices stay the baseline`, /^Subscription costs may differ/.test(summary) && /API prices/.test(summary) && (await panel.getAttribute('open')) === null && !/Would a subscription be cheaper/.test(body), { where, summary });
  await panel.locator('summary').click(); await page.waitForTimeout(300);
  const text = await panel.innerText();
  check(`${tag} CR-16.1/16.2 explanation: utilisation-dependent, no fixed bundles, sharing/resale/automation/rate limits, eligibility by provider/plan/region/contract`,
    /not fixed token bundles/.test(text) && /depends on how much you use them/.test(text) && /Account sharing, resale and automation are restricted and rate limits apply/.test(text)
    && /depends on the provider, the plan, the region and the contract/.test(text) && !/rule out business use/.test(text), text.slice(0, 300));

  // CR-16.3 estimate.
  const est = panel.locator('section[aria-label="Subscription cost estimate"]');
  const options = await est.locator('select option').allInnerTexts();
  check(`${tag} CR-16.3 estimate offered only for flat-rate vendor plans with a collected price`, options.length >= 2 && options.some((o) => /Claude/.test(o)) && !options.some((o) => /Copilot|Cursor|ChatGPT|SuperGrok/.test(o)), options);
  const fee = dollars(options[0]);
  const tasks = est.locator('input[type="number"]').nth(0), extra = est.locator('input[type="number"]').nth(1);
  const result = est.locator('[data-testid="subscription-estimate"]');
  await tasks.fill('400'); await page.waitForTimeout(150);
  const r1 = await result.innerText();
  check(`${tag} CR-16.3 cost/task = monthly fee ÷ tasks, labelled as a subscription estimate`, Math.abs(dollars(r1) - fee / 400) <= fee / 400 * 0.02 && /subscription estimate/.test(r1), { fee, r1 });
  await extra.fill('20'); await page.waitForTimeout(150);
  const r2 = await result.innerText();
  check(`${tag} CR-16.3 optional extra usage charges are added before dividing`, Math.abs(dollars(r2) - (fee + 20) / 400) <= (fee + 20) / 400 * 0.02, { fee, r2 });
  await tasks.fill('0'); await page.waitForTimeout(150);
  check(`${tag} CR-16.3 no number from an unusable assumption`, /Enter at least one task/.test(await result.innerText()), await result.innerText());
  const flagged = await panel.locator('li').filter({ hasText: 'Claude Pro' }).first().innerText().catch(() => '');
  check(`${tag} CR-16.1 Claude Pro is flagged, not presented as business-safe`, /⚑ Consumer terms restrict business use/.test(flagged), flagged);
  await panel.screenshot({ path: `${OUT}/${tag}-subscriptions.png` });

  // CR-16.2 guided mode: company is not the opening question.
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }); await settle(page);
  await page.getByRole('tab', { name: 'Guided' }).click(); await page.waitForTimeout(500);
  const first = await page.locator('h2').filter({ hasText: /\?$/ }).first().innerText();
  check(`${tag} CR-16.2 guided mode opens on data/region, not on the company question`, /Does your data need to stay somewhere specific\?/.test(first), first);
  for (let i = 0; i < 3; i++) { await page.getByRole('button', { name: 'Skip — no preference' }).click(); await page.waitForTimeout(250); }
  const fourth = await page.locator('h2').filter({ hasText: /\?$/ }).first().innerText();
  const lead = await page.locator('p.bh-muted').filter({ hasText: /Optional, and only about subscriptions/ }).count();
  check(`${tag} CR-16.2 the company question is the last, optional page and says it only concerns subscriptions`, /Buying for a company\?/.test(fourth) && lead === 1, fourth);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`${tag} no horizontal page overflow, no page errors`, overflow <= 1 && !errors.length, { overflow, errors });
  if (theme === 'light' && !mobile) {
    await page.goto(`${BASE}/about#subscriptions`, { waitUntil: 'domcontentloaded' }); await settle(page);
    const about = await page.locator('#subscriptions + p').innerText();
    check('about: subscriptions copy — API baseline, not universally business-safe, estimate formula', /API prices/.test(about) && /not universally business-safe/.test(about) && /\(monthly fee \+ any\s+extra usage charges\) ÷ the tasks you complete per month/.test(about), about.slice(0, 200));
  }
  await context.close();
}
await browser.close();
const passed = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, runner: process.env.BH_RUNNER || 'unspecified', at: new Date().toISOString(), passed, total: checks.length, checks }, null, 2));
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name} — ${c.detail.slice(0, 220)}`);
console.log(`${passed}/${checks.length}`);
process.exit(passed === checks.length ? 0 : 1);
