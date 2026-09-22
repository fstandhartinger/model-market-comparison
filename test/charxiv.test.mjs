import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseCharxivLabel, boardJoins } from '../lib/board-identity.mjs';

// 2026-09-22 (iteration 170, CR-37.1). The source is the committed capture of the CharXiv authors' leaderboard CSV; every
// mutation below is a synthetic failure probe, never a source claim.
test('CharXiv: the CSV gives reasoning accuracy by position, baselines are skipped, and the guards fail closed', () => {
  const output = execFileSync('python3', ['-B', '-c', String.raw`
import importlib.util,gzip,hashlib,json
from pathlib import Path
s=importlib.util.spec_from_file_location('collector','scripts/collect-public-benchmarks.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
plan=json.loads(Path('data/raw/benchmarks/collection-plan.json').read_text())
reg=json.loads(Path('data/raw/benchmarks/registry.json').read_text())
e=[x for x in plan['entries'] if x['benchmark_id']=='charxiv-reasoning::val-v1.0'][0]
out=m.collect({'entries':[e]},reg)['observations']
by={o['subject']['source_id']:o['value'] for o in out}
assert len(by)==95 and 'Human' not in by and 'Random (GPT-4o)' not in by
assert by['o3 (high)']==78.6 and by['o4 mini (high)']==72.0 and by['GPT-4o 240513']==47.1 and by['Claude 3.7 Sonnet']==64.2,by
assert all(o['unit']=='percent' and o['basis']=='measured' for o in out)
assert '"descriptive_overall":"84.30"' in [o for o in out if o['subject']['source_id']=='Claude 3.5 Sonnet'][0]['protocol']
assert 'source_inconsistency' in [o for o in out if o['subject']['source_id']=='Pixtral 12B'][0]['protocol']
raw=gzip.decompress(Path(e['source']['file']).read_bytes());assert hashlib.sha256(raw).hexdigest()==e['source']['sha256']
body=raw.decode('utf-8-sig')
load=lambda src: gzip.decompress(Path(src['file']).read_bytes()).decode('utf-8-sig')
def fails(p,why,spec=None):
  assert p!=body or spec is not None,'probe did not mutate: '+why
  try: m.parse(p,spec or json.loads(json.dumps(e['parser'])),load)
  except (ValueError,IndexError,KeyError): return
  raise AssertionError('accepted: '+why)
fails(body.replace('Model,Weight,Size [V/L] (B),Overall,TC','Model,Weight,Size [V/L] (B),Reasoning,TC',1),'a changed header')
fails('\n'.join(l for l in body.split('\n') if not l.startswith('Human,')),'a missing baseline row')
fails(body.replace('Claude 3.5 Sonnet,Proprietary,Unknown,60.20','Claude 3.5 Sonnet,Proprietary,Unknown,66.20',1),'type scores that do not reproduce the Overall')
fails(body.replace('GPT 4.1 nano,Proprietary','GPT 4.1 mini,Proprietary',1),'a repeated model row')
fails(body.replace('o3 (high),Proprietary','o3 (high),Closed',1),'an unknown weight class')
spec=json.loads(json.dumps(e['parser']));spec['require']['page_text'][1]=spec['require']['page_text'][1].replace('1,000 charts','2,000 charts')
fails(body,'another split size on the page',spec)
spec=json.loads(json.dumps(e['parser']));spec['require']['method_text'][0]='*Current Version: v2.0*'
fails(body,'another benchmark version',spec)
print(json.dumps({'rows':len(out)}))
`], { cwd: new URL('..', import.meta.url), encoding: 'utf8' });
  assert.deepEqual(JSON.parse(output), { rows: 95 });
});

test('CharXiv joins: a stated level joins exactly, a dated label its release, ambiguous labels never', () => {
  assert.deepEqual(parseCharxivLabel('o4 mini (high)'), { family: 'o4-mini', effort: 'high' });
  assert.deepEqual(parseCharxivLabel('GPT-4o 240513'), { family: 'gpt-4o-may-24', effort: null });
  assert.deepEqual(parseCharxivLabel('GPT 4.1 mini'), { family: 'gpt-4.1-mini', effort: null });
  for (const label of ['Claude 3.5 Sonnet', 'Claude 3.7 Sonnet', 'GPT-4o 241120', 'GPT-4o Mini', 'Gemini 1.5 Pro', 'Reka Flash', 'MiniCPM-V2.6 (Upsize)']) {
    assert.equal(parseCharxivLabel(label).family, null, label);
  }
  const catalog = [
    { id: 'o1::default', family_key: 'o1', variant: 'default' },
    { id: 'o3::default', family_key: 'o3', variant: 'default' },
    { id: 'o4-mini::high', family_key: 'o4-mini', variant: 'high' },
  ];
  const joins = boardJoins(['o1', 'o1 (high)', 'o3 (high)', 'o4 mini (high)'].map((id) => ({ source_id: id })), parseCharxivLabel, catalog);
  assert.deepEqual(joins.map((j) => j.model_id), ['o1::default', null, null, 'o4-mini::high']);
  const map = JSON.parse(readFileSync(new URL('../data/raw/benchmarks/identity-map.json', import.meta.url), 'utf8'));
  assert.deepEqual(map.entries.filter((x) => x.benchmark_id === 'charxiv-reasoning::val-v1.0').map((x) => x.model_id).sort(), [
    'claude-3-haiku::default', 'claude-3-opus::default', 'claude-3-sonnet::default', 'gemini-1.0-pro::default', 'gpt-4.1-mini::default',
    'gpt-4.1-nano::default', 'gpt-4.1::default', 'gpt-4.5-preview::default', 'gpt-4o-may-24::default', 'llama-3.2-11b-vision-instruct::default',
    'llama-3.2-instruct-90b-vision::default', 'molmo-7b-d::default', 'o1::default', 'o4-mini::high', 'pixtral-12b-2409::default',
    'qwen2.5-vl-72b-instruct::default',
  ]);
  const lumina = JSON.parse(readFileSync(new URL('../data/lumina-feed-policy.json', import.meta.url), 'utf8')).family_decisions;
  assert.deepEqual(lumina['benchlm-charxivnotools'].benchmark_ids, ['charxiv-reasoning::val-v1.0']);
});
