import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

test('public source parsers preserve zero, reject malformed values and isolate protocols', () => {
  // Synthetic fixtures exercise boundaries; these are not source claims.
  const output = execFileSync('python3', ['-B', '-c', String.raw`
import importlib.util,json,tempfile,hashlib
from pathlib import Path
s=importlib.util.spec_from_file_location('collector','scripts/collect-public-benchmarks.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
assert m.numeric('0%')==0 and m.numeric('—') is None and m.numeric('58.2 ± 1.1')==58.2
assert m.text('[Gemini-1.5-pro](https://example.org/models#Pro%20(Preview%20only),-Text%20and%20images)')=='Gemini-1.5-pro'
for value in [True, float('inf'), 'oops', '12 percent', 'Infinity']:
 try: m.numeric(value)
 except ValueError: pass
 else: raise AssertionError(value)
assert m.csvrows('name,score\n"A, B",0\n')[0]=={'name':'A, B','score':'0'}
for source in ['name,name\na,0', 'name,score\na,1,2']:
 try: m.csvrows(source)
 except ValueError: pass
 else: raise AssertionError('invalid CSV accepted')
try: m.parse('const data = '+chr(96)+'name,score\na,'+chr(36)+'{run()}'+chr(96),{'kind':'template_csv','variable':'data'},None)
except ValueError: pass
else: raise AssertionError('interpolated JavaScript accepted')
swe='<script id="leaderboard-data">'+json.dumps([{'name':'Verified','results':[{'name':'A','resolved':0}]},{'name':'Multilingual','results':[{'name':'A','resolved':99}]}])+'</script>'
assert m.parse(swe,{'kind':'swebench','board':'Verified'},None)[0]['resolved']==0
try: m.parse(swe,{'kind':'swebench','board':'new-version'},None)
except ValueError: pass
else: raise AssertionError('wrong version accepted')
mmmu=json.dumps({'leaderboardData':[{'info':{'type':'human_expert','name':'Human'},'validation':{'overall':99}},{'info':{'type':'model','name':'A'},'test':{'overall':0},'pro':{'overall':88}}]})
assert m.parse(mmmu,{'kind':'mmmu'},None)==[{'name':'A','value':0,'id':'A/test','context':{'split':'test','info':{'type':'model','name':'A'},'source':None}}]
with tempfile.TemporaryDirectory() as t:
 root=Path(t);raw=json.dumps({'rows':[{'name':'A','score':0,'dataset':'v2','display':True},{'name':'Human','score':1,'dataset':'v2','group':'Human','display':True},{'name':'B','score':9,'dataset':'v1','display':True},{'name':'C','score':9,'dataset':'v2','display':False}]}).encode();(root/'source.json').write_bytes(raw)
 source={'file':'source.json','sha256':hashlib.sha256(raw).hexdigest(),'url':'https://example.org/results','retrieved_at':'2026-09-10'}
 spec={'benchmark_id':'bench::2','source':source,'protocol':'exact v2','parser':{'kind':'json','row_path':'rows','name_field':'name','value_field':'score','filter_field':'dataset','filter_value':'v2','skip_field':'group','skip_values':['Human'],'display_only':True}}
 registry={'entries':[{'id':'bench::2','scoring':{'range':[0,100],'unit':'percent'}}]}
 result=m.collect({'entries':[spec]},registry,root);assert len(result['observations'])==1 and result['observations'][0]['value']==0
 (root/'source.json').write_text('{bad')
 try: m.collect({'entries':[spec]},registry,root)
 except ValueError as e: assert 'digest changed' in str(e)
 else: raise AssertionError('unreviewed source accepted')
print('parser boundary checks passed')
`], { encoding: 'utf8' });
  assert.match(output, /parser boundary checks passed/);
});
