import socket,ssl,urllib.request,json,hashlib,datetime,subprocess,sys
from pathlib import Path
mode=sys.argv[1] if len(sys.argv)>1 else 'pre-release';rows=[]
for host in ['benchmarkheaven.com','www.benchmarkheaven.com','model-market-comparison.app.mintapis.com']:
 row={'host':host,'public_dns':{},'tls':{}}
 for ns in ['1.1.1.1','8.8.8.8']:
  ans=subprocess.check_output(['dig','+short',host,'A','@'+ns],text=True).strip();assert ans=='65.109.49.103',ans;row['public_dns'][ns]=ans
 # Inspect the certificate on the publicly resolved server. Explicit address keeps a
 # local stale resolver entry from masking the CA result; SNI/name/chain all verified.
 with socket.create_connection(('65.109.49.103',443),timeout=15) as sock:
  with ssl.create_default_context().wrap_socket(sock,server_hostname=host) as t:
   c=t.getpeercert();row['tls']={'subject':c['subject'],'subjectAltName':c.get('subjectAltName'),'issuer':c['issuer'],'notBefore':c['notBefore'],'notAfter':c['notAfter'],'sha256':hashlib.sha256(t.getpeercert(True)).hexdigest(),'version':t.version(),'chain_and_hostname_verified':True,'connection_ip':'65.109.49.103'}
 row['requests']=[]
 for path in ['/api/health','/api/meta']:
  # Ordinary HTTPS client, no certificate or DNS overrides.
  with urllib.request.urlopen('https://'+host+path,timeout=20) as r:
   data=json.load(r);assert r.status==200;row['requests'].append({'path':path,'status':r.status,'final_url':r.url,'cors':r.headers.get('Access-Control-Allow-Origin'),'json':data})
 with urllib.request.urlopen('http://'+host+'/api/health?brandcheck=1',timeout=20) as r:
  assert r.url=='https://'+host+'/api/health?brandcheck=1';assert r.status==200;row['http_redirect_preserves_path_query']=True
 rows.append(row)
for row in rows[1:]:assert row['requests'][1]['json']==rows[0]['requests'][1]['json']
Path('ops/rebuild-2026-09/evidence/phase-07/tls-'+mode+'.json').write_text(json.dumps({'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'stage':mode,'hosts':rows,'same_api_metadata_all_hosts':True},indent=2)+'\n')
print('Public DNS, trusted certificates, ordinary HTTPS and API equality pass on all 3 hosts')
