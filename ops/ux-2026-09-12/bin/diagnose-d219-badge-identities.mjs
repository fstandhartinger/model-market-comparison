#!/usr/bin/env node
// D219 (2026-09-26): three benchmark arms have been retained since 2026-09-25 with
// "Prior public identities disappeared", and the cause is the same for all three: a source's
// **"new model" badge is captured as part of the model's name**, so the row changes identity the day the
// source retires the badge. Nothing left either board.
//
// The badge is presentational and each source spells it differently:
//   * eqbench encodes it in the CSV payload as a leading `*` (and `!` for NSFW). Its own renderer strips
//     both before display — `creative_writing.js`: `const isNewModel = currentModelName.startsWith('*');
//     currentModelName = currentModelName.replace(/^\*/, '')`. So `*GLM-5.3` was never a label the board
//     showed; the label was always `GLM-5.3`.
//   * Andon Labs appends the word ` New` to the model cell of the Vending-Bench 2 leaderboard.
//
// It found a second, stacked cause on the way, which is why the check reports per row rather than per board:
// Vending-Bench 2's "Current leaderboard" table holds exactly **10 rows**, and the three new entrants pushed
// `Claude Opus 4.6`, `GPT-5.5` and `GPT-5.6 Terra` off the bottom. Those three are **not** a badge change and
// must not be de-badged or withdrawn. The captured page mentions them six times each, but only as chart
// colour variables (`--color-GPT-5.6 Terra: #65A30D`) — it carries no score for them, and its "Show more"
// control is not in the capture. So they need either a fuller source than the truncated table or a withheld
// record carrying their locator; deleting them would make the history bridge republish the values as
// estimates. A blanket strip would fix neither.
//
// This script re-derives the claim from the captures rather than trusting any write-up: for each board it
// diffs the last successful capture against today's and asserts that every name that "disappeared"
// reappears with its badge removed, and that every value is unchanged. It reads captures only and writes
// nothing. Run it before building the remedy, and again after, against the same two captures.
//
//   node ops/ux-2026-09-12/bin/diagnose-d219-badge-identities.mjs [--json]
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';

const DIR = 'data/raw/benchmarks/daily-evidence';
// The last capture the arms ingested, and the first that failed closed. Both are committed evidence.
const BEFORE = `${DIR}/2026-09-23T10-16-55-034Z`;
const AFTER = `${DIR}/2026-09-26T05-26-18-430Z`;

const read = async (dir, file) => gunzipSync(await readFile(`${dir}/${file}`)).toString('utf8');
const sha = (text) => createHash('sha256').update(text).digest('hex').slice(0, 16);

/** eqbench ships its board as a CSV string inside a template literal; the plan's `template_csv` parser reads the same one. */
function templateCsv(source, variable, valueField) {
  const at = source.indexOf(variable);
  if (at < 0) throw new Error(`${variable} is not in this capture`);
  const open = source.indexOf('`', at), close = source.indexOf('`', open + 1);
  const lines = source.slice(open + 1, close).trim().split('\n').filter((l) => l.trim());
  const header = lines[0].split(',');
  const value = header.indexOf(valueField);
  if (value < 0) throw new Error(`${variable}: no ${valueField} column, header is ${header.join(',')}`);
  return new Map(lines.slice(1).map((line) => line.split(',')).filter((c) => c.length > value).map((c) => [c[0], c[value]]));
}

