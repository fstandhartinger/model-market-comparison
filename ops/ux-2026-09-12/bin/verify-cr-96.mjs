// CR-96 live verification (2026-09-20): JevBench v1.2.3 — the cost correction, and the unit stated so it cannot be misread.
// A reader read the Cost column as dollars per 1,000 tokens ("Jev is 4.2 cents per 1m, not per 1k"). The tariff we used was
// right ($0.042 per MILLION input tokens, output free); the label was too easy to misread, and checking it found three
// arithmetic mistakes of our own. This checks both halves on the live page.
// Usage: node verify-cr-96.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-96';
await fs.mkdir(OUT, { recursive: true });
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const a = await (await fetch(`${BASE}/api/jevbench/v1.2`)).json();
const row = (k) => a.systems.find((s) => s.key === k);

// --- CR-96.1 the corrected prices and scores ---
// CR-97 (2026-09-20) took classifier.dev out of the ranking; the corrected prices and every score must survive that,
// so this verifier follows the revision instead of pinning ranks that the later CR legitimately shifts by one.
const V124 = a.revision >= 'v1.2.4';
check('artifact: revision v1.2.3 or later', ['v1.2.3', 'v1.2.4'].includes(a.revision), a.revision);
const EXPECT = V124
  ? { 'classifier-dev-fast': [null, '84.8'], 'jev-1.13.0': [1, '75.4'], 'semif-qwen3.5-4b': [2, '74.7'], djev: [3, '74.3'],
    laya: [4, '70.1'], 'open-alternative-jev': [5, '69.8'], 'system-one-open': [6, '68.9'], 'openjev-razorback16': [7, '67.7'],
    jeff: [8, '66.9'], 'openjev-sglang': [9, '66.3'], 'openjev-verdict': [10, '66.2'], 'gpt-5.6-luna': [11, '66.2'],
    'open-jev-deberta-v3-large': [12, '64.6'], 'nimble-9b': [13, '63.7'], 'gemini-3.1-flash-lite': [14, '60.9'],
    'deepseek-flash': [15, '57.8'], 'system-one-sg': [16, '56.6'], gliner2: [17, '53.0'] }
  : { 'classifier-dev-fast': [1, '84.8'], 'jev-1.13.0': [2, '75.4'], 'semif-qwen3.5-4b': [3, '74.7'], djev: [4, '74.3'],
    laya: [5, '70.1'], 'open-alternative-jev': [6, '69.8'], 'system-one-open': [7, '68.9'], 'openjev-razorback16': [8, '67.7'],
    jeff: [9, '66.9'], 'openjev-sglang': [10, '66.3'], 'openjev-verdict': [11, '66.2'], 'gpt-5.6-luna': [12, '66.2'],
    'open-jev-deberta-v3-large': [13, '64.6'], 'nimble-9b': [14, '63.7'], 'gemini-3.1-flash-lite': [15, '60.9'],
    'deepseek-flash': [16, '57.8'], 'system-one-sg': [17, '56.6'], gliner2: [18, '53.0'] };
for (const [k, [rank, score]] of Object.entries(EXPECT)) {
  const r = row(k);
  check(`artifact: ${k} ${rank === null ? '(no rank)' : '#' + rank} at ${score}`, r && r.rank === rank && r.jevbench_score.toFixed(1) === score, r && [r.rank, r.jevbench_score]);
}
// Jev's price is its public tariff times its measured tokens; nothing else.
const jev = row('jev-1.13.0');
check('artifact: Jev is $0.0399 per 1,000 decisions, measured', jev.cost.kind === 'measured' && jev.cost.usd_per_1000.toFixed(4) === '0.0399', jev.cost.usd_per_1000);
check('artifact: Jev\'s price = 0.042 $/M input x its mean input tokens',
  Math.abs(jev.cost.usd_per_1000 - (a.cost_unit.mean_input_tokens_per_decision_jev * 1000 * 0.042) / 1e6) < 1e-9, jev.cost.usd_per_1000);
check('artifact: Jev\'s basis names the TypeSafe docs', /docs\.typesafe\.ai\/models/.test(jev.cost.basis), jev.cost.basis.slice(0, 120));
// Every row has a real price; the correction is small and complete.
check('artifact: every row keeps a positive price and a cost score below 100',
  a.systems.every((s) => s.cost.usd_per_1000 > 0 && s.axes.cost <= 100), '');
