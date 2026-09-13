// Fable pass-4 acceptance: F-29 (dark labels), F-30 (Guided→Simple floor), F-33 (Benchmaxxing card/labels), F-34 (Benchmarks header + bars).
// Usage: node verify-fable-pass4.mjs <base-url> <out-dir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = process.argv[2] || 'https://benchmarkheaven.com';
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/fable-20260913-pass4/acceptance';
await fs.mkdir(OUT, { recursive: true });
const b = await chromium.launch(); const out = { base: BASE, checked_at: new Date().toISOString(), fails: [] };
const expect = (k, ok, detail) => { out[k] = { ok, detail }; if (!ok) out.fails.push(k); };
for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const c = await b.newContext({ viewport: vp, isMobile: kind === 'mobile', colorScheme: 'dark' });
  await c.addInitScript(() => { try { localStorage.setItem('theme', 'dark'); localStorage.setItem('bh-theme', 'dark'); } catch {} });
  const p = await c.newPage();
  const go = async (path) => { await p.goto(BASE + path, { waitUntil: 'networkidle' }); await p.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark')); await p.waitForTimeout(800); };
  // F-29 / F-30
  await go('/');
  const rd = () => p.evaluate(() => ({ pass: document.body.innerText.match(/(\d+) models pass/)?.[1], ranges: [...document.querySelectorAll('input[type=range]')].map((r) => r.value), fills: [...new Set([...document.querySelectorAll('svg text')].filter((t) => !t.getAttribute('class')).map((t) => getComputedStyle(t).fill))] }));
  const s0 = await rd();
  expect(`${kind}/F-29 dark label fill not black`, s0.fills.length > 0 && !s0.fills.includes('rgb(0, 0, 0)'), s0.fills);
  await p.getByRole('tab', { name: 'Guided' }).click(); await p.waitForTimeout(600);
  for (let i = 0; i < 4; i++) { const btn = p.getByRole('button', { name: /^(Continue|See results|Show results)/i }).first(); if (await btn.count()) { await btn.click(); await p.waitForTimeout(400); } }
  await p.getByRole('tab', { name: 'Simple' }).click(); await p.waitForTimeout(800);
  const s1 = await rd();
  expect(`${kind}/F-30 Simple keeps 86 (>85) after Guided`, s1.ranges[0] === '86' && s1.pass === s0.pass, s1);
  // F-33
  await go('/benchmaxxing');
  const bmx = await p.evaluate(() => {
    const aside = [...document.querySelectorAll('aside')].find((a) => /Benchmaxxing signal/i.test(a.innerText));
    const labels = ['Writing', 'Agentic', 'Coding'].map((t) => { const el = [...document.querySelectorAll('span, text')].find((e) => e.textContent.trim() === t && e.closest('.relative, svg')); return el ? { t, h: Math.round(el.getBoundingClientRect().height) } : { t, h: null }; });
    return { asideH: aside ? Math.round(aside.getBoundingClientRect().height) : null, labels, scrollWidth: document.documentElement.scrollWidth };
  });
  if (kind === 'desktop') expect('desktop/F-33 signal card ≤ 360 px', bmx.asideH != null && bmx.asideH <= 360, bmx.asideH);
  if (kind === 'mobile') expect('mobile/F-33 sector labels ≥ 10 px tall', bmx.labels.every((l) => l.h != null && l.h >= 10), bmx.labels);
  expect(`${kind}/F-33 no overflow`, bmx.scrollWidth <= vp.width + 1, bmx.scrollWidth);
  await p.screenshot({ path: `${OUT}/${kind}-benchmaxxing.png` });
  // F-34
  await go('/benchmarks');
  const bm = await p.evaluate(() => { const t = document.body.innerText; return { noBox: !t.includes('Source identities not yet matched'), noCoverageSentence: !t.includes('Coverage above uses'), bars: document.querySelectorAll('table span[style*="width"]').length, height: document.documentElement.scrollHeight, hasLine: /of \d+ catalog configurations have a result/.test(t) }; });
  expect(`${kind}/F-34 header trimmed`, bm.noBox && bm.noCoverageSentence && bm.hasLine, bm);
  expect(`${kind}/F-34 ≥ 25 result bars`, bm.bars >= 25, bm.bars);
  if (kind === 'desktop') expect('desktop/F-34 height ≤ 2,700 px', bm.height <= 2700, bm.height);
  await p.screenshot({ path: `${OUT}/${kind}-benchmarks.png` });
  await c.close();
}
await b.close();
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
process.exit(out.fails.length ? 1 : 0);
