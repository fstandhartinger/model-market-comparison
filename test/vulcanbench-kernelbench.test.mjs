import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseVulcanbenchFrontierLabel, parseKernelbenchCudaLabel } from '../lib/board-identity.mjs';

// 2026-09-18 (iteration 114, CR-82.3 / CR-82.4). The sources are the committed captures of
// vulcanbench.com's board CSV and kernelbench.com's baked leaderboard.json; mutations below are
// synthetic failure probes, never source claims.
test('VulcanBench Frontier v4 parser reads the board CSV, keeps the protocol and fails closed on header, task count, harness, effort and protocol', () => {
  const output = execFileSync('python3', ['-B', '-c', String.raw`
import importlib.util,gzip,hashlib,json,copy,csv,io
from pathlib import Path
s=importlib.util.spec_from_file_location('collector','scripts/collect-public-benchmarks.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
entries={e['benchmark_id']:e for e in json.loads(Path('data/raw/benchmarks/collection-plan.json').read_text())['entries']}
e=entries['vulcanbench-frontier::4'];raw=gzip.decompress(Path(e['source']['file']).read_bytes());assert hashlib.sha256(raw).hexdigest()==e['source']['sha256']
rows=m.parse(raw.decode('utf-8'),e['parser'],None)
assert len(rows)==24,len(rows)
got={r['id']:r for r in rows}
assert abs(m.numeric(got['Fable 5.1 [max]']['combined_33'])-91.8365)<1e-9
assert got['Fable 5.1 [max]']['context']['harness']=='Claude Code'
assert got['GPT-5.5 [low]']['context']['n_tasks']==23 and got['GPT-5.5 [low]']['context']['tasks_passed']==1
assert got['Fable 5.1 [extra-high]']['context']['effort']=='extra-high'
text=raw.decode('utf-8-sig')
def fails(csv_text,why):
  try: m.parse(csv_text,e['parser'],None)
  except ValueError: return
  raise AssertionError('accepted: '+why)
fails(text.replace('code-quality-maintenance-v3.4','code-quality-maintenance-v4.0'),'protocol family changed')
fails(text.replace(',23,','/24,') if False else text.replace('True,23,','True,24,'),'task count changed')
fails(text.replace('Claude Code','ClaudeCode'),'unlisted harness')
fails('\n'.join([text.splitlines()[0].replace(',n,','/tasks,')]+text.splitlines()[1:]),'header changed')
fails(text.replace(',max,0.4651',',ultra,0.4651') if False else text.replace('Anthropic,Claude Code,max,','Anthropic,Claude Code,mega,'),'unlisted effort')
print('ok')
`]).toString();
  assert.equal(output.trim(), 'ok');
});

test('VulcanBench Frontier joins: every model x effort column is an exact catalog configuration', () => {
  assert.deepEqual(parseVulcanbenchFrontierLabel('Fable 5.1 [max]'), { family: 'claude-fable-5.1', effort: 'max' });
  assert.deepEqual(parseVulcanbenchFrontierLabel('GPT-5.5 [extra-high]'), { family: 'gpt-5.5', effort: 'xhigh' }, "VulcanBench's own spelling of the xhigh tier");
  assert.deepEqual(parseVulcanbenchFrontierLabel('GPT-6 Astra [ultra]'), { family: 'gpt-6-astra', effort: 'ultra' }, 'an unreviewed setting is refused downstream');
  const map = JSON.parse(readFileSync('data/raw/benchmarks/identity-map.json', 'utf8')).entries;
  assert.equal(map.filter((e) => e.benchmark_id === 'vulcanbench-frontier::4').length, 24, 'all 24 model x effort columns join');
  const joined = map.filter((e) => e.benchmark_id === 'vulcanbench-frontier::4').map((e) => e.model_id);
  assert.ok(joined.every((id) => /::(low|medium|high|xhigh|max)$/.test(id)), 'every join is an exact catalog configuration');
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
  assert.deepEqual(per('kernelbench-cuda-glm52-fused-moe::rtx-pro-6000'), ['claude-fable-5.1::max', 'claude-opus-4.8::max', 'claude-opus-5::max', 'grok-4.6::xhigh']);
  assert.deepEqual(per('kernelbench-cuda-deepseek-nsa::rtx-pro-6000'), ['claude-fable-5.1::max', 'claude-opus-4.8::max', 'claude-opus-5::max', 'gemini-3.8-flash::high', 'glm-5.3-flash::default', 'grok-4.6::xhigh']);
  assert.deepEqual(per('kernelbench-cuda-megaqwen-decode::rtx-pro-6000'), ['claude-fable-5.1::max', 'claude-opus-4.8::max', 'claude-opus-5::max', 'gemini-3.8-flash::high', 'glm-5.3-flash::default', 'grok-4.6::xhigh']);
  assert.deepEqual(per('kernelbench-cuda-grid-mingru-sps::rtx-pro-6000'), ['claude-fable-5.1::max', 'claude-opus-4.8::max', 'claude-opus-5::max', 'gemini-3.8-flash::high']);
  for (const id of ['kernelbench-cuda-glm52-fused-moe::rtx-pro-6000', 'kernelbench-cuda-deepseek-nsa::rtx-pro-6000', 'kernelbench-cuda-megaqwen-decode::rtx-pro-6000', 'kernelbench-cuda-grid-mingru-sps::rtx-pro-6000'])
    assert.ok(!map.some((e) => e.benchmark_id === id && /kinetic|muse/.test(e.source_id)), 'kinetic and muse labels stay unmatched source identities');
});
