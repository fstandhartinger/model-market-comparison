// Iteration 172 live check (claude-opus): the provider "Unbiased" is published with curated metadata instead of the
// "not yet verified" placeholder the 2026-09-22 daily receipt named, its US headquarters keeps it out of the EU and
// non-US filters on the strength of a checked fact rather than of an absence, the note discloses that Pareto is a
// composite, and the model is attributed to the lab that publishes it instead of reading "Other".
// Usage: node verify-iter172.mjs <base-url> <out-dir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');

const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-iter172';
await fs.mkdir(OUT, { recursive: true });
const REV = (await (await fetch(`${BASE}/api/meta`)).json()).revision;
const MODEL = 'pareto::default';
// D172.2: every row that used to read "Other" as its lab, with the lab its own maker states.
const LABS = { 'pareto::default': 'Unbiased', 'swe-1.7-lightning-max::default': 'Cognition AI', 'muse-spark-1.3-max::default': 'Meta' };
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: !!ok, detail });
const settle = (p) => p.waitForLoadState('networkidle').catch(() => {}).then(() => p.waitForTimeout(1200));
const get = async (path) => (await fetch(`${BASE}${path}${path.includes('?') ? '&' : '?'}v=${Date.now()}`)).json();

// --- API ---
const { providers } = await get('/api/providers');
const row = (providers ?? []).find((p) => p.provider === 'Unbiased');
check('API: Unbiased is published as a provider row', !!row, row && { platform: row.platform, model_count: row.model_count });
check('API: the row is no longer marked metadata_unverified', !!row && !row.metadata_unverified, row?.metadata_unverified ?? null);
check('API: HQ is the United States, read from the vendor\'s own terms', row?.country === 'US' && row?.website === 'https://unbiased.ai', { country: row?.country, website: row?.website });
check('API: a US provider with no published EU region stays out of the EU and non-US filters',
  !!row && row.eu_hosted === false && row.non_us === false && row.eu_dedicated === false, row && [row.eu_hosted, row.non_us, row.eu_dedicated]);
check('API: the note quotes the headquarters sentence and dates the check',
  /headquartered in the United States/.test(row?.note ?? '') && /checked 2026-09-22/.test(row?.note ?? ''), (row?.note ?? '').slice(0, 120));
check('API: the note discloses that Pareto is a composite, not one model', /composite/.test(row?.note ?? ''), (row?.note ?? '').match(/[^.]*composite[^.]*/)?.[0]);
check('API: no published provider is left with unverified metadata today',
  (providers ?? []).filter((p) => p.metadata_unverified && !p.coming_soon).length === 0,
  (providers ?? []).filter((p) => p.metadata_unverified).map((p) => p.provider));

const models = await get('/api/models');
const list = models.models ?? models.data ?? models;
const pareto = (Array.isArray(list) ? list : []).find((m) => m.id === MODEL);
check('API: Pareto is attributed to Unbiased, not "Other"', pareto?.org === 'Unbiased', pareto && { id: pareto.id, org: pareto.org });
// D172.2: the two board-only rows that named no lab either.
for (const [id, org] of Object.entries(LABS).filter(([id]) => id !== MODEL)) {
  const m = (Array.isArray(list) ? list : []).find((x) => x.id === id);
  check(`API: ${id} is attributed to ${org}`, m?.org === org, m && { id: m.id, org: m.org });
}
// D172.3: a lab that publishes no weights must not hand its model the open-weights badge or the "Open models only" filter.
{
  const swe = (Array.isArray(list) ? list : []).find((m) => m.id === 'swe-1.7-lightning-max::default');
  check('API: SWE-1.7 Lightning Max is not published as open weights', swe?.open_weights === false, swe && { id: swe.id, open_weights: swe.open_weights });
}
check('API: no published model is left without a lab ("Other")',
  (Array.isArray(list) ? list : []).every((m) => m.org !== 'Other'),
  (Array.isArray(list) ? list : []).filter((m) => m.org === 'Other').map((m) => m.id));
