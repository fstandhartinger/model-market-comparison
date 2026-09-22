import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseVitaBenchLabel, boardJoins } from '../lib/board-identity.mjs';

// 2026-09-22 (iteration 168, CR-37.1). The source is the committed capture of the VitaBench authors' leaderboard; every
// mutation below is a synthetic failure probe, never a source claim.
test('VITA-Bench: table 0 gives Cross-Scenarios Avg@4 per reasoning section, and the page guards fail closed', () => {
  const output = execFileSync('python3', ['-B', '-c', String.raw`
import importlib.util,gzip,hashlib,json
from pathlib import Path
s=importlib.util.spec_from_file_location('collector','scripts/collect-public-benchmarks.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
plan=json.loads(Path('data/raw/benchmarks/collection-plan.json').read_text())
reg=json.loads(Path('data/raw/benchmarks/registry.json').read_text())
e=[x for x in plan['entries'] if x['benchmark_id']=='vitabench::2026-01-22'][0]
out=m.collect({'entries':[e]},reg)['observations']
by={o['subject']['source_id']:o['value'] for o in out}
assert by['Thinking Models|Gemini-3-Flash (high)']==32.5 and by['Thinking Models|GPT-5.2 (xhigh)']==24.3
assert by['Thinking Models|Claude-4.5-Opus']==28.5 and by['Non-thinking Models|Claude-4.5-Opus']==23.3
assert by['Non-thinking Models|GPT-5.2 (none)']==0.8 and by['Non-thinking Models|Qwen3-32B']==4.0
assert sum(k.startswith('Thinking Models|') for k in by)==14 and sum(k.startswith('Non-thinking Models|') for k in by)==12
assert all(o['unit']=='percent' and o['basis']=='measured' for o in out)
raw=gzip.decompress(Path(e['source']['file']).read_bytes());assert hashlib.sha256(raw).hexdigest()==e['source']['sha256']
page=raw.decode('utf-8-sig')
def fails(p,why):
  assert p!=page,'probe did not mutate: '+why
  try: m.parse(p,json.loads(json.dumps(e['parser'])),None)
  except (ValueError,IndexError): return
  raise AssertionError('accepted: '+why)
fails(page.replace('<code>2026-01-22</code>','<code>2026-03-01</code>'),'another update date')
fails(page.replace('100 cross-scenario tasks','120 cross-scenario tasks'),'another task set')
fails(page.replace('Non-thinking Models','Low-effort Models'),'an unknown section')
fails(page.replace('>Kimi-K2-Thinking<','>Qwen3-32B<',1),'a repeated model row within a section')
fails(page.replace('Cross-Scenarios','Cross-Domain',1),'a changed header')
print(json.dumps({'rows':len(out)}))
`], { cwd: new URL('..', import.meta.url), encoding: 'utf8' });
  assert.deepEqual(JSON.parse(output), { rows: 26 });
});

test('VITA-Bench joins: a stated level or the non-thinking section joins exactly; a thinking row without a level never does', () => {
  assert.deepEqual(parseVitaBenchLabel('Thinking Models|GPT-5.2 (xhigh)'), { family: 'gpt-5.2', effort: 'xhigh' });
  assert.deepEqual(parseVitaBenchLabel('Non-thinking Models|GLM-4.7'), { family: 'glm-4.7', effort: 'none' });
  assert.deepEqual(parseVitaBenchLabel('Thinking Models|GLM-4.7'), { family: 'glm-4.7', effort: 'thinking' });
  assert.deepEqual(parseVitaBenchLabel('Non-thinking Models|GPT-5.2 (none)'), { family: 'gpt-5.2', effort: 'none' });
  assert.equal(parseVitaBenchLabel('Thinking Models|Gemini-3-Pro (high)').family, null);
  assert.equal(parseVitaBenchLabel('Other Models|GLM-4.7').family, null);
  const catalog = [
    { id: 'glm-4.7::non-reasoning', family_key: 'glm-4.7', variant: 'non-reasoning' },
    { id: 'glm-4.7::reasoning', family_key: 'glm-4.7', variant: 'reasoning' },
    { id: 'o3::default', family_key: 'o3', variant: 'default' },
  ];
  const joins = boardJoins(['Non-thinking Models|GLM-4.7', 'Thinking Models|GLM-4.7', 'Thinking Models|o3 (high)'].map((id) => ({ source_id: id })), parseVitaBenchLabel, catalog);
  assert.deepEqual(joins.map((j) => j.model_id), ['glm-4.7::non-reasoning', null, null]);
  const map = JSON.parse(readFileSync(new URL('../data/raw/benchmarks/identity-map.json', import.meta.url), 'utf8'));
  assert.deepEqual(map.entries.filter((x) => x.benchmark_id === 'vitabench::2026-01-22').map((x) => x.model_id).sort(), [
    'claude-opus-4.5::non-reasoning', 'claude-sonnet-4.5::non-reasoning', 'deepseek-v3.2::non-reasoning', 'glm-4.7::non-reasoning',
    'gpt-5.2::non-reasoning', 'gpt-5.2::xhigh', 'o4-mini::high', 'qwen3-32b::non-reasoning',
  ]);
  const lumina = JSON.parse(readFileSync(new URL('../data/lumina-feed-policy.json', import.meta.url), 'utf8')).family_decisions;
  assert.deepEqual(lumina['benchlm-vitabench'].benchmark_ids, ['vitabench::2026-01-22']);
});
