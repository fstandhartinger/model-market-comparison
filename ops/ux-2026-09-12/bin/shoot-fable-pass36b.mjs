// Fable pass-36 supplement: the bubble charts at 390/1440 (labels, overlaps, min font), a real weight-slider interaction (keyboard),
// the fast-lane banner expanded on a phone, and the custom-evaluation toast while the banner is up (7 s after load).
// Usage: node shoot-fable-pass36b.mjs <base> <out>   (CTX=<kind_theme>)
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/fable-20260926-pass36/canonical';
await fs.mkdir(OUT, { recursive: true });
const metrics = { base: BASE, at: new Date().toISOString(), shots: {}, errors: {} };
const bxFn = `const bx = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height), vy: Math.round(r.y) }; };
const txt = (el) => el ? String(el.innerText ?? el.textContent ?? '').replace(/\\s+/g, ' ').trim() : null;
const vis = (el) => el && el.checkVisibility && el.checkVisibility({ visibilityProperty: true, contentVisibilityAuto: true });`;
const bubbleInfo = new Function(`${bxFn}
  return [...document.querySelectorAll('[data-bh-jev-bubble]')].map((f) => { const svg = f.querySelector('svg'); const labels = [...f.querySelectorAll('[data-bh-jev-bubble-label] text')].map((t) => ({ ...bx(t), t: txt(t), fs: getComputedStyle(t).fontSize }));
    let overlaps = 0; for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) { const a = labels[i], b = labels[j]; if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) overlaps++; }
    const texts = [...f.querySelectorAll('svg text')].filter(vis).map((t) => ({ t: txt(t).slice(0, 24), fs: parseFloat(getComputedStyle(t).fontSize) }));
    const small = texts.filter((t) => t.fs < 10); const points = f.querySelectorAll('[data-bh-jev-bubble-point]').length;
    return { kind: f.getAttribute('data-bh-jev-bubble'), ...bx(f), svg: bx(svg), labels, overlaps, points, texts: texts.length, minFs: Math.min(...texts.map((t) => t.fs)), small: small.slice(0, 8), caption: txt(f.querySelector('figcaption')) }; });`);
const chartInfo = new Function(`${bxFn}
  const fig = document.querySelector('[data-bh-jev14-chart]'); if (!fig) return null;
  const rows = [...fig.querySelectorAll('[data-bh-jev14-row]')].slice(0, 5).map((r) => ({ t: txt(r).slice(0, 80), score: txt(r.querySelector('[data-bh-jev14-bar-score], [data-bh-jev14-score]')) }));
  const status = [...fig.querySelectorAll('.bh-jevc-official, .bh-jevc-notdefault')].map((e) => ({ t: txt(e), vis: !!vis(e) }));
  const pressed = [...fig.querySelectorAll('[data-bh-jev-preset][aria-pressed="true"]')].map((b) => txt(b));
  const weights = [...fig.querySelectorAll('[data-bh-jev-weights="above"] input[type=range]')].map((i) => i.value);
  const sub = txt(fig.querySelector('h2 + p'));
  const h2 = fig.querySelector('h2'); const firstRow = fig.querySelector('[data-bh-jev14-row]');
  const sortLink = [...fig.querySelectorAll('a')].filter((a) => /Sort by/.test(txt(a))).map((a) => txt(a));
  const viewBtns = [...fig.querySelectorAll('[role=group][aria-label="View the field by"] *')].filter((e) => /^(BUTTON|A)$/.test(e.tagName)).map((b) => b.tagName + ' ' + txt(b));
  const presetsBox = fig.querySelector('[data-bh-jev-weights="above"]');
  return { rows, status, pressed, weights, sub, h2y: bx(h2).y, firstRowY: firstRow ? bx(firstRow).y : null, gap: firstRow ? bx(firstRow).y - bx(h2).y : null, sortLink, viewBtns, presetsBox: bx(presetsBox), presetLines: presetsBox ? Math.round(presetsBox.querySelector('div').getBoundingClientRect().height / 34) : null };`);
