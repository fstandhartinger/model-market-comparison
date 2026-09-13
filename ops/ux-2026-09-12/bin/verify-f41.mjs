// F-41 acceptance: hatch on exact + attached inputs; pips tell exact from attached.
// Usage: node verify-f41.mjs <base> <out>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = process.argv[2] || 'https://benchmarkheaven.com';
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/iter29-f41/live';
await fs.mkdir(OUT, { recursive: true });
const b = await chromium.launch();
const out = { base: BASE, checked_at: new Date().toISOString(), fails: [] };
const expect = (k, ok, detail) => { out[k] = { ok, detail }; if (!ok) out.fails.push(k); };
const FLAGSHIPS = ['Fable 5.1', 'Opus 5', 'Kimi K3', 'Grok 4.6', 'GLM-5.3'];

const rows = (p) => p.evaluate(() => [...document.querySelectorAll('table[aria-label="Model ranking"] tbody tr.bh-ranking-row')].map((tr) => ({
  name: tr.querySelector('td a')?.innerText.trim() ?? '',
  thin: !!tr.querySelector('.bh-magnitude-thin'),
  pips: tr.querySelector('[aria-label*="Composite inputs"]')?.getAttribute('aria-label') ?? null,
})));
const smallPrint = (p) => p.evaluate(() => document.body.innerText.includes('Striped score = built on fewer than 3 of 7 inputs'));

for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const c = await b.newContext({ viewport: vp, isMobile: kind === 'mobile' });
  const p = await c.newPage();
  await p.goto(BASE + '/', { waitUntil: 'networkidle' }); await p.waitForTimeout(1000);
  const simple = await rows(p);
  const hatchedFlagships = simple.filter((r) => r.thin && FLAGSHIPS.some((f) => r.name.includes(f))).map((r) => r.name);
  expect(`${kind}_simple_no_flagship_hatched`, simple.length > 0 && hatchedFlagships.length === 0, { rows: simple.map((r) => `${r.name}${r.thin ? ' [thin]' : ''}`), hatchedFlagships });
  expect(`${kind}_simple_small_print_iff_hatched`, (await smallPrint(p)) === simple.some((r) => r.thin), { hatched: simple.filter((r) => r.thin).length });
  expect(`${kind}_simple_no_pips`, simple.every((r) => r.pips == null), null);
  await p.screenshot({ path: `${OUT}/${kind}-simple.png`, fullPage: false });

  await p.getByRole('tab', { name: 'Advanced' }).click(); await p.waitForTimeout(1200);
  const adv = await rows(p);
  expect(`${kind}_advanced_thin_rows_exist`, adv.filter((r) => r.thin).length > 0, { rows: adv.length, thin: adv.filter((r) => r.thin).length });
  const fable = adv.find((r) => r.name.includes('Fable 5.1'));
  expect(`${kind}_fable_attached_label`, !!fable?.pips?.includes('attached of 7'), fable ?? null);
  expect(`${kind}_advanced_no_small_print_clause`, !(await smallPrint(p)), null);
  // Every thin Advanced row must really have fewer than 3 filled slots per its own label.
  const wrong = adv.filter((r) => r.pips).filter((r) => {
    const [, e, a] = r.pips.match(/(\d+) exact \+ (\d+) attached/) ?? [];
    return e != null && (Number(e) + Number(a) < 3) !== r.thin;
  });
  expect(`${kind}_thin_matches_label`, wrong.length === 0, wrong.slice(0, 5));
  await p.screenshot({ path: `${OUT}/${kind}-advanced.png`, fullPage: false });
  await c.close();
}
await b.close();
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify(out, null, 2));
console.log(JSON.stringify({ base: BASE, fails: out.fails }));