/** The Vending-Bench 2 "Current leaderboard": the plan's `html_table` parser, name column 1, value column 2. */
function htmlTable(source) {
  const table = source.match(/<table[^>]*>([\s\S]*?)<\/table>/);
  if (!table) throw new Error('no leaderboard table in this capture');
  const cell = (html) => html.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  const rows = new Map();
  for (const tr of table[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const cells = [...tr[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((m) => cell(m[1]));
    if (cells.length < 3 || cells[1] === 'Model') continue;
    rows.set(cells[1], cells[2]);
  }
  return rows;
}

// `debadge` is the rule the remedy has to implement, stated once here so the diagnosis and the fix agree.
// It is deliberately per-source: stripping a trailing "New" from every board would eat a real model name.
const BOARDS = [
  {
    id: 'eqbench-creative-writing::3', parser: 'template_csv',
    files: { [BEFORE]: '28cad62a817f8e52162f.gz', [AFTER]: '722ddb132e8d3a5e5c39.gz' },
    read: (s) => templateCsv(s, 'leaderboardDataCreativeWritingV3', 'elo_score'),
    debadge: (name) => name.replace(/^[*!]+/, ''),
    badge: 'leading * (new) or ! (NSFW), stripped by eqbench\'s own renderer before display',
  },
  {
    id: 'eqbench-longform-writing::v1.11', parser: 'template_csv',
    files: { [BEFORE]: 'd5abd451059e489715ec.gz', [AFTER]: '3ba283ce357ac7620e16.gz' },
    read: (s) => templateCsv(s, 'leaderboardDataLongformV3', 'overall_score_100'),
    debadge: (name) => name.replace(/^[*!]+/, ''),
    badge: 'leading * (new) or ! (NSFW), stripped by eqbench\'s own renderer before display',
  },
  {
    id: 'vending-bench::2', parser: 'html_table',
    files: { [BEFORE]: '8b64607fb13e428e0068.gz', [AFTER]: 'c2e0ba808f06a5f13e84.gz' },
    read: htmlTable,
    debadge: (name) => name.replace(/\s+New$/, ''),
    badge: 'trailing " New" word in the Model cell',
  },
];

const report = [];
let failures = 0;
for (const board of BOARDS) {
  const before = board.read(await read(BEFORE, board.files[BEFORE]));
  const after = board.read(await read(AFTER, board.files[AFTER]));
  const gone = [...before.keys()].filter((name) => !after.has(name));
  const added = [...after.keys()].filter((name) => !before.has(name));

  // The claim, checked one row at a time: each vanished name is present de-badged, at the same value.
  const explained = [], unexplained = [], valueMoved = [];
  for (const name of gone) {
    const plain = board.debadge(name);
    if (plain === name || !after.has(plain)) { unexplained.push(name); continue; }
    explained.push({ from: name, to: plain, value_before: before.get(name), value_after: after.get(plain) });
    if (before.get(name) !== after.get(plain)) valueMoved.push({ name, before: before.get(name), after: after.get(plain) });
  }
  // A genuinely new entrant arrives *wearing* the badge; that is the other half of the same convention.
  const freshlyBadged = added.filter((name) => board.debadge(name) !== name && !before.has(board.debadge(name)));

  const ok = unexplained.length === 0 && explained.length > 0;
  if (!ok) failures += 1;
  report.push({
    benchmark_id: board.id, parser: board.parser, badge: board.badge,
    rows: { before: before.size, after: after.size },
    capture_sha256_16: { before: sha(await read(BEFORE, board.files[BEFORE])), after: sha(await read(AFTER, board.files[AFTER])) },
    disappeared: gone.length, explained_by_badge_removal: explained.length, unexplained,
    values_changed_across_the_relabel: valueMoved, new_entrants_wearing_the_badge: freshlyBadged,
    // These are the rows a remedy has to carry across, published under the badged name and now absent.
    restatements_required: explained.map(({ from, to }) => ({ from, to })),
    verdict: ok ? 'every disappearance is a retired badge; no row left this board' : 'at least one disappearance is NOT a badge change — do not apply a blanket strip',
  });
}

if (process.argv.includes('--json')) {
  process.stdout.write(`${JSON.stringify({ before: BEFORE, after: AFTER, boards: report, failures }, null, 1)}\n`);
} else {
  for (const r of report) {
    console.log(`\n${r.benchmark_id}  (${r.parser}; badge: ${r.badge})`);
    console.log(`  rows ${r.rows.before} → ${r.rows.after}; disappeared ${r.disappeared}, explained by a retired badge ${r.explained_by_badge_removal}`);
    console.log(`  values changed across the relabel: ${r.values_changed_across_the_relabel.length}`);
    console.log(`  new entrants wearing the badge: ${r.new_entrants_wearing_the_badge.join(', ') || '(none)'}`);
    if (r.unexplained.length) console.log(`  UNEXPLAINED: ${r.unexplained.join(', ')}`);
    console.log(`  ${r.verdict}`);
    for (const { from, to } of r.restatements_required) console.log(`    restate  ${from}  →  ${to}`);
  }
  console.log(`\n${failures ? `${failures} board(s) need a closer look` : 'all three boards: the disappearance is a retired badge, nothing was withdrawn'}`);
}
process.exit(failures ? 1 : 0);
