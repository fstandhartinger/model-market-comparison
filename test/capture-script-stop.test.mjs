// Exercise the actual Python capture loop with inert HTTP fixtures. A restriction
// on a discovered chunk must stop later requests to that host too.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

for (const restriction of ['429', '403', 'challenge']) test(`declared script ${restriction} stops the host`, () => {
  const code = String.raw`
import io,json,runpy,sys,tempfile,time,urllib.request,urllib.error
from pathlib import Path
script,restriction=sys.argv[1:]
calls=[]
class Response(io.BytesIO):
 def __init__(self,b,url):super().__init__(b);self.url=url;self.status=200
 def geturl(self):return self.url
def urlopen(req,timeout=None):
 url=req.full_url;calls.append(url)
 if url.endswith('/robots.txt'):return Response(b'User-agent: *\nAllow: /\n',url)
 if url.endswith('/board'):return Response(b'<script src="/bad.js"></script><script src="/later.js"></script>',url)
 if url.endswith('/bad.js'):
  if restriction=='challenge':return Response(b'<title>Just a moment</title>cf-chl-',url)
  raise urllib.error.HTTPError(url,int(restriction),'restricted',{},None)
 raise AssertionError('host continued after restriction: '+url)
urllib.request.urlopen=urlopen;time.sleep=lambda _:None
with tempfile.TemporaryDirectory() as tmp:
 path=Path(tmp);urls=path/'urls.json';dest=path/'out'
 urls.write_text(json.dumps([{'url':'https://fixture.test/board','follow_script_marker':'DATA'},'https://fixture.test/after']))
 sys.argv=[script,str(urls),str(dest)]
 runpy.run_path(script,run_name='__main__')
 rows=json.loads((dest/'manifest.json').read_text())
 assert rows[0]['follow_error']
 assert rows[1]['status']=='source_unreachable'
 assert 'Host stopped' in rows[1]['reason']
 assert calls==['https://fixture.test/robots.txt','https://fixture.test/board','https://fixture.test/bad.js'],calls
`;
  const run = spawnSync('python3', ['-c', code, fileURLToPath(new URL('../scripts/capture-benchmark-sources.py', import.meta.url)), restriction], {
    encoding: 'utf8', timeout: 10000, env: { PATH: process.env.PATH, OPENAI_API_KEY: '' },
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);
});
