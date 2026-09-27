#!/usr/bin/env node
// D232 live receipt: the FrontierCode cost column's own metric text reaches the public registry, and
// not one of the board's 98 published values moved while it got there.
//
//   node ops/ux-2026-09-12/bin/verify-d232-live.mjs <base> <outDir>
//
// Two surfaces, because that is where a reader and a reviewer meet this change:
//   * /api/benchmarks — the registry as the deploy serves it (memory: the cheapest live proof of a
//     registry repair). The new reference has to be there with its marker, its page and its quoted
//     column definition, the five earlier references have to still be there, and `frontiercode::1.1`
//     has to be untouched, which is what shows the repair did not spill into the neighbouring board.
//   * /api/benchmark-scores — the values. A registry repair that moves a number is a different
//     change; five pins and the total say it did not.
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const [base, outDir] = process.argv.slice(2);
if (!base || !outDir) { console.error('usage: verify-d232-live.mjs <base> <outDir>'); process.exit(2); }

const ID = 'frontiercode-cost::1.1';
const PAGE = 'https://cognition.com/frontiercode';
const MARKER = 'note:"Cost ($): the mean USD spend per rollout."';
const NOTE_SENTENCE = 'is captured by the declared-marker rule in scripts/capture-benchmark-sources.py';
// Pins read from the published board before this change; every one of them must still read the same.
const PINS = [['SWE-2|medium', 0.3712], ['SWE-2|high', 0.7813], ['SWE-2|max', 1.1761],
  ['Claude Fable 5.1|low', 2.3849], ['Claude Fable 5.1|max', 12.8257]];

const checks = [];
const check = (name, ok, detail) => checks.push({ name, ok: Boolean(ok), detail: String(detail ?? '') });
const get = async (path) => {
  const response = await fetch(new URL(path, base), { headers: { 'User-Agent': 'BenchmarkHeavenVerifier/1.0' } });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
};

const meta = await get('/api/meta');
check('deploy reports a revision', /^[0-9a-f]{40}$/.test(meta.revision ?? ''), meta.revision);

const registry = await get('/api/benchmarks');
const entry = registry.benchmarks.find((e) => e.id === ID);
check('the cost board is served', Boolean(entry), entry ? entry.name : 'missing');
const marked = (entry?.evidence ?? []).filter((r) => r.follow_script_marker);
check('exactly one evidence reference is discovered by marker', marked.length === 1, `${marked.length}`);
const reference = marked[0] ?? {};
check('it follows the leaderboard page', reference.page_url === PAGE, reference.page_url);
check('its marker is the column note', reference.follow_script_marker === MARKER, reference.follow_script_marker);
check('the captured script is one of the page\'s declared chunks',
  /^https:\/\/cognition\.com\/_next\/static\/chunks\/[^/]+\.js/.test(reference.url ?? ''), reference.url);
for (const [label, text] of [['the metric name', 'label:"Cost ($)"'], ['the unit', 'avg cost (USD) per rollout'],
  ['the field the locator reads', 'field:"cost"'], ['the note the marker selected on', MARKER]]) {
  check(`the quoted column definition states ${label}`, (reference.excerpt ?? '').includes(text), text);
}
check('the row still publishes the metric its source states', entry?.scoring?.metric === 'Cost per rollout', entry?.scoring?.metric);
check('the row still publishes the unit its source states', entry?.scoring?.unit === 'USD', entry?.scoring?.unit);
check('lower is still better on a cost board', entry?.scoring?.higher_better === false, `${entry?.scoring?.higher_better}`);
check('the collection notes name the discovery rule', (entry?.how_to_collect?.notes ?? '').includes(NOTE_SENTENCE),
  (entry?.how_to_collect?.notes ?? '').slice(-160));
check('the five earlier references are still served', (entry?.evidence ?? []).length === 6, `${(entry?.evidence ?? []).length}`);
for (const url of [PAGE, 'https://cognition.com/data/frontiercode-leaderboard/data.json',
  'https://cognition.com/blog/frontier-code-1.1', 'https://cognition.com/robots.txt']) {
  check(`still cited: ${url}`, (entry?.evidence ?? []).some((r) => r.url === url), url);
}
const score = registry.benchmarks.find((e) => e.id === 'frontiercode::1.1');
check('the score board next to it is untouched',
  (score?.evidence ?? []).length === 6 && !(score?.evidence ?? []).some((r) => r.follow_script_marker),
  `${(score?.evidence ?? []).length} refs`);

const board = await get(`/api/benchmark-scores?benchmark_id=${encodeURIComponent(ID)}&limit=500`);
check('all 98 observations are published', board.total === 98 && board.observations.length === 98,
  `${board.total} / ${board.observations.length}`);
for (const [sourceId, value] of PINS) {
  const row = board.observations.find((r) => r.subject.source_id === sourceId);
  check(`unmoved: ${sourceId}`, row?.value === value, `${row?.value}`);
}
check('every value is still a self-reported USD amount',
  board.observations.every((r) => r.unit === 'USD' && r.basis === 'self_reported'),
  `${board.observations.filter((r) => r.unit !== 'USD' || r.basis !== 'self_reported').length} exceptions`);

await mkdir(outDir, { recursive: true });
const pass = checks.filter((c) => c.ok).length;
await writeFile(join(outDir, 'verification.json'),
  `${JSON.stringify({ base, at: new Date().toISOString(), revision: meta.revision, pass, total: checks.length, checks }, null, 2)}\n`);
console.log(`${base}: ${pass}/${checks.length}`);
for (const c of checks) if (!c.ok) console.log(`  FAIL ${c.name} — ${c.detail}`);
process.exit(pass === checks.length ? 0 : 1);
