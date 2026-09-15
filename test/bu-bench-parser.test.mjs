import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

// The sources are the committed evidence captures of Browser Use's BU Bench V1 run files and README
// (repository commit 421390ea, captured 2026-09-15); mutations below are synthetic failure probes,
// never source claims.
test('BU Bench V1 parser reads one row per run file and fails closed on schema, task count or task-set text', () => {
  const output = execFileSync('python3', ['-B', '-c', String.raw`
import importlib.util,gzip,hashlib,json,copy
from pathlib import Path
s=importlib.util.spec_from_file_location('collector','scripts/collect-public-benchmarks.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
entry=next(e for e in json.loads(Path('data/raw/benchmarks/collection-plan.json').read_text())['entries'] if e['benchmark_id']=='bu-bench-v1::snapshot-2026-09-09')
def load(src):
  raw=gzip.decompress(Path(src['file']).read_bytes())
  assert hashlib.sha256(raw).hexdigest()==src['sha256'],src['file']
  return raw.decode('utf-8')
readme=load(entry['source']);spec=entry['parser']
rows=m.parse(readme,spec,load)
assert len(rows)==9,len(rows)
assert len({r['id'] for r in rows})==9
got={r['id']:r['success_rate'] for r in rows}
assert got['bu-2-0|BrowserUse 0.13.7|BrowserUseCloud']==0.68
assert got['bu-v4-opus-4-8|BrowserUseCloudAPI v4|integrated']==0.85
assert got['gpt-5.6-luna|BrowserUse 0.13.7|BrowserUseCloud']==0.31
assert all(r['derivation']['inputs'][1]==100 and 'total_cost' not in r['context'] for r in rows)
assert all(r['run_source']['url'].rsplit('/',1)[-1].startswith(r['context']['framework']) for r in rows)
def fails(readme_text,loader,why):
  try: m.parse(readme_text,spec,loader)
  except ValueError: return
  raise AssertionError('accepted: '+why)
fails(readme.replace('100 hand-selected tasks','200 hand-selected tasks'),load,'changed task-set text')
first=spec['runs'][0]['url']
def mutate(fn):
  def loader(src):
    text=load(src)
    if src['url']!=first: return text
    data=json.loads(text);fn(data);return json.dumps(data)
  return loader
fails(readme,mutate(lambda d:d[0].update(tasks_completed=60)),'changed task count')
fails(readme,mutate(lambda d:d[0].pop('tasks_successful')),'missing success count')
fails(readme,mutate(lambda d:d[0].update(tasks_successful=101)),'success above task count')
fails(readme,mutate(lambda d:d.append(copy.deepcopy(d[0]))),'two runs in one file')
bad=copy.deepcopy(spec);bad['runs'][0]['url']=first.replace('_browser_','_')
try: m.parse(readme,bad,load)
except ValueError: pass
else: raise AssertionError('accepted: renamed run file')
print('bu bench parser checks passed')
`], { encoding: 'utf8' });
  assert.match(output, /bu bench parser checks passed/);
});
