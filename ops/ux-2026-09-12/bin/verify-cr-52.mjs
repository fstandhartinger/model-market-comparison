// CR-52.1–52.3 (CR-20260916m, "lets include https://lisanbench.com/ into our benchmark list"). Published LisanBench
// values are compared with the source's own live data file (https://lisanbench.com/data/core.json, the file its page
// loads), then the board is checked in the API, the Benchmarks page, its result/provenance page, the Simple benchmark
// table, the Advanced comparison picker, a model page and the /about credit — 1440/390, light/dark.
// Usage: BH_RUNNER=<engine> node verify-cr-52.mjs <base> <outdir> [expected-revision-prefix]
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-52';
const REV = process.argv[4] || '';
await fs.mkdir(OUT, { recursive: true });
const goto = async (page, url) => { for (let a = 1; ; a++) { try { return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 3000 * a)); } } };
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const settle = async (page) => { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1800); };
const meta = await (await fetch(`${BASE}/api/meta`)).json().catch(() => ({}));
check('deployed revision matches the expected commit', !REV || String(meta.revision || '').startsWith(REV), { revision: meta.revision, expected: REV });

const ID = 'lisanbench::0.2.0';
// Catalog configuration → the LisanBench source id it must come from (the source states the setting).
const JOINS = { 'claude-opus-5::high': 'claude-opus-5:thinking-high', 'kimi-k3::max': 'kimi-k3:thinking-max', 'claude-fable-5::medium': 'claude-fable-5:thinking-medium',
  'gpt-5.5::medium': 'gpt-5.5:thinking-medium', 'gpt-5::medium': 'gpt-5' };
const source = await (await fetch('https://lisanbench.com/data/core.json')).json();
const truth = Object.fromEntries(source.aggregated.map((a) => [a.model, a.sum_chain_avg]));
const models = [...Object.keys(JOINS), 'claude-opus-5::xhigh'];
const api = (await (await fetch(`${BASE}/api/benchmark-matrix?models=${encodeURIComponent(models.join(','))}`)).json()).matrix;
const rowIndex = (api?.rows ?? []).findIndex((r) => r.benchmarkId === ID || r.ranking === ID);
const row = api?.rows?.[rowIndex];
const val = (m) => (api?.values?.[m] ?? []).find(([k]) => k === rowIndex)?.[1] ?? null;
check('CR-52.3 API: LisanBench is an Instruction-following row, Community tag, open-ended points, higher is better', row && row.group === 'instruction' && row.tags.includes('community') && row.unit === 'points' && row.higherBetter === true && row.range?.[1] === null && row.version === '0.2.0',
  row ? { name: row.name, group: row.group, tags: row.tags, unit: row.unit, range: row.range, version: row.version } : 'missing');
for (const [m, sid] of Object.entries(JOINS)) check(`CR-52.2 API: ${m} = the live source's ${sid} (${truth[sid]})`, val(m) !== null && val(m) === truth[sid], { published: val(m), source: truth[sid] });
check('CR-52.2 API: a configuration LisanBench did not run (claude-opus-5::xhigh) has no value — gaps stay missing', val('claude-opus-5::xhigh') === null, String(val('claude-opus-5::xhigh')));
const sc = await (await fetch(`${BASE}/api/benchmark-scores?model_id=${encodeURIComponent('claude-opus-5::high')}&benchmark_id=${encodeURIComponent(ID)}`)).json();
const obs = (sc.observations ?? sc.results ?? []).find((o) => o.benchmark_id === ID);
check('CR-52.2 API: the observation is measured, cites data/core.json with its capture file/hash, keeps the trial count and the README method source',
  obs && obs.basis === 'measured' && obs.source?.url === 'https://lisanbench.com/data/core.json' && /^[0-9a-f]{64}$/.test(obs.source?.sha256 ?? '') && /"trials_total":150/.test(obs.protocol ?? '')
    && (obs.supporting_sources ?? []).some((s) => /lisan-bench\/main\/README\.md$/.test(s.url)), obs ? { url: obs.source?.url, basis: obs.basis, supporting: (obs.supporting_sources ?? []).map((s) => s.url) } : 'missing');