const paretoOffers = pareto?.offers ?? pareto?.cheapest_offers ?? [];
check('API: its only offer is the Unbiased route and it does not pass the EU filter',
  paretoOffers.length > 0 && paretoOffers.every((o) => o.provider === 'Unbiased' && o.eu_hosted === false),
  paretoOffers.map((o) => [o.provider, o.eu_hosted]));

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
      await p.goto(`${BASE}/provider-explorer?v=${Date.now()}`, { waitUntil: 'domcontentloaded' });
      await settle(p);
      const appliedTheme = await p.evaluate(() => document.documentElement.dataset.theme || getComputedStyle(document.documentElement).colorScheme);
      check(`${tag}: page theme is ${theme}`, String(appliedTheme).includes(theme), appliedTheme);
      // A provider whose one model carries no score can be filtered out of the directory; keep the 0-model rows.
      const showEmpty = p.locator('label:has-text("Show providers with 0 matching models") input[type=checkbox]');
      if (await showEmpty.count() && !(await showEmpty.isChecked())) await showEmpty.check();
      await p.locator('input[aria-label="Search providers"]').fill('Unbiased');
      await p.waitForTimeout(500);
      const directory = await p.locator('table.dtable').first().innerText().catch(() => '');
      check(`${tag}: the directory row names the provider and its HQ country`, /Unbiased/.test(directory) && /\bUS\b/.test(directory), directory.slice(0, 160));
      check(`${tag}: it carries no EU-capable or Non-US badge`, !/EU-capable|Non-US/.test(directory), directory.slice(0, 160));
      await p.locator('button', { hasText: /^Unbiased$/ }).first().click();
      await p.waitForTimeout(600);
      const main = await p.locator('main').innerText().catch(() => '');
      check(`${tag}: the selected provider shows "HQ: US"`, /HQ:\s*US/.test(main), main.match(/HQ:[^\n]*/)?.[0]);
      check(`${tag}: the curated note is on the page, quote and composite disclosure included`,
        /headquartered in the United States/.test(main) && /composite/.test(main), main.match(/[^\n]*headquartered[^\n]*/)?.[0]?.slice(0, 160));
      check(`${tag}: the placeholder text for an uncurated provider is gone`, !/not yet verified/.test(main), main.match(/[^\n]*not yet verified[^\n]*/)?.[0] ?? '');
      await p.screenshot({ path: `${OUT}/${tag}-provider.png` }).catch(() => {});
      const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(`${tag}: provider explorer has no horizontal overflow`, overflow <= 1, String(overflow));

      let overflow2 = 0;
      for (const [id, org] of Object.entries(LABS)) {
        await p.goto(`${BASE}/models/${encodeURIComponent(id)}?v=${Date.now()}`, { waitUntil: 'domcontentloaded' });
        await settle(p);
        const model = await p.locator('main').innerText().catch(() => '');
        check(`${tag}: ${id} names its lab (${org}), not "Other"`, model.includes(org) && !/^Other\b/m.test(model), model.split('\n').slice(0, 6).join(' | '));
        const description = await p.locator('meta[name="description"]').getAttribute('content').catch(() => '');
        check(`${tag}: ${id}'s page description reads "… by ${org}"`, new RegExp(`by ${org}`).test(description ?? ''), (description ?? '').slice(0, 90));
        if (id === 'swe-1.7-lightning-max::default') {
          check(`${tag}: ${id} carries no "open weights" badge`, !/open weights/i.test(model), model.split('\n').slice(0, 6).join(' | '));
        }
        await p.screenshot({ path: `${OUT}/${tag}-${id.split('::')[0]}.png` }).catch(() => {});
        overflow2 = Math.max(overflow2, await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth));
      }
      check(`${tag}: no model page has horizontal overflow`, overflow2 <= 1, String(overflow2));
      check(`${tag}: no page errors`, errors.length === 0, errors.slice(0, 3));
    } finally { await c.close(); }
  }
} finally { await browser.close(); }
const passed = checks.filter((x) => x.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, revision: REV, runner: process.env.BH_RUNNER || 'unspecified', at: new Date().toISOString(), passed, total: checks.length, checks }, null, 2));
for (const x of checks) if (!x.ok) console.log(`FAIL ${x.name} — ${JSON.stringify(x.detail).slice(0, 300)}`);
console.log(`${BASE} @ ${REV}: ${passed}/${checks.length}`);
process.exit(passed === checks.length ? 0 : 1);
