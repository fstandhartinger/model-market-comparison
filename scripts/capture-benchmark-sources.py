#!/usr/bin/env python3
"""Bounded public source capture. URL list JSON and output directory; no source code execution."""
import sys,urllib.request,urllib.error,urllib.robotparser,urllib.parse,hashlib,json,gzip,time
from pathlib import Path
from datetime import datetime,timezone
urls=json.loads(Path(sys.argv[1]).read_text());dest=Path(sys.argv[2]);dest.mkdir(parents=True,exist_ok=True)
UA='BenchmarkHeavenResearch/1.0 (+https://github.com/fstandhartinger/model-market-comparison)'
policies={};last={};blocked=set();receipts=[]
for item in urls:
 url=item if isinstance(item,str) else item['url'];body=None;method='GET'
 if isinstance(item,dict) and item.get('method','GET')!='GET':
  # The sole POST adapter is a documented, read-only leaderboard query.
  if item.get('method')!='POST' or url!='https://uncommon-sandpiper-321.convex.cloud/api/query' or item.get('body')!={'path':'runs:getLeaderboard','args':{},'format':'json'}:raise ValueError('Unsupported capture request')
  method='POST';body=json.dumps(item['body']).encode()
 host=urllib.parse.urlsplit(url).netloc;origin='https://'+host
 r={'url':url,'retrieved_at':datetime.now(timezone.utc).isoformat(),'method':method}
 if body is not None:r['request_body']=item['body']
 try:
  if host in blocked:raise RuntimeError('Host stopped after access restriction')
  if host not in policies:
   rp=urllib.robotparser.RobotFileParser()
   try:
    q=urllib.request.urlopen(urllib.request.Request(origin+'/robots.txt',headers={'User-Agent':UA}),timeout=30);policy=q.read(200000).decode();rp.parse(policy.splitlines());(dest/(host+'-robots.txt')).write_text(policy)
   except urllib.error.HTTPError as e:
    if e.code!=404:raise
    rp.parse([])
   policies[host]=rp;last[host]=time.monotonic()
  rp=policies[host]
  if not rp.can_fetch(UA,url):raise RuntimeError('robots disallows source')
  delay=max(2.5,rp.crawl_delay(UA) or rp.crawl_delay('*') or 0);time.sleep(max(0,delay-(time.monotonic()-last.get(host,0))))
  q=urllib.request.urlopen(urllib.request.Request(url,data=body,method=method,headers={'User-Agent':UA,**({'Content-Type':'application/json'} if body else {})}),timeout=45);b=q.read(12000000);last[host]=time.monotonic()
  if len(b)>=12000000:raise RuntimeError('Response exceeds 12MB bound')
  if any(x in b[:100000].lower() for x in [b'<title>just a moment',b'cf-chl-',b'g-recaptcha',b'hcaptcha']):blocked.add(host);raise RuntimeError('Challenge detected; stopped host')
  sha=hashlib.sha256(b).hexdigest();p=dest/(sha[:20]+'.gz');p.write_bytes(gzip.compress(b,mtime=0));r.update(status=q.status,file=str(p),sha256=sha,bytes=len(b),final_url=q.url)
 except Exception as e:
  if isinstance(e,urllib.error.HTTPError) and e.code in [403,429]:blocked.add(host)
  r.update(status='source_unreachable',reason=str(e))
 receipts.append(r);(dest/'manifest.json').write_text(json.dumps(receipts,indent=2)+'\n');print(json.dumps(r),flush=True)
