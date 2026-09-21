import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseRnEvalsLabel, boardJoins } from '../lib/board-identity.mjs';

// 2026-09-21 (iteration 158, CR-37.1). The sources are the committed captures of Callstack's React Native Evals page
// (its Next.js flight payload) and the eval repository's README; every mutation below is a synthetic failure probe,
// never a source claim.
test('React Native Evals parser reads the board object from the flight payload, and fails closed', () => {
  const output = execFileSync('python3', ['-B', '-c', String.raw`
import importlib.util,gzip,hashlib,json
from pathlib import Path
s=importlib.util.spec_from_file_location('collector','scripts/collect-public-benchmarks.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
plan=json.loads(Path('data/raw/benchmarks/collection-plan.json').read_text())
e=[x for x in plan['entries'] if x['benchmark_id']=='react-native-evals::91-evals'][0]
def load(src):
  raw=gzip.decompress(Path(src['file']).read_bytes())
  assert hashlib.sha256(raw).hexdigest()==src['sha256'],src['file']
  return raw.decode('utf-8-sig')
page=load(e['source']);readme=load(e['parser']['method_source'])
reg=json.loads(Path('data/raw/benchmarks/registry.json').read_text())
out=m.collect({'entries':[e]},reg)
obs=out['observations'];got={o['subject']['name']:o for o in obs}
assert len(obs)==27,len(obs)
assert got['Claude Opus 5']['value']==90.80917874396135 and got['Apex']['value']==90.90909090909092 and got['Nemotron Nano']['value']==43.58585858585858
assert got['Minimax M3']['subject']['source_id']=='minimax-m3'
p=got['Claude Opus 5']['protocol']
assert '"requirements_passed":3578' in p and '"requirements_judged":3940' in p and '"repeat_runs":10' in p and '"run_finished_at":"2026-09-17T11:25:53.630Z"' in p
assert '"tokens_used":null' in got['GPT 5.6 Sol']['protocol']
assert all(o['unit']=='percent' and o['basis']=='measured' and o['subject']['harness'] is None for o in obs)
def fails(p,why,method=None):
  spec=json.loads(json.dumps(e['parser']))
  loader=(lambda src: method) if method is not None else load
  assert (p!=page) or (method is not None and method!=readme),'probe did not mutate: '+why
  try: m.parse(p,spec,loader)
  except ValueError: return
  raise AssertionError('accepted: '+why)
fails(page.replace(r'\"iconKey\":\"skia\",\"order\":999,\"evalCount\":25}',r'\"iconKey\":\"skia\",\"order\":999,\"evalCount\":26}'),'another eval count (new identity)')
fails(page.replace(r'\"overallScorePct\":90.90909090909092',r'\"overallScorePct\":91.5'),'a complete row whose score does not reproduce passed/judged')
fails(page.replace(r'\"overallScorePct\":75.52105566591705',r'\"overallScorePct\":76.0'),'an incomplete row beyond the 0.1-point tolerance')
fails(page.replace(r'\"warnings\":[]',r'\"warnings\":[\"judge failed\"]'),'board warnings')
fails(page.replace(r'\"id\":\"Apex\",\"label\":\"Apex\",',r'\"id\":\"Apex\",\"label\":\"Apex\",\"effort\":\"high\",'),'a new row field')
fails(page.replace(r'\"label\":\"Claude Fable 5\",',r'\"label\":\"Claude Opus 5\",'),'a repeated row label')
fails(page.replace('measuring success rate for common task groups','measuring pass@1'),'another page statement')
fails(page,'another method statement',readme.replace('requirement-based assessment','unit tests'))
print(json.dumps({'rows':len(obs)}))
`], { cwd: new URL('..', import.meta.url), encoding: 'utf8' });
  assert.deepEqual(JSON.parse(output), { rows: 27 });
});

test('React Native Evals joins: a product name without a setting joins only a single default configuration', () => {
  assert.deepEqual(parseRnEvalsLabel('minimax-m3', 'Minimax M3'), { family: 'minimax-m3', effort: null });
  assert.deepEqual(parseRnEvalsLabel('gemini-3.1-pro-preview', 'Gemini 3.1 Pro Preview'), { family: 'gemini-3.1-pro-preview', effort: null });
  // Callstack's own agent and an unnamed stealth model are not catalog models.
  assert.deepEqual(parseRnEvalsLabel('Apex', 'Apex'), { family: null, effort: null });
  assert.deepEqual(parseRnEvalsLabel('ox-alpha', 'Ox Alpha'), { family: null, effort: null });
  const catalog = [
    { id: 'mistral-large-3::default', family_key: 'mistral-large-3', variant: 'default' },
    { id: 'kimi-k2.6::default', family_key: 'kimi-k2.6', variant: 'default' },
    { id: 'kimi-k2.6::non-reasoning', family_key: 'kimi-k2.6', variant: 'non-reasoning' },
  ];
  const joins = boardJoins([['mistral-large-3', 'Mistral Large 3'], ['kimi-k2.6', 'Kimi K2.6']].map(([id, n]) => ({ source_id: id, name: n })), parseRnEvalsLabel, catalog);
  assert.equal(joins[0].model_id, 'mistral-large-3::default');
  // Two configurations and no stated setting: the run cannot be placed, so it stays as named by the source.
  assert.equal(joins[1].model_id, null);
  const map = JSON.parse(readFileSync(new URL('../data/raw/benchmarks/identity-map.json', import.meta.url), 'utf8'));
  const live = map.entries.filter((x) => x.benchmark_id === 'react-native-evals::91-evals').map((x) => `${x.source_id}→${x.model_id}`).sort();
  assert.deepEqual(live, ['gemini-3.1-pro-preview→gemini-3.1-pro-preview::default', 'minimax-m3→minimax-m3::default',
    'mistral-large-3→mistral-large-3::default']);
});

test('React Native Evals is registered as a judged coding board with its tiers and the Lumina decision', () => {
  const registry = JSON.parse(readFileSync(new URL('../data/raw/benchmarks/registry.json', import.meta.url), 'utf8'));
  const entry = registry.entries.find((e) => e.id === 'react-native-evals::91-evals');
  assert.equal(entry.scoring.unit, 'percent');
  assert.deepEqual(entry.scoring.range, [0, 100]);
  assert.equal(entry.category, 'Coding');
  const caveats = JSON.parse(readFileSync(new URL('../data/benchmark-caveats.json', import.meta.url), 'utf8'));
  assert.ok(entry.scoring.metric.includes(caveats.judged['react-native-evals'].quote));
  const taxonomy = JSON.parse(readFileSync(new URL('../data/benchmark-taxonomy.json', import.meta.url), 'utf8'));
  assert.equal(taxonomy.tiers['react-native-evals'], 'niche');
  const tiers = JSON.parse(readFileSync(new URL('../data/benchmaxxing-tiers.json', import.meta.url), 'utf8'));
  assert.equal(tiers.tiers['react-native-evals'].tier, 'judged');
  const lumina = JSON.parse(readFileSync(new URL('../data/lumina-feed-policy.json', import.meta.url), 'utf8')).family_decisions;
  assert.deepEqual(lumina['benchlm-reactnativeevals'].benchmark_ids, ['react-native-evals::91-evals']);
});
