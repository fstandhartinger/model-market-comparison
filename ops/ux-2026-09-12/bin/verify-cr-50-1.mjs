// CR-50.1 (CR-20260916l): a free ($0 / ":free") route is never the paid price. Charts "Cheapest models" has no $0 row
// and GLM-5.2 (if listed) is priced > 0; the overview table has no row priced at 0; the GLM-5.2 model page's top-5
// cheapest table has no $0 route, and its full route list shows the Decart free route labelled "free — … not used as a
// paid price" with "not a paid price" instead of a value; /api/models never returns a $0 cheapest offer.
// Desktop 1440 and phone 390, light and dark.
// Usage: BH_RUNNER=<engine> node verify-cr-50-1.mjs <base> <outdir> [expected-revision-prefix]
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-50-1';
const REV = process.argv[4] || '';
await fs.mkdir(OUT, { recursive: true });
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const meta = await (await fetch(`${BASE}/api/meta`)).json().catch(() => ({}));
check('deployed revision matches the expected commit', !REV || String(meta.revision || '').startsWith(REV), { revision: meta.revision, expected: REV });

const api = await (await fetch(`${BASE}/api/models`)).json().catch(() => null);
const apiModels = Array.isArray(api) ? api : api?.models ?? [];
const zeroApi = apiModels.flatMap((m) => (m.cheapest_offers ?? []).filter((o) => o.blended === 0 || (o.input_per_1m === 0 && o.output_per_1m === 0)).map((o) => `${m.id}:${o.provider}`));
check('/api/models: no cheapest offer is a $0 route', apiModels.length > 0 && zeroApi.length === 0, { models: apiModels.length, zero: zeroApi.slice(0, 10) });
const glmApi = apiModels.find((m) => m.id === 'glm-5.2::max');
check('/api/models: GLM-5.2 cost is positive', !glmApi || (glmApi.cost ?? glmApi.cost_blended ?? 1) > 0, glmApi ? { cost: glmApi.cost, first: glmApi.cheapest_offers?.[0] } : 'not listed');

const money = (s) => { const m = String(s).match(/\$\s?([\d,.]+)/); return m ? Number(m[1].replace(/,/g, '')) : null; };
const b = await chromium.launch();
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const mobile = kind === 'mobile';
  const c = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme, deviceScaleFactor: mobile ? 2 : 1 });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const page = await c.newPage(); const tag = `${kind}_${theme}`; const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  const go = async (path) => { await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 90000 }); await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1500); };

  await go('/charts');
  const rows = await page.evaluate(() => {
    const panel = [...document.querySelectorAll('section, div')].find((el) => /^Cheapest models/.test(el.querySelector('h2,h3')?.textContent ?? '') && el.querySelector('h2,h3')?.closest('section,div') === el);
    const scope = panel ?? document;
    const items = [...scope.querySelectorAll('[aria-label="Cheapest models"] [role="listitem"]')].map((x) => x.getAttribute('aria-label'));
    const text = panel ? panel.innerText : '';
    return { items, text: text.slice(0, 1500) };
  });
  const lines = rows.items.length ? rows.items : rows.text.split('\n').filter((l) => /\$/.test(l));
  const zero = lines.filter((l) => money(l) === 0);
  check(`${tag} Charts "Cheapest models": rows present and none at $0`, lines.length > 0 && zero.length === 0, { n: lines.length, zero, first: lines.slice(0, 4) });
  const glm = lines.filter((l) => /GLM-5\.2\b(?![.\d])/.test(l));
  check(`${tag} Charts "Cheapest models": GLM-5.2, when listed, has a positive price`, glm.every((l) => (money(l) ?? 1) > 0), glm);
  await page.screenshot({ path: `${OUT}/${tag}-charts.png`, fullPage: false }).catch(() => {});

  await go('/');
  const costs = await page.evaluate(() => [...document.querySelectorAll('tr[data-model-id][data-cost]')].map((r) => [r.dataset.modelId, Number(r.dataset.cost)]));
  check(`${tag} overview table: no row priced at 0`, costs.length > 0 && costs.every(([, v]) => v > 0), { n: costs.length, zero: costs.filter(([, v]) => !(v > 0)).slice(0, 5) });

  await go('/models/' + encodeURIComponent('glm-5.2::max'));
  const d = await page.evaluate(() => {
    const top = [...document.querySelectorAll('section.card')].find((s) => /cheapest providers/i.test(s.querySelector('h2')?.textContent ?? ''));
    const topRows = top ? [...top.querySelectorAll('tbody tr')].map((r) => r.innerText.replace(/\s+/g, ' ')) : [];
    const det = [...document.querySelectorAll('details.card')].find((x) => /Token offers by platform/.test(x.querySelector('summary')?.textContent ?? ''));
    if (det) det.open = true;
    const free = det ? [...det.querySelectorAll('tr[data-free-route]')].map((r) => ({ text: r.textContent.replace(/\s+/g, ' '), title: r.querySelector('[title]')?.getAttribute('title') })) : [];
    return { topRows, free, hasDetails: !!det };
  });
  check(`${tag} GLM-5.2 page: top cheapest providers have no $0 route`, d.topRows.length > 0 && d.topRows.every((t) => !/\$0(\.0+)?\b(?!\.\d*[1-9])/.test(t) || /\$0\.0*[1-9]/.test(t)) && !d.topRows.some((t) => /^\d+ Decart OpenRouter/.test(t) && /\$0\.00\b/.test(t)), d.topRows);
  check(`${tag} GLM-5.2 page: the Decart free route is listed and labelled as not a paid price (screen-reader text included)`, d.free.some((f) => /Decart/.test(f.text) && /free — Free route: rate- and quota-limited/.test(f.text) && /not a paid price/.test(f.text)), d.free);
  await page.screenshot({ path: `${OUT}/${tag}-glm-page.png`, fullPage: false }).catch(() => {});
  check(`${tag} no page errors`, errors.length === 0, errors);
  await c.close();
}
await b.close();
const passed = checks.filter((x) => x.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, revision: meta.revision, runner: process.env.BH_RUNNER || 'unknown', at: new Date().toISOString(), passed, total: checks.length, allPass: passed === checks.length, checks }, null, 1));
for (const x of checks) console.log(`${x.ok ? 'PASS' : 'FAIL'} ${x.name}${x.ok ? '' : ' — ' + x.detail.slice(0, 700)}`);
console.log(`${passed}/${checks.length}${passed === checks.length ? ' ALL PASS' : ''}`);
process.exit(passed === checks.length ? 0 : 1);
