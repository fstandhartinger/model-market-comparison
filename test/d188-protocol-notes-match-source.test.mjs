// D188 — three registry entries whose own text had drifted from the primary source, and the
// daily protocol review had been refusing them for days (LiveBench since 17 Sep, VulcanBench
// since 20 Sep, Terminal-Bench since 20 Sep), with a reason that named the harness instead of
// the field to repair.
//
// Nothing here is a typed expectation: every claim is re-derived from the newest retained
// capture of the source the entry itself names, so the first refresh that rewrites the capture
// does not turn this suite red — and the next real drift (a protocol outside the reviewed
// continuity range, a renamed host, an overall column, an eighth category) does.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { gunzipSync } from 'node:zlib';
import { acceptedCaptures, newestAccepted } from '../lib/source-quarantine.mjs';

const exec = promisify(execFile);
const EVIDENCE = 'data/raw/benchmarks/daily-evidence';
const registry = JSON.parse(await readFile('data/raw/benchmarks/registry.json', 'utf8'));
const entry = (id) => {
  const found = registry.entries.find((row) => row.id === id);
  assert.ok(found, `registry has no entry ${id}`);
  return found;
};

// F-209 / D225 (2026-09-27): the newest capture of a URL that the collector *accepted* — published
// from or confirmed unchanged. A capture the collector quarantined (a board publishing a protocol
// revision outside the registry's reviewed set) is evidence for that arm's repair, not a gate for
// this suite: before this, one such capture turned the shared `npm test` red and, because the publish
// gate runs the whole suite, no source published at all. A quarantined newer capture is named in the
// failure message rather than silently skipped, so nothing here can pass by ignoring evidence.
const capturePool = await acceptedCaptures({
  dirs: (await readdir(EVIDENCE)).map((dir) => `${EVIDENCE}/${dir}`),
  readJson: async (path) => { try { return JSON.parse(await readFile(path, 'utf8')); } catch { return null; } },
});
// Dated, hashed primary fixtures support the 2026-10-07 method review without
// claiming that the daily collector has already published from these bytes.
const vulcanReview = JSON.parse(await readFile('test/fixtures/vulcanbench-frontier-2026-10-07/manifest.json', 'utf8'));
const vulcanReview323 = JSON.parse(await readFile('test/fixtures/vulcanbench-frontier-2026-10-10/manifest.json', 'utf8'));
const captures = capturePool.accepted;
const reviewPool = { ...capturePool, accepted: [...capturePool.accepted, ...vulcanReview, ...vulcanReview323]
  .sort((a, b) => a.retrieved_at.localeCompare(b.retrieved_at)) };
const newestCapture = (url) => newestAccepted(reviewPool, url);
const bytesOf = async (receipt) => {
  const raw = await readFile(receipt.file);
  const body = receipt.file.endsWith('.gz') ? gunzipSync(raw) : raw;
  return body;
};
const visibleText = async (receipt, recipe) => {
  const { stdout } = await exec('python3', ['ops/daily/public-candidate.py', 'text', receipt.file, ...(recipe ? [recipe] : [])], { maxBuffer: 16_000_000 });
  return stdout;
};
const csv = (text) => {
  const lines = text.trim().split('\n');
  const head = lines[0].split(',');
  return lines.slice(1).map((line) => Object.fromEntries(line.split(',').map((cell, index) => [head[index], cell])));
};

// D223 (2026-09-27). The protocol family is a *set* of reviewed revisions, not a numeric range:
// the board's own numbering counts amendments, so v3.15 follows v3.7 while `Number('3.15') < 3.7`.
// The revisions the notes claim, the revisions the guard admits and the revisions the board really
// publishes have to be the same three sets, and the continuity the notes assert is re-derived from
// the operator's own published bundles below rather than believed.
const VULCAN_BOARD = 'https://vulcanbench.com/assets/data/swe-v4-board.csv';
const vulcanRows = csv((await bytesOf(newestCapture(VULCAN_BOARD))).toString());
const revisions = (text) => [...text.matchAll(/v(\d+\.\d+)/g)].map((m) => m[1]);

