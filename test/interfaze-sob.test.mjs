import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseInterfazeSobLabel, boardJoins } from '../lib/board-identity.mjs';

// 2026-09-22 (iteration 167, CR-37.1). The source is the committed capture of Interfaze's SOB leaderboard; every mutation
// below is a synthetic failure probe, never a source claim.
test('Interfaze SOB: table 0 gives Overall and Value Accuracy per model, and the page guards fail closed', () => {
  const output = execFileSync('python3', ['-B', '-c', String.raw`
import importlib.util,gzip,hashlib,json
from pathlib import Path
s=importlib.util.spec_from_file_location('collector','scripts/collect-public-benchmarks.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
plan=json.loads(Path('data/raw/benchmarks/collection-plan.json').read_text())
reg=json.loads(Path('data/raw/benchmarks/registry.json').read_text())
entries={x['benchmark_id']:x for x in plan['entries'] if x['benchmark_id'].startswith('interfaze-sob')}
out=m.collect({'entries':list(entries.values())},reg)['observations']
by={(o['benchmark_id'].split('::')[0],o['subject']['source_id']):o['value'] for o in out}
assert by[('interfaze-sob','GPT-5.4')]==87.0 and by[('interfaze-sob-value-accuracy','GPT-5.4')]==79.8
assert by[('interfaze-sob-value-accuracy','Gemini-3.1-Pro')]==82.0 and by[('interfaze-sob','GPT-OSS-20B')]==73.2
assert all(o['unit']=='percent' and o['basis']=='measured' for o in out)
e=entries['interfaze-sob::text-image-audio']
raw=gzip.decompress(Path(e['source']['file']).read_bytes());assert hashlib.sha256(raw).hexdigest()==e['source']['sha256']
page=raw.decode('utf-8-sig')
def fails(p,why):
  assert p!=page,'probe did not mutate: '+why
  try: m.parse(p,json.loads(json.dumps(e['parser'])),None)
  except (ValueError,IndexError): return
  raise AssertionError('accepted: '+why)
fails(page.replace('no reasoning/thinking','low reasoning'),'another run setting')
fails(page.replace('(easy = 1.0, medium = 2.0, hard = 3.0)','(easy = 1.0, medium = 1.0, hard = 1.0)'),'another schema weighting')
fails(page.replace('5,000','6,000',1),'another record set')
fails(page.replace('Path Recall<','Key Recall<',1),'a changed header')
fails(page.replace('>Gemini-3.1-Pro<','>GPT-5.4<',1),'a repeated model row')
print(json.dumps({'rows':len(out)}))
`], { cwd: new URL('..', import.meta.url), encoding: 'utf8' });
  assert.deepEqual(JSON.parse(output), { rows: 58 });
});

test('Interfaze SOB joins: board-wide "no reasoning" joins only exact non-reasoning configurations', () => {
  assert.deepEqual(parseInterfazeSobLabel('GPT-5.5'), { family: 'gpt-5.5', effort: 'none' });
  assert.deepEqual(parseInterfazeSobLabel('GPT-5'), { family: 'gpt-5', effort: 'lowest available reasoning' });
  assert.equal(parseInterfazeSobLabel('Claude-Sonnet-5').family, null);
  assert.equal(parseInterfazeSobLabel('Qwen3.5-35B').family, null);
  const catalog = [
    { id: 'gpt-5.5::non-reasoning', family_key: 'gpt-5.5', variant: 'non-reasoning' },
    { id: 'gpt-5.5::xhigh', family_key: 'gpt-5.5', variant: 'xhigh' },
    { id: 'gpt-5::minimal', family_key: 'gpt-5', variant: 'minimal' },
    { id: 'gemini-3.1-pro::high', family_key: 'gemini-3.1-pro', variant: 'high' },
  ];
  const joins = boardJoins(['GPT-5.5', 'GPT-5', 'Gemini-3.1-Pro'].map((id) => ({ source_id: id })), parseInterfazeSobLabel, catalog);
  assert.deepEqual(joins.map((j) => j.model_id), ['gpt-5.5::non-reasoning', null, null]);
  const map = JSON.parse(readFileSync(new URL('../data/raw/benchmarks/identity-map.json', import.meta.url), 'utf8'));
  for (const bid of ['interfaze-sob::text-image-audio', 'interfaze-sob-value-accuracy::text-image-audio']) {
    assert.deepEqual(map.entries.filter((x) => x.benchmark_id === bid).map((x) => x.model_id).sort(),
      ['deepseek-v4-pro::non-reasoning', 'glm-4.7::non-reasoning', 'glm-5.1::non-reasoning', 'gpt-5.4::non-reasoning', 'gpt-5.5::non-reasoning']);
  }
  const lumina = JSON.parse(readFileSync(new URL('../data/lumina-feed-policy.json', import.meta.url), 'utf8')).family_decisions;
  assert.deepEqual(lumina['benchlm-sobvalueacc'].benchmark_ids, ['interfaze-sob-value-accuracy::text-image-audio']);
});
