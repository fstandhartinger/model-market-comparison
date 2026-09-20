// CR-85.2 live verification (2026-09-20): DeepSeek's own model card, shown as vendor-reported.
//
// CR-85.2 asks for "other primary sources for V4.1 Flash: DeepSeek's release notes/model card
// (self-reported, mark as vendor-reported) … ingest each with provenance". This verifier checks,
// live on a deployed host, that the ingestion did what the CR asked and nothing more:
//   * the deployed revision is the one under test;
//   * every one of the 19 claims is served with the value re-derived here from the committed
//     capture of the card — not copied out of our own dataset;
//   * every served claim is basis self_reported and carries the card's URL and the replacement rule;
//   * the refusals hold live: no row of the card reaches another model, the footnoted HLE text-only
//     figure is nowhere in the payload, and the per-scaffold table's values never appear as the
//     model's own Terminal-Bench 2.1 / DeepSWE result;
//   * CR-85's own complaint is still answered honestly: the model's Composite is unchanged and the
//     vendor boards are not among its inputs;
//   * the model page renders the claims and labels them vendor-reported, at 1440 light and 390 dark,
//     with no page error and no horizontal overflow.
//
// Usage: node verify-cr-85-2-deepseek-card.mjs <base> <outdir> [revision]
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const { gunzipSync } = await import('node:zlib');
const { createHash } = await import('node:crypto');

const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-85-2-deepseek';
const REV = process.argv[4] || null;
const MODEL = 'deepseek-v4.1-flash::max';
const CARD = 'https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash/raw/main/README.md';
const CAPTURE = 'data/raw/benchmarks/daily-evidence/2026-09-20-deepseek-v41-flash/347c9db4e5506acb531c.gz';
const CAPTURE_SHA = '347c9db4e5506acb531cbc3b724407ab88e9af8781679152f0823d7bac16d251';
await fs.mkdir(OUT, { recursive: true });
const checks = [];
// A deployed host occasionally answers a large catalog request with a gateway timeout; a verifier
// that treats that as a product defect is noise, so each request is retried before it counts.
const getJSON = async (url, attempts = 4) => {
  let last;
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(90_000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) { last = error; await new Promise((r) => setTimeout(r, 4000 * (i + 1))); }
  }
  throw new Error(`${url}: ${last?.message ?? last}`);
};
const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });

// --- expectations re-derived from the committed capture, never from data/dataset.json -----------
const card = gunzipSync(await fs.readFile(CAPTURE));
check('the committed capture still hashes to the digest the rows cite',
  createHash('sha256').update(card).digest('hex') === CAPTURE_SHA, CAPTURE_SHA.slice(0, 12));
const text = card.toString('utf8');
const tableOf = (heading) => {
  const section = text.split(heading)[1];
  const block = [];
  for (const line of section.split('\n')) { if (line.trim().startsWith('|')) block.push(line); else if (block.length) break; }
  return block;
};
const cells = (line) => line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.replace(/\*\*/g, '').trim());
const headline = tableOf('#### Comparison with frontier models (Max reasoning effort)');
const column = cells(headline[0]).indexOf('DS-V4.1-Flash');
const printed = new Map();
for (const line of headline.slice(2)) {
  const row = cells(line);
  const value = (row[column] ?? '').replace(/\s*\([\d.]+†\)$/, '');
  if (/^-?\d+(?:\.\d+)?$/.test(value)) printed.set(row[0], Number(value));
}
check('the capture prints 19 DS-V4.1-Flash values in its headline table', printed.size === 19, printed.size);
// The card's later table breaks the same two boards down by scaffold; those numbers must never
// appear as this model's own result for them.
const scaffold = tableOf('#### Performance across agent scaffolds (DeepSWE v1.1 and Terminal-Bench 2.1, Max reasoning effort)');
const scaffoldValues = new Map(scaffold.slice(2).map((line) => {
  const row = cells(line);
  return [row[0], row.slice(1).map(Number).filter((n) => Number.isFinite(n))];
}));
const hleSubset = Number((cells(headline.find((l) => cells(l)[0].startsWith('HLE (Pass@1)')))[column].match(/\(([\d.]+)†\)/) || [])[1]);
check('the capture carries a footnoted HLE text-only figure that must stay out', Number.isFinite(hleSubset), hleSubset);

