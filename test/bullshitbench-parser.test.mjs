import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

// The sources are the committed evidence captures of BullshitBench's canonical leaderboard CSVs
// (repository commit 2678ac29, captured 2026-09-15); mutations below are synthetic failure probes,
// never source claims.
test('BullshitBench csv parser collects both suites and fails closed on header or question count', () => {
  const output = execFileSync('python3', ['-B', '-c', String.raw`
import importlib.util,gzip,hashlib,json
from pathlib import Path
s=importlib.util.spec_from_file_location('collector','scripts/collect-public-benchmarks.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
plan={e['benchmark_id']:e for e in json.loads(Path('data/raw/benchmarks/collection-plan.json').read_text())['entries']}
ev='data/raw/benchmarks/daily-evidence/2026-09-15-bullshitbench/'
cases=[('bullshitbench-v1::snapshot-2026-09-10','2605907319773e0e5858.gz',194,'55'),('bullshitbench-v2::snapshot-2026-09-10','0c866538642eab944f67.gz',214,'100')]
for bid,f,n,q in cases:
  spec=plan[bid]['parser']
  raw=gzip.decompress(Path(ev+f).read_bytes())
  assert hashlib.sha256(raw).hexdigest()==plan[bid]['source']['sha256']
  src=raw.decode('utf-8')
  rows=m.parse(src,spec,None)
  assert len(rows)==n,(bid,len(rows))
  assert len({r['model'] for r in rows})==n
  assert all(r['nonsense_count']==q for r in rows)
  assert all(abs(float(r['green_rate'])-int(r['score_2'])/int(r['nonsense_count']))<6e-5 for r in rows)
  # A renamed column must fail.
  try: m.parse(src.replace('green_rate','clear_rate',1),spec,None)
  except ValueError: pass
  else: raise AssertionError('changed header accepted: '+bid)
  # A row with a different question count must fail.
  lines=src.split('\n');cells=lines[1].split(',');cells[13]=str(int(q)-1);lines[1]=','.join(cells)
  try: m.parse('\n'.join(lines),spec,None)
  except ValueError: pass
  else: raise AssertionError('changed question count accepted: '+bid)
v1=m.parse(gzip.decompress(Path(ev+cases[0][1]).read_bytes()).decode(),plan[cases[0][0]]['parser'],None)
assert (v1[0]['model'],v1[0]['green_rate'])==('anthropic/claude-opus-4.8@reasoning=none','0.9636')
print('bullshitbench parser checks passed')
`], { encoding: 'utf8' });
  assert.match(output, /bullshitbench parser checks passed/);
});
