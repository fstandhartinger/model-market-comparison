from pathlib import Path
import json,subprocess,hashlib,urllib.request,datetime,time,sys,concurrent.futures
commit=sys.argv[1];out=Path(sys.argv[2]);raw=subprocess.check_output(['git','show',commit+':data/dataset.json'],cwd='/opt/model-market-comparison');expected=json.loads(raw)
canonical=lambda x:json.dumps(x,sort_keys=True,separators=(',',':'),ensure_ascii=False)
def check(host):
 result={'host':host,'checked_at':datetime.datetime.now(datetime.timezone.utc).isoformat()}
 with urllib.request.urlopen('https://'+host+'/api/dataset?phase08='+str(time.time_ns()),timeout=45) as response:
  body=response.read();value=json.loads(body);marker=value.pop('_source',None)
  result.update(status=response.status,runtime_source=marker,cors=response.headers.get('Access-Control-Allow-Origin'),dataset_equal=marker in ['bundled','postgres'] and canonical(value)==canonical(expected),response_bytes=len(body),response_sha256=hashlib.sha256(body).hexdigest(),sources=value.get('sources'),counts=value.get('counts'))
 with urllib.request.urlopen('https://'+host+'/',timeout=30) as response:
  html=response.read().decode();result['homepage_status']=response.status;result['brand_present']='Benchmark Heaven' in html
 return result
hosts=['benchmarkheaven.com','www.benchmarkheaven.com','model-market-comparison.app.mintapis.com']
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:checks=list(pool.map(check,hosts))
r={'commit':commit,'expected_dataset_sha256':hashlib.sha256(raw).hexdigest(),'checks':checks,'ok':all(x['dataset_equal'] and x['status']==200 and x['homepage_status']==200 and x['brand_present'] for x in checks)}
out.write_text(json.dumps(r,indent=2)+'\n');print(json.dumps({'commit':commit,'ok':r['ok'],'hosts':[(x['host'],x['dataset_equal'],x['homepage_status']) for x in checks]}))
if not r['ok']:raise SystemExit(1)