const overlayInfo = new Function(`${bxFn}
  const b = document.querySelector('[data-bh-fastlane-banner]'); const t = document.querySelector('.bh-custom-evaluation-toast');
  const B = b ? bx(b) : null, T = t ? bx(t) : null;
  const overlap = B && T ? Math.max(0, Math.min(B.vy + B.h, T.vy + T.h) - Math.max(B.vy, T.vy)) : null;
  return { banner: B ? { ...B, expanded: b.getAttribute('data-bh-fastlane-expanded'), t: txt(b).slice(0, 120) } : null, toast: T ? { ...T, t: txt(t).slice(0, 160), cls: t.className, bottom: getComputedStyle(t).bottom, zIndex: getComputedStyle(t).zIndex, vis: !!vis(t) } : null, bannerZ: b ? getComputedStyle(b).zIndex : null, overlapPx: overlap, innerHeight };`);
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const mobile = kind === 'mobile'; const tag = `${kind}_${theme}`;
  if (process.env.CTX && process.env.CTX !== tag) continue;
  if (theme === 'dark' && !mobile) continue; // desktop dark bubbles: covered by the main run's full shot; keep the supplement short
  const b = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
  const c = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme, deviceScaleFactor: mobile ? 2 : 1 });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const p = await c.newPage(); p.setDefaultTimeout(15000); metrics.errors[tag] = [];
  p.on('pageerror', (e) => metrics.errors[tag].push({ url: p.url(), message: String(e.message).slice(0, 300) }));
  const rec = async (name) => { await p.screenshot({ path: `${OUT}/${tag}-${name}.png` }); };
  const scrollTo = async (sel, dy = -60) => { await p.locator(sel).first().evaluate((el, d) => window.scrollTo(0, el.getBoundingClientRect().top + scrollY + d), dy); await p.waitForTimeout(700); };
  try {
    const t0 = Date.now();
    await p.goto(BASE + '/jev-models', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
    await p.waitForLoadState('networkidle').catch(() => {});
    // toast + banner: 7 s after load
    const wait = 7500 - (Date.now() - t0); if (wait > 0) await p.waitForTimeout(wait);
    await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(300);
    metrics.shots[`${tag}-overlay-7s`] = await p.evaluate(overlayInfo); await rec('overlay-7s');
    await p.waitForTimeout(10000); metrics.shots[`${tag}-overlay-17s`] = await p.evaluate(overlayInfo); await rec('overlay-17s');
    if (mobile) { const teaser = p.locator('.bh-fastlane-teaser'); if (await teaser.count()) { await teaser.click(); await p.waitForTimeout(600); metrics.shots[`${tag}-banner-expanded`] = await p.evaluate(overlayInfo); await rec('banner-expanded'); await p.locator('.bh-fastlane-teaser').click().catch(() => {}); await p.waitForTimeout(400); } }
    // bubbles
    await scrollTo('[data-bh-jev-bubble="cost"]', -40); await rec('bubble-cost');
    await scrollTo('[data-bh-jev-bubble="speed"]', -40); await rec('bubble-speed');
    metrics.shots[`${tag}-bubbles`] = await p.evaluate(bubbleInfo);
    if (mobile) { await p.locator('[data-bh-jev-bubble="cost"] [data-bh-jev-bubble-point]').first().tap().catch(() => {}); await p.waitForTimeout(500); await rec('bubble-cost-tapped'); }
    // chart + sliders via keyboard
    await scrollTo('[data-bh-jev14-chart]', -20); metrics.shots[`${tag}-chart-before`] = await p.evaluate(chartInfo); await rec('chart-top');
    const s = p.locator('[data-bh-jev-weights="above"] [data-bh-jev-weight="intelligence"]');
    await s.focus(); for (let i = 0; i < 6; i++) await p.keyboard.press('ArrowRight'); await p.waitForTimeout(900);
    metrics.shots[`${tag}-chart-after`] = await p.evaluate(chartInfo); await scrollTo('[data-bh-jev14-chart]', -20); await rec('chart-custom');
    await scrollTo('[data-bh-jev14-row]', -140); await rec('chart-custom-rows');
    await p.locator('[data-bh-jev-preset="Official 25:25:25:25"]').first().click().catch(() => {}); await p.waitForTimeout(600);
    metrics.shots[`${tag}-chart-reset`] = await p.evaluate(chartInfo);
  } catch (e) { metrics.shots[`${tag}-err`] = String(e).slice(0, 300); }
  await fs.writeFile(`${OUT}/metrics-b-${tag}.json`, JSON.stringify(metrics, null, 1));
  await c.close(); await b.close();
}
await fs.writeFile(`${OUT}/metrics-b.json`, JSON.stringify(metrics, null, 1));
console.log(JSON.stringify(metrics, null, 1).slice(0, 12000));
