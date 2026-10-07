import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

test('Frontier review admits continuous v3.17/v3.18, rejects the changed Cursor judge panel and keeps unknown populations closed', () => {
  const out = execFileSync('python3', ['-B', '-c', String.raw`
import csv,gzip,hashlib,importlib.util,io,json
from pathlib import Path
p=Path('test/fixtures/vulcanbench-frontier-2026-10-07')
receipts=json.loads((p/'manifest.json').read_text())
bodies={}
for receipt in receipts:
    body=gzip.decompress(Path(receipt['file']).read_bytes())
    assert hashlib.sha256(body).hexdigest()==receipt['sha256']
    assert receipt['retrieved_at'].startswith('2026-10-07') and receipt['method']=='GET'
    bodies[receipt['url']]=body.decode('utf-8')
root='https://raw.githubusercontent.com/morganlinton/VulcanBenchCOM/main/assets/data/'
def bundle(slug):return json.loads(bodies[root+slug+'/judge-protocols.json'])
reference=bundle('swe-v4-astra-fable51-v34')
changed=bundle('swe-v4-grok47-cursor-v320')
assert reference['scored_panel']!=changed['scored_panel']
def runs(slug):return list(csv.DictReader(io.StringIO(bodies[root+slug+'/runs.csv'])))
reference_tasks={r['task'] for r in runs('swe-v4-astra-fable51-v34')}
assert len(reference_tasks)==23
for slug in ('swe-v4-gpt6-sol-v317','swe-v4-gpt61-sol-v318'):
    exported=runs(slug)
    assert len(exported)==115 and {r['task'] for r in exported}==reference_tasks
assert 'not strictly comparable with the other columns' in bodies['https://vulcanbench.com/leaderboard.html']
s=importlib.util.spec_from_file_location('collector','scripts/collect-public-benchmarks.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
entry=next(e for e in json.loads(Path('data/raw/benchmarks/registry.json').read_text())['entries'] if e['id']=='vulcanbench-frontier::4')
recipe=next(e for e in json.loads(Path('data/raw/benchmarks/collection-plan.json').read_text())['entries'] if e['benchmark_id']==entry['id'])
url='https://vulcanbench.com/assets/data/swe-v4-board.csv';source=bodies[url]
rows=m.parse(source,recipe['parser'],None,entry)
accepted=[r for r in rows if r['combined_full_denominator'] is not None]
excluded=[r for r in rows if r['combined_full_denominator'] is None]
assert len(accepted)==46 and len(excluded)==4,(len(accepted),len(excluded))
assert all(r['harness']!='Cursor' for r in accepted)
assert all(r['harness']=='Cursor' and '(Cursor)' in r['id'] and 'not strictly comparable' in r['reject_reason'] for r in excluded)
assert not any(r['id']=='GPT-6 Sol [medium]' for r in accepted), 'missing full-denominator score stays withheld'
assert len([r for r in accepted if r['context']['protocol']=='code-quality-maintenance-v3.17'])==4
assert len([r for r in accepted if r['context']['protocol']=='code-quality-maintenance-v3.18'])==5
for old,new in [('code-quality-maintenance-v3.20','code-quality-maintenance-v3.21'),('Grok 4.7','Unknown Model'),('swe-v4-grok47-cursor-v320.html','different-report.html'),('Cursor','Unknown Harness'),('Cursor','Codex')]:
    try:m.parse(source.replace(old,new),recipe['parser'],None,entry)
    except ValueError:pass
    else:raise AssertionError('unreviewed population admitted: '+new)
try:m.parse(source.replace('Claude Code','Cursor'),recipe['parser'],None,entry)
except ValueError:pass
else:raise AssertionError('Cursor was merged into reviewed Claude Code population')
recipe['source']=next(r for r in receipts if r['url']==url)
result=m.collect({'entries':[recipe]},{'entries':[entry]})
assert len(result['observations'])==46 and len(result['rejected'])==4
assert all(o['subject']['harness'] in ('Codex','Claude Code') for o in result['observations'])
assert all('(Cursor)' in r['source_id'] for r in result['rejected'])
print('46 observations; 4 explicit Cursor rejections; unknown populations fail closed')
`]).toString().trim();
  assert.equal(out, '46 observations; 4 explicit Cursor rejections; unknown populations fail closed');
});
