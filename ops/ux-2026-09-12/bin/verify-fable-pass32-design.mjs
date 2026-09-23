// Live verifier for Fable pass 32 (F-168) — for a non-Fable engine to run on both hosts before the Done-log row reads `verified`.
// Usage: node verify-fable-pass32-design.mjs <base> <outDir>
//   F-168 on the per-system JevBench pages (CR-129): /jev-models/jev-1.13.0 (ranked #1), /jev-models/semif-qwen3.5-4b (ranked #2),
//   /jev-models/classifier-dev-fast (honorable mention), /jev-models/needle-3 (partial run, label-only):
//     - the head sub-line's type span carries the raw key only as data-bh-jev-system-cls and prints a label (no key from the class set
//       such as "jev-service" / "small-tool-model" / "llm-baseline" is visible anywhere in <main>);
//     - the score panel's status is one sentence: a ranked page says "Rank #n of N ranked systems."; an unranked page says "not ranked"
//       exactly once and never "Listed as a";
//     - the "points ahead of / behind Jev 1.13.0" sentence appears on the ranked non-Jev page only;
//     - the label-only page's Calibration card reads "none (label only)" (data-bh-jev-system-no-cal) with a non-empty title;
//     - the four pages: no page errors, no horizontal overflow, 1440/390 × light/dark. Exit code 1 on any failed check.
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || `/opt/benchmarkheaven/state/ux-evidence/fable-20260923-pass32/verify-${new URL(BASE).hostname}`;
await fs.mkdir(OUT, { recursive: true });
const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ' — ' + JSON.stringify(detail).slice(0, 300)}`); };
const b = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
const goto = async (p, url) => { for (let a = 1; ; a++) { try { return await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 3000)); } } };
let meta = null; try { meta = await (await fetch(`${BASE}/api/meta`)).json(); console.log('revision', meta.revision, 'generated_at', meta.generated_at); } catch { console.log('no /api/meta'); }
const PAGES = [['jev-1.13.0', 'ranked-jev'], ['semif-qwen3.5-4b', 'ranked'], ['classifier-dev-fast', 'honorable'], ['needle-3', 'partial-label-only']];
const RAW_KEYS = ['jev-rebuild', 'llm-baseline', 'small-tool-model', 'jev-service', 'decision-api'];
const geom = () => {
  const main = document.querySelector('main'); const t = (el) => el ? el.innerText.replace(/\s+/g, ' ').trim() : null;
  const cls = main.querySelector('[data-bh-jev-system-cls]');
  const status = main.querySelector('[data-bh-jev-system-score] p.bh-muted');
  const vs = main.querySelector('[data-bh-jev-system-vs-jev]');
  const noCal = main.querySelector('[data-bh-jev-system-no-cal]');
  const calCard = [...main.querySelectorAll('dl > div')].find((d) => /Calibration/.test(d.textContent));
  return { text: t(main), clsKey: cls ? cls.getAttribute('data-bh-jev-system-cls') : null, clsText: t(cls), status: t(status), vs: t(vs), noCal: noCal ? { t: t(noCal), title: noCal.getAttribute('title') } : null, cal: t(calCard), sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth };
};
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const mobile = kind === 'mobile';
  const c = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme, deviceScaleFactor: 1 });
  await c.addInitScript((th) => { try { localStorage.setItem('theme', th); localStorage.setItem('bh-theme', th); } catch {} }, theme);
  const p = await c.newPage(); const tag = `${kind}-${theme}`; const errors = [];
  p.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  for (const [key, kindOf] of PAGES) {
    await goto(p, `${BASE}/jev-models/${key}`); await p.evaluate((th) => document.documentElement.setAttribute('data-theme', th), theme);
    await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(400);
    const g = await p.evaluate(geom); await p.screenshot({ path: `${OUT}/${tag}-${key}.png` });
    const id = `${tag}/${key}`;
    check(`${id}/type-is-labelled`, g.clsKey && g.clsText && g.clsText !== g.clsKey && !RAW_KEYS.some((k) => g.text.includes(k)) && !/\bjev\b/.test(g.clsText === 'Jev' ? '' : g.clsText), { clsKey: g.clsKey, clsText: g.clsText });
    const notRanked = (g.status || '').match(/not ranked/gi) || [];
    if (kindOf.startsWith('ranked')) check(`${id}/status-ranked`, /^Rank #\d+ of \d+ ranked systems\.$/.test(g.status || ''), g.status);
    else check(`${id}/status-one-sentence`, notRanked.length === 1 && !/Listed as a/.test(g.status) && (g.status.match(/\./g) || []).length === 1 && !/a honorable/.test(g.status), g.status);
    check(`${id}/vs-jev-only-when-ranked`, kindOf === 'ranked' ? /points (ahead of|behind) Jev 1\.13\.0/.test(g.vs || '') : !g.vs && !/points (ahead of|behind)/.test(g.text), { vs: g.vs });
    if (kindOf.endsWith('label-only')) check(`${id}/calibration-none-label-only`, g.noCal && /^none \(label only\)$/.test(g.noCal.t) && (g.noCal.title || '').length > 10, g.noCal);
    else check(`${id}/calibration-number`, !g.noCal && /Calibration \d+\.\d/.test(g.cal || ''), g.cal);
    check(`${id}/no-horizontal-overflow`, g.sw <= g.cw + 1, { sw: g.sw, cw: g.cw });
  }
  check(`${tag}/no-page-errors`, errors.length === 0, errors);
  await c.close();
}
await b.close();
const failed = results.filter((r) => !r.ok);
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, revision: meta?.revision ?? null, verified_at: new Date().toISOString(), passed: results.length - failed.length, total: results.length, results }, null, 1));
console.log(`${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
