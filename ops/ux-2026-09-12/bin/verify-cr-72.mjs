// CR-72.1 — mobile hero typography: neither approved hero sentence may leave a single
// final word alone on a line. Measures real line boxes per sentence (word ranges grouped
// by their top edge), so it reports what the browser actually did, not what the CSS asks for.
// Usage: node verify-cr-72.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');

const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-72';
await fs.mkdir(OUT, { recursive: true });

const goto = async (page, url) => { for (let a = 1; ; a++) { try { return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }); } catch (e) { if (a >= 3 || !/ERR_NETWORK_CHANGED|ERR_CONNECTION|ERR_TIMED_OUT|Timeout|ERR_INTERNET/.test(String(e))) throw e; await new Promise((r) => setTimeout(r, 3000 * a)); } } };
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });

// Sentence = one line-broken run of the h1 (the text before the <br> and the <span> after it).
const measure = (page) => page.evaluate(() => {
  const h1 = document.querySelector('h1.bh-display');
  if (!h1) return null;
  const segments = []; let current = null;
  for (const node of h1.childNodes) {
    // A <br> ends a sentence, and so does a child that lays out as its own block.
    if (node.nodeType === 1 && node.tagName === 'BR') { current = null; continue; }
    const ownBlock = node.nodeType === 1 && getComputedStyle(node).display !== 'inline';
    if (ownBlock) current = null;
    const texts = node.nodeType === 3 ? [node] : [...node.childNodes].filter((n) => n.nodeType === 3);
    for (const t of texts) {
      if (!t.textContent.trim()) continue;
      if (!current) { current = []; segments.push(current); }
      current.push(t);
    }
    if (ownBlock) current = null;
  }
  const style = getComputedStyle(h1);
  const out = segments.map((nodes) => {
    const lines = [];
    for (const node of nodes) {
      const text = node.textContent;
      // Word = run of non-space characters; NBSP counts as part of a word (it cannot break).
      const re = /[^ \t\n\r]+/g; let m;
      while ((m = re.exec(text))) {
        const range = document.createRange();
        range.setStart(node, m.index); range.setEnd(node, m.index + m[0].length);
        const rect = range.getBoundingClientRect();
        const top = Math.round(rect.top);
        let line = lines.find((l) => Math.abs(l.top - top) <= 3);
        if (!line) { line = { top, words: [], right: 0 }; lines.push(line); }
        line.words.push(m[0]); line.right = Math.max(line.right, rect.right);
      }
    }
    lines.sort((a, b) => a.top - b.top);
    return { text: nodes.map((n) => n.textContent).join(''), lines: lines.map((l) => ({ words: l.words, right: Math.round(l.right) })) };
  });
  const box = h1.getBoundingClientRect();
  return { segments: out, fontSize: style.fontSize, lineHeight: style.lineHeight, wrap: style.textWrap || style.textWrapStyle || '',
    heroRight: Math.round(box.right), docOverflow: Math.round(document.documentElement.scrollWidth - document.documentElement.clientWidth) };
});

const browser = await chromium.launch();
const report = {};
for (const theme of ['light', 'dark']) {
  for (const [kind, viewport, mobile] of [['360', { width: 360, height: 780 }, true], ['390', { width: 390, height: 844 }, true], ['430', { width: 430, height: 932 }, true], ['768', { width: 768, height: 1024 }, false], ['1440', { width: 1440, height: 1000 }, false]]) {
    const tag = `${kind}_${theme}`;
    const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, colorScheme: theme });
    const page = await context.newPage(); const errors = [];
    page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
    await goto(page, `${BASE}/`);
    await page.evaluate((t) => { try { localStorage.clear(); localStorage.setItem('bh-theme', t); } catch {} }, theme);
    await page.reload().catch(() => {});
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(800);
    const m = await measure(page);
    report[tag] = m;
    check(`${tag} hero found`, !!m && m.segments.length === 2, m ? `${m.segments.length} segments` : 'missing');
    if (m) {
      for (const [i, seg] of m.segments.entries()) {
        const last = seg.lines[seg.lines.length - 1];
        const ok = seg.lines.length <= 1 || (last && last.words.length >= 2);
        check(`${tag} sentence ${i + 1}: no single-word final line`, ok, { lines: seg.lines.map((l) => l.words.join(' ')) });
        check(`${tag} sentence ${i + 1}: text stays inside the hero box`, seg.lines.every((l) => l.right <= m.heroRight + 1), { heroRight: m.heroRight, rights: seg.lines.map((l) => l.right) });
      }
      check(`${tag} no horizontal page overflow`, m.docOverflow <= 0, `${m.docOverflow}px`);
      check(`${tag} hero text not undersized`, parseFloat(m.fontSize) >= 16, m.fontSize);
    }
    check(`${tag} no page errors`, errors.length === 0, errors.slice(0, 2).join(' | '));
    await page.screenshot({ path: `${OUT}/${tag}-hero.png`, clip: { x: 0, y: 0, width: viewport.width, height: Math.min(viewport.height, 420) } }).catch(() => {});
    await context.close();
  }
}
await browser.close();
const passed = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), passed, total: checks.length, checks, report }, null, 2));
for (const c of checks) if (!c.ok) console.log(`FAIL  ${c.name}  ${c.detail}`);
console.log(`${passed}/${checks.length} checks passed — ${OUT}/verification.json`);
process.exit(passed === checks.length ? 0 : 1);
