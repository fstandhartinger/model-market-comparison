// CR-60.2 (Florian 2026-09-16): Union Alpha's announced scores enter as preliminary, chart-read,
// display-only rows with hashed evidence. A preliminary value is shown with ‡ and never enters a
// score, a ranking, a winner/outlier computation or any aggregate (CR-65.10).
//
// Iteration 106 moved these rows out of public-observations.json into their own curated file. That
// is the point of most of this suite: the daily refresh rebuilds public-observations.json per
// benchmark_id from the collector's output, so a hand-curated row parked there is deleted by the
// next scheduled run — silently, because nothing re-reads a number that has vanished.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { buildBenchmarkMatrix, rowWinners, rowOutliers, rowBars } from '../lib/benchmark-matrix.mjs';
import { buildBenchmarkView, latestScores } from '../lib/benchmark-view.mjs';
import { percentileFor } from '../lib/benchmax.mjs';

const MODEL = 'union-alpha::default';
const MANUAL_FILE = 'data/raw/benchmarks/manual-observations.json';
const ROWS = [
  // DeepSWE: the number is printed on the bar. The chart credits an OpenRouter run and names no
  // harness, so the row keeps its own cohort and must not join Epoch's mini-SWE-agent cohort.
  { id: 'public:8a97201d12e564f32e51aef1', benchmark_id: 'deepswe::snapshot-2026-09-15', value: 0.73,
    harness: 'OpenRouter run, harness not stated', ownRow: true },
  // Terminal-Bench v4.0: no printed number; read off the star's y position. The chart credits
  // Artificial Analysis, i.e. the same board our measured rows come from, so it merges into it.
  { id: 'public:5559812676c45459e0b73666', benchmark_id: 'aa-terminal-bench::4.0', value: 0.52,
    harness: null, ownRow: false },
];
const json = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const sha256File = (rel) => {
  const bytes = readFileSync(new URL(`../${rel}`, import.meta.url));
  return createHash('sha256').update(rel.endsWith('.gz') ? gunzipSync(bytes) : bytes).digest('hex');
};

const ds = json('../data/dataset.json');
const scores = json('../data/raw/benchmarks/scores.json');
const manual = json(`../${MANUAL_FILE}`);
const matrix = buildBenchmarkMatrix(buildBenchmarkView(ds), ds, json('../data/benchmark-taxonomy.json'), json('../data/benchmark-caveats.json'));
const cells = matrix.values[MODEL] || [];
/** The transform both table components apply before ranking a row (BenchmarkMatrix/SimpleBenchmarks). */
const ranked = (values, basis) => values.map((v, j) => (basis[j] === 3 ? null : v));

test('both announced Union Alpha rows are committed as preliminary observations', () => {
  for (const spec of ROWS) {
    const o = scores.observations.find((x) => x.id === spec.id);
    assert.ok(o, `${spec.id} is present in the merged snapshot`);
    assert.equal(o.benchmark_id, spec.benchmark_id);
    assert.equal(o.basis, 'preliminary');
    assert.equal(o.value, spec.value);
    assert.equal(o.unit, 'fraction');
    assert.equal(o.subject.model_id, MODEL);
    assert.equal(o.subject.harness ?? null, spec.harness);
    assert.match(o.protocol, /[Cc]hart-read/);
    assert.match(o.join_note, /Hand-curated identity/);
  }
});

test('the rows live in the curated file and never in the collector\'s output', () => {
  // public-observations.json is written by scripts/collect-public-benchmarks.py and asserted
  // byte-for-byte by test/coding-sources.test.mjs — a hand-read chart value has no business there.
  const collected = json('../data/raw/benchmarks/public-observations.json').observations;
  assert.equal(collected.filter((o) => o.basis === 'preliminary').length, 0, 'no preliminary row in the collector output');
  for (const spec of ROWS) {
    assert.ok(!collected.some((o) => o.id === spec.id), `${spec.id} is not a collector row`);
    assert.ok(manual.observations.some((o) => o.id === spec.id), `${spec.id} is curated in ${MANUAL_FILE}`);
  }
  assert.ok(manual.observations.every((o) => o.basis === 'preliminary'), 'the curated file carries preliminary rows only');
  assert.ok(manual.observations.every((o) => o.subject.model_id), 'a hand-curated row names its own subject');
});

