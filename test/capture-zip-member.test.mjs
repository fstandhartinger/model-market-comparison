import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { gunzipSync } from 'node:zlib';

// The real capture script against a stubbed network: urlopen serves robots.txt and a zip built per case.
const harness = `
import sys,io,zipfile,urllib.request,time
case=sys.argv[3]
def build():
  buf=io.BytesIO()
  if case=='bzip2':
    with zipfile.ZipFile(buf,'w',compression=zipfile.ZIP_BZIP2) as z: z.writestr('m.csv',b'a'*13_000_000)
  else:
    with zipfile.ZipFile(buf,'w',compression=zipfile.ZIP_DEFLATED) as z:
      z.writestr('other.csv',b'x')
      if case=='ok': z.writestr('m.csv',b'Model version,Score\\nm,0.5\\n')
      if case=='big': z.writestr('m.csv',b'a'*13_000_000)
  return buf.getvalue()
class R(io.BytesIO):
  status=200
  def __init__(s,b,u): super().__init__(b); s.url=u
  def geturl(s): return s.url
def urlopen(req,timeout=None):
  u=req.full_url if hasattr(req,'full_url') else req
  return R(b'User-agent: *\\nAllow: /\\n' if u.endswith('/robots.txt') else build(),u)
urllib.request.urlopen=urlopen; time.sleep=lambda s: None
sys.argv=['capture',sys.argv[1],sys.argv[2]]
exec(open('scripts/capture-benchmark-sources.py').read())
`;

test('capture: a zip member is its own source; non-deflate, oversized and missing members are refused', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bh-zip-capture-'));
  try {
    await writeFile(join(dir, 'h.py'), harness);
    await writeFile(join(dir, 'urls.json'), JSON.stringify([{ url: 'https://epoch.test/data/archive.zip', zip_member: 'm.csv' }]));
    const run = async (kase) => {
      const out = join(dir, kase);
      const r = spawnSync('python3', [join(dir, 'h.py'), join(dir, 'urls.json'), out, kase], { encoding: 'utf8' });
      assert.equal(r.status, 0, r.stderr);
      return JSON.parse(await readFile(join(out, 'manifest.json'), 'utf8'))[0];
    };
    const ok = await run('ok');
    assert.equal(ok.status, 200);
    assert.equal(ok.zip_member, 'm.csv');
    assert.match(ok.container_sha256, /^[a-f0-9]{64}$/);
    assert.equal(gunzipSync(await readFile(ok.file)).toString(), 'Model version,Score\nm,0.5\n');
    assert.match((await run('bzip2')).reason, /Unsupported zip compression/);
    assert.match((await run('big')).reason, /exceeds 12MB bound/);
    assert.match((await run('missing')).reason, /Expected exactly one zip member m\.csv, found 0/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
