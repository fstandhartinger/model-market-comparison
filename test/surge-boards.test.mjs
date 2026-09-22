import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseSurgeLabel, boardJoins } from '../lib/board-identity.mjs';

// 2026-09-22 (iteration 167, CR-37.1). The sources are the committed captures of Surge AI's Chartography and GDP.pdf
// benchmark pages and their two GitHub READMEs; every mutation below is a synthetic failure probe, never a source claim.
test('Surge boards: the parser reads only the page\'s own leaderboard list, and fails closed', () => {
  const output = execFileSync('python3', ['-B', '-c', String.raw`
import importlib.util,gzip,hashlib,json
from pathlib import Path
s=importlib.util.spec_from_file_location('collector','scripts/collect-public-benchmarks.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
plan=json.loads(Path('data/raw/benchmarks/collection-plan.json').read_text())
reg=json.loads(Path('data/raw/benchmarks/registry.json').read_text())
def load(src):
  raw=gzip.decompress(Path(src['file']).read_bytes())
  assert hashlib.sha256(raw).hexdigest()==src['sha256'],src['file']
  return raw.decode('utf-8-sig')
counts={}
for bid in ['surge-chartography::100-tasks','surge-gdp-pdf::100-tasks']:
  e=[x for x in plan['entries'] if x['benchmark_id']==bid][0]
  obs=m.collect({'entries':[e]},reg)['observations']
  counts[bid]=len(obs)
  assert all(o['unit']=='percent' and o['basis']=='measured' for o in obs)
  assert len({o['subject']['source_id'] for o in obs})==len(obs)
  got={o['subject']['source_id']:o for o in obs}
  if bid.startswith('surge-chartography'):
    assert got['Claude Fable 5.1 (Adaptive/Max)']['value']==46.2 and got['GPT 5.6 Sol (Max reasoning)']['value']==45.0
    assert got['Inkling Small (High reasoning)']['value']==8.7 and got['Mistral Large 3']['value']==9.0
    assert '"stated_setting":"not stated"' in got['Mistral Large 3']['protocol']
    # Teaser cards for the other Surge boards on the same page must not leak in (CoreCraft's 72.3, Hemingway's Elo).
    assert not any(o['value']>50 for o in obs)
    page=load(e['source']);readme=load(e['parser']['method_source'])
    def fails(p,why,method=None):
      spec=json.loads(json.dumps(e['parser']))
      loader=(lambda src: method) if method is not None else load
      assert (p!=page) or (method is not None and method!=readme),'probe did not mutate: '+why
      try: m.parse(p,spec,loader)
      except ValueError: return
      raise AssertionError('accepted: '+why)
    fails(page.replace('data-score="46.2"','data-score="47.2"',1),'a score attribute that disagrees with the printed number')
    fails(page.replace('data-score="46.2"','data-score="146.2"',1).replace('>46.2</div>','>146.2</div>',1),'a score above 100')
    fails(page.replace('Fable 5.1 (Adaptive/High)','Fable 5.1 (Adaptive/Max)',1),'a repeated label')
    fails(page.replace('class="lead-rank-corecraft-list w-dyn-items"','class="lead-rank-corecraft-list w-dyn-items" x',1)+'<div class="lead-rank-corecraft-list w-dyn-items"></div>','a second own-board list')
    fails(page.replace('<div class="head-rank-table-brand"><div class="txt fs-10 fw-med">Claude</div></div>','',1),'a row without a brand')
    fails(page.replace('Chartography is our benchmark for professional chart understanding.','Chartography is our benchmark.'),'another page statement')
    fails(page,'another leaderboard configuration',readme.replace('ten runs per task','five runs per task'))
    fails(page,'a tool-enabled run',readme.replace('chart attached inline, no tools','chart attached inline, with tools'))
  else:
    assert got['GPT 5.6 Sol (Max reasoning)']['value']==30.7 and got['Nova 2 Pro (No reasoning)']['value']==2.0
print(json.dumps(counts,sort_keys=True))
`], { cwd: new URL('..', import.meta.url), encoding: 'utf8' });
  assert.deepEqual(JSON.parse(output), { 'surge-chartography::100-tasks': 58, 'surge-gdp-pdf::100-tasks': 41 });
});

