#!/usr/bin/env python3
"""Bounded public source capture. URL list JSON and output directory; no source code execution."""
import sys,urllib.request,urllib.error,urllib.robotparser,urllib.parse,hashlib,json,gzip,time,re,zipfile,io
from pathlib import Path
from datetime import datetime,timezone
urls=json.loads(Path(sys.argv[1]).read_text());dest=Path(sys.argv[2]);dest.mkdir(parents=True,exist_ok=True)
class Redirects(urllib.request.HTTPRedirectHandler):
 # Python 3.10 follows 301/302/303/307 only; a 308 (permanent, method-preserving) is followed the same way as 307.
 def redirect_request(self,req,fp,code,msg,headers,newurl):return super().redirect_request(req,fp,307 if code==308 else code,msg,headers,newurl)
 http_error_308=urllib.request.HTTPRedirectHandler.http_error_307
urllib.request.install_opener(urllib.request.build_opener(Redirects))
UA='BenchmarkHeavenResearch/1.0 (+https://github.com/fstandhartinger/model-market-comparison)'
policies={};last={};blocked=set();receipts=[];queue=list(urls)
while queue:
 item=queue.pop(0)
 url=item if isinstance(item,str) else item['url'];body=None;method='GET'
 follow=isinstance(item,dict) and item.get('follow_module_script') is True
 member=item.get('zip_member') if isinstance(item,dict) else None
 if isinstance(item,dict) and item.get('method','GET')!='GET':
  # The sole POST adapter is a documented, read-only leaderboard query.
  if item.get('method')!='POST' or url!='https://uncommon-sandpiper-321.convex.cloud/api/query' or item.get('body')!={'path':'runs:getLeaderboard','args':{},'format':'json'}:raise ValueError('Unsupported capture request')
  method='POST';body=json.dumps(item['body']).encode()
 host=urllib.parse.urlsplit(url).netloc;origin='https://'+host
 r={'url':url,'retrieved_at':datetime.now(timezone.utc).isoformat(),'method':method}
 if isinstance(item,dict) and item.get('discovered_from'):r['discovered_from']=item['discovered_from']
 if member:r['zip_member']=member
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
  if member:
   # A file that only ships inside a maintainer's archive (Epoch's benchmark_data.zip, 2026-09-21): the named member,
   # exactly once, is the captured source; the archive's own hash and size stay on the receipt.
   # Only stored/deflate members, read in chunks under the same 12 MB bound: a declared size is not trusted.
   z=zipfile.ZipFile(io.BytesIO(b));infos=[i for i in z.infolist() if i.filename==member]
   if len(infos)!=1:raise RuntimeError('Expected exactly one zip member '+member+', found '+str(len(infos)))
   if infos[0].compress_type not in (zipfile.ZIP_STORED,zipfile.ZIP_DEFLATED):raise RuntimeError('Unsupported zip compression')
   r.update(container_sha256=hashlib.sha256(b).hexdigest(),container_bytes=len(b));out=bytearray()
   with z.open(infos[0]) as f:
    while chunk:=f.read(1<<20):
     out+=chunk
     if len(out)>=12000000:raise RuntimeError('Zip member exceeds 12MB bound')
   b=bytes(out)
  sha=hashlib.sha256(b).hexdigest();p=dest/(sha[:20]+'.gz');p.write_bytes(gzip.compress(b,mtime=0));r.update(status=q.status,file=str(p),sha256=sha,bytes=len(b),final_url=q.url)
  if follow and q.status==200:
   # Single-page apps ship their data in one hashed bundle; the name changes every deploy. Two build
   # tools, one rule: exactly one bundle script must match, and its src is resolved against the page.
   page=b.decode('utf-8','replace')
   matches=re.findall(r'<script type="module"[^>]*\ssrc="(/assets/[A-Za-z0-9._-]+\.js)"',page)
   matches+=re.findall(r'<script[^>]*\sdefer[^>]*\ssrc="(\.?/?static/js/main\.[A-Za-z0-9]+\.js)"',page)
   if len(matches)!=1:r['follow_error']='Expected exactly one module script, found '+str(len(matches))
   else:queue.append({'url':urllib.parse.urljoin(q.geturl(),matches[0]),'discovered_from':url})
 except Exception as e:
  if isinstance(e,urllib.error.HTTPError) and e.code in [403,429]:blocked.add(host)
  r.update(status='source_unreachable',reason=str(e))
 receipts.append(r);(dest/'manifest.json').write_text(json.dumps(receipts,indent=2)+'\n');print(json.dumps(r),flush=True)
