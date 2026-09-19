import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseFrontiersweV2Label, parsePosttrainbenchLabel } from '../lib/board-identity.mjs';

// 2026-09-19 (iteration 117, CR-30.2). The sources are the committed captures of
// frontierswe.com's leaderboard front page (+ Epoch AI's FrontierSWE relay CSV) and
// posttrainbench.com's scores.js/config.js; mutations below are synthetic failure probes,
// never source claims.
test('FrontierSWE v2 parser reads the front-page flight payload, cross-checks the Epoch relay and fails closed on identity, row set, harness and relay drift', () => {
  const output = execFileSync('python3', ['-B', '-c', String.raw`
import importlib.util,gzip,hashlib,json,re
from pathlib import Path
s=importlib.util.spec_from_file_location('collector','scripts/collect-public-benchmarks.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
entries={e['benchmark_id']:e for e in json.loads(Path('data/raw/benchmarks/collection-plan.json').read_text())['entries']}
e=entries['frontierswe::2']
raw=gzip.decompress(Path(e['source']['file']).read_bytes())
assert hashlib.sha256(raw).hexdigest()==e['source']['sha256']
def load(sup):
    d=gzip.decompress(Path(sup['file']).read_bytes());assert hashlib.sha256(d).hexdigest()==sup['sha256'];return d.decode('utf-8')
rows=m.parse(raw.decode('utf-8'),e['parser'],load)
assert len(rows)==14,len(rows)
got={r['id']:r for r in rows}
assert abs(m.numeric(got['Claude Fable 5.1']['mean_at_5'])-56.29078999999999)<1e-9
assert abs(m.numeric(got['GPT-5.6']['mean_at_5'])-32.20246705882353)<1e-9
assert abs(m.numeric(got['GPT-6 Astra']['mean_at_5'])-65.50757455882352)<1e-9
assert got['Claude Fable 5.1']['harness']=='proximus'
ctx=got['Claude Fable 5.1']['context']
assert ctx['tasks']==34 and ctx['trials_per_task']==5
assert ctx['epoch_relay_id']=='claude-fable-5-1_max' and ctx['epoch_relay_effort']=='max'
assert ctx['best_at_5']>=m.numeric(got['Claude Fable 5.1']['mean_at_5'])>=ctx['worst_at_5'] and ctx['avg_duration_seconds']>0
assert got['Inkling']['context']['epoch_relay_id'].endswith('_xhigh')
assert got['GPT-6 Astra']['context']['epoch_relay_id'] is None
text=raw.decode('utf-8')
def fails(html,why,spec=None):
  try: m.parse(html,spec or e['parser'],load)
  except ValueError: return
  raise AssertionError('accepted: '+why)
fails(text.replace('Scores across all 34 tasks','Scores across all 35 tasks'),'task count phrase changed')
fails(text.replace('5 trials per task with a 20-hour budget','3 trials per task'),'trial budget phrase changed')
def mutate(html,old,new):
  out=html.replace(old,new)
  assert out!=html,'mutation did not touch the capture: '+old[:60]
  return out
# the flight payload is a JSON-escaped string: fields appear as \"harness\":\"proximus\" in the raw HTML
fails(mutate(text,'\\"harness\\":\\"proximus\\"','\\"harness\\":\\"proximus-2\\"',),'harness changed')
fails(mutate(text,'\\"overall\\":56.29078999999999','\\"overall\\":96.29078999999999'),'score mutated')
fails(mutate(text,'\\"generation\\":2','\\"generation\\":3'),'unlisted generation')
# missing supporting source must fail
try: m.parse(text,e['parser'],None)
except Exception as exc: assert 'method_source' in str(exc) or isinstance(exc,(ValueError,TypeError,AttributeError,KeyError)),exc
else: raise AssertionError('accepted without relay')
print('ok')
`]).toString();
  assert.equal(output.trim(), 'ok');
});

test('FrontierSWE v2 joins: relay-covered labels join exact catalog configurations; uncovered labels refuse', () => {
  const map = JSON.parse(readFileSync('data/raw/benchmarks/identity-map.json', 'utf8')).entries;
  assert.equal(map.filter((e) => e.benchmark_id === 'frontierswe::2').length, 8, 'exactly the 8 relay-covered rows join');
  const joined = Object.fromEntries(map.filter((e) => e.benchmark_id === 'frontierswe::2').map((e) => [e.source_id, e.model_id]));
  assert.deepEqual(joined, {
    'Claude Fable 5.1': 'claude-fable-5.1::max',
    'GPT-5.6': 'gpt-5.6-sol::max',
    'GLM-5.3': 'glm-5.3::max',
    'Kimi K3': 'kimi-k3::max',
    'Grok 4.6': 'grok-4.6::xhigh',
    'Gemini 3.7 Flash': 'gemini-3.7-flash::high',
    'Muse Spark 1.2': 'muse-spark-1.2::xhigh',
    'Inkling': 'inkling::xhigh',
  });
  assert.deepEqual(parseFrontiersweV2Label('Claude Fable 5.1', '', '"epoch_relay_effort":"max"'), { family: 'claude-fable-5.1', effort: 'max' });
  assert.deepEqual(parseFrontiersweV2Label('GPT-6 Astra', '', '"epoch_relay_effort":null'), { family: null, effort: null }, 'no relay statement, no join');
  assert.deepEqual(parseFrontiersweV2Label('Qwen3.8-Max', '', '"epoch_relay_effort":"xhigh"'), { family: 'qwen3.8-max', effort: 'xhigh' }, 'refused downstream: no xhigh catalog configuration');
});

