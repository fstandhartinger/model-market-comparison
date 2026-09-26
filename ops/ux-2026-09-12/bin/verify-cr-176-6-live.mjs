// CR-176.6 live receipt: the "Capability, cost and speed in 3D" view labels all three axes and
// pins permanent labels on the top five models, in both the WebGL (DOM overlay) and the
// WebGL-disabled (SVG) render paths. Labels must survive rotation and follow the theme.
// Usage: node verify-cr-176-6-live.mjs <base> <outDir>
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');

const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr1766';
await fs.mkdir(OUT, { recursive: true });

const checks = [];
const check = (context, name, ok, detail) => checks.push({ context, name, ok: !!ok, detail: String(detail ?? '') });

const probe = () => {
  const scope = document.querySelector('[data-bh-jev14-capability-3d-view]') ?? document;
  const axis = [...scope.querySelectorAll('[data-bh-jev14-3d-axis-label]')].map((el) => ({
    name: el.getAttribute('data-bh-jev14-3d-axis-label'),
    text: (el.textContent || '').trim(),
    transform: el.style?.transform || null,
    x: el.getAttribute('x'),
    y: el.getAttribute('y'),
  }));
  const models = [...scope.querySelectorAll('[data-bh-jev14-3d-model-label]')].map((el) => ({
    key: el.getAttribute('data-bh-jev14-3d-model-label'),
    text: (el.textContent || '').trim(),
    transform: el.style?.transform || null,
    x: el.getAttribute('x'),
    y: el.getAttribute('y'),
  }));
  const webgl = !!scope.querySelector('canvas');
  const fallback = !!scope.querySelector('[data-bh-jev14-3d-fallback]');
  return { webgl, fallback, axis, models };
};

const rotate = () => {
  const canvas = document.querySelector('canvas');
  if (!canvas) return false;
  const rect = canvas.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX: x, clientY: y, bubbles: true, pointerId: 1, pointerType: 'mouse', button: 0 }));
  canvas.dispatchEvent(new PointerEvent('pointermove', { clientX: x + 90, clientY: y + 40, bubbles: true, pointerId: 1, pointerType: 'mouse' }));
  canvas.dispatchEvent(new PointerEvent('pointerup', { clientX: x + 90, clientY: y + 40, bubbles: true, pointerId: 1, pointerType: 'mouse' }));
  return true;
};

const browser = await chromium.launch({ headless: true });
try {
  for (const width of [{ w: 1440, h: 950, tag: 'desktop' }, { w: 390, h: 844, tag: 'phone' }]) {
    for (const scheme of ['light', 'dark']) {
      const context = `${width.tag}-${scheme}`;
      const c = await browser.newContext({ viewport: { width: width.w, height: width.h }, colorScheme: scheme });
      const p = await c.newPage();
      const errors = [];
      p.on('pageerror', (e) => errors.push(String(e)));
      await p.goto(`${BASE}/jev-models/v1.4.1`, { waitUntil: 'domcontentloaded', timeout: 90000 });
      // The 3D view loads after its section enters view; nudge it into the viewport until the
      // lazy component mounts (the IntersectionObserver then starts the WebGL library load).
      await p.waitForSelector('[data-bh-jev14-capability-3d-view]', { timeout: 30000 });
      await p.evaluate(() => document.querySelector('[data-bh-jev14-capability-3d-view]')?.scrollIntoView({ block: 'center' }));
      await p.waitForTimeout(500);
      await p.evaluate(() => document.querySelector('[data-bh-jev14-capability-3d-view]')?.scrollIntoView({ block: 'center' }));
      await p.waitForSelector('[data-bh-jev14-3d-axis-label]', { timeout: 45000, state: 'attached' });
      const first = await p.evaluate(probe);
      check(context, '3D view present', first.webgl || first.fallback, `webgl=${first.webgl} fallback=${first.fallback}`);
      const names = first.axis.map((a) => a.name).sort();
      check(context, 'CR-176.6: all three axis labels are named', JSON.stringify(names) === JSON.stringify(['capability', 'cost', 'speed']), JSON.stringify(names));
      const joined = first.axis.map((a) => a.text).join(' | ');
      check(context, 'CR-176.6: cost axis label names the axis', /Cost/.test(joined) && /cheaper|pricier/.test(joined), joined);
      check(context, 'CR-176.6: capability axis label names the axis', /Capability/.test(joined), joined);
      check(context, 'CR-176.6: speed axis label names the axis', /Speed/.test(joined), joined);
      check(context, 'CR-176.6: top five models are labelled', first.models.length === 5, first.models.map((m) => m.text).join(' ; '));
      check(context, 'CR-176.6: model labels carry a rank and name', first.models.every((m) => /^#\d\s/.test(m.text)), first.models.map((m) => m.text).slice(0, 2).join(' ; '));
      if (first.webgl) {
        const rotated = await p.evaluate(rotate) && await (async () => { await p.waitForTimeout(350); return p.evaluate(probe); })();
        const before = first.models.map((m) => m.transform || `${m.x},${m.y}`).join('|');
        const after = rotated.models.map((m) => m.transform || `${m.x},${m.y}`).join('|');
        check(context, 'CR-176.6: labels follow the model positions when the view rotates', before !== after, `${before.slice(0, 60)} -> ${after.slice(0, 60)}`);
        check(context, 'CR-176.6: the top five remain labelled after rotation', rotated.models.length === 5, rotated.models.length);
      }
      check(context, 'page errors', errors.length === 0, errors.slice(0, 3));
      const fig = p.locator('[data-bh-jev14-3d-axis-label]').first();
      if (await fig.count()) {
        const host = p.locator('[data-bh-jev14-capability-3d-view]').first();
        if (await host.count()) {
          await host.scrollIntoViewIfNeeded();
          await p.waitForTimeout(300);
          await host.screenshot({ path: `${OUT}/${context}-3d.png` });
        }
      }
      await c.close();
    }
  }

  // The SVG fallback path is vetted by disabling WebGL before any script runs.
  const c = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  await c.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = function () { return null; };
  });
  const p = await c.newPage();
  await p.goto(`${BASE}/jev-models/v1.4.1`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p.waitForSelector('[data-bh-jev14-capability-3d-view]', { timeout: 30000 });
  await p.evaluate(() => document.querySelector('[data-bh-jev14-capability-3d-view]')?.scrollIntoView({ block: 'center' }));
  await p.waitForSelector('[data-bh-jev14-3d-axis-label]', { timeout: 45000, state: 'attached' });
  await p.waitForTimeout(400);
  const fb = await p.evaluate(probe);
  check('fallback', 'CR-176.6: fallback axes are labelled', fb.axis.length === 3, JSON.stringify(fb.axis.map((a) => a.name)));
  check('fallback', 'CR-176.6: fallback top five are labelled', fb.models.length === 5, fb.models.map((m) => m.text).join(' ; '));
  const fbx = p.locator('[data-bh-jev14-3d-fallback]').first();
  if (await fbx.count()) { await fbx.scrollIntoViewIfNeeded(); await p.waitForTimeout(200); await fbx.screenshot({ path: `${OUT}/fallback-3d.png` }); }
  await c.close();

  await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), checks, failed: checks.filter((c) => !c.ok) }, null, 2));
  console.log(`${checks.length - checks.filter((c) => !c.ok).length}/${checks.length} passed`);
  for (const f of checks.filter((c) => !c.ok)) console.log('FAIL', f.context, f.name, '—', f.detail);
} finally {
  await browser.close();
}
