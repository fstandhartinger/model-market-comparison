import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

test('Frontier review admits v3.23 (Sonnet 5.5) on identical frozen invariants and keeps unknown protocols closed', () => {
  const out = execFileSync('python3', ['-B', '-c', String.raw`
import csv,gzip,hashlib,importlib.util,io,json
from pathlib import Path
p=Path('test/fixtures/vulcanbench-frontier-2026-10-10')
receipts=json.loads((p/'manifest.json').read_text())
bodies={}
for receipt in receipts:
    body=gzip.decompress(Path(receipt['file']).read_bytes())
    assert hashlib.sha256(body).hexdigest()==receipt['sha256']
    assert receipt['retrieved_at'].startswith('2026-10-10') and receipt['method']=='GET'
    bodies[receipt['url']]=body.decode('utf-8')
# the reviewed reference bundle is the 2026-10-07 fixture of v3.18
ref=json.loads(gzip.decompress(Path('test/fixtures/vulcanbench-frontier-2026-10-07/swe-v4-gpt61-sol-v318-judge-protocols.json.gz').read_bytes()))
new=json.loads(bodies['https://raw.githubusercontent.com/morganlinton/VulcanBenchCOM/main/assets/data/swe-v4-sonnet55-v323/judge-protocols.json'])
# every frozen invariant the version guard names is byte-identical to the reviewed v3.18 bundle
for field in ('rubric','system','pair_instruction','probe_instruction','match_instruction','weights',
              'gate_allowance','repeats','seed','control_source_hashes','schemas','invalid_response_retries',
              'single_panel_rule','unpublished','scored_panel'):
    assert new[field]==ref[field],field
# the amendment chain runs over the reviewed lineage and stops at v3.15
assert new['amends']=={k:f'runs-code-quality-maintenance-{k}' for k in ('v3','v3.1','v3.2','v3.3','v3.4','v3.5','v3.6','v3.6.1','v3.7','v3.15')}
assert new['protocol_ids']=={'muse':'code-quality-maintenance-v3.23','grok':'code-quality-maintenance-v3.23'}
assert new['judge_pins']['settings_match_v3_4_bundle'] is True
assert new['task_hash_bridge']['tasks']==23
# per-run export: the same 23 task ids, 115 rows, every row judged under v3.23 and published
runs=list(csv.DictReader(io.StringIO(bodies['https://raw.githubusercontent.com/morganlinton/VulcanBenchCOM/main/assets/data/swe-v4-sonnet55-v323/runs.csv'])))
ref_tasks={r['task'] for r in csv.DictReader(io.StringIO(gzip.decompress(Path('test/fixtures/vulcanbench-frontier-2026-10-07/swe-v4-gpt61-sol-v318-runs.csv.gz').read_bytes()).decode()))}
assert len(runs)==115 and {r['task'] for r in runs}==ref_tasks
assert {r['judged_under'] for r in runs}=={'code-quality-maintenance-v3.23'}
assert {r['judged'] for r in runs}=={'published'}
# the board itself groups v3.23 with the same-rubric family and marks only v3.20 non-comparable
import re,html
lb=re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',html.unescape(bodies['https://vulcanbench.com/leaderboard.html'])))
assert 'v3.20 and v3.23 apply the same rubric, controls and gates' in lb
assert 'v3.23 judges Grok 4.6 through a newer Cursor CLI' in lb
s=importlib.util.spec_from_file_location('collector','scripts/collect-public-benchmarks.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
entry=next(e for e in json.loads(Path('data/raw/benchmarks/registry.json').read_text())['entries'] if e['id']=='vulcanbench-frontier::4')
recipe=next(e for e in json.loads(Path('data/raw/benchmarks/collection-plan.json').read_text())['entries'] if e['benchmark_id']==entry['id'])
url='https://vulcanbench.com/assets/data/swe-v4-board.csv';source=bodies[url]
rows=m.parse(source,recipe['parser'],None,entry)
accepted=[r for r in rows if r['combined_full_denominator'] is not None]
excluded=[r for r in rows if r['combined_full_denominator'] is None]
assert len(accepted)==51 and len(excluded)==4,(len(accepted),len(excluded))
assert all(r['harness']!='Cursor' for r in accepted)
v323=[r for r in accepted if r['context']['protocol']=='code-quality-maintenance-v3.23']
assert len(v323)==5 and {r['context']['effort'] for r in v323}=={'low','medium','high','extra-high','max'}
board={r['model']+'|'+r['effort']:r for r in csv.DictReader(io.StringIO(source))}
for r in v323:
    src=board[r['context']['model']+'|'+r['context']['effort']]
    assert src['n']=='23' and src['passed_of']=='23'
    assert float(r['combined_full_denominator'])==float(src['combined_33'])
try:m.parse(source.replace('code-quality-maintenance-v3.23','code-quality-maintenance-v3.24'),recipe['parser'],None,entry)
except ValueError:pass
else:raise AssertionError('unreviewed revision v3.24 admitted')
recipe['source']=next(r for r in receipts if r['url']==url)
result=m.collect({'entries':[recipe]},{'entries':[entry]})
assert len(result['observations'])==51 and len(result['rejected'])==4
print('51 observations incl. five v3.23 Sonnet 5.5 rows; 4 Cursor rejections; unknown revisions fail closed')
`]).toString().trim();
  assert.equal(out, '51 observations incl. five v3.23 Sonnet 5.5 rows; 4 Cursor rejections; unknown revisions fail closed');
});
