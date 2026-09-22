import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseMlsBenchLabel, boardJoins } from '../lib/board-identity.mjs';

// 2026-09-22 (iteration 165, CR-37.1). The sources are the committed captures of the MLS-Bench-Lite leaderboard (its
// Next.js flight payload) and the MLS-Bench README; every mutation below is a synthetic failure probe, never a source claim.
test('MLS-Bench-Lite parser reads the chart object from the flight payload, and fails closed', () => {
  const output = execFileSync('python3', ['-B', '-c', String.raw`
import importlib.util,gzip,hashlib,json
from pathlib import Path
s=importlib.util.spec_from_file_location('collector','scripts/collect-public-benchmarks.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
plan=json.loads(Path('data/raw/benchmarks/collection-plan.json').read_text())
e=[x for x in plan['entries'] if x['benchmark_id']=='mls-bench-lite::30-tasks'][0]
def load(src):
  raw=gzip.decompress(Path(src['file']).read_bytes())
  assert hashlib.sha256(raw).hexdigest()==src['sha256'],src['file']
  return raw.decode('utf-8-sig')
page=load(e['source']);readme=load(e['parser']['method_source'])
reg=json.loads(Path('data/raw/benchmarks/registry.json').read_text())
out=m.collect({'entries':[e]},reg)
obs=out['observations'];got={o['subject']['source_id']:o for o in obs}
assert len(obs)==15,len(obs)
assert got['Claude Fable 5.1|Claude Code (max effort)']['value']==50.3 and got['Kimi K3|Kimi-Code (max)']['value']==48.3 and got['DeepSeek-V4 Pro Preview|Claude Code']['value']==24.4
assert got['GPT-5.5|Codex (xhigh)']['subject']['harness']=='Codex (xhigh)' and got['Qwen3.8-Max|Claude Code']['subject']['name']=='Qwen3.8-Max'
p=got['Claude Fable 5|Claude Code (max effort, with fallback)']['protocol']
assert '"stated_effort":"max"' in p and '"human_sota_reference":44.66' in p
assert '"stated_effort":"not stated"' in got['Kimi K2.6|Kimi-Code']['protocol']
assert all(o['unit']=='points' and o['basis']=='measured' for o in obs)
def fails(p,why,method=None):
  spec=json.loads(json.dumps(e['parser']))
  loader=(lambda src: method) if method is not None else load
  assert (p!=page) or (method is not None and method!=readme),'probe did not mutate: '+why
  try: m.parse(p,spec,loader)
  except ValueError: return
  raise AssertionError('accepted: '+why)
fails(page.replace(r'\"title\":\"MLS-Bench Lite\"',r'\"title\":\"MLS-Bench\"'),'another board title (new identity)')
fails(page.replace(r'\"effort\":\"xhigh\"',r'\"effort\":\"ultra\"'),'an unreviewed effort')
fails(page.replace(r'\"key\":\"GPT-5.5|Codex (xhigh)\"',r'\"key\":\"GPT-5.5|Codex (high)\"'),'a harness that disagrees with the stated effort')
fails(page.replace(r'\"key\":\"Qwen3.7-Max|Claude Code\"',r'\"key\":\"Qwen3.7-Max|Claude Code (max)\"'),'a harness effort with no stated effort')
fails(page.replace(r'\"score\":24.4',r'\"score\":124.4'),'a score above 100')
fails(page.replace(r'\"key\":\"Kimi K2.6|Kimi-Code\",',r'\"key\":\"Kimi K2.6|Kimi-Code\",\"runs\":3,'),'a new row field')
fails(page.replace(r'\"key\":\"Qwen3.7-Max|Claude Code\",\"name\":\"Qwen3.7-Max\"',r'\"key\":\"Qwen3.8-Max|Claude Code\",\"name\":\"Qwen3.8-Max\"'),'a repeated row key')
fails(page.replace('5-hour exploration budget','8-hour exploration budget'),'another page method statement')
fails(page,'another README statement',readme.replace('30-task subset','40-task subset'))
print(json.dumps({'rows':len(obs)}))
`], { cwd: new URL('..', import.meta.url), encoding: 'utf8' });
  assert.deepEqual(JSON.parse(output), { rows: 15 });
});

