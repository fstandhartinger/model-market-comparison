import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

test('public source parsers preserve zero, reject malformed values and isolate protocols', () => {
  // Synthetic fixtures exercise boundaries; these are not source claims.
  const output = execFileSync('python3', ['-B', '-c', String.raw`
import importlib.util,json,tempfile,hashlib
from pathlib import Path
s=importlib.util.spec_from_file_location('collector','scripts/collect-public-benchmarks.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
assert m.numeric('0%')==0 and m.numeric('51.8 %')==51.8 and m.numeric('$ 17.28')==17.28 and m.numeric('—') is None and m.numeric('58.2 ± 1.1')==58.2
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
import html as h
props={'view':[0,{'metadata':[0,{'version':[0,'2']}],'tasks':[0,{'overall':[0,{'lab/a':[0,{'accuracy':[0,0],'cost_per_test':[0,1.5]}],'lab/b':[0,{'accuracy':[0,71.2],'cost_per_test':[0,None]}]}]}]}],'tags':[1,[[0,'x']]]}
page='<astro-island component-url="/_astro/Other.js" props="{}"></astro-island><astro-island component-url="/_astro/BenchmarkView.X.js" props="'+h.escape(json.dumps(props))+'"></astro-island>'
astro={'kind':'astro_props','component':'/_astro/BenchmarkView.','row_path':'view.tasks.overall','require':{'view.metadata.version':'2'},'context_keys':['cost_per_test']}
rows=m.parse(page,astro,None);assert [(r['name'],r['accuracy'],r['context']['cost_per_test']) for r in rows]==[('lab/a',0,1.5),('lab/b',71.2,None)]
for bad in [dict(astro,require={'view.metadata.version':'3'}), dict(astro,component='/_astro/Missing.')]:
 try: m.parse(page,bad,None)
 except ValueError: pass
 else: raise AssertionError('changed Astro source accepted')
try: m.parse(page.replace(h.escape('[0, 71.2]'),h.escape('[3, "2026-01-01"]')),astro,None)
except ValueError: pass
else: raise AssertionError('non-plain Astro encoding accepted')
runs=json.dumps({'v1_1':{'harness':{'A':'cli'},'subsets':{'main':100},'data':{'A':{'low':{'main':{'new_score':0,'cost':2}},'max':{'extended':{'new_score':0.9}}}}}})
effort={'kind':'effort_runs_json','row_path':'v1_1','subset':'main','require':{'subsets.main':100},'context_keys':['cost']}
rows=m.parse(runs,effort,None);assert [(r['id'],r.get('new_score'),r['harness']) for r in rows]==[('A|low',0,'cli'),('A|max',None,'cli')]
try: m.parse(runs,dict(effort,require={'subsets.main':150}),None)
except ValueError: pass
else: raise AssertionError('changed task count accepted')
print('parser boundary checks passed')
`], { encoding: 'utf8' });
  assert.match(output, /parser boundary checks passed/);
});
