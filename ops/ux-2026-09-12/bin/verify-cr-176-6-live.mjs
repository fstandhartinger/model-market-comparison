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

// D215 (pass 37): this harness read label *form* — the `style.transform` string and the `x`/`y`
// attributes — and passed 42/42 while every top-five label was clipped off the left edge of the
// 3D box. A position claim has to be measured on the rendered box, so `probe` now also returns
// each label's getBoundingClientRect and the box's own rect, and the checks below compare them.
const probe = () => {
  const scope = document.querySelector('[data-bh-jev14-capability-3d-view]') ?? document;
  const rectOf = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };
  const viewEl = document.querySelector('[data-bh-jev14-capability-3d-view]');
  const view = viewEl ? rectOf(viewEl) : null;
  const axis = [...scope.querySelectorAll('[data-bh-jev14-3d-axis-label]')].map((el) => ({
    name: el.getAttribute('data-bh-jev14-3d-axis-label'),
    text: (el.textContent || '').trim(),
    transform: el.style?.transform || null,
    x: el.getAttribute('x'),
    y: el.getAttribute('y'),
    rect: rectOf(el),
  }));
  const models = [...scope.querySelectorAll('[data-bh-jev14-3d-model-label]')].map((el) => ({
    key: el.getAttribute('data-bh-jev14-3d-model-label'),
    text: (el.textContent || '').trim(),
    transform: el.style?.transform || null,
    x: el.getAttribute('x'),
    y: el.getAttribute('y'),
    rect: rectOf(el),
  }));
  const webgl = !!scope.querySelector('canvas');
  const fallback = !!scope.querySelector('[data-bh-jev14-3d-fallback]');
  return { webgl, fallback, axis, models, view };
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
      // D215: the same claims, measured on the rendered boxes.
      const inside = (r) => first.view && r.w > 0 && r.x >= first.view.x - 1 && r.x + r.w <= first.view.x + first.view.w + 1;
      check(context, 'D215: every top-five label is rendered inside the 3D box (nothing clipped at an edge)', first.models.length > 0 && first.models.every((m) => inside(m.rect)), JSON.stringify({ view: first.view, labels: first.models.map((m) => [m.text.slice(0, 18), m.rect.x, m.rect.w]) }));
      check(context, 'D215: each label is a nowrap pill, not a full-width block', first.models.every((m) => m.rect.w > 20 && m.rect.w < 260), JSON.stringify(first.models.map((m) => m.rect.w)));
      // "Not stacked at one edge" is about distinct positions, not about an x spread: on this board the top
      // five spheres project within 23 px of each other horizontally, so requiring three x buckets would be a
      // demand on the data rather than on the page. The readability gate is D216's overlap check below.
      check(context, 'D215: the labels sit at distinct positions, not stacked on one anchor', new Set(first.models.map((m) => `${Math.round(m.rect.x / 12)}:${Math.round(m.rect.y / 12)}`)).size >= 3, JSON.stringify(first.models.map((m) => [m.rect.x, m.rect.y])));
      // D216: distinct x positions are not readability — five labels can each sit at their own sphere and
      // still print on top of one another when the spheres project close together.
      const overlapping = (list) => { let n = 0; for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) { const a2 = list[i].rect, b2 = list[j].rect; if (a2.w > 0 && b2.w > 0 && a2.x < b2.x + b2.w && b2.x < a2.x + a2.w && a2.y < b2.y + b2.h && b2.y < a2.y + a2.h) n++; } return n; };
      check(context, 'D216: no top-five label prints on top of another', overlapping(first.models) === 0, `overlapping pairs ${overlapping(first.models)} of ${(first.models.length * (first.models.length - 1)) / 2}`);
      check(context, 'D215: the three axis labels are rendered inside the box too', first.axis.length === 3 && first.axis.every((a2) => inside(a2.rect)), JSON.stringify(first.axis.map((a2) => [a2.name, a2.rect.x, a2.rect.w])));
      if (first.webgl) {
        const rotated = await p.evaluate(rotate) && await (async () => { await p.waitForTimeout(350); return p.evaluate(probe); })();
        const before = first.models.map((m) => m.transform || `${m.x},${m.y}`).join('|');
        const after = rotated.models.map((m) => m.transform || `${m.x},${m.y}`).join('|');
        check(context, 'CR-176.6: labels follow the model positions when the view rotates', before !== after, `${before.slice(0, 60)} -> ${after.slice(0, 60)}`);
        const boxesBefore = first.models.map((m) => `${m.rect.x},${m.rect.y}`).join('|');
        const boxesAfter = rotated.models.map((m) => `${m.rect.x},${m.rect.y}`).join('|');
        check(context, 'D215: the rendered label boxes move with the rotation, not just their transform strings', boxesBefore !== boxesAfter, `${boxesBefore.slice(0, 60)} -> ${boxesAfter.slice(0, 60)}`);
        check(context, 'D216: the labels stay clear of one another after a rotation', overlapping(rotated.models) === 0, `overlapping pairs ${overlapping(rotated.models)}`);
        check(context, 'D215: the rotated labels are still inside the 3D box', rotated.view && rotated.models.every((m) => m.rect.w > 0 && m.rect.x >= rotated.view.x - 1 && m.rect.x + m.rect.w <= rotated.view.x + rotated.view.w + 1), JSON.stringify(rotated.models.map((m) => [m.rect.x, m.rect.w])));
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
  const fbInside = (r) => fb.view && r.w > 0 && r.x >= fb.view.x - 1 && r.x + r.w <= fb.view.x + fb.view.w + 1;
  check('fallback', 'D215: the fallback labels are rendered inside the 3D box', fb.models.every((m) => fbInside(m.rect)) && fb.axis.every((a2) => fbInside(a2.rect)), JSON.stringify({ view: fb.view, models: fb.models.map((m) => [m.rect.x, m.rect.w]) }));
  check('fallback', 'D215: the fallback labels sit at distinct positions', new Set(fb.models.map((m) => `${Math.round(m.rect.x / 12)}:${Math.round(m.rect.y / 12)}`)).size >= 3, JSON.stringify(fb.models.map((m) => [m.rect.x, m.rect.y])));
  const fbOverlaps = (() => { let n = 0; for (let i = 0; i < fb.models.length; i++) for (let j = i + 1; j < fb.models.length; j++) { const a2 = fb.models[i].rect, b2 = fb.models[j].rect; if (a2.w > 0 && b2.w > 0 && a2.x < b2.x + b2.w && b2.x < a2.x + a2.w && a2.y < b2.y + b2.h && b2.y < a2.y + a2.h) n++; } return n; })();
  check('fallback', 'D216: no fallback label prints on top of another', fbOverlaps === 0, `overlapping pairs ${fbOverlaps}`);
  const fbx = p.locator('[data-bh-jev14-3d-fallback]').first();
  if (await fbx.count()) { await fbx.scrollIntoViewIfNeeded(); await p.waitForTimeout(200); await fbx.screenshot({ path: `${OUT}/fallback-3d.png` }); }
  await c.close();

  await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), checks, failed: checks.filter((c) => !c.ok) }, null, 2));
  console.log(`${checks.length - checks.filter((c) => !c.ok).length}/${checks.length} passed`);
  for (const f of checks.filter((c) => !c.ok)) console.log('FAIL', f.context, f.name, '—', f.detail);
} finally {
  await browser.close();
}