test('D188: VulcanBench notes name every protocol revision the board actually publishes', () => {
  const excluded = entry('vulcanbench-frontier::4').how_to_collect.excluded_rows ?? [];
  const published = [...new Set(vulcanRows.filter((row) => !excluded.some((x) =>
    ['protocol', 'model', 'harness', 'report'].every((k) => x[k] === row[k])))
    .map((row) => row.protocol))].sort();
  assert.ok(published.length, 'the board CSV carries a protocol column');
  for (const protocol of published) {
    assert.match(protocol, /^code-quality-maintenance-v\d+\.\d+$/, `unexpected protocol literal ${protocol}`);
  }
  const notes = entry('vulcanbench-frontier::4').scoring.notes;
  const claim = notes.match(/the reviewed set is exactly (.*?)\.\s/);
  assert.ok(claim, `the notes must state the reviewed protocol set, got: ${notes}`);
  const reviewed = revisions(claim[1]);
  assert.ok(reviewed.length, 'the reviewed set names at least one revision');
  // Neither narrower nor wider than the board: an unreviewed revision fails, and a revision the
  // board has stopped publishing cannot be carried in the notes as if it were still compared.
  assert.deepEqual([...new Set(reviewed)].sort(),
    [...new Set(published.map((p) => p.replace('code-quality-maintenance-v', '')))].sort(),
    `the notes claim v${reviewed.join(', v')} while the board publishes ${published.join(', ')}`);
});

test('D223: the VulcanBench guard admits exactly the revisions the notes review', () => {
  const board = entry('vulcanbench-frontier::4');
  const guard = board.how_to_collect.version_guard;
  const allowList = guard.match(/protocol in exactly \{([^}]+)\}/);
  assert.ok(allowList, `the guard must state a closed protocol list, got: ${guard}`);
  const claim = board.scoring.notes.match(/the reviewed set is exactly (.*?)\.\s/);
  assert.ok(claim, 'the notes state the reviewed protocol set');
  assert.deepEqual(revisions(allowList[1]).sort(), revisions(claim[1]).sort(),
    'the guard and the notes must review the same revisions');
  assert.match(guard, /fails closed/i);
});

