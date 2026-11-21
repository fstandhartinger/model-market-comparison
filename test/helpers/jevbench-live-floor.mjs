// CR-817: shared live-surface check for the JevBench n >= 30 row-breakdown floor (CR-257, since v1.8.11).
// Until 21 Nov 2026 each test/cr-257-v18NN-min-samples.test.mjs carried its own copy of the live check. Every copy assembled
// the same uncached live board four times (directly and inside board-all/open/api), and each assembly re-validates the whole
// release chain: six copies cost ~1,220 s each in the daily npm-test (65 % of its 3,600 s cap on 21 Nov 2026). Now each live
// surface is checked once, one surface per test file so the four assemblies still run in parallel worker processes.
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';

const DIR = 'data/raw/benchmarks/jevbench/v1.8';
export const FLOOR_FROM = 11; // v1.8.11 introduced the n >= 30 row-breakdown floor
export const releases = readdirSync(DIR)
 .map(name => name.match(/^jevbench-v1\.8\.(\d+)-publication\.json$/))
 .filter(m => m && Number(m[1]) >= FLOOR_FROM)
 .map(m => ({minor: Number(m[1]), version: `v1.8.${m[1]}`,
  verdict: JSON.parse(readFileSync(`${DIR}/${m[0]}`)).review?.verdict}))
 .sort((a, b) => a.minor - b.minor);
export const published = releases.filter(r => r.verdict === 'PASS');

// Inspect every nested breakdown object, including an arbitrary chain of previous rows (v1.8.12+).
function walkBreakdowns(value, visit, path = [], inBreakdowns = false) {
 if (!value || typeof value !== 'object') return;
 for (const [name, cell] of Object.entries(value)) {
  const next = [...path, name];
  const inside = inBreakdowns || name === 'breakdowns';
  if (inside && cell && typeof cell === 'object' && Number.isInteger(cell.n)) visit(value, name, cell, next);
  walkBreakdowns(cell, visit, next, inside);
 }
}
export function assertRowBreakdownFloor(artifact, surface) {
 for (const row of artifact.systems) walkBreakdowns(row, (_, name, cell, path) => {
  assert.ok(cell.n >= 30, `${surface}: ${row.key}.${path.join('.')}: n=${cell.n}`);
 });
}
// v1.8.11 shipped with the floor on the row's own v16.breakdowns only; its frozen input keeps deeper previous cells
// (e.g. chon-1.0-e4b.previous.v16.breakdowns.family.calibration n=22). The former v1.8.11 copy checked exactly this level.
function assertV16BreakdownFloor(artifact, surface) {
 for (const row of artifact.systems) for (const [dimension, cells] of Object.entries(row.v16?.breakdowns ?? {})) {
  if (!cells || typeof cells !== 'object') continue;
  for (const [name, cell] of Object.entries(cells)) {
   assert.ok(!(cell && typeof cell === 'object' && Number.isInteger(cell.n) && cell.n < 30),
    `${surface}: ${row.key}.${dimension}.${name}: n=${cell?.n}`);
  }
 }
}

const skipReason = 'no v1.8.11+ release PASS yet; live board still uses the historical release';

/** The assembled live board: restated by the newest PASS release (or a later listed one) and floor-clean. */
export async function checkLiveBoard(t) {
 if (!published.length) return t.skip(skipReason);
 const {readJevbenchV161Release} = await import('../../lib/jevbench-v16-release.mjs');
 const {readJevbenchV157Release} = await import('../../lib/jevbench-v15-release.mjs');
 const {assembleJevBoard} = await import('../../lib/jevbench-live-board.mjs');
 const [release, previous] = await Promise.all([readJevbenchV161Release(), readJevbenchV157Release()]);
 const apiA4 = JSON.parse(readFileSync('data/jevbench-api-a4-equated.json'));
 const board = await assembleJevBoard({release, previous, apiA4, live: true});
 // Each former per-release copy required restated_by to be its own release or a later one; together: at or after the newest PASS.
 const newest = published.at(-1).minor;
 const restated = String(board.published.restated_by).match(/^v1\.8\.(\d+)$/);
 assert.ok(restated && Number(restated[1]) >= newest && releases.some(r => r.minor === Number(restated[1])),
  `restated_by ${board.published.restated_by} must be v1.8.${newest} or a later listed release`);
 assertRowBreakdownFloor(board.published, 'live board');
}

/** One published All-data input: board-all, board-open, board-api or a v1.8.NN release. */
export async function checkAllDataInput(t, version) {
 if (!published.length) return t.skip(skipReason);
 const {readJevAllDataInput} = await import('../../lib/jevbench-alldata-input.mjs');
 const input = await readJevAllDataInput(version);
 assert.ok(input, `${version}: published input exists`);
 (version === 'v1.8.11' ? assertV16BreakdownFloor : assertRowBreakdownFloor)(input.artifact, version);
}
