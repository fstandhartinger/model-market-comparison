// Iteration 60 live verifier for P2-GAP-01: speed and context on the model page and in Compare, and no
// "0 t/s" for models Artificial Analysis has not speed-tested. Usage: node verify-p2-speed.mjs <base> <out>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = process.argv[2] || 'https://benchmarkheaven.com';
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/iter60-p2-speed/canonical';
await fs.mkdir(OUT, { recursive: true });

// Expected values straight from the live API, so the page is checked against the published data.
const api = async (path) => (await fetch(BASE + path)).json();
const measuredId = 'claude-opus-5::high', unmeasuredId = 'claude-opus-4.8::max';
const one = async (id) => { const r = await api(`/api/models/${encodeURIComponent(id)}`); return r.model ?? r; };
const measured = await one(measuredId), unmeasured = await one(unmeasuredId);
const ds = await api('/api/dataset');
const zeros = ds.models.filter((m) => m.aa_speed?.output_tps === 0 || m.aa_speed?.ttft_s === 0).length;

const b = await chromium.launch();
const res = { base: BASE, at: new Date().toISOString(), engine: 'claude-opus', pass: 0, fail: 0, results: [] };
const check = (id, name, ok, detail = '') => { res.results.push({ id, name, ok, detail }); res[ok ? 'pass' : 'fail']++; console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${name} ${detail}`); };
check('data', 'API: no model has speed or first-token time 0', zeros === 0, `zeros=${zeros}`);
check('data', `API: ${measuredId} has measured speed`, measured?.aa_speed?.output_tps > 0 && measured?.aa_speed?.ttft_s > 0, JSON.stringify(measured?.aa_speed));
check('data', `API: ${unmeasuredId} speed is null`, unmeasured?.aa_speed?.output_tps === null && unmeasured?.aa_speed?.ttft_s === null, JSON.stringify(unmeasured?.aa_speed));
const tps = Math.round(measured?.aa_speed?.output_tps ?? -1);

for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const tag = `${kind}_${theme}`;
  const c = await b.newContext({ viewport: vp, isMobile: kind === 'mobile', hasTouch: kind === 'mobile', colorScheme: theme, deviceScaleFactor: 1 });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const p = await c.newPage(); const errors = []; p.on('pageerror', (e) => errors.push(String(e)));
  const go = async (path) => { await p.goto(BASE + path, { waitUntil: 'networkidle' }); await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme); await p.waitForTimeout(600); };

  await go(`/models/${encodeURIComponent(measuredId)}`);
  const mp = await p.evaluate(() => {
    const line = document.querySelector('p[aria-label="Speed and context"]');
    const r = line?.getBoundingClientRect();
    return { text: line?.textContent?.replace(/\s+/g, ' ').trim() ?? null, tip: !!line?.querySelector('button'), right: r ? r.right : 0,
      inComposite: /t\/s|tokens\/s/.test(document.querySelector('section[aria-label="Composite and its inputs"]')?.textContent ?? ''), w: document.documentElement.scrollWidth };
  });
  check('model', `${tag} speed line shows ${tps} tokens/s, first token and context`, !!mp.text && mp.text.includes(`Output ${tps} tokens/s`) && /First token \d+(\.\d)? s/.test(mp.text) && /Context \d+(\.\d)?[MK] tokens/.test(mp.text), `"${mp.text}"`);
  check('model', `${tag} (i) present, speed no longer in the Composite card`, mp.tip && !mp.inComposite);
  check('overflow', `${tag} model page no overflow`, mp.w <= vp.width && mp.right <= vp.width, `w=${mp.w} right=${mp.right}`);
  await p.screenshot({ path: `${OUT}/${tag}-model.png` });
  if (kind === 'mobile') {
    await p.locator('p[aria-label="Speed and context"] button').first().click();
    await p.waitForTimeout(300);
    const dlg = await p.evaluate(() => { const d = [...document.querySelectorAll('dialog[open]')].find((e) => /Artificial Analysis/.test(e.textContent)); return d ? d.textContent.replace(/\s+/g, ' ').slice(0, 200) : null; });
    check('model', `${tag} (i) opens the explanation modal with the read date`, !!dlg && /read \d{4}-\d{2}-\d{2}/.test(dlg), `"${dlg}"`);
    await p.screenshot({ path: `${OUT}/${tag}-model-tip.png` });
    await p.keyboard.press('Escape');
  }

  await go(`/models/${encodeURIComponent(unmeasuredId)}`);
  const up = await p.evaluate(() => ({ body: document.body.innerText, line: document.querySelector('p[aria-label="Speed and context"]')?.textContent ?? null }));
  check('model', `${tag} unmeasured model shows no "0 t/s" / "Output 0"`, !/\b0 (t|tokens)\/s/.test(up.body) && !/Output 0\b/.test(up.body), `line="${up.line}"`);

  await go(`/compare?model=${encodeURIComponent(measuredId)}&model=${encodeURIComponent(unmeasuredId)}`);
  await p.waitForSelector('section[aria-label="Speed and context"]', { timeout: 20000 }).catch(() => {});
  const cp = await p.evaluate(() => {
    const s = document.querySelector('section[aria-label="Speed and context"]');
    const rows = s ? [...s.querySelectorAll('tbody tr')].map((tr) => [...tr.cells].map((td) => td.textContent.trim())) : [];
    return { rows, w: document.documentElement.scrollWidth, tableW: s?.querySelector('table')?.scrollWidth ?? 0, wrapW: s?.querySelector('.bh-table-wrap')?.clientWidth ?? 0 };
  });
  const [m1, m2] = cp.rows;
  check('compare', `${tag} Speed and context table has both models`, cp.rows.length === 2, JSON.stringify(cp.rows));
  check('compare', `${tag} measured row shows ${tps} tokens/s`, !!m1 && m1[1] === String(tps) && /s$/.test(m1[2]) && /[MK]$/.test(m1[3]), JSON.stringify(m1));
  check('compare', `${tag} unmeasured row shows dashes for speed`, !!m2 && m2[1] === '—' && m2[2] === '—', JSON.stringify(m2));
  check('overflow', `${tag} compare no page overflow, table fits its card`, cp.w <= vp.width && cp.tableW <= cp.wrapW + 1, `w=${cp.w} table=${cp.tableW} wrap=${cp.wrapW}`);
  await p.locator('section[aria-label="Speed and context"]').screenshot({ path: `${OUT}/${tag}-compare-speed.png` }).catch(() => {});
  check('errors', `${tag} no page errors`, errors.length === 0, errors.join('; ').slice(0, 200));
  await c.close();
}
await b.close();
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify(res, null, 1));
console.log(`${res.pass}/${res.pass + res.fail} passed`);
process.exit(res.fail ? 1 : 0);