// --- the deployed API ---------------------------------------------------------------------------
const meta = await getJSON(`${BASE}/api/meta`);
check('the host serves the revision under test', !REV || meta.revision === REV, meta.revision);

const scores = await getJSON(`${BASE}/api/benchmark-scores?model_id=${encodeURIComponent(MODEL)}&limit=500`);
const rows = scores.observations ?? scores.results ?? [];
const served = rows.filter((o) => o.source?.url === CARD);
check('the deployed dataset serves exactly the 19 card claims', served.length === 19, served.length);
check('every card claim belongs to DeepSeek V4.1 Flash and no other model',
  served.every((o) => o.subject?.model_id === MODEL), [...new Set(served.map((o) => o.subject?.model_id))]);

const registryList = await getJSON(`${BASE}/api/benchmarks`);
const registry = new Map((registryList.benchmarks ?? registryList.registry ?? registryList.entries ?? registryList).map((e) => [e.id, e]));
for (const o of served) {
  const label = (o.source.locator.match(/row "([^"]+)"/) || [])[1];
  const expected = printed.get(label);
  check(`live value matches the captured card: ${label}`, expected !== undefined && o.value === expected,
    `${o.value} vs ${expected}`);
  check(`live row is marked self-reported: ${label}`, o.basis === 'self_reported', o.basis);
  check(`live row states the replacement rule: ${label}`,
    /replace with an independently measured matching-version result/.test(o.protocol || ''), (o.protocol || '').slice(0, 60));
  check(`live registry identity is a vendor report: ${o.benchmark_id}`,
    registry.get(o.benchmark_id)?.source_type === 'vendor_report', registry.get(o.benchmark_id)?.source_type);
}
check('the card printed a version where the identity claims one',
  ['deepseek-terminal-bench-v2-1::2.1', 'deepseek-terminal-bench-v3::3.0', 'deepseek-terminal-bench-v4::4.0', 'deepseek-deepswe-v1-1::1.1']
    .every((id) => served.some((o) => o.benchmark_id === id)), 'four versioned identities');
check('an unversioned board keeps the card\'s own publication date, not a guessed version',
  served.filter((o) => /::snapshot-2026-09-10$/.test(o.benchmark_id)).length === 15,
  served.filter((o) => /::snapshot-2026-09-10$/.test(o.benchmark_id)).length);

