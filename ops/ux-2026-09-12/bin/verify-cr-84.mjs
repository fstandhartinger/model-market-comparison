// CR-84 live verification (Florian 2026-09-18/19, CR-20260919a JevBench): /jev-models, "Jev-class models" nav entry,
// our own benchmark said in the lead, five independently sortable axes with no combined score, null price rendered
// "no tariff" (never $0), stopped/unrunnable systems outside the ranking, scatter + calibration keyboard access,
// number parity against the committed artifact hash, no horizontal overflow — 1440/390 px, light/dark.
// CR-86 (19 Sep): v1.0 moved to /jev-models/v1 when v1.1 became the current page.
// Usage: node verify-cr-84.mjs <base> <outdir> [expected-revision-prefix]
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-84';
const REV = process.argv[4] || '';
const ARTIFACT_SHA256 = '38fc5f1d6fd8bda970c6f4a918492d67370e9e764477a302611419a97fb0bd53';
await fs.mkdir(OUT, { recursive: true });
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });

if (REV) { const meta = await (await fetch(`${BASE}/api/meta`)).json().catch(() => ({})); check('deployed revision matches the expected commit', String(meta.revision || '').startsWith(REV), { revision: meta.revision, expected: REV }); }
const res = await fetch(`${BASE}/api/jevbench`);
const bytes = Buffer.from(await res.arrayBuffer());
const sha = createHash('sha256').update(bytes).digest('hex');
check('public JSON is the committed artifact byte for byte', res.ok && sha === ARTIFACT_SHA256, { status: res.status, sha, header: res.headers.get('x-content-sha256') });
const artifact = JSON.parse(bytes.toString('utf8'));
const sys = Object.fromEntries(artifact.systems.map((s) => [s.key, s]));
const rankedKeys = artifact.systems.filter((s) => s.ranked && s.complete).map((s) => s.key);
const partialKeys = artifact.systems.filter((s) => s.ranked && !s.complete).map((s) => s.key);
const unrunnableKeys = artifact.systems.filter((s) => !s.ranked).map((s) => s.key);
const pct = (v) => `${(v * 100).toFixed(1)}%`;

