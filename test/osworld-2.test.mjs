import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseOsworld2Id, boardJoins } from '../lib/board-identity.mjs';

// 2026-09-16 (iteration 80, CR-30.2 / CR-38.1). The source is the committed capture of OSWorld 2.0's
// official-results.json (updatedAt 2026-09-03); mutations below are synthetic failure probes, never source claims.
test('OSWorld 2.0 parser keeps one task release per identity, full set, default 500-step budget, and fails closed', () => {
  const output = execFileSync('python3', ['-B', '-c', String.raw`
import importlib.util,gzip,hashlib,json,copy
from pathlib import Path
s=importlib.util.spec_from_file_location('collector','scripts/collect-public-benchmarks.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
entries={e['benchmark_id']:e for e in json.loads(Path('data/raw/benchmarks/collection-plan.json').read_text())['entries']}
june=entries['osworld-2::v2026.06.24'];august=entries['osworld-2::v2026.08.08']
assert june['source']==august['source']
raw=gzip.decompress(Path(june['source']['file']).read_bytes());assert hashlib.sha256(raw).hexdigest()==june['source']['sha256']
source=raw.decode('utf-8');data=json.loads(source)
rows=m.parse(source,june['parser'],None);rows8=m.parse(source,august['parser'],None)
assert (len(rows),len(rows8))==(10,6),(len(rows),len(rows8))
assert all(r['context']['releaseVersion']=='v2026.06.24' for r in rows) and all(r['context']['releaseVersion']=='v2026.08.08' for r in rows8)
got={r['id']:r['binaryAccuracy'] for r in rows+rows8}
assert got['Claude Opus 5|max|batch tool|v2026.08.08']==31.43
assert got['Claude Opus 4.8|max|batched tool|v2026.06.24']==20.6
assert all(r['context']['datasetScope']=='full' and r['context']['stepBudget']==500 for r in rows+rows8)
# The offline subset (Opus 5 max 34.72) and shorter budgets are other protocols.
assert 34.72 not in got.values()
spec=june['parser']
def fails(d,sp,why):
  try: m.parse(json.dumps(d),sp,None)
  except ValueError: return
  raise AssertionError('accepted: '+why)
for key,value in [('taskVersion','v2026.10.01'),('datasetSize',120),('defaultStepBudget',300),('benchmarkVersion','OSWorld 2.1')]:
  d=copy.deepcopy(data);d[key]=value;fails(d,spec,key)
d=copy.deepcopy(data);d['results'][0]['releaseVersion']='v2099.01.01';fails(d,spec,'unknown release')
d=copy.deepcopy(data);d['releaseVersions']=['v2026.06.24'];fails(d,august['parser'],'release no longer listed')
d=copy.deepcopy(data);del d['results'][0]['model'];fails(d,spec,'missing model')
d=copy.deepcopy(data);d['results'][-1]['toolSetting']='';fails(d,spec,'missing tool setting')
d=copy.deepcopy(data);d['results']=[r for r in d['results'] if r.get('datasetScope')=='offline'];fails(d,august['parser'],'no full-set rows')
print('ok')
`]).toString();
  assert.equal(output.trim(), 'ok');
});

test('OSWorld 2.0 joins: exact stated setting, no level only for a single default, and one configuration twice joins neither', () => {
  assert.deepEqual(parseOsworld2Id('Claude Opus 5|max|batch tool|v2026.08.08'), { family: 'claude-opus-5', effort: 'max' });
  assert.deepEqual(parseOsworld2Id('MiniMax M3|enabled|standard|v2026.06.24'), { family: 'minimax-m3', effort: null });
  assert.deepEqual(parseOsworld2Id('Kimi 2.6|enabled|standard|v2026.06.24'), { family: null, effort: null }, 'an unreviewed name is not approximated to Kimi K2.6');
  const catalog = [
    { id: 'claude-opus-4.8::max', family_key: 'claude-opus-4.8', variant: 'max' },
    { id: 'minimax-m3::default', family_key: 'minimax-m3', variant: 'default' },
    { id: 'qwen3.7-plus::thinking', family_key: 'qwen3.7-plus', variant: 'thinking' },
    { id: 'qwen3.7-plus::default', family_key: 'qwen3.7-plus', variant: 'default' },
  ];
  const rows = ['Claude Opus 4.8|max|batched tool|v2026.06.24', 'Claude Opus 4.8|max|standard|v2026.06.24',
    'MiniMax M3|enabled|standard|v2026.06.24', 'Qwen 3.7-Plus|thinking|standard|v2026.06.24'].map((source_id) => ({ source_id }));
  const joins = boardJoins(rows, parseOsworld2Id, catalog).map((j) => j.model_id);
  assert.deepEqual(joins, [null, null, 'minimax-m3::default', null]);
  // The committed map carries exactly the ten joins the rule produces from the captured labels.
  const map = JSON.parse(readFileSync('data/raw/benchmarks/identity-map.json', 'utf8')).entries.filter((e) => e.benchmark_id.startsWith('osworld-2::'));
  assert.equal(map.filter((e) => e.benchmark_id === 'osworld-2::v2026.06.24').length, 4);
  assert.equal(map.filter((e) => e.benchmark_id === 'osworld-2::v2026.08.08').length, 6);
  assert.ok(map.some((e) => e.benchmark_id === 'osworld-2::v2026.08.08' && e.source_id === 'Claude Opus 5|max|batch tool|v2026.08.08' && e.model_id === 'claude-opus-5::max'));
  assert.ok(map.every((e) => e.source_id.endsWith(`|${e.benchmark_id.split('::')[1]}`)), 'a row joins only under its own task release');
});