test('the daily refresh cannot delete the curated rows', () => {
  // ops/daily/refresh-benchmarks.mjs line ~261, verbatim in shape: for every collected benchmark it
  // drops the existing rows of that benchmark_id and concatenates the collector's fresh ones. Had
  // these rows stayed in public-observations.json, this step would have removed them on 19 Sep.
  const plan = json('../data/raw/benchmarks/collection-plan.json');
  const collected = json('../data/raw/benchmarks/public-observations.json').observations;
  const planned = new Set(plan.entries.map((e) => e.benchmark_id));
  assert.ok(planned.has('deepswe::snapshot-2026-09-15'), 'DeepSWE really is rebuilt by the daily collector');
  let publicRows = [...collected];
  for (const spec of plan.entries) publicRows = publicRows.filter((r) => r.benchmark_id !== spec.benchmark_id);
  for (const spec of ROWS) {
    assert.ok(!publicRows.some((r) => r.id === spec.id), 'sanity: the simulation drops rows of a collected benchmark');
    assert.ok(manual.observations.some((o) => o.id === spec.id), `${spec.id} survives the refresh because it is not in that file`);
  }
});

test('the ingestion reads the curated file', () => {
  const src = readFileSync(new URL('../scripts/ingest-benchmark-scores.mjs', import.meta.url), 'utf8');
  assert.match(src, new RegExp(MANUAL_FILE.replace(/[/.]/g, '\\$&')), 'ingest still merges the curated observations');
});

