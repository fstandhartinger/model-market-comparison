// D192, 2026-09-24. labs.scale.com began serving the SWE-Bench Pro **private** board from the same
// page as the public one. The `scale_swepro` parser named a board by "this page carries exactly one
// entries array", so the extra array made every daily run raise
// `ValueError: Scale leaderboard source identity changed` and `swe-bench-pro-public` was retained.
// The guard was right to refuse — two boards and no stated preference is exactly the kind of
// ambiguity it exists for. The repair is to say which dataset the plan means, in the page's own
// vocabulary (`key: "public"`), and keep failing closed everywhere else.
//
// The page below is the real capture the failing run took, retained byte-for-byte at
// data/raw/benchmarks/daily-evidence/2026-09-24-d192/ with its receipt. Every mutation is a
// synthetic failure probe; none of them is a claim about the source.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const run = (script) => JSON.parse(execFileSync('python3', ['-B', '-c', script],
  { cwd: new URL('..', import.meta.url), encoding: 'utf8' }));

const PRELUDE = String.raw`
import importlib.util,gzip,hashlib,json
from pathlib import Path
s=importlib.util.spec_from_file_location('collector','scripts/collect-public-benchmarks.py')
m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
plan=json.loads(Path('data/raw/benchmarks/collection-plan.json').read_text())
registry=json.loads(Path('data/raw/benchmarks/registry.json').read_text())
entry=[x for x in plan['entries'] if x['benchmark_id']=='swe-bench-pro-public::snapshot-2026-09-10'][0]
receipt=json.loads(Path('data/raw/benchmarks/daily-evidence/2026-09-24-d192/manifest.json').read_text())[0]
raw=gzip.decompress(Path(receipt['file']).read_bytes())
assert hashlib.sha256(raw).hexdigest()==receipt['sha256'],'retained capture no longer matches its receipt'
page=raw.decode('utf-8-sig')
# The daily run swaps the plan's frozen source receipt for the capture it just took; this does
# the same, so the collector reads the two-board page the failing run actually saw.
today=dict(entry);today['source']={**entry['source'],'file':receipt['file'],'sha256':receipt['sha256'],
  'url':receipt['url'],'fetched_at':receipt['retrieved_at']}
def load(src):
  body=gzip.decompress(Path(src['file']).read_bytes())
  assert hashlib.sha256(body).hexdigest()==src['sha256'],src['file']
  return body.decode('utf-8-sig')
def parse(text,parser=None):
  return m.parse(text,parser or entry['parser'],load)
def refuses(text,why,parser=None):
  try: parse(text,parser)
  except ValueError: return
  raise AssertionError('accepted: '+why)
`;

test('D192: the public board is selected by the page\'s own key, and the private one is never read', () => {
  const out = run(PRELUDE + String.raw`
observations=m.collect({'entries':[today]},registry)['observations']
# The public dataset has 25 rows; the private board on the same page has 14. Reading the wrong one,
# or both, would change the row count and the top value.
assert len(observations)==25,len(observations)
top=observations[0]
assert top['subject']['name']=='Muse Spark 1.1*',top['subject']['name']
assert top['value']==61.5,top['value']
# The private board's own value for that same model must not appear anywhere in the published rows.
assert all(o['value']!=51.5 for o in observations),'a private-dataset value reached the public rows'
names=[o['subject']['name'] for o in observations]
assert len(set(names))==len(names),'duplicate rows: both boards were concatenated'
# And these are the rows already published from the single-board era: the repair restores the
# extraction, it does not move a number.
published=[o for o in json.loads(Path('data/raw/benchmarks/public-observations.json').read_text())['observations']
  if o['benchmark_id']=='swe-bench-pro-public::snapshot-2026-09-10']
assert {o['subject']['source_id']:o['value'] for o in published}=={o['subject']['source_id']:o['value'] for o in observations}
print(json.dumps({'rows':len(observations),'top':top['subject']['name'],'value':top['value']}))
`);
  assert.deepEqual(out, { rows: 25, top: 'Muse Spark 1.1*', value: 61.5 });
});

test('D192: every way of losing the public board still fails closed', () => {
  const out = run(PRELUDE + String.raw`
# The named dataset disappearing, or being renamed, is a refusal — never a silent fall back to
# whichever board happens to be left.
# The board keys live escaped inside the RSC flight string, so the probes mutate them there.
KEY='\\"key\\":\\"public\\"'
assert KEY in page
refuses(page.replace(KEY,'\\"key\\":\\"public-v2\\"'),'the public board renamed itself')
refuses(page.replace(KEY,'\\"key\\":\\"private\\"'),'no board answers to public any more')
# The page-identity texts the plan pins.
for needle in entry['parser']['require_text']:
  refuses(page.replace(needle,needle.upper()+'-X'),'page identity text '+needle+' gone')
# Without a stated dataset the old rule holds: two boards on one page is still an ambiguity.
plain=dict(entry['parser']);plain.pop('dataset_key')
refuses(page,'two unnamed boards accepted',plain)
# And an unkeyed single-board page — the 2026-09-10 shape — still reads under the old rule, so a
# provenance replay of the frozen capture is not collateral damage of this change.
frozen=load(entry['source'])
rows=parse(frozen,plain)
assert len(rows)==25 and rows[0]['score']==61.5,rows[0]
print(json.dumps({'ok':True}))
`);
  assert.deepEqual(out, { ok: true });
});