// --- the refusals, live ---------------------------------------------------------------------------
const byLabel = new Map(served.map((o) => [(o.source.locator.match(/row "([^"]+)"/) || [])[1], o]));
check('the footnoted HLE text-only figure is not served as this model\'s HLE',
  byLabel.get('HLE (Pass@1)')?.value !== hleSubset, `${byLabel.get('HLE (Pass@1)')?.value} vs ${hleSubset}`);
const allValues = new Set(rows.filter((o) => o.subject?.model_id === MODEL).map((o) => `${o.benchmark_id}=${o.value}`));
for (const [board, id] of [['DeepSWE v1.1 (Resolved)', 'deepseek-deepswe-v1-1::1.1'], ['Terminal-Bench 2.1 (Pass@1)', 'deepseek-terminal-bench-v2-1::2.1']]) {
  const others = (scaffoldValues.get(board) || []).filter((v) => v !== printed.get(board));
  check(`no other scaffold's number is served as ${board}`,
    others.every((v) => !allValues.has(`${id}=${v}`)), others.join(','));
}
const cardBoards = [...new Set(served.map((o) => o.benchmark_id))];
// A vendor board of this card must carry exactly one row live: DeepSeek's own claim.
const foreign = [];
for (const id of cardBoards) {
  const board = await getJSON(`${BASE}/api/benchmark-scores?benchmark_id=${encodeURIComponent(id)}&limit=100`);
  const boardRows = (board.observations ?? board.results ?? []).filter((o) => o.benchmark_id === id);
  if (boardRows.length !== 1 || boardRows[0].subject?.model_id !== MODEL) foreign.push(`${id}:${boardRows.length}`);
}
check('every card board carries exactly one row, DeepSeek\'s own', foreign.length === 0, foreign.join(','));

// --- CR-85's own question: coverage rose, the score did not ---------------------------------------
check('live board coverage for V4.1 Flash is 39, of which 19 are vendor claims',
  rows.length === 39 && rows.filter((o) => o.basis === 'self_reported').length === 19,
  `${rows.length}/${rows.filter((o) => o.basis === 'self_reported').length}`);
const table = await getJSON(`${BASE}/api/models`);
const model = (table.models ?? table.rows ?? table).find((m) => m.id === MODEL) ?? null;
check('the served model row exists', Boolean(model), model ? model.display_name : 'missing');
check('the served model row names none of the vendor boards',
  Boolean(model) && cardBoards.every((id) => !JSON.stringify(model).includes(id.split('::')[0])), cardBoards.length);
// CR-85's complaint was a composite resting on one input. Coverage rises; the score must not move,
// and the composite must still rest on the single input it had before this ingestion.
check('the composite is unchanged by the vendor claims', model?.composite_unpenalised === 77.41831501831503, model?.composite_unpenalised);
check('the composite still rests on one input, none of them attached',
  model?.composite_coverage === 1 && model?.composite_attached === 0,
  `${model?.composite_coverage}/${model?.composite_attached}`);

// --- the rendered model page ----------------------------------------------------------------------
const slug = encodeURIComponent(MODEL);
const browser = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
for (const view of [{ name: 'desktop-light', width: 1440, height: 1000, scheme: 'light' },
  { name: 'phone-dark', width: 390, height: 844, scheme: 'dark' }]) {
  const context = await browser.newContext({ viewport: { width: view.width, height: view.height }, colorScheme: view.scheme, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`${BASE}/models/${slug}`, { waitUntil: 'networkidle', timeout: 90_000 });
  await page.waitForTimeout(1500);
  const body = await page.evaluate(() => document.body.innerText);
  check(`${view.name}: the page names the model`, /DeepSeek[- ]V4\.1[- ]Flash/i.test(body), body.slice(0, 80));
  for (const label of ['Terminal-Bench 2.1', 'DeepSWE v1.1', 'GPQA Diamond', 'Codeforces']) {
    check(`${view.name}: the page shows the card's ${label} claim`, body.includes(label), label);
  }
  // CR-98's marker is generic (basis === 'self_reported'), so these 19 rows inherit it. 19 is the
  // floor, not the ceiling: an independently measured row for this model must never gain the mark.
  const marks = await page.locator('sup[title="Self-reported by the developer"]').count();
  check(`${view.name}: all 19 vendor claims are visibly marked self-reported`, marks === 19, String(marks));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`${view.name}: no horizontal overflow`, overflow <= 1, overflow);
  check(`${view.name}: no page error`, errors.filter((e) => !/Talisman|extension|chrome-extension/i.test(e)).length === 0,
    errors.slice(0, 3).join(' | '));
  await page.screenshot({ path: `${OUT}/model-${view.name}.png`, fullPage: false });
  await context.close();
}
await browser.close();

const passed = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, revision: meta.revision,
  checked_at: new Date().toISOString(), passed, total: checks.length, checks }, null, 2) + '\n');
console.log(`${passed}/${checks.length} on ${BASE}`);
for (const c of checks) if (!c.ok) console.log(`FAIL ${c.name}: ${c.detail}`);
process.exit(passed === checks.length ? 0 : 1);
