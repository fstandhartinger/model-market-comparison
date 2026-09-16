import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseLisanBenchId, boardJoins } from '../lib/board-identity.mjs';

// 2026-09-16 (iteration 88, CR-52). Sources are the committed LisanBench captures of 2026-09-16 (data/core.json,
// data/rankings.json, the repository README); mutations below are synthetic failure probes, never source claims.
const pyParse = (body) => execFileSync('python3', ['-B', '-c', String.raw`
import importlib.util,gzip,hashlib,json,copy
from pathlib import Path
s=importlib.util.spec_from_file_location('collector','scripts/collect-public-benchmarks.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
entry=next(e for e in json.loads(Path('data/raw/benchmarks/collection-plan.json').read_text())['entries'] if e['benchmark_id']=='lisanbench::0.2.0')
def read(src):
  raw=gzip.decompress(Path(src['file']).read_bytes());assert hashlib.sha256(raw).hexdigest()==src['sha256'];return raw.decode('utf-8')
spec=entry['parser'];source=read(entry['source']);data=json.loads(source)
readme=read(spec['method_source']);detail=json.loads(read(spec['detail_source']))
def loader(readme_text=readme,detail_obj=detail):
  return lambda src: readme_text if src is spec['method_source'] else json.dumps(detail_obj)
rows=m.parse(source,spec,loader())
def fails(why,d=None,readme_text=readme,detail_obj=detail):
  try: m.parse(json.dumps(d if d is not None else data),spec,loader(readme_text,detail_obj))
  except ValueError: return
  raise AssertionError('accepted: '+why)
${body}
print('ok')
`]).toString().trim();

test('LisanBench parser reads every published configuration with its path length and listed trial count', () => {
  assert.equal(pyParse(String.raw`
assert len(rows)==154,len(rows)
assert len({r['id'] for r in rows})==154
got={r['id']:r['path_length'] for r in rows}
# The page's default Path Length ranking at capture: Opus 5 (high) first, Qwen3 0.6B last.
assert got['claude-opus-5:thinking-high']==15428.33 and got['claude-opus-4.7:thinking-xhigh']==14400.0 and got['Qwen3-0.6B-FP8']==0.67
assert max(got,key=got.get)=='claude-opus-5:thinking-high' and min(got,key=got.get)=='Qwen3-0.6B-FP8'
ctx={r['id']:r['context'] for r in rows}
assert ctx['claude-opus-5:thinking-high']['trials_total']==150 and ctx['claude-opus-5:thinking-high']['trials_per_word']==[3,3]
assert ctx['gpt-5.4:thinking-none']['trials_total']==300 and ctx['grok-4-fast:free']['trials_total']==250 and ctx['glm-5:thinking']['trials_total']==149
assert next(r for r in rows if r['id']=='gpt-5')['name']=='GPT 5 (medium)'
`), 'ok');
});

test('LisanBench parser fails closed on another protocol, broken sums and unprovenanced rows', () => {
  assert.equal(pyParse(String.raw`
d=copy.deepcopy(data);d['metadata']['num_words']=10;fails('word count',d)
d=copy.deepcopy(data);d['metadata']['starting_words'][0]='cat';fails('another starting word',d)
d=copy.deepcopy(data);d['metadata']['words_file']='words_alpha.txt';fails('another dictionary',d)
fails('README score definition gone',readme_text=readme.replace('sum of valid transitions','sum of transitions'))
fails('README trial protocol gone',readme_text=readme.replace('**3 trials per word**','**5 trials per word**'))
d=copy.deepcopy(data);d['aggregated'][0]['sum_chain_avg']+=5;fails('score is not the sum of its per-word averages',d)
d=copy.deepcopy(data);d['aggregated'][0]['sum_chain_avg']=-1;fails('negative path length',d)
d=copy.deepcopy(data);d['aggregated'][0]['sum_chain_avg']=None;fails('missing path length',d)
d=copy.deepcopy(data);d['aggregated'][0]['model']='unknown-model';fails('score row without a published model',d)
d=copy.deepcopy(data);d['models']=d['models'][1:];d['metadata']['num_models']-=1;fails('model list inconsistent',d)
x=copy.deepcopy(detail);x['per_word']=[r for r in x['per_word'] if not (r['model']==data['aggregated'][0]['model'] and r['word']=='not')];fails('per-word results missing a starting word',detail_obj=x)
x=copy.deepcopy(detail);x['stop_reasons']['not'].pop(data['aggregated'][0]['model']);fails('a starting word lists no trial',detail_obj=x)
`), 'ok');
});

