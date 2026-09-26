import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

// D219 (2026-09-26). The declared display-badge strip is a source guard, not a convenience: it must fail
// closed when the page stops confirming it. Every mutation below is a synthetic failure probe written to a
// scratch copy of a committed capture, never a source claim.
test('the declared display badges are stripped per source, confirmed where the row states its own name, and fail closed', () => {
  const output = execFileSync('python3', ['-B', '-c', String.raw`
import importlib.util,gzip,hashlib,json,copy,tempfile,os
from pathlib import Path
s=importlib.util.spec_from_file_location('collector','scripts/collect-public-benchmarks.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
plan=json.loads(Path('data/raw/benchmarks/collection-plan.json').read_text())
reg=json.loads(Path('data/raw/benchmarks/registry.json').read_text())
entry=lambda bid:copy.deepcopy([x for x in plan['entries'] if x['benchmark_id']==bid][0])
def load(src):
  raw=Path(src['file']).read_bytes()
  raw=gzip.decompress(raw) if src['file'].endswith('.gz') else raw
  assert hashlib.sha256(raw).hexdigest()==src['sha256'],src['file']
  return raw.decode('utf-8-sig')

result={}
for bid in ['eqbench-creative-writing::3','eqbench-longform-writing::v1.11','vending-bench::2']:
  out=m.collect({'entries':[entry(bid)]},reg)
  names=[o['subject']['source_id'] for o in out['observations']]
  assert not [n for n in names if n.startswith(('*','!')) or n.endswith(' New')],(bid,names[:5])
  # The badge is recorded per row in the protocol, so a reader sees why the label differs from the payload.
  result[bid]={'rows':len(names),'badges_stripped':sum('display_badges_stripped' in o['protocol'] for o in out['observations'])}

# A board that declares no marker keeps its name verbatim: the strip is never global.
judge=m.collect({'entries':[entry('eqbench-judgemark::4')]},reg)['observations']
assert all('display_badges_stripped' not in o['protocol'] for o in judge)

vb=entry('vending-bench::2');page=load(vb['source'])
tmp=tempfile.mkdtemp()
def collect_with(text,spec=None):
  raw=text.encode('utf-8');p=os.path.join(tmp,hashlib.sha256(raw).hexdigest()[:16]+'.html')
  Path(p).write_bytes(raw)
  e=copy.deepcopy(vb)
  if spec is not None:e['parser']=spec
  e['source']=dict(e['source'],file=p,sha256=hashlib.sha256(raw).hexdigest())
  return m.collect({'entries':[e]},reg)
def fails(text,why,spec=None):
  try: collect_with(text,spec)
  except ValueError: return
  raise AssertionError('accepted: '+why)
# The unmutated scratch copy still parses, so a probe below fails on its mutation and not on the scaffolding.
assert [o['subject']['source_id'] for o in collect_with(page)['observations']][:2]==['GPT-6 Astra','Claude Opus 5']
# A model really named "... New" keeps its name, because the row's own logo alt says so.
fails(page.replace('alt="GPT-6 Astra"','alt="GPT-6 Astra New"'),'a logo alt that contradicts the strip')
# A logo alt that disagrees with the plain name is never silently preferred either.
fails(page.replace('alt="Claude Opus 5"','alt="Claude Opus Five"'),'a logo alt that contradicts the plain name')
# Without the alt there is nothing to confirm against, so the row is rejected rather than guessed.
fails(page.replace(' alt="GPT-6 Astra"',''),'a row with no logo alt')
# And the marker alone, without the confirmation, would have accepted a truncation the alt refutes.
loose=copy.deepcopy(vb['parser']);loose['name_markers'].pop('confirm_with')
truncating=page.replace('alt="GPT-6 Astra"','alt="GPT-6 Astra New"').replace('--> GPT-6 Astra <','--> GPT-6 Astra New <')
assert [o['subject']['source_id'] for o in collect_with(truncating,loose)['observations']][0]=='GPT-6 Astra'
fails(truncating,'the same truncation while the alt confirms the longer name')
print(json.dumps(result))
`], { cwd: new URL('..', import.meta.url), encoding: 'utf8' });
  assert.deepEqual(JSON.parse(output), {
    'eqbench-creative-writing::3': { rows: 133, badges_stripped: 16 },
    'eqbench-longform-writing::v1.11': { rows: 134, badges_stripped: 10 },
    'vending-bench::2': { rows: 10, badges_stripped: 1 },
  });
});
