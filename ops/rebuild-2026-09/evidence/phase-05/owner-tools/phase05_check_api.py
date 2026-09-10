import json,urllib.request,urllib.error,sys,time,hashlib
from pathlib import Path
base=sys.argv[1];outfile=Path(sys.argv[2]);expected=json.load(open('data/dataset.json'));checks=[]
def get(path,status=200):
 try:
  r=urllib.request.urlopen(base+path,timeout=60);body=r.read();actual=r.status;headers=dict(r.headers)
 except urllib.error.HTTPError as e:body=e.read();actual=e.code;headers=dict(e.headers)
 assert actual==status,(path,actual,body[:300]);assert headers.get('Access-Control-Allow-Origin',headers.get('access-control-allow-origin'))=='*',(path,headers)
 value=json.loads(body);checks.append({'path':path,'status':actual,'bytes':len(body),'cors':'*'});return value
r=get('/api/benchmarks');assert len(r['benchmarks'])==73 and sum(b['collection']['status']=='collected' for b in r['benchmarks'])==67
for v,count in [('1.4',68),('1.5',13)]:
 r=get('/api/benchmark-scores?benchmark_id=aa-coding-agent-index::'+v+'&limit=500');assert r['total']==count and all(o['benchmark_id'].endswith('::'+v) for o in r['observations'])
get('/api/benchmark-scores?benchmark_id=aa-coding-agent-index',404);get('/api/benchmark-scores?model_id=imaginary',404);get('/api/benchmark-scores?limit=501',400);get('/api/benchmark-scores?basis=assumed',400)
r=get('/api/benchmark-scores?basis=self_reported&limit=500');assert r['total']==519 and all(o['basis']=='self_reported' and o['source']['url'] for o in r['observations'])
r=get('/api/benchmark-scores?basis=derived&offset=1&limit=2');assert r['total']==767 and len(r['observations'])==2 and all(o['source_basis'] in ['measured','self_reported'] for o in r['observations'])
model='deepseek-v3-dec-24::default';r=get('/api/benchmark-scores?model_id='+model+'&benchmark_id=longbench::2');assert r['cell']['status']=='available' and r['total']==1 and r['observations'][0]['value']==48.7 and r['divergences']==[]
get('/api/benchmark-scores?model_id='+model+'&benchmark_id=aa-livecodebench::unknown-window',404)
contested=next(m for m in expected['benchmark_results']['missing'] if m['model_id']==model);r=get('/api/benchmark-scores?model_id='+model+'&benchmark_id='+contested['benchmark_id']);assert r['cell']['status']=='contested'
r=get('/api/benchmark-scores?model_id='+model+'&benchmark_id=helmet::snapshot-2026-09-10');assert r['cell']['status']=='unknown'
r=get('/api/models/'+model);assert r['benchmark_coverage']['available']>0 and any(o['basis']=='self_reported' for o in r['benchmark_observations'])
r=get('/api/dataset?phase05_verify='+str(time.time_ns()));runtime=r.pop('_source',None);assert r==expected,'live dataset mismatch';assert get('/api/health')['ok'] is True
outfile.write_text(json.dumps({'base_url':base,'checked_at':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'dataset_equal_except_runtime_source':True,'runtime_source':runtime,'generated_at':expected['generated_at'],'checks':checks},indent=2)+'\n');print(len(checks),'API checks passed; complete dataset equal')