const b = await chromium.launch();
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1100 }], ['mobile', { width: 390, height: 844 }]]) {
  const mobile = kind === 'mobile';
  const c = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme, deviceScaleFactor: mobile ? 2 : 1 });
  await c.addInitScript((t) => { try { localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const page = await c.newPage(); const tag = `${kind}_${theme}`; const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const r = await page.goto(`${BASE}/jev-models/v1`, { waitUntil: 'networkidle', timeout: 90000 });
  check(`${tag}: page 200 and title`, r.status() === 200 && (await page.title()).startsWith('Jev-class decision models — JevBench v1.0'), await page.title());
  check(`${tag}: theme applied`, (await page.evaluate(() => document.documentElement.dataset.theme)) === theme, theme);
  check(`${tag}: lead says it is our own benchmark`, /JevBench v1 is our own benchmark/.test(await page.locator('[data-bh-jev-own]').innerText()), 'data-bh-jev-own');
  check(`${tag}: sha256 shown on the page equals the artifact`, (await page.locator('[data-bh-jev-sha]').getAttribute('data-bh-jev-sha')) === ARTIFACT_SHA256, 'data-bh-jev-sha');
  // Row set and number parity.
  const rows = await page.$$eval('[data-bh-jev-row]', (els) => els.map((e) => ({ key: e.getAttribute('data-bh-jev-row'), acc: e.getAttribute('data-bh-jev-accuracy'), cost: e.getAttribute('data-bh-jev-cost'), p50: e.getAttribute('data-bh-jev-p50'), ece: e.getAttribute('data-bh-jev-ece'), text: e.innerText })));
  check(`${tag}: ranked rows = complete runs, stopped runs below, unrunnable absent`, JSON.stringify(rows.map((x) => x.key).slice(0, rankedKeys.length).sort()) === JSON.stringify([...rankedKeys].sort())
    && JSON.stringify(rows.map((x) => x.key).slice(rankedKeys.length)) === JSON.stringify(partialKeys) && !rows.some((x) => unrunnableKeys.includes(x.key)), rows.map((x) => x.key));
  const parity = rows.map((x) => { const o = sys[x.key].overall; return { key: x.key, ok: Number(x.acc) === o.accuracy && (o.cost_per_1000_usd === null ? x.cost === '' : Number(x.cost) === o.cost_per_1000_usd) && Number(x.p50) === o.latency_ok_s.p50_s && Number(x.ece) === o.ece.ece
    && x.text.includes(pct(o.accuracy)) && (o.cost_per_1000_usd === null ? /no tariff/.test(x.text) : x.text.includes(`$${o.cost_per_1000_usd.toFixed(3)}`)) }; });
  check(`${tag}: every row's numbers equal the artifact (data attributes and rendered text)`, parity.every((p) => p.ok), parity.filter((p) => !p.ok));
  check(`${tag}: no $0 price anywhere`, !/\$0\.00\b|\$0(?![.\d])/.test(await page.locator('main').innerText()), 'text scan');
  // Five axes, each sortable; unknown cost sorts last in both directions.
  const sorts = [];
  for (const axis of ['smart', 'cheap', 'fast', 'reliable', 'open']) {
    await page.locator(`[data-bh-jev-sort="${axis}"]`).click();
    const state = await page.locator(`th:has([data-bh-jev-sort="${axis}"])`).getAttribute('aria-sort');
    const order = await page.$$eval('[data-bh-jev-row]', (els) => els.map((e) => e.getAttribute('data-bh-jev-row')));
    sorts.push({ axis, state, first: order[0] });
    if (axis === 'cheap') {
      const costs = await page.$$eval('[data-bh-jev-row]', (els) => els.map((e) => e.getAttribute('data-bh-jev-cost')));
      const ranked = costs.slice(0, rankedKeys.length); const firstNull = ranked.indexOf('');
      check(`${tag}: cheap sort — metered ascending, no-tariff rows last`, (firstNull < 0 || ranked.slice(firstNull).every((v) => v === '')) && ranked.filter(Boolean).map(Number).every((v, i, a) => !i || a[i - 1] <= v), ranked);
      await page.locator('[data-bh-jev-sort="cheap"]').click();
      const flipped = (await page.$$eval('[data-bh-jev-row]', (els) => els.map((e) => e.getAttribute('data-bh-jev-cost')))).slice(0, rankedKeys.length);
      const fn = flipped.indexOf('');
      check(`${tag}: cheap sort flipped — still no-tariff rows last`, fn < 0 || flipped.slice(fn).every((v) => v === ''), flipped);
    }
  }
  check(`${tag}: five sortable axes with aria-sort`, sorts.length === 5 && sorts.every((s) => s.state === 'ascending' || s.state === 'descending'), sorts);
  check(`${tag}: no combined score column`, !/combined|composite|overall score/i.test(await page.locator('[data-bh-jev-table] thead').innerText()), 'thead');
  // Keyboard: expand a row with Enter; tab into the scatter.
  await page.locator('[data-bh-jev-sort="smart"]').click();
  const firstBtn = page.locator('[data-bh-jev-row] th button').first();
  await firstBtn.focus(); await page.keyboard.press('Enter');
  check(`${tag}: row expands from the keyboard`, (await firstBtn.getAttribute('aria-expanded')) === 'true' && await page.locator('[data-bh-jev-detail]').first().isVisible(), 'Enter on row button');
  await page.locator('[data-bh-jev-point]').first().focus();
  const readout = await page.locator('[data-bh-jev-point-readout]').innerText().catch(() => '');
  check(`${tag}: scatter point focusable with a readout`, readout.length > 10, readout);
  const pts = await page.$$eval('[data-bh-jev-point]', (els) => els.map((e) => e.getAttribute('data-bh-jev-point')));
  check(`${tag}: scatter plots only metered complete runs (no $0 point)`, pts.every((k) => rankedKeys.includes(k) && sys[k].overall.cost_per_1000_usd !== null) && pts.length === rankedKeys.filter((k) => sys[k].overall.cost_per_1000_usd !== null).length, pts);
  check(`${tag}: omitted systems explained`, /no per-token tariff/.test(await page.locator('[data-bh-jev-omitted]').innerText()), 'data-bh-jev-omitted');
  const binRows = await page.locator('[data-bh-jev-bins] tbody tr').count();
  check(`${tag}: calibration has 10 fixed bins in its table`, binRows === 10, binRows);
  const avail = await page.$$eval('[data-bh-jev-availability-row]', (els) => els.map((e) => e.getAttribute('data-bh-jev-availability-row')));
  check(`${tag}: availability rows (unrunnable + not measured) outside the ranking`, unrunnableKeys.every((k) => avail.includes(k)) && avail.length >= 12, avail.length);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(`${tag}: no horizontal page overflow`, overflow <= 0, overflow);
  check(`${tag}: no page errors`, errors.length === 0, errors);
  await page.screenshot({ path: `${OUT}/${tag}.png`, fullPage: !mobile });
  if (mobile) await page.screenshot({ path: `${OUT}/${tag}-viewport.png` });
  // Nav: More menu carries the entry.
  const more = mobile ? page.locator('header').first().locator('summary:has-text("More")').last() : page.locator('nav[aria-label="Primary"] summary:has-text("More")');
  await more.click();
  const link = page.locator('header').first().locator('a[href="/jev-models"]:visible');
  check(`${tag}: "Jev-class models" in the More menu`, (await link.count()) === 1 && (await link.innerText()).trim() === 'Jev-class models', await link.count());
  await c.close();
}
await b.close();
const pass = checks.filter((x) => x.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), pass, total: checks.length, checks }, null, 2));
console.log(`${pass}/${checks.length}`); for (const x of checks.filter((y) => !y.ok)) console.log('FAIL', x.name, x.detail.slice(0, 300));
