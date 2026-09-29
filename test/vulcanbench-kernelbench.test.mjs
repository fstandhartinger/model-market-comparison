import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { parseVulcanbenchFrontierLabel, parseKernelbenchCudaLabel } from '../lib/board-identity.mjs';
import { acceptedCaptures, newestAccepted } from '../lib/source-quarantine.mjs';

// 2026-09-18 (iteration 114, CR-82.3 / CR-82.4). The sources are the committed captures of
// vulcanbench.com's board CSV and kernelbench.com's baked leaderboard.json; mutations below are
// synthetic failure probes, never source claims.
test('VulcanBench Frontier v4 parser reads the board CSV, keeps the protocol and fails closed on header, task count, harness, effort and protocol', () => {
  const output = execFileSync('python3', ['-B', '-c', String.raw`
import importlib.util,gzip,hashlib,json
from pathlib import Path
s=importlib.util.spec_from_file_location('collector','scripts/collect-public-benchmarks.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
entries={e['benchmark_id']:e for e in json.loads(Path('data/raw/benchmarks/collection-plan.json').read_text())['entries']}
reg={e['id']:e for e in json.loads(Path('data/raw/benchmarks/registry.json').read_text())['entries']}
e=entries['vulcanbench-frontier::4'];entry=reg['vulcanbench-frontier::4']
raw=gzip.decompress(Path(e['source']['file']).read_bytes());assert hashlib.sha256(raw).hexdigest()==e['source']['sha256']
rows=m.parse(raw.decode('utf-8'),e['parser'],None,entry)
assert len(rows)==37,len(rows)
got={r['id']:r for r in rows}
field=e['parser']['value_field']
assert field=='combined_full_denominator',field
assert abs(m.numeric(got['Fable 5.1 [max]'][field])-91.8365)<1e-9
assert got['Fable 5.1 [max]']['context']['harness']=='Claude Code'
assert got['GPT-5.5 [low]']['context']['n_tasks']==23 and got['GPT-5.5 [low]']['context']['tasks_passed']==1
assert got['Fable 5.1 [extra-high]']['context']['effort']=='extra-high'
text=raw.decode('utf-8-sig')
def fails(csv_text,why):
  try: m.parse(csv_text,e['parser'],None,entry)
  except ValueError: return
  raise AssertionError('accepted: '+why)
fails(text.replace('code-quality-maintenance-v3.4','code-quality-maintenance-v4.0'),'protocol family changed')
fails(text.replace('True,23,91.8365','True,24,91.8365'),'a judged count above its own denominator')
fails(text.replace('Claude Code','ClaudeCode'),'unlisted harness')
fails('\n'.join([text.splitlines()[0].replace(',n,','/tasks,')]+text.splitlines()[1:]),'header changed')
fails(text.replace('Anthropic,Claude Code,max,','Anthropic,Claude Code,mega,'),'unlisted effort')
print('ok')
`]).toString();
  assert.equal(output.trim(), 'ok');
});

