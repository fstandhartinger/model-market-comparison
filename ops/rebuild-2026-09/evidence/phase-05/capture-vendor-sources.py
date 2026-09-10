# Owner fallback primary capture; raw evidence only. Never execute downloaded content.
import urllib.request,urllib.robotparser,urllib.parse,hashlib,json,gzip,time
from pathlib import Path
from datetime import datetime,timezone
D=Path('ops/rebuild-2026-09/evidence/phase-05/vendor-owner');D.mkdir(exist_ok=True)
urls=[('qwen-card','https://huggingface.co/Qwen/Qwen3-235B-A22B-Thinking-2507/raw/main/README.md'),('deepseek-report','https://raw.githubusercontent.com/deepseek-ai/DeepSeek-V3/main/DeepSeek_V3.pdf'),('mistral-release','https://mistral.ai/news/devstral-2-vibe-cli')]
UA='BenchmarkHeavenResearch/1.0 (+https://github.com/fstandhartinger/model-market-comparison)'
receipts=[]
for name,url in urls:
 r={'name':name,'url':url,'retrieved_at':datetime.now(timezone.utc).isoformat()}
 try:
  origin=urllib.parse.urlsplit(url); robots=f'{origin.scheme}://{origin.netloc}/robots.txt'
  try:
   resp=urllib.request.urlopen(urllib.request.Request(robots,headers={'User-Agent':UA}),timeout=30);policy=resp.read().decode();(D/(name+'-robots.txt')).write_text(policy)
   rp=urllib.robotparser.RobotFileParser();rp.parse(policy.splitlines())
   if not rp.can_fetch(UA,url):raise RuntimeError('robots disallows source')
  except urllib.error.HTTPError as e:
   if e.code!=404:raise
  time.sleep(2)
  response=urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':UA}),timeout=45)
  raw=response.read(15000000)
  if len(raw)>=15000000:raise RuntimeError('source exceeds bounded capture')
  path=D/(name+('.pdf' if url.endswith('.pdf') else '.raw.gz'))
  path.write_bytes(raw if url.endswith('.pdf') else gzip.compress(raw,mtime=0))
  r.update(status=response.status,file=str(path),sha256=hashlib.sha256(raw).hexdigest(),bytes=len(raw),final_url=response.url)
 except Exception as e:r.update(status='unreachable',reason=str(e))
 receipts.append(r);(D/'sources.json').write_text(json.dumps(receipts,indent=2)+'\n');print(json.dumps(r),flush=True)
