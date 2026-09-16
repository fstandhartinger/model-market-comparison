// CR-28.2: DesignArena results sit on the configuration Intelligence.ai's own registry names,
// with provenance; a source row that names no effort keeps the family-scoped rule.
// API + UI at 1440/390, light and dark. Usage: node verify-cr-28-2.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-28-2';
await fs.mkdir(OUT, { recursive: true });
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const goto = async (page, url) => { for (let a = 1; ; a++) { try { return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }); } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 3000 * a)); } } };
const settle = async (page) => { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(2000); };
const model = async (id) => (await (await fetch(`${BASE}/api/models/${encodeURIComponent(id)}`)).json());

// The corrections the data-verification job recorded on 2026-09-15, each with its source value.
const CASES = [
  { id: 'gpt-6-astra::xhigh', wrong: 'gpt-6-astra::high', sourceId: 'gpt-6-astra', frontend: 1335, fullstack: 1350 },
  { id: 'muse-spark-1.3::xhigh', wrong: 'muse-spark-1.3::max', sourceId: 'muse-spark-1.3', frontend: 1312, fullstack: 1309 },
  { id: 'gpt-5.6-sol::medium', wrong: 'gpt-5.6-sol::high', sourceId: 'gpt-5.6-sol', frontend: 1207, fullstack: 1171 },
  { id: 'gpt-5.6-sol::xhigh', wrong: null, sourceId: 'gpt-5.6-sol-xhigh', frontend: 1269, fullstack: 1278 },
];
for (const c of CASES) {
  const right = (await model(c.id)).model;
  check(`CR-28.2 ${c.id} carries the result Intelligence.ai published for it (frontend ${c.frontend}, full-stack ${c.fullstack}, source id ${c.sourceId})`,
    right?.designarena?.frontend?.elo === c.frontend && right?.designarena?.fullstack?.elo === c.fullstack
    && right.designarena.frontend.modelId === c.sourceId && right.designarena.fullstack.modelId === c.sourceId,
    { frontend: right?.designarena?.frontend, fullstack: right?.designarena?.fullstack });
  check(`CR-28.2 ${c.id}'s note states the source named the effort`,
    /names the tested effort/i.test(right?.designarena_attachment_note ?? ''), (right?.designarena_attachment_note ?? '').slice(0, 140));
  if (c.wrong) {
    const wrong = (await model(c.wrong)).model;
    check(`CR-28.2 ${c.wrong} no longer claims that result`,
      !wrong?.designarena?.frontend && !wrong?.designarena?.fullstack, { designarena: wrong?.designarena });
  }
}
// Both published GPT-5.6 Sol configurations exist at once, with different Elos.
const sol = await Promise.all(['gpt-5.6-sol::xhigh', 'gpt-5.6-sol::medium'].map((id) => model(id)));
check('CR-28.2 two published efforts of one family coexist instead of one deleting the other',
  sol[0].model.designarena.frontend.elo !== sol[1].model.designarena.frontend.elo
  && sol[0].model.designarena.frontend.modelId !== sol[1].model.designarena.frontend.modelId,
  sol.map((m) => [m.model.id, m.model.designarena.frontend.elo]));

// A source row that names no effort keeps the family-scoped rule and says so.
const fable = (await model('claude-fable-5::high')).model;
check('CR-28.2 an unnamed-effort row keeps the family-scoped attachment and claims no effort',
  /attached exactly once/i.test(fable?.designarena_attachment_note ?? '')
  && /does not assert/i.test(fable?.designarena_attachment_note ?? ''), (fable?.designarena_attachment_note ?? '').slice(0, 140));

// Every DesignArena source row is attached exactly once across the whole catalog.
const all = await (await fetch(`${BASE}/api/models?score=composite`)).json();
const owners = new Map();
for (const m of all.models) for (const board of ['frontend', 'fullstack']) {
  const sourceId = m.designarena?.[board]?.modelId;
  if (!sourceId) continue;
  const key = `${board}::${sourceId}`;
  owners.set(key, [...(owners.get(key) ?? []), m.id]);
}
const duplicated = [...owners].filter(([, ids]) => ids.length > 1);
check('CR-28.2 every published DesignArena row is attached to exactly one configuration', duplicated.length === 0, duplicated.slice(0, 5));

const browser = await chromium.launch();
for (const theme of ['light', 'dark']) for (const [kind, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const tag = `${kind}_${theme}`, mobile = kind === 'mobile';
  const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, colorScheme: theme });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  await goto(page, `${BASE}/models/${encodeURIComponent('gpt-6-astra::xhigh')}`);
  await settle(page);
  const body = await page.locator('body').innerText();
  check(`${tag} CR-28.2 the model page shows the corrected DesignArena evidence with its provenance note`,
    /1335/.test(body) && /1350/.test(body) && /names the tested effort|xhigh/i.test(body), '');
  await page.screenshot({ path: `${OUT}/${tag}-astra-xhigh.png` });
  check(`${tag} no page errors`, !errors.length, errors);
  await context.close();
}
await browser.close();
const passed = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, runner: process.env.BH_RUNNER || 'unspecified', at: new Date().toISOString(), passed, total: checks.length, checks }, null, 2));
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name} — ${c.detail.slice(0, 200)}`);
console.log(`${passed}/${checks.length}`);
process.exit(passed === checks.length ? 0 : 1);
