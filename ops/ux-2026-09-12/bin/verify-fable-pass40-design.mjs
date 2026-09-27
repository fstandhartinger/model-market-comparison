// Fable pass-40 live verifier (non-Fable engines run it before flipping a row to verified).
// Usage: node verify-fable-pass40-design.mjs <base> <outDir>   ONLY=F-212 (or F-213, F-214, F-215) restricts the groups.
// Groups, all on the JevBench v1.4.2.2 surface (CR-191):
//   F-212  the pair pages' JSON-LD dataset record points at the API and method doc of the release it describes; a leaf's class title names that release;
//   F-213  no "NaN" anywhere on the hub compare, the Imajev-4B leaf and the Jev-vs-Imajev pair page; the sealed radar draws two series; no NaN SVG console errors;
//   F-214  a Jev-vs page prints the release's top-five note only when it names Jev and that page's rival (v1.4.2.2's names neither, so none prints it);
//   F-215  the leaf's pooled family radar never calls a ranked row "a partial run"; an unpublished breakdown is said as such.
// Launches its own Chromium. Writes <outDir>/verification.json, exits 1 on any failing check.
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-fable-pass40';
const ONLY = process.env.ONLY || null;
await fs.mkdir(OUT, { recursive: true });
const { JEV_COMPARISONS } = await import(new URL('../../../lib/jevbench-seo.mjs', import.meta.url));
const { readJevbenchV1422 } = await import(new URL('../../../lib/jevbench-v1422.mjs', import.meta.url));
const { artifact } = await readJevbenchV1422(new URL('../../..', import.meta.url).pathname.replace(/\/$/, ''));
const REV = artifact.revision;
const NOTE = artifact.top_five_note ?? '';
const TOP = artifact.systems.filter((s) => s.ranked).sort((a, b) => a.rank - b.rank)[0];
const shortName = (d) => d.split(' (')[0].split(', formerly')[0];
const checks = [];
const check = (group, ctx, name, ok, detail = '') => { checks.push({ group, ctx, name, ok: !!ok, detail: String(detail).slice(0, 400) }); if (!ok) console.log(`FAIL ${group} ${ctx} ${name} :: ${String(detail).slice(0, 200)}`); };
const want = (g) => !ONLY || g === ONLY;
const goto = async (p, url) => { for (let a = 1; ; a++) { try { return await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 3000)); } } };
const probe = () => {
  const txt = (el) => el ? String(el.innerText ?? el.textContent ?? '').replace(/\s+/g, ' ').trim() : '';
  const main = document.querySelector('main') || document.body;
  const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent).join(' ');
  const radars = [...document.querySelectorAll('[data-bh-jev14-radar]')].map((f) => ({ key: f.getAttribute('data-bh-jev14-radar'), polygons: f.querySelectorAll('svg polygon, svg path[data-series], svg polyline').length, texts: [...f.querySelectorAll('svg text')].map((t) => txt(t)), missing: txt(f.querySelector('[data-bh-jev14-radar-missing]')) || null, nan: /NaN/.test(txt(f)) }));
  const note = document.querySelector('[data-bh-jev-top-five-note]');
  const code = document.querySelector('[data-bh-jev-system-subline] code');
  return {
    text: txt(main), nanCount: (txt(main).match(/NaN/g) || []).length, ldContent: (ld.match(/\/api\/jevbench\/[^"]+/g) || []), ldCite: (ld.match(/blob\/[^/"]+\//g) || []), ldVersion: (ld.match(/"version":"([^"]+)"/) || [])[1] || null,
    radars, note: note ? txt(note) : null, codeTitle: code ? code.getAttribute('title') : null, h1: txt(main.querySelector('h1')),
    compareA: document.querySelector('[data-bh-jev14-compare]')?.getAttribute('data-bh-jev14-compare-a') || null, compareB: document.querySelector('[data-bh-jev14-compare]')?.getAttribute('data-bh-jev14-compare-b') || null,
  };
};
const browser = await chromium.launch();
try {
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const mobile = kind === 'mobile'; const ctx = `${kind}_${theme}`;
  const c = await browser.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  try {
    const p = await c.newPage(); p.setDefaultTimeout(20000);
    const errors = []; p.on('pageerror', (e) => errors.push(String(e.message))); p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    const open = async (path) => { errors.length = 0; await goto(p, BASE + path); await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme); await p.waitForFunction(() => !document.querySelector('.bh-deferred'), null, { timeout: 60000 }).catch(() => {}); await p.waitForLoadState('networkidle').catch(() => {}); await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 800) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } window.scrollTo(0, 0); }); await p.waitForTimeout(800); return p.evaluate(probe); };
    const nanErrors = () => errors.filter((e) => /NaN/.test(e));
    // The pair pages: F-212 (JSON-LD), F-213 (no NaN), F-214 (the note).
    for (const pair of JEV_COMPARISONS.slice(0, 3)) {
      const m = await open(`/jev-models/${pair.slug}`);
      const rival = artifact.systems.find((s) => s.key === pair.key);
      if (want('F-212')) {
        check('F-212', ctx, `${pair.slug}: JSON-LD contentUrl is the API of the rendered release`, m.ldContent.length >= 1 && m.ldContent.every((u) => u === `/api/jevbench/${REV}`), JSON.stringify(m.ldContent));
        check('F-212', ctx, `${pair.slug}: JSON-LD citation is tagged with the rendered release`, m.ldCite.length >= 1 && m.ldCite.every((u) => u === `blob/${REV}/`), JSON.stringify(m.ldCite));
        check('F-212', ctx, `${pair.slug}: JSON-LD version equals the rendered release`, m.ldVersion === REV, String(m.ldVersion));
      }
      if (want('F-213')) {
        check('F-213', ctx, `${pair.slug}: no "NaN" in the page text`, m.nanCount === 0, `${m.nanCount} × NaN`);
        check('F-213', ctx, `${pair.slug}: no NaN SVG console errors`, nanErrors().length === 0, nanErrors().slice(0, 2).join(' | '));
        const sealed = m.radars.find((r) => r.key === 'sealed');
        check('F-213', ctx, `${pair.slug}: the sealed radar draws two series or names who has none`, sealed && (sealed.polygons >= 2 || sealed.missing), JSON.stringify(sealed && { polygons: sealed.polygons, missing: sealed.missing }));
      }
      if (want('F-214')) {
        const shouldShow = rival && rival.rank === 1 && /\bJev\b/.test(NOTE) && NOTE.includes(shortName(rival.display));
        check('F-214', ctx, `${pair.slug}: the top-five note is printed only when it names Jev and ${shortName(rival?.display ?? pair.label)}`, shouldShow ? m.note === NOTE : m.note === null, JSON.stringify({ note: m.note, shouldShow }));
        check('F-214', ctx, `${pair.slug}: the head does not mention a system outside the pair via the note`, !m.note || !JEV_COMPARISONS.filter((q) => q.key !== pair.key).some((q) => m.note.includes(q.label)), m.note ?? '');
      }
    }
    // The #1 leaf: F-213, F-215, F-212 (the class title where a class key is printed).
    if (want('F-213') || want('F-215') || want('F-212')) {
      const m = await open(`/jev-models/${encodeURIComponent(TOP.key)}`);
      if (want('F-213')) {
        check('F-213', ctx, `${TOP.key} leaf: no "NaN" in the page text`, m.nanCount === 0, `${m.nanCount} × NaN`);
        check('F-213', ctx, `${TOP.key} leaf: no NaN SVG console errors`, nanErrors().length === 0, nanErrors().slice(0, 2).join(' | '));
        const sealed = m.radars.find((r) => r.key === 'sealed');
        check('F-213', ctx, `${TOP.key} leaf: the sealed radar draws two series or names who has none`, sealed && (sealed.polygons >= 2 || sealed.missing), JSON.stringify(sealed && { polygons: sealed.polygons, missing: sealed.missing }));
      }
      if (want('F-215')) {
        const hard = m.radars.find((r) => r.key === 'hard');
        check('F-215', ctx, `${TOP.key} leaf: the pooled family radar never calls this ranked row a partial run`, hard && !(hard.missing || '').includes(`${shortName(TOP.display)} was not run`) && !new RegExp(`${shortName(TOP.display)}[^.]*partial run`).test(hard.missing || ''), hard?.missing ?? 'no hard radar');
        check('F-215', ctx, `${TOP.key} leaf: an unpublished breakdown is said as such (or nothing is missing)`, hard && (!hard.missing || /no published hard-tier family breakdown/.test(hard.missing) || !hard.missing.includes(shortName(TOP.display))), hard?.missing ?? 'no hard radar');
      }
      const withClass = artifact.systems.find((s) => s.ranked && s.class === 'system-one-open');
      if (want('F-212') && withClass) {
        const l = await open(`/jev-models/${encodeURIComponent(withClass.key)}`);
        check('F-212', ctx, `${withClass.key} leaf: the class code's title names the rendered release`, l.codeTitle === null || l.codeTitle.includes(REV), String(l.codeTitle));
        check('F-212', ctx, `${withClass.key} leaf: the class code's title does not name an older release`, !(l.codeTitle || '').includes('v1.4.2 artifact'), String(l.codeTitle));
      }
    }
    // The hub's own compare (defaults to Jev vs the #1): F-213.
    if (want('F-213')) {
      const m = await open('/jev-models');
      check('F-213', ctx, 'hub: no "NaN" in the page text', m.nanCount === 0, `${m.nanCount} × NaN`);
      check('F-213', ctx, 'hub: no NaN SVG console errors', nanErrors().length === 0, nanErrors().slice(0, 2).join(' | '));
      const sealed = m.radars.find((r) => r.key === 'sealed');
      check('F-213', ctx, `hub compare (${m.compareA} vs ${m.compareB}): the sealed radar draws two series or names who has none`, sealed && (sealed.polygons >= 2 || sealed.missing), JSON.stringify(sealed && { polygons: sealed.polygons, missing: sealed.missing }));
    }
  } finally { await c.close(); }
}
} finally { await browser.close(); }
const pass = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), only: ONLY, revision: REV, pass, total: checks.length, checks }, null, 1));
console.log(`${pass}/${checks.length} checks passed (${BASE}${ONLY ? `, ONLY=${ONLY}` : ''})`);
process.exit(pass === checks.length ? 0 : 1);