// 2026-09-21 (iteration 143): the board began publishing a run judged on fewer than its 23 tasks, and
// the whole board's daily refresh had been failing closed on that single row since 2026-09-20. The rule
// then was "withhold any row whose n is not 23".
//
// D256.1 (2026-09-29): the board appended `passed_of` and `combined_timeouts_zero`, and they show that
// rule was conflating two different events. `passed_of` is the task set a row was scored over; `n` is how
// many of those runs were judged. A row with `passed_of` below 23 was scored over a smaller set and has no
// figure on the full 23 — it stays withheld. A row with `passed_of` 23 and a lower `n` ran the full suite
// and did not finish every run, and the board publishes the combined score over all 23 with each unfinished
// run scored 0; that figure is on one denominator with every other row, so it is the one we publish. The
// identity `combined_timeouts_zero == combined_33 x n / passed_of` is what ties the two figures to one
// scale, and breaking it has to fail closed — otherwise the column could come to mean anything.
test('VulcanBench Frontier publishes the full-denominator figure, withholds a reduced-suite row, and fails closed on a grown, implausible or inconsistent one', () => {
  const output = execFileSync('python3', ['-B', '-c', String.raw`
import importlib.util,gzip,json
from pathlib import Path
s=importlib.util.spec_from_file_location('collector','scripts/collect-public-benchmarks.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
entries={e['benchmark_id']:e for e in json.loads(Path('data/raw/benchmarks/collection-plan.json').read_text())['entries']}
reg={e['id']:e for e in json.loads(Path('data/raw/benchmarks/registry.json').read_text())['entries']}
e=entries['vulcanbench-frontier::4'];entry=reg['vulcanbench-frontier::4'];field=e['parser']['value_field']
text=gzip.decompress(Path(e['source']['file']).read_bytes()).decode('utf-8-sig')
lines=text.splitlines()
head=lines[0].split(',');col={name:i for i,name in enumerate(head)}
def edit(row_index,**cells):
  out=list(lines);c=out[row_index].split(',')
  for name,value in cells.items():c[col[name]]=str(value)
  out[row_index]=','.join(c);return '\n'.join(out)+'\n'
def parse(csv_text):return {r['id']:r for r in m.parse(csv_text,e['parser'],None,entry)}
got=parse(text);assert len(got)==37,len(got)

# The board's two 22-task rows are the reduced-suite case: scored over a smaller set, so withheld.
assert 'GPT-5.6 Sol [max]' not in got and 'Opus 5.5 [high]' not in got
# The timed-out rows ran all 23 and are published at the board's own full-denominator figure, never at
# the headline cell value, and the row says so in its own provenance.
luna=got['GPT-6 Luna [max]']
assert abs(m.numeric(luna[field])-67.2629)<1e-9,luna[field]
assert abs(luna['context']['combined_33']-81.4235)<1e-9
assert luna['context']['runs_judged']==19 and luna['context']['unfinished_runs']==4 and luna['context']['n_tasks']==23
assert 'count as failed tasks and score 0' in luna['context']['scored_on']
xhigh=got['GPT-6 Luna [extra-high]']
assert abs(m.numeric(xhigh[field])-71.9354)<1e-9
# A row that finished every run is published at combined_33 and says nothing about timeouts.
low=got['GPT-6 Luna [low]']
assert abs(m.numeric(low[field])-40.8310)<1e-9 and low['context']['unfinished_runs']==0
assert 'every run judged' in low['context']['scored_on']

def fails(csv_text,why):
  try: m.parse(csv_text,e['parser'],None,entry)
  except ValueError: return
  raise AssertionError('accepted: '+why)
luna_row=[i for i,l in enumerate(lines) if l.startswith('23,GPT-6 Luna,')][0]
# The identity that makes the two figures one scale. Control: restoring it parses again.
fails(edit(luna_row,combined_timeouts_zero='80.0'),'a timeouts-zero figure that is not the judged mean over all 23')
assert abs(m.numeric(parse(edit(luna_row,combined_timeouts_zero='67.2629'))['GPT-6 Luna [max]'][field])-67.2629)<1e-9
# It is checked on full rows too, where the board simply restates combined_33.
fails(edit([i for i,l in enumerate(lines) if l.startswith('34,GPT-6 Luna,')][0],combined_timeouts_zero='60.0'),
      'a restatement that disagrees with combined_33 on a row where nothing timed out')
# A run judged on all 23 but with no full-denominator figure is withheld, not guessed.
short=parse(edit(luna_row,combined_timeouts_zero=''))
assert 'GPT-6 Luna [max]' not in short and len(short)==36,len(short)
fails(edit(1,passed_of=24),'a grown suite is a different identity')
fails(edit(1,n=24,passed_of=24),'a grown suite is a different identity however it is spelled')
fails(edit(1,n=24),'more judged runs than the row was scored over')
fails(edit(1,passed_of=0,n=0),'a zero task count is not a partial run')
fails(edit(1,n='n/a'),'a non-numeric task count')
fails(edit(1,passed_of='n/a'),'a non-numeric denominator')
many=list(lines)
for i in range(1,6):
  c=many[i].split(',');c[col['passed_of']]='22';c[col['n']]='22';many[i]=','.join(c)
fails('\n'.join(many)+'\n','five reduced-suite rows means the suite changed, not one withheld judge score')
print('ok')
`]).toString();
  assert.equal(output.trim(), 'ok');
});

