// D186 + D187 — the live receipt for two source changes: a restated row label and six retracted values.
//
// Everything expected here is re-derived from the repository's own records and the retained captures, never
// typed in: the restatement record names the old and new label, the withdrawal records name the six rows, and
// the captures are re-parsed to confirm the board itself no longer publishes those values. The live hosts are
// then required to agree — the published row carries the new label, the six retracted rows are served by
// neither host, every remaining row of those boards is still served with its value, and no retracted value
// comes back as a history estimate.
//
// usage: node verify-d186-d187.mjs [outDir] [host ...]
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';

const REPO = process.env.BH_REPO || '/opt/model-market-comparison';
const OUT = process.argv[2] || '/opt/benchmarkheaven/state/ux-evidence/d186-d187';
const HOSTS = process.argv.slice(3).length ? process.argv.slice(3)
  : ['https://benchmarkheaven.com', 'https://model-market-comparison.app.mintapis.com'];
const readJson = async (name) => JSON.parse(await readFile(`${REPO}/${name}`, 'utf8'));
await mkdir(OUT, { recursive: true });

const KERNELBENCH_URL = 'https://raw.githubusercontent.com/Infatoshi/kernelbench.com/master/benchmarks/cuda/results/leaderboard.json';
const PROBLEM = {
  'kernelbench-cuda-glm52-fused-moe::rtx-pro-6000': '01_glm52_fused_moe',
  'kernelbench-cuda-deepseek-nsa::rtx-pro-6000': '02_deepseek_nsa',
  'kernelbench-cuda-megaqwen-decode::rtx-pro-6000': '03_megaqwen_decode',
  'kernelbench-cuda-grid-mingru-sps::rtx-pro-6000': '04_grid_mingru_sps',
};
const TODAY_CAPTURE = '2026-09-23T10-16-55-034Z';

