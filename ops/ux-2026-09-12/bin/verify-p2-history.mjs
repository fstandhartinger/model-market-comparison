// P2 gap 4 live verifier (historical product surface): the "better than model X" filter discloses how a
// bridged reference was reached, with the real retained example Opus 4.7 (medium) on AA Coding Agent Index
// v1.5 (bridged from v1.4), and the API no longer publishes "no longer published" estimates for
// configurations that are still on the board. Usage: node verify-p2-history.mjs <base> <out>
import { createRequire } from 'node:module';
import { buildBenchmarkView } from '../../../lib/benchmark-view.mjs';
import { buildBenchmarkComparison, bridgeDisclosure } from '../../../lib/benchmark-comparison.mjs';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = process.argv[2] || 'https://benchmarkheaven.com';
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/iter65-p2-history/canonical';
await fs.mkdir(OUT, { recursive: true });

const res = { base: BASE, at: new Date().toISOString(), engine: 'claude-opus', pass: 0, fail: 0, results: [] };
const check = (id, name, ok, detail = '') => { res.results.push({ id, name, ok, detail }); res[ok ? 'pass' : 'fail']++; console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${name} ${detail}`); };

// Expected values from the live dataset through the shipped projection, so the page is checked against published data.
const ds = await (await fetch(BASE + '/api/dataset')).json();
const hist = ds.benchmark_results.historical;
const obs = ds.benchmark_results.observations;
const REF = 'claude-opus-4.7::medium';
const cmp = buildBenchmarkComparison(buildBenchmarkView(ds));
const axis = cmp.axes.find((a) => a.name === 'Artificial Analysis Coding Agent Index v1.5' && a.values[REF]?.approximate);
const coding = cmp.categories.find((c) => c.id === 'Coding');
const axisText = axis ? bridgeDisclosure(axis.values[REF]) : null;
const catValue = coding?.values[REF] ?? null;
const catText = catValue ? bridgeDisclosure(catValue) : null;

const falseDropOuts = hist.estimates.filter((e) => {
  if (e.status !== 'estimated') return false;
  const key = e.id.slice(e.id.indexOf(e.benchmark_id) + e.benchmark_id.length + 1);
  const sid = key.startsWith('source:') ? key.slice(7).split('|')[0] : (e.source?.locator || '').match(/model UUID ([0-9a-f-]{36})/i)?.[1];
  return sid && obs.some((o) => o.benchmark_id === e.benchmark_id && o.subject?.source_id === sid && (o.subject.harness ?? null) === (e.harness ?? null) && (o.subject.variant ?? null) === (e.variant ?? null));
});
check('api', 'no estimated row for a configuration still on the current board', falseDropOuts.length === 0, `false=${falseDropOuts.length} estimated=${hist.counts.estimated}`);
check('api', `${REF} is a real retained estimate on Coding Agent Index v1.5 (from v1.4)`, !!axis && /version 1\.4 of this benchmark, bridged through \d+ anchor models, anchor spread ±\d+%/.test(axisText), `"${axisText}"`);
check('api', `${REF} Coding median counts its bridged benchmarks`, !!catValue && catValue.approximate && /^approximated: \d+ of \d+ benchmarks? in this median/.test(catText), `"${catText}"`);

const b = await chromium.launch();
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const tag = `${kind}_${theme}`;
  const c = await b.newContext({ viewport: vp, isMobile: kind === 'mobile', hasTouch: kind === 'mobile', colorScheme: theme, deviceScaleFactor: 1 });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const p = await c.newPage(); const errors = []; p.on('pageerror', (e) => errors.push(String(e)));
  await p.goto(BASE + '/', { waitUntil: 'networkidle' });
  await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
  await p.getByRole('tab', { name: 'Advanced' }).click(); await p.waitForTimeout(800);
  let scope;
  if (kind === 'desktop') {
    await p.locator('summary', { hasText: 'Better than a model' }).first().click();
    scope = p.locator('details[open]').filter({ has: p.getByLabel('Reference model') }).first();
  } else {
    await p.getByRole('button', { name: /^Refine/ }).click();
    scope = p.getByRole('dialog', { name: 'Refine the ranking' });
  }
  await scope.getByLabel('Reference model').selectOption(REF);
  // F-86: only comparisons the reference can answer are selectable; labels are unique.
  const opts = await scope.getByLabel('Benchmark or category').locator('option').evaluateAll((os) => os.slice(1).map((o) => ({ text: o.textContent.trim(), disabled: o.disabled })));
  const enabled = opts.filter((o) => !o.disabled), disabled = opts.filter((o) => o.disabled);
  check('f86', `${tag} metric select has enabled and disabled options`, enabled.length >= 1 && disabled.length >= 1, `enabled=${enabled.length} disabled=${disabled.length}`);
  check('f86', `${tag} every disabled option says "no result for this model"`, disabled.every((o) => o.text.endsWith('no result for this model')));
  check('f86', `${tag} enabled options precede disabled ones`, opts.findIndex((o) => o.disabled) === enabled.length);
  const bare = opts.map((o) => o.text.replace(/ · (no result for this model|bridged)$/, ''));
  check('f86', `${tag} all metric labels are unique`, new Set(bare).size === bare.length, `n=${bare.length} unique=${new Set(bare).size}`);
  const refs = await scope.getByLabel('Reference model').locator('option').evaluateAll((os) => os.map((o) => ({ v: o.value, t: o.textContent.trim(), disabled: o.disabled })));
  const sep = refs.findIndex((o) => o.disabled && /no comparable results/.test(o.t));
  check('f86', `${tag} reference select keeps ${REF} choosable and puts models without results after a separator`, refs.some((o) => o.v === REF && !o.disabled) && (sep === -1 || refs.findIndex((o) => o.v === REF) < sep), `sep=${sep} of ${refs.length}`);
  const status = scope.locator('p[role="status"]');
  const statusFor = async (metricValue) => { await scope.getByLabel('Benchmark or category').selectOption(metricValue); await p.waitForTimeout(400); return (await status.textContent())?.replace(/\s+/g, ' ').trim() ?? ''; };

  const axisStatus = axis ? await statusFor(`axis:${axis.id}`) : '';
  const shown = axis ? axis.values[REF].value.toFixed(2) : '';
  check('ui', `${tag} Coding Agent Index v1.5 reference shows ${shown} and the bridge disclosure`, !!axis && axisStatus.includes(`above ${shown} for this reference (${axisText})`), `"${axisStatus}"`);
  if (kind === 'desktop') await p.screenshot({ path: `${OUT}/${tag}-h3-axis.png` });
  else await scope.screenshot({ path: `${OUT}/${tag}-h3-axis.png` });

  const catStatus = coding ? await statusFor(`category:${coding.id}`) : '';
  check('ui', `${tag} Coding median reference names how many benchmarks are bridged`, !!catText && catStatus.includes(`(${catText})`), `"${catStatus}"`);
  const qualify = Number(catStatus.match(/; (\d+) models currently qualify/)?.[1] ?? -1);
  check('ui', `${tag} the filter is active with a count`, qualify >= 0, `qualify=${qualify}`);
  check('ui', `${tag} no raw registry id or "retained bridge" placeholder in the line`, !/::|retained bridge\)/.test(axisStatus + catStatus));
  const w = await p.evaluate(() => document.documentElement.scrollWidth);
  check('overflow', `${tag} no horizontal page overflow`, w <= vp.width, `w=${w}`);
  check('errors', `${tag} no page errors`, errors.length === 0, errors.join(' | ').slice(0, 300));
  await c.close();
}
await b.close();
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify(res, null, 2));
console.log(`${res.pass}/${res.pass + res.fail} passed`);
process.exit(res.fail ? 1 : 0);