// D224 (2026-09-27): the assertion used to be a typed count ("all 24 model x effort columns join"),
// which stayed green while the board grew past the reviewed label map — GPT-5.6 Sol's four
// publishable columns and, from 2026-09-26, Claude Opus 5.5's four were silently refused as unknown
// labels for days, and a correct rebuild that finally joined them would have turned the count red.
// The board itself is the expectation now: every column it publishes has to resolve to an exact
// catalog configuration, and every join the map holds has to be a column the board really carries.
test('VulcanBench Frontier joins: every model x effort column the board publishes is an exact catalog configuration', async () => {
  assert.deepEqual(parseVulcanbenchFrontierLabel('Fable 5.1 [max]'), { family: 'claude-fable-5.1', effort: 'max' });
  assert.deepEqual(parseVulcanbenchFrontierLabel('GPT-5.5 [extra-high]'), { family: 'gpt-5.5', effort: 'xhigh' }, "VulcanBench's own spelling of the xhigh tier");
  assert.deepEqual(parseVulcanbenchFrontierLabel('GPT-6 Astra [ultra]'), { family: 'gpt-6-astra', effort: 'ultra' }, 'an unreviewed setting is refused downstream');
  assert.deepEqual(parseVulcanbenchFrontierLabel('Opus 5.5 [high]'), { family: 'claude-opus-5.5', effort: 'high' }, 'D224: the board spells Claude Opus 5.5 "Opus 5.5"');
  assert.deepEqual(parseVulcanbenchFrontierLabel('GPT-6 Luna [max]'), { family: 'gpt-6-luna', effort: 'max' }, 'D256.1: the v3.16 population, five effort columns');

  // The newest capture of the board the collector *accepted*, whatever run took it — the same rule
  // the D188/D223 protocol suites use, so a fresher board in a daily run is what this reads, not a
  // pinned fixture. D256 (2026-09-29): this scan used to take the newest 200 capture outright. On the
  // 29th the collector quarantined that capture (the board appended two columns and a sixteenth
  // protocol revision) and this check read it anyway, went red on a model the arm had refused to
  // publish, and took the whole publish gate with it — the blast radius F-209 exists to bound.
  const EVIDENCE = 'data/raw/benchmarks/daily-evidence';
  const BOARD = 'https://vulcanbench.com/assets/data/swe-v4-board.csv';
  const pool = await acceptedCaptures({
    dirs: readdirSync(EVIDENCE).map((dir) => `${EVIDENCE}/${dir}`),
    readJson: async (path) => { try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return null; } },
  });
  // Throws — naming the quarantined newer capture — rather than quietly falling back to nothing.
  const newest = newestAccepted(pool, BOARD);
  const lines = gunzipSync(readFileSync(newest.file)).toString('utf8').trim().split('\n');
  const head = lines[0].split(',');
  const rows = lines.slice(1).map((line) => Object.fromEntries(line.split(',').map((cell, i) => [head[i], cell])));
  assert.ok(rows.length, 'the capture carries board rows');

  const configurations = new Set(JSON.parse(readFileSync('data/dataset.json', 'utf8')).models.map((m) => m.id));
  const columns = new Map();
  for (const row of rows) {
    const label = `${row.model} [${row.effort}]`;
    const parsed = parseVulcanbenchFrontierLabel(label);
    assert.ok(parsed.family && parsed.effort,
      `the board publishes ${label}, which no reviewed label rule resolves — review the model and extend the map`);
    const id = `${parsed.family}::${parsed.effort}`;
    assert.ok(configurations.has(id), `${label} resolves to ${id}, which is not a catalog configuration`);
    columns.set(label, id);
  }

  const map = JSON.parse(readFileSync('data/raw/benchmarks/identity-map.json', 'utf8')).entries;
  const joins = map.filter((e) => e.benchmark_id === 'vulcanbench-frontier::4');
  assert.ok(joins.length, 'the map holds VulcanBench Frontier joins');
  for (const join of joins) {
    assert.ok(columns.has(join.source_id), `the map joins ${join.source_id}, which the board no longer publishes`);
    assert.equal(join.model_id, columns.get(join.source_id), `${join.source_id} is joined to a different configuration than the label rule yields`);
  }
});