test('PostTrainBench v1.1 parser scores only aggregated agents from scores.js, excludes baselines and fails closed on weights, cells, effort and scaffold', () => {
  const output = execFileSync('python3', ['-B', '-c', String.raw`
import importlib.util,gzip,hashlib,json
from pathlib import Path
s=importlib.util.spec_from_file_location('collector','scripts/collect-public-benchmarks.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
entries={e['benchmark_id']:e for e in json.loads(Path('data/raw/benchmarks/collection-plan.json').read_text())['entries']}
e=entries['posttrainbench::1.1']
raw=gzip.decompress(Path(e['source']['file']).read_bytes())
assert hashlib.sha256(raw).hexdigest()==e['source']['sha256']
def load(sup):
    d=gzip.decompress(Path(sup['file']).read_bytes());assert hashlib.sha256(d).hexdigest()==sup['sha256'];return d.decode('utf-8')
rows=m.parse(raw.decode('utf-8'),e['parser'],load)
assert len(rows)==13,len(rows)
got={r['id']:r for r in rows}
assert abs(m.numeric(got['fable-5']['average_score'])-41.79)<1e-9
assert abs(m.numeric(got['gpt-5.6-sol']['average_score'])-36.23)<1e-9
assert abs(m.numeric(got['locus']['average_score'])-45.58)<1e-9
assert all('base-model' != r['id'] and 'human' != r['id'] for r in rows),'baselines never rows'
assert got['fable-5']['context']['n_runs']==2 and got['glm-5.2']['context']['n_runs']==3
assert got['fable-5']['context']['footnote_marker']=='\u2021' and got['gpt-5.5-xhigh']['context']['footnote_marker'] is None
assert got['gpt-5.5-xhigh']['context']['reasoning_effort'].startswith('xHigh')
assert got['locus']['context']['is_external'] is True
text=raw.decode('utf-8');config_src=load(e['parser']['config_source'])
def fails(js,why,config=None):
  if config is None: config=config_src
  try: m.parse(js,e['parser'],lambda s: config)
  except ValueError: return
  raise AssertionError('accepted: '+why)
fails(text.replace('"gpqamain"','"gpqamain2"'),'weight key renamed')
fails(text.replace('"avg": 41.79','"avg": 141.79'),'avg out of range')
fails(text.replace('"n": 2','"n": 0'),'run count zeroed')
fails(text,'unlisted scaffold',config=config_src.replace('scaffold: "Claude Code"','scaffold: "Claude Command"'))
fails(text,'unlisted effort',config=config_src.replace('reasoningEffort: "Max"','reasoningEffort: "Ultra"'))
print('ok')
`]).toString();
  assert.equal(output.trim(), 'ok');
});

test('PostTrainBench v1.1 joins: config-stated settings join exact catalog configurations; unstated or unconfigured settings refuse', () => {
  const map = JSON.parse(readFileSync('data/raw/benchmarks/identity-map.json', 'utf8')).entries;
  assert.equal(map.filter((e) => e.benchmark_id === 'posttrainbench::1.1').length, 7, 'exactly the 7 configured agents join');
  const joined = Object.fromEntries(map.filter((e) => e.benchmark_id === 'posttrainbench::1.1').map((e) => [e.source_id, e.model_id]));
  assert.deepEqual(joined, {
    'fable-5': 'claude-fable-5::max',
    'gpt-5.6-sol': 'gpt-5.6-sol::max',
    'opus-4.8': 'claude-opus-4.8::high',
    'opus-4.8-max': 'claude-opus-4.8::max',
    'glm-5.2': 'glm-5.2::max',
    'gpt-5.5-xhigh': 'gpt-5.5::xhigh',
    'grok-4.5-high': 'grok-4.5::high',
  });
  assert.deepEqual(parsePosttrainbenchLabel('fable-5', '', '"reasoning_effort":"Max"'), { family: 'claude-fable-5', effort: 'max' });
  assert.deepEqual(parsePosttrainbenchLabel('opus-5', '', '"reasoning_effort":"not stated"'), { family: 'claude-opus-5', effort: null }, 'unstated effort refuses downstream');
  assert.deepEqual(parsePosttrainbenchLabel('opus-4.7', '', '"reasoning_effort":"xHigh"'), { family: 'claude-opus-4.7', effort: 'xhigh' }, 'refused downstream: no xhigh catalog configuration');
  assert.deepEqual(parsePosttrainbenchLabel('locus', '', '"reasoning_effort":"not stated"'), { family: null, effort: null }, 'external agent, never a catalog model');
});

test('Registry, plan and identity-map are mutually consistent for the two new boards', () => {
  const reg = JSON.parse(readFileSync('data/raw/benchmarks/registry.json', 'utf8')).entries;
  const plan = JSON.parse(readFileSync('data/raw/benchmarks/collection-plan.json', 'utf8')).entries;
  const obs = JSON.parse(readFileSync('data/raw/benchmarks/public-observations.json', 'utf8')).observations;
  for (const id of ['frontierswe::2', 'posttrainbench::1.1']) {
    assert.ok(reg.some((e) => e.id === id && e.status === 'active'), id + ' in registry');
    assert.ok(plan.some((e) => e.benchmark_id === id && e.status === 'collected'), id + ' in plan');
    const rows = obs.filter((o) => o.benchmark_id === id);
    assert.ok(rows.length > 0, id + ' has public observations');
    const map = JSON.parse(readFileSync('data/raw/benchmarks/identity-map.json', 'utf8')).entries.filter((e) => e.benchmark_id === id);
    assert.ok(map.every((e) => e.review === undefined || typeof e.review === 'object'), id + ' entries carry no unreviewed claims');
  }
});