const b = await chromium.launch();
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const mobile = kind === 'mobile'; const tag = `${kind}_${theme}`;
  const c = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme, deviceScaleFactor: mobile ? 2 : 1 });
  await c.addInitScript((t) => { try { localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const page = await c.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

  // Benchmarks page, all rows, with the compared models.
  await goto(page, `${BASE}/benchmarks?models=${encodeURIComponent(Object.keys(JOINS).join(','))}&rows=all`); await settle(page);
  const tr = page.locator('table tbody tr', { hasText: 'LisanBench' }).first();
  const trText = (await tr.innerText().catch(() => '')).replace(/\s+/g, ' ');
  const group = await tr.evaluate((el) => { for (let r = el.previousElementSibling; r; r = r.previousElementSibling) if (r.classList.contains('bh-matrix-group')) return r.innerText.replace(/\s+/g, ' ').trim(); return null; }).catch(() => null);
  check(`${tag} /benchmarks: the LisanBench row sits under Instruction following with the Community tag and shows 15,428`, /Instruction following/i.test(group ?? '') && /Community/i.test(trText) && /15,?428/.test(trText), { group, row: trText.slice(0, 300) });
  await tr.scrollIntoViewIfNeeded().catch(() => {}); await page.waitForTimeout(400);
  await tr.screenshot({ path: `${OUT}/${tag}-benchmarks-row.png` }).catch(() => {});
  check(`${tag} /benchmarks: no horizontal page overflow`, (await overflow()) <= 1, String(await overflow()));
  const cell = tr.locator('a[href*="/benchmarks/result"]').first();
  const href = await cell.getAttribute('href').catch(() => null);
  check(`${tag} /benchmarks: LisanBench values open the result page`, !!href, String(href));
  if (href) {
    await goto(page, new URL(href, BASE).href); await settle(page);
    const detail = (await page.evaluate(() => document.querySelector('main')?.innerText ?? '')).replace(/\s+/g, ' ');
    const links = await page.evaluate(() => [...document.querySelectorAll('main a')].map((a) => a.href));
    check(`${tag} result page: links the source data file, names version 0.2.0, the result date and measured basis, shows the published value`, links.includes('https://lisanbench.com/data/core.json') && /Version 0\.2\.0 · results as of 2026-09-16/.test(detail) && /15428\.33 points measured observed 2026-09-16/.test(detail), { detail: detail.slice(0, 500), links: links.filter((l) => /lisan/.test(l)) });
    await page.screenshot({ path: `${OUT}/${tag}-result-page.png` }).catch(() => {});
  }

  // Simple overview: the benchmark table lists the board; models LisanBench did not run show no result.
  await goto(page, `${BASE}/`); await settle(page);
  const simple = await page.evaluate(() => { const r = [...document.querySelectorAll('#benchmarks tr')].find((t) => /LisanBench/.test(t.textContent)); return r ? r.innerText.replace(/\s+/g, ' ') : null; });
  check(`${tag} Simple: the benchmark table has a LisanBench row, gaps read as no result`, !!simple && /No result|—/.test(simple), String(simple).slice(0, 200));

  // Advanced: the "better than model X in category Y" picker offers the board.
  await page.getByRole('tab', { name: 'Advanced' }).click(); await page.waitForTimeout(1200);
  const option = await page.evaluate(() => [...document.querySelectorAll('option')].map((o) => o.textContent).find((t) => /LisanBench/.test(t)) ?? null);
  check(`${tag} Advanced: the comparison picker offers LisanBench`, !!option, String(option));

  // Model page and /about credit.
  await goto(page, `${BASE}/models/${encodeURIComponent('claude-opus-5::high')}`); await settle(page);
  const modelLink = await page.evaluate(() => [...document.querySelectorAll('a')].find((a) => /LisanBench/.test(a.textContent))?.getAttribute('href') ?? null);
  check(`${tag} model page: Opus 5 (high) lists LisanBench and links to the board`, /benchmark=lisanbench/.test(modelLink ?? ''), String(modelLink));
  await goto(page, `${BASE}/about#lisanbench`); await settle(page);
  const credit = await page.evaluate(() => { const li = document.getElementById('lisanbench'); return li ? { text: li.innerText, links: [...li.querySelectorAll('a')].map((a) => a.href) } : null; });
  check(`${tag} /about credits @scaling01 and links the repository (README usage terms)`, credit && /@scaling01/.test(credit.text) && credit.links.includes('https://x.com/scaling01') && credit.links.includes('https://github.com/voice-from-the-outer-world/lisan-bench'), credit);
  check(`${tag} no page errors`, errors.length === 0, errors);
  await c.close();
}
await b.close();
const passed = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, revision: meta.revision, runner: process.env.BH_RUNNER || 'unknown', at: new Date().toISOString(), passed, total: checks.length, allPass: passed === checks.length, checks }, null, 1));
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}${c.ok ? '' : ' — ' + c.detail.slice(0, 500)}`);
console.log(`${passed}/${checks.length}${passed === checks.length ? ' ALL PASS' : ''}`);
process.exit(passed === checks.length ? 0 : 1);
