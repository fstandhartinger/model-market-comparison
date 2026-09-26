import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseWeirdmlV3Label } from '../lib/board-identity.mjs';

// 2026-09-18 (iteration 113, CR-81). The source is the committed capture of htihle.github.io's prepared
// WeirdML v3 data; mutations below are synthetic failure probes, never source claims.
test('WeirdML v3 parser reads prepared data, keeps the protocol and fails closed on schema, mode, tasks and synthetic rows', () => {
  const output = execFileSync('python3', ['-B', '-c', String.raw`
import importlib.util,gzip,hashlib,json,copy
from pathlib import Path
s=importlib.util.spec_from_file_location('collector','scripts/collect-public-benchmarks.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
entries={e['benchmark_id']:e for e in json.loads(Path('data/raw/benchmarks/collection-plan.json').read_text())['entries']}
e=entries['weirdml::3'];raw=gzip.decompress(Path(e['source']['file']).read_bytes());assert hashlib.sha256(raw).hexdigest()==e['source']['sha256']
data=json.loads(raw.decode('utf-8'))
rows=m.parse(raw.decode('utf-8'),e['parser'],None)
assert len(rows)==5,len(rows)
got={r['id']:r for r in rows}
assert abs(m.numeric(got['gpt-6-astra-xhigh-openrouter']['score'])-0.4222023136363636)<1e-9
assert abs(m.numeric(got['fable-5.1']['score'])-0.2591708818181818)<1e-9
assert got['fable-5.1']['context']['agent']=='claude_code'
assert len(got['deepseek-v4.1-flash-novita-high-opencode']['context']['interval_95'])==2
excluded={x['id'] for x in data['excluded_models']}
assert not excluded & {r['id'] for r in rows}, 'excluded models must never score'
def fails(d,why):
  try: m.parse(json.dumps(d),e['parser'],None)
  except ValueError: return
  raise AssertionError('accepted: '+why)
d=copy.deepcopy(data);d['schema_version']=2;fails(d,'schema_version')
d=copy.deepcopy(data);d['mode']='preview';fails(d,'mode')
d=copy.deepcopy(data);d['task_count']=10;fails(d,'task count')
d=copy.deepcopy(data);d['models'][0]['synthetic']=True;fails(d,'synthetic row')
d=copy.deepcopy(data);del d['models'][0]['interval'];fails(d,'missing interval')
d=copy.deepcopy(data);d['models'][0]['score']=None;fails(d,'missing score')
d=copy.deepcopy(data);d['models'].append({'id':'x','name':'x','synthetic':False,'score':0.5});fails(d,'row without interval')
print('ok')
`]).toString();
  assert.equal(output.trim(), 'ok');
});

test('WeirdML v3 joins: reviewed names only, provider notes never become a setting', () => {
  assert.deepEqual(parseWeirdmlV3Label('gpt-6-astra-xhigh-openrouter', 'GPT-6 Astra (xhigh)'), { family: 'gpt-6-astra', effort: 'xhigh' });
  assert.deepEqual(parseWeirdmlV3Label('fable-5.1', 'Claude Fable 5.1 (xhigh)'), { family: 'claude-fable-5.1', effort: 'xhigh' });
  assert.deepEqual(parseWeirdmlV3Label('deepseek-v4.1-flash-novita-high-opencode', 'DeepSeek V4.1 Flash (high, Novita)'), { family: null, effort: 'high, novita' }, 'not a reviewed name; and the provider note is part of the stated setting text, which joins nothing'); 
  assert.deepEqual(parseWeirdmlV3Label('x', 'Some Unknown Model (high)'), { family: null, effort: 'high' }, 'an unknown name never joins, whatever the stated setting');
  const map = JSON.parse(readFileSync('data/raw/benchmarks/identity-map.json', 'utf8'));
  const v3 = map.entries.filter((e) => e.benchmark_id === 'weirdml::3');
  assert.equal(v3.length, 4, '4 of the 5 published configurations join; DeepSeek V4.1 Flash (high) has no such catalog configuration');
  assert.ok(!map.entries.some((e) => e.benchmark_id === 'weirdml::3' && e.model_id.includes('deepseek')), 'the high-effort DeepSeek row stays an unmatched source identity, never approximated to max');
});

test('MathArena August editions: 57/56 problems, seven rows, release-date flag kept, joins reviewed', () => {
  const output = execFileSync('python3', ['-B', '-c', String.raw`
import importlib.util,gzip,hashlib,json,re
from pathlib import Path
s=importlib.util.spec_from_file_location('collector','scripts/collect-public-benchmarks.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
entries={e['benchmark_id']:e for e in json.loads(Path('data/raw/benchmarks/collection-plan.json').read_text())['entries']}
def load(bid):
  e=entries[bid];raw=gzip.decompress(Path(e['source']['file']).read_bytes());assert hashlib.sha256(raw).hexdigest()==e['source']['sha256']
  return raw.decode('utf-8'),e['parser']
rows1=m.parse(*load('matharena-arxivmath::2026-08'),None)
assert len(rows1)==7 and m.numeric({r['id']:r for r in rows1}['GPT-6 Astra (max)']['accuracy'])==88.6
assert {r['id']:r for r in rows1}['Kimi K3 (Think)']['context']['released_after_competition'] is False
assert {r['id']:r for r in rows1}['GPT-6 Astra (max)']['context']['released_after_competition'] is True
rows2=m.parse(*load('matharena-brokenarxiv::2026-08'),None)
assert len(rows2)==7 and m.numeric({r['id']:r for r in rows2}['GPT-6 Astra (max)']['accuracy'])==81.94
d=json.loads(load('matharena-arxivmath::2026-08')[0])
assert len({int(i) for i in re.findall(r'data-problem-index=\"(\d+)\"',d['problem_table'])})==57
d2=json.loads(load('matharena-brokenarxiv::2026-08')[0])
assert len({int(i) for i in re.findall(r'data-problem-index=\"(\d+)\"',d2['problem_table'])})==56
print('ok')
`]).toString();
  assert.equal(output.trim(), 'ok');
  const map = JSON.parse(readFileSync('data/raw/benchmarks/identity-map.json', 'utf8')).entries;
  // CR-85.2 (2026-09-19): + DeepSeek-V4.1-Flash (Max) → deepseek-v4.1-flash::max on both boards.
  // 2026-09-21 (iteration 154): + GPT-6 Astra (low) and Claude-Fable-5.1 (low), published by the 2026-09-21 refresh.
  // 2026-09-26 (CR-173): + GPT-6 Sol (max), Grok 4.7 (xhigh), Claude-Opus-5.5 (high) on both boards; BrokenArXiv also
  // + GPT-6 Astra (low) and Claude-Fable-5.1 (low), which the rule already accepted but the map had not been rebuilt for.
  assert.equal(map.filter((e) => e.benchmark_id === 'matharena-arxivmath::2026-08').length, 9);
  assert.equal(map.filter((e) => e.benchmark_id === 'matharena-brokenarxiv::2026-08').length, 9);
  assert.ok(!map.some((e) => e.benchmark_id === 'matharena-arxivmath::2026-08' && /Think/.test(e.source_id)), 'unreviewed settings stay unjoined');
});
