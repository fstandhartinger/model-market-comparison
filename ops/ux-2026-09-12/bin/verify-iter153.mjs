// Iteration 153 live check (claude-opus): the one-benchmark ranking rows spell every harness with the shared
// cohort label (bc5f3cb's last raw site), and the CR-63.22 glyph rule holds — internal links end in "→",
// links that leave the site end in "↗". Usage: node verify-iter153.mjs <base-url> <out-dir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');

const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-iter153';
await fs.mkdir(OUT, { recursive: true });
const REV = (await (await fetch(`${BASE}/api/meta`)).json()).revision;
const RAW = /harness (claude code|claude-code|grok|grok-build|antigravity|musecode|kimi cli|qwen coder)\b(?! Build| CLI| Code| Coder)/;
const LABELS = ['Claude Code', 'Codex', 'Kimi CLI', 'Qwen Coder', 'Grok Build', 'Antigravity CLI', 'Muse Code', 'mini-SWE-agent'];
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: !!ok, detail });
const settle = (p) => p.waitForLoadState('networkidle').catch(() => {}).then(() => p.waitForTimeout(1500));

const browser = await chromium.launch();
try {
  for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
    const tag = `${kind}_${theme}`, mobile = kind === 'mobile';
    const c = await browser.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme });
    await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
    const p = await c.newPage(); const errors = [];
    p.on('pageerror', (e) => errors.push(String(e)));
    try {
      await p.goto(`${BASE}/benchmarks?benchmark=${encodeURIComponent('rsi-exam::0.1')}&v=${Date.now()}`, { waitUntil: 'domcontentloaded' });
      await settle(p);
      const harnessSelect = p.locator('label', { hasText: 'Evaluation group / harness' }).locator('select');
      await harnessSelect.waitFor({ timeout: 20000 }).catch(() => {});
      const options = await harnessSelect.locator('option').allTextContents();
      check(`${tag}: RSI-Exam ranking offers several harness groups, all labelled`, options.length >= 3 && options.every((o) => LABELS.some((l) => o.startsWith(l))), options);
      for (let i = 0; i < options.length; i++) {
        await harnessSelect.selectOption({ index: i }); await settle(p);
        const lines = (await p.locator('main table').first().innerText().catch(() => '')).match(/harness [^\n·]+/g) ?? [];
        const label = options[i].split(' · ')[0];
        check(`${tag}: "${label}" ranking rows say "harness ${label}", never the raw slug`, lines.length > 0 && lines.every((l) => l.trim() === `harness ${label}`) && !lines.some((l) => RAW.test(l)), lines.slice(0, 3));
      }
      await p.screenshot({ path: `${OUT}/${tag}-rsi-ranking.png` }).catch(() => {});
      const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(`${tag}: ranking page has no horizontal overflow`, overflow <= 1, String(overflow));
      for (const path of ['/', '/benchmarks?benchmark=rsi-exam%3A%3A0.1', '/models/grok-4.6%3A%3Axhigh', '/about', '/compare']) {
        await p.goto(`${BASE}${path}${path.includes('?') ? '&' : '?'}v=${Date.now()}`, { waitUntil: 'domcontentloaded' }); await settle(p);
        await p.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
        await p.waitForTimeout(600);
        const bad = await p.evaluate(() => [...document.querySelectorAll('a[href]')].flatMap((a) => {
          const t = (a.textContent || '').trim(), url = new URL(a.href, location.href), internal = url.origin === location.origin && a.target !== '_blank';
          return (internal && t.endsWith('↗')) || (!internal && t.endsWith('→')) ? [`${internal ? 'internal' : 'external'}: ${t.slice(-60)}`] : [];
        }));
        check(`${tag}: ${path} — in-site links end in →, new-tab/external links in ↗`, bad.length === 0, bad.slice(0, 5));
      }
      check(`${tag}: no page errors`, errors.length === 0, errors.slice(0, 3));
    } finally { await c.close(); }
  }
} finally { await browser.close(); }
const passed = checks.filter((x) => x.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, revision: REV, runner: 'claude-opus (iteration 153)', at: new Date().toISOString(), passed, total: checks.length, checks }, null, 2));
for (const x of checks) if (!x.ok) console.log(`FAIL ${x.name} — ${JSON.stringify(x.detail).slice(0, 300)}`);
console.log(`${BASE} @ ${REV}: ${passed}/${checks.length}`);
process.exit(passed === checks.length ? 0 : 1);
