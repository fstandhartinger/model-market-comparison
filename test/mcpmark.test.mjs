import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseMcpmarkVerifiedLabel, boardJoins } from '../lib/board-identity.mjs';

// 2026-09-22 (iteration 169, CR-37.1). The source is the committed capture of EVAL SYS's MCPMark Verified leaderboard; every
// mutation below is a synthetic failure probe, never a source claim.
test('MCPMark Verified: the flight table gives single-run Pass@1 over 127 tasks, and the guards fail closed', () => {
  const output = execFileSync('python3', ['-B', '-c', String.raw`
import importlib.util,gzip,hashlib,json
from pathlib import Path
s=importlib.util.spec_from_file_location('collector','scripts/collect-public-benchmarks.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
plan=json.loads(Path('data/raw/benchmarks/collection-plan.json').read_text())
reg=json.loads(Path('data/raw/benchmarks/registry.json').read_text())
e=[x for x in plan['entries'] if x['benchmark_id']=='mcpmark::verified'][0]
out=m.collect({'entries':[e]},reg)['observations']
by={o['subject']['source_id']:round(o['value'],2) for o in out}
assert by=={'kimi-k3-max':96.06,'gpt-5-5-xhigh':92.91,'gpt-5-6-sol-max':92.91,'claude-fable-5-max':86.61,'kimi-k2-7-code':81.89,'claude-opus-4-8-max':76.38,'kimi-k2-6':72.83,'deepseek-v4-pro-max':71.65},by
assert all(o['unit']=='percent' and o['basis']=='derived' and o['source_basis']=='measured' for o in out)
k27=[o for o in out if o['subject']['source_id']=='kimi-k2-7-code'][0]
assert 'second recorded run' in k27['protocol'] and '"stated_effort":"not stated"' in k27['protocol']
raw=gzip.decompress(Path(e['source']['file']).read_bytes());assert hashlib.sha256(raw).hexdigest()==e['source']['sha256']
page=raw.decode('utf-8-sig')
def fails(p,why):
  assert p!=page,'probe did not mutate: '+why
  try: m.parse(p,json.loads(json.dumps(e['parser'])),lambda src: gzip.decompress(Path(src['file']).read_bytes()).decode('utf-8-sig'))
  except (ValueError,IndexError,KeyError): return
  raise AssertionError('accepted: '+why)
fails(page.replace('version-pinned subset','curated subset'),'a changed method sentence')
fails(page.replace('Single-run evaluation (run-1) only','Four-run evaluation'),'a multi-run board')
fails(page.replace('\\"playwright\\",\\"postgres\\"]','\\"playwright\\",\\"postgres\\",\\"slack\\"]',1),'another service set')
fails(page.replace('\\"notion\\":{\\"avgSuccessRate\\":0.9286','\\"notion\\":{\\"avgSuccessRate\\":0.5',1),'service rates that do not reproduce Pass@1')
fails(page.replace('\\"key\\":\\"kimi-k3-max\\",\\"name\\":\\"kimi-k3-max\\"','\\"key\\":\\"kimi-k3-thinking\\",\\"name\\":\\"kimi-k3-thinking\\"',1),'an unreviewed effort suffix')
fails(page.replace('\\"key\\":\\"gpt-5-5-xhigh\\",\\"name\\":\\"gpt-5-5-xhigh\\"','\\"key\\":\\"kimi-k3-max\\",\\"name\\":\\"kimi-k3-max\\"',1),'a key that names another model')
fails(page.replace('\\"passAtOne\\":{\\"avg\\":0.9606,\\"std\\":0}','\\"passAtOne\\":{\\"avg\\":0.9606,\\"std\\":0.01}',1),'a Pass@1 averaged over several runs')
print(json.dumps({'rows':len(out)}))
`], { cwd: new URL('..', import.meta.url), encoding: 'utf8' });
  assert.deepEqual(JSON.parse(output), { rows: 8 });
});

test('MCPMark Verified joins: an effort suffix joins exactly; a key without one joins only a single-default family', () => {
  assert.deepEqual(parseMcpmarkVerifiedLabel('gpt-5-6-sol-max'), { family: 'gpt-5.6-sol', effort: 'max' });
  assert.deepEqual(parseMcpmarkVerifiedLabel('kimi-k2-7-code'), { family: 'kimi-k2.7-code', effort: null });
  assert.deepEqual(parseMcpmarkVerifiedLabel('claude-opus-4-8-max'), { family: 'claude-opus-4.8', effort: 'max' });
  assert.equal(parseMcpmarkVerifiedLabel('gpt-5-2-high').family, null);
  assert.equal(parseMcpmarkVerifiedLabel('kimi-k3-thinking').family, null);
  const catalog = [
    { id: 'kimi-k2.6::default', family_key: 'kimi-k2.6', variant: 'default' },
    { id: 'kimi-k2.6::non-reasoning', family_key: 'kimi-k2.6', variant: 'non-reasoning' },
    { id: 'kimi-k2.7-code::default', family_key: 'kimi-k2.7-code', variant: 'default' },
    { id: 'kimi-k3::max', family_key: 'kimi-k3', variant: 'max' },
  ];
  const joins = boardJoins(['kimi-k2-6', 'kimi-k2-7-code', 'kimi-k3-max'].map((id) => ({ source_id: id })), parseMcpmarkVerifiedLabel, catalog);
  assert.deepEqual(joins.map((j) => j.model_id), [null, 'kimi-k2.7-code::default', 'kimi-k3::max']);
  const map = JSON.parse(readFileSync(new URL('../data/raw/benchmarks/identity-map.json', import.meta.url), 'utf8'));
  assert.deepEqual(map.entries.filter((x) => x.benchmark_id === 'mcpmark::verified').map((x) => x.model_id).sort(), [
    'claude-fable-5::max', 'claude-opus-4.8::max', 'deepseek-v4-pro::max', 'gpt-5.5::xhigh', 'gpt-5.6-sol::max', 'kimi-k2.7-code::default', 'kimi-k3::max',
  ]);
  const lumina = JSON.parse(readFileSync(new URL('../data/lumina-feed-policy.json', import.meta.url), 'utf8')).family_decisions;
  assert.deepEqual(lumina['benchlm-mcpmarkverified'].benchmark_ids, ['mcpmark::verified']);
});