test('KernelBench-CUDA parser scores only the site-valid cells and cross-checks the published ranked list', () => {
  const output = execFileSync('python3', ['-B', '-c', String.raw`
import importlib.util,gzip,hashlib,json,copy
from pathlib import Path
s=importlib.util.spec_from_file_location('collector','scripts/collect-public-benchmarks.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
entries={e['benchmark_id']:e for e in json.loads(Path('data/raw/benchmarks/collection-plan.json').read_text())['entries']}
e=entries['kernelbench-cuda-grid-mingru-sps::rtx-pro-6000'];raw=gzip.decompress(Path(e['source']['file']).read_bytes());assert hashlib.sha256(raw).hexdigest()==e['source']['sha256']
data=json.loads(raw.decode())
rows=m.parse(raw.decode('utf-8'),e['parser'],None)
assert len(rows)==12,len(rows)
got={r['id']:r for r in rows}
assert abs(m.numeric(got['or-opus/anthropic/claude-opus-5 [max]']['peak_fraction'])-1.961)<1e-9
assert got['or-opus/anthropic/claude-opus-5 [max]']['context']['annotation_verdict']=='clean'
assert 'muse/muse-spark-1.3 [ultra]' not in got, 'a bug verdict is never scored'
assert 'deepseek-claude/deepseek-v4-pro' not in got, 'a reward_hack verdict is never scored'
assert all(r['context']['annotation_verdict'] in ('clean','interesting') for r in rows)
assert all('elapsed_seconds' in r['context'] and r['context']['run_id'] for r in rows)
assert all(abs(r['context']['percent_of_roofline']-r['context']['peak_fraction']*100)<1e-9 for r in rows)
def fails(d,why):
  try: m.parse(json.dumps(d),e['parser'],None)
  except ValueError: return
  raise AssertionError('accepted: '+why)
d=copy.deepcopy(data);d['schema_version']=2;fails(d,'schema_version')
d=copy.deepcopy(data);d['hardware']['name']='H100';fails(d,'hardware changed')
d=copy.deepcopy(data);d['problems']=[p for p in d['problems'] if p!='04_grid_mingru_sps'];fails(d,'deck changed')
d=copy.deepcopy(data);d['per_problem']['04_grid_mingru_sps']['ranked_passes'][0]['peak_fraction']+=0.01;fails(d,'ranked/cell divergence')
d=copy.deepcopy(data)
cell=d['models'][0]['results']['04_grid_mingru_sps']
d['per_problem']['04_grid_mingru_sps']['ranked_passes'].append({'model':d['models'][0]['label'],'peak_fraction':cell['peak_fraction']})
d['models'][0]['results']['04_grid_mingru_sps']['annotation_verdict']='clean'
print('ok')
`]).toString();
  assert.equal(output.trim(), 'ok');
});