test('LisanBench joins: stated suffix or label setting only, budgets and bare "thinking" refused', () => {
  assert.deepEqual(parseLisanBenchId('claude-opus-5:thinking-high', 'Opus 5 (high)'), { family: 'claude-opus-5', effort: 'high' });
  assert.deepEqual(parseLisanBenchId('gpt-5.6-sol:thinking-none', 'GPT 5.6 Sol'), { family: 'gpt-5.6-sol', effort: 'none' });
  assert.deepEqual(parseLisanBenchId('gpt-5', 'GPT 5 (medium)'), { family: 'gpt-5', effort: 'medium' });
  assert.deepEqual(parseLisanBenchId('claude-opus-4.8', 'Opus 4.8'), { family: 'claude-opus-4.8', effort: null });
  assert.deepEqual(parseLisanBenchId('claude-opus-4.6:thinking-16k', 'Opus 4.6 (16k)'), { family: 'claude-opus-4.6', effort: '16k' });
  const catalog = [
    { id: 'claude-opus-5::high', family_key: 'claude-opus-5', variant: 'high' },
    { id: 'claude-opus-5::non-reasoning', family_key: 'claude-opus-5', variant: 'non-reasoning' },
    { id: 'claude-opus-4.6::max', family_key: 'claude-opus-4.6', variant: 'max' },
    { id: 'glm-5::reasoning', family_key: 'glm-5', variant: 'reasoning' },
    { id: 'glm-5::non-reasoning', family_key: 'glm-5', variant: 'non-reasoning' },
    { id: 'kimi-k2::default', family_key: 'kimi-k2', variant: 'default' },
  ];
  const rows = [['claude-opus-5:thinking-high', 'Opus 5 (high)'], ['claude-opus-5:thinking-none', 'Opus 5'], ['claude-opus-4.6:thinking-16k', 'Opus 4.6 (16k)'],
    ['glm-5:thinking', 'GLM 5 (thinking)'], ['kimi-k2', 'Kimi K2'], ['Qwen3-4B-FP8', 'Qwen3 4B']].map(([source_id, name]) => ({ source_id, name }));
  assert.deepEqual(boardJoins(rows, parseLisanBenchId, catalog).map((j) => j.model_id),
    ['claude-opus-5::high', 'claude-opus-5::non-reasoning', null, null, 'kimi-k2::default', null]);
  const map = JSON.parse(readFileSync('data/raw/benchmarks/identity-map.json', 'utf8')).entries.filter((e) => e.benchmark_id === 'lisanbench::0.2.0');
  assert.equal(map.length, 52);
  assert.ok(map.some((e) => e.source_id === 'claude-opus-5:thinking-high' && e.model_id === 'claude-opus-5::high'));
  assert.ok(!map.some((e) => /:thinking(-\d+k)?$|:free$/.test(e.source_id)), 'budgets, bare thinking and :free never join');
  // Every published join re-derives from the observation's own id and label to exactly that catalog configuration.
  const dataset = JSON.parse(readFileSync('data/dataset.json', 'utf8'));
  const byId = new Map(dataset.models.map((m) => [m.id, m]));
  for (const e of map) {
    const o = dataset.benchmark_results.observations.find((x) => x.benchmark_id === e.benchmark_id && x.subject.source_id === e.source_id);
    assert.ok(o, e.source_id);
    const { family, effort } = parseLisanBenchId(e.source_id, o.subject.name);
    const model = byId.get(e.model_id);
    assert.equal(model.family_key, family, e.source_id);
    assert.equal(model.variant, effort === 'none' ? 'non-reasoning' : effort ?? 'default', e.source_id);
    assert.equal(o.subject.model_id, e.model_id, `${e.source_id}: the dataset row carries the join`);
  }
});

test('LisanBench registry entry: higher is better, open-ended points, community tier, credit to the maintainer', () => {
  const entry = JSON.parse(readFileSync('data/raw/benchmarks/registry.json', 'utf8')).entries.find((e) => e.id === 'lisanbench::0.2.0');
  assert.equal(entry.scoring.higher_better, true);
  assert.deepEqual(entry.scoring.range, [0, null]);
  assert.equal(entry.scoring.unit, 'points');
  assert.match(entry.maintainer, /@scaling01/);
  assert.ok(entry.publication_urls.some((u) => u.url === 'https://github.com/voice-from-the-outer-world/lisan-bench'));
  assert.equal(JSON.parse(readFileSync('data/benchmark-taxonomy.json', 'utf8')).tiers.lisanbench, 'community');
});
