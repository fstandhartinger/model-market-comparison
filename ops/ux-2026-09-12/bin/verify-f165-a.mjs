// Live verifier for F-165(a) — a vendor's launch number names the vendor that produced it, and no two
// benchmark rows on one sheet read the same. For a non-implementing engine to run on both hosts:
//
//   node verify-f165-a.mjs <base> <outDir>
//
// Nothing is pinned to this checkout. Every expectation is re-derived from the host's own
// /api/benchmark-view payload and then read back out of the rendered page:
//   * a "Vendor-reported by X" group must sit on a registry identity that is itself X's (the vendor
//     slug prefixes the benchmark id) — two independent fields of the host agreeing, not one repeated;
//   * the rows a reader sees must be distinguishable: no two share name + sub-line;
//   * the launch rows must actually print their runner, or the rule died in the presentation layer.
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');

const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || `/tmp/f165a-${new URL(BASE).hostname}`;
await fs.mkdir(OUT, { recursive: true });
const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ' — ' + JSON.stringify(detail ?? null).slice(0, 600)}`); };

// Three vendors on one sheet: Anthropic's, Xiaomi's and OpenAI's own launch claims.
const PICKS = ['claude-opus-5.5::max', 'mimo-v2.6-pro::default', 'gpt-6-sol::max'];
const api = async (path) => { const r = await fetch(`${BASE}${path}`); if (!r.ok) throw new Error(`${path} → ${r.status}`); return r.json(); };

const view = await api(`/api/benchmark-view?${PICKS.map((id) => `model=${encodeURIComponent(id)}`).join('&')}&collapse=1`);
const axes = view.axes ?? [];
const launch = axes.filter((a) => /Vendor-reported by /.test(String(a.cohort ?? '')));
check('payload/launch-axes-present', launch.length > 0, `${launch.length} of ${axes.length} axes name a runner`);

// The runner and the registry identity are two different fields; they must agree.
const mismatched = launch.filter((a) => {
  const runner = String(a.cohort).match(/Vendor-reported by ([^·]+)$/)?.[1]?.trim().toLowerCase().replace(/\s+/g, '-');
  return !runner || !String(a.benchmarkId).toLowerCase().startsWith(runner);
});
check('payload/runner-matches-registry-identity', mismatched.length === 0,
  mismatched.slice(0, 5).map((a) => `${a.benchmarkId} :: ${a.cohort}`));

// A launch row is a developer's own report; it must not be presented as a measurement.
const notSelfReported = launch.filter((a) => (a.scores ?? []).some((r) => r.basis === 'measured'));
check('payload/launch-axes-carry-no-measured-row', notSelfReported.length === 0,
  notSelfReported.slice(0, 5).map((a) => a.id));

// The sub-line as the page composes it: the version when the name does not already carry it, then the
// group. Re-implemented here from what the payload states, so the verifier does not import our code.
const human = (v) => {
  const s = /^snapshot-(\d{4}-\d{2}-\d{2})/.exec(String(v ?? ''));
  if (s) return { kind: 'snapshot', label: `published ${s[1]}` };
  if (/^[0-9a-f]{7,40}$/i.test(String(v ?? ''))) return { kind: 'pin', label: `pinned revision ${String(v).toLowerCase()}` };
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(v ?? ''))) return { kind: 'semantic', label: String(v) };
  const numeric = /^(?:v)?\d+(?:\.\d+)*$/i.test(String(v ?? ''));
  return { kind: 'semantic', label: numeric && !/^v/i.test(String(v)) ? `v${v}` : String(v ?? '') };
};
const subline = (a) => {
  const v = human(a.version);
  const suffix = v.kind === 'snapshot' || v.kind === 'pin' ? v.label
    : new RegExp(`(^|[\\s(])${v.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[\\s)])`, 'i').test(a.name) ? null : v.label;
  const cohort = !a.cohort || a.cohort === 'Published board' ? null : a.cohort;
  return [suffix, cohort].filter(Boolean).join(' · ');
};
const grouped = new Map();
for (const a of axes) { const k = `${a.category}\u0000${a.name}\u0000${subline(a)}`; if (!grouped.has(k)) grouped.set(k, []); grouped.get(k).push(a.id); }
const payloadCollisions = [...grouped].filter(([, ids]) => ids.length > 1).map(([k, ids]) => `${k.split('\u0000').join(' | ')} -> ${ids.join(', ')}`);
check('payload/no-two-axes-read-the-same', payloadCollisions.length === 0, payloadCollisions.slice(0, 5));

// Moving a cohort moves the axis id, and axis ids are what /api/benchmark-view and /api/benchmaxxing
// take as `?axis=`. The move must be clean: the new id resolves, and the id it replaced must 404
// rather than quietly resolve to something else. Both forms are derived from the payload — the old
// one by removing exactly what the rule added.
const axisUrl = (route, id) => `${BASE}/api/${route}?axis=${encodeURIComponent(id)}`;
const status = async (route, id) => (await fetch(axisUrl(route, id))).status;
const sample = launch.slice(0, 3);
for (const a of sample) {
  const before = String(a.cohort).replace(/(^| · )Vendor-reported by [^·]+$/, '') || 'Published board';
  const staleId = `${a.benchmarkId}@@${encodeURIComponent(before)}@@${a.unit}`;
  const live = await Promise.all(['benchmark-view', 'benchmaxxing'].map((r) => status(r, a.id)));
  const stale = await Promise.all(['benchmark-view', 'benchmaxxing'].map((r) => status(r, staleId)));
  check(`axis-id/${a.benchmarkId}/current-id-resolves`, live.every((c) => c === 200), { id: a.id, live });
  check(`axis-id/${a.benchmarkId}/replaced-id-404s`, stale.every((c) => c === 404), { staleId, stale });
}

const browser = await chromium.launch();
try {
  for (const width of [1440, 390]) {
    for (const scheme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 }, colorScheme: scheme });
      const page = await context.newPage();
      const pageErrors = [];
      page.on('pageerror', (e) => pageErrors.push(String(e)));
      await page.goto(`${BASE}/compare?${PICKS.map((id) => `model=${encodeURIComponent(id)}`).join('&')}`, { waitUntil: 'networkidle', timeout: 90000 });
      await page.waitForTimeout(1500);
      const label = `${width}-${scheme}`;

      const rows = await page.evaluate(() => [...document.querySelectorAll('th[scope="row"] button')].map((b) => {
        const outer = [...b.querySelectorAll(':scope > span')].at(-1);
        const kids = outer ? [...outer.querySelectorAll(':scope > span')] : [];
        return { name: (kids[0]?.textContent ?? '').trim(), sub: (kids[1]?.textContent ?? '').trim() };
      }).filter((r) => r.name));
      check(`${label}/rows-read`, rows.length > 5, `${rows.length} benchmark rows rendered`);

      const seen = new Map();
      for (const r of rows) { const k = `${r.name}\u0000${r.sub}`; seen.set(k, (seen.get(k) ?? 0) + 1); }
      const dupes = [...seen].filter(([, n]) => n > 1).map(([k, n]) => `${k.split('\u0000').join(' | ')} ×${n}`);
      check(`${label}/no-two-rendered-rows-read-the-same`, dupes.length === 0, dupes.slice(0, 5));

      const runners = new Set(rows.flatMap((r) => (r.sub.match(/Vendor-reported by [^·]+/g) ?? []).map((s) => s.trim())));
      check(`${label}/launch-rows-name-their-runner`, runners.size >= 2, [...runners].slice(0, 6));

      // The default must still be absent (F-165(b)), or (a) reintroduced it somewhere.
      const text = await page.evaluate(() => document.body.innerText);
      check(`${label}/no-published-board-anywhere`, !text.includes('Published board'), 'absent from the rendered page');

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(`${label}/no-horizontal-overflow`, overflow <= 1, `${overflow}px`);
      check(`${label}/no-page-errors`, pageErrors.length === 0, pageErrors.slice(0, 3));

      await page.screenshot({ path: `${OUT}/compare_${label}.png`, fullPage: false });
      await context.close();
    }
  }
} finally { await browser.close(); }

const passed = results.filter((r) => r.ok).length;
await fs.writeFile(`${OUT}/verification.json`, `${JSON.stringify({ base: BASE, verified_at: new Date().toISOString(), passed, total: results.length, results }, null, 2)}\n`);
console.log(`\n${passed}/${results.length} checks passed`);
process.exit(passed === results.length ? 0 : 1);