test('KernelBench-CUDA joins: reviewed labels only; unaudited, bug and suspect cells never score', () => {
  assert.deepEqual(parseKernelbenchCudaLabel('or-opus/anthropic/claude-opus-5 [max]'), { family: 'claude-opus-5', effort: 'max' });
  assert.deepEqual(parseKernelbenchCudaLabel('agy/gemini-3.8-flash-high'), { family: 'gemini-3.8-flash', effort: 'high' }, 'the site embeds the tier in the slug');
  assert.deepEqual(parseKernelbenchCudaLabel('or-fable/stealth/ox-alpha'), { family: 'glm-5.3-flash', effort: null }, 'the site displays this stealth run as GLM-5.3 Flash');
  assert.deepEqual(parseKernelbenchCudaLabel('zai-claude/glm-5.3'), { family: 'glm-5.3', effort: null }, 'a bare label of a family whose only configuration is not the default joins nothing');
  assert.deepEqual(parseKernelbenchCudaLabel('muse/muse-spark-1.3 [ultra]'), { family: 'muse-spark-1.3', effort: 'ultra' }, 'ultra is not a reviewed setting');
  const map = JSON.parse(readFileSync('data/raw/benchmarks/identity-map.json', 'utf8')).entries;
  const per = (id) => map.filter((e) => e.benchmark_id === id).map((e) => e.model_id).sort();
  // 2026-09-27 (iteration 243, D220): kernelbench.com ran four more frontier models between the 2026-09-18
  // capture these lists were first written from and the 2026-09-25 one. Each added cell is `correct: true`
  // with an audited verdict and a peak_fraction in the committed capture
  // (data/raw/benchmarks/daily-evidence/2026-09-25T08-50-35-039Z/c3e22679c1c23c355c86.gz, body sha256
  // c3e22679c1c23c355c86fc8e8af4e7d40e344ce5e39a9cef4aef958cdc83f404), so the lists are re-derived from the
  // board rather than the joins refused to keep an older list green.
  // 2026-09-27 (iteration 246, D221 closed): megaqwen-decode was the exception here only because its arm had been
  // retained since 2026-09-22 on an unapproved protocol round, so none of its 2026-09-25 rows reached the
  // observations. D223 cleared that blocker and the 2026-09-27 daily published the arm, so its list is now
  // re-derived from the board like the other three. The four cells are read out of the run's own capture
  // (data/raw/benchmarks/daily-evidence/2026-09-27T05-33-09-831Z/c3e22679c1c23c355c86.gz, body sha256
  // c3e22679c1c23c355c86fc8e8af4e7d40e344ce5e39a9cef4aef958cdc83f404 — the same bytes the 2026-09-25 capture
  // carried, so nothing on the board moved): claude/claude-opus-5-5 [xhigh] 0.0739 (correct, interesting),
  // codex/gpt-6-luna [xhigh] 0.0286 (correct, clean), codex/gpt-6-sol [xhigh] 0.0398 (correct, clean) and
  // grok/grok-4.7 [xhigh] 0.0455 (correct, clean) — the site's own validity rule, the same one that already
  // admits each of them on the three sibling problems.
  // The withdrawn 2026-09-18 identities (D187) stay in every list — their entry is what keeps the retracted
  // value withheld instead of resurfacing as a history estimate.
  assert.deepEqual(per('kernelbench-cuda-glm52-fused-moe::rtx-pro-6000'), ['claude-fable-5.1::max', 'claude-opus-4.8::max', 'claude-opus-5.5::xhigh', 'claude-opus-5::max', 'gpt-6-luna::xhigh', 'gpt-6-sol::xhigh', 'grok-4.6::xhigh', 'grok-4.7::xhigh']);
  assert.deepEqual(per('kernelbench-cuda-deepseek-nsa::rtx-pro-6000'), ['claude-fable-5.1::max', 'claude-opus-4.8::max', 'claude-opus-5.5::xhigh', 'claude-opus-5::max', 'gemini-3.8-flash::high', 'glm-5.3-flash::default', 'gpt-6-luna::xhigh', 'gpt-6-sol::xhigh', 'grok-4.6::xhigh', 'grok-4.7::xhigh']);
  assert.deepEqual(per('kernelbench-cuda-megaqwen-decode::rtx-pro-6000'), ['claude-fable-5.1::max', 'claude-opus-4.8::max', 'claude-opus-5.5::xhigh', 'claude-opus-5::max', 'gemini-3.8-flash::high', 'glm-5.3-flash::default', 'gpt-6-luna::xhigh', 'gpt-6-sol::xhigh', 'grok-4.6::xhigh', 'grok-4.7::xhigh']);
  assert.deepEqual(per('kernelbench-cuda-grid-mingru-sps::rtx-pro-6000'), ['claude-fable-5.1::max', 'claude-opus-4.8::max', 'claude-opus-5.5::xhigh', 'claude-opus-5::max', 'gemini-3.8-flash::high', 'gpt-6-luna::xhigh', 'gpt-6-sol::xhigh', 'grok-4.7::xhigh']);
  for (const id of ['kernelbench-cuda-glm52-fused-moe::rtx-pro-6000', 'kernelbench-cuda-deepseek-nsa::rtx-pro-6000', 'kernelbench-cuda-megaqwen-decode::rtx-pro-6000', 'kernelbench-cuda-grid-mingru-sps::rtx-pro-6000'])
    assert.ok(!map.some((e) => e.benchmark_id === id && /kinetic|muse/.test(e.source_id)), 'kinetic and muse labels stay unmatched source identities');
});
