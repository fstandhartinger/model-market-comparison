// D188 — three registry entries whose own text had drifted from the primary source, and the
// daily protocol review had been refusing them for days (LiveBench since 17 Sep, VulcanBench
// since 20 Sep, Terminal-Bench since 20 Sep), with a reason that named the harness instead of
// the field to repair.
//
// Nothing here is a typed expectation: every claim is re-derived from the newest retained
// capture of the source the entry itself names, so the first refresh that rewrites the capture
// does not turn this suite red — and the next real drift (a v3.8 protocol, a renamed host, an
// overall column, an eighth category) does.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { gunzipSync } from 'node:zlib';

const exec = promisify(execFile);
const EVIDENCE = 'data/raw/benchmarks/daily-evidence';
const registry = JSON.parse(await readFile('data/raw/benchmarks/registry.json', 'utf8'));
const entry = (id) => {
  const found = registry.entries.find((row) => row.id === id);
  assert.ok(found, `registry has no entry ${id}`);
  return found;
};

// The newest retained 200 capture of a URL, whatever run produced it.
const captures = [];
for (const dir of (await readdir(EVIDENCE)).sort()) {
  let manifest;
  try { manifest = JSON.parse(await readFile(`${EVIDENCE}/${dir}/manifest.json`, 'utf8')); } catch { continue; }
  for (const receipt of Array.isArray(manifest) ? manifest : []) {
    if (receipt.status === 200 && receipt.url && receipt.file) captures.push({ dir, ...receipt });
  }
}
function newestCapture(url) {
  const hits = captures.filter((receipt) => receipt.url === url);
  assert.ok(hits.length, `no retained capture of ${url}`);
  return hits[hits.length - 1];
}
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

test('D188: VulcanBench notes name every protocol family the board actually publishes', async () => {
  const board = newestCapture('https://vulcanbench.com/assets/data/swe-v4-board.csv');
  const rows = csv((await bytesOf(board)).toString());
  const published = [...new Set(rows.map((row) => row.protocol))].sort();
  assert.ok(published.length, 'the board CSV carries a protocol column');

  // The notes state the family as a range "code-quality-maintenance-vA–vB"; every protocol the
  // board publishes has to fall inside it. An eighth revision on the board fails this row.
  const notes = entry('vulcanbench-frontier::4').scoring.notes;
  const range = notes.match(/code-quality-maintenance-v(\d+\.\d+)–v(\d+\.\d+)/);
  assert.ok(range, `the notes must state the protocol family as a range, got: ${notes}`);
  const [low, high] = [Number(range[1]), Number(range[2])];
  for (const protocol of published) {
    const version = Number(protocol.replace('code-quality-maintenance-v', ''));
    assert.ok(Number.isFinite(version), `unexpected protocol literal ${protocol}`);
    assert.ok(version >= low && version <= high,
      `the board publishes ${protocol}, outside the ${range[0]} the notes claim (published: ${published.join(', ')})`);
  }
  // …and the range is not wider than the board: both ends are really published.
  assert.ok(published.includes(`code-quality-maintenance-v${range[1]}`), `no board row uses v${range[1]}`);
  assert.ok(published.includes(`code-quality-maintenance-v${range[2]}`), `no board row uses v${range[2]}`);
});

test('D188: every date the VulcanBench guard annotates is a date the board prints', async () => {
  const page = (await visibleText(newestCapture('https://vulcanbench.com/leaderboard.html'))).replace(/\s+/g, ' ');
  const guard = entry('vulcanbench-frontier::4').how_to_collect.version_guard;
  const dates = [...new Set(guard.match(/\d{4}-\d{2}-\d{2}/g) ?? [])];
  assert.ok(dates.length, 'the guard annotates the withheld-row exception with a date');
  for (const date of dates) {
    assert.ok(page.includes(date), `the guard cites ${date}, which the board's own page never prints (it says "${(page.match(/Updated \d{4}-\d{2}-\d{2}/) ?? ['—'])[0]}")`);
  }
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
