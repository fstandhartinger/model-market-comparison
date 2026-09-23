// D188 — the live receipt for the three registry entries whose own text had drifted from the
// primary source and had been freezing their boards in the daily protocol review.
//
// Nothing here is a typed expectation. Every claim is re-derived from the newest retained
// capture of the source the entry itself names, and the hosts are then required to agree:
// the repaired text is what they serve, and not one board row changed while it was repaired.
//
// usage: node verify-d188.mjs [outDir] [host ...]
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { gunzipSync } from 'node:zlib';

const exec = promisify(execFile);
const REPO = process.env.BH_REPO || '/opt/model-market-comparison';
const OUT = process.argv[2] || '/opt/benchmarkheaven/state/ux-evidence/d188';
const HOSTS = process.argv.slice(3).length ? process.argv.slice(3)
  : ['https://benchmarkheaven.com', 'https://model-market-comparison.app.mintapis.com'];
const BOARDS = ['vulcanbench-frontier::4', 'terminal-bench::4.0', 'livebench::2026-06-25'];
await mkdir(OUT, { recursive: true });

const checks = [];
const check = (scope, name, ok, detail) => {
  checks.push({ scope, name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${scope} ${name}${ok ? '' : ` — ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`}`);
};
const getJson = async (url) => {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`HTTP ${response.status} ${url}`);
  return response.json();
};

// ------------------------------------------------ what the retained primary captures say
const captures = [];
for (const dir of (await readdir(`${REPO}/data/raw/benchmarks/daily-evidence`)).sort()) {
  let manifest;
  try { manifest = JSON.parse(await readFile(`${REPO}/data/raw/benchmarks/daily-evidence/${dir}/manifest.json`, 'utf8')); } catch { continue; }
  for (const receipt of Array.isArray(manifest) ? manifest : []) {
    if (receipt.status === 200 && receipt.url && receipt.file) captures.push(receipt);
  }
}
const newest = (url) => {
  const hits = captures.filter((receipt) => receipt.url === url);
  if (!hits.length) throw new Error(`no retained capture of ${url}`);
  return hits[hits.length - 1];
};
const body = async (receipt) => gunzipSync(await readFile(`${REPO}/${receipt.file}`)).toString();
const visible = async (receipt, recipe) => (await exec('python3',
  ['ops/daily/public-candidate.py', 'text', receipt.file, ...(recipe ? [recipe] : [])],
  { cwd: REPO, maxBuffer: 16_000_000 })).stdout;

const vulcanRows = (await body(newest('https://vulcanbench.com/assets/data/swe-v4-board.csv'))).trim().split('\n');
const vulcanHead = vulcanRows[0].split(',');
const vulcanProtocols = [...new Set(vulcanRows.slice(1).map((line) => line.split(',')[vulcanHead.indexOf('protocol')]))].sort();
const tbenchRaw = await visible(newest('https://www.tbench.ai/'), 'next-rsc');
const tbenchText = tbenchRaw.replace(/\s+/g, ' ');
const vulcanPage = (await visible(newest('https://vulcanbench.com/leaderboard.html'))).replace(/\s+/g, ' ');
const liveHead = (await body(newest('https://livebench.ai/table_2026_06_25.csv'))).split('\n')[0].split(',');
const liveCategories = JSON.parse(await body(newest('https://livebench.ai/categories_2026_06_25.json')));
const liveBundle = captures.filter((receipt) => /livebench\.ai\/static\/js\/main\..*\.js$/.test(receipt.url));
const liveJs = await body(liveBundle[liveBundle.length - 1]);
const collector = await readFile(`${REPO}/scripts/collect-public-benchmarks.py`, 'utf8');
const overrides = [...collector.matchAll(/'(grok-3[\w-]*)':\s*(\d+)/g)].map(([, model, value]) => [model, Number(value)]);

const derived = { vulcan_protocols: vulcanProtocols, livebench_categories: Object.keys(liveCategories).length,
  livebench_overall_column: liveHead.some((column) => /^overall$/i.test(column)), overrides };
console.log(`derived: ${JSON.stringify(derived)}`);

// ------------------------------------------------ what the repository holds (the publication baseline)
const dataset = JSON.parse(await readFile(`${REPO}/data/dataset.json`, 'utf8'));
const localScores = new Map();
for (const id of BOARDS) {
  const rows = (dataset.benchmark_results?.observations ?? []).filter((row) => row.benchmark_id === id);
  localScores.set(id, rows);
}

for (const host of HOSTS) {
  const scope = new URL(host).host;
  let meta;
  try { meta = await getJson(`${host}/api/meta?t=${Date.now()}`); } catch (error) { check(scope, 'api/meta', false, error.message); continue; }
  check(scope, 'revision published', typeof meta.revision === 'string' && /^[0-9a-f]{40}$/.test(meta.revision), meta.revision);

  let served;
  try { served = await getJson(`${host}/api/benchmarks?t=${Date.now()}`); } catch (error) { check(scope, 'api/benchmarks', false, error.message); continue; }
  const entry = (id) => served.benchmarks.find((row) => row.id === id);

  // ---- VulcanBench: the notes state a protocol range, and it is exactly the board's own
  const vulcan = entry('vulcanbench-frontier::4');
  check(scope, 'vulcanbench served', !!vulcan, vulcan ? 'present' : 'missing');
  if (vulcan) {
    const range = (vulcan.scoring?.notes ?? '').match(/code-quality-maintenance-v(\d+\.\d+)–v(\d+\.\d+)/);
    check(scope, 'vulcanbench notes state a protocol range', !!range, vulcan.scoring?.notes?.slice(0, 160));
    if (range) {
      const inside = vulcanProtocols.filter((protocol) => {
        const version = Number(protocol.replace('code-quality-maintenance-v', ''));
        return version >= Number(range[1]) && version <= Number(range[2]);
      });
      check(scope, 'every published protocol is inside the stated range', inside.length === vulcanProtocols.length,
        { stated: range[0], published: vulcanProtocols });
      check(scope, 'the range ends are both published', vulcanProtocols.includes(`code-quality-maintenance-v${range[1]}`)
        && vulcanProtocols.includes(`code-quality-maintenance-v${range[2]}`), { stated: range[0], published: vulcanProtocols });
      check(scope, 'the stale v3.6 upper bound is gone', range[2] !== '3.6', range[0]);
    }
    const guard = vulcan.how_to_collect?.version_guard ?? '';
    const guardDates = [...new Set(guard.match(/\d{4}-\d{2}-\d{2}/g) ?? [])];
    check(scope, 'the guard annotates its exception with a date', guardDates.length > 0, guardDates);
    check(scope, 'every date the guard cites is one the board prints',
      guardDates.every((date) => vulcanPage.includes(date)),
      { cited: guardDates, board: (vulcanPage.match(/Updated \d{4}-\d{2}-\d{2}/) ?? ['—'])[0] });
    check(scope, 'vulcanbench notes quote the board sentence',
      (vulcan.scoring?.notes ?? '').includes('v3.4 to v3.7 apply the same rubric, controls, gates and judges to each population'),
      vulcan.scoring?.notes?.slice(-220));
  }

  // ---- Terminal-Bench: the maintainer attribution is carried by an excerpt the page prints
  const tbench = entry('terminal-bench::4.0');
  check(scope, 'terminal-bench served', !!tbench, tbench ? 'present' : 'missing');
  if (tbench) {
    const attribution = `Hosted by ${tbench.maintainer}`;
    check(scope, 'the page prints the maintainer we claim', tbenchText.includes(attribution), attribution);
    const carried = (tbench.evidence ?? []).filter((reference) => (reference.excerpt ?? '').includes(tbench.maintainer));
    check(scope, 'an evidence excerpt carries the attribution', carried.length === 1, carried.map((r) => r.excerpt));
    check(scope, 'that excerpt resolves against the retained capture',
      carried.length === 1 && tbenchText.includes(carried[0].excerpt.replace(/\s+/g, ' ').trim()), carried[0]?.excerpt);
    check(scope, 'it is read with the recipe the page needs', carried[0]?.recipe === 'next-rsc', carried[0]?.recipe);
    const schema = tbenchRaw.match(/\\"accuracy\\":\{\\"type\\":\\"number\\",\\"maximum\\":(\d+),\\"minimum\\":(\d+)\}/);
    check(scope, 'the page declares its accuracy bounds', !!schema, schema?.[0]);
    check(scope, 'the served range is the schema bounds, not [null, null]',
      !!schema && Array.isArray(tbench.scoring?.range) && tbench.scoring.range[0] === Number(schema[2]) && tbench.scoring.range[1] === Number(schema[1]),
      { served: tbench.scoring?.range, schema: schema ? [Number(schema[2]), Number(schema[1])] : null });
  }

  // ---- LiveBench: the notes describe the files the release really publishes
  const live = entry('livebench::2026-06-25');
  check(scope, 'livebench served', !!live, live ? 'present' : 'missing');
  if (live) {
    const notes = live.scoring?.notes ?? '';
    check(scope, 'the unverifiable README claim is gone', !/README/.test(notes), notes.slice(0, 120));
    check(scope, 'the release really publishes no overall column', !derived.livebench_overall_column && /never an overall column/.test(notes), liveHead.join(','));
    const words = { 5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine' };
    check(scope, 'the category count is the published one',
      notes.includes(`${words[derived.livebench_categories]}-category map`), { published: derived.livebench_categories, notes: notes.slice(0, 200) });
    check(scope, 'every category task is a column of the release',
      Object.values(liveCategories).every((tasks) => tasks.every((task) => liveHead.includes(task))), liveHead.length);
    for (const [model, value] of overrides) {
      check(scope, `the ${model} override is named and still in the bundle`,
        notes.includes(`${model} ${value}`) && liveJs.includes(`"${model}"===e.model)return ${value}`), `${model} ${value}`);
    }
  }

  // ---- and nothing about the three boards' published values moved while the notes were repaired
  for (const id of BOARDS) {
    let rows;
    try {
      rows = [];
      for (let offset = 0; ; offset += 500) {
        const page = await getJson(`${host}/api/benchmark-scores?benchmark_id=${encodeURIComponent(id)}&limit=500&offset=${offset}&t=${Date.now()}`);
        const batch = page.observations ?? [];
        rows.push(...batch);
        if (batch.length < 500) break;
      }
    } catch (error) { check(scope, `${id} rows readable`, false, error.message); continue; }
    const local = localScores.get(id) ?? [];
    check(scope, `${id}: the host serves every row the repository holds`, rows.length === local.length,
      { host: rows.length, repo: local.length });
    const hostValues = new Map(rows.map((row) => [row.id, row.value]));
    const differing = local.filter((row) => !hostValues.has(row.id) || hostValues.get(row.id) !== row.value);
    check(scope, `${id}: every value is the repository's value`, differing.length === 0,
      differing.slice(0, 5).map((row) => ({ id: row.id, repo: row.value, host: hostValues.get(row.id) ?? null })));
  }
}

const passed = checks.filter((entry) => entry.ok).length;
await writeFile(`${OUT}/verification.json`, JSON.stringify({ verifiedAt: new Date().toISOString(), repo: REPO, hosts: HOSTS, derived, passed, total: checks.length, checks }, null, 2));
console.log(`\n${passed}/${checks.length} checks passed`);
process.exitCode = passed === checks.length ? 0 : 1;