const fix = a.cost_correction_table;
check('artifact: a correction entry for every row', fix && Object.keys(fix).length === a.systems.length, Object.keys(fix || {}).length);
check('artifact: every correction is under 15 %', Object.values(fix).every((c) => Math.abs(c.pct) < 15), '');
check('artifact: 16 rows corrected, 5 unchanged', Object.values(fix).filter((c) => !c.unchanged).length === 16, Object.values(fix).filter((c) => !c.unchanged).length);
check('artifact: cost_correction lists what was wrong', Array.isArray(a.cost_correction?.what_was_wrong) && a.cost_correction.what_was_wrong.length >= 3, '');
check('artifact: the revision log carries the v1.2.3 entry', (a.revision_log || []).some((e) => e.revision === 'v1.2.3' && /correction/i.test(e.note)), '');

// --- CR-96.2 the unit, stated in the artifact ---
check('artifact: cost_unit names the unit and what it is not',
  a.cost_unit?.unit === '$ per 1,000 decisions' && a.cost_unit?.not_unit === '$ per 1,000 tokens', a.cost_unit);
check('artifact: the worked example spells the tariff unit out', /per MILLION input tokens/.test(a.cost_unit.worked_example), '');
check('artifact: the Cost scoring text says it is not per 1,000 tokens', /not per 1,000 tokens/i.test(a.scoring.cost), a.scoring.cost.slice(0, 120));

// --- CR-96.3 the unit, visible on the page, desktop + phone, light + dark ---
const b = await chromium.launch();
try {
  for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1100 }], ['mobile', { width: 390, height: 844 }]]) {
    const m = kind === 'mobile'; const tag = `${kind}_${theme}`;
    const c = await b.newContext({ viewport: vp, isMobile: m, hasTouch: m, colorScheme: theme, deviceScaleFactor: m ? 2 : 1 });
    await c.addInitScript((t) => { try { localStorage.setItem('bh-theme', t); } catch {} }, theme);
    const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    try {
      await p.goto(`${BASE}/jev-models`, { waitUntil: 'networkidle', timeout: 60000 });
      const notes = await p.$$eval('[data-bh-jev12-cost-unit]', (e) => e.map((x) => x.textContent || ''));
      check(`${tag}: the "decisions, not tokens" note is on the page`, notes.length >= 1 && notes.every((t) => /per 1,000 decisions/.test(t) && /not \$ per 1,000 tokens/.test(t)), notes[0]?.slice(0, 160));
      const panel = (await p.textContent('[data-bh-jev12-cost-unit-panel]')) || '';
      check(`${tag}: the cost section opens with the unit`, /not per 1,000 tokens/i.test(panel) && /per MILLION input tokens/.test(panel), panel.slice(0, 200));
      const head = (await p.textContent('[data-bh-jev12-table] thead')) || '';
      check(`${tag}: the table header says decisions, not tokens`, /\$ per 1,000/.test(head) && /decisions, not tokens/.test(head), head.slice(0, 200));
      check(`${tag}: the eyebrow says ${a.revision}`, ((await p.textContent('[data-bh-jevc-chart] .bh-eyebrow')) || '').includes(a.revision), '');
      const jevBar = (await p.textContent('[data-bh-jevc-bars] [data-bh-jev12-bar="jev-1.13.0"]')) || '';
      check(`${tag}: Jev's bar shows 75.4`, jevBar.includes('75.4'), jevBar.slice(0, 160));
      // The correction is disclosed, not hidden.
      const det = await p.$('[data-bh-jev12-cost-correction]');
      check(`${tag}: the correction is disclosed`, !!det, '');
      if (det) {
        await det.evaluate((d) => d.setAttribute('open', 'open'));
        const t = (await det.textContent()) || '';
        check(`${tag}: the correction names all three mistakes and the before/after prices`,
          /counted once/i.test(t) && /556 rows/.test(t) && /452/.test(t) && /unparseable/i.test(t) && /0\.0406/.test(t) && /0\.0399/.test(t), t.slice(0, 240));
      }
      check(`${tag}: no page errors`, errs.length === 0, errs);
      await p.locator('[data-bh-jev-costs]').screenshot({ path: `${OUT}/${tag}-costs.png` });
    } finally { await c.close(); }
  }
} finally { await b.close(); }
const bad = checks.filter((x) => !x.ok);
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), passed: checks.length - bad.length, total: checks.length, checks }, null, 1));
console.log(`${BASE}: ${checks.length - bad.length}/${checks.length}`); for (const x of bad) console.log('FAIL', x.name, x.detail);
process.exit(bad.length ? 1 : 0);