test('Surge joins: Adaptive/<level> and <level> reasoning are exact; Claude\'s plain "High reasoning" never joins', () => {
  assert.deepEqual(parseSurgeLabel('Claude Fable 5.1 (Adaptive/Max)'), { family: 'claude-fable-5.1', effort: 'max' });
  assert.deepEqual(parseSurgeLabel('GPT 5.6 Sol (Medium reasoning)'), { family: 'gpt-5.6-sol', effort: 'medium' });
  assert.deepEqual(parseSurgeLabel('GPT 5.4 (No reasoning)'), { family: 'gpt-5.4', effort: 'none' });
  assert.deepEqual(parseSurgeLabel('Mistral Large 3'), { family: 'mistral-large-3', effort: null });
  assert.deepEqual(parseSurgeLabel('Claude Opus 4.8 (High reasoning)'), { family: 'claude-opus-4.8', effort: 'high reasoning' });
  assert.deepEqual(parseSurgeLabel('Kimi K2.6 (Thinking on)'), { family: 'kimi-k2.6', effort: 'thinking on' });
  assert.deepEqual(parseSurgeLabel('Muse Spark 1.3 (Auto reasoning)'), { family: 'muse-spark-1.3', effort: 'auto reasoning' });
  assert.equal(parseSurgeLabel('DeepSeek V4 Flash Vision (experimental) (Max reasoning)').family, null);
  assert.equal(parseSurgeLabel('Muse Glimmer 30B (High reasoning)').family, null);
  assert.equal(parseSurgeLabel('Nemotron 3 Nano Omni').family, null);
  const catalog = [
    { id: 'claude-opus-4.8::max', family_key: 'claude-opus-4.8', variant: 'max' },
    { id: 'claude-opus-4.8::high', family_key: 'claude-opus-4.8', variant: 'high' },
    { id: 'gpt-5.4::non-reasoning', family_key: 'gpt-5.4', variant: 'non-reasoning' },
    { id: 'gpt-5.4::xhigh', family_key: 'gpt-5.4', variant: 'xhigh' },
    { id: 'muse-spark-1.3::xhigh', family_key: 'muse-spark-1.3', variant: 'xhigh' },
    { id: 'muse-spark-1.3::max', family_key: 'muse-spark-1.3', variant: 'max' },
  ];
  const rows = ['Claude Opus 4.8 (Adaptive/Max)', 'Claude Opus 4.8 (High reasoning)', 'GPT 5.4 (No reasoning)', 'Muse Spark 1.3 (Auto reasoning)'];
  const joins = boardJoins(rows.map((id) => ({ source_id: id })), parseSurgeLabel, catalog);
  assert.deepEqual(joins.map((j) => j.model_id), ['claude-opus-4.8::max', null, 'gpt-5.4::non-reasoning', null]);
  const map = JSON.parse(readFileSync(new URL('../data/raw/benchmarks/identity-map.json', import.meta.url), 'utf8'));
  const joined = (bid) => map.entries.filter((x) => x.benchmark_id === bid).length;
  assert.equal(joined('surge-chartography::100-tasks'), 36);
  assert.equal(joined('surge-gdp-pdf::100-tasks'), 26);
  assert.ok(!map.entries.some((x) => x.benchmark_id.startsWith('surge-') && x.model_id === 'claude-opus-4.8::high'));
});

test('Surge boards are registered beside the AA, StepFun and DeepSeek snapshots; tiers and Lumina decisions', () => {
  const registry = JSON.parse(readFileSync(new URL('../data/raw/benchmarks/registry.json', import.meta.url), 'utf8'));
  for (const id of ['surge-chartography::100-tasks', 'surge-gdp-pdf::100-tasks']) {
    const entry = registry.entries.find((e) => e.id === id);
    assert.equal(entry.source_type, 'official_leaderboard');
    assert.equal(entry.category, 'Vision');
    assert.deepEqual(entry.scoring.range, [0, 100]);
  }
  for (const id of ['aa-gdp-pdf::snapshot-2026-09-21', 'stepfun-gdp-pdf::snapshot-2026-09-20', 'deepseek-chartography-w-tools::snapshot-2026-09-10']) {
    assert.ok(registry.entries.some((e) => e.id === id), id);
  }
  const tiers = JSON.parse(readFileSync(new URL('../data/benchmaxxing-tiers.json', import.meta.url), 'utf8')).tiers;
  assert.equal(tiers['surge-chartography'].tier, 'judged');
  assert.equal(tiers['surge-gdp-pdf'].tier, 'judged');
  const lumina = JSON.parse(readFileSync(new URL('../data/lumina-feed-policy.json', import.meta.url), 'utf8')).family_decisions;
  assert.deepEqual(lumina['benchlm-chartography'].benchmark_ids, ['surge-chartography::100-tasks']);
  assert.equal(lumina['benchlm-chartographywithtools'].decision, 'vendor_reported');
  assert.equal(lumina['benchlm-gdppdfwithtools'].decision, 'vendor_reported');
});