test('every source a preliminary row cites hash-binds to committed evidence', () => {
  for (const spec of ROWS) {
    const o = scores.observations.find((x) => x.id === spec.id);
    const sources = [o.source, ...(o.supporting_sources || [])];
    assert.ok(sources.length >= 2, 'an announced value carries more than one capture');
    for (const source of sources) {
      assert.match(source.url, /^https:\/\/x\.com\//, 'the announcement is the primary public source');
      assert.equal(sha256File(source.file), source.sha256, `${source.file} content changed`);
      assert.match(source.published_at, /^2026-09-16/);
      assert.match(source.locator, /\S/);
    }
  }
});

test('the announcement posts carry the announced dates and claims (syndication payload evidence)', () => {
  const cline = json('../data/raw/benchmarks/daily-evidence/2026-09-18-union-alpha/cline-post-syndication.json');
  assert.match(cline.created_at, /^2026-09-16/);
  assert.match(cline.text, /Union Alpha/);
  assert.match(cline.text, /~18x lower expected cost/);
  const oc = json('../data/raw/benchmarks/daily-evidence/2026-09-18-union-alpha/opencode-post-syndication.json');
  assert.match(oc.created_at, /^2026-09-16/);
});

test('no measured or self-reported observation exists for Union Alpha — aggregates have only honest inputs', () => {
  const mine = ds.benchmark_results.observations.filter((o) => o.subject.model_id === MODEL);
  assert.deepEqual(mine.map((o) => o.basis).sort(), ['preliminary', 'preliminary']);
  const ua = ds.models.find((m) => m.id === MODEL);
  assert.ok(ua, 'the catalog family exists');
  assert.ok(!ua.scores || ua.scores.composite == null, 'no composite is built from preliminary figures');
  assert.ok(!(ds.category_scores?.[MODEL] && Object.values(ds.category_scores[MODEL]).some((v) => v != null)),
    'no category score is built from preliminary figures');
});

test('the comparison matrix shows both values as preliminary cells, in the right row', () => {
  assert.equal(cells.length, 2, 'Union Alpha has exactly the two announced cells');
  for (const spec of ROWS) {
    const rowsOfBenchmark = matrix.rows.map((r, i) => [r, i]).filter(([r]) => r.benchmarkId === spec.benchmark_id);
    const withCell = rowsOfBenchmark.filter(([, i]) => cells.some(([rowIndex]) => rowIndex === i));
    assert.equal(withCell.length, 1, `exactly one ${spec.benchmark_id} row holds the Union Alpha value`);
    const [row, i] = withCell[0];
    const cell = cells.find(([rowIndex]) => rowIndex === i);
    assert.deepEqual([cell[1], cell[2]], [spec.value, 3], 'displayed value with the preliminary basis code');
    assert.equal(row.cohort, spec.harness, 'the cohort is exactly what the source lets us claim');
    const population = Object.values(matrix.values).filter((cs) => cs.some(([r]) => r === i)).length;
    if (spec.ownRow) {
      // A value whose harness the source never stated must not share a line with measured runs of a
      // known harness: it sits alone, and the mini-SWE-agent cohort keeps its measured population.
      assert.equal(population, 1, 'the not-like-for-like value stands in its own row');
      const measured = rowsOfBenchmark.find(([r]) => r.cohort === 'mini-SWE-agent');
      assert.ok(measured, 'the measured DeepSWE cohort still exists');
      const measuredPopulation = Object.values(matrix.values).filter((cs) => cs.some(([r]) => r === measured[1])).length;
      assert.ok(measuredPopulation >= 60, `the measured cohort is untouched (${measuredPopulation} models)`);
      assert.ok(!Object.entries(matrix.values).some(([id, cs]) => id === MODEL && cs.some(([r]) => r === measured[1])),
        'Union Alpha never appears in the measured cohort');
    } else {
      // Iteration 148: the chart (2026-09-16) predates AA's Terminal-Bench 4.0 harness rewrite, so the value stays on
      // the retained identity. Once AA publishes a snapshot past that identity's window, the measured population
      // moves to the successor and the preliminary value stands alone on the retired row — never on the new board.
      const entry = ds.benchmark_results.registry.find((e) => e.id === spec.benchmark_id);
      const successor = entry?.status === 'retained' && entry.superseded_by;
      const successorRows = successor ? matrix.rows.map((r, j) => [r, j]).filter(([r]) => r.benchmarkId === successor) : [];
      const successorPopulation = successorRows.reduce((n, [, j]) => n + Object.values(matrix.values).filter((cs) => cs.some(([r]) => r === j)).length, 0);
      assert.ok(population > 100 || successorPopulation > 100,
        `the AA board keeps its population (${population} on ${spec.benchmark_id}, ${successorPopulation} on ${successor || 'no successor'})`);
      assert.ok(!successorRows.some(([, j]) => cells.some(([rowIndex]) => rowIndex === j)), 'the preliminary value never moves onto the successor board');
    }
  }
});

test('a preliminary value never wins its row or takes an outlier tag', () => {
  for (const spec of ROWS) {
    const i = cells.find(([rowIndex]) => matrix.rows[rowIndex].benchmarkId === spec.benchmark_id)[0];
    const row = matrix.rows[i];
    const ids = Object.keys(matrix.values).filter((id) => matrix.values[id].some(([r]) => r === i));
    const at = (id) => matrix.values[id].find(([r]) => r === i);
    const values = ids.map((id) => at(id)[1]);
    const basis = ids.map((id) => at(id)[2]);
    const mine = ids.indexOf(MODEL);
    assert.ok(mine >= 0 && basis[mine] === 3);

    // As published: no bold, no tag on our cell.
    assert.equal(rowWinners(ranked(values, basis), row.higherBetter)[mine], false, 'not bold in the real row');
    assert.ok(!rowOutliers(ranked(values, basis), row.higherBetter)[mine], 'no outlier tag in the real row');

    // And if the announcement had claimed the best number in the row, it still would not win: the
    // guard is the basis, not the size of the value.
    const best = Math.max(...values.filter((v, j) => basis[j] !== 3));
    const boosted = values.map((v, j) => (j === mine ? best + 0.1 : v));
    const winners = rowWinners(ranked(boosted, basis), row.higherBetter);
    assert.equal(winners[mine], false, 'a chart-read claim never becomes best in row');
    if (ids.length > 1) assert.ok(winners.some(Boolean), 'the best measured value still wins the row');
  }
});

test('both benchmark tables explain the ‡ mark in their legend', () => {
  // F-122: the wording now lives once, in the shared legend both tables (and Compare) render.
  const legend = readFileSync(new URL('../components/TableLegend.tsx', import.meta.url), 'utf8');
  assert.match(legend, /‡ marks a preliminary, announced value/, 'TableLegend');
  assert.match(legend, /never enters a score or a ranking/, 'TableLegend');
  for (const file of ['components/BenchmarkMatrix.tsx', 'components/SimpleBenchmarks.tsx', 'components/BenchmarkCompare.tsx']) {
    const src = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    assert.match(src, /<(Table|Compare)Legend/, `${file}: renders the shared legend`);
  }
  for (const file of ['components/BenchmarkMatrix.tsx', 'components/SimpleBenchmarks.tsx']) {
    const src = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    // The cell itself must carry the mark and its explanation, not just the legend.
    assert.match(src, /basis\[j\] === 3 && <sup/, `${file}: the ‡ is rendered on the cell`);
  }
});

test('F-122: the legend has a line for every tag the tag set defines', () => {
  const legend = readFileSync(new URL('../components/TableLegend.tsx', import.meta.url), 'utf8');
  // The tag lines are generated from the data, never hand-written — that is what keeps a new tag
  // (Retired, Changed at source) from arriving without an explanation a phone reader can reach.
  assert.match(legend, /tagKeys\.map\(/, 'the tag lines come from the tag set');
  const taxonomy = JSON.parse(readFileSync(new URL('../data/benchmark-taxonomy.json', import.meta.url), 'utf8'));
  const keys = Object.keys(taxonomy.tags);
  assert.ok(keys.includes('retired') && keys.includes('source_changed'), 'the caveat tags are in the tag set');
  for (const k of keys) {
    assert.ok(typeof taxonomy.tags[k].label === 'string' && taxonomy.tags[k].label.length, `${k}: label`);
    assert.ok(typeof taxonomy.tags[k].tip === 'string' && taxonomy.tags[k].tip.length, `${k}: tip`);
  }
  // Simple shows the caveat tags; the full comparison shows all of them.
  const simple = readFileSync(new URL('../components/SimpleBenchmarks.tsx', import.meta.url), 'utf8');
  assert.match(simple, /tagKeys=\{CAVEAT_TAGS\}/, 'Simple lists the caveat tags it can show');
  const matrix = readFileSync(new URL('../components/BenchmarkMatrix.tsx', import.meta.url), 'utf8');
  assert.match(matrix, /tagKeys=\{Object\.keys\(matrix\.tags\)\}/, 'the full comparison lists every tag');
});

test('the anticipated prices on both charts are never ingested as costs', () => {
  // Both posts show a price next to the score; both are the poster's expectation for a stealth
  // model that is free on OpenRouter today. CR-60.2: never shown as a measured adjusted cost.
  const costRows = scores.observations.filter((o) => o.subject.model_id === MODEL && /cost|price/i.test(o.benchmark_id));
  assert.equal(costRows.length, 0, 'no cost observation entered from a chart');
  for (const spec of ROWS) {
    const o = scores.observations.find((x) => x.id === spec.id);
    assert.match(o.protocol, /anticipated pricing|never ingested or shown as (?:a )?(?:an )?(?:adjusted )?cost/,
      'the protocol says the plotted price is not a measured cost');
  }
});

// F-121 (iteration 106, found live): before this fix the Compare table gave the chart-read
// Terminal-Bench value a "Catalog percentile 87" and let it compete for the "best measured relative
// position" tint. Both came from one expression, and CR-65.10 forbids both.
test('the Compare table denies a preliminary value a percentile, a bar and the best-in-row tint', () => {
  const src = readFileSync(new URL('../components/BenchmarkCompare.tsx', import.meta.url), 'utf8');
  const line = src.split('\n').find((l) => l.includes('const normalized = row'));
  assert.ok(line, 'the normalized expression still exists');
  // CR-127 (2026-09-22) tightened this gate from "not preliminary" to "measured only", so a vendor's
  // own report is kept out of the percentile and the tint for the same reason. That is strictly
  // stronger than what CR-65.10 asks for here, so this pin reads the predicate instead of one
  // spelling of it — a weaker rule that let a preliminary row through would still fail.
  const predicate = line.match(/row && !row\.lowSample && (.+?) \? normalize\(/)?.[1];
  assert.ok(predicate, 'the basis gate still guards `normalize`');
  const admits = (basis) => Boolean(new Function('row', `return (${predicate});`)({ basis, lowSample: false }));
  assert.equal(admits('preliminary'), false, 'preliminary is excluded from `normalized`');
  assert.equal(admits('measured'), true, 'a measured value still earns its percentile');
  // `normalized` is the single source of all three: percentile text, bar width and `best`.
  // CR-127 replaced the empty bar track a cell without a percentile used to draw with a line that says
  // why there is none; the percentile text and the bar are now the other arm of that same ternary.
  assert.match(src, /normalized == null\s*\n?\s*\? <span [^>]*data-bh-percentile-note/, 'a cell without a percentile says so');
  assert.match(src, /<span className="sr-only">Catalog percentile \{Math\.round\(normalized\)\}/, 'percentile still derives from normalized');
  assert.match(src, /width: `\$\{Math\.max\(2, normalized\)\}%`/, 'the bar still derives from normalized');
  assert.match(src, /const best = cells\.reduce<number \| null>\(\(max, cell\) => cell\.normalized == null/, 'the tint still derives from normalized');
});

test('every surface that shows a preliminary value also marks it', () => {
  // CR-127.4 (2026-09-22): this list was written for the three table components and missed the model
  // page's benchmark sheet, which was rendering Union Alpha's 52.0% and 73.0% as bare numbers — the
  // probe below proves those rows really do reach it. `BenchmarkSheetLazy` is the sheet's row renderer.
  for (const file of ['components/BenchmarkMatrix.tsx', 'components/SimpleBenchmarks.tsx', 'components/BenchmarkCompare.tsx', 'components/BenchmarkSheetLazy.tsx']) {
    const src = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    assert.match(src, /‡/, `${file} renders the preliminary mark`);
    assert.match(src, /preliminary/, `${file} explains the mark`);
  }
  const compare = readFileSync(new URL('../components/BenchmarkCompare.tsx', import.meta.url), 'utf8');
  assert.match(compare, /row\.basis === 'preliminary' && <sup/, 'the Compare cell carries the mark');
  // CR-60.2 asks for a tooltip that says chart-read.
  assert.match(compare, /title="Preliminary: chart-read\./, 'the Compare tooltip says chart-read');
  const evidence = readFileSync(new URL('../components/BenchmarkEvidence.tsx', import.meta.url), 'utf8');
  assert.match(evidence, /row\.basis === 'preliminary'/, 'the evidence panel special-cases preliminary');
  assert.match(evidence, /Chart-read: announced in a launch post/, 'the evidence panel spells out chart-read');
  const sheet = readFileSync(new URL('../components/BenchmarkSheetLazy.tsx', import.meta.url), 'utf8');
  assert.match(sheet, /a\.basis === 'preliminary' && <sup/, "the model page's benchmark sheet carries the mark");
  assert.match(sheet, /a\.basis === 'preliminary' \? 'announced value'/, 'and says why the row has no percentile');
  assert.match(readFileSync(new URL('../components/BenchmarkSheet.tsx', import.meta.url), 'utf8'),
    /data-bh-sheet-preliminary-line/, 'the sheet head explains ‡ the way it already explains †');
  // Both marks must be audible, not only hoverable: a `title` on a <sup> is not announced.
  for (const [file, src] of [['components/SimpleBenchmarks.tsx', readFileSync(new URL('../components/SimpleBenchmarks.tsx', import.meta.url), 'utf8')],
    ['components/BenchmarkMatrix.tsx', readFileSync(new URL('../components/BenchmarkMatrix.tsx', import.meta.url), 'utf8')]]) {
    assert.match(src, /†<span className="sr-only"> self-reported by the developer<\/span>/, `${file}: † is announced`);
    assert.match(src, /‡<span className="sr-only"> preliminary, not yet independently measured<\/span>/, `${file}: ‡ is announced`);
  }
});

test('the model page really does render Union Alpha\'s preliminary rows', () => {
  // Without this the guard above could pass on a sheet that never sees a preliminary row.
  const view = buildBenchmarkView(ds);
  const rows = view.axes
    .filter((a) => a.scores.some((r) => r.modelId === MODEL))
    .map((a) => { const own = a.scores.filter((r) => r.modelId === MODEL); return { name: a.name, shown: latestScores(own)[0] ?? own[0] }; });
  assert.equal(rows.length, ROWS.length, `the sheet shows ${ROWS.length} rows for ${MODEL}`);
  for (const r of rows) assert.equal(r.shown.basis, 'preliminary', `${r.name} reaches the sheet as a preliminary value`);
  // …and `percentileFor` ranks measured rows only, so the sheet's bar is already absent for them.
  for (const axis of view.axes.filter((a) => a.scores.some((r) => r.modelId === MODEL))) {
    assert.equal(percentileFor(axis, MODEL), null, `${axis.name}: a preliminary row takes no percentile`);
  }
});

// F-123 (Fable pass 23, found live): /benchmarks and the Simple Benchmarks section drew a data bar behind
// Union Alpha's 52.0%‡ (bars ["100%", "99.96%"] on the Terminal-Bench v4.0 row) while /compare drew none.
// A bar is a ranking cue; a chart-read value gets none — the same masked array feeds bars, bold and tags.
test('a preliminary value never gets a data bar, and both tables pass the masked row to rowBars', () => {
  for (const spec of ROWS) {
    const i = cells.find(([rowIndex]) => matrix.rows[rowIndex].benchmarkId === spec.benchmark_id)[0];
    const row = matrix.rows[i];
    const ids = Object.keys(matrix.values).filter((id) => matrix.values[id].some(([r]) => r === i));
    const at = (id) => matrix.values[id].find(([r]) => r === i);
    const values = ids.map((id) => at(id)[1]);
    const basis = ids.map((id) => at(id)[2]);
    const mine = ids.indexOf(MODEL);
    const bars = rowBars(ranked(values, basis), row.higherBetter, row.unit);
    assert.equal(bars[mine], null, `${spec.benchmark_id}: no bar behind a chart-read value`);
    // With one measured value left, F-84 gives the row no bar at all; with two or more the measured ones keep theirs.
    const measured = values.filter((v, j) => basis[j] !== 3 && v != null).length;
    assert.equal(bars.some((b) => b != null), measured >= 2, `${spec.benchmark_id}: measured bars follow F-84`);
  }
  for (const file of ['components/BenchmarkMatrix.tsx', 'components/SimpleBenchmarks.tsx']) {
    const src = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    assert.match(src, /const ranked = vals\.map\(\(v, j\) => \(basis\[j\] === 3 \? null : v\)\);/, `${file}: the masked row exists`);
    assert.match(src, /rowBars\(ranked, /, `${file}: bars come from the masked row`);
    assert.match(src, /rowWinners\(ranked, /, `${file}: bold comes from the masked row`);
    assert.doesNotMatch(src, /rowBars\(vals, /, `${file}: no bar is computed from the unmasked row`);
  }
});