test('MLS-Bench-Lite joins: the harness parenthesis is the setting; a fallback run never joins', () => {
  assert.deepEqual(parseMlsBenchLabel('Claude Opus 5|Claude Code (max effort)'), { family: 'claude-opus-5', effort: 'max' });
  assert.deepEqual(parseMlsBenchLabel('GPT-5.5|Codex (xhigh)'), { family: 'gpt-5.5', effort: 'xhigh' });
  assert.deepEqual(parseMlsBenchLabel('Kimi K2.7 Code|Kimi-Code'), { family: 'kimi-k2.7-code', effort: null });
  assert.deepEqual(parseMlsBenchLabel('Claude Fable 5|Claude Code (max effort, with fallback)'), { family: 'claude-fable-5', effort: 'max effort, with fallback' });
  assert.deepEqual(parseMlsBenchLabel('DeepSeek-V4 Pro Preview|Claude Code'), { family: null, effort: null });
  const catalog = [
    { id: 'claude-fable-5::max', family_key: 'claude-fable-5', variant: 'max' },
    { id: 'kimi-k2.6::default', family_key: 'kimi-k2.6', variant: 'default' },
    { id: 'kimi-k2.6::non-reasoning', family_key: 'kimi-k2.6', variant: 'non-reasoning' },
  ];
  const joins = boardJoins(['Claude Fable 5|Claude Code (max effort, with fallback)', 'Kimi K2.6|Kimi-Code'].map((id) => ({ source_id: id })), parseMlsBenchLabel, catalog);
  // An unnamed fallback model ran part of the Fable 5 run, so it cannot be placed on claude-fable-5::max.
  assert.equal(joins[0].model_id, null);
  // Two configurations and no stated setting: the run stays as named by the source.
  assert.equal(joins[1].model_id, null);
  const map = JSON.parse(readFileSync(new URL('../data/raw/benchmarks/identity-map.json', import.meta.url), 'utf8'));
  const live = map.entries.filter((x) => x.benchmark_id === 'mls-bench-lite::30-tasks').map((x) => x.model_id).sort();
  assert.deepEqual(live, ['claude-fable-5.1::max', 'claude-opus-4.8::max', 'claude-opus-5::max', 'claude-sonnet-5::max', 'glm-5.2::max',
    'gpt-5.5::xhigh', 'gpt-5.6-sol::max', 'kimi-k2.7-code::default', 'kimi-k3::max', 'qwen3.7-max::default', 'qwen3.8-max-0902::default',
    'qwen3.8-max::default']);
});

test('MLS-Bench-Lite is registered beside, never merged with, StepFun\'s vendor snapshot; tiers and the Lumina decision', () => {
  const registry = JSON.parse(readFileSync(new URL('../data/raw/benchmarks/registry.json', import.meta.url), 'utf8'));
  const entry = registry.entries.find((e) => e.id === 'mls-bench-lite::30-tasks');
  assert.equal(entry.source_type, 'official_leaderboard');
  assert.deepEqual(entry.scoring.range, [0, 100]);
  assert.equal(entry.category, 'Coding');
  assert.ok(registry.entries.some((e) => e.id === 'stepfun-mls-bench-lite::snapshot-2026-09-20' && e.source_type === 'vendor_report'));
  const taxonomy = JSON.parse(readFileSync(new URL('../data/benchmark-taxonomy.json', import.meta.url), 'utf8'));
  assert.equal(taxonomy.tiers['mls-bench-lite'], 'niche');
  const tiers = JSON.parse(readFileSync(new URL('../data/benchmaxxing-tiers.json', import.meta.url), 'utf8'));
  assert.equal(tiers.tiers['mls-bench-lite'].tier, 'headline');
  const lumina = JSON.parse(readFileSync(new URL('../data/lumina-feed-policy.json', import.meta.url), 'utf8')).family_decisions;
  assert.deepEqual(lumina['benchlm-mlsbenchlite'].benchmark_ids, ['mls-bench-lite::30-tasks']);
});
