import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

// The source is the committed evidence capture of the published ApprenticeBench Vite
// module bundle (2026-09-14, sha256 8b07652a...); mutations below are synthetic failure
// probes, never source claims.
test('ApprenticeBench vite_board_runs parser collects both boards and fails closed', () => {
  const output = execFileSync('python3', ['-B', '-c', String.raw`
import importlib.util,gzip,hashlib
from pathlib import Path
s=importlib.util.spec_from_file_location('collector','scripts/collect-public-benchmarks.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
raw=gzip.decompress(Path('data/raw/benchmarks/daily-evidence/2026-09-14-apprenticebench/8b07652a1a512ea7c680.gz').read_bytes())
assert hashlib.sha256(raw).hexdigest()=='8b07652a1a512ea7c68038f59e0f64940dbf576fc3a6aa7c824db81e0d918c35'
src=raw.decode('utf-8')
header=["Rank","Model","Harness","Reasoning effort","Cumulative success rate","Cost per task","Tokens per task"]
spec={'kind':'vite_board_runs','require_header':header,'require_n':100}
cua=m.parse(src,dict(spec,board='cua'),None)
api=m.parse(src,dict(spec,board='api'),None)
assert len(cua)==29,len(cua)
assert len(api)==27,len(api)
assert all(r['context']['n']==100 for r in cua+api)
assert all(r['name']==f"{r['context']['model']} · {r['context']['harness']} · {r['context']['effort']}" for r in cua+api)
assert len({r['id'] for r in cua})==29 and len({r['id'] for r in api})==27
first=cua[0]
assert (first['id'],first['passed'],first['cost'],first['harness'])==('claude-fable-5-1|Claude Code|max',72,18.23,'Claude Code')
assert {r['context']['board'] for r in cua}=={'cua'} and {r['context']['board'] for r in api}=={'api'}
# A function call inside the runs array must fail.
bad=src.replace('passed:72,n:100,cost:18.23,tokens:3691e4','passed:fetchScore(),n:100,cost:18.23,tokens:3691e4',1)
assert bad!=src
try: m.parse(bad,dict(spec,board='cua'),None)
except ValueError: pass
else: raise AssertionError('function call inside the board array accepted')
# A changed leaderboard header must fail.
try: m.parse(src.replace('"Cumulative success rate"','"Overall success rate"',1),dict(spec,board='cua'),None)
except ValueError: pass
else: raise AssertionError('changed header literal accepted')
# A changed task count must fail.
badn=src.replace('passed:72,n:100,cost:18.23','passed:72,n:99,cost:18.23',1)
assert badn!=src
try: m.parse(badn,dict(spec,board='cua'),None)
except ValueError: pass
else: raise AssertionError('n == 99 accepted')
print('apprenticebench parser checks passed')
`], { encoding: 'utf8' });
  assert.match(output, /apprenticebench parser checks passed/);
});