const checks = [];
const check = (scope, name, ok, detail) => {
  checks.push({ scope, name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${scope} ${name}${ok ? '' : ` — ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`}`);
};

// ---------------------------------------------------------------- what the repository records
const observations = await readJson('data/raw/benchmarks/public-observations.json');
const [restatement] = observations.source_label_restatements ?? [];
const withdrawn = (observations.withdrawn_observations ?? []).filter((o) => PROBLEM[o.benchmark_id]);
const restated = observations.observations.find((o) => o.id === restatement?.id);
check('repo', 'd186/record-and-row', !!restatement && !!restated && restated.subject.source_id === restatement.to,
  { from: restatement?.from, to: restatement?.to, published: restated?.subject.source_id, value: restated?.value });
check('repo', 'd187/six-withdrawals-with-reasons', withdrawn.length === 6 && withdrawn.every((o) => /D187/.test(o.withdrawn_reason ?? '')),
  withdrawn.map((o) => `${o.benchmark_id} ${o.subject.source_id} ${o.value}`));

// ---------------------------------------------------------------- what the board itself now publishes
const manifest = await readJson(`data/raw/benchmarks/daily-evidence/${TODAY_CAPTURE}/manifest.json`);
const boardEntry = manifest.find((e) => e.url === KERNELBENCH_URL);
const boardBytes = gunzipSync(await readFile(`${REPO}/${boardEntry.file}`));
check('repo', 'd187/capture-digest', createHash('sha256').update(boardBytes).digest('hex') === boardEntry.sha256, boardEntry.file);
const board = JSON.parse(boardBytes.toString('utf8'));
const boardValue = (label, problem) => (board.models.find((m) => m.label === label)?.results ?? {})[problem]?.peak_fraction ?? null;
const stillScored = withdrawn.filter((o) => boardValue(o.subject.source_id, PROBLEM[o.benchmark_id]) !== null);
check('repo', 'd187/board-publishes-no-value-for-them', stillScored.length === 0, stillScored.map((o) => o.subject.source_id));

// ---------------------------------------------------------------- what the hosts serve
const rowsOf = async (host, benchmarkId) => {
  const response = await fetch(`${host}/api/benchmark-scores?benchmark_id=${encodeURIComponent(benchmarkId)}&limit=500`);
  if (!response.ok) throw new Error(`${host} ${benchmarkId}: HTTP ${response.status}`);
  const body = await response.json();
  return body.rows ?? body.observations ?? body.scores ?? [];
};
const labelOf = (row) => row.subject?.source_id ?? row.source_id ?? row.subject?.name ?? row.name ?? null;
const valueOf = (row) => row.value ?? row.score ?? null;

for (const host of HOSTS) {
  const meta = await (await fetch(`${host}/api/meta`)).json();
  check(host, 'live/revision', typeof meta.revision === 'string' && meta.revision.length >= 12, meta.revision);

  // D186: the board row is served under the label the source now prints, with its value, and the old label is gone.
  const atlas = await rowsOf(host, restatement.benchmark_id);
  const now = atlas.filter((row) => labelOf(row) === restatement.to);
  check(host, 'd186/new-label-is-served', now.length === 1 && Math.abs(valueOf(now[0]) - restated.value) < 1e-9,
    { rows: now.length, value: now[0] && valueOf(now[0]), expected: restated.value });
  check(host, 'd186/old-label-is-gone', !atlas.some((row) => labelOf(row) === restatement.from), restatement.from);
  check(host, 'd186/board-row-count-unchanged', atlas.length === observations.observations.filter((o) => o.benchmark_id === restatement.benchmark_id).length,
    { live: atlas.length, repo: observations.observations.filter((o) => o.benchmark_id === restatement.benchmark_id).length });

  // D187: neither host serves a retracted value, and nothing else of those boards was swept up.
  for (const benchmarkId of Object.keys(PROBLEM)) {
    const live = await rowsOf(host, benchmarkId);
    const liveLabels = new Set(live.map(labelOf));
    const retracted = withdrawn.filter((o) => o.benchmark_id === benchmarkId);
    const served = retracted.filter((o) => liveLabels.has(o.subject.source_id));
    check(host, `d187/${benchmarkId}/retracted-not-served`, served.length === 0, served.map((o) => `${o.subject.source_id} = ${o.value}`));
    const expected = observations.observations.filter((o) => o.benchmark_id === benchmarkId);
    const missing = expected.filter((o) => !liveLabels.has(o.subject.source_id));
    const wrong = expected.filter((o) => {
      const row = live.find((r) => labelOf(r) === o.subject.source_id);
      return row && Math.abs(valueOf(row) - o.value) > 1e-9;
    });
    check(host, `d187/${benchmarkId}/remaining-rows-intact`, missing.length === 0 && wrong.length === 0 && live.length === expected.length,
      { live: live.length, expected: expected.length, missing: missing.map((o) => o.subject.source_id), wrong: wrong.map((o) => o.subject.source_id) });
  }
}

// ---------------------------------------------------------------- no retracted or restated value returns as an estimate
const dataset = await readJson('data/dataset.json');
const estimates = dataset.benchmark_results.historical.estimates;
const ghosts = [
  ...withdrawn.map((o) => ({ benchmark_id: o.benchmark_id, label: o.subject.source_id })),
  { benchmark_id: restatement.benchmark_id, label: restatement.from },
].filter(({ benchmark_id, label }) => estimates.some((e) => e.benchmark_id === benchmark_id && e.subject_name === label));
check('dataset', 'no-ghost-estimates', ghosts.length === 0, ghosts);
// The fix must not have swept the neighbouring boards' legitimate estimates away with it (19 of them did vanish
// while the withheld locator was matched across boards).
const kernelbenchEstimates = estimates.filter((e) => PROBLEM[e.benchmark_id]).length;
check('dataset', 'sibling-board-estimates-survive', kernelbenchEstimates > 0, { kernelbenchEstimates });

const failed = checks.filter((c) => !c.ok);
await writeFile(`${OUT}/verification.json`, JSON.stringify({
  verifiedAt: new Date().toISOString(), repo: REPO, hosts: HOSTS,
  derived: { restatement: { from: restatement.from, to: restatement.to, id: restatement.id }, withdrawn: withdrawn.length, kernelbenchEstimates },
  passed: checks.length - failed.length, total: checks.length, checks,
}, null, 2));
console.log(`\n${checks.length - failed.length}/${checks.length} D186/D187 checks passed — ${OUT}/verification.json`);
process.exit(failed.length ? 1 : 0);