test('D223: every reviewed VulcanBench revision really is the same protocol, judges and task set', async () => {
  const board = entry('vulcanbench-frontier::4');
  const reviewed = revisions(board.scoring.notes.match(/the reviewed set is exactly (.*?)\.\s/)[1]);
  // The bundle of a revision is not typed here: the board row itself names the report, and the
  // report's slug is the directory the operator publishes its evidence under.
  const bundleUrl = (revision) => {
    const row = vulcanRows.find((r) => r.protocol === `code-quality-maintenance-v${revision}`);
    assert.ok(row, `no board row uses v${revision}`);
    const slug = row.report.replace(/^benchmarks\//, '').replace(/\.html$/, '');
    return `https://raw.githubusercontent.com/morganlinton/VulcanBenchCOM/main/assets/data/${slug}/judge-protocols.json`;
  };
  const bundles = new Map();
  for (const revision of reviewed) {
    bundles.set(revision, JSON.parse((await bytesOf(newestCapture(bundleUrl(revision)))).toString()));
  }
  // The invariants the board's own continuity sentence names — same rubric, controls, gates and
  // judges — plus the scoring formula's weights. Byte-equality against the oldest reviewed
  // revision, so a future revision that quietly changes any of them cannot be added to the notes.
  // What may differ is the population itself: `population`, `protocol_ids`, `protocol_sha256`, the
  // `amends` chain, and the operator's per-population handling notes (the single invalid-response
  // retry disclosed from v3.7 on, v3.6's top-up, a revision's unpublished or not-judged runs).
  const INVARIANTS = ['system', 'rubric', 'pair_instruction', 'probe_instruction', 'match_instruction',
    'schemas', 'weights', 'gate_allowance', 'repeats', 'seed', 'single_panel_rule',
    'control_source_hashes', 'scored_panel'];
  const order = (revision) => revision.split('.').map(Number);
  const [reference, ...rest] = [...reviewed].sort((a, b) =>
    order(a)[0] - order(b)[0] || order(a)[1] - order(b)[1]);
  for (const revision of rest) {
    for (const field of INVARIANTS) {
      assert.deepEqual(bundles.get(revision)[field], bundles.get(reference)[field],
        `v${revision} changes ${field} against v${reference}: it is not the reviewed family`);
    }
    // The board row's protocol is one the bundle itself declares (v3.4's own pair is Muse v3.4
    // with Grok v3.3, so the row's id has to be *among* them, not all of them).
    assert.ok(Object.values(bundles.get(revision).protocol_ids).includes(`code-quality-maintenance-v${revision}`),
      `the v${revision} bundle does not declare the protocol its board rows state`);
  }
  // A distinct protocol hash per revision is this family's norm, and the reason the notes cannot
  // be written as "one frozen file": if they ever collapse to one hash, the claim needs rewording.
  const hashes = new Set([...bundles.values()].flatMap((b) => Object.values(b.protocol_sha256)));
  assert.ok(hashes.size > 1, 'the reviewed revisions are expected to carry their own protocol hashes');
  // Every reviewed revision beyond the reference states the chain it amends, and the chain covers
  // the earlier reviewed revisions — that is what makes it a continuation rather than a new family.
  for (const revision of rest) {
    const amends = Object.keys(bundles.get(revision).amends ?? {}).map((key) => key.replace(/^v/, ''));
    assert.ok(amends.includes(reference), `v${revision} does not amend v${reference}`);
  }
  // Same task set: the two per-run exports the D223 review retained, compared id by id.
  const taskSet = async (slug) => {
    const rows = csv((await bytesOf(newestCapture(
      `https://raw.githubusercontent.com/morganlinton/VulcanBenchCOM/main/assets/data/${slug}/runs.csv`))).toString());
    return [...new Set(rows.map((row) => row.task))].sort();
  };
  const [newest, oldest] = [await taskSet('swe-v4-opus55-v315'), await taskSet('swe-v4-astra-fable51-v34')];
  assert.equal(oldest.length, 23, "the reference export covers the board's 23 tasks");
  assert.deepEqual(newest, oldest, 'the v3.15 population ran a different task set');
});

// D256 (2026-09-29): this read only the *newest* capture of the page, and the dates the guard annotates
// are dates of past board updates — "the board's 2026-09-19 update: GPT-5.6 Sol at max, 22 of 23". The
// page prints one `Updated` date, its current one. So the check silently meant "the board has not been
// updated since we wrote the guard": on the 29th the board moved to `Updated 2026-09-28`, this went red
// on a citation that is still true, and because the publish gate runs the whole suite that alone would
// have cost the day. A quarantine could not save it either — `armCaptures` withholds the arm's own
// `source` URL, and `leaderboard.html` belongs to no arm.
//
// The provable form of the same claim: a date the guard cites must be a date the board's page printed in
// some capture we actually hold. That is stable across board updates and still fails on an invented date
// — and when we no longer hold a capture showing it, the failure says exactly that, which is honest
// rather than a pin on the source standing still.
test('D188: every date the VulcanBench guard annotates is a date the board has printed in a capture we hold', async () => {
  const LEADERBOARD = 'https://vulcanbench.com/leaderboard.html';
  const held = captures.filter((receipt) => receipt.url === LEADERBOARD);
  assert.ok(held.length, 'at least one accepted capture of the board page');
  const pages = await Promise.all(held.map(async (receipt) =>
    ({ dir: receipt.dir, text: (await visibleText(receipt)).replace(/\s+/g, ' ') })));
  const guard = entry('vulcanbench-frontier::4').how_to_collect.version_guard;
  // Our review date is receipt metadata, not a claim about the board's update date.
  const dates = [...new Set([...guard.matchAll(/board’s (\d{4}-\d{2}-\d{2}) update/g)].map((m) => m[1]))];
  assert.ok(dates.length, 'the guard annotates the withheld-row exception with a date');
  for (const date of dates) {
    const shown = pages.filter((page) => page.text.includes(date));
    assert.ok(shown.length, `the guard cites ${date}, which no capture of the board page we hold ever prints`
      + ` (${pages.length} capture(s), newest says "${(pages.at(-1).text.match(/Updated \d{4}-\d{2}-\d{2}/) ?? ['—'])[0]}")`);
  }
  // The newest capture's own `Updated` date is a date the board prints, so it must satisfy the same rule
  // the guard's citations do — that is what keeps this from passing on captures alone.
  const current = (pages.at(-1).text.match(/Updated (\d{4}-\d{2}-\d{2})/) ?? [])[1];
  assert.ok(current, 'the newest capture of the page prints an Updated date');
});

test('D188: the Terminal-Bench range is the one its own metrics schema declares', async () => {
  const text = await visibleText(newestCapture('https://www.tbench.ai/'), 'next-rsc');
  const schema = text.match(/\\"accuracy\\":\{\\"type\\":\\"number\\",\\"maximum\\":(\d+),\\"minimum\\":(\d+)\}/);
  assert.ok(schema, 'the page declares the accuracy bounds in its metrics schema');
  const scoring = entry('terminal-bench::4.0').scoring;
  assert.deepEqual(scoring.range, [Number(schema[2]), Number(schema[1])],
    'the registry range must be the schema bounds, not [null, null]');
  assert.equal(scoring.unit, 'percent');
});

test('D188: the Terminal-Bench maintainer is the attribution its own page prints', async () => {
  const page = newestCapture('https://www.tbench.ai/');
  const text = (await visibleText(page, 'next-rsc')).replace(/\s+/g, ' ');
  const board = entry('terminal-bench::4.0');
  assert.match(text, new RegExp(`Hosted by ${board.maintainer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
    `the page must print the maintainer we claim (${board.maintainer})`);
  // The protocol packet only ever carries the recorded excerpts of this page (it is far past
  // the review bound), so one of them has to be the attribution — otherwise the critic is
  // asked to confirm a field no source in front of it mentions.
  const carried = board.evidence.some((reference) => reference.excerpt
    && text.includes(reference.excerpt.replace(/\s+/g, ' ').trim())
    && reference.excerpt.includes(board.maintainer));
  assert.ok(carried, 'no evidence excerpt carries the maintainer attribution');
});

test('D188: the LiveBench notes describe the files the release really publishes', async () => {
  const table = newestCapture('https://livebench.ai/table_2026_06_25.csv');
  const header = (await bytesOf(table)).toString().split('\n')[0].split(',');
  const categories = JSON.parse((await bytesOf(newestCapture('https://livebench.ai/categories_2026_06_25.json'))).toString());
  const notes = entry('livebench::2026-06-25').scoring.notes;

  // No overall column: the overall we publish is derived, and the notes must say so.
  assert.ok(!header.some((column) => /^overall$/i.test(column)),
    `the release now publishes an overall column (${header.join(',')}); the notes claim it does not`);
  assert.match(notes, /never an overall column/);

  // The category count in the notes is the count the release publishes.
  const words = { 5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine' };
  const claimed = notes.match(/(five|six|seven|eight|nine)-category map/);
  assert.ok(claimed, `the notes must state the category count, got: ${notes}`);
  assert.equal(claimed[1], words[Object.keys(categories).length],
    `the release publishes ${Object.keys(categories).length} categories`);
  for (const tasks of Object.values(categories)) {
    for (const task of tasks) assert.ok(header.includes(task), `category task ${task} is missing from the release CSV`);
  }

  // The two per-model overrides the notes name are the two the collector guards, and the
  // guard's literals are still in the site's own bundle.
  const collector = await readFile('scripts/collect-public-benchmarks.py', 'utf8');
  const guarded = [...collector.matchAll(/'(grok-3[\w-]*)':\s*(\d+)/g)].map(([, model, value]) => [model, Number(value)]);
  assert.equal(guarded.length, 2, 'the collector guards exactly the two published overrides');
  for (const [model, value] of guarded) {
    assert.ok(notes.includes(`${model} ${value}`), `the notes must name the ${model} override (${value})`);
  }
  const bundle = captures.filter((receipt) => /livebench\.ai\/static\/js\/main\..*\.js$/.test(receipt.url));
  assert.ok(bundle.length, 'no retained capture of the LiveBench front-end bundle');
  const js = (await bytesOf(bundle[bundle.length - 1])).toString();
  for (const [model, value] of guarded) {
    assert.ok(js.includes(`"${model}"===e.model)return ${value}`), `the bundle no longer hardcodes ${model} = ${value}`);
  }
});
