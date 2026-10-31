import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

// 2026-10-31: v3.29 (GPT-6.1 Terra) is reviewed into the family; v3.26 to v3.28 seat other judge panels and are
// rejection evidence like v3.20; the partial-row cap scales with the board instead of failing the whole arm.
test('Frontier review admits v3.29 (GPT-6.1 Terra), rejects the v3.26-v3.28 panels and keeps unknown protocols closed', () => {
  const out = execFileSync('python3', ['-B', '-c', String.raw`
import csv,gzip,hashlib,importlib.util,io,json
from pathlib import Path
p=Path('test/fixtures/vulcanbench-frontier-2026-10-31')
receipts=json.loads((p/'manifest.json').read_text())
bodies={}
for receipt in receipts:
    body=gzip.decompress(Path(receipt['file']).read_bytes())
    assert hashlib.sha256(body).hexdigest()==receipt['sha256']
    assert receipt['retrieved_at'].startswith('2026-10-31') and receipt['method']=='GET'
    bodies[receipt['url']]=body.decode('utf-8')
base='https://raw.githubusercontent.com/morganlinton/VulcanBenchCOM/main/assets/data/'
ref=json.loads(gzip.decompress(Path('test/fixtures/vulcanbench-frontier-2026-10-14/haiku55-v324-judge-protocols.json.gz').read_bytes()))
new=json.loads(bodies[base+'swe-v4-gpt61-terra-v329/judge-protocols.json'])
# every frozen invariant is byte-identical to the reviewed v3.24 bundle
for field in ('rubric','system','pair_instruction','probe_instruction','match_instruction','weights',
              'gate_allowance','repeats','seed','control_source_hashes','schemas','invalid_response_retries',
              'single_panel_rule','scored_panel'):
    assert new[field]==ref[field],field
assert new['protocol_id']=='code-quality-maintenance-v3.29'
assert 'v3.24' in new['amends'] and 'v3.18' in new['amends']
assert new['judge_names']=={'muse':'Muse Spark 1.3','grok':'Grok 4.6'}
assert new['judge_pins']['cursor_version']['version']==ref['judge_pins']['cursor_version']['version']
assert new['judge_pins']['cursor_version']['digest']==ref['judge_pins']['cursor_version']['digest']
cal=json.loads(bodies[base+'swe-v4-gpt61-terra-v329/calibration.json'])
assert cal['muse']['passed'] and cal['grok']['passed'] and len(cal['muse']['failing_gates'])<=1 and not cal['grok']['failing_gates']
runs=list(csv.DictReader(io.StringIO(bodies[base+'swe-v4-gpt61-terra-v329/runs.csv'])))
ref_tasks={r['task'] for r in csv.DictReader(io.StringIO(gzip.decompress(Path('test/fixtures/vulcanbench-frontier-2026-10-14/haiku55-v324-runs.csv.gz').read_bytes()).decode()))}
assert len(runs)==115 and {r['task'] for r in runs}==ref_tasks and len(ref_tasks)==23
assert {r['judged_under'] for r in runs}=={'code-quality-maintenance-v3.29'}
s=importlib.util.spec_from_file_location('collector','scripts/collect-public-benchmarks.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
entry=next(e for e in json.loads(Path('data/raw/benchmarks/registry.json').read_text())['entries'] if e['id']=='vulcanbench-frontier::4')
recipe=next(e for e in json.loads(Path('data/raw/benchmarks/collection-plan.json').read_text())['entries'] if e['benchmark_id']==entry['id'])
url='https://vulcanbench.com/assets/data/swe-v4-board.csv';source=bodies[url]
rows=m.parse(source,recipe['parser'],None,entry)
accepted=[r for r in rows if r['combined_full_denominator'] is not None]
excluded=[r for r in rows if r['combined_full_denominator'] is None]
assert len(accepted)==58 and len(excluded)==16,(len(accepted),len(excluded))
assert {r['context']['protocol'] for r in excluded}=={'code-quality-maintenance-v3.'+v for v in ('20','26','27','28')}
assert all(r['harness'] in ('Codex','Claude Code') for r in accepted)
v329=[r for r in accepted if r['context']['protocol']=='code-quality-maintenance-v3.29']
assert len(v329)==5 and {r['context']['effort'] for r in v329}=={'low','medium','high','extra-high','max'}
board={r['model']+'|'+r['effort']:r for r in csv.DictReader(io.StringIO(source))}
for r in v329:
    src=board[r['context']['model']+'|'+r['context']['effort']]
    assert src['n']=='23' and src['passed_of']=='23'
    assert float(r['combined_full_denominator'])==float(src['combined_33'])
for revision in ('v3.25','v3.30'):
    try:m.parse(source.replace('code-quality-maintenance-v3.29','code-quality-maintenance-'+revision),recipe['parser'],None,entry)
    except ValueError as e:assert m.QUARANTINE_MARK in str(e)
    else:raise AssertionError('unreviewed revision '+revision+' admitted')
# a suite change that drops most rows below 23 tasks still fails the arm
shrunk=list(csv.DictReader(io.StringIO(source)))
for r in shrunk:
    if r['n']==r['passed_of']=='23':r['n']=r['passed_of']='22'
buf=io.StringIO();w=csv.DictWriter(buf,fieldnames=list(shrunk[0]),lineterminator='\n');w.writeheader();w.writerows(shrunk)
try:m.parse(buf.getvalue(),recipe['parser'],None,entry)
except ValueError as e:assert 'rows without a score on the full 23 tasks' in str(e),str(e)
else:raise AssertionError('a board-wide denominator change was admitted')
recipe['source']=next(r for r in receipts if r['url']==url)
result=m.collect({'entries':[recipe]},{'entries':[entry]})
assert len(result['observations'])==58 and len(result['rejected'])==16
print('58 observations incl. five v3.29 GPT-6.1 Terra rows; 16 judge-panel rejections; unknown revisions fail closed')
`]).toString().trim();
  assert.equal(out, '58 observations incl. five v3.29 GPT-6.1 Terra rows; 16 judge-panel rejections; unknown revisions fail closed');
});
