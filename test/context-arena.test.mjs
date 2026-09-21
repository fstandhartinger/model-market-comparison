import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseContextArenaId, boardJoins } from '../lib/board-identity.mjs';

// 2026-09-21 (iteration 154, CR-37.1). The source is the committed capture of Context Arena's own board
// endpoint and GDM's MRCR v2 README; every mutation below is a synthetic failure probe, never a source claim.
test('Context Arena parser scores the 8-needle 128k cumulative average, reproduces it from the bins, and fails closed', () => {
  const output = execFileSync('python3', ['-B', '-c', String.raw`
import importlib.util,gzip,hashlib,json,copy
from pathlib import Path
s=importlib.util.spec_from_file_location('collector','scripts/collect-public-benchmarks.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
entries={e['benchmark_id']:e for e in json.loads(Path('data/raw/benchmarks/collection-plan.json').read_text())['entries']}
e=entries['context-arena-mrcr-v2::8-needle']
def load(src):
  raw=gzip.decompress(Path(src['file']).read_bytes())
  assert hashlib.sha256(raw).hexdigest()==src['sha256'],src['file']
  return raw.decode('utf-8-sig')
page=load(e['source']);data=json.loads(page)
rows=m.parse(page,e['parser'],load)
assert len(rows)==183,len(rows)
got={r['id']:r for r in rows}
opus=got['anthropic/claude-opus-5@reasoning=max']
assert abs(opus['cum_avg_128k']*100-97.839)<0.001,opus['cum_avg_128k']
assert set(opus['context']['bins_upto_128k'])=={'8192','16384','32768','65536','131072'}
# the one row whose bins up to 128k are incomplete is not scored
incomplete=[r['model_slug']+('' if r['reasoning_mode'] is None else '@reasoning='+r['reasoning_mode']) for r in data['models'] if r['has_incomplete_bins_128k']]
assert len(incomplete)==1 and incomplete[0] not in got,incomplete
# a model without a stated mode keeps the bare slug
assert 'qwen/qwen3.7-max' in got
def fails(d,why):
  try: m.parse(json.dumps(d),e['parser'],load)
  except ValueError: return
  raise AssertionError('accepted: '+why)
d=copy.deepcopy(data);d['request_params']['needles']=4;fails(d,'another needle count')
d=copy.deepcopy(data);d['available_bins']=d['available_bins'][:-1];fails(d,'another bin layout')
d=copy.deepcopy(data);d['models'][0]['overall_metrics']['cum_avg_128k']+=0.01;fails(d,'value not the mean of its bins')
d=copy.deepcopy(data);d['models'][0]['reasoning_mode']='turbo';fails(d,'unlisted reasoning mode')
d=copy.deepcopy(data);d['models'].append(copy.deepcopy(d['models'][0]));fails(d,'repeated row')
d=copy.deepcopy(data);r=[x for x in d['models'] if not x['has_incomplete_bins_128k'] and x['max_context_length']>=131072][0];r['bin_metrics']['65536']['is_incomplete']=True;fails(d,'complete row with an incomplete bin')
def readme_changed(src):
  text=load(src)
  return text.replace('upto_128K','upto_256K') if src['file']==e['parser']['method_source']['file'] else text
try: m.parse(page,e['parser'],readme_changed)
except ValueError: pass
else: raise AssertionError('accepted: README reporting convention changed')
print(json.dumps({'rows':len(rows)}))
`], { cwd: new URL('..', import.meta.url), encoding: 'utf8' });
  assert.deepEqual(JSON.parse(output), { rows: 183 });
});

test('Context Arena ids join only on an exact catalog family and a stated, reviewed setting', () => {
  assert.deepEqual(parseContextArenaId('anthropic/claude-opus-5@reasoning=max'), { family: 'claude-opus-5', effort: 'max' });
  assert.deepEqual(parseContextArenaId('qwen/qwen3.7-max'), { family: 'qwen3.7-max', effort: null });
  assert.deepEqual(parseContextArenaId('minimax/minimax-m3@reasoning=enabled'), { family: 'minimax-m3', effort: null });
  assert.deepEqual(parseContextArenaId('claude-opus-5@reasoning=max'), { family: null, effort: null }, 'no vendor prefix is not a board label');
  assert.deepEqual(parseContextArenaId('anthropic/claude-3.7-sonnet:thinking'), { family: null, effort: null });
  const catalog = [
    { id: 'claude-opus-5::max', family_key: 'claude-opus-5', variant: 'max' },
    { id: 'claude-opus-5::high', family_key: 'claude-opus-5', variant: 'high' },
    { id: 'qwen3.7-max::default', family_key: 'qwen3.7-max', variant: 'default' },
  ];
  const rows = ['anthropic/claude-opus-5@reasoning=max', 'anthropic/claude-opus-5', 'qwen/qwen3.7-max', 'anthropic/claude-opus-5@reasoning=low']
    .map((source_id) => ({ source_id, name: source_id }));
  const joins = boardJoins(rows, parseContextArenaId, catalog).map((j) => j.model_id);
  assert.deepEqual(joins, ['claude-opus-5::max', null, 'qwen3.7-max::default', null]);
});

test('committed Context Arena rows are the derived percent of the source fraction and ride their capture', () => {
  const rows = JSON.parse(readFileSync(new URL('../data/raw/benchmarks/public-observations.json', import.meta.url)))
    .observations.filter((o) => o.benchmark_id === 'context-arena-mrcr-v2::8-needle');
  // The daily refresh adds rows as Context Arena runs new models; 183 is the 2026-09-21 floor.
  assert.ok(rows.length >= 183, `${rows.length} rows`);
  for (const o of rows) {
    assert.equal(o.basis, 'derived'); assert.equal(o.source_basis, 'measured'); assert.equal(o.unit, 'percent');
    assert.ok(Math.abs(o.value - o.derivation.inputs[0] * 100) < 1e-9 && o.value >= 0 && o.value <= 100);
    assert.equal(o.source.url, 'https://contextarena.ai/api/needle-summary?needles=8');
    assert.equal(o.subject.model_id, null, 'joins happen only at ingestion');
  }
});
