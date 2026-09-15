// Acceptance for CR-5.1 – CR-5.5 (accounts): legal pages, account API guards, no public CORS on account
// routes, signed-out toast on saving a preset, and — when SESSION_SECRET and ACCOUNTS_DATABASE_URL are
// given (locally, or live from Sandy where the accounts DB listens on 127.0.0.1) — a signed-in session
// minted with our own AUTH_SECRET to check the first-sign-in
// merge, sync across two browsers (presets and settings) and "delete my account and data".
// Usage: [SESSION_SECRET=… ACCOUNTS_DATABASE_URL=…] node verify-cr-5.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const repoRequire = createRequire('/opt/model-market-comparison/package.json');
const fs = await import('node:fs/promises');
const BASE = process.argv[2] || 'https://benchmarkheaven.com';
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/iter54-cr-5/canonical';
const SECRET = process.env.SESSION_SECRET;
const DBURL = process.env.ACCOUNTS_DATABASE_URL;
await fs.mkdir(OUT, { recursive: true });
const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${detail ?? ''}`); };
const CONTEXTS = [
  { name: 'desktop_light', viewport: { width: 1440, height: 1000 }, colorScheme: 'light' },
  { name: 'mobile_dark', viewport: { width: 390, height: 844 }, colorScheme: 'dark', isMobile: true, hasTouch: true },
];
const b = await chromium.launch();

// ── API guards (no browser) ───────────────────────────────────────────────────────────────────
const acc = await fetch(`${BASE}/api/account`, { headers: { origin: 'https://evil.example' } });
const accBody = await acc.json();
const enabled = accBody.enabled === true;
check('api GET /api/account answers JSON', acc.status === 200 && typeof accBody.enabled === 'boolean', `enabled=${accBody.enabled}`);
check('api account route sends no public CORS header', !acc.headers.get('access-control-allow-origin'), acc.headers.get('access-control-allow-origin') ?? 'none');
const meta = await fetch(`${BASE}/api/meta`);
check('api public data routes keep CORS', meta.headers.get('access-control-allow-origin') === '*');
const evil = await fetch(`${BASE}/api/account`, { method: 'PUT', headers: { origin: 'https://evil.example', 'content-type': 'application/json' }, body: '{"settings":{}}' });
check('api cross-origin PUT refused', enabled ? evil.status === 403 : evil.status === 404, `status=${evil.status}`);
const evilDel = await fetch(`${BASE}/api/account`, { method: 'DELETE', headers: { origin: 'https://evil.example' } });
check('api cross-origin DELETE refused', enabled ? evilDel.status === 403 : evilDel.status === 404, `status=${evilDel.status}`);
if (enabled) {
  const anon = await fetch(`${BASE}/api/account`, { method: 'PUT', headers: { origin: new URL(BASE).origin, 'content-type': 'application/json' }, body: '{"settings":{}}' });
  check('api same-origin PUT without session is 401', anon.status === 401, `status=${anon.status}`);
  const prov = await fetch(`${BASE}/api/auth/providers`);
  const provBody = prov.ok ? await prov.json() : {};
  check('auth providers list Google only', prov.ok && Object.keys(provBody).join() === 'google', Object.keys(provBody).join());
  // The 16:42 deploy shipped https://localhost:3000 callbacks; Google must be sent back to the host the visitor used.
  const cb = provBody.google?.callbackUrl ?? '';
  check('auth Google callback is on the visited host', cb === `${new URL(BASE).origin}/api/auth/callback/google`, cb);
}

// ── Pages and signed-out UI, per context ──────────────────────────────────────────────────────
for (const c of CONTEXTS) {
  const ctx = await b.newContext({ viewport: c.viewport, colorScheme: c.colorScheme, isMobile: c.isMobile, hasTouch: c.hasTouch });
  await ctx.addInitScript((t) => { try { localStorage.setItem('bh-theme', t); } catch {} }, c.colorScheme);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  for (const [path, h1, must] of [['/privacy', 'Privacy policy', 'Sign in with Google'], ['/terms', 'Terms of use', 'German law applies'], ['/impressum', 'Impressum', 'HRB 8453']]) {
    const res = await page.goto(BASE + path, { waitUntil: 'networkidle' });
    const info = await page.evaluate(() => ({ h1: document.querySelector('main h1')?.textContent, text: document.querySelector('main').innerText, overflow: document.documentElement.scrollWidth > innerWidth + 1, footer: [...document.querySelectorAll('footer a')].map((a) => a.textContent) }));
    check(`${c.name} ${path} 200 with heading and operator`, res.status() === 200 && info.h1 === h1 && info.text.includes('productivity-boost.com Betriebs UG') && info.text.includes(must), `status=${res.status()} h1=${info.h1}`);
    check(`${c.name} ${path} no horizontal overflow`, !info.overflow);
    if (path === '/privacy') check(`${c.name} footer links Privacy · Terms · Impressum`, ['Privacy', 'Terms', 'Impressum'].every((l) => info.footer.includes(l)), info.footer.join(' | '));
  }
  await page.screenshot({ path: `${OUT}/${c.name}-privacy.png`, fullPage: false });

  await page.goto(`${BASE}/account`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const accountText = await page.locator('main').innerText();
  if (enabled) check(`${c.name} /account signed out offers Sign in with Google`, await page.locator('[data-bh-account-signin]').isVisible(), accountText.slice(0, 80));
  else check(`${c.name} /account says accounts are not available yet`, accountText.includes('not available yet'));
  await page.screenshot({ path: `${OUT}/${c.name}-account-signed-out.png` });

  await page.goto(`${BASE}/benchmarks`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const header = await page.evaluate(() => {
    const vis = (el) => !!el && el.getBoundingClientRect().width > 0 && getComputedStyle(el).visibility !== 'hidden';
    return { signin: vis(document.querySelector('[data-bh-signin]')), overflow: document.documentElement.scrollWidth > innerWidth + 1, headerOverflow: (() => { const h = document.querySelector('header > div'); return h.scrollWidth > h.clientWidth + 1; })() };
  });
  check(`${c.name} header has no overflow`, !header.overflow && !header.headerOverflow);
  if (c.isMobile) {
    check(`${c.name} phone header shows no Sign in button (it lives in More)`, !header.signin);
    await page.locator('header summary', { hasText: 'More' }).last().click();
    const more = page.locator('header details[open] a', { hasText: 'Sign in' });
    if (enabled) check(`${c.name} More menu has Sign in`, await more.count() === 1);
    else check(`${c.name} More menu has no account link while accounts are off`, await more.count() === 0);
    await page.keyboard.press('Escape');
    await page.goto(`${BASE}/benchmarks`, { waitUntil: 'networkidle' });
  } else {
    check(`${c.name} desktop header ${enabled ? 'shows' : 'hides'} Sign in`, header.signin === enabled);
  }

  // CR-5.3: save a preset signed out → the save happens, and (accounts on) the toast appears once per session.
  const save = async (name) => {
    await page.locator('.bh-preset[data-preset-kind="models"] > button').first().click();
    await page.locator('.bh-preset[data-preset-kind="models"] input[placeholder^="Save current"]').fill(name);
    await page.locator('.bh-preset[data-preset-kind="models"] button[type="submit"]', { hasText: 'Save' }).click();
    await page.waitForTimeout(500);
  };
  await save('Verify toast one');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('bh.presets.v1') ?? '{}').models?.map((p) => p.name) ?? []);
  check(`${c.name} signed-out save still stores the preset locally`, stored.includes('Verify toast one'), stored.join(','));
  const toast = page.locator('[data-bh-signin-toast]');
  if (enabled) {
    check(`${c.name} toast suggests signing in after a signed-out save`, await toast.isVisible() && (await toast.innerText()).includes('Sign in with Google'));
    const box = await toast.boundingBox();
    check(`${c.name} toast fits the viewport`, box && box.x >= 0 && box.x + box.width <= c.viewport.width + 1 && box.y + box.height <= c.viewport.height + 1, JSON.stringify(box));
    await page.screenshot({ path: `${OUT}/${c.name}-signin-toast.png` });
    await toast.getByRole('button', { name: 'Dismiss' }).click();
    check(`${c.name} toast is dismissible`, !(await toast.isVisible()));
    await page.keyboard.press('Escape');
    await save('Verify toast two');
    check(`${c.name} toast not shown again this session`, !(await toast.isVisible()));
  } else {
    check(`${c.name} no toast while accounts are off`, !(await toast.isVisible()));
  }
  check(`${c.name} no page errors`, errors.length === 0, errors.join(' | '));
  await ctx.close();
}

// ── Signed-in flows with a locally minted session (local runs only) ───────────────────────────
if (enabled && SECRET && DBURL) {
  const { encode } = repoRequire('next-auth/jwt');
  const pg = repoRequire('pg');
  const db = new pg.Client({ connectionString: DBURL });
  await db.connect();
  const sub = `verify-cr5-${Date.now()}`;
  const { rows } = await db.query("INSERT INTO bh_users (google_sub, email, name) VALUES ($1, 'verify-cr5@example.invalid', 'Verify CR5') RETURNING id", [sub]);
  const uid = rows[0].id;
  const secure = BASE.startsWith('https:');
  const cookieName = `${secure ? '__Secure-' : ''}authjs.session-token`;
  const token = await encode({ token: { name: 'Verify CR5', email: 'verify-cr5@example.invalid', sub: uid, uid }, secret: SECRET, salt: cookieName });
  const signedIn = async (c, localPresets) => {
    const ctx = await b.newContext({ viewport: c.viewport, colorScheme: c.colorScheme, isMobile: c.isMobile, hasTouch: c.hasTouch });
    await ctx.addCookies([{ name: cookieName, value: token, url: BASE, httpOnly: true, secure, sameSite: 'Lax' }]);
    if (localPresets) await ctx.addInitScript((v) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('bh.presets.v1', v); sessionStorage.setItem('seeded', '1'); } }, JSON.stringify(localPresets));
    return ctx;
  };
  const accountPresets = async () => (await db.query('SELECT presets, settings FROM bh_user_data WHERE user_id = $1', [uid])).rows[0] ?? null;
  const [A, B] = CONTEXTS;
  const ctxA = await signedIn(A, { models: [{ id: 'la', name: 'Local A', value: ['m-a'], updatedAt: 1 }], rows: [], filters: [] });
  const pa = await ctxA.newPage();
  await pa.goto(`${BASE}/benchmarks`, { waitUntil: 'networkidle' });
  await pa.waitForTimeout(2500);
  let data = await accountPresets();
  check('CR-5.4 first sign-in merges browser A presets into the account', data?.presets?.models?.some((p) => p.name === 'Local A'), JSON.stringify(data?.presets?.models?.map((p) => p.name)));
  check('CR-5.2 account adopts browser A settings when it has none', data?.settings && typeof data.settings === 'object');
  check('CR-5.1 desktop header shows the account avatar', await pa.locator('[data-bh-account]').isVisible());

  const ctxB = await signedIn(B, { models: [{ id: 'lb', name: 'Local A', value: ['m-b'], updatedAt: 2 }], rows: [], filters: [] });
  const pb = await ctxB.newPage();
  await pb.goto(`${BASE}/benchmarks`, { waitUntil: 'networkidle' });
  await pb.waitForTimeout(2500);
  data = await accountPresets();
  const names = data?.presets?.models?.map((p) => p.name) ?? [];
  check('CR-5.4 same-named preset from browser B kept as "(this browser)", nothing lost', names.includes('Local A') && names.includes('Local A (this browser)'), names.join(','));

  // A saves a preset and flips a setting; B picks both up on its next load.
  await pa.locator('.bh-preset[data-preset-kind="models"] > button').first().click();
  check('CR-5.2 signed-in menu says presets sync to the account', (await pa.locator('.bh-preset[data-preset-kind="models"] [role="status"]').innerText()).includes('sync to your account'));
  await pa.locator('.bh-preset[data-preset-kind="models"] input[placeholder^="Save current"]').fill('Synced from A');
  await pa.locator('.bh-preset[data-preset-kind="models"] button[type="submit"]', { hasText: 'Save' }).click();
  check('CR-5.3 no sign-in toast while signed in', !(await pa.locator('[data-bh-signin-toast]').isVisible()));
  await pa.keyboard.press('Escape');
  await pa.waitForTimeout(1500); // let the debounced preset save go out before leaving the page
  // The Filters sheet is not rendered on /benchmarks (GlobalFilters returns null there); change a setting on "/".
  await pa.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await pa.locator('header button[aria-controls="global-filters"]').first().click();
  await pa.locator('#global-filters').getByRole('button', { name: 'Provider company based in China', exact: true }).click(); // CR-25.4: the former 'Exclude Chinese providers' switch
  await pa.waitForTimeout(2500);
  data = await accountPresets();
  check('CR-5.2 browser A preset saved to the account', data?.presets?.models?.some((p) => p.name === 'Synced from A'));
  check('CR-5.2 browser A setting saved to the account', Array.isArray(data?.settings?.providerBasedIn) && !data.settings.providerBasedIn.includes('China'), `providerBasedIn=${JSON.stringify(data?.settings?.providerBasedIn)}`);
  await pb.reload({ waitUntil: 'networkidle' });
  await pb.waitForTimeout(2500);
  const bState = await pb.evaluate(() => ({ presets: JSON.parse(localStorage.getItem('bh.presets.v1') ?? '{}').models?.map((p) => p.name) ?? [], settings: JSON.parse(localStorage.getItem('mmc.settings.v9') ?? '{}') }));
  check('CR-5.2 browser B receives the preset saved in A', bState.presets.includes('Synced from A'), bState.presets.join(','));
  check('CR-5.2 browser B receives the setting changed in A', Array.isArray(bState.settings.providerBasedIn) && !bState.settings.providerBasedIn.includes('China'));
  await pb.screenshot({ path: `${OUT}/${B.name}-signed-in-synced.png` });

  // CR-5.5: delete my account and data.
  await pa.goto(`${BASE}/account`, { waitUntil: 'networkidle' });
  await pa.waitForTimeout(1200);
  await pa.screenshot({ path: `${OUT}/${A.name}-account-signed-in.png` });
  check('CR-5.5 account page lists exactly what is stored', (await pa.locator('main').innerText()).includes('Google account ID, email address, name and profile picture link'));
  await pa.locator('[data-bh-delete-account]').click();
  await pa.locator('[data-bh-delete-confirm]').click();
  await pa.waitForTimeout(2000);
  const gone = await db.query('SELECT (SELECT count(*) FROM bh_users WHERE id = $1) AS users, (SELECT count(*) FROM bh_user_data WHERE user_id = $1) AS data', [uid]);
  check('CR-5.5 delete removes the user and their data', Number(gone.rows[0].users) === 0 && Number(gone.rows[0].data) === 0, JSON.stringify(gone.rows[0]));
  check('CR-5.5 page confirms deletion and shows signed-out state', (await pa.locator('main').innerText()).includes('were deleted') && await pa.locator('[data-bh-account-signin]').isVisible());
  const after = await pb.evaluate(async () => (await fetch('/api/account', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: '{"settings":{}}' })).status);
  check('CR-5.5 the other browser can no longer write to the deleted account', after === 401, `status=${after}`);
  await ctxA.close(); await ctxB.close();
  await db.end();
}

await b.close();
const passed = results.filter((r) => r.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), enabled, signedInFlows: !!(enabled && SECRET && DBURL), passed, total: results.length, results }, null, 2));
console.log(`${passed}/${results.length}`);
process.exit(passed === results.length ? 0 : 1);
