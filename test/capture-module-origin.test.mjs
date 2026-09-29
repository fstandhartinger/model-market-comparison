import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

for (const mode of ['relative', 'absolute', 'external', 'ambiguous']) test(`module discovery: ${mode}`, () => {
  const code = String.raw`
import io,json,runpy,sys,tempfile,time,urllib.request
from pathlib import Path
script,mode=sys.argv[1:];calls=[]
src='/assets/index-a.js' if mode=='relative' else ('https://outside.test/assets/index-a.js' if mode=='external' else 'https://fixture.test/assets/index-a.js')
page='<script type="module" crossorigin src="'+src+'"></script><script src="https://outside.test/analytics.js"></script>'
if mode=='ambiguous':page+='<script type="module" src="/assets/index-b.js"></script>'
class Response(io.BytesIO):
 def __init__(self,b,url):super().__init__(b);self.url=url;self.status=200
 def geturl(self):return self.url
def urlopen(req,timeout=None):
 url=req.full_url;calls.append(url)
 if url=='https://fixture.test/robots.txt':return Response(b'User-agent: *\nAllow: /\n',url)
 if url=='https://fixture.test/page':return Response(page.encode(),url)
 if url=='https://fixture.test/assets/index-a.js':return Response(b'fixture data',url)
 raise AssertionError('unexpected request '+url)
urllib.request.urlopen=urlopen;time.sleep=lambda _:None
with tempfile.TemporaryDirectory() as tmp:
 p=Path(tmp);u=p/'urls.json';d=p/'out';u.write_text(json.dumps([{'url':'https://fixture.test/page','follow_module_script':True}]))
 sys.argv=[script,str(u),str(d)];runpy.run_path(script,run_name='__main__')
 rows=json.loads((d/'manifest.json').read_text())
 if mode in ['relative','absolute']:
  assert len(rows)==2 and rows[1]['status']==200
  assert rows[1]['discovered_from']=='https://fixture.test/page'
  assert calls[-1]=='https://fixture.test/assets/index-a.js'
 else:
  assert len(rows)==1 and rows[0]['follow_error']
  assert len(calls)==2
`;
  const r = spawnSync('python3', ['-c', code, fileURLToPath(new URL('../scripts/capture-benchmark-sources.py', import.meta.url)), mode], {
    encoding: 'utf8', timeout: 10000, env: { PATH: process.env.PATH, OPENAI_API_KEY: '' },
  });
  assert.equal(r.status, 0, r.stderr || r.stdout);
});
